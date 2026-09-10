# CAMADA C — MAPA DE CÓDIGO DE REFERÊNCIA (Explorer)

## 1. Camada de Interface e Serviços (Workbench)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Renderização da View | `src/vs/workbench/contrib/files/browser/views/explorerView.ts` | `ExplorerView` | Orquestrador da View, lida com eventos de foco, menus e renderização da árvore. |
| Renderização do Nó | `src/vs/workbench/contrib/files/browser/explorerViewer.ts` | `FilesRenderer` | Responsável por renderizar a aparência de cada item (ícones, labels, cores). |
| Gestão de Dados | `src/vs/workbench/contrib/files/common/explorerModel.ts` | `ExplorerModel` | Gerencia as raízes do workspace e a busca de itens. |
| Estrutura de Item | `src/vs/workbench/contrib/files/common/explorerModel.ts` | `ExplorerItem` | Representação de um arquivo/pasta com suporte a recursão e cache. |
| Ações de Arquivo | `src/vs/workbench/contrib/files/browser/fileActions.ts` | `FileActions` | Implementação de comandos como Rename, Delete e Move. |
| Comandos de UI | `src/vs/workbench/contrib/files/browser/fileCommands.ts` | `FileCommands` | Mapeamento de comandos do VS Code para ações no Explorer. |
| Filtro de Busca | `src/vs/workbench/contrib/files/browser/explorerViewer.ts` | `FilesFilter` | Lógica de filtragem de itens baseada em texto. |

## 2. Camada de Abstração de Arquivos (Platform)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Interface de Arquivos | `src/vs/platform/files/common/files.ts` | `IFileService` | API unificada para ler, escrever e listar arquivos no sistema. |
| Estatísticas de Arquivo | `src/vs/platform/files/common/files.ts` | `IFileStat` | Interface que define as propriedades de um arquivo (isDir, mtime, etc). |
| Gestão de Workspace | `src/vs/platform/workspace/common/workspace.ts` | `IWorkspace` | Provê as pastas raízes abertas no projeto. |
| Identidade de URI | `src/vs/platform/uriIdentity/common/uriIdentity.ts` | `IUriIdentityService` | Garante a comparação correta de caminhos entre OS diferentes. |

## 3. Infraestrutura de Árvore (Base/UI)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Componente de Árvore | `src/vs/base/browser/ui/tree/abstractTree.ts` | `AbstractTree` | Implementação genérica de árvore assíncrona com virtualização de DOM. |
| Data Source | `src/vs/workbench/contrib/files/browser/explorerViewer.ts` | `ExplorerDataSource` | Adapta o `ExplorerModel` para o formato esperado pelo `AbstractTree`. |
