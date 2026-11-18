// C-3a — projeção segura do artefato para DTOs de mensagem/lista (P30):
// apenas metadados aditivos; nunca bytes, base64, locator físico ou token.
import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { LinhaArtigo } from './schemaAnexos'
import { getAppDir } from '../paths'

export interface AnexoSeguro {
  artifactId: string
  name: string
  bytes: number
  sha256: string
  mode: 'copy' | 'reference'
  estado: 'pronto' | 'ausente'
  presente: boolean
  /** Somente referência: caminho relativo ao workspace (nunca absoluto). */
  referencia?: string
}

export async function caminhoAbsolutoArtigo(artigo: LinhaArtigo): Promise<string> {
  if (artigo.rootKind === 'workspace' && artigo.workspaceRoot) {
    return path.resolve(artigo.workspaceRoot, artigo.locator)
  }
  return path.join(getAppDir(), 'uploads', artigo.locator)
}

export async function projetarArtigoSeguro(artigo: LinhaArtigo): Promise<AnexoSeguro> {
  const absoluto = await caminhoAbsolutoArtigo(artigo)
  const info = await stat(absoluto).catch(() => null)
  let presente = Boolean(info?.isFile())
  if (artigo.mode === 'reference') {
    // T22 — revalidação no momento da leitura: presença + integridade.
    // Alterada ou removida → `ausente` (o uso é impedido); a atualização é
    // explícita (novo registro), nunca retarget silencioso do legado.
    const { verificarReferencia } = await import('./referencias')
    const revalidacao = await verificarReferencia(artigo.artifactId)
    presente = revalidacao.presente && revalidacao.integro
  }
  const seguro: AnexoSeguro = {
    artifactId: artigo.artifactId,
    name: artigo.name,
    bytes: artigo.bytes,
    sha256: artigo.sha256,
    mode: artigo.mode,
    estado: presente ? 'pronto' : 'ausente',
    presente,
  }
  if (artigo.mode === 'reference') seguro.referencia = artigo.locator
  return seguro
}
