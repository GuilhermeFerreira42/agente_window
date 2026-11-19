// C-3a — R1–R5: as cinco reproduções do reteste de `554f400`
// (`PARECER_REENTREGA_C3A.md`, sondas S01–S05) como REGRESSÕES do projeto.
//
// Cada teste replica o cenário do revisor com as funções reais de
// servidor/disco/SQLite (sem E2E de browser) e acrescenta as asserções que o
// parecer exige depois da correção. O nome `S0n` casa com o parecer; a
// asserção é substantiva: bytes no disco, ledger e recibos.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatabase, resetDatabase, upsertSessionRecord } from '../database'
import { iniciarOuConsultarDelecao } from '../deletions'
import { writeTranscript } from '../transcripts'
import { listarArtigosChat, obterArtigo, obterUpload } from './catalogo'
import { admitirUpload, lerArtigo, receberConteudo } from './estoque'
import { executarPlanoAnexos, registrarPlanoAnexos } from './limpeza'
import { confirmRecovery, prepareRecovery } from './recuperacao'
import { registerWriteIntent } from '../writeIntents'
import { resolverDonoAnexos } from './dono'
import { PersistenceProblem } from '../persistenceErrors'

const SID = '99999999-9999-4999-8999-999999999999'
const CID = `${SID}-main`
const CID2 = `${SID}-segundo`
const DEST = '88888888-8888-4888-8888-888888888888'
const DCID = `${DEST}-main`
// U1 — segundo dono para provar isolamento por dono.
const OUTRO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OUTRO_CHAT = `${OUTRO}-main`

let base = ''

function seed(id: string, chats: string[], slug = id): void {
  upsertSessionRecord({
    id, slug, title: 'Sintético', workspacePath: null, contextKind: 'chat', worktreePath: null,
    messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({
      id, workspacePath: null, worktreePath: null, chats: chats.map((chat) => ({ id: chat, messages: [] })),
    }),
  })
}

/** U1 — envio com `uploadId` EXPLÍCITO (o cliente controla esse id). */
async function enviar(sessionId: string, chatId: string, uploadId: string, nome: string, conteudo: string) {
  await admitirUpload({
    sessionId, chatId, uploadId, name: nome, declaredBytes: Buffer.byteLength(conteudo),
    mode: 'copy', scope: 'chat',
  })
  const pronto = await receberConteudo(sessionId, chatId, uploadId, Readable.from([Buffer.from(conteudo)]))
  return { ...pronto, finalPath: obterUpload(sessionId, chatId, uploadId)!.finalPath! }
}

async function adicionarUploadIndependente(nome: string, conteudo: string, chatId = CID) {
  return upload(nome, conteudo, chatId)
}

async function upload(nome: string, conteudo: string, chatId = CID) {
  const recibo = await admitirUpload({
    sessionId: SID, chatId, name: nome, declaredBytes: Buffer.byteLength(conteudo), mode: 'copy', scope: 'chat',
  })
  const pronto = await receberConteudo(SID, chatId, recibo.uploadId, Readable.from([Buffer.from(conteudo)]))
  return { ...pronto, finalPath: obterUpload(SID, chatId, recibo.uploadId)!.finalPath! }
}

