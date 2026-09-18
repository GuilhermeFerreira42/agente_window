// R-030 — Núcleo reativo de observables + autorun (LAYOUT_CONTROLLER.md §1–2).
//
// O original do VS Code exige que TODO o estado de layout flua da sessão ativa
// como um **observable** (nunca de eventos): o controller deriva
// `activeSessionResourceObs`, `activeSessionIsCreatedObs`,
// `activeSessionHasWorkspaceObs` e `multipleSessionsVisibleObs`, e reage com
// `autorun`. Aqui modelamos exatamente essa mecânica com um motor mínimo, puro e
// testável, sem depender de nenhum framework.
//
// Correção do "glitch" clássico (diamante/memoização): cada observable carrega
// um número de versão que só incrementa quando o VALOR muda de fato
// (`Object.is`). Um `derived` recomputa preguiçosamente e só bumpa a própria
// versão se o resultado mudou; um `autorun` re-executa apenas quando a versão de
// alguma dependência realmente lida mudou. Assim, mudar uma fonte que não altera
// o valor derivado NÃO re-roda o autorun.
//
// Contrato:
//  - `observableValue(name, initial)` — célula de estado gravável.
//  - `derived(name, fn)` — observable computado, memoizado por versão.
//  - `autorun(fn)` — executa `fn`, rastreia leituras e re-executa quando uma
//    dependência muda de valor. Retorna um `dispose`.
//  - `transaction(fn)` — agrupa `set`s numa única propagação.

/** Um valor observável somente-leitura. */
export interface IObservable<T> {
  readonly name: string
  get(): T
  /** Uso interno: garante frescor e devolve a versão atual do valor. */
  _refresh(): number
  _addObserver(observer: IObserver): void
  _removeObserver(observer: IObserver): void
}

/** Um valor observável gravável. */
export interface ISettableObservable<T> extends IObservable<T> {
  set(value: T): void
}

/** Um consumidor reativo (derived ou autorun). Uso interno do motor. */
interface IObserver {
  markStale(): void
}

let currentCollector: DependencyCollector | undefined
let transactionDepth = 0
const pendingAutoruns = new Set<Autorun>()

interface DependencyCollector {
  readonly reads: Set<IObservable<unknown>>
}

function trackRead(observable: IObservable<unknown>): void {
  if (currentCollector) currentCollector.reads.add(observable)
}

function scheduleAutorun(autorun: Autorun): void {
  pendingAutoruns.add(autorun)
  if (transactionDepth === 0) flushAutoruns()
}

function flushAutoruns(): void {
  let guard = 0
  while (pendingAutoruns.size > 0) {
    if (++guard > 10000) throw new Error('autorun flush did not converge (possible cycle)')
    const batch = Array.from(pendingAutoruns)
    pendingAutoruns.clear()
    for (const autorun of batch) autorun._runIfNeeded()
  }
}

class ObservableValue<T> implements ISettableObservable<T> {
  private value: T
  private version = 0
  private readonly observers = new Set<IObserver>()

  constructor(readonly name: string, initial: T) {
    this.value = initial
  }

  get(): T {
    trackRead(this)
    return this.value
  }

  set(value: T): void {
    if (Object.is(value, this.value)) return
    this.value = value
    this.version++
    for (const observer of Array.from(this.observers)) observer.markStale()
    if (transactionDepth === 0) flushAutoruns()
  }

  _refresh(): number {
    return this.version
  }

  _addObserver(observer: IObserver): void {
    this.observers.add(observer)
  }

  _removeObserver(observer: IObserver): void {
    this.observers.delete(observer)
  }
}

class DerivedObservable<T> implements IObservable<T>, IObserver {
  private value: T | undefined
  private version = 0
  private stale = true
  private readonly observers = new Set<IObserver>()
  private dependencies = new Map<IObservable<unknown>, number>()

  constructor(readonly name: string, private readonly compute: () => T) {}

  get(): T {
    trackRead(this)
    this.ensureFresh()
    return this.value as T
  }

