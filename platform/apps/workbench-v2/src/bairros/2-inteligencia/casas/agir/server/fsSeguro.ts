import * as nodePath from 'node:path'

export type EntradaDiretorioSegura = {
  name: string
  kind: 'directory' | 'file' | 'symlink' | 'other'
  size: number
}

export interface RaizDiscoSegura {
  readFile(relativePath: string): Buffer
  readDirectory(relativePath: string): EntradaDiretorioSegura[]
  createExclusive(relativePath: string, content: Buffer): void
  writeAtomic(relativePath: string, content: Buffer): void
  close(): void
}

// Temporarily keep every Agir filesystem operation fail-closed. A controlled
// rename race showed that a directory fd resolved beneath root can be moved
// outside the workspace before read/publication completes. openat2 protects
// path resolution, not the later namespace move; do not expose the native
// addon to product flows until the F2 guarantee is resolved and re-tested.
export const fsSeguroDisponivel = false

export function abrirRaizDiscoSegura(_raiz: string): RaizDiscoSegura | null {
  return null
}

export function caminhoRelativoSeguro(raiz: string, caminho: string): string {
  const relativo = nodePath.relative(nodePath.resolve(raiz), nodePath.resolve(caminho))
  return relativo === '' ? '.' : relativo.split(nodePath.sep).join('/')
}
