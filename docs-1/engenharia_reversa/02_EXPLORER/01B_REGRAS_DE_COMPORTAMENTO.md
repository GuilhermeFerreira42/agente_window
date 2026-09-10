# CAMADA B — REGRAS DE COMPORTAMENTO (Explorer)

## 1. Gestão da Árvore e Modelagem
- **Resolução Preguiçosa (Lazy Loading)**
  - **Dado** que uma pasta é expandida pela primeira vez
  - **Quando** o usuário clica para expandir
  - **Então** o `ExplorerItem` solicita a resolução de seus filhos ao `IFileService` e marca-se como `_isDirectoryResolved = true`.

- **Sincronização com o Disco**
  - **Dado** que o sistema de arquivos sofreu alteração (via watcher)
  - **Quando** o evento de alteração é recebido
  - **Então** o `ExplorerModel` dispara o `onDidChangeRoots` e a UI dispara o `refresh()` para atualizar os nós afetados.

- **Agrupamento de Pastas (Compact Folders)**
  - **Dado** que a configuração `explorer.compactFolders` está ativa
  - **Quando** uma pasta contém apenas uma subpasta e nenhum arquivo
  - **Então** a UI renderiza a hierarquia de forma compactada (ex: `src/main/java`).

## 2. Interação e Fluxos de Trabalho
- **Abertura de Arquivo**
  - **Dado** que um arquivo é selecionado
  - **Quando** o usuário executa double-click ou Enter
  - **Então** o `IEditorService` é invocado para abrir o recurso no grupo de editores ativo.

- **Criação de Novo Item**
  - **Dado** que uma pasta está focada
  - **Quando** o comando `New File` é acionado
  - **Então** o sistema entra em estado de "Edição de Nome", aguarda o input do usuário e chama o `IFileService.writeFile` para criar o arquivo no disco.

- **Movimentação via Drag and Drop**
  - **Dado** que um arquivo é arrastado
  - **Quando** ele é solto sobre uma pasta destino
  - **Então** o sistema valida as permissões de escrita e move o recurso via `IFileService.move`.

## 3. Filtros e Busca
- **Filtragem em Tempo Real**
  - **Dado** que o usuário digita no campo de busca
  - **Quando** o texto muda
  - **Então** o `FilesFilter` marca os itens correspondentes como `markedAsFindResult` e a árvore oculta os itens não correspondentes, expandindo automaticamente os caminhos até os resultados.