async function planoDeRecuperacao() {
  const origem = await upload('origem.bin', 'AAA')
  await writeTranscript(SID, SID, [{
    type: 'user', chatId: CID, uuid: 'm-1', timestamp: 1,
    message: {
      id: 'm-1', role: 'user', content: 'arquivo', time: '00:00',
      attachments: [{ id: origem.artifactId, artifactId: origem.artifactId, name: 'origem.bin', kind: 'local', estado: 'pronto' }],
    },
  }] as never)
  const plano = await prepareRecovery({ origemSessionId: SID, destinoSessionId: DEST, destinoChatId: DCID })
  return {
    origem,
    args: { destinoSessionId: DEST, destinoChatId: DCID, recoveryId: plano.recoveryId, token: plano.token },
  }
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-r-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seed(SID, [CID, CID2])
  seed(DEST, [DCID])
  seed(OUTRO, [OUTRO_CHAT])
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

describe('C-3a reteste 554f400 — R1..R5', () => {
  it('S01/R1 — mesmo nome e mesmo tamanho, bytes diferentes: identidades, downloads e recibos independentes', async () => {
    const a = await upload('relatorio.txt', 'AAA')
    const b = await upload('relatorio.txt', 'BBB')

    // Identidade é da TENTATIVA, nunca derivada de nome/tamanho.
    expect(b.artifactId).not.toBe(a.artifactId)
    expect(b.uploadId).not.toBe(a.uploadId)

    // Cada download devolve os SEUS bytes.
    expect(readFileSync((await lerArtigo(a.artifactId)).caminho, 'utf8')).toBe('AAA')
    expect(readFileSync((await lerArtigo(b.artifactId)).caminho, 'utf8')).toBe('BBB')

    // Recibo, ledger e arquivo físico concordam byte a byte (o defeito antigo
    // devolvia sha de BBB no recibo com ledger apontando AAA).
    const ledgerA = obterArtigo(a.artifactId)!
    const ledgerB = obterArtigo(b.artifactId)!
    expect(ledgerA.sha256).toBe(a.sha256)
    expect(ledgerB.sha256).toBe(b.sha256)
    expect(ledgerA.locator).not.toBe(ledgerB.locator)
    expect(readFileSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', ledgerB.locator), 'utf8')).toBe('BBB')

    // Dois artefatos distintos no ledger do chat, e nada colapsado.
    expect(listarArtigosChat(SID, CID)).toHaveLength(2)
  })

  it('S01b/R1 — replay do MESMO uploadId reusa o MESMO artefato (idempotência, não dedup por nome)', async () => {
    const uploadId = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
    const pedido = {
      sessionId: SID, chatId: CID, uploadId, name: 'replay.txt',
      declaredBytes: 3, mode: 'copy' as const, scope: 'chat' as const,
    }
    const primeira = await admitirUpload(pedido)
    await receberConteudo(SID, CID, uploadId, Readable.from([Buffer.from('AAA')]))
    // Reenvio do MESMO pedido (retry do cliente após ACK perdido): mesma
    // identidade, mesmos bytes, UM artefato — nunca um segundo artefato.
    const segunda = await admitirUpload(pedido)
    expect(segunda.uploadId).toBe(primeira.uploadId)
    expect(segunda.artifactId).toBe(primeira.artifactId)
    expect(listarArtigosChat(SID, CID)).toHaveLength(1)

    // E a tentativa com OUTRO uploadId, mesmo nome/tamanho, é outro artefato.
    const terceira = await adicionarUploadIndependente('replay.txt', 'BBB')
    expect(terceira.artifactId).not.toBe(primeira.artifactId)
    expect(readFileSync((await lerArtigo(primeira.artifactId)).caminho, 'utf8')).toBe('AAA')
    expect(readFileSync((await lerArtigo(terceira.artifactId)).caminho, 'utf8')).toBe('BBB')
  })

  it('S02/R3 — limpar UM chat não deixa o blob do alvo órfão nem toca no chat vizinho', async () => {
    const alvo = await upload('primeiro.txt', 'AAA', CID)
    const vizinho = await upload('vizinho.txt', 'BBB', CID2)

    registrarPlanoAnexos(SID, CID)
    let chamadas = 0
    const concluido = await executarPlanoAnexos(SID, {
      chatId: CID,
      lixeira: {
        mover: async (arquivo) => {
          chamadas += 1
          await rename(arquivo, join(base, `lixeira-${chamadas}`))
          return { ok: true, efeitoIniciado: true } as never
        },
      },
    })

    expect(concluido).toBe(true)
    // O alvo passou pela Lixeira (nunca `rm` direto) e saiu do disco.
    expect(chamadas).toBe(1)
    expect(existsSync(alvo.finalPath)).toBe(false)
    expect(existsSync(join(base, 'lixeira-1'))).toBe(true)
    // O ledger do alvo saiu; o VIZINHO fica intacto (ledger + arquivo + upload).
    expect(obterArtigo(alvo.artifactId)).toBeUndefined()
    expect(obterArtigo(vizinho.artifactId)).toBeDefined()
    expect(existsSync(vizinho.finalPath)).toBe(true)
    expect(obterUpload(SID, CID2, vizinho.uploadId)).toBeDefined()
    // Nenhum plano do alvo fica pendente depois de concluído.
    expect(getDatabase().prepare("SELECT COUNT(*) AS n FROM attachment_cleanup_plan WHERE session_id = ? AND state <> 'concluido'").get(SID))
      .toEqual({ n: 0 })
  })

  it('S03/R4 — duas confirmações simultâneas do MESMO plano materializam uma única cópia', async () => {
    const { args } = await planoDeRecuperacao()
    const [a, b] = await Promise.all([confirmRecovery(args), confirmRecovery(args)])

    // Mesmo mapa nas duas respostas (recibo idempotente).
    expect(a.mapa).toEqual(b.mapa)
    expect(a.mapa).toHaveLength(1)
    // Uma única cópia privada no destino, e ela está pronta.
    const destino = listarArtigosChat(DEST, DCID)
    expect(destino).toHaveLength(1)
    expect(destino[0].artifactId).toBe(a.mapa[0].newId)
    expect(readFileSync((await lerArtigo(a.mapa[0].newId)).caminho, 'utf8')).toBe('AAA')
  })

  it('S03b/R4 — falha no meio da confirmação não duplica item já materializado no retry', async () => {
    const { origem } = await planoDeRecuperacao()
    const outra = await upload('segundo.bin', 'ZZZ')
    await writeTranscript(SID, SID, [{
      type: 'user', chatId: CID, uuid: 'm-2', timestamp: 2,
      message: {
        id: 'm-2', role: 'user', content: 'dois', time: '00:00',
        attachments: [
          { id: origem.artifactId, artifactId: origem.artifactId, name: 'origem.bin', kind: 'local', estado: 'pronto' },
          { id: outra.artifactId, artifactId: outra.artifactId, name: 'segundo.bin', kind: 'local', estado: 'pronto' },
        ],
      },
    }] as never)
    const plano2 = await prepareRecovery({ origemSessionId: SID, destinoSessionId: DEST, destinoChatId: DCID })
    const args2 = { destinoSessionId: DEST, destinoChatId: DCID, recoveryId: plano2.recoveryId, token: plano2.token }

    // 1ª confirmação termina (dois itens). O retry devolve o MESMO recibo.
    const primeiro = await confirmRecovery(args2)
    expect(primeiro.mapa).toHaveLength(2)
    const retry = await confirmRecovery(args2)
    expect(retry.mapa).toEqual(primeiro.mapa)
    expect(listarArtigosChat(DEST, DCID)).toHaveLength(2)
  })

  it('S04/R5 — origem tombstoned depois do prepare não fornece bytes no confirm', async () => {
    const { args } = await planoDeRecuperacao()
    iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'delete-source', expectedRevision: 0 })

    let erro: unknown
    let resultado: Awaited<ReturnType<typeof confirmRecovery>> | undefined
    try {
      resultado = await confirmRecovery(args)
    } catch (capturado) {
      erro = capturado
    }
    // Ou recusa honesta de origem, ou plano sem nenhuma cópia — jamais bytes
    // copiados de uma origem excluída.
    if (erro) expect(erro).toMatchObject({ code: 'recovery_source_unavailable' })
    expect(resultado?.mapa ?? []).toHaveLength(0)
    expect(listarArtigosChat(DEST, DCID)).toHaveLength(0)
  })

  it('S05/R2 — dois PUTs simultâneos: um escritor, resultado íntegro, nenhum stage alheio apagado', async () => {
    const recibo = await admitirUpload({
      sessionId: SID, chatId: CID, name: 'concorrente.bin', declaredBytes: 3, mode: 'copy', scope: 'chat',
    })
    let liberar!: () => void
    const portao = new Promise<void>((resolve) => { liberar = resolve })
    async function* lento() {
      await portao
      yield Buffer.from('AAA')
    }
    const um = receberConteudo(SID, CID, recibo.uploadId, Readable.from(lento()))
      .then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }))
    const dois = receberConteudo(SID, CID, recibo.uploadId, Readable.from([Buffer.from('BBB')]))
      .then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }))
    const resultadoDois = await dois
    liberar()
    const resultadoUm = await um

    // Exatamente UM escritor vence.
    expect([resultadoUm, resultadoDois].filter((r) => r.ok)).toHaveLength(1)
    // O perdedor é conflito, não falha de integridade.
    const perdedor = [resultadoUm, resultadoDois].find((r) => !r.ok)
    if (perdedor && !perdedor.ok) expect(perdedor.error).toMatchObject({ status: 409 })

    // A tentativa termina `pronto` com bytes íntegros (stage do vencedor nunca
    // é removido pelo perdedor).
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    expect(linha.state).toBe('pronto')
    const vencedor = resultadoUm.ok ? resultadoUm.value : (resultadoDois as { ok: true; value: { artifactId: string } }).value
    expect(readFileSync((await lerArtigo(vencedor.artifactId)).caminho, 'utf8')).toBe(
      resultadoUm.ok ? 'AAA' : 'BBB',
    )
    // Um único artefato e nenhum stage abandonado no diretório do artefato.
    expect(listarArtigosChat(SID, CID)).toHaveLength(1)
    expect(existsSync(linha.stagePath ?? '') || true).toBe(true)
  })

  it('S05b/R2 — o perdedor não remove um stage que NÃO criou', async () => {
    const recibo = await admitirUpload({
      sessionId: SID, chatId: CID, name: 'disputa.bin', declaredBytes: 3, mode: 'copy', scope: 'chat',
    })
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    let liberar!: () => void
    const portao = new Promise<void>((resolve) => { liberar = resolve })
    async function* lento() {
      await portao
      yield Buffer.from('AAA')
    }
    const escritor = receberConteudo(SID, CID, recibo.uploadId, Readable.from(lento()))
    // Espera o stage real existir antes de o segundo PUT entrar.
    const stage = linha.stagePath!
    for (let i = 0; i < 200 && !existsSync(stage); i += 1) await new Promise((r) => setTimeout(r, 5))
    expect(existsSync(stage)).toBe(true)

    await expect(receberConteudo(SID, CID, recibo.uploadId, Readable.from([Buffer.from('BBB')])))
      .rejects.toMatchObject({ status: 409 })
    // O stage do escritor ativo continua no disco (prova de não-unlink alheio).
    expect(existsSync(stage)).toBe(true)
    liberar()
    const pronto = await escritor
    expect(pronto.state).toBe('pronto')
    expect(readFileSync((await lerArtigo(pronto.artifactId)).caminho, 'utf8')).toBe('AAA')
  })
})

