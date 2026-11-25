// C-3a — cliente HTTP dos anexos (R08): endpoints sob /api/sessions,
// corpo binário como File real em PUT (nunca JSON/base64), receipts do
// servidor como única fonte de estado. Sem provedor de IA no caminho.
import { expectOk } from './sessionWriteQueue'
import type { Attachment } from '../../types'

const PREFIXO = '/api/sessions'

export interface ReciboAnexo {
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

export interface AnexoSeguroCliente {
  artifactId: string
  name: string
  bytes: number
  sha256: string
  mode: 'copy' | 'reference'
  origem?: 'entrada' | 'gerado'
  estado: 'pronto' | 'ausente'
  presente: boolean
  referencia?: string
}

function rota(sessionId: string, chatId: string, resto = ''): string {
  return `${PREFIXO}/${encodeURIComponent(sessionId)}/chats/${encodeURIComponent(chatId)}/attachments${resto ? `/${resto}` : ''}`
}

export async function admitirAnexo(entrada: {
  sessionId: string
  chatId: string
  uploadId: string
  name: string
  bytes: number
  mime: string
  mode: 'copy' | 'reference'
  scope: 'chat' | 'workspace'
  workspaceRoot?: string
}): Promise<ReciboAnexo> {
  const { sessionId, chatId, ...corpo } = entrada
  const response = await expectOk(await fetch(rota(sessionId, chatId, 'uploads'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  }))
  return (await response.json()) as ReciboAnexo
}

/** PUT binário: File como corpo direto (streaming no servidor). */
export async function enviarConteudoAnexo(sessionId: string, chatId: string, uploadId: string, file: File): Promise<ReciboAnexo> {
  const response = await expectOk(await fetch(rota(sessionId, chatId, `uploads/${encodeURIComponent(uploadId)}/content`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
  }))
  return (await response.json()) as ReciboAnexo
}

export async function estadoAnexo(sessionId: string, chatId: string, uploadId: string): Promise<ReciboAnexo> {
  const response = await expectOk(await fetch(rota(sessionId, chatId, `uploads/${encodeURIComponent(uploadId)}`)))
  return (await response.json()) as ReciboAnexo
}

export async function cancelarAnexo(sessionId: string, chatId: string, uploadId: string): Promise<void> {
  await expectOk(await fetch(rota(sessionId, chatId, `uploads/${encodeURIComponent(uploadId)}`), { method: 'DELETE' }))
}

export async function registrarReferenciaAnexo(entrada: {
  sessionId: string
  chatId: string
  workspaceRoot: string
  sourcePath: string
}): Promise<ReciboAnexo> {
  const { sessionId, chatId, ...corpo } = entrada
  const response = await expectOk(await fetch(rota(sessionId, chatId, 'references'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  }))
  return (await response.json()) as ReciboAnexo
}

export interface EstadoUploadEmVoo {
  uploadId: string
  artifactId: string | null
  state: 'admitido' | 'recebendo' | 'preparado' | 'pronto' | 'falhou' | 'cancelado'
  name: string
  mode: 'copy' | 'reference'
  errorCode: string | null
}

export interface ListaAnexos {
  attachments: AnexoSeguroCliente[]
  uploads: EstadoUploadEmVoo[]
}

export async function listarAnexos(sessionId: string, chatId: string): Promise<ListaAnexos> {
  const response = await expectOk(await fetch(rota(sessionId, chatId)))
  const corpo = (await response.json()) as Partial<ListaAnexos>
  return { attachments: corpo.attachments ?? [], uploads: corpo.uploads ?? [] }
}

export async function baixarAnexo(sessionId: string, chatId: string, artifactId: string): Promise<Blob> {
  const response = await expectOk(await fetch(rota(sessionId, chatId, `${encodeURIComponent(artifactId)}?download=1`)))
  return response.blob()
}

/** Retomada da MESMA tentativa (sem path de origem): estado ou finalização. */
export async function retomarAnexo(sessionId: string, chatId: string, uploadId: string): Promise<ReciboAnexo> {
  const response = await expectOk(await fetch(rota(sessionId, chatId, `uploads/${encodeURIComponent(uploadId)}`), {
    method: 'PUT',
  }))
  return (await response.json()) as ReciboAnexo
}

export interface PlanoRecuperacao {
  recoveryId: string
  token: string
  expiraEm: number
  itens: Array<{ oldId: string; name: string; bytes: number; disponivel: boolean }>
}

export interface ReciboRecuperacao {
  recoveryId: string
  mapa: Array<{ oldId: string; newId: string }>
  indisponiveis: Array<{ oldId: string; name: string; motivo: string }>
  consumidoEm: number
}

/**
 * R13 — cópia de conversa: plano opaco curto (a origem vai por ID, nunca por
 * caminho) e confirmação com `{recoveryId, token}`.
 */
export async function prepararRecuperacao(sessionId: string, chatId: string, origemSessionId: string): Promise<PlanoRecuperacao> {
  const response = await expectOk(await fetch(rota(sessionId, chatId, 'recovery/prepare'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origemSessionId }),
  }))
  return (await response.json()) as PlanoRecuperacao
}

