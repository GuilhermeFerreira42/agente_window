import type { IncomingMessage, ServerResponse } from 'node:http'
import { createHash, randomUUID } from 'node:crypto'
import type { Plugin } from 'vite'
import type { ChatMessage, Session } from '../../types'
import { deleteSessionRecord, excluirMemoriaProjeto, getCheckpoint, getSessionRecord, grantSessionTool, listarMemoriasProjeto, listSessionRecords, publicarMemoriaProjeto, removerCheckpointsDeChatsAusentes, revokeSessionToolGrants, saveCheckpoint, upsertSessionRecord, type SessionToolGrant } from './database'
import { resolverContextoAgir } from './agirContext'
import { sanitizePath } from './paths'
import { deleteTranscript, readTranscript, writeTranscript, type TranscriptEntry } from './transcripts'
import { projetarMensagemPersistida, projetarSessaoPersistida } from '../../domain/projecaoTranscript'
import { createWorktree, observarGit, removeWorktree, WorktreeDirtyError } from './worktrees'
import { listRecentWorkspaces, listWorkspaceDirectories, pickWorkspaceDirectory, rememberWorkspace, validateWorkspace, validateWorkspacePath, WorktreeRequiresGitError } from './workspaces'
// FATIA 08 (D69): Provedores é a primeira CASA (bairro 2). A "prefeitura" só
// reconhece os caminhos e delega — nenhuma regra de provedores mora aqui.
import { rotaPertenceAoModulo, tratarRotasProvedores } from '../../bairros/2-inteligencia/casas/provedores/server/rotas'
import { rotaPertenceAoModuloConversa, tratarRotasConversa } from '../../bairros/2-inteligencia/casas/conversa/server/rotas'
import { conversaEmExecucao, conversaTemPausa, rotaPertenceAoModuloAgir, tratarRotasAgir } from '../../bairros/2-inteligencia/casas/agir/server/rotas'
import { validarSelecaoModelo } from '../../bairros/2-inteligencia/casas/agir/server/protocoloHttp'
import type { RegistroExecucaoAgir } from '../../bairros/2-inteligencia/casas/agir'
import { definirModoAgir, definirPermissaoAgir, lerModoAgir, lerPermissaoAgir, definirExclusaoAutomaticaAgir, lerExclusaoAutomaticaAgir } from '../../bairros/2-inteligencia/casas/agir/server/modos'
import { resolveShell } from '../../../../../services/pty-server/src/shellDetector'
import { rotaPertenceAoModuloConfig, tratarRotasConfig } from '../../bairros/2-inteligencia/casas/config/server/rotas'
import { lerConfig } from '../../bairros/2-inteligencia/casas/config/server/repo'
// FATIA 14 (D69): Personalizações é a casa que nasce nesta fatia. A prefeitura
// reconhece o caminho e delega — nenhuma regra de skill mora aqui.
import { rotaPertenceAoModuloPersonalizacoes, tratarRotasPersonalizacoes } from '../../bairros/2-inteligencia/casas/personalizacoes/server/rotas'
import { comporContexto as comporContextoDePersonalizacoes } from './composicaoContexto'
import { obterAlvoDeConversa } from './chatAlvo'
import { iniciarChamadaModelo } from '../../bairros/2-inteligencia/casas/provedores/server/providersRepo'
import { sanarCartoesDeSessao } from '../../services/agir/sanar'
import { projetarHistoricoAgir, type EventoGravado } from './historicoAgir'
import { aplicarCheckpoint, checkpointCorresponde, mensagensDoCheckpoint, proporCheckpoint, type Checkpoint } from './checkpoint'
import { gerarResumo } from './compactacao'
import { buscarTranscript } from './buscaTranscript'
import { recuperarHistorico } from './recuperarHistorico'
import { conferirArquivosOperacionais, revisarOperacao, ultimoReciboOperacional } from './retomadaOperacional'
import { criarMemoriaAutomatica, selecionarMemorias, type EscopoMemoria, type FonteMemoria } from './memoriaAutomatica'
import { LIMITE_CONSULTA_TRANSCRIPT } from '../../domain/buscaTranscript'
import { LIMITE_CONTEUDO_MEMORIA, LIMITE_MOTIVO_MEMORIA, pareceCredencial, TIPOS_MEMORIA, type TipoMemoria } from '../../domain/memoriaProjeto'

const API_PREFIX = '/api/sessions'
const WORKTREES_ENDPOINT = '/api/worktrees'

// Serialize mutations and reads for one session in this single server process.
// Besides protecting JSONL replacement, this keeps the SQLite catalog and its
// transcript from being observed half-way through one save/delete operation.
const sessionPersistenceQueues = new Map<string, Promise<void>>()

function withSessionPersistenceQueue<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
  const previous = sessionPersistenceQueues.get(sessionId) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const tail = previous.then(() => gate, () => gate)
  sessionPersistenceQueues.set(sessionId, tail)

  const result = previous.catch(() => undefined).then(operation)
  void tail.then(() => {
    if (sessionPersistenceQueues.get(sessionId) === tail) sessionPersistenceQueues.delete(sessionId)
  })
  return result.finally(release)
}
const WORKSPACES_VALIDATE_ENDPOINT = '/api/workspaces/validate'
const WORKSPACES_PICK_ENDPOINT = '/api/workspaces/pick'
const WORKSPACES_RECENT_ENDPOINT = '/api/workspaces/recent'
const compactacoesEmCurso = new Set<string>()
const chaveEscopo = (raiz: string) => createHash('sha256').update(raiz).digest('hex')