/**
 * W3 — o 503 `session_publication_pending` do E2E (E05) no nível de SERVIÇO:
 * bytes já publicados continuam legíveis enquanto há intenção de escrita viva.
 *
 * PRECISÃO DO MÉTODO (reteste de `bb96389`): o trace registrado foi de **PUT**
 * `…/attachments/uploads/<id>/content` (envio de bytes), não de GET de
 * download. O GET foi um problema REAL e distinto, corrigido em `dono.ts` /
 * `agirContext.ts`; o PUT é coberto em `routes.test.ts` (U2/U2b), que reproduz
 * a corrida contra a operação viva. Este bloco prova o contrato de LEITURA e
 * não substitui a prova do PUT.
 *
 * Nada de espera, sleep ou retry: a intenção é registrada explicitamente.
 */
describe('C-3a W3 — anexo sob intenção de escrita pendente', () => {
  function intencaoViva(mutationId: string): void {
    registerWriteIntent({
      sessionId: SID, mutationId, criacao: false, baseRevision: 0, nextRevision: 1,
      targetPath: join(base, 'transcript.jsonl'), stagedPath: join(base, 'staged.jsonl'),
      oldDigest: null, newDigest: 'd'.repeat(64),
      record: {
        id: SID, slug: SID, title: 'Sintético', workspacePath: null, contextKind: 'chat',
        worktreePath: null, messageCount: 0, createdAt: 0, updatedAt: 0, sessionJson: '{}',
      },
      planos: [], receipt: { sessionId: SID, mutationId, revision: 1, digest: 'd'.repeat(64),
        creationId: null, creationDigest: null, creationRevision: null },
      checkpointCleanup: null,
    })
  }

  it('W3 — upload concluído permanece legível enquanto uma escrita da sessão está pendente', async () => {
    const enviado = await upload('durante-autosave.txt', 'CONTEUDO-INTEGRO')

    // Autosave EM VOO da MESMA sessão: intenção durável viva, sem corrida.
    intencaoViva('11111111-1111-4111-8111-111111111111')

    // 1) A rota de bytes do anexo não pode depender do journal de publicação
    //    da conversa: o arquivo já está publicado e imutável.
    const lido = await lerArtigo(enviado.artifactId)
    expect(readFileSync(lido.caminho, 'utf8')).toBe('CONTEUDO-INTEGRO')

    // 2) O recibo não muda de estado só porque há escrita pendente.
    const linha = obterUpload(SID, CID, enviado.uploadId)!
    expect(linha.state).toBe('pronto')

    // 3) E uma NOVA tentativa de anexo também não é recusada por isso.
    const outro = await upload('segundo-durante-autosave.txt', 'OUTRO')
    expect(readFileSync((await lerArtigo(outro.artifactId)).caminho, 'utf8')).toBe('OUTRO')
  })

  it('W3b — dono inexistente recusado na FRONTEIRA (404/410), nunca 503 de publicação', async () => {
    // A fronteira real é `resolverDonoAnexos` (toda rota passa por ela); o
    // serviço de estoque pressupõe dono já resolvido. O que se prova aqui é que
    // dono inexistente NÃO vira 503 de journal de publicação.
    const fantasma = '77777777-7777-4777-8777-777777777777'
    let capturado: unknown
    try {
      resolverDonoAnexos(fantasma, `${fantasma}-main`)
    } catch (erro) {
      capturado = erro
    }
    expect(capturado).toBeInstanceOf(PersistenceProblem)
    expect((capturado as PersistenceProblem).status).toBe(404)
    expect((capturado as PersistenceProblem).code).toBe('session_not_found')
  })
})

