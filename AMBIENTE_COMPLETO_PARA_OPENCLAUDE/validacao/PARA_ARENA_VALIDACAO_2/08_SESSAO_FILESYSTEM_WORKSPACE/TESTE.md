# TESTE FILESYSTEM

Playwright (com mock de showDirectoryPicker ou pasta de teste):
1. Clicar chip workspace-local -> validar que showDirectoryPicker é chamado
2. Mockar retorno de pasta com 3 arquivos: a.txt, b.ts, c.md
3. Validar que AuxiliaryBar lista 3 arquivos
4. Clicar em b.ts -> validar que EditorArea abre tab com conteúdo "conteúdo real de b.ts" (não const a=1)
5. Reload -> validar que pasta ainda está selecionada
6. Screenshot: Workspace Files com arquivos reais
