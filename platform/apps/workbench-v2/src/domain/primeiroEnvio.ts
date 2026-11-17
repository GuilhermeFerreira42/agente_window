// ============================================================================
// C-2 — coordenação do PRIMEIRO ENVIO (02 §2, tabela de fases). Controlador
// com portas INJETADAS: valida → cria → persiste → confirma → publica →
// conclui. Sem setTimeout, sem leitura de estado de renderização anterior e
// sem efeito remoto antes da confirmação da sessão. A identidade confirmada
// é reaproveitada na retentativa do MESMO rascunho (geração igual); uma
// edição nova descarta a tentativa antiga. Puro no domínio; IO só nas portas.
// ============================================================================

import type { Session } from '../types'
import {
  recusarSnapshot,
  type RascunhoLanding,
  type SnapshotPrimeiroEnvio,
} from './landingDraft'

export type FasePrimeiroEnvio =
  | 'editando'
  | 'validando'
  | 'criando'
  | 'persistindo'
  | 'confirmada'
  | 'publicando'
  | 'admitida'
  | 'erro'

/** Identidade de uma criação já confirmada (retentativa sem duplicar sessão). */
export interface TentativaConfirmada {
  geracao: number
  tentativaId: string
  sessao: Session
  chatId: string
  /** C2-RV03 — contexto lógico da tentativa (bind da identidade à raiz). */
  contexto: 'chat' | 'workspace'
  /** Raiz SOLICITADA (snapshot); worktree.repoRoot pode divergir de subpasta. */
  workspacePathSolicitado: string | null
}

export interface PortasPrimeiroEnvio {
  /** Guardas adicionais do shell (editor sujo, picker em voo…). Motivo ou null. */
  validarExterna?: (snapshot: SnapshotPrimeiroEnvio) => string | null
  /** Workspace: cria/resolve o worktree REAL antes de persistir. */
  criarWorktree?: (workspacePath: string, id: string) => Promise<{
    repoRoot: string
    path: string | null
    slug: string
    branch: string | null
  }>
  /** Persistência P-A/P-B/P-C (a mesma fila/autoridade de sempre). */
  persistir: (sessao: Session) => void | Promise<void>
  /**
   * Publica a mensagem e inicia o run com o snapshot EXPLÍCITO (par, modo,
   * permissão). Nunca lê seleção default/Auto nem modo de closure antigo.
   */
  publicar: (sessao: Session, chatId: string, snapshot: SnapshotPrimeiroEnvio) => Promise<void>
}

export interface ResultadoPrimeiroEnvio {
  ok: boolean
  fase: FasePrimeiroEnvio
  motivo?: string
  sessao?: Session
  chatId?: string
  /** Identidade confirmada para retentativa (presente mesmo em falha posterior). */
  confirmada?: TentativaConfirmada
}

export function derivarTitulo(texto: string): string {
  const linha = texto.trim()
  return linha.length > 48 ? `${linha.slice(0, 48).trimEnd()}…` : linha
}

export function chatIdDaSessao(sessionId: string): string {
  return `${sessionId}-main`
}

/** Constrói a sessão CHAT (raiz nula, sem worktree, sem /fs — contrato C-1). */
export function construirSessaoChat(id: string, texto: string): Session {
  return {
    id,
    title: derivarTitulo(texto),
    workspace: 'Chat',
    workspacePath: null,
    worktreePath: null,
    contexto: { tipo: 'chat' },
    section: 'today',
    status: 'completed',
    updated: 'agora',
    diffAdded: 0,
    diffRemoved: 0,
    branch: null,
    chats: [{ id: chatIdDaSessao(id), title: 'Novo chat', status: 'completed', messages: [] }],
    mainChatId: chatIdDaSessao(id),
  }
}

/** Constrói a sessão WORKSPACE sobre um worktree já resolvido pela porta. */
export function construirSessaoWorkspace(
  id: string,
  texto: string,
  worktree: { repoRoot: string; path: string | null; slug: string; branch: string | null },
): Session {
  return {
    id,
    title: derivarTitulo(texto),
    workspace: worktree.slug,
    workspacePath: worktree.repoRoot,
    worktreePath: worktree.path,
    slug: worktree.slug,
    contexto: { tipo: 'workspace' },
    section: 'today',
    status: 'completed',
    updated: 'agora',
    diffAdded: 0,
    diffRemoved: 0,
    branch: worktree.branch,
    chats: [{ id: chatIdDaSessao(id), title: 'Novo chat', status: 'completed', messages: [] }],
    mainChatId: chatIdDaSessao(id),
  }
}

