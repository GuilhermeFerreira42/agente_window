# 05A - Inventário do Editor

## 1. Componentes Estruturais
O editor foi analisado como um sistema modular composto por três camadas principais: **Core Logic**, **View Layer** e **Decoration Engine**.

### 1.1. Core Logic (Buffer Management)
- **Implementação do Buffer**: Foi identificada a utilização de uma **Piece Table**. Diferente de um gap buffer, a Piece Table permite inserções e deleções em $O(1)$ mantendo o documento original em um buffer somente leitura e as adições em um buffer de append.
- **Estrutura de Dados**:
  - `OriginalBuffer`: Buffer imutável contendo o conteúdo inicial do arquivo.
  - `AddBuffer`: Buffer mutável para todo novo texto inserido.
  - `PieceTable`: Lista de ponteiros `(buffer_type, start_offset, length)` que reconstrói o documento logicamente.
- **Indexação de Linhas**: Utiliza-se um **B-Tree** para mapear offsets de caracteres para números de linha, permitindo saltos rápidos para coordenadas $(x, y)$ no editor.

### 1.2. View Layer (Rendering Pipeline)
- **Virtualização de Linhas**: O editor não renderiza o DOM completo do arquivo. Implementa-se um **Viewport Virtualization** que renderiza apenas as linhas visíveis no `scrollTop` atual, mais uma margem de 5 linhas para evitar flickers durante o scroll.
- **Rendering Mode**: Utiliza-se a técnica de **Absolute Positioning** para cada linha, onde cada linha é um elemento `div` com `height` fixo, facilitando o cálculo de offsets.
- **Sincronização de Scroll**: O `ScrollContainer` dispara eventos de `requestAnimationFrame` para atualizar a posição das linhas renderizadas.

### 1.3. Decoration Engine (Highlighting & Markers)
- **Tiers de Decoração**:
  - **L1 (Sintática)**: Aplicação de cores baseada em regex/lexer.
  - **L2 (Semântica)**: Markers inseridos por análise de AST (ex: referências a variáveis).
  - **L3 (UI)**: Cursor, seleção de texto e gutters (números de linha).
- **Mecanismo de Overlay**: As decorações são renderizadas em uma camada de SVG sobreposta ao texto para evitar reflows constantes no DOM do texto.

## 2. APIs Internas Identificadas
- `Editor.insertText(position, text)`: Modifica a Piece Table e dispara a atualização da View.
- `Editor.getLineAt(lineNumber)`: Consulta o B-Tree para encontrar o offset no buffer.
- `Editor.setSelection(start, end)`: Atualiza o modelo de range de seleção.
- `Editor.applyDecoration(decorationId, range, style)`: Insere um marker na camada de overlays.
