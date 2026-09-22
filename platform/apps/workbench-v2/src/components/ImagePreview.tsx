// ============================================================================
// ImagePreview — BLOCO 4.4-fix (BUG-P1, binários)
// ÚNICA superfície do workbench que usa <img> legítimo (exceção documentada no
// contrato P7.3 — src/__tests__/iconLabels.test.ts): aqui o <img> NÃO é ícone,
// é o CONTEÚDO binário real do arquivo lido via FileSystemPort (data URI base64
// vinda de /fs/read?binary=1). Ícones continuam proibidos como <img>/emoji.
// ============================================================================

export interface ImagePreviewProps {
  path?: string;
  alt: string;
  dataBase64: string;
  mime: string;
  isRealFile: boolean;
}

export function ImagePreview({ path, alt, dataBase64, mime, isRealFile }: ImagePreviewProps) {
  return (
    <div className="monaco-editor-shell" data-testid="image-preview-pane">
      <div
        style={{
          padding: '8px 12px',
          fontSize: 11,
          color: 'var(--vscode-descriptionForeground)',
          borderBottom: '1px solid var(--vscode-panel-border)',
          background: 'var(--vscode-editor-background)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>🖼️ Image Preview — {path}</span>
        {isRealFile && (
          <span style={{ fontSize: 10, background: 'var(--vscode-badge-background)', color: 'var(--vscode-badge-foreground)', padding: '2px 6px', borderRadius: 4 }}>
            REAL
          </span>
        )}
      </div>
      <div
        style={{
          height: 'calc(100% - 29px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--vscode-editor-background)',
          overflow: 'auto',
        }}
      >
        <img
          src={`data:${mime};base64,${dataBase64}`}
          alt={path ?? alt}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
        />
      </div>
    </div>
  )
}
