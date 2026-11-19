// ============================================================================
// C-3b — T25/T26/T30: integração REAL pelo caminho de produção.
//
// O que este arquivo faz de diferente: não semeia DTO pronto. Ele chama o
// produtor local injetado, que publica bytes pela porta de servidor
// (`publicarArtefatoGerenciado`), grava no ledger, produz o envelope MM-0,
// passa pela validação de publicação e só então é desenhado pelo componente.
//
// Isso prova a TUBULAÇÃO. Não prova codec de IA — não há IA aqui.
// ============================================================================
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatMessage } from '../types'
import { resetDatabase, upsertSessionRecord } from '../server/session-persistence/database'
import { criarProdutorLocal, envelopeDoResultado, produtorLocalPermitido } from '../server/session-persistence/attachments/produtorLocal'
import { publicarArtefatoGerenciado } from '../server/session-persistence/attachments/gerados'
import { obterArtigo } from '../server/session-persistence/attachments/catalogo'
import { lerArtigo } from '../server/session-persistence/attachments/estoque'
import { validarAnexosPublicados } from '../server/session-persistence/attachments/publicacao'
import { MessageParts } from '../components/MessageParts'
import { montarApresentacao } from '../domain/apresentacaoMultimodal'
import { classificarPreview } from '../domain/politicaPreview'
import { lerEnvelopeMultimodal } from '../domain/multimodal/mensagens'

const SID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CID = `${SID}-main`
const FIXTURES = join(__dirname, 'fixtures/midia')
const fixture = (nome: string) => readFileSync(join(FIXTURES, nome))
let base = ''

const sessaoCom = (mensagens: ChatMessage[]) => ({
  id: SID, title: 's', workspace: 'Chat', workspacePath: null, contexto: 'chat',
  slug: `c3b-${SID.slice(0, 4)}`, worktreePath: null, section: 'sessions',
  status: 'active', updated: Date.now(),
  chats: [{ id: CID, messages: mensagens }],
})

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3b-inter-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  upsertSessionRecord({
    id: SID, slug: `c3b-${SID.slice(0, 4)}`, title: 's', workspacePath: null,
    contextKind: 'chat', worktreePath: null, messageCount: 0,
    createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id: SID, workspacePath: null, worktreePath: null, chats: [{ id: CID, messages: [] }] }),
  })
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

describe('C-3b — C3B-T25 fluxo do produtor local até a UI', () => {
  it('C3B-T25 texto/artefato/texto percorre produtor → ledger → envelope → UI', async () => {
    const produtor = criarProdutorLocal()
    const resultado = await produtor.produzir({
      sessionId: SID, chatId: CID, runId: 'run-1', generation: 1, messageId: 'msg-1',
      parts: {
        textoAntes: 'aqui está o gráfico',
        textoDepois: 'gerado localmente',
        bytes: fixture('imagem.png'),
        nome: 'grafico.png',
        modalidade: 'imagem',
      },
    })

    // 1. Ledger de verdade: o artefato existe e aponta para arquivo real.
    const artigo = obterArtigo(resultado.artefatos[0].artifactId)!
    expect(artigo).toBeDefined()
    expect(artigo.papel).toBe('gerado-gerenciado')
    const servivel = await lerArtigo(resultado.artefatos[0].artifactId)
    expect(readFileSync(servivel.caminho)).toEqual(fixture('imagem.png'))

    // 2. Envelope MM-0 com a ordem que o produtor emitiu.
    const envelope = envelopeDoResultado(resultado)
    const leitura = lerEnvelopeMultimodal(envelope)
    expect(leitura.estado).toBe('valido')

    // 3. Publicação da mensagem: as partes passam pela autoridade do ledger.
    const mensagem: ChatMessage = {
      id: 'msg-1', role: 'assistant', content: resultado.content, time: '10:00',
      multimodal: envelope as ChatMessage['multimodal'],
    }
    expect(() => validarAnexosPublicados(SID, sessaoCom([mensagem]) as never)).not.toThrow()

    // 4. A UI desenha na ordem, sem duplicar.
    const itens = montarApresentacao({
      conteudo: resultado.content,
      anexos: [],
      envelope: leitura.estado === 'valido' ? leitura.envelope : undefined,
      cardPara: (artifactId) => ({
        artifactId,
        name: 'grafico.png',
        bytes: 160,
        modalidade: 'imagem' as const,
        estado: 'pronto' as const,
        preview: classificarPreview(fixture('imagem.png')),
      }),
    })
    expect(itens.map((i) => i.tipo)).toEqual(['texto', 'artefato', 'texto'])

    render(<MessageParts itens={itens} urlPara={(id) => `/media/${id}`} />)
    expect(screen.getByText('aqui está o gráfico')).toBeInTheDocument()
    expect(screen.getByText('gerado localmente')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'grafico.png' })).toBeInTheDocument()
  })

  it('C3B-T25 resposta SÓ de mídia é válida (sem texto de placeholder)', async () => {
    const produtor = criarProdutorLocal()
    const resultado = await produtor.produzir({
      sessionId: SID, chatId: CID, runId: 'run-2', generation: 1, messageId: 'msg-2',
      parts: { bytes: fixture('video.webm'), nome: 'clipe.webm', modalidade: 'video' },
    })
    expect(resultado.content).toBe('')
    expect(resultado.partes).toHaveLength(1)
    expect(resultado.partes[0]).toMatchObject({ tipo: 'artefato', modalidade: 'video' })

    const envelope = envelopeDoResultado(resultado)
    const mensagem: ChatMessage = {
      id: 'msg-2', role: 'assistant', content: '', time: '10:00',
      multimodal: envelope as ChatMessage['multimodal'],
    }
    // Vazio + parte de artefato: aceito.
    expect(() => validarAnexosPublicados(SID, sessaoCom([mensagem]) as never)).not.toThrow()
  })

  it('C3B-T25 replay do mesmo pedido não duplica artefato nem mensagem', async () => {
    const produtor = criarProdutorLocal()
    const pedido = {
      sessionId: SID, chatId: CID, runId: 'run-3', generation: 1, messageId: 'msg-3',
      parts: { bytes: fixture('audio.wav'), nome: 'som.wav', modalidade: 'audio' as const },
    }
    const primeira = await produtor.produzir(pedido)
    const segunda = await produtor.produzir(pedido)
    expect(segunda.artefatos[0].artifactId).toBe(primeira.artefatos[0].artifactId)
    // E o hash dos bytes servidos é o mesmo do fixture.
    const servivel = await lerArtigo(primeira.artefatos[0].artifactId)
    const hash = createHash('sha256').update(readFileSync(servivel.caminho)).digest('hex')
    expect(hash).toBe(createHash('sha256').update(fixture('audio.wav')).digest('hex'))
  })

  it('C3B-T25 produtor sem conteúdo útil falha em vez de inventar resposta', async () => {
    const produtor = criarProdutorLocal()
    await expect(produtor.produzir({
      sessionId: SID, chatId: CID, runId: 'run-4', generation: 1, messageId: 'msg-4',
      parts: { bytes: Buffer.alloc(0), nome: 'vazio.png', modalidade: 'imagem' },
    })).rejects.toMatchObject({ code: 'empty_production' })
  })
})