/**
 * Executa a tentativa de primeiro envio pelas fases observáveis do 02.
 * - `confirmada` de uma tentativa anterior com a MESMA geração é reaproveitada
 *   (retentativa não cria outra sessão nem duplica mensagem).
 * - Qualquer erro devolve o estado exato da fase; o chamador preserva o draft.
 * - Nenhum efeito remoto ocorre antes de `persistir` resolver (ACK).
 */
export async function executarPrimeiroEnvio(opcoes: {
  snapshot: SnapshotPrimeiroEnvio
  portas: PortasPrimeiroEnvio
  confirmada?: TentativaConfirmada | null
  gerarId: () => string
  aoConfirmar?: (confirmada: TentativaConfirmada) => void
  aoEncerrar?: (confirmada: TentativaConfirmada | null) => void
}): Promise<ResultadoPrimeiroEnvio> {
  const { snapshot, portas, confirmada, gerarId, aoConfirmar, aoEncerrar } = opcoes

  // — validando —
  const recusa = recusarSnapshot(snapshot) ?? portas.validarExterna?.(snapshot) ?? null
  if (recusa) return { ok: false, fase: 'validando', motivo: recusa }

  let sessao: Session
  let chatId: string
  let identidade: TentativaConfirmada | undefined

  // Retentativa: MESMA geração E MESMO contexto/raiz → identidade confirmada
  // vale (sem novo create, sem mensagem duplicada). C2-RV03: geração igual com
  // outra raiz/contexto NÃO reutiliza — publicar na raiz anterior seria silencioso.
  const reutilizavel = confirmada != null
    && confirmada.geracao === snapshot.geracao
    && confirmada.contexto === snapshot.contexto
    && confirmada.workspacePathSolicitado === snapshot.workspacePath

  if (reutilizavel) {
    sessao = confirmada!.sessao
    chatId = confirmada!.chatId
    identidade = confirmada!
  } else {
    const id = gerarId()
    chatId = chatIdDaSessao(id)
    try {
      // — criando —
      if (snapshot.contexto === 'chat') {
        sessao = construirSessaoChat(id, snapshot.texto)
      } else {
        if (!portas.criarWorktree) {
          return { ok: false, fase: 'criando', motivo: 'Criação de pasta indisponível neste ambiente.' }
        }
        const worktree = await portas.criarWorktree(snapshot.workspacePath!, id)
        sessao = construirSessaoWorkspace(id, snapshot.texto, worktree)
      }
      // — persistindo (ACK antes de qualquer efeito remoto) —
      await Promise.resolve(portas.persistir(sessao))
      identidade = { geracao: snapshot.geracao, tentativaId: snapshot.tentativaId, sessao, chatId,
        contexto: snapshot.contexto, workspacePathSolicitado: snapshot.workspacePath }
      aoConfirmar?.(identidade)
    } catch (error) {
      return {
        ok: false,
        fase: 'erro',
        motivo: error instanceof Error ? error.message : 'Falha ao criar a conversa',
      }
    }
  }

  // — publicando —
  try {
    await portas.publicar(sessao, chatId, snapshot)
  } catch (error) {
    return {
      ok: false,
      fase: 'erro',
      motivo: error instanceof Error ? error.message : 'Falha ao publicar a mensagem',
      sessao,
      chatId,
      confirmada: identidade,
    }
  }

  aoEncerrar?.(null)
  return { ok: true, fase: 'admitida', sessao, chatId }
}

/**
 * C2-RV02 — aplica a mensagem do primeiro envio na sessão recém-criada
 * (mesma forma do fluxo P do chat): status working + user/assistant otimista.
 * Puro: o App só enfileira o persistSession(resultante) e dispara o run após
 * o ACK — nunca antes da publicação durável.
 */
export function aplicarMensagemPrimeiroEnvio(
  sessao: Session,
  chatId: string,
  userMessage: Session['chats'][number]['messages'][number],
  runningResponse: Session['chats'][number]['messages'][number],
): Session {
  const next = { ...sessao, updated: 'agora', unread: false }
  return {
    ...next,
    chats: next.chats.map((chat) => chat.id === chatId
      ? { ...chat, messages: [...chat.messages, userMessage, runningResponse], approval: undefined }
      : chat),
  }
}

/** Descarta identidade confirmada quando o rascunho avançou de geração. */
export function descartarTentativaVelha(
  confirmada: TentativaConfirmada | null,
  rascunho: RascunhoLanding,
): TentativaConfirmada | null {
  if (confirmada && confirmada.geracao !== rascunho.geracao) return null
  return confirmada
}
