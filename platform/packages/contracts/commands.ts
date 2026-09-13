/**
 * Contrato de Comandos e Contextos — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 11
 */

export interface CommandRegistry {
  register(command: { id: string; title: string; run: () => Promise<void> | void }): () => void;
  execute(commandId: string): Promise<void>;
  setContext(key: string, value: boolean | string | number): void;
}
