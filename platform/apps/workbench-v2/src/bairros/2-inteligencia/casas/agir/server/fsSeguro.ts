import { createRequire } from 'node:module'
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

type Binding = {
  supported: boolean
  SandboxRoot: new (rootPath: string) => RaizDiscoSegura
}

const requireFromWorkbench = createRequire(nodePath.resolve(process.cwd(), 'package.json'))
let binding: Binding | null = null
try {
  binding = requireFromWorkbench(
    nodePath.resolve(
      process.cwd(),
      'server',
      'agir-fs-native',
      'build',
      'Release',
      'agente_window_fs_boundary.node',
    ),
  ) as Binding
} catch {
  // Ausência do addon sempre significa operações F2 bloqueadas, nunca FS Node path-based.
}

export const fsSeguroDisponivel = binding?.supported === true

export function abrirRaizDiscoSegura(raiz: string): RaizDiscoSegura | null {
  if (!fsSeguroDisponivel || binding === null) return null
  try {
    return new binding.SandboxRoot(nodePath.resolve(raiz))
  } catch {
    return null
  }
}

export function caminhoRelativoSeguro(raiz: string, caminho: string): string {
  const relativo = nodePath.relative(nodePath.resolve(raiz), nodePath.resolve(caminho))
  return relativo === '' ? '.' : relativo.split(nodePath.sep).join('/')
}
