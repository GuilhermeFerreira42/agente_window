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
| `TextBuffer` | Gerencia a Piece Table e operações de CRUD de texto. | `PieceTable`, `BTreeIndex` |
| `Viewport` | Calcula quais linhas devem ser exibidas e gerencia o DOM. | `ScrollContainer`, `DOMManager` |
| `SyntaxHighlighter` | Tokeniza o texto e atribui classes de estilo. | `GrammarEngine`, `Lexer` |
| `CaretManager` | Rastreia a posição do cursor e a seleção. | `TextBuffer` |
| `DecorationLayer` | Renderiza overlays de erro e avisos. | `Viewport`, `SVGRenderer` |

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
