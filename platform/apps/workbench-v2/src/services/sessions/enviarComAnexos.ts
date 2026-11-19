// C-3a — fluxo de envio COM anexos fora do App (R11: App só wiring).
// Escolha explícita R10 → transferência completa (R02) → publicação durável →
// run condicional (T23: anexo sem texto NUNCA inicia chamada de IA).
// Portas injetadas: sem estado próprio, sem espelho, sem IO direto.
import type { Attachment, ChatMessage, Session } from '../../types'
import type { SelecaoModelo } from '../../bairros/2-inteligencia/casas/conversa'
import type { ModoAgir, NivelPermissaoAgir } from '../../bairros/2-inteligencia/casas/agir'
import type { MensagemSimples } from '../../bairros/2-inteligencia/casas/agir'
import { transferirAnexos, type TransporteAnexos } from '../../domain/enviarAnexos'
import {
  admitirAnexo, enviarConteudoAnexo, estadoAnexo, registrarReferenciaAnexo,
} from './anexosClient'
import { guardarRecibo } from '../../domain/rascunhoTransferencia'

/** Transporte real dos anexos (mesmo origin, sem provedor de IA). */
export const transporteAnexosHttp: TransporteAnexos = {
  admitir: (entrada) => admitirAnexo(entrada),
  enviar: (sessionId, chatId, uploadId, file) => enviarConteudoAnexo(sessionId, chatId, uploadId, file),
  referencia: (entrada) => registrarReferenciaAnexo(entrada),
  // R11/B10 — recibo por ID antes do File; 404 honesto = item não existe.
  estado: (sessionId, chatId, uploadId) => estadoAnexo(sessionId, chatId, uploadId),
}

const MENSAGEM_ESCOLHA = 'Os arquivos serão armazenados nesta conversa, mas NÃO serão enviados ao modelo nesta fase (sem codec). '
  + 'Continuar apenas com o texto? Os arquivos ficam disponíveis para download na conversa.'

/**
 * Landing (primeiro envio): escolha + transferência ANTES de abrir a
 * conversa — falha preserva o rascunho da landing (nada é limpo).
 */
export async function prepararAnexosDaLanding(entrada: {
  sessionId: string
  chatId: string
  texto: string
  anexos: Attachment[]
  workspaceRoot: string | null
  escolhaJaFeita?: boolean
}): Promise<Attachment[]> {
  if (entrada.anexos.length === 0) return []
  if (entrada.texto.trim() && !entrada.escolhaJaFeita) {
    const escolha = window.confirm(MENSAGEM_ESCOLHA)
    if (!escolha) throw new Error('Envio cancelado; o rascunho foi preservado.')
  }
  const transferencia = await transferirAnexos({
    sessionId: entrada.sessionId,
    chatId: entrada.chatId,
    anexos: entrada.anexos,
    workspaceRoot: entrada.workspaceRoot,
    transporte: transporteAnexosHttp,
  })
  if (!transferencia.todosProntos) {
    // B10/H11 — falha parcial NUNCA descarta o que já está salvo: o dono
    // recebe os itens com o estado REAL (prontos + falhos) para que a landing
    // continue exibindo o primeiro arquivo e o retry reuse o mesmo ID.
    const erro = new Error(`Falha ao transferir: ${transferencia.falhas.map((item) => item.name).join(', ')}. O rascunho foi preservado; reenvie para tentar de novo.`) as Error & { anexos?: Attachment[] }
    erro.anexos = transferencia.anexos
    throw erro
  }
  const prontos = transferencia.anexos.map((anexo) => ({
    ...anexo,
    envioModelo: (entrada.texto.trim() ? ('excluido-sem-codec' as const) : undefined),
  }))
  // O dono da landing guarda os recibos (sobrevivem à remontagem/F5).
  for (const anexo of prontos) {
    if (anexo.uploadId && anexo.artifactId && anexo.sha256) {
      guardarRecibo(entrada.sessionId, entrada.chatId, {
        uploadId: anexo.uploadId, artifactId: anexo.artifactId, name: anexo.name,
        bytes: anexo.bytes ?? 0, sha256: anexo.sha256,
        state: anexo.estado === 'referencia' ? 'pronto' : 'pronto',
        mode: anexo.mode ?? 'copy', scope: anexo.modoCopia === 'projeto' ? 'workspace' : 'chat',
        errorCode: null,
      })
    }
  }
  return prontos
}

/**
 * R11/B10 — resultado da retomada da landing: itens com estado real + os que
 * já estavam prontos no servidor sem mensagem (após F5).
 */
