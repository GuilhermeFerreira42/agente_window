# 08 — MÓDULO: EDITOR / CODE BROWSER

## 1. Visão Geral
O Editor é o componente central do AGENTE WINDOW, projetado para manipular arquivos de código de qualquer tamanho com latência imperceptível. Para atingir a fidelidade do VS Code, o editor abandona a manipulação de strings simples em favor de estruturas de dados avançadas, garantindo que a UI permaneça responsiva mesmo em arquivos com centenas de milhares de linhas.

## 2. Componentes Estruturais
A arquitetura do editor é dividida em três camadas independentes para separar a representação do dado da sua visualização.

### 2.1. Core Logic (Buffer Management)
- **Piece Table**: A estrutura fundamental para gestão de texto. Em vez de armazenar o texto como uma string única, utiliza um buffer original (imutável) e um buffer de adições (mutável). A `PieceTable` é uma lista de ponteiros que reconstrói o documento logicamente, permitindo inserções e deleções em $O(1)$.
- **B-Tree Index**: Indexação de offsets de caracteres para números de linha. Isso permite que o editor salte para qualquer linha de um arquivo gigante em tempo $O(\log N)$, eliminando a necessidade de scans lineares.

### 2.2. View Layer (Rendering Pipeline)
- **Viewport Virtualization**: Para evitar a sobrecarga do DOM, o editor renderiza apenas as linhas visíveis no viewport atual (mais uma pequena margem de segurança).
- **Absolute Positioning**: Cada linha é renderizada como um elemento `div` com posição absoluta e altura fixa, facilitando o cálculo de scroll e a renderização de decorações.

### 2.3. Decoration Engine (Highlighting & Markers)
O sistema de decorações opera em três níveis de prioridade:
- **Sintática (L1)**: Cores aplicadas via lexer/regex básico.
- **Semântica (L2)**: Marcadores injetados por análise de AST (Abstract Syntax Tree), processados assincronamente via Web Worker.
- **UI (L3)**: Renderização do cursor, seleção de texto e gutters (números de linha), utilizando uma camada de overlay SVG para evitar reflows no texto.

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Fluxo de Entrada e Mutação
- **Pipeline de Edição**: **Dado** um `KeyboardEvent` $\rightarrow$ **Quando** a tecla é pressionada $\rightarrow$ **Então** o `InputInterceptor` captura a tecla $\rightarrow$ o `CommandMapper` resolve o comando $\rightarrow$ a `PieceTable` é mutada $\rightarrow$ a `View Layer` é notificada para atualizar apenas as linhas "sujas" (dirty).
- **Auto-Indentação**: **Dado** a pressão da tecla `Enter` $\rightarrow$ **Quando** o evento ocorre $\rightarrow$ **Então** o editor analisa o contexto de tokens da linha anterior e injeta automaticamente a indentação correta no buffer.

### 3.2. Gestão de Cursor e Seleção
- **Movimentação UTF-8**: **Dado** o movimento do cursor $\rightarrow$ **Quando** o caractere é multi-byte $\rightarrow$ **Então** o editor utiliza `getCharacterBoundary()` para garantir que o cursor não fragmente caracteres especiais.
- **Seleção de Texto**: **Dado** um clique e arraste $\rightarrow$ **Quando** o range é definido $\rightarrow$ **Então** o sistema calcula o `anchor` e o `head` e renderiza um overlay absoluto cobrindo as linhas afetadas.

### 3.3. Sincronização e Performance
- **Protocolo de Bloqueio (Locking)**: **Dado** uma mutação complexa via agente de IA $\rightarrow$ **Quando** a operação inicia $\rightarrow$ **Então** o editor define `isLocked = true` no `EditorLockService`, notificando outros subsistemas (como o Chat) para desabilitarem a entrada de texto.
- **Debounced Highlighting**: **Dado** a digitação rápida $\rightarrow$ **Quando** a mutação ocorre $\rightarrow$ **Então** o realce sintático é adiado por 50ms para evitar travas na UI thread.

## 4. Mapa de Implementação Técnica

| Componente | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Modelo de Texto** | `src/editor/core/textModel.ts` | Coordenação de alto nível e validação UTF-16. |
| **Buffer de Texto** | `src/editor/core/textBuffer.ts` | Implementação da Piece Table e do B-Tree Index. |
| **Viewport** | `src/editor/view/viewport.ts` | Cálculo de visibilidade e gestão do DOM virtual. |
| **Highlighter** | `src/editor/syntax/syntaxHighlighter.ts` | Tokenização e aplicação de cores via tokens de tema. |
| **Pilha de Edição** | `src/editor/core/editStack.ts` | Gestão de Undo/Redo via snapshots de estado. |
| **Gestor de Cursor** | `src/editor/view/caretManager.ts` | Rastreio de posição e renderização do caret. |

## 5. Integrações Cross-Subsystem
- **Integração com Center Chat (07)**: Sincronização via `EditorLockService` para garantir a integridade do buffer durante a aplicação de sugestões de IA.
- **Integração com Filesystem I/O (09)**: Utiliza o `IFileSystemProvider` para realizar leituras iniciais e escritas atômicas (`AtomicWrites`) no disco.
- **Integração com Tema (11)**: Implementa o padrão `Themable` para atualizar dinamicamente as cores de sintaxe e fundo sem re-tokenizar o arquivo.

## 6. Critérios de Aceite
- [ ] **Performance de Escala**: Inserção de texto em arquivos de 10MB deve ocorrer em $< 10\text{ms}$ sem travar a interface.
- [ ] **Fluidez de Scroll**: Manutenção de 60 FPS durante o scroll rápido em arquivos com 100k+ linhas (via Virtualização de View).
- [ ] **Integridade Atômica**: O arquivo original no disco deve permanecer intacto se o processo de salvamento for interrompido abruptamente.
- [ ] **Complexidade Algorítmica**: Operações de inserção e deleção devem operar em $O(\log N)$ no pior caso.
- [ ] **Consistência de Cursor**: O cursor deve respeitar rigorosamente os limites de caracteres UTF-8.
