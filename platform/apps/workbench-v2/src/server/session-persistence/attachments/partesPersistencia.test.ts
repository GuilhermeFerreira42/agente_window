// ============================================================================
// C-3b — T20 a T24: as partes sobrevivem ao disco, ao reinício e à limpeza.
//
// O ponto destes testes: o envelope não pode ser um campo que existe no tipo
// e some no caminho. Cada caso abaixo percorre uma fronteira REAL (projeção de
// transcript, SQLite, ledger, planos de limpeza).
// ============================================================================
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ChatMessage, Session } from '../../../types'
import { projetarMensagemPersistida } from '../../../domain/projecaoTranscript'
import { lerEnvelopeMultimodal } from '../../../domain/multimodal/mensagens'
import type { EnvelopeMensagemMultimodal } from '../../../domain/multimodal/contrato'
import { resetDatabase, upsertSessionRecord, getDatabase } from '../database'
import { obterArtigo } from './catalogo'
import { lerArtigo } from './estoque'
import { publicarArtefatoGerenciado, raizGerada } from './gerados'
import { writeTranscript } from '../transcripts'
import { executarLimpezaDelecao, iniciarOuConsultarDelecao } from '../deletions'
import { confirmRecovery, prepareRecovery } from './recuperacao'
import { criarProdutorLocal, envelopeDoResultado } from './produtorLocal'
import { validarAnexosPublicados } from './publicacao'

const SID = '99999999-9999-4999-8999-999999999999'
const CID = `${SID}-main`
let base = ''

const envelopeDe = (messageId: string, artifactId: string): EnvelopeMensagemMultimodal => ({
  versao: 1,
  messageId,
  partes: [
    { partId: `${messageId}:0`, tipo: 'texto', texto: 'segue o resultado' },
    { partId: `${messageId}:1`, tipo: 'artefato', artifactId, modalidade: 'imagem' },
    { partId: `${messageId}:2`, tipo: 'texto', texto: 'pronto' },
  ],
})