async function lerFonteMemoria(contexto: EscopoMemoria): Promise<FonteMemoria> {
  const record = getSessionRecord(contexto.sessionId)
  const atual = resolverContextoAgir(contexto.sessionId, contexto.chatId)
  if (!record || !atual.ok || atual.raiz !== contexto.raiz) throw new Error('O escopo da memória mudou.')
  return { entries: await readTranscript(record.slug, record.id, 16 * 1024 * 1024),
    escopo: chaveEscopo(contexto.raiz), checkpoint: getCheckpoint(record.id, contexto.chatId) }
}

const prepararChamadaAutomatica = criarMemoriaAutomatica({
  bloqueios: compactacoesEmCurso, iniciarModelo: iniciarChamadaModelo,
  ler: (contexto) => withSessionPersistenceQueue(contexto.sessionId, () => lerFonteMemoria(contexto)),
  publicar: (contexto, anterior, checkpoint, sinal) => withSessionPersistenceQueue(contexto.sessionId, async () => {
    const atual = await lerFonteMemoria(contexto)
    if (sinal.aborted || JSON.stringify(atual.checkpoint) !== JSON.stringify(anterior.checkpoint) ||
        !checkpointCorresponde(checkpoint, atual.entries, contexto.chatId, atual.escopo)) return false
    saveCheckpoint(contexto.sessionId, contexto.chatId, checkpoint)
    return true
  }),
  memorias: (contexto) => withSessionPersistenceQueue(contexto.sessionId, async () => {
    await lerFonteMemoria(contexto)
    return listarMemoriasProjeto(chaveEscopo(contexto.raiz.normalize('NFC')))
  }),
})

export interface SessionPersistencePluginOptions {
  repoRoot: string
}

interface PersistedSessionPayload {
  session: Session
}

function validPersistenceRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

class SnapshotGrandeError extends Error {}
const LIMITE_CORPO_SESSAO = 16 * 1024 * 1024

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  let bytes = 0
  let excedido = false
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > LIMITE_CORPO_SESSAO) excedido = true
    if (!excedido) chunks.push(buffer)
  }
  if (excedido) throw new SnapshotGrandeError('A solicitação excede o limite de 16 MiB.')
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(value))
}

function transcriptEntries(session: Session): TranscriptEntry[] {
  let timestamp = Date.now() - session.chats.reduce((total, chat) => total + chat.messages.length, 0)
  return session.chats.flatMap((chat) => chat.messages
    // Respostas ainda em streaming são estado transitório de UI. Persisti-las
    // faria um F5 restaurar para sempre uma bolha vazia em `running: true`.
    .filter((message) => !message.running)
    .map((message) => ({
      type: message.role,
      chatId: chat.id,
      message: projetarMensagemPersistida(message),
      uuid: message.id,
      timestamp: timestamp += 1,
    })))
}

function restoreMessages(session: Session, entries: TranscriptEntry[]): Session {
  session = projetarSessaoPersistida(session)
  const byChat = new Map<string, ChatMessage[]>()
  for (const entry of entries) {
    if (entry.type === 'agir_event') continue
    const messages = byChat.get(entry.chatId) ?? []
    messages.push(projetarMensagemPersistida(entry.message as ChatMessage))
    byChat.set(entry.chatId, messages)
  }
  return {
    ...session,
    chats: session.chats.map(({ revisaoOperacional: _anterior, ...chat }) => ({
      ...chat, messages: byChat.get(chat.id) ?? [],
      ...(ultimoReciboOperacional(entries, chat.id).length > 0 ? { revisaoOperacional: true } : {}),
    })),
  }
}

async function gravarExecucaoAgir(registro: RegistroExecucaoAgir): Promise<void> {
  const { sessionId, chatId, runId, anterior, turnoId, raiz, alvo, eventos, pedidoId, categoria } = registro
  await withSessionPersistenceQueue(sessionId, async () => {
    const record = getSessionRecord(sessionId)
    const contexto = resolverContextoAgir(sessionId, chatId)
    if (!record || !contexto.ok || contexto.raiz !== raiz) throw new Error('Contexto do transcript mudou.')
    const anteriores = await readTranscript(record.slug, sessionId)
    const ids = new Set(anteriores.filter((entry) => entry.type === 'agir_event').map(({ uuid }) => uuid))
    let sequence = anteriores.reduce((maior, entry) => entry.type === 'agir_event' && entry.chatId === chatId
      ? Math.max(maior, entry.sequence ?? 0) : maior, 0)
    if (!Number.isSafeInteger(sequence + eventos.length)) throw new Error('Sequência do transcript esgotada.')
    const timestamp = Date.now()
    const escopo = chaveEscopo(raiz)
    const primeiro = anteriores.find((entry) => entry.type === 'agir_event' && entry.uuid === `${runId}:1`)?.message as EventoGravado | undefined
    const git = primeiro ? primeiro.git : await observarGit(raiz)
    const novos = eventos.flatMap((evento, indice): TranscriptEntry[] => {
      const uuid = `${runId}:${indice + 1}`
      if (ids.has(uuid)) return []
      return [{ type: 'agir_event', chatId, uuid, timestamp, sequence: ++sequence,
        message: { version: 1, runId, anterior, turnoId, escopo, alvo, evento, git, pedidoId, categoria } satisfies EventoGravado }]
    })
    if (novos.length) await writeTranscript(record.slug, sessionId, [...anteriores, ...novos])
  })
}

