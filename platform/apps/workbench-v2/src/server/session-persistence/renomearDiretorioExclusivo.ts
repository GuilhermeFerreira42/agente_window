import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ambienteMultimidia } from './attachments/ambienteMultimidia'
import { PersistenceProblem } from './persistenceErrors'

const executar = promisify(execFile)
const renomear = `
import ctypes
import errno
import os
import sys

origem, destino = sys.argv[1:]
try:
    if sys.platform == 'win32':
        os.rename(origem, destino)
    else:
        libc = ctypes.CDLL(None, use_errno=True)
        origem, destino = os.fsencode(origem), os.fsencode(destino)
        if sys.platform.startswith('linux'):
            # AT_FDCWD, RENAME_NOREPLACE
            resultado = libc.renameat2(-100, origem, -100, destino, 1)
        elif sys.platform == 'darwin':
            # RENAME_EXCL
            resultado = libc.renamex_np(origem, destino, 4)
        else:
            sys.exit(21)
        if resultado != 0:
            codigo = ctypes.get_errno()
            raise OSError(codigo, os.strerror(codigo))
except OSError as erro:
    if erro.errno in (errno.EEXIST, errno.ENOTEMPTY):
        sys.exit(20)
    if erro.errno in (errno.EINVAL, errno.ENOSYS, errno.ENOTSUP, errno.EXDEV):
        sys.exit(21)
    sys.exit(22)
except AttributeError:
    sys.exit(21)
`

/** O sistema de arquivos decide se o destino está livre na mesma operação. */
export async function renomearDiretorioExclusivo(origem: string, destino: string): Promise<void> {
  const python = process.platform === 'win32' ? ['py', '-3.11'] : ['python3']
  const [executavel, ...prefixo] = python
  try {
    await executar(executavel, [...prefixo, '-I', '-c', renomear, origem, destino], {
      windowsHide: true, maxBuffer: 4096, env: ambienteMultimidia({}),
    })
  } catch (erro) {
    const codigo = (erro as { code?: number | string }).code
    if (codigo === 20) throw Object.assign(new Error('O destino já existe.'), { code: 'EEXIST' })
    const mensagem = codigo === 21 || codigo === 'ENOENT'
      ? 'O sistema de arquivos ou o ambiente não oferece movimentação exclusiva entre essas pastas.'
      : 'O sistema operacional não confirmou o movimento desta pasta. Confira a origem e o destino.'
    throw new PersistenceProblem(409, 'work_move_unavailable', mensagem)
  }
}
