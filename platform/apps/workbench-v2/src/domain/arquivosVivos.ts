// C-3a (D140) — repositório TRANSITÓRIO dos File objects do rascunho.
// Módulo singleton: sobrevive a remounts de componente, NUNCA é serializado
// (nem localStorage, nem snapshot de sessão). Fora do estado React de propósito:
// um File não pode virar props nem passar por JSON.
const vivos = new Map<string, File>()

export function guardarArquivoVivo(uploadId: string, file: File): void {
  vivos.set(uploadId, file)
}

export function arquivoVivo(uploadId: string): File | undefined {
  return vivos.get(uploadId)
}

export function apagarArquivoVivo(uploadId: string): void {
  vivos.delete(uploadId)
}

/** Limpa os Files de um rascunho aceito/abortado (ids informados). */
export function apagarArquivosVivos(ids: string[]): void {
  for (const id of ids) vivos.delete(id)
}

/** Somente para isolamento de teste — nunca usado pelo produto. */
export function limparTodosArquivosVivos(): void {
  vivos.clear()
}
