// C-3a (R02/R03/R05/R11) — coordenador de transferência do rascunho:
// admite → envia binário → publica; retentativa reutiliza o MESMO uploadId
// (nunca duplica); referência de projeto não copia bytes. Transporte
// injetável para os testes usarem fronteiras reais sem provedor pago.
import type { Attachment } from '../types'
import { arquivoVivo, apagarArquivoVivo } from './arquivosVivos'
import { aplicarRecibo, guardarFalha, guardarRecibo, lerRecibo } from './rascunhoTransferencia'

export type EstadoRecibo =
  | 'admitido' | 'recebendo' | 'preparado' | 'pronto' | 'falhou' | 'cancelado'

export interface ReciboTransporte {
  uploadId: string
  artifactId: string
  name: string
  bytes: number
  sha256: string | null
  state: EstadoRecibo
  mode: 'copy' | 'reference'
  scope: 'chat' | 'workspace'
  errorCode: string | null
}

export interface TransporteAnexos {
  admitir(entrada: {
    sessionId: string
    chatId: string
    uploadId: string
    name: string
    bytes: number
    mime: string
    mode: 'copy' | 'reference'
    scope: 'chat' | 'workspace'
    workspaceRoot?: string
  }): Promise<ReciboTransporte>
  enviar(sessionId: string, chatId: string, uploadId: string, file: File): Promise<ReciboTransporte>
  referencia(entrada: { sessionId: string; chatId: string; workspaceRoot: string; sourcePath: string }): Promise<ReciboTransporte>
  /** Recibo estável por ID (R11/B10): consultado ANTES de exigir o File. */
  estado?(sessionId: string, chatId: string, uploadId: string): Promise<ReciboTransporte>
}

export interface ResultadoTransferencia {
  anexos: Attachment[]
  todosProntos: boolean
  falhas: Array<{ name: string; motivo: string }>
}

/** Item em falha preserva TODAS as identidades já conhecidas (R11). */
function falha(anexo: Attachment, uploadId: string | undefined): Attachment {
  return { ...anexo, ...(uploadId ? { uploadId } : {}), estado: 'falhou' }
}

/**
 * Transfere cada anexo pendente do rascunho. Itens já `pronto`/`referencia`
 * são mantidos; File ausente em item local vira falha honesta (sem inventar
 * conteúdo). Nunca lança: o chamador decide publicar ou manter o rascunho.
 */
export async function transferirAnexos(entrada: {
  sessionId: string
  chatId: string
  anexos: Attachment[]
  /** Raiz ORIGINAL do workspace quando a sessão é workspace (senão null). */
  workspaceRoot?: string | null
  transporte: TransporteAnexos
}): Promise<ResultadoTransferencia> {
  const { sessionId, chatId, workspaceRoot, transporte } = entrada
  const saida: Attachment[] = []
  const falhas: ResultadoTransferencia['falhas'] = []

  for (const anexo of entrada.anexos) {
    if (anexo.estado === 'pronto' || anexo.estado === 'referencia') {
      saida.push(anexo)
      continue
    }
    const uploadId = anexo.uploadId ?? anexo.artifactId
    if (!uploadId) {
      falhas.push({ name: anexo.name, motivo: 'identificador de transferência ausente' })
      saida.push(falha(anexo, undefined))
      continue
    }
    try {
      if (anexo.kind === 'workspace') {
        // Seleção Explorer (@/árvore): referência de projeto, sem cópia.
        const caminho = anexo.id.startsWith('workspace:') ? anexo.id.slice('workspace:'.length) : anexo.referencia ?? ''
        if (!caminho || !workspaceRoot) {
          falhas.push({ name: anexo.name, motivo: 'caminho do workspace indisponível' })
          saida.push(falha(anexo, uploadId))
          continue
        }
        const recibo = await transporte.referencia({ sessionId, chatId, workspaceRoot, sourcePath: caminho })
        guardarRecibo(sessionId, chatId, recibo)
        saida.push({
          ...anexo, artifactId: recibo.artifactId, uploadId: recibo.uploadId,
          bytes: recibo.bytes, sha256: recibo.sha256 ?? undefined,
          estado: 'referencia', mode: 'reference', modoCopia: 'projeto', referencia: anexo.referencia ?? caminho,
        })
        continue
      }

      // R11/B10 — o RECIBO do servidor vem antes do File: um item já pronto
      // (ACK perdido, F5, falha parcial anterior) é reusado sem reenvio, e um
      // item sem File mas pronto continua sendo sucesso, não falha.
      const conhecido = lerRecibo(sessionId, chatId, uploadId)
      if (conhecido?.recibo.state === 'pronto') {
        saida.push(aplicarRecibo(anexo, conhecido.recibo))
        continue
      }
      if (transporte.estado) {
        const remoto = await transporte.estado(sessionId, chatId, uploadId).catch(() => null)
        if (remoto) {
          guardarRecibo(sessionId, chatId, remoto)
          if (remoto.state === 'pronto') {
            saida.push(aplicarRecibo(anexo, remoto))
            continue
          }
        }
      }

      const file = arquivoVivo(uploadId)
      if (!file) {
        const motivo = 'arquivo local indisponível após recarregar; o servidor não tem este item pronto'
        guardarFalha(sessionId, chatId, uploadId, motivo)
        falhas.push({ name: anexo.name, motivo })
        saida.push(falha(anexo, uploadId))
        continue
      }
      // Um upload novo acompanha a raiz da conversa: projeto em uploads/;
      // Chat sem pasta fica privado. Recibos prontos antigos nunca são movidos.
      const escopo: 'chat' | 'workspace' = workspaceRoot ? 'workspace' : 'chat'
      const recibo = await transporte.admitir({
        sessionId, chatId, uploadId, name: file.name, bytes: file.size,
        mime: file.type, mode: 'copy', scope: escopo,
        ...(escopo === 'workspace' && workspaceRoot ? { workspaceRoot } : {}),
      })
      guardarRecibo(sessionId, chatId, recibo)
      const concluido = recibo.state === 'pronto'
        ? recibo
        : await transporte.enviar(sessionId, chatId, uploadId, file)
      guardarRecibo(sessionId, chatId, concluido)
      saida.push({
        ...anexo,
        artifactId: concluido.artifactId,
        uploadId: concluido.uploadId,
        name: concluido.name,
        bytes: concluido.bytes,
        sha256: concluido.sha256 ?? undefined,
        estado: 'pronto',
        mode: 'copy',
        modoCopia: concluido.scope === 'workspace' ? 'projeto' : 'privado',
        legado: false,
      })
      // O File transitório só sai DEPOIS de o recibo pronto ficar guardado
      // pelo dono (B10): a retomada nunca depende de um File já descartado.
      apagarArquivoVivo(uploadId)
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error)
      guardarFalha(sessionId, chatId, uploadId, motivo)
      falhas.push({ name: anexo.name, motivo })
      saida.push(falha(anexo, uploadId))
    }
  }

  return {
    anexos: saida,
    todosProntos: falhas.length === 0 && saida.every((item) => item.estado === 'pronto' || item.estado === 'referencia'),
    falhas,
  }
}
