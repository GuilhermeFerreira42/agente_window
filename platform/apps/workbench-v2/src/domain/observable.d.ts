/** Um valor observável somente-leitura. */
export interface IObservable<T> {
    readonly name: string;
    get(): T;
    /** Uso interno: garante frescor e devolve a versão atual do valor. */
    _refresh(): number;
    _addObserver(observer: IObserver): void;
    _removeObserver(observer: IObserver): void;
}
/** Um valor observável gravável. */
export interface ISettableObservable<T> extends IObservable<T> {
    set(value: T): void;
}
/** Um consumidor reativo (derived ou autorun). Uso interno do motor. */
interface IObserver {
    markStale(): void;
}
/** Cria uma célula de estado observável gravável. */
export declare function observableValue<T>(name: string, initial: T): ISettableObservable<T>;
/** Cria um observable computado a partir de outros observables. */
export declare function derived<T>(name: string, compute: () => T): IObservable<T>;
/** Executa `fn` reativamente: re-roda sempre que uma dependência muda de valor. */
export declare function autorun(name: string, run: () => void): {
    dispose(): void;
};
/** Agrupa múltiplos `set` para que os autoruns rodem no máximo uma vez ao fim. */
export declare function transaction(fn: () => void): void;
export {};
//# sourceMappingURL=observable.d.ts.map