async function lerRevisaoOperacional(sessionId: string, chatId: string) {
  const record = getSessionRecord(sessionId)
  if (!record) return
  const session = JSON.parse(record.sessionJson) as Session
  if (!session.chats.some((chat) => chat.id === chatId)) return
  const contexto = resolverContextoAgir(sessionId, chatId)
  const entries = await readTranscript(record.slug, sessionId, 16 * 1024 * 1024)
  const revisao = revisarOperacao(entries, chatId, contexto.ok ? chaveEscopo(contexto.raiz) : undefined,
    contexto.ok ? await observarGit(contexto.raiz) : null, conversaTemPausa(sessionId, chatId))
  if (revisao && contexto.ok) await conferirArquivosOperacionais(revisao, entries, chatId, contexto.raiz)
  return { revisao: revisao ?? null, ativa: conversaEmExecucao(sessionId, chatId) }
}

async function revisarRetomada(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const input = await readJson<{ sessionId?: unknown; chatId?: unknown } | null>(request)
    if (!input || typeof input.sessionId !== 'string' || typeof input.chatId !== 'string') {
      sendJson(response, 400, { message: 'Informe a sessão e a conversa.' })
      return
    }
    const resultado = await withSessionPersistenceQueue(input.sessionId, () => lerRevisaoOperacional(input.sessionId as string, input.chatId as string))
    if (!resultado) sendJson(response, 404, { message: 'A conversa não pertence à sessão.' })
    else sendJson(response, 200, resultado)
  } catch {
    sendJson(response, 409, { message: 'Não foi possível conferir o estado operacional.' })
  }
}

async function compactarSessao(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let input: { sessionId?: unknown; chatId?: unknown; modelSelection?: unknown } | null
  try {
    input = await readJson(request)
  } catch {
    input = null
  }
  const selecao = validarSelecaoModelo(input?.modelSelection)
  if (!input || typeof input.sessionId !== 'string' || typeof input.chatId !== 'string' || !selecao) {
    sendJson(response, 400, { code: 'invalid_checkpoint', message: 'Sessão, conversa ou modelo inválido.' })
    return
  }
  const { sessionId, chatId } = input
  const chave = JSON.stringify([sessionId, chatId])
  if (compactacoesEmCurso.has(chave) || conversaEmExecucao(sessionId, chatId)) {
    sendJson(response, 409, { code: 'checkpoint_busy', message: 'Aguarde o término da execução atual.' })
    return
  }
  compactacoesEmCurso.add(chave)
  const abort = new AbortController()
  const fechar = () => { if (!response.writableEnded) abort.abort() }
  response.on('close', fechar)
  async function lerFonte() {
    const sessao = getSessionRecord(sessionId)
    const contexto = resolverContextoAgir(sessionId, chatId)
    if (!sessao || !contexto.ok) return
    const escopo = chaveEscopo(contexto.raiz)
    return { escopo, entries: await readTranscript(sessao.slug, sessionId), checkpoint: getCheckpoint(sessionId, chatId) }
  }
  try {
    const fonte = await withSessionPersistenceQueue(sessionId, lerFonte)
    const fronteira = fonte && proporCheckpoint(fonte.entries, chatId, fonte.escopo)
    if (!fonte || !fronteira) {
      sendJson(response, 409, { code: 'checkpoint_boundary', message: 'Ainda não há turnos completos suficientes para compactar com segurança.' })
      return
    }
    const anterior = fonte.checkpoint && checkpointCorresponde(fonte.checkpoint, fonte.entries, chatId, fonte.escopo)
      ? fonte.checkpoint : undefined
    if (anterior && anterior.quantidade >= fronteira.quantidade) {
      sendJson(response, 409, { code: 'checkpoint_unchanged', message: 'Nenhum turno adicional está pronto para compactar.' })
      return
    }
    const { alvo } = await obterAlvoDeConversa(selecao)
    if (!alvo?.providerId || !alvo.modelId) {
      sendJson(response, 409, { code: 'checkpoint_model', message: 'Escolha um modelo disponível antes de compactar.' })
      return
    }
    const delta = mensagensDoCheckpoint(fonte.entries, chatId).slice(anterior?.quantidade ?? 0, fronteira.quantidade)
      .map(({ type, uuid, message }) => ({ role: type === 'assistant' ? 'assistant' as const : 'user' as const, id: uuid, content: (message as ChatMessage).content }))
    const historico = projetarHistoricoAgir(fonte.entries, chatId, fonte.escopo, delta).mensagens
    const resumo = await gerarResumo(alvo, historico, anterior?.resumo, iniciarChamadaModelo, abort.signal)
    const checkpoint: Checkpoint = {
      ...fronteira, version: 1, estrategia: 'manual', escopo: fonte.escopo, resumo,
      providerId: alvo.providerId, modelId: alvo.modelId, criadoEm: Date.now(),
    }
    const gravado = await withSessionPersistenceQueue(sessionId, async () => {
      const atual = await lerFonte()
      if (!atual || abort.signal.aborted || conversaEmExecucao(sessionId, chatId) ||
          !checkpointCorresponde(checkpoint, atual.entries, chatId, atual.escopo) ||
          JSON.stringify(atual.checkpoint) !== JSON.stringify(fonte.checkpoint)) return false
      saveCheckpoint(sessionId, chatId, checkpoint)
      return true
    })
    if (abort.signal.aborted) return
    if (gravado) sendJson(response, 200, { cobertas: fronteira.quantidade, ultimaEm: checkpoint.criadoEm })
    else sendJson(response, 409, { code: 'checkpoint_conflict', message: 'O contexto mudou durante a compactação.' })
  } catch {
    if (!abort.signal.aborted) sendJson(response, 502, { code: 'checkpoint_failed', message: 'A compactação falhou. O histórico e o checkpoint anterior foram preservados.' })
  } finally {
    response.off('close', fechar)
    compactacoesEmCurso.delete(chave)
  }
}

