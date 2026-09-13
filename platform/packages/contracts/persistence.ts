/**
 * Contrato de Persistência — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 10
 */

export interface PersistencePort {
  load<T>(key: string): Promise<T | null>;
  save<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
