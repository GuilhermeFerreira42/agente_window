// C-3a — referências de projeto (R03/T06/T22): caminho dentro do
// workspace validado, fingerprint do conteúdo, SEM cópia por padrão.
// O caminho nunca sai do servidor (locator privado no ledger).
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { lstat, stat } from 'node:fs/promises'
import path from 'node:path'
import { PersistenceProblem } from '../persistenceErrors'
import { inserirUpload, obterArtigo, upsertArtigo } from './catalogo'
import { nomeSeguroArquivo } from '../../../domain/anexosRascunho'
import { carregarPolitica, problemaPolitica } from './politica'

export interface EntradaReferencia {
  sessionId: string
  chatId: string
  workspaceRoot: string
  /** Caminho relativo ao workspace (aceita também absoluto DENTRO dele). */
  sourcePath: string
  agora?: () => number
  uuid?: () => string
}

export interface ReciboReferencia {
  uploadId: string
  artifactId: string
  name: string
  bytes: number
  sha256: string
  mode: 'reference'
  state: 'pronto'
}

/** Contenção: resolvido, sem escape, sem symlink de saída. */
export async function resolverDentroDoWorkspace(workspaceRoot: string, bruto: string): Promise<string> {
  const raiz = path.resolve(workspaceRoot)
  const absoluto = path.isAbsolute(bruto) ? path.resolve(bruto) : path.resolve(raiz, bruto)
  if (absoluto !== raiz && !absoluto.startsWith(raiz + path.sep)) {
    throw new PersistenceProblem(400, 'reference_out_of_scope',
      'O caminho escolhido está fora da pasta do workspace desta conversa. A referência não foi registrada.')
  }
  if (absoluto === raiz) {
    throw new PersistenceProblem(400, 'reference_out_of_scope', 'A pasta do workspace não pode ser registrada como arquivo de referência.')
  }
  const info = await lstat(absoluto).catch(() => null)
  if (!info) {
    throw new PersistenceProblem(404, 'reference_absent', 'O arquivo escolhido não existe mais. Nada foi registrado.')
  }
  if (info.isSymbolicLink()) {
    throw new PersistenceProblem(400, 'reference_out_of_scope',
      'Links simbólicos não são aceitos como referência: o destino real precisa estar dentro do workspace.')
  }
  if (!info.isFile()) {
    throw new PersistenceProblem(400, 'reference_out_of_scope', 'Só arquivos podem virar referência de projeto.')
  }
  return absoluto
}

export async function fingerprintDeArquivo(caminho: string): Promise<{ bytes: number; sha256: string; mtimeMs: number }> {
  const hash = createHash('sha256')
  let bytes = 0
  for await (const pedaco of createReadStream(caminho)) {
    hash.update(pedaco as Buffer)
    bytes += (pedaco as Buffer).length
  }
  const info = await stat(caminho)
  return { bytes, sha256: hash.digest('hex'), mtimeMs: info.mtimeMs }
}

/** Registra a referência (admissão + publicação sem bytes). */
export async function registrarReferencia(entrada: EntradaReferencia): Promise<ReciboReferencia> {
  const politicaResultado = carregarPolitica()
  if (!politicaResultado.ok) {
    const problema = problemaPolitica(politicaResultado)
    throw new PersistenceProblem(problema.status, problema.code, problema.message)
  }
  const absoluto = await resolverDentroDoWorkspace(entrada.workspaceRoot, entrada.sourcePath)
  const fingerprint = await fingerprintDeArquivo(absoluto)
  const agora = entrada.agora?.() ?? Date.now()
  const uuid = entrada.uuid?.() ?? crypto.randomUUID()
  const nome = nomeSeguroArquivo(path.basename(absoluto), politicaResultado.politica.maxNomeBytes)
  const relativo = path.relative(path.resolve(entrada.workspaceRoot), absoluto).split(path.sep).join('/')

  if (fingerprint.bytes > politicaResultado.politica.maxUploadBytes) {
    throw new PersistenceProblem(413, 'file_too_large',
      `O arquivo excede o limite de ${politicaResultado.politica.maxUploadBytes} bytes desta política local.`)
  }

  const existente = obterArtigo(uuid)
  if (existente) throw new PersistenceProblem(409, 'attachment_conflict', 'Identificador de artefato já utilizado.')

  inserirUpload({
    sessionId: entrada.sessionId, chatId: entrada.chatId, uploadId: uuid, artifactId: uuid,
    name: nome, declaredBytes: fingerprint.bytes, mime: '',
    state: 'pronto', stagePath: null, finalPath: null, mode: 'reference', scope: 'workspace',
    workspaceRoot: path.resolve(entrada.workspaceRoot), createdAt: agora, updatedAt: agora,
    errorCode: null, receivedBytes: 0, digest: fingerprint.sha256,
  })
  upsertArtigo({
    artifactId: uuid, sessionId: entrada.sessionId, chatId: entrada.chatId, uploadId: uuid,
    name: nome, modalidade: 'arquivo', papel: 'referencia-projeto', mode: 'reference',
    locator: relativo, rootKind: 'workspace', workspaceRoot: path.resolve(entrada.workspaceRoot),
    bytes: fingerprint.bytes, sha256: fingerprint.sha256, state: 'pronto',
    messageId: null, partId: null, createdAt: agora,
  })
  return {
    uploadId: uuid, artifactId: uuid, name: nome, bytes: fingerprint.bytes,
    sha256: fingerprint.sha256, mode: 'reference', state: 'pronto',
  }
}

/** Revalida a referência no momento da leitura (T22): presença + integridade. */
export async function verificarReferencia(artifactId: string): Promise<{ presente: boolean; integro: boolean }> {
  const artigo = obterArtigo(artifactId)
  if (!artigo || artigo.mode !== 'reference') return { presente: false, integro: false }
  const raiz = artigo.workspaceRoot ? path.resolve(artigo.workspaceRoot) : null
  if (!raiz) return { presente: false, integro: false }
  const absoluto = path.resolve(raiz, artigo.locator)
  if (absoluto !== raiz && !absoluto.startsWith(raiz + path.sep)) return { presente: false, integro: false }
  const info = await stat(absoluto).catch(() => null)
  if (!info || !info.isFile()) return { presente: false, integro: false }
  if (info.size !== artigo.bytes) return { presente: true, integro: false }
  const { hashDeArquivo } = await import('./estoque')
  const hash = await hashDeArquivo(absoluto)
  if (hash !== artigo.sha256) return { presente: true, integro: false }
  return { presente: true, integro: true }
}