async function buscarHistorico(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let input: { sessionId?: unknown; chatId?: unknown; query?: unknown } | null
  try {
    input = await readJson(request)
  } catch {
    input = null
  }
  if (!input || typeof input.sessionId !== 'string' || typeof input.chatId !== 'string' ||
      typeof input.query !== 'string' || !input.query.trim() || input.query.length > LIMITE_CONSULTA_TRANSCRIPT) {
    sendJson(response, 400, { code: 'invalid_search', message: 'Informe a conversa e um termo de busca válido.' })
    return
  }
  const { sessionId, chatId, query } = input
  try {
    const resultado = await withSessionPersistenceQueue(sessionId, async () => {
      const record = getSessionRecord(sessionId)
      if (!record) return
      const session = JSON.parse(record.sessionJson) as Session
      if (session.id !== sessionId || !session.chats.some((chat) => chat.id === chatId)) return
      const entries = await readTranscript(record.slug, sessionId, 16 * 1024 * 1024)
      return buscarTranscript(entries, chatId, query.trim())
    })
    if (resultado) sendJson(response, 200, resultado)
    else sendJson(response, 404, { code: 'chat_not_found', message: 'A conversa não pertence a esta sessão.' })
  } catch (erro) {
    const grande = (erro as { code?: unknown })?.code === 'TRANSCRIPT_TOO_LARGE'
    sendJson(response, grande ? 413 : 409, { code: 'search_unavailable',
      message: grande ? 'O histórico excede o limite da busca.' : 'Não foi possível consultar o histórico.' })
  }
}

