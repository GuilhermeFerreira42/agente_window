/**
 * Contrato de Tema — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 12
 */

export interface ThemeService {
  getToken(token: string): string;
  applyTheme(themeId: string): Promise<void>;
  onThemeChanged(listener: (themeId: string) => void): () => void;
}
