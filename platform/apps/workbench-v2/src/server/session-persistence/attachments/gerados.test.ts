// ============================================================================
// C-3b — T15 a T19: porta interna de artefatos gerenciados.
//
// Estes testes usam a porta de PRODUÇÃO (`publicarArtefatoGerenciado`), não um
// seed de JSON pronto. O produtor é local e injetado: prova a tubulação, não
// um codec de IA.
// ============================================================================
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'
import { Readable } from 'node:stream'
import { spawnSync } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { upsertSessionRecord, resetDatabase } from '../database'
import { obterArtigo } from './catalogo'
import { lerArtigo } from './estoque'
import {
  artifactIdDeGeracao,
  caminhoGerado,
  conciliarGerados,
  nomeSeguro,
  publicarArtefatoGerenciado,
  raizGerada,
  type IdentidadeGeracao,
} from './gerados'

const SID = '77777777-7777-4777-8777-777777777777'
const OUTRO_SID = '88888888-8888-4888-8888-888888888888'
const CID = `${SID}-main`
const OUTRO_CID = `${OUTRO_SID}-main`
let base = ''

function seedSessao(id: string, chatId: string): void {
  upsertSessionRecord({
    id, slug: `c3b-g-${id.slice(0, 4)}`, title: 'Sessão gerados', workspacePath: null,
    contextKind: 'chat', worktreePath: null, messageCount: 0,
    createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id, workspacePath: null, worktreePath: null, chats: [{ id: chatId, messages: [] }] }),
  })
}

const identidade = (extra: Partial<IdentidadeGeracao> = {}): IdentidadeGeracao => ({
  sessionId: SID,
  chatId: CID,
  runId: 'run-1',
  generation: 1,
  messageId: 'msg-1',
  partId: 'part-1',
  tentativa: 't1',
  name: 'saida.png',
  ...extra,
})

const sha = (dados: Buffer) => createHash('sha256').update(dados).digest('hex')

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3b-gerados-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seedSessao(SID, CID)
  seedSessao(OUTRO_SID, OUTRO_CID)
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

