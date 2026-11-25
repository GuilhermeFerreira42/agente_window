// C-3a — projeção segura do artefato para DTOs de mensagem/lista (P30):
// apenas metadados aditivos; nunca bytes, base64, locator físico ou token.
import type { LinhaArtigo } from './schemaAnexos'
import { caminhoAbsolutoDeArtigo, lerArtigo } from './estoque'

export interface AnexoSeguro {
  artifactId: string
  name: string
  bytes: number
  sha256: string
  mode: 'copy' | 'reference'
  origem: 'entrada' | 'gerado'
  estado: 'pronto' | 'ausente'
  presente: boolean
  /** Somente referência: caminho relativo ao workspace (nunca absoluto). */
  referencia?: string
}

export async function caminhoAbsolutoArtigo(artigo: LinhaArtigo): Promise<string> {
  // C-3b — delega à resolução ÚNICA (uploads, project copy e artifacts/).
  return caminhoAbsolutoDeArtigo(artigo)
}

export async function projetarArtigoSeguro(artigo: LinhaArtigo): Promise<AnexoSeguro> {
  // T22/B07 — MESMO resolver validado usado pelo download: presença,
  // contenção de pais, tamanho e hash. Referência alterada aparece `ausente`
  // (o uso é impedido) e download responde 409 honesto; nunca retarget.
  let presente = false
  try {
    await lerArtigo(artigo.artifactId)
    presente = true
  } catch {
    presente = false
  }
  const seguro: AnexoSeguro = {
    artifactId: artigo.artifactId,
    name: artigo.name,
    bytes: artigo.bytes,
    sha256: artigo.sha256,
    mode: artigo.mode,
    origem: artigo.papel === 'gerado-gerenciado' ? 'gerado' : 'entrada',
    estado: presente ? 'pronto' : 'ausente',
    presente,
  }
  if (artigo.mode === 'reference') seguro.referencia = artigo.locator
  return seguro
}
