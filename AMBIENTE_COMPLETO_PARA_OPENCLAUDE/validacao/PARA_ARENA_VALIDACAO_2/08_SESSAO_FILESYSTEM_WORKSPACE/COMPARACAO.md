# 08 - FILESYSTEM & WORKSPACE (vídeo 01:56 + 01:45)

## Original manda:
- VS Code original tem acesso real ao disco via Electron
- Agents Window permite escolher qualquer pasta local do computador
- Workspace Files mostra arquivos reais, não mock
- Ao clicar em arquivo, abre conteúdo real no Monaco

## Réplica hoje - BUG VÍDEO 01:56 e 01:45:
- Botão "Nova sessão em workspace-local com Copilot" chip FolderGit2 é só span sem onClick - enfeite
- Não chama window.showDirectoryPicker()
- data.ts buildProjectDiffFiles retorna mesmo conteúdo para todos arquivos (const a=1)
- initialDiffFiles mockado
- Não há fileSystem real

## Arquivos:
- components/SessionLanding.tsx (chip workspace)
- components/Titlebar.tsx (workspace selector)
- components/AuxiliaryBar.tsx (Workspace Files tree)
- src/data.ts (MOCK)
- src/domain/unifiedDiff.ts (diffFiles)
- Precisa criar: domain/fileSystem.ts novo