async function gerirMemoriaProjeto(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let input: Record<string, unknown> | null
  try { input = await readJson(request) } catch { input = null }
  if (!input || typeof input.sessionId !== 'string' || typeof input.chatId !== 'string') {
    sendJson(response, 400, { message: 'Informe a sessão e a conversa atuais.' })
    return
  }
  const { sessionId, chatId, operacao, revisao } = input
  try {
    await withSessionPersistenceQueue(sessionId, async () => {
      const contexto = resolverContextoAgir(sessionId, chatId)
      if (!contexto.ok) {
        sendJson(response, 409, { message: 'O projeto da conversa não está disponível.' })
        return
      }
      const projeto = chaveEscopo(contexto.raiz.normalize('NFC'))
      if (operacao === 'listar') {
        const fontes = new Map<string, Promise<Set<string>>>()
        let leiturasDeFonte = 0
        function origemDe(id: string, checarMensagens: boolean): Promise<Set<string>> {
          const chave = JSON.stringify([id, checarMensagens])
          const atual = fontes.get(chave)
          if (atual) return atual
          const resolver = async (): Promise<Set<string>> => {
            const record = getSessionRecord(id)
            if (!record) return new Set()
            const pasta = validateWorkspacePath(record.worktreePath || record.workspacePath)
            if (!pasta.valid || !pasta.exists || !pasta.isDir || chaveEscopo(pasta.realpath.normalize('NFC')) !== projeto) return new Set()
            if (!checarMensagens) {
              const sessao = JSON.parse(record.sessionJson) as Session
              return new Set(sessao.chats.map((chat) => chat.id))
            }
            const entradas = await readTranscript(record.slug, id, 4 * 1024 * 1024)
            return new Set(entradas.filter((entry) => entry.type !== 'agir_event').map((entry) => JSON.stringify([entry.chatId, entry.uuid])))
          }
          const consulta = resolver().catch(() => new Set<string>())
          fontes.set(chave, consulta)
          return consulta
        }
        const memorias = listarMemoriasProjeto(projeto)
        for (const memoria of memorias) {
          const { sessionId: fonte, chatId: chat, messageId: mensagem } = memoria.origem
          const chave = JSON.stringify([fonte, Boolean(mensagem)])
          if (mensagem && !fontes.has(chave) && ++leiturasDeFonte > 16) continue
          const origens = await origemDe(fonte, Boolean(mensagem))
          memoria.origemDisponivel = origens.has(mensagem ? JSON.stringify([chat, mensagem]) : chat)
        }
        sendJson(response, 200, { projeto: contexto.raiz, projetoId: projeto, memorias })
        return
      }
      if (input.projetoId !== projeto) {
        sendJson(response, 409, { message: 'O projeto mudou. Abra a memória do projeto atual antes de gravar.' })
        return
      }
      const id = typeof input.id === 'string' && /^[a-f0-9-]{36}$/i.test(input.id) ? input.id : undefined
      if (input.confirmado !== true || typeof revisao !== 'number' || !Number.isSafeInteger(revisao) || revisao < 0 ||
          (id ? revisao === 0 : revisao !== 0)) {
        sendJson(response, 400, { message: 'Confirme a ação e informe uma revisão válida.' })
        return
      }
      if (operacao === 'excluir' && id) {
        const apagou = excluirMemoriaProjeto(projeto, id, revisao)
        sendJson(response, apagou ? 200 : 409, { message: apagou ? 'Memória excluída.' : 'A memória mudou ou já foi removida.' })
        return
      }
      const conteudo = typeof input.conteudo === 'string' ? input.conteudo.trim() : ''
      const motivo = typeof input.motivo === 'string' ? input.motivo.trim() : ''
      const tipo = input.tipo as TipoMemoria
      if (operacao !== 'gravar' || !TIPOS_MEMORIA.includes(tipo) || !conteudo || conteudo.length > LIMITE_CONTEUDO_MEMORIA ||
          motivo.length > LIMITE_MOTIVO_MEMORIA || (revisao > 0 && !motivo) || pareceCredencial(conteudo) || pareceCredencial(motivo)) {
        sendJson(response, 400, { message: 'Revise o tipo, os limites e o conteúdo. Credenciais não podem ser salvas.' })
        return
      }
      const messageId = typeof input.messageId === 'string' && input.messageId ? input.messageId : undefined
      if (messageId) {
        const record = getSessionRecord(sessionId)
        const entries = record ? await readTranscript(record.slug, sessionId) : []
        if (!entries.some((entry) => entry.chatId === chatId && entry.type !== 'agir_event' && entry.uuid === messageId)) {
          sendJson(response, 409, { message: 'A mensagem de origem não pertence ao histórico atual.' })
          return
        }
      }
      const resultado = publicarMemoriaProjeto(projeto, {
        id: id ?? randomUUID(), tipo, conteudo, motivo, criadaEm: Date.now(), origem: { sessionId, chatId, messageId },
      }, revisao)
      sendJson(response, resultado === 'ok' ? 200 : 409, { message: resultado === 'ok' ? 'Memória gravada.' :
        resultado === 'limite' ? 'O projeto atingiu o limite de revisões.' : 'A memória mudou. Recarregue antes de editar.' })
    })
  } catch {
    sendJson(response, 409, { message: 'A memória do projeto está indisponível.' })
  }
}

function sanarStatusAposF5(session: Session): Session {
  // FATIA 09 (§3.8): mensagens em streaming NÃO são persistidas (decisão da
  // §9.1 — evita bolha vazia eterna), então depois do F5 nunca existe nada
  // rodando. Um status 'working' gravado no meio da corrida (F5 durante o
  // streaming) ficaria ÓRFÃO para sempre: chip "Trabalhando" fantasma e
  // composer travado. Na restauração, ele vira 'completed'.
  return sanarCartoesDeSessao({
    ...session,
    status: session.status === 'working' ? 'completed' : session.status,
    chats: session.chats.map((chat) => (chat.status === 'working' ? { ...chat, status: 'completed' } : chat)),
  })
}

async function listSessions(): Promise<Session[]> {
  const records = listSessionRecords()
  const sessions = await Promise.all(records.map((record) => withSessionPersistenceQueue(record.id, async () => {
    // Re-read inside the queue: the record may have changed or been deleted
    // while this GET waited for an in-flight save.
    const current = getSessionRecord(record.id)
    if (!current) return undefined
    const session = JSON.parse(current.sessionJson) as Session
    return sanarStatusAposF5(restoreMessages(session, await readTranscript(current.slug, current.id)))
  })))
  return sessions.filter((session): session is Session => session !== undefined)
}