export interface ResultadoRetomadaLanding {
  anexos: Attachment[]
  prontos: Attachment[]
  salvoSemMensagem: Attachment[]
}

export interface PortasEnvioAnexos {
  /** Sessão atual (snapshot do App). */
  obterSessao: () => Session | undefined
  /** Histórico do chat de origem (mensagens válidas para o modelo). */
  obterHistorico: () => MensagemSimples[]
  /** Aplica a sessão publicada no estado (UI). */
  aplicar: (sessao: Session) => void
  /** Publicação durável (ACK da fila). */
  persistir: (sessao: Session) => Promise<void>
  /** Notificação honesta ao usuário. */
  notificar: (mensagem: string) => void
  /** Preserva o rascunho com os estados reais dos anexos (falha parcial). */
  preservarRascunho: (anexos: Attachment[]) => void
  /** Compromete draft/título no dono de gestão (retorna a sessão ajustada). */
  comprometerDraft: (sessao: Session, requestLabel: string) => Session
  /** Status do chat após publicação. */
  aplicarStatus: (sessao: Session, chatId: string, status: 'working' | 'completed') => Session
  /** Inicia o run de texto (único caminho para chamada de IA). */
  iniciarRun: (entrada: {
    responseId: string
    historico: MensagemSimples[]
    modelSelection: SelecaoModelo
    texto: string
    opcoes?: { modo?: ModoAgir; permissao?: NivelPermissaoAgir; sessao?: Session; esperarPublicacao?: boolean }
  }) => void
  /** Relógio de rótulo do chat. */
  tempo: () => string
  modoAtual: ModoAgir
}

/**
 * Fábrica das portas do App (R11 — as closures do App ficam NUM argumento
 * compacto; o handleSend do App só monta e devolve).
 */
export function portasEnvioApp(p: {
  sessions: Session[]
  sessionId: string
  chatId: string
  setSessions: (updater: (current: Session[]) => Session[]) => void
  persistir: (sessao: Session) => Promise<unknown>
  notify: (mensagem: string) => void
  setComposerDrafts: (updater: (current: Record<string, { text: string; attachments: Attachment[] }>) => Record<string, { text: string; attachments: Attachment[] }>) => void
  management: { current: unknown }
  commitDraft: (management: never, sessionId: string) => unknown
  updateSessionAndChatStatus: (sessao: Session, chatId: string, status: 'working' | 'completed') => Session
  iniciarAgirReal: (sessionId: string, chatId: string, responseId: string, historico: MensagemSimples[], extra: undefined, modelSelection: SelecaoModelo, texto: string, opcoes?: { modo?: ModoAgir; permissao?: NivelPermissaoAgir; sessao?: Session; esperarPublicacao?: boolean }) => void
  timeLabel: () => string
  selectedMode: ModoAgir
  montarHistorico: (mensagens: ChatMessage[]) => MensagemSimples[]
}): PortasEnvioAnexos {
  const { sessionId, chatId } = p
  return {
    obterSessao: () => p.sessions.find((session) => session.id === sessionId),
    obterHistorico: () => p.montarHistorico(p.sessions.find((session) => session.id === sessionId)?.chats.find((chat) => chat.id === chatId)?.messages ?? []),
    aplicar: (sessao) => p.setSessions((current) => current.map((item) => item.id === sessao.id ? sessao : item)),
    persistir: async (sessao) => { await p.persistir(sessao) },
    notificar: p.notify,
    preservarRascunho: (anexos) => {
      const chave = `${sessionId}:${chatId}`
      p.setComposerDrafts((current) => ({ ...current, [chave]: { ...(current[chave] ?? { text: '', attachments: [] }), attachments: anexos } }))
    },
    comprometerDraft: (sessao, requestLabel) => {
      p.management.current = p.commitDraft(p.management.current as never, sessionId)
      const derived = requestLabel.trim()
      return derived ? { ...sessao, title: derived.length > 48 ? `${derived.slice(0, 48).trimEnd()}…` : derived } : sessao
    },
    aplicarStatus: (sessao, alvoChat, status) => p.updateSessionAndChatStatus(sessao, alvoChat, status),
    iniciarRun: ({ responseId, historico, modelSelection, texto, opcoes }) =>
      p.iniciarAgirReal(sessionId, chatId, responseId, historico, undefined, modelSelection, texto, opcoes),
    tempo: p.timeLabel,
    modoAtual: p.selectedMode,
  }
}

/**
 * Envio assíncrono com anexos. Devolve 'publicado' (rascunho pode limpar) ou
 * 'abortado' (rascunho preservado — falha, recusa ou sessão indisponível).
 */
