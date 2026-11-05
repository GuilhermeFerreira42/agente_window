// ui/attach/fileIconClasses.ts — 4.7 c3. Mesmas classes do tema Seti que o
// Explorer usa (`file-icon <name>-name-file-icon name-file-icon <ext>-ext-file-icon
// ext-file-icon`), a partir só do nome — para abas e breadcrumbs.
export function fileIconLabelClasses(fileName: string, extra: string[] = []): string {
  const name = fileName.toLowerCase();
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1) : dot === 0 ? name.slice(1) : '';
  const extCls = ext ? `${ext}-ext-file-icon ext-file-icon` : '';
  return `monaco-icon-label file-icon ${name}-name-file-icon name-file-icon ${extCls} ${extra.join(' ')}`.replace(/\s+/g, ' ').trim();
}
