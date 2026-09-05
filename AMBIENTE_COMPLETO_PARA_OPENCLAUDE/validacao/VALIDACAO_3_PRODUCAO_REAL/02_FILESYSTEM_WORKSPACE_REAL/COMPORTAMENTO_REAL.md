# COMPORTAMENTO REAL - FILESYSTEM

## Vídeo novo [01:45-02:00][02:37][06:13]
- [01:45] Você mostra arquivos que são tudo simulação, mesmo conteúdo pra todos
- [01:56] Botão "Nova sessão em workspace-local com Copilot" chip FolderGit2 é só span, não chama file picker
- [02:37] "tem essas coisas aqui que é só simulação"
- [06:13] No original: consegue adicionar pasta Entrega, teste, Downloads do PC - "que maravilha"

## Comportamento original real
1. Clicar em "Nova sessão em workspace-local" -> abre diálogo nativo Windows para escolher pasta
2. Escolher pasta com 10 arquivos -> Workspace Files lista 10 arquivos reais (não 3 hardcoded browser/contrib/workbench)
3. Clicar em arquivo -> Monaco mostra conteúdo real do disco (não const a=1 pra todos)
4. F5 -> pasta continua selecionada (handle salvo em IndexedDB)
5. Botão direito em arquivo: Abrir, Renomear, Excluir, Revelar no Explorer, Novo arquivo, Nova pasta
6. Arrastar pasta do Windows Explorer pra dentro adiciona ao workspace

## O que deveria acontecer
- Chip workspace-local deve ser clicável (hoje é span sem onClick)
- Deve chamar showDirectoryPicker()
- AuxiliaryBar deve renderizar árvore recursiva real, não const folders = [...]
- EditorArea deve receber file content real via prop, não diffFiles mockado
