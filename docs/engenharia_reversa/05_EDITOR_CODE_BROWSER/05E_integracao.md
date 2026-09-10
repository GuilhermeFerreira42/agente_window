# 05E - Integração do Editor

## 1. Integração com o Sistema de Arquivos (`filesystem`)
A comunicação entre o editor e o módulo de arquivos é feita via um **File Handle Broker**.

- **Abertura de Arquivos**: O `filesystem` fornece um `FileDescriptor`. O editor usa esse descritor para criar o `OriginalBuffer` da Piece Table.
- **Escrita**: O editor não escreve diretamente no disco. Ele envia um `WriteRequest` para o `FSManager`, que gerencia a fila de escrita e garante que o arquivo seja salvo atomicamente (escrita em arquivo temporário $\rightarrow$ rename).
- **Observabilidade**: O editor se inscreve em notificações do `filesystem` para saber quando um arquivo foi deletado ou renomeado, fechando o buffer correspondente.

## 2. Integração com o Sistema de Comandos (`commands`)
O editor expõe suas funcionalidades como comandos registráveis no sistema global.

- **Registro de Comandos**: No `init()`, o editor registra comandos como `editor.save`, `editor.find`, `editor.format`.
- **Execução**: Quando o usuário digita um comando no `center_chat` ou usa um atalho, o `CommandDispatcher` invoca a função vinculada no `EditorCore`.
- **Contexto de Comando**: Comandos de editor recebem um objeto `EditorContext` contendo referências ao buffer ativo e à seleção atual.

## 3. Integração com o Sistema de Temas (`theme`)
O visual do editor é dinâmico e depende de variáveis CSS injetadas pelo módulo de temas.

- **Mapeamento de Tokens**: O `SyntaxHighlighter` atribui tokens (ex: `keyword`, `string`, `comment`). Cada token está vinculado a uma variável CSS (ex: `--theme-syntax-keyword`).
- **Atualização em Tempo Real**: Quando o usuário altera o tema, o módulo `theme` atualiza as variáveis no `:root` do documento, e o editor reflete as cores instantaneamente sem necessidade de re-renderizar o texto.

## 4. Integração com o Chat e IA (`center_chat`)
Esta é a integração mais crítica para a experiência de "AI-Pair Programming".

- **Injeção de Contexto**: O editor implementa a interface `IContextProvider`. Sempre que o chat envia uma query, o editor anexa o fragmento de código onde o cursor está posicionado.
- **Apply Edits**: O chat envia sugestões de alteração no formato de **Diffs**. O editor processa esses diffs aplicando mutações na Piece Table.
- **Sincronização de Range**: Quando a IA refere-se a uma linha, o editor utiliza o `Viewport.scrollToLine()` para levar o usuário até o ponto mencionado, destacando-o temporariamente com uma decoração de "blink".
