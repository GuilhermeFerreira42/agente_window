# CODIGO MOCKADO ATUAL - FILESYSTEM

## Arquivo: src/components/AuxiliaryBar.tsx linha ~50

```ts
const folders = [
  { name: 'browser', files: ['parts/titlebarPart.ts', 'parts/media/titlebarpart.css'] },
  { name: 'contrib', files: ['sessions/browser/views/sessionsList.ts', 'changes/browser/changesView.ts'] },
  { name: 'workbench', files: ['contrib/chat/browser/widget/media/chat.css'] },
]

function FilesDetails({ expandedFolders, onToggleFolder, onOpenFile }) {
  return (
    <section>
      <div>Workspace Files</div>
      {folders.map(folder => (
        // renderiza pastas hardcoded
      ))}
    </section>
  )
}
```

Hardcoded! Sempre 3 pastas, mesmos arquivos. Não lê disco.

## Arquivo: src/components/SessionLanding.tsx

```tsx
<span className="session-landing-chip">
  <FolderGit2 size={14} />{workspace}<ChevronDown size={13} />
</span>
```

Span sem onClick! Deveria ser button com onClick que chama pickDirectory().

## Arquivo: src/data.ts

```ts
export const initialDiffFiles: DiffFile[] = [
  {
    id: 'diff-1',
    path: 'src/browser/parts/titlebarPart.ts',
    status: 'modified',
    original: `export class TitlebarPart { readonly hasMenubar = true; }`,
    modified: `export class TitlebarPart { readonly hasMenubar = false; }`,
  },
  // ... 4 arquivos mockados
]

export const buildProjectDiffFiles: DiffFile[] = [
  // mesmo conteúdo pra todos arquivos (const a=1) - MOCK que você mostrou [01:45]
]
```

Todos arquivos têm mesmo conteúdo mockado.

## Arquivo: src/domain/unifiedDiff.ts
Gera diff com conteúdo mockado, não lê arquivo real