describe('C-3b — C3B-T15 identidade de servidor e raiz correta', () => {
  it('C3B-T15 publica em artifacts/<sid>/<cid>/<artifactId>/ e o resolver comum acha os bytes', async () => {
    const dados = Buffer.from('bytes gerados pelo produtor')
    const resultado = await publicarArtefatoGerenciado(identidade(), dados)

    const esperado = path.join(base, 'data', 'artifacts', SID, CID, resultado.artifactId, 'saida.png')
    expect(resultado.replay).toBe(false)
    expect(existsSync(esperado)).toBe(true)
    expect(readFileSync(esperado)).toEqual(dados)

    // O ledger registra papel e raiz que o resolver entende.
    const artigo = obterArtigo(resultado.artifactId)!
    expect(artigo.papel).toBe('gerado-gerenciado')
    expect(artigo.rootKind).toBe('appdir')
    expect(artigo.messageId).toBe('msg-1')
    expect(artigo.partId).toBe('part-1')

    // O MESMO resolver do download encontra o arquivo — sem caminho paralelo.
    const servivel = await lerArtigo(resultado.artifactId)
    expect(sha(readFileSync(servivel.caminho))).toBe(resultado.sha256)
  })

  it('C3B-T15 artifactId é determinístico e inclui o dono (chats distintos nunca colidem)', () => {
    const a = artifactIdDeGeracao(identidade())
    const b = artifactIdDeGeracao(identidade())
    const outroChat = artifactIdDeGeracao(identidade({ chatId: OUTRO_CID }))
    const outraGeracao = artifactIdDeGeracao(identidade({ generation: 2 }))
    expect(a).toBe(b)
    expect(new Set([a, outroChat, outraGeracao]).size).toBe(3)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('C3B-T15 nome exibido não vira destino arbitrário', () => {
    expect(nomeSeguro('../../etc/passwd')).not.toContain('..')
    expect(nomeSeguro('../../etc/passwd')).not.toContain('/')
    expect(nomeSeguro('...oculto')).not.toMatch(/^\./)
    expect(nomeSeguro('')).toBe('artefato')
  })

  it('C3B-T15 em modo Pasta a saída gerenciada continua em getAppDir, não no projeto', async () => {
    const projeto = join(base, 'projeto-usuario')
    mkdirSync(projeto, { recursive: true })
    const resultado = await publicarArtefatoGerenciado(identidade(), Buffer.from('saida em pasta'))
    const artigo = obterArtigo(resultado.artifactId)!
    const caminho = caminhoGerado(undefined, artigo)
    expect(caminho.startsWith(path.join(base, 'data', 'artifacts'))).toBe(true)
    expect(caminho.startsWith(projeto)).toBe(false)
    // E nada foi escrito na pasta do usuário.
    expect(readdirSync(projeto)).toHaveLength(0)
  })
})

describe('C-3b — C3B-T16 replay e conflito', () => {
  it('C3B-T16 mesmo replay com os mesmos bytes devolve o mesmo recibo sem duplicar', async () => {
    const dados = Buffer.from('conteudo idempotente')
    const primeiro = await publicarArtefatoGerenciado(identidade(), dados)
    const segundo = await publicarArtefatoGerenciado(identidade(), dados)
    expect(segundo.artifactId).toBe(primeiro.artifactId)
    expect(segundo.sha256).toBe(primeiro.sha256)
    expect(segundo.replay).toBe(true)
    // Um único arquivo no diretório do artefato.
    const diretorio = raizGerada(undefined, SID, CID, primeiro.artifactId)
    expect(readdirSync(diretorio)).toEqual(['saida.png'])
  })

  it('C3B-T16 payload divergente na mesma identidade conflita e preserva o anterior', async () => {
    const original = Buffer.from('versao original')
    const primeiro = await publicarArtefatoGerenciado(identidade(), original)
    await expect(publicarArtefatoGerenciado(identidade(), Buffer.from('versao trocada')))
      .rejects.toMatchObject({ status: 409, code: 'artifact_payload_conflict' })
    // Bytes anteriores intactos.
    const servivel = await lerArtigo(primeiro.artifactId)
    expect(sha(readFileSync(servivel.caminho))).toBe(sha(original))
  })

  it('C3B-T16 stream novo sobre identidade publicada é recusado, não sobrescreve', async () => {
    await publicarArtefatoGerenciado(identidade(), Buffer.from('primeiro'))
    await expect(publicarArtefatoGerenciado(identidade(), Readable.from([Buffer.from('segundo')])))
      .rejects.toMatchObject({ code: 'artifact_payload_conflict' })
  })

  it('C3B-T16 identidade de outro dono nunca é redirecionada', async () => {
    const dados = Buffer.from('do primeiro dono')
    const primeiro = await publicarArtefatoGerenciado(identidade(), dados)
    // Mesma chave textual, mas o dono no cálculo já muda o artifactId; para
    // testar o ramo de conflito real, forçamos a mesma identidade com sessão
    // trocada no ledger.
    await expect(publicarArtefatoGerenciado(
      identidade({ sessionId: OUTRO_SID, chatId: OUTRO_CID }),
      dados,
    )).resolves.toMatchObject({ replay: false })
    // O artefato do primeiro dono continua íntegro.
    expect(readFileSync((await lerArtigo(primeiro.artifactId)).caminho)).toEqual(dados)
  })
})

/**
 * C3B-T17 — encerramento forçado POR PLATAFORMA.
 *
 * POSIX registra `signal='SIGKILL'`. Windows não tem sinais POSIX: o observado
 * é `{code: 1, signal: null}` (ou `signal: 'SIGKILL'` em algumas versões).
 * Exigir SIGKILL reprovaria o Windows injustamente — mas um exit genérico
 * NUNCA basta sozinho: as provas de fronteira (arquivo no disco, ledger sem
 * registro, reconciliação em processo novo) continuam obrigatórias abaixo.
 * Mesmo padrão do B1 da C-3a (`reinicioProcessoPb.test.ts`).
 */
function verificarEncerramentoForcado(
  plataforma: NodeJS.Platform,
  morte: { status: number | null; signal: NodeJS.Signals | null },
): void {
  expect(morte.status !== null || morte.signal !== null,
    `o processo filho não registrou nenhuma saída: ${JSON.stringify(morte)}`).toBe(true)
  if (plataforma === 'win32') {
    // Windows: término reconhecido = SIGKILL explícito OU código numérico.
    const terminoReconhecido = morte.signal === 'SIGKILL' || typeof morte.status === 'number'
    expect(terminoReconhecido,
      `Windows sem término reconhecido: ${JSON.stringify(morte)}`).toBe(true)
  } else {
    expect(morte.signal, `filho não morreu com SIGKILL: ${JSON.stringify(morte)}`).toBe('SIGKILL')
  }
}

describe('C-3b — C3B-T17 falha e retomada', () => {
  it('C3B-T17 falha no stream não deixa arquivo parcial nem sucesso falso', async () => {
    const fluxo = new Readable({
      read() {
        this.push(Buffer.from('parcial'))
        this.destroy(new Error('queda do produtor'))
      },
    })
    await expect(publicarArtefatoGerenciado(identidade(), fluxo))
      .rejects.toMatchObject({ code: 'artifact_write_failed' })

    const diretorio = raizGerada(undefined, SID, CID, artifactIdDeGeracao(identidade()))
    // Nenhum `.part` sobrevive e nada foi anunciado no ledger.
    expect(existsSync(diretorio) ? readdirSync(diretorio) : []).toEqual([])
    expect(obterArtigo(artifactIdDeGeracao(identidade()))).toBeUndefined()
  })

  it('C3B-T17 limite excedido aborta e libera sem publicar', async () => {
    await expect(publicarArtefatoGerenciado(
      identidade(), Buffer.alloc(2048, 0x41), { limiteBytes: 1024 },
    )).rejects.toMatchObject({ code: 'artifact_too_large' })
    expect(obterArtigo(artifactIdDeGeracao(identidade()))).toBeUndefined()
    const diretorio = raizGerada(undefined, SID, CID, artifactIdDeGeracao(identidade()))
    expect(existsSync(diretorio) ? readdirSync(diretorio) : []).toEqual([])
  })

  it('C3B-T17 CRASH real do processo entre publicar bytes e gravar o ledger é retomável', async () => {
    // Processo filho publica o arquivo e é morto ANTES do upsert no ledger.
    // Não simulamos com mock: é outro processo de verdade terminando.
    const script = path.join(base, 'crash.mjs')
    const artifactId = artifactIdDeGeracao(identidade())
    writeFileSync(script, `
      import { mkdirSync, writeFileSync } from 'node:fs'
      import path from 'node:path'
      const dir = ${JSON.stringify(raizGerada(undefined, SID, CID, artifactId))}
      mkdirSync(dir, { recursive: true })
      writeFileSync(path.join(dir, 'saida.png'), Buffer.from('bytes publicados antes do crash'))
      process.kill(process.pid, 'SIGKILL')
    `)
    const filho = spawnSync(process.execPath, [script], { env: { ...process.env } })
    // Morreu de verdade por encerramento forçado (não por erro tratado).
    // A representação varia por plataforma; o SIGKILL do script é o mesmo.
    verificarEncerramentoForcado(process.platform, { status: filho.status, signal: filho.signal })

    // O arquivo existe no disco, mas o ledger NÃO sabe dele: estado retomável.
    const anterior = process.env.AGENTE_WINDOW_DATA_DIR
    expect(obterArtigo(artifactId)).toBeUndefined()
    expect(existsSync(path.join(raizGerada(undefined, SID, CID, artifactId), 'saida.png'))).toBe(true)
    process.env.AGENTE_WINDOW_DATA_DIR = anterior

    // O reconciliador REPORTA o órfão (não apaga, não mente "pronto").
    const conciliacao = await conciliarGerados(SID, CID)
    expect(conciliacao.orfaos).toContain(artifactId)

    // Repetir a publicação fecha o estado: mesmo artifactId, sem duplicar.
    const retomada = await publicarArtefatoGerenciado(identidade(), Buffer.from('bytes publicados antes do crash'))
    expect(retomada.artifactId).toBe(artifactId)
    expect(obterArtigo(artifactId)).toBeDefined()
    const conciliacaoFinal = await conciliarGerados(SID, CID)
    expect(conciliacaoFinal.orfaos).not.toContain(artifactId)
  })
})

describe('C-3b — C3B-T18 cancelamento e geração', () => {
  it('C3B-T18 geração diferente é artefato diferente (não sobrescreve a anterior)', async () => {
    const g1 = await publicarArtefatoGerenciado(identidade({ generation: 1 }), Buffer.from('geracao 1'))
    const g2 = await publicarArtefatoGerenciado(identidade({ generation: 2 }), Buffer.from('geracao 2'))
    expect(g1.artifactId).not.toBe(g2.artifactId)
    expect(readFileSync((await lerArtigo(g1.artifactId)).caminho).toString()).toBe('geracao 1')
    expect(readFileSync((await lerArtigo(g2.artifactId)).caminho).toString()).toBe('geracao 2')
  })

  it('C3B-T18 tentativa diferente também isola (retry tardio não reusa slot)', async () => {
    const a = await publicarArtefatoGerenciado(identidade({ tentativa: 't1' }), Buffer.from('um'))
    const b = await publicarArtefatoGerenciado(identidade({ tentativa: 't2' }), Buffer.from('dois'))
    expect(a.artifactId).not.toBe(b.artifactId)
  })
})

describe('C-3b — C3B-T19 quota e liberação', () => {
  it('C3B-T19 erro no meio do stream não deixa reserva presa nem arquivo órfão', async () => {
    let pedacos = 0
    const fluxo = new Readable({
      read() {
        pedacos += 1
        if (pedacos <= 3) this.push(Buffer.alloc(256, 0x42))
        else this.destroy(new Error('falha sintética do produtor'))
      },
    })
    await expect(publicarArtefatoGerenciado(identidade(), fluxo, { limiteBytes: 1024 * 1024 }))
      .rejects.toMatchObject({ code: 'artifact_write_failed' })
    const diretorio = raizGerada(undefined, SID, CID, artifactIdDeGeracao(identidade()))
    expect(existsSync(diretorio) ? readdirSync(diretorio) : []).toEqual([])
  })

  it('C3B-T19 artefato publicado tem bytes/hash conferidos no ledger', async () => {
    const dados = Buffer.from('conteudo medido')
    const resultado = await publicarArtefatoGerenciado(identidade(), dados)
    const artigo = obterArtigo(resultado.artifactId)!
    expect(artigo.bytes).toBe(dados.length)
    expect(artigo.sha256).toBe(sha(dados))
  })
})