  private ensureFresh(): void {
    if (!this.stale) return
    // Se já computamos ao menos uma vez, só recompute se alguma dependência
    // realmente mudou de versão.
    if (this.dependencies.size > 0) {
      let changed = false
      for (const [dep, seenVersion] of this.dependencies) {
        if (dep._refresh() !== seenVersion) {
          changed = true
          break
        }
      }
      if (!changed) {
        this.stale = false
        return
      }
    }
    this.recompute()
  }

  private recompute(): void {
    const previous = this.value
    const hadValue = this.dependencies.size > 0 || this.version > 0
    const previousCollector = currentCollector
    const collector: DependencyCollector = { reads: new Set() }
    currentCollector = collector
    try {
      this.value = this.compute()
    } finally {
      currentCollector = previousCollector
    }
    // Atualiza dependências com suas versões atuais.
    for (const dep of this.dependencies.keys()) {
      if (!collector.reads.has(dep)) dep._removeObserver(this)
    }
    const nextDeps = new Map<IObservable<unknown>, number>()
    for (const dep of collector.reads) {
      dep._addObserver(this)
      nextDeps.set(dep, dep._refresh())
    }
    this.dependencies = nextDeps
    this.stale = false
    if (!hadValue || !Object.is(previous, this.value)) this.version++
  }

  _refresh(): number {
    this.ensureFresh()
    return this.version
  }

  markStale(): void {
    if (this.stale) return
    this.stale = true
    for (const observer of Array.from(this.observers)) observer.markStale()
  }

  _addObserver(observer: IObserver): void {
    this.ensureFresh()
    this.observers.add(observer)
  }

  _removeObserver(observer: IObserver): void {
    this.observers.delete(observer)
  }
}

class Autorun implements IObserver {
  private stale = true
  private disposed = false
  private hasRun = false
  private dependencies = new Map<IObservable<unknown>, number>()

  constructor(readonly name: string, private readonly run: () => void) {
    this._runIfNeeded()
  }

  markStale(): void {
    if (this.stale || this.disposed) return
    this.stale = true
    scheduleAutorun(this)
  }

  _runIfNeeded(): void {
    if (this.disposed || !this.stale) return
    this.stale = false
    // Pula a re-execução se nenhuma dependência realmente mudou de versão.
    if (this.hasRun) {
      let changed = false
      for (const [dep, seenVersion] of this.dependencies) {
        if (dep._refresh() !== seenVersion) {
          changed = true
          break
        }
      }
      if (!changed) return
    }
    const previousCollector = currentCollector
    const collector: DependencyCollector = { reads: new Set() }
    currentCollector = collector
    try {
      this.run()
    } finally {
      currentCollector = previousCollector
    }
    for (const dep of this.dependencies.keys()) {
      if (!collector.reads.has(dep)) dep._removeObserver(this)
    }
    const nextDeps = new Map<IObservable<unknown>, number>()
    for (const dep of collector.reads) {
      dep._addObserver(this)
      nextDeps.set(dep, dep._refresh())
    }
    this.dependencies = nextDeps
    this.hasRun = true
  }

  dispose(): void {
    this.disposed = true
    for (const dep of this.dependencies.keys()) dep._removeObserver(this)
    this.dependencies.clear()
    pendingAutoruns.delete(this)
  }
}

/** Cria uma célula de estado observável gravável. */
export function observableValue<T>(name: string, initial: T): ISettableObservable<T> {
  return new ObservableValue(name, initial)
}

/** Cria um observable computado a partir de outros observables. */
export function derived<T>(name: string, compute: () => T): IObservable<T> {
  return new DerivedObservable(name, compute)
}

/** Executa `fn` reativamente: re-roda sempre que uma dependência muda de valor. */
export function autorun(name: string, run: () => void): { dispose(): void } {
  return new Autorun(name, run)
}

/** Agrupa múltiplos `set` para que os autoruns rodem no máximo uma vez ao fim. */
export function transaction(fn: () => void): void {
  transactionDepth++
  try {
    fn()
  } finally {
    transactionDepth--
    if (transactionDepth === 0) flushAutoruns()
  }
}

