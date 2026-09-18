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
let currentCollector;
let transactionDepth = 0;
const pendingAutoruns = new Set();
function trackRead(observable) {
    if (currentCollector)
        currentCollector.reads.add(observable);
}
function scheduleAutorun(autorun) {
    pendingAutoruns.add(autorun);
    if (transactionDepth === 0)
        flushAutoruns();
}
function flushAutoruns() {
    let guard = 0;
    while (pendingAutoruns.size > 0) {
        if (++guard > 10000)
            throw new Error('autorun flush did not converge (possible cycle)');
        const batch = Array.from(pendingAutoruns);
        pendingAutoruns.clear();
        for (const autorun of batch)
            autorun._runIfNeeded();
    }
}
class ObservableValue {
    name;
    value;
    version = 0;
    observers = new Set();
    constructor(name, initial) {
        this.name = name;
        this.value = initial;
    }
    get() {
        trackRead(this);
        return this.value;
    }
    set(value) {
        if (Object.is(value, this.value))
            return;
        this.value = value;
        this.version++;
        for (const observer of Array.from(this.observers))
            observer.markStale();
        if (transactionDepth === 0)
            flushAutoruns();
    }
    _refresh() {
        return this.version;
    }
    _addObserver(observer) {
        this.observers.add(observer);
    }
    _removeObserver(observer) {
        this.observers.delete(observer);
    }
}
class DerivedObservable {
    name;
    compute;
    value;
    version = 0;
    stale = true;
    observers = new Set();
    dependencies = new Map();
    constructor(name, compute) {
        this.name = name;
        this.compute = compute;
    }
    get() {
        trackRead(this);
        this.ensureFresh();
        return this.value;
    }
    ensureFresh() {
        if (!this.stale)
            return;
        // Se já computamos ao menos uma vez, só recompute se alguma dependência
        // realmente mudou de versão.
        if (this.dependencies.size > 0) {
            let changed = false;
            for (const [dep, seenVersion] of this.dependencies) {
                if (dep._refresh() !== seenVersion) {
                    changed = true;
                    break;
                }
            }
            if (!changed) {
                this.stale = false;
                return;
            }
        }
        this.recompute();
    }
    recompute() {
        const previous = this.value;
        const hadValue = this.dependencies.size > 0 || this.version > 0;
        const previousCollector = currentCollector;
        const collector = { reads: new Set() };
        currentCollector = collector;
        try {
            this.value = this.compute();
        }
        finally {
            currentCollector = previousCollector;
        }
        // Atualiza dependências com suas versões atuais.
        for (const dep of this.dependencies.keys()) {
            if (!collector.reads.has(dep))
                dep._removeObserver(this);
        }
        const nextDeps = new Map();
        for (const dep of collector.reads) {
            dep._addObserver(this);
            nextDeps.set(dep, dep._refresh());
        }
        this.dependencies = nextDeps;
        this.stale = false;
        if (!hadValue || !Object.is(previous, this.value))
            this.version++;
    }
    _refresh() {
        this.ensureFresh();
        return this.version;
    }
    markStale() {
        if (this.stale)
            return;
        this.stale = true;
        for (const observer of Array.from(this.observers))
            observer.markStale();
    }
    _addObserver(observer) {
        this.ensureFresh();
        this.observers.add(observer);
    }
    _removeObserver(observer) {
        this.observers.delete(observer);
    }
}
class Autorun {
    name;
    run;
    stale = true;
    disposed = false;
    hasRun = false;
    dependencies = new Map();
    constructor(name, run) {
        this.name = name;
        this.run = run;
        this._runIfNeeded();
    }
    markStale() {
        if (this.stale || this.disposed)
            return;
        this.stale = true;
        scheduleAutorun(this);
    }
    _runIfNeeded() {
        if (this.disposed || !this.stale)
            return;
        this.stale = false;
        // Pula a re-execução se nenhuma dependência realmente mudou de versão.
        if (this.hasRun) {
            let changed = false;
            for (const [dep, seenVersion] of this.dependencies) {
                if (dep._refresh() !== seenVersion) {
                    changed = true;
                    break;
                }
            }
            if (!changed)
                return;
        }
        const previousCollector = currentCollector;
        const collector = { reads: new Set() };
        currentCollector = collector;
        try {
            this.run();
        }
        finally {
            currentCollector = previousCollector;
        }
        for (const dep of this.dependencies.keys()) {
            if (!collector.reads.has(dep))
                dep._removeObserver(this);
        }
        const nextDeps = new Map();
        for (const dep of collector.reads) {
            dep._addObserver(this);
            nextDeps.set(dep, dep._refresh());
        }
        this.dependencies = nextDeps;
        this.hasRun = true;
    }
    dispose() {
        this.disposed = true;
        for (const dep of this.dependencies.keys())
            dep._removeObserver(this);
        this.dependencies.clear();
        pendingAutoruns.delete(this);
    }
}
/** Cria uma célula de estado observável gravável. */
export function observableValue(name, initial) {
    return new ObservableValue(name, initial);
}
/** Cria um observable computado a partir de outros observables. */
export function derived(name, compute) {
    return new DerivedObservable(name, compute);
}
/** Executa `fn` reativamente: re-roda sempre que uma dependência muda de valor. */
export function autorun(name, run) {
    return new Autorun(name, run);
}
/** Agrupa múltiplos `set` para que os autoruns rodem no máximo uma vez ao fim. */
export function transaction(fn) {
    transactionDepth++;
    try {
        fn();
    }
    finally {
        transactionDepth--;
        if (transactionDepth === 0)
            flushAutoruns();
    }
}
//# sourceMappingURL=observable.js.map