export async function enviarMensagemComAnexos(entrada: {
  sessionId: string
  chatId: string
  text: string
  attachments: Attachment[]
  modelSelection: SelecaoModelo
  opcoes?: { modo?: ModoAgir; permissao?: NivelPermissaoAgir; sessao?: Session; esperarPublicacao?: boolean; escolhaJaFeita?: boolean }
  portas: PortasEnvioAnexos
}): Promise<'publicado' | 'abortado'> {
  const { sessionId, chatId, text, attachments, modelSelection, opcoes, portas } = entrada
  const requestLabel = text.trim() || attachments.map((item) => item.name).join(', ')
  const responseId = `response-${Date.now()}`
  const requestedModel = modelSelection.tipo === 'auto' ? 'Auto' : `${modelSelection.providerId} / ${modelSelection.modelId}`
  const base = opcoes?.sessao ?? portas.obterSessao()
  const todosProntos = attachments.every((item) => item.estado === 'pronto' || item.estado === 'referencia')

  // R10 — opção explícita ANTES de qualquer transferência; sem escolha,
  // nada muda e o rascunho fica intacto.
  if (text.trim() && !todosProntos && !opcoes?.escolhaJaFeita) {
    const escolha = window.confirm(MENSAGEM_ESCOLHA)
    if (!escolha) return 'abortado'
  }

  // R02 — transferência completa ANTES da publicação da mensagem.
  const raizWorkspace = base?.workspacePath ?? null
  const transferencia = await transferirAnexos({
    sessionId, chatId, anexos: attachments, workspaceRoot: raizWorkspace, transporte: transporteAnexosHttp,
  })
  if (!transferencia.todosProntos) {
    // E04 — falha: SEM mensagem, rascunho preservado (texto + itens já prontos).
    portas.preservarRascunho(transferencia.anexos)
    portas.notificar(`Falha ao transferir: ${transferencia.falhas.map((item) => item.name).join(', ')}. Nada foi enviado ao modelo e o rascunho foi preservado.`)
    return 'abortado'
  }

  const anexosPublicados = transferencia.anexos.map((anexo) => ({
    ...anexo,
    envioModelo: (text.trim() ? ('excluido-sem-codec' as const) : undefined),
  }))
  const userMessage: ChatMessage = {
    id: `message-${Date.now()}`,
    role: 'user',
    // T23 — só o texto: nomes de arquivo nunca entram disfarçados no histórico.
    content: text.trim(),
    time: portas.tempo(),
    mode: opcoes?.modo ?? portas.modoAtual,
    attachments: anexosPublicados.length > 0 ? anexosPublicados.map((item) => ({ ...item })) : undefined,
  }
  const vaiRodar = Boolean(text.trim())
  const runningResponse: ChatMessage | undefined = vaiRodar ? {
    id: responseId,
    role: 'assistant',
    content: '',
    time: portas.tempo(),
    model: requestedModel,
    running: true,
    inicioEm: Date.now(),
  } : undefined
  const historico: MensagemSimples[] = [
    ...portas.obterHistorico(),
    ...(vaiRodar ? [{ id: userMessage.id, role: 'user' as const, content: text.trim() }] : []),
  ]

  if (!base) {
    portas.notificar('A conversa não está mais disponível; o rascunho foi preservado.')
    return 'abortado'
  }
  let atualizada: Session = {
    ...base,
    updated: 'agora',
    unread: false,
    isDraft: false,
    chats: base.chats.map((chat) => chat.id === chatId ? {
      ...chat,
      messages: [...chat.messages, userMessage, ...(runningResponse ? [runningResponse] : [])],
      approval: undefined,
    } : chat),
  }
  atualizada = portas.aplicarStatus(atualizada, chatId, vaiRodar ? 'working' : 'completed')
  if (base.isDraft) atualizada = portas.comprometerDraft(atualizada, requestLabel)

  try {
    // Publicação DURÁVEL antes de qualquer efeito remoto (R02/R04).
    portas.aplicar(atualizada)
    await portas.persistir(atualizada)
  } catch (error) {
    portas.notificar(error instanceof Error ? error.message : 'Não foi possível publicar a mensagem. O rascunho foi preservado.')
    return 'abortado'
  }
  if (vaiRodar && runningResponse) {
    portas.iniciarRun({ responseId, historico, modelSelection, texto: text.trim(), opcoes })
  } else if (!vaiRodar) {
    // T23 — anexo sem texto: mensagem salva, NENHUMA chamada de IA.
    portas.notificar('Arquivos armazenados na conversa. Nada foi enviado ao modelo.')
  }
  return 'publicado'
}
