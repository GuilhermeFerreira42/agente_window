// Casa Agir — preparação do envio (SPEC C §4/§5.3; correção B2 da revisão).
//
// Contrato: a MODALIDADE da sessão resolve as políticas do run —
//   · Chat  → só registra o modo (efetivo `ask`); NÃO sincroniza permissão de
//     pasta nem registra instrução de arquivo/comando (rotas que o servidor
//     recusa com 409 por direito — o cliente não faz chamadas sem sentido em
//     vez de "contornar" a recusa; os guards defensivos continuam no servidor);
//   · Pasta → sequência histórica inalterada: modo → permissão → instrução.
import type { ModoAgir, NivelPermissaoAgir } from '../../contract'
import type { Session } from '../../../../../../types'
import { sessaoSemPasta } from '../../../../../../domain/sessionState'
import { registrarInstrucaoAgir, selecionarModoAgir, selecionarPermissaoAgir } from './api'

export interface EntradaPreparacaoExecucao {
  sessionId: string
  chatId: string
  /** Identidade do run — mesma fórmula do payload de envio da casa. */
  fluxo: string
  /** Snapshot mínimo da sessão: a preparação resolve Chat×Pasta sozinha. */
  sessao: Pick<Session, 'contexto' | 'workspacePath'>
  /** Modo escolhido na UI (pode ser legado `agent` numa sessão Chat). */
  modo: ModoAgir
  /** Nível escolhido na UI — aplicado somente em workspace. */
  permissao: NivelPermissaoAgir
  /** Texto do envio — registrado como instrução somente em workspace. */
  instrucao?: string
  signal?: AbortSignal
}

export interface ExecucaoPreparada {
  /** Modo que deve ir no payload do run (`ask` em Chat). */
  modoEfetivo: ModoAgir
  /** Token da instrução humana — indefinido em Chat. */
  instructionToken?: string | undefined
}

export async function prepararExecucaoAgir(entrada: EntradaPreparacaoExecucao): Promise<ExecucaoPreparada> {
  const chat = sessaoSemPasta(entrada.sessao)
  const modoEfetivo: ModoAgir = chat ? 'ask' : entrada.modo
  await selecionarModoAgir(entrada.sessionId, entrada.chatId, modoEfetivo, entrada.signal)
  if (chat) return { modoEfetivo }
  await selecionarPermissaoAgir(entrada.sessionId, entrada.chatId, entrada.permissao)
  const instructionToken = entrada.instrucao === undefined
    ? undefined
    : await registrarInstrucaoAgir(entrada.sessionId, entrada.chatId, entrada.fluxo, entrada.instrucao, entrada.signal)
  return { modoEfetivo, instructionToken }
}
