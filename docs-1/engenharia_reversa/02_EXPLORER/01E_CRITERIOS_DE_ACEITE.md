# CAMADA E — CRITÉRIO DE ACEITE (Explorer)

## 1. Funcionalidades Core
- **Navegação de Árvore**:
  - **Passo**: Clicar na seta de expansão de uma pasta.
  - **Resultado**: A pasta expande e exibe seus filhos carregados do disco.
  - **Validação**: Verificar se `IFileService.resolve` foi chamado para a pasta expandida.

- **Abertura de Arquivo**:
  - **Passo**: Double-click em um arquivo `.ts`.
  - **Resultado**: O arquivo é aberto no editor principal.
  - **Validação**: Verificar se `IEditorService.openEditor` foi invocado com a URI correta.

- **Criação de Novo Arquivo**:
  - **Passo**: Clicar em "New File" -> Digitar "test.ts" -> Enter.
  - **Resultado**: O arquivo é criado no disco e aparece instantaneamente na árvore.
  - **Validação**: Verificar a existência do arquivo no sistema de arquivos e a atualização do nó na UI.

## 2. Gestão de Estado e UI
- **Filtro de Busca**:
  - **Passo**: Digitar "index" no campo de busca.
  - **Resultado**: Todos os arquivos que não contém "index" no nome desaparecem; pastas pai de arquivos correspondentes permanecem visíveis e expandidas.
  - **Validação**: Verificar se apenas os itens com `markedAsFindResult = true` estão renderizados.

- **Sincronização de Disco**:
  - **Passo**: Criar um arquivo na pasta do projeto via terminal externo.
  - **Resultado**: O novo arquivo aparece na árvore do Explorer sem necessidade de reload manual.
  - **Validação**: Verificar a recepção do evento do `WorkspaceWatcher` e o trigger do `refresh()`.

## 3. Resiliência e Performance
- **Virtualização de Grande Volume**:
  - **Passo**: Abrir uma pasta com 10.000 arquivos.
  - **Resultado**: A UI permanece responsiva; apenas os itens visíveis no scroll são renderizados no DOM.
  - **Validação**: Verificar o número de elementos DOM na lista (deve ser constante, independente do total de arquivos).

- **Tratamento de Erros de I/O**:
  - **Passo**: Tentar expandir uma pasta sem permissão de leitura.
  - **Resultado**: A pasta exibe um ícone de erro ou mensagem de "Access Denied" sem travar a aplicação.
  - **Validação**: Verificar se a exceção do `IFileService` foi capturada e atribuída ao `ExplorerItem.error`.