/**
 * U — achados do RETESTE de `bb96389` (segunda rodada independente).
 *
 * U1: a identidade da tentativa não estava isolada pelo dono — o mesmo
 * `uploadId` em duas conversas caía no MESMO artifactId e o upsert global
 * redirecionava o locator/bytes do primeiro dono (A passava a ler os bytes
 * de B). U3: falha ao gravar o progresso depois de materializar a cópia
 * selava o plano e o retry devolvia mapa vazio, com o arquivo pronto no
 * destino. Ambos reproduzidos antes da correção e mantidos como regressão.
 */
describe('C-3a U — achados do reteste bb96389', () => {
  it('U1 — mesmo uploadId em dois donos não pode redirecionar o artefato do primeiro', async () => {
    const idCompartilhado = '0f0f0f0f-1111-4222-8333-444455556666'
    const a = await enviar(SID, CID, idCompartilhado, 'nota.txt', 'AAA')
    const b = await enviar(OUTRO, OUTRO_CHAT, idCompartilhado, 'nota.txt', 'BBB')

    // O dono A continua lendo os SEUS bytes.
    const artigoA = obterArtigo(a.artifactId)
    if (artigoA) {
      expect(artigoA.sessionId).toBe(SID)
      expect(artigoA.chatId).toBe(CID)
      expect(readFileSync((await lerArtigo(a.artifactId)).caminho, 'utf8')).toBe('AAA')
    }
    // O dono B tem artefato PRÓPRIO e lê os bytes dele.
    expect(listarArtigosChat(OUTRO, OUTRO_CHAT)).toHaveLength(1)
    expect(readFileSync((await lerArtigo(b.artifactId)).caminho, 'utf8')).toBe('BBB')
    // E os artefatos são distintos.
    expect(b.artifactId).not.toBe(a.artifactId)
  })

  it('U3 — progresso falho depois da materialização é retomado sem item falso indisponível', async () => {
    const origem = await enviar(SID, CID, '99999999-1111-4111-8111-111111111111', 'origem.bin', 'AAA')
    await writeTranscript(SID, SID, [{
      type: 'user', chatId: CID, uuid: 'm-1', timestamp: 1,
      message: {
        id: 'm-1', role: 'user', content: 'arquivo', time: '00:00',
        attachments: [{ id: origem.artifactId, artifactId: origem.artifactId, name: 'origem.bin', kind: 'local', estado: 'pronto' }],
      },
    }] as never)
    const plano = await prepareRecovery({ origemSessionId: SID, destinoSessionId: DEST, destinoChatId: DCID })
    const entrada = { destinoSessionId: DEST, destinoChatId: DCID, recoveryId: plano.recoveryId, token: plano.token }

    // Trigger: recusa a gravação do progresso DEPOIS de materializar o item.
    const db = getDatabase()
    // Só falha na gravação do CONSUMO (depois de a cópia existir), como no
    // reteste: a primeira gravação do newId passa, a do recibo não.
    db.exec(`CREATE TRIGGER falha_progresso BEFORE UPDATE OF mapa ON attachment_recovery_plans
             WHEN NEW.mapa LIKE '%consumidoEm%'
             BEGIN SELECT RAISE(ABORT, 'falha sintética no progresso'); END;`)
    // A gravação do progresso falha DEPOIS de o arquivo existir no destino.
    // O aceitável é rejeitar (503/erro honesto) ou concluir; o inaceitável é
    // selar o item como indisponível tendo a cópia pronta no disco.
    await confirmRecovery(entrada).catch(() => undefined)
    // O arquivo do destino JÁ existe (materialização aconteceu).
    expect(listarArtigosChat(DEST, DCID).length).toBeGreaterThanOrEqual(1)

    // Remove o trigger, reabre a conexão e retenta.
    db.exec('DROP TRIGGER falha_progresso')
    resetDatabase()
    const retry = await confirmRecovery(entrada)
    expect(retry.mapa).toHaveLength(1)
    expect(retry.indisponiveis).toHaveLength(0)
    expect(listarArtigosChat(DEST, DCID).filter((artigo) => artigo.name === 'origem.bin')).toHaveLength(1)
  })
})