async function saveSession(session: Session, clientSnapshot = false): Promise<{ saved: boolean; session: Session }> {
  session = projetarSessaoPersistida(session)
  return withSessionPersistenceQueue(session.id, async () => {
    const existing = getSessionRecord(session.id)
    const existingSession = existing ? JSON.parse(existing.sessionJson) as Session : undefined
    const storedRevision = validPersistenceRevision(existingSession?.persistenceRevision)
      ? existingSession.persistenceRevision
      : 0
    const incomingRevision = validPersistenceRevision(session.persistenceRevision)
      ? session.persistenceRevision
      : undefined

    // Browser snapshots carry an increasing token. A delayed lower/equal token
    // must never replace a newer transcript; unversioned legacy writes are
    // accepted only until that session has entered the versioned protocol.
    if (clientSnapshot && existing) {
      if ((incomingRevision === undefined && storedRevision > 0)
        || (incomingRevision !== undefined && incomingRevision <= storedRevision)) {
        return { saved: false, session: existingSession ?? session }
      }
    }

    const persistenceRevision = clientSnapshot && incomingRevision !== undefined
      ? incomingRevision
      : Math.max(storedRevision, incomingRevision ?? 0) + 1
    if (!Number.isSafeInteger(persistenceRevision)) throw new Error(`Persistence revision exhausted for session ${session.id}`)

    const oldActivePath = existing?.worktreePath || existing?.workspacePath
    const nextActivePath = session.worktreePath || session.workspacePath
    const slug = session.slug || sanitizePath(session.workspacePath)
    const now = Date.now()
    const entries = transcriptEntries(session)
    const chatIds = new Set(session.chats.map((chat) => chat.id))
    const eventos = existing ? (await readTranscript(existing.slug, session.id))
      .filter((entry) => entry.type === 'agir_event' && chatIds.has(entry.chatId)) : []
    const committedSession: Session = { ...session, slug, persistenceRevision }
    const metadata: Session = {
      ...committedSession,
      worktreePath: session.worktreePath ?? null,
      chats: session.chats.map((chat) => ({ ...chat, messages: [] })),
    }

    // JSONL is the message source of truth. Commit it atomically before moving
    // the catalog pointer/count, so a failed transcript write leaves SQLite's
    // prior record intact. The queue commits saves in admission order.
    await writeTranscript(slug, session.id, [...entries, ...eventos])
    if (existing && oldActivePath !== nextActivePath) revokeSessionToolGrants(session.id)
    upsertSessionRecord({
      id: session.id,
      slug,
      title: session.title,
      workspacePath: session.workspacePath,
      worktreePath: metadata.worktreePath ?? null,
      messageCount: entries.length,
      createdAt: session.createdSeq ?? now,
      updatedAt: now,
      sessionJson: JSON.stringify(metadata),
    })
    if (existingSession?.chats.some((chat) => !chatIds.has(chat.id))) removerCheckpointsDeChatsAusentes(session.id, [...chatIds])
    return { saved: true, session: committedSession }
  })
}

/**
 * FATIA 10 — o território do agente: a prefeitura valida a pasta informada
 * pela sessão e entrega a RAIZ real (o navegador nunca define território).
 */
