// P-B (extraído da prefeitura na C-3a) — fila serial do dono (sessão) neste
// processo de servidor. Era privada em `index.ts`; os anexos precisam dela nos
// trechos críticos de admissão/finalização/exclusão (R06/B05) e a extração
// mantém UMA única fila — nunca uma fila paralela por módulo.
//
// A transferência em si (stream) NUNCA fica dentro da fila: só os trechos
// curtos de catálogo/intenção/commit. Sem bypass de `VITEST`.
const sessionPersistenceQueues = new Map<string, Promise<void>>()

export function withSessionPersistenceQueue<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
  const previous = sessionPersistenceQueues.get(sessionId) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const tail = previous.then(() => gate, () => gate)
  sessionPersistenceQueues.set(sessionId, tail)

  const result = previous.catch(() => undefined).then(operation)
  void tail.then(() => {
    if (sessionPersistenceQueues.get(sessionId) === tail) sessionPersistenceQueues.delete(sessionId)
  })
  return result.finally(release)
}

/** Somente para diagnóstico/ensaios: identifica o dono da fila em log. */
export function donoNaFila(sessionId: string): boolean {
  return sessionPersistenceQueues.has(sessionId)
}
