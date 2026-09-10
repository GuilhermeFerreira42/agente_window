# 05C - Mapa de Código do Editor

## 1. Hierarquia de Módulos
O código do editor está organizado de forma a separar a representação do dado da sua visualização.

### 1.1. Estrutura de Diretórios (Lógica)
- `src/editor/core/`: Contém a lógica de manipulação de texto e buffers.
- `src/editor/view/`: Gerencia a renderização, scroll e interação com o DOM.
- `src/editor/syntax/`: Implementa os lexers e a integração com gramáticas.
- `src/editor/api/`: Define as interfaces públicas para outros módulos (Chat, FS).

## 2. Principais Classes e Responsabilidades

| Classe | Responsabilidade | Dependências |
| :--- | :--- | :--- |
| `TextModel` | Coordena a lógica de alto nível do modelo de texto, incluindo a validação de posições UTF-16 (surrogate pairs) e gestão de versões. | `ITextBuffer`, `EditStack` |
| `NativeEditContext` | Intercepta eventos brutos do DOM e gerencia o contexto de edição. | `AbstractEditContext` |
| `ViewController` | Mapeia entradas de usuário da view (mouse/teclado) para comandos do modelo. | `ViewUserInputEvents`, `ICommandDelegate` |
| `EditStack` | Gerencia a pilha de Undo/Redo do modelo, coordenando snapshots de estado e mudanças de texto. | `SingleModelEditStackElement`, `IUndoRedoService` |
| `CoreEditorCommand` | Define a interface e execução de comandos core do editor. | `IViewModel` |
| `CoreEditorCommand` | Define a interface e execução de comandos core do editor. | `IViewModel` |
| `TextBuffer` | Gerencia a Piece Table e operações de CRUD de texto. | `PieceTable`, `BTreeIndex` |
| `Viewport` | Calcula quais linhas devem ser exibidas e gerencia o DOM. | `ScrollContainer`, `DOMManager`, `WorkbenchThemeService` |
| `SyntaxHighlighter` | Tokeniza o texto e atribui classes de estilo. | `GrammarEngine`, `Lexer`, `WorkbenchThemeService` |
| `CaretManager` | Rastreia a posição do cursor e a seleção. | `TextBuffer` |
| `DecorationLayer` | Renderiza overlays de erro e avisos. | `Viewport`, `SVGRenderer` |
| `WorkbenchThemeService` | Gerencia a paleta de cores e a reatividade do tema. | `ThemeService` |

## 3. Grafo de Dependências Críticas
O fluxo de dependência é estritamente descendente para evitar ciclos:
`EditorInstance` $\rightarrow$ `Viewport` $\rightarrow$ `TextBuffer` $\rightarrow$ `PieceTable`

- **Acesso ao Buffer**: O `Viewport` nunca altera o `TextBuffer` diretamente; ele envia requisições via `CommandDispatcher`.
- **Notificações**: O `TextBuffer` utiliza um padrão de **Observer** para notificar o `Viewport` e o `SyntaxHighlighter` sobre mudanças no conteúdo (`onBufferChange`).

## 4. Pontos de Extensão (Hooks)
Foram identificados pontos de interceptação onde plugins podem injetar comportamento:
- `preMutationHook`: Executado antes de qualquer alteração no buffer.
- `postRenderHook`: Permite a adição de elementos visuais após a renderização da linha.
- `syntaxOverride`: Permite que plugins definam regras de cores para tokens específicos.

## 5. Resolução de Órfãos (Traceability Gaps)

| Comportamento | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| **Pipeline de Eventos** | `vscode-main\src\vs\editor\browser\widget\codeEditorWidget.ts` | Orquestra a captura de eventos de teclado e mouse, enviando-os para o `ViewController`. |
| **Sincronização de Undo/Redo** | `vscode-main\src\vs\editor\common\model\editStack.ts` | Gerencia a pilha de edições e coordena o Undo/Redo via `IUndoRedoService`. |
| **Movimentação de Cursor UTF-8** | `vscode-main\src\vs\editor\common\model\textModel.ts:1017-1061` | Implementa a validação de surrogate pairs via `StringOffsetValidationType.SurrogatePairs` em `_isValidPosition` e `_validatePosition`. |
| **Auto-Indentação** | `vscode-main\src\vs\editor\common\languages\autoIndent.ts:304-354` | Implementada em `getIndentForEnter`, utilizando `IndentationContextProcessor` para analisar o contexto de tokens e aplicar as regras de `IndentAction`. |
| **Highlighting Debounced** | `vscode-main\src\vs\editor\common\model\tokens\abstractSyntaxTokenBackend.ts:109` | Implementa o debounce de 50ms via `RunOnceScheduler` no `AttachedViewHandler` para otimizar o refresh de tokens durante scroll/redimensionamento. |
| **L2 Decoration (AST Worker)** | `vscode-main\src\vs\editor\contrib\semanticTokens\browser\documentSemanticTokens.ts` | Orquestra a requisição assíncrona de tokens semânticos via `ModelSemanticColoring`, aplicando-os ao modelo assim que o provider (AST Worker) retorna. |
| **Buffer Flushing** | `vscode-main\src\vs\workbench\services\workingCopy\common\workingCopyBackupTracker.ts:169-223` | Implementa o agendamento de backups de cópias de trabalho (Working Copies) via `scheduleBackup`, garantindo a persistência em memória e a sincronização programada com o disco. |
| **Atomic Writes** | `vscode-main\src\vs\platform\files\common\fileService.ts:386-420` | Coordena a escrita atômica de arquivos verificando a capability `FileAtomicWrite` do provider e gerenciando a fila de escrita via `ResourceQueue`. |