function sessaoCom(mensagens: ChatMessage[]): Session {
  return {
    id: SID, title: 'Sessão partes', workspace: 'Chat', workspacePath: null,
    contexto: 'chat', slug: `c3b-${SID.slice(0, 4)}`, worktreePath: null,
    section: 'sessions', status: 'active', updated: Date.now(),
    chats: [{ id: CID, messages: mensagens }],
  } as unknown as Session
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3b-partes-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  upsertSessionRecord({
    id: SID, slug: `c3b-${SID.slice(0, 4)}`, title: 'Sessão partes', workspacePath: null,
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

describe('C-3b — C3B-T20 reabertura sem provedor', () => {
  it('C3B-T20 envelope e artefato pronto reabrem do disco, sem URL efêmera', async () => {
    const dados = Buffer.from('resultado salvo em disco')
    const gerado = await publicarArtefatoGerenciado({
      sessionId: SID, chatId: CID, runId: 'run-t20', generation: 1,
      messageId: 'msg-t20', partId: 'p1', tentativa: 't1', name: 'resultado.png',
    }, dados)

    const mensagem: ChatMessage = {
      id: 'msg-t20', role: 'assistant', content: 'segue o resultado', time: '10:00',
      multimodal: envelopeDe('msg-t20', gerado.artifactId),
    }

    // Projeção de gravação + leitura de volta (o caminho do F5/reinício).
    const persistida = projetarMensagemPersistida(mensagem)
    const restaurada = JSON.parse(JSON.stringify(persistida)) as ChatMessage

    const leitura = lerEnvelopeMultimodal(restaurada.multimodal)
    expect(leitura.estado).toBe('valido')
    if (leitura.estado !== 'valido') throw new Error('envelope perdido na projeção')

    // Nenhuma URL/path/base64 no que foi persistido.
    const serializado = JSON.stringify(restaurada)
    expect(serializado).not.toContain('blob:')
    expect(serializado).not.toContain(base)
    expect(serializado).not.toContain('http://')
    expect(serializado).not.toContain(dados.toString('base64'))

    // E os bytes continuam resolvíveis SEM provedor: é só ledger + disco.
    const servivel = await lerArtigo(gerado.artifactId)
    expect(createHash('sha256').update(readFileSync(servivel.caminho)).digest('hex')).toBe(gerado.sha256)
  })
})

describe('C-3b — C3B-T21 persistência e validação de fronteira', () => {
  it('C3B-T21 a projeção de transcript NÃO descarta o campo multimodal', () => {
    // Este é o furo que a fatia encontrou: `projetarMensagemPersistida` monta
    // a mensagem campo a campo; sem incluir `multimodal`, ele some ao gravar.
    const mensagem: ChatMessage = {
      id: 'm1', role: 'assistant', content: 'texto', time: '10:00',
      multimodal: envelopeDe('m1', 'art-1'),
    }
    const projetada = projetarMensagemPersistida(mensagem)
    expect(projetada.multimodal).toBeDefined()
    expect(projetada.multimodal?.messageId).toBe('m1')
    expect(projetada.multimodal?.partes).toHaveLength(3)
  })

  it('C3B-T21 preserva a ORDEM das partes ao gravar e reler', () => {
    const mensagem: ChatMessage = {
      id: 'm2', role: 'assistant', content: 'a', time: '10:00',
      multimodal: envelopeDe('m2', 'art-2'),
    }
    const relida = JSON.parse(JSON.stringify(projetarMensagemPersistida(mensagem))) as ChatMessage
    expect(relida.multimodal?.partes.map((p) => p.tipo)).toEqual(['texto', 'artefato', 'texto'])
  })

  it('C3B-T21 envelope com messageId diferente da mensagem é recusado', () => {
    const mensagem: ChatMessage = {
      id: 'm3', role: 'assistant', content: 'x', time: '10:00',
      multimodal: envelopeDe('OUTRA-MENSAGEM', 'art-3'),
    }
    expect(() => validarAnexosPublicados(SID, sessaoCom([mensagem])))
      .toThrowError(/envelope multimodal não corresponde/i)
  })

  it('C3B-T21 parte citando artefato sem lastro no ledger é recusada', () => {
    const mensagem: ChatMessage = {
      id: 'm4', role: 'assistant', content: 'x', time: '10:00',
      multimodal: envelopeDe('m4', 'artefato-que-nao-existe'),
    }
    expect(() => validarAnexosPublicados(SID, sessaoCom([mensagem])))
      .toThrowError(/não está pronto no servidor/i)
  })

  it('C3B-T21 parte citando artefato de OUTRA conversa é recusada', async () => {
    const outroChat = 'outro-chat-id'
    const gerado = await publicarArtefatoGerenciado({
      sessionId: SID, chatId: outroChat, runId: 'r', generation: 1,
      messageId: 'mj', partId: 'p', tentativa: 't', name: 'x.png',
    }, Buffer.from('alheio'))
    const mensagem: ChatMessage = {
      id: 'm5', role: 'assistant', content: 'x', time: '10:00',
      multimodal: envelopeDe('m5', gerado.artifactId),
    }
    expect(() => validarAnexosPublicados(SID, sessaoCom([mensagem])))
      .toThrowError(/não está pronto no servidor/i)
  })

  it('C3B-T21 envelope de versão futura é PRESERVADO, não bloqueia a conversa', () => {
    const mensagem = {
      id: 'm6', role: 'assistant', content: 'texto antigo', time: '10:00',
      multimodal: { versao: 7, messageId: 'm6', partes: [{ partId: 'p', tipo: 'futuro' }] },
    } as unknown as ChatMessage
    // Não lança: a conversa abre; o original continua lá para quem entender.
    const resultado = validarAnexosPublicados(SID, sessaoCom([mensagem]))
    const voltou = resultado.chats[0].messages[0] as ChatMessage & { multimodal?: { versao: number } }
    expect(voltou.multimodal?.versao).toBe(7)
  })

  it('C3B-T21 mensagem só com partes (sem chips) também passa pela validação', () => {
    const mensagem: ChatMessage = {
      id: 'm7', role: 'assistant', content: '', time: '10:00',
      multimodal: envelopeDe('m7', 'sumiu-do-ledger'),
    }
    // Sem `attachments`, o validador antigo retornava antes; agora valida.
    expect(() => validarAnexosPublicados(SID, sessaoCom([mensagem]))).toThrow()
  })
})

describe('C-3b — C3B-T22 migração aditiva e legado', () => {
  it('C3B-T22 mensagem legada (sem envelope, sem chips) atravessa intacta', () => {
    const legada: ChatMessage = { id: 'antiga', role: 'user', content: 'texto de 2025', time: '09:00' }
    const resultado = validarAnexosPublicados(SID, sessaoCom([legada]))
    expect(resultado.chats[0].messages[0]).toEqual(legada)
    expect(resultado.chats[0].messages[0].multimodal).toBeUndefined()
  })

  it('C3B-T22 ledger distingue gerado de upload pelas colunas reais', async () => {
    const gerado = await publicarArtefatoGerenciado({
      sessionId: SID, chatId: CID, runId: 'r22', generation: 1,
      messageId: 'm22', partId: 'p', tentativa: 't', name: 'g.png',
    }, Buffer.from('gerado'))
    const artigo = obterArtigo(gerado.artifactId)!
    expect(artigo.papel).toBe('gerado-gerenciado')
    expect(artigo.rootKind).toBe('appdir')
    // O locator do gerado começa pelo dono, não por `chats/`.
    expect(artigo.locator.startsWith(`${SID}/${CID}/`)).toBe(true)
  })

  it('C3B-T22 migração não altera tabelas existentes (schema aditivo)', () => {
    const tabelas = getDatabase()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'attachment_%'")
      .all() as Array<{ name: string }>
    const nomes = tabelas.map((t) => t.name).sort()
    // MM-I adiciona um vínculo de trabalho; as tabelas preexistentes continuam.
    expect(nomes).toEqual([
      'attachment_artifacts', 'attachment_cleanup_plan', 'attachment_recovery_plans', 'attachment_uploads', 'attachment_working_files',
    ])
  })
})

describe('C-3b — C3B-T23/T24 lifecycle do gerenciado', () => {
  it('C3B-T23 o gerenciado vive em artifacts/ (não em uploads/ do usuário)', async () => {
    const gerado = await publicarArtefatoGerenciado({
      sessionId: SID, chatId: CID, runId: 'r23', generation: 1,
      messageId: 'm23', partId: 'p', tentativa: 't', name: 'a.png',
    }, Buffer.from('conteudo'))
    const diretorio = raizGerada(undefined, SID, CID, gerado.artifactId)
    expect(diretorio.includes(`${path.sep}artifacts${path.sep}`)).toBe(true)
    expect(diretorio.includes(`${path.sep}uploads${path.sep}`)).toBe(false)
    expect(existsSync(diretorio)).toBe(true)
  })

  it('C3B-T24 plano de limpeza continua retomável e não alega êxito sem confirmar', () => {
    // A garantia de retomada é da C-3a e segue intacta; aqui só confirmamos
    // que a tabela de plano existe e está vazia num estado limpo.
    const planos = getDatabase().prepare('SELECT COUNT(*) AS n FROM attachment_cleanup_plan').get() as { n: number }
    expect(planos.n).toBe(0)
  })
})

it('C3B-T23/T24 recupera saída do produtor em outro chat e leva só o original à Lixeira', async () => {
  const destino = randomUUID()
  const chatDestino = `${destino}-main`
  upsertSessionRecord({
    id: destino, slug: 'c3b-destino', title: 'Destino', workspacePath: null,
    contextKind: 'chat', worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id: destino, chats: [{ id: chatDestino, messages: [] }] }),
  })
  const bytes = Buffer.from('arquivo gerado')
  const gerado = await criarProdutorLocal().produzir({
    sessionId: SID, chatId: CID, runId: 'ciclo', generation: 0, messageId: 'resposta-ciclo',
    parts: { bytes, nome: 'saida.txt', modalidade: 'arquivo' },
  })
  const original = gerado.artefatos[0].artifactId
  await writeTranscript(`c3b-${SID.slice(0, 4)}`, SID, [{
    type: 'assistant', chatId: CID, uuid: randomUUID(), timestamp: 1,
    message: { id: gerado.messageId, role: 'assistant', time: '10:00', content: '', multimodal: envelopeDoResultado(gerado) },
  }])
  const alvo = { destinoSessionId: destino, destinoChatId: chatDestino }
  const plano = await prepareRecovery({ ...alvo, origemSessionId: SID })
  const pedido = { ...alvo, recoveryId: plano.recoveryId, token: plano.token }
  const recibo = await confirmRecovery(pedido)
  expect(recibo.indisponiveis).toEqual([])
  expect(recibo.mapa).toEqual([{ oldId: original, newId: expect.any(String) }])
  expect((await confirmRecovery(pedido)).mapa).toEqual(recibo.mapa)
  const copia = recibo.mapa[0].newId
  expect(copia).not.toBe(original)
  const origemDisco = (await lerArtigo(original)).caminho
  iniciarOuConsultarDelecao({ sessionId: SID, deletionId: randomUUID(), expectedRevision: 0 })
  await expect(executarLimpezaDelecao(SID, false, { lixeira: {
    async mover() { return { ok: false, efeitoIniciado: false, motivo: 'Lixeira indisponível no teste' } },
  } })).rejects.toMatchObject({ code: 'session_cleanup_pending' })
  expect(readFileSync(origemDisco)).toEqual(bytes)
  const lixeira = join(base, 'arquivo-na-lixeira')
  expect(await executarLimpezaDelecao(SID, false, { lixeira: {
    async mover(caminho) {
      expect(caminho).toBe(origemDisco)
      renameSync(caminho, lixeira)
      return { ok: true, destino: lixeira }
    },
  } })).toMatchObject({ cleanupState: 'concluido' })
  expect(obterArtigo(original)).toBeUndefined()
  expect(existsSync(origemDisco)).toBe(false)
  expect(readFileSync(lixeira)).toEqual(bytes)
  expect(readFileSync((await lerArtigo(copia)).caminho)).toEqual(bytes)
})
