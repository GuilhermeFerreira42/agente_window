# 05B - Comportamento do Editor

## 1. Ciclo de Vida do Input
O processamento de entrada segue um pipeline determinístico para garantir que a mutação do buffer ocorra antes de qualquer atualização visual.

### 1.1. Pipeline de Eventos
`KeyboardEvent` $\rightarrow$ `InputInterceptor` $\rightarrow$ `CommandMapper` $\rightarrow$ `BufferMutation` $\rightarrow$ `ViewUpdate`

1. **InputInterceptor**: Captura teclas especiais (Ctrl, Alt, Cmd) e previne o comportamento padrão do browser.
2. **CommandMapper**: Mapeia a combinação de teclas para um comando interno (ex: `Ctrl+S` $\rightarrow$ `cmd.save_file`).
3. **BufferMutation**: Se o comando for de edição, a Piece Table é atualizada. O estado anterior é salvo no **Undo Stack** como um `ChangeSet`.
4. **ViewUpdate**: A View Layer é notificada da alteração. Apenas a região afetada (e as linhas subsequentes se houver quebra de linha) é marcada como "dirty" e re-renderizada no próximo ciclo de animação.

## 2. Lógica de Cursor e Seleção
O cursor não é um elemento do DOM, mas um estado lógico rastreado por coordenadas de offset.

- **Caret Movement**: O movimento do cursor é calculado com base em caracteres UTF-8. Para caracteres multi-byte, o editor utiliza a função `getCharacterBoundary()` para evitar que o cursor fique "preso" no meio de um caractere.
- **Seleção de Texto**: Implementada como um `Range` com `anchor` (ponto inicial) e `head` (ponto final). A seleção é renderizada via um elemento `div` absoluto que calcula sua posição via `getBoundingClientRect()` das linhas afetadas.
- **Auto-Indentação**: Ao pressionar `Enter`, o editor analisa a linha anterior para detectar blocos de código (ex: `{` ou `:`) e injeta automaticamente a indentação correta no buffer.

## 3. Mecanismos de Sincronização e Performance
Para manter a fluidez em arquivos grandes (> 10k linhas), foram identificados os seguintes comportamentos:

### 3.1 Protocolo de Bloqueio (Locking Protocol)
Para garantir a integridade do buffer durante mutações complexas (ex: refatoração via agente), o editor implementa um mecanismo de sinalização:
- **Sinalização**: Ao iniciar uma mutação de agente, o Editor define a flag `isLocked = true` no `EditorLockService`.
- **Notificação**: O serviço dispara um evento de `onLockStateChanged`, que é consumido por outros subsistemas (como o Center Chat `04`) para ajustar sua interface.
- **Liberação**: Após a conclusão da mutação e a atualização da View, a flag é revertida para `false`.

### 3.2 Otimizações de Renderização
- **Debounced Highlighting**: O realce sintático não é processado a cada tecla, mas sim via um timer de 50ms após a última mutação, evitando travas na UI thread.
- **Lazy Loading de AST**: A análise semântica profunda (L2 Decoration) é executada em um **Web Worker** separado. O editor renderiza a sintaxe básica (L1) imediatamente e aplica a semântica assim que o Worker retorna a árvore de símbolos.
- **Buffer Flushing**: Alterações no buffer são persistidas em memória e sincronizadas com o disco via um mecanismo de `auto-save` programável, utilizando `AtomicWrites` para evitar a corrupção do arquivo original.

## Integração de Tema
O Editor é o principal consumidor do sistema de temas para a renderização de código:
- **Padrão Themable**: A `Viewport` e o `SyntaxHighlighter` implementam o padrão `Themable` para atualizar dinamicamente as cores de tokens de linguagem.
- **Sincronização com `WorkbenchThemeService`**: O editor escuta mudanças de tema para atualizar a paleta de cores do `SyntaxHighlighter` sem a necessidade de re-tokenizar todo o buffer.
- **Tokens de Escopo**: Utiliza tokens específicos de tema para diferenciar cores de fundo de linhas (ex: `editor.lineHighlightBackground`) e cores de sintaxe.
