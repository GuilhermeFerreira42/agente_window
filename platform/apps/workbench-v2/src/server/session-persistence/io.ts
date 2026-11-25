import * as nodeFs from 'node:fs/promises'

// Seam de I/O do journal (P-B): o produtur e o recoveredPublish passam por
// `io` para que a prova de fronteira (H4) possa instalar um gate determinístico
// de rename (pré/pós-rename) no processo filho, sem sinais POSIX e sem depender
// de pausa do processo. Nenhum módulo fora deste importa `node:fs/promises`
// para os arquivos da sessão.
export const io = {
  mkdir: nodeFs.mkdir,
  readFile: nodeFs.readFile,
  rename: nodeFs.rename,
  stat: nodeFs.stat,
  unlink: nodeFs.unlink,
  writeFile: nodeFs.writeFile,
}
