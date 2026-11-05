// ============================================================================
// domain/filePreview.ts — utilidades puras do fluxo "arquivo do Explorer" (4.4-fix)
// Cobrindo: detecção de imagem (Image Preview), mapa de linguagem do Monaco e
// clamp do posicionamento do menu de contexto no header do Explorer
// (BUG-V1 — menu "…" truncado no painel estreito).
// Puros: zero DOM aqui (o clamp recebe mágica como parâmetros) → testáveis em jsdom.
// ============================================================================

/** Extensões abertas via Image Preview (espelho do `imagePreview.ts` do vscode). */
const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'avif',
]);

/** Nome do arquivo é uma imagem? (case-insensitive, pela extensão final). */
export function isImageFile(name: string): boolean {
  const idx = name.lastIndexOf('.');
  // idx <= 0: sem extensão real (arquivo oculto do tipo ".png" não é imagem).
  if (idx <= 0) return false;
  return IMAGE_EXTENSIONS.has(name.slice(idx + 1).toLowerCase());
}

/** Linguagem do Monaco a partir do path — fallback resolvido para plaintext
 *  (arquivos texto ao abrir com real content não devem aplicar highlight de TS). */
export function languageForPath(path?: string): string {
  const name = (path ?? '').toLowerCase();
  if (name.endsWith('.json') || name.endsWith('.jsonc')) return 'json';
  if (name.endsWith('.css') || name.endsWith('.scss') || name.endsWith('.less')) return 'css';
  if (name.endsWith('.md') || name.endsWith('.markdown')) return 'markdown';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  if (name.endsWith('.py')) return 'python';
  if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.mts') || name.endsWith('.cts')) return 'typescript';
  if (name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.mjs') || name.endsWith('.cjs')) return 'javascript';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'yaml';
  if (name.endsWith('.xml') || name.endsWith('.xsd') || name.endsWith('.svg')) return 'xml';
  if (name.endsWith('.sh') || name.endsWith('.bash')) return 'shell';
  return 'plaintext';
}

/** Posição do menu após clamp à viewport — NUNCA fora da tela (BUG-V1). */
export function clampMenuPosition(
  desiredX: number,
  desiredY: number,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 8,
): { x: number; y: number } {
  const maxX = Math.max(margin, viewportWidth - menuWidth - margin);
  const maxY = Math.max(margin, viewportHeight - menuHeight - margin);
  return {
    x: Math.min(Math.max(margin, desiredX), maxX),
    y: Math.min(Math.max(margin, desiredY), maxY),
  };
}