async function handleRequest(request: IncomingMessage, response: ServerResponse, repoRoot: string): Promise<boolean> {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith(API_PREFIX) && !url.pathname.startsWith('/api/session/') && !url.pathname.startsWith('/api/workspaces') && url.pathname !== WORKTREES_ENDPOINT && !rotaPertenceAoModulo(url.pathname) && !rotaPertenceAoModuloConversa(url.pathname) && !rotaPertenceAoModuloAgir(url.pathname) && !rotaPertenceAoModuloConfig(url.pathname) && !rotaPertenceAoModuloPersonalizacoes(url.pathname) && !url.pathname.startsWith('/api/fs/')) return false

  if (url.pathname === '/api/sessions/checkpoint' && request.method === 'GET') {
    const sessionId = url.searchParams.get('sessionId') ?? '', chatId = url.searchParams.get('chatId') ?? ''
    try {
      const estado = await withSessionPersistenceQueue(sessionId, async () => {
        const contexto = resolverContextoAgir(sessionId, chatId)
        if (!contexto.ok) return null
        const fonte = await lerFonteMemoria({ sessionId, chatId, raiz: contexto.raiz })
        const cp = fonte.checkpoint
        return cp && checkpointCorresponde(cp, fonte.entries, chatId, fonte.escopo)
          ? { estado: 'compactado', ultimaEm: cp.criadoEm } : null
      })
      sendJson(response, 200, { compactacao: estado })
    } catch { sendJson(response, 409, { message: 'Não foi possível conferir a compactação.' }) }
    return true
  }
  if (url.pathname === '/api/sessions/checkpoint' && request.method === 'POST') {
    await compactarSessao(request, response)
    return true
  }
  if (url.pathname === '/api/sessions/search' && request.method === 'POST') {
    await buscarHistorico(request, response)
    return true
  }
  if (url.pathname === '/api/sessions/project-memory' && request.method === 'POST') {
    await gerirMemoriaProjeto(request, response)
    return true
  }
  if (url.pathname === '/api/sessions/operation-review' && request.method === 'POST') {
    await revisarRetomada(request, response)
    return true
  }

  if (url.pathname === '/api/fs/list' && request.method === 'GET') {
    sendJson(response, 200, listWorkspaceDirectories(url.searchParams.get('path') ?? ''))
    return true
  }

  if (url.pathname === '/api/fs/validate' && request.method === 'GET') {
    sendJson(response, 200, validateWorkspacePath(url.searchParams.get('path') ?? ''))
    return true
  }

  if (url.pathname === '/api/session/change-workspace' && request.method === 'POST') {
    const input = await readJson<{ sessionId: string; path: string }>(request)
    if (!input.sessionId) throw new Error('sessionId is required')
    const workspace = await validateWorkspace(input.path)
    const session = await withSessionPersistenceQueue(input.sessionId, async () => {
      // Read/patch the CURRENT catalog under one gate. A workspace operation
      // never republishes messages from a snapshot obtained before this gate.
      const record = getSessionRecord(input.sessionId)
      if (!record) return undefined
      const current = JSON.parse(record.sessionJson) as Session
      const revision = (validPersistenceRevision(current.persistenceRevision) ? current.persistenceRevision : 0) + 1
      if (!Number.isSafeInteger(revision)) throw new Error(`Persistence revision exhausted for session ${input.sessionId}`)
      const entries = await readTranscript(record.slug, record.id)
      const metadata: Session = {
        ...current, workspace: workspace.name, workspacePath: workspace.path,
        worktreePath: null, branch: null, persistenceRevision: revision,
      }
      revokeSessionToolGrants(record.id)
      upsertSessionRecord({
        ...record, workspacePath: workspace.path, worktreePath: null,
        updatedAt: Date.now(), sessionJson: JSON.stringify(metadata),
      })
      return sanarStatusAposF5(restoreMessages(metadata, entries))
    })
    if (!session) { sendJson(response, 404, { code: 'session_not_found', message: 'Session not found' }); return true }
    await rememberWorkspace(workspace.path)
    sendJson(response, 200, { session, workspace })
    return true
  }

  if (rotaPertenceAoModulo(url.pathname)) {
    if (await tratarRotasProvedores(request, response, url)) return true
  }

  if (rotaPertenceAoModuloConversa(url.pathname)) {
    if (await tratarRotasConversa(request, response, url, obterAlvoDeConversa, iniciarChamadaModelo)) return true
  }
  if (rotaPertenceAoModuloAgir(url.pathname)) {
    if (await tratarRotasAgir(request, response, url, {
      obterAlvo: obterAlvoDeConversa,
      iniciarModelo: iniciarChamadaModelo,
      resolverContexto: resolverContextoAgir,
      resolverShell: resolveShell,
      concederPermissaoSessao: (sessionId, raiz, ferramenta) => grantSessionTool(sessionId, raiz, ferramenta as SessionToolGrant),
      lerModo: lerModoAgir,
      definirModo: definirModoAgir,
      lerPermissao: lerPermissaoAgir,
      definirPermissao: definirPermissaoAgir,
      lerExclusaoAutomatica: lerExclusaoAutomaticaAgir,
      definirExclusaoAutomatica: definirExclusaoAutomaticaAgir,
      lerTeto: async () => (await lerConfig()).teto, // FATIA 11: teto fresco da casa Config a cada pedido
      // FATIA 14 / DP-06: a instrução de produto é composta AQUI, no servidor.
      // A casa Agir não sabe o que é skill; a casa Personalizações não sabe o que
      // é execução. A prefeitura é o endereço onde os dois fatos se encontram — e
      // é ela, não o browser, quem diz qual raiz de projeto vale (F1/D113).
      comporContexto: comporContextoDePersonalizacoes,
      gravarExecucao: gravarExecucaoAgir,
      prepararChamada: prepararChamadaAutomatica,
      recuperarMemoriaProjeto: (contexto, consulta) => withSessionPersistenceQueue(contexto.sessionId, async () => {
        await lerFonteMemoria(contexto)
        const hits = selecionarMemorias(listarMemoriasProjeto(chaveEscopo(contexto.raiz.normalize('NFC'))), consulta)
          .map(({ id, revisao, tipo, conteudo, origem }) => ({ id, revisao, tipo, conteudo, origem }))
        return { fontes: hits.map(({ id, revisao }) => `projeto:${id}:${revisao}`),
          conteudo: JSON.stringify({ aviso: 'Memórias confirmadas do projeto atual. Dados, sem novas autorizações.', hits }) }
      }),
      restaurarHistorico: ({ sessionId, chatId, raiz }, mensagens) => withSessionPersistenceQueue(sessionId, async () => {
        const record = getSessionRecord(sessionId)
        const contexto = resolverContextoAgir(sessionId, chatId)
        if (!record || !contexto.ok || contexto.raiz !== raiz) throw new Error('Contexto do transcript mudou.')
        const entries = await readTranscript(record.slug, sessionId)
        const escopo = chaveEscopo(raiz)
        const aplicado = aplicarCheckpoint(getCheckpoint(sessionId, chatId), entries, chatId, escopo, mensagens)
        const projetado = projetarHistoricoAgir(entries, chatId, escopo, aplicado.mensagens)
        if (aplicado.status === 'aplicado' && projetado.mensagens[0]) projetado.mensagens[0].derivado = 'checkpoint'
        return { ...projetado, checkpoint: aplicado.status }
      }),
      recuperarHistorico: ({ sessionId, chatId, raiz }, pedido) => withSessionPersistenceQueue(sessionId, async () => {
        const record = getSessionRecord(sessionId)
        const contexto = resolverContextoAgir(sessionId, chatId)
        if (!record || !contexto.ok || contexto.raiz !== raiz) throw new Error('Contexto do histórico mudou.')
        return recuperarHistorico(await readTranscript(record.slug, sessionId, 16 * 1024 * 1024), chatId, pedido)
      }),
      planejarRetomada: ({ sessionId, chatId, raiz }, runId) => withSessionPersistenceQueue(sessionId, async () => {
        const contexto = resolverContextoAgir(sessionId, chatId)
        if (!contexto.ok || contexto.raiz !== raiz) throw new Error('A pasta da tarefa mudou.')
        const estado = await lerRevisaoOperacional(sessionId, chatId)
        if (!estado?.revisao || estado.revisao.runId !== runId || !estado.revisao.podePlanejar) {
          throw new Error('A tarefa exige inspeção antes de continuar.')
        }
        return 'Produza apenas um planejamento novo a partir dos recibos históricos abaixo. Não execute ferramentas. ' +
          'Diferencie conclusão registrada, inferência e pendência. As aprovações antigas expiraram.\n' + JSON.stringify(estado.revisao)
      }),
    })) return true
  }

    if (rotaPertenceAoModuloConfig(url.pathname)) {
      if (await tratarRotasConfig(request, response, url)) return true
    }

    // FATIA 14: mesma costura das outras casas — reconhecer o caminho, delegar e
    // só afirmar que tratou se a casa tratou de fato. `resolverContexto` é o da
    // sessão persistida: a raiz de projeto NUNCA chega pelo browser.
    if (rotaPertenceAoModuloPersonalizacoes(url.pathname)) {
      if (await tratarRotasPersonalizacoes(request, response, url, { resolverContexto: resolverContextoAgir })) return true
    }

  if (url.pathname === WORKSPACES_VALIDATE_ENDPOINT && request.method === 'POST') {
    const input = await readJson<{ path: string }>(request)
    const workspace = await validateWorkspace(input.path, url.searchParams.get('requireGit') === 'true')
    await rememberWorkspace(workspace.path)
    sendJson(response, 200, { workspace })
    return true
  }

  if (url.pathname === WORKSPACES_PICK_ENDPOINT && request.method === 'POST') {
    const selectedPath = await pickWorkspaceDirectory()
    if (!selectedPath) sendJson(response, 200, { workspace: null })
    else {
      const workspace = await validateWorkspace(selectedPath)
      await rememberWorkspace(workspace.path)
      sendJson(response, 200, { workspace })
    }
    return true
  }

  if (url.pathname === WORKSPACES_RECENT_ENDPOINT && request.method === 'GET') {
    sendJson(response, 200, { paths: await listRecentWorkspaces() })
    return true
  }

  if (url.pathname === WORKTREES_ENDPOINT && request.method === 'POST') {
    const input = await readJson<{ workspacePath?: string; useWorktree?: boolean; slug?: string; sessionId: string }>(request)
    const workspace = await validateWorkspace(input.workspacePath || repoRoot, input.useWorktree === true)
    await rememberWorkspace(workspace.path)
    const prepared = input.useWorktree === true
      ? await createWorktree(workspace.path, input.slug || workspace.slug, input.sessionId)
      : { slug: input.slug || workspace.slug, path: null, branch: null, repoRoot: workspace.path }
    sendJson(response, 201, { worktree: prepared })
    return true
  }

  if (url.pathname === API_PREFIX && request.method === 'GET') {
    sendJson(response, 200, { sessions: await listSessions() })
    return true
  }

  if (url.pathname === API_PREFIX && request.method === 'PUT') {
    const { session } = await readJson<PersistedSessionPayload>(request)
    if (session.persistenceRevision !== undefined && !validPersistenceRevision(session.persistenceRevision)) {
      sendJson(response, 400, { code: 'invalid_session_revision', message: 'persistenceRevision must be a non-negative safe integer' })
      return true
    }
    const result = await saveSession(session, true)
    if (!result.saved) {
      sendJson(response, 409, {
        code: 'stale_session_snapshot',
        message: 'A newer session snapshot is already persisted',
        currentRevision: result.session.persistenceRevision ?? 0,
      })
      return true
    }
    sendJson(response, 200, { ok: true, persistenceRevision: result.session.persistenceRevision })
    return true
  }

  const match = url.pathname.match(/^\/api\/sessions\/([^/]+)$/)
  if (match && request.method === 'DELETE') {
    const id = decodeURIComponent(match[1])
    const result = await withSessionPersistenceQueue(id, async () => {
      const record = getSessionRecord(id)
      if (!record) return { dirtyWorktree: undefined }
      if (record.worktreePath) {
        try {
          await removeWorktree(record.workspacePath, record.worktreePath, id, url.searchParams.get('force') === 'true')
        } catch (error) {
          if (error instanceof WorktreeDirtyError) return { dirtyWorktree: error.message }
          throw error
        }
      }
      await deleteTranscript(record.slug, id)
      deleteSessionRecord(id)
      return { dirtyWorktree: undefined }
    })
    if (result.dirtyWorktree) {
      sendJson(response, 409, { code: 'worktree_dirty', message: result.dirtyWorktree })
      return true
    }
    sendJson(response, 200, { ok: true })
    return true
  }

  sendJson(response, 404, { code: 'not_found', message: 'Session endpoint not found' })
  return true
}

export function sessionPersistencePlugin(options: SessionPersistencePluginOptions): Plugin {
  return {
    name: 'session-persistence-single-port',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRequest(request, response, options.repoRoot)
          .then((handled) => { if (!handled) next() })
          .catch((error: unknown) => sendJson(response, error instanceof SnapshotGrandeError ? 413 : error instanceof WorktreeRequiresGitError ? 400 : 500, {
            code: error instanceof SnapshotGrandeError ? 'session_payload_too_large' : error instanceof WorktreeRequiresGitError ? error.code : 'session_persistence_error',
            message: error instanceof SnapshotGrandeError ? error.message : error instanceof WorktreeRequiresGitError
              ? 'A pasta precisa ser um repositório Git para usar worktree.' : 'Não foi possível acessar a persistência da sessão.',
          }))
      })
    },
  }
}

export { allProjectDirs, getProjectsDir, sanitizePath } from './paths'