export async function confirmarRecuperacao(sessionId: string, chatId: string, plano: { recoveryId: string; token: string }): Promise<ReciboRecuperacao> {
  const response = await expectOk(await fetch(rota(sessionId, chatId, 'recovery/confirm'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recoveryId: plano.recoveryId, token: plano.token }),
  }))
  return (await response.json()) as ReciboRecuperacao
}

/** Reconcilia o estado do ledger com o transcript no carregamento (F5/offline). */
export interface ResultadoFusao {
  mensagens: Array<{ attachments?: Attachment[] }>
  /**
   * R11/B10 — prontos AINDA SEM MENSAGEM. A fusão antiga só reescrevia
   * mensagens existentes; um upload publicado antes de a mensagem falhar
   * desaparecia da UI depois do F5. Aqui ele é exposto ao dono (chip "salvo
   * sem mensagem").
   */
  orfaos: AnexoSeguroCliente[]
}

export function fundirEstadoAnexos(
  mensagens: Array<{ attachments?: Attachment[] }>,
  lista: ListaAnexos,
): ResultadoFusao {
  if (lista.attachments.length === 0 && lista.uploads.length === 0) return { mensagens, orfaos: [] }
  const porArtigo = new Map(lista.attachments.map((item) => [item.artifactId, item]))
  const porUpload = new Map(lista.uploads.map((item) => [item.uploadId, item]))
  const citados = new Set<string>()
  for (const mensagem of mensagens) {
    for (const anexo of mensagem.attachments ?? []) {
      if (anexo.artifactId) citados.add(anexo.artifactId)
      if (anexo.uploadId) citados.add(anexo.uploadId)
    }
  }
  const orfaos = lista.attachments.filter((item) => !citados.has(item.artifactId))
  const fundidas = mensagens.map((mensagem) => {
    if (!mensagem.attachments?.length) return mensagem
    return {
      ...mensagem,
      attachments: mensagem.attachments.map((anexo) => {
        const registro = anexo.artifactId ? porArtigo.get(anexo.artifactId) : undefined
        if (registro) {
          return {
            ...anexo,
            estado: registro.estado === 'pronto' && registro.presente
              ? (registro.mode === 'reference' ? 'referencia' as const : 'pronto' as const)
              : 'falhou' as const,
            bytes: registro.bytes,
            sha256: registro.sha256,
          }
        }
        const upload = anexo.artifactId ? porUpload.get(anexo.artifactId) : undefined
        if (upload && (upload.state === 'admitido' || upload.state === 'recebendo' || upload.state === 'preparado')) {
          return { ...anexo, estado: 'transferindo' as const }
        }
        if (upload && (upload.state === 'falhou' || upload.state === 'cancelado')) {
          return { ...anexo, estado: 'falhou' as const }
        }
        return anexo
      }),
    }
  })
  return { mensagens: fundidas, orfaos }
}