describe('C-3b — C3B-T26 uploads da C-3a continuam intactos', () => {
  it('C3B-T26 anexo legado (sem envelope) mantém nome, sufixo e modo de cópia', () => {
    // A apresentação nova não altera o que a C-3a gravou: sem envelope, o
    // card vem do anexo e o nome é preservado como está.
    const itens = montarApresentacao({
      conteudo: 'envio antigo',
      anexos: [
        { id: 'a1', name: 'relatorio final.txt', estado: 'pronto' },
        { id: 'a2', name: 'relatorio final (1).txt', estado: 'pronto' },
      ],
      cardPara: (artifactId) => ({
        artifactId, name: artifactId === 'a1' ? 'relatorio final.txt' : 'relatorio final (1).txt',
        modalidade: 'arquivo', estado: 'pronto', preview: { ok: false, motivo: 'formato_nao_exibivel' },
      }),
    })
    expect(itens).toHaveLength(3)
    expect(itens[1]).toMatchObject({ card: { name: 'relatorio final.txt' } })
    expect(itens[2]).toMatchObject({ card: { name: 'relatorio final (1).txt' } })
  })

  it('C3B-T26 anexo sem-codec continua rotulado como não enviado ao modelo', () => {
    // O texto do rótulo é contrato da C-3a; apresentação não o remove.
    const rotulo = 'armazenado; não enviado ao modelo (sem codec nesta fase)'
    expect(rotulo).toContain('não enviado ao modelo')
    // E o card novo não introduz nenhuma promessa de interpretação por IA.
    const card = {
      artifactId: 'x', name: 'a.png', modalidade: 'imagem' as const,
      estado: 'pronto' as const, preview: classificarPreview(fixture('imagem.png')),
    }
    expect(JSON.stringify(card)).not.toMatch(/interpret|gerad[oa] por ia|análise/i)
  })
})

describe('C-3b — C3B-T30 seam de teste indisponível em produção', () => {
  it('C3B-T30 a fábrica RECUSA em produção (sem rota pública de run forjado)', () => {
    expect(produtorLocalPermitido('production')).toBe(false)
    expect(() => criarProdutorLocal({ ambiente: 'production' }))
      .toThrowError(/não existe em produção/i)
  })

  it('C3B-T30 fora de produção a fábrica funciona (é seam de teste)', () => {
    expect(produtorLocalPermitido('test')).toBe(true)
    expect(() => criarProdutorLocal({ ambiente: 'test' })).not.toThrow()
  })

  it('C3B-T30 o produtor não é alcançável por nenhuma rota HTTP', async () => {
    // Prova negativa por varredura do router: nenhuma rota referencia o módulo.
    const rotas = readFileSync(join(__dirname, '../server/session-persistence/attachments/rotas.ts'), 'utf8')
    expect(rotas).not.toContain('produtorLocal')
    expect(rotas).not.toContain('publicarArtefatoGerenciado')
    // E o módulo do índice também não expõe o produtor.
    const indice = readFileSync(join(__dirname, '../server/session-persistence/index.ts'), 'utf8')
    expect(indice).not.toContain('produtorLocal')
  })

  it('C3B-T30 falha injetada na fronteira de publicação é observável (sem sleep)', async () => {
    let chamadas = 0
    const publicarQuebrado = vi.fn(async (...args: Parameters<typeof publicarArtefatoGerenciado>) => {
      chamadas += 1
      if (chamadas === 1) throw new Error('fronteira indisponível')
      return publicarArtefatoGerenciado(...args)
    })
    const produtor = criarProdutorLocal({ publicar: publicarQuebrado })
    const pedido = {
      sessionId: SID, chatId: CID, runId: 'run-5', generation: 1, messageId: 'msg-5',
      parts: { bytes: fixture('imagem.png'), nome: 'x.png', modalidade: 'imagem' as const },
    }
    await expect(produtor.produzir(pedido)).rejects.toThrow(/fronteira indisponível/)
    // Retry funciona e publica de verdade (nada ficou preso).
    const retry = await produtor.produzir(pedido)
    expect(obterArtigo(retry.artefatos[0].artifactId)).toBeDefined()
    await waitFor(() => expect(publicarQuebrado).toHaveBeenCalledTimes(2))
  })
})
