// C-3a — estado de transferência do rascunho da landing (R11/B10).
//
// O parecer H11 mostrou que a landing perdia o primeiro arquivo pronto quando
// o segundo falhava: `prepararAnexosDaLanding` lançava sem devolver/aplicar os
// itens já prontos, e o File transitório do primeiro já tinha sido descartado.
//
// Este módulo guarda, por MESMA identidade de rascunho (uploadId), o recibo do
// servidor de cada item. É o dono que sobrevive a falha parcial, a remontagem
// do componente e ao F5 (o recibo não contém bytes: só metadados seguros).
// A verdade do servidor sempre vence o palpite local.
import type { Attachment } from '../types'

/** Superfície MÍNIMA do recibo do servidor (estrutural, sem importar cliente). */
export interface ReciboGuardado {
  uploadId: string
  artifactId: string
  name: string
  bytes: number
  sha256: string | null
  state: 'admitido' | 'recebendo' | 'preparado' | 'pronto' | 'falhou' | 'cancelado'
  mode: 'copy' | 'reference'
  scope: 'chat' | 'workspace'
  errorCode: string | null
}

export interface EstadoTransferencia {
  /** Recibo estável do servidor (fonte de verdade do item). */
  recibo: ReciboGuardado
  /** Última mensagem de falha (honesta e sem bytes). */
  motivo?: string
}

const recibos = new Map<string, EstadoTransferencia>()

function chave(sessionId: string, chatId: string, uploadId: string): string {
  return `${sessionId}:${chatId}:${uploadId}`
}

export function guardarRecibo(sessionId: string, chatId: string, recibo: ReciboGuardado): void {
  recibos.set(chave(sessionId, chatId, recibo.uploadId), { recibo })
}

export function guardarFalha(sessionId: string, chatId: string, uploadId: string, motivo: string): void {
  const existente = recibos.get(chave(sessionId, chatId, uploadId))
  if (existente) {
    recibos.set(chave(sessionId, chatId, uploadId), { ...existente, motivo })
    return
  }
  recibos.set(chave(sessionId, chatId, uploadId), {
    recibo: {
      uploadId, artifactId: '', name: '', bytes: 0, sha256: null, state: 'falhou',
      mode: 'copy', scope: 'chat', errorCode: 'transfer_failed',
    },
    motivo,
  })
}

export function lerRecibo(sessionId: string, chatId: string, uploadId: string): EstadoTransferencia | undefined {
  return recibos.get(chave(sessionId, chatId, uploadId))
}

export function esquecerRecibo(sessionId: string, chatId: string, uploadId: string): void {
  recibos.delete(chave(sessionId, chatId, uploadId))
}

/** Somente para isolamento de teste — nunca usado pelo produto. */
export function limparRecibosDoRascunho(): void {
  recibos.clear()
}

/** Item pronto SEM mensagem (salvo no servidor) que o dono deve exibir. */
export function itemSalvoSemMensagem(sessionId: string, chatId: string, uploadId: string, base: Attachment): Attachment | null {
  const estado = lerRecibo(sessionId, chatId, uploadId)
  if (!estado || estado.recibo.state !== 'pronto') return null
  return {
    ...base,
    artifactId: estado.recibo.artifactId,
    uploadId: estado.recibo.uploadId,
    name: estado.recibo.name || base.name,
    bytes: estado.recibo.bytes,
    sha256: estado.recibo.sha256 ?? undefined,
    estado: 'pronto',
    mode: estado.recibo.mode,
  }
}

/**
 * Aplica o recibo do servidor a um anexo do rascunho, sem reenvio:
 *  - pronto → item pronto (bytes/hash do servidor);
 *  - falhou/cancelado → falha honesta, reenviável.
 */
export function aplicarRecibo(anexo: Attachment, recibo: ReciboGuardado): Attachment {
  if (recibo.state === 'pronto') {
    return {
      ...anexo,
      artifactId: recibo.artifactId,
      uploadId: recibo.uploadId,
      name: recibo.name || anexo.name,
      bytes: recibo.bytes,
      sha256: recibo.sha256 ?? undefined,
      estado: recibo.mode === 'reference' ? 'referencia' : 'pronto',
      mode: recibo.mode,
    }
  }
  if (recibo.state === 'falhou' || recibo.state === 'cancelado') {
    return { ...anexo, estado: 'falhou' }
  }
  return { ...anexo, estado: 'transferindo' }
}
