# Inventário de especificações — Janela de Agentes

Fonte consultada: `/home/user/projeto_restaurado/sessions/` e `/home/user/projeto_restaurado/vscode-main/`. As pastas de referência permanecem intocadas.

## Shell e titlebar

- `sessions/browser/parts/titlebarPart.ts:39-45,143-152,207-260`: titlebar simplificado em três regiões; não cria menubar, ações do editor ou controles de layout. Composição central: navegação, Command Center e ações.
- `sessions/browser/parts/media/titlebarpart.css`: titlebar contínua, centro em grid com três tracks simétricos e `box-shadow: none` no workbench de agentes.
- `sessions/contrib/sessions/browser/media/sessionsTitleBarWidget.css`: Command Center de `height: 22px`, `width: 31vw`, `max-width: 600px`, borda variável, fundo transparente; pill com opacidade `0.6`; badge do toggle com `14px`, fonte `9px`; estado aprovado com `charts-green` em `color-mix`.

## Sessões

- `sessions/contrib/sessions/browser/media/sessionsList.css:6-15`: linhas insetadas com margem lateral `10px`, `width: calc(100% - 20px)` e radius médio.
- `sessions/contrib/sessions/browser/media/sessionsList.css:144-150`: item em linha com padding `8px 6px 8px 12px`.
- `sessionsList.css:202-247`: ícone de `16px`, título `13px`, linha de título de `17px` com `4px` inferiores.
- `sessionsList.css:250-299`: detalhes em `11px`, line-height `15px`, gap `4px`, números tabulares; adições e remoções usam tokens de diff.
- `sessionsList.css:329-334`: título em strong foreground para não lidas e aguardando input.
- `sessionsList.css:388-438`: aprovação embutida com borda, radius grande, label truncada e botão compacto.
- `sessionsList.css:440-557`: guias de árvore dos chats aninhados, row base de `28px`, indentação com guias vertical/horizontal e terminal com canto arredondado.
- `sessionsList.css:559-585`: “Mostrar mais” possui linhas decorativas em ambos os lados.
- `sessionsList.css:629-749`: cabeçalhos de seção em `11px`, sem preenchimento de seleção; contagem com opacidade `0.7`.
- `sessionsList.css:795-815`: ícone pulsante em `2s`; fundo de aguardando input em `3s` com `color-mix` de warning a `12%`.
- `sessionsList.css:823-868`: shimmer do título em execução, gradient recortado no texto e animação de `6s steps(90, jump-none)`; desativado para reduced motion.
- `sessions/contrib/sessions/browser/views/sessionsList.ts:delegate`: alturas de referência: sessão `54px`, quick chat `28px`, chat aninhado `28px`, seção/show-more `26px`, phone `76px`.
- `sessions/contrib/sessions/browser/media/sessionsViewPane.css`: pane em coluna contínua; header de sessões com padding superior `10px`; conteúdo da lista ocupa o restante.

## Chat

- `vscode-main/src/vs/workbench/contrib/chat/browser/widget/media/chat.css:50-74`: sessão interativa ocupa o espaço e conteúdo começa normalmente no topo; item é texto selecionável.
- `chat.css:180-235`: avatar circular, borda de request e toolbar escondida até hover/focus.
- `chat.css:304-350`: toolbar de resposta aparece com transição e controles de detalhes.
- `chat.css:585-645`: markdown sem bolha, blockquote/tabelas/links usam tokens `chat-requestBorder`, `textBlockQuote` e `textLink`.
- `chat.css:1110-1161`: input usa background/borda de input, radius grande, padding interno e estado `working`.
- `chat.css:1182-1263`: borda de execução é um anel `conic-gradient` com `@property --chat-input-anim-angle`, beam nítido + glow e máscara XOR.
- `chat.css:1294-1319`: anel só aparece com `.working` e para em `prefers-reduced-motion`.
- `chat.css:1321-1372`: toolbar secundária e botão de envio circular de `22px`.
- `chat.css:2324-2451`: attachments são chips compactos de `18px`, radius pequeno, truncamento e close.
- `vscode-main/src/vs/workbench/contrib/chat/browser/widget/media/chatViewWelcome.css`: welcome centralizado, título de `13px`, mensagem de `12px` e sugestões em linhas compactas, com cards de `20px` de altura.
- `widget/input/media/chatInputStack.css`: membros docked se unem sem gap; membro que continua o stack zera os cantos superiores.
- `browser/parts/chatGroupsView.ts`: uma sessão mantém grupos de chat, chat ativo por grupo e abas persistíveis.

## Editor, navegador e busca

- `sessions/LAYOUT.md`: topologia estável: Sidebar, Main region com Sessions/Editor/Auxiliary Bar/Custom Grid e Panel; Editor é dono de file, browser e diff.
- `sessions/contrib/browserView/browser/sessionBrowserView.ts:56-108`: browser contextual é filtrado pela sessão ativa, abre apenas quando a sessão proprietária está ativa e é destruído ao remover a sessão.
- A réplica mantém `BrowserView` com `sessionId`, abas múltiplas, histórico real (`history` + `historyIndex`), back/forward, reload, status por `iframe` load/error, viewport desktop/tablet/mobile e abertura externa.
- A busca é modelada como `EditorTab` do tipo `search`, nunca como view da barra auxiliar.

## Alterações e checks

- `sessions/contrib/changes/browser/media/changesView.css`: lista e ações compactas; stats com tokens de linhas adicionadas/removidas.
- `sessions/contrib/changes/browser/media/multiFileDiffEditor.css`: headers de arquivo sem borda inferior, radius médio, status A/M/D em `16px`, checkbox “Viewed” de `20px`, ações alinhadas no header.
- `sessions/contrib/changes/browser/media/checksWidget.css`: checks com header colapsável, chevron visível em hover/focus e rows com ações reveladas em hover.
- `sessions/contrib/changes/browser/changesView.ts:1470-1680`: clicar em arquivo abre multi-diff/editor; ações são por arquivo e em lote, e a barra prevê Commit/Create PR.

## Layout responsivo e terminal

- `sessions/LAYOUT.md` e `sessions/MOBILE.md`: apresentação single-pane remove colunas permanentes e coloca conteúdo em navegação/abas docked; o estado ativo continua pertencendo ao serviço de sessões.
- `sessions/contrib/layout/browser/singlePane/`: estratégias separadas para sessão nova, existente e quick chat; browser fica no editor, enquanto Changes/Files podem ocupar detalhes.
- `sessions/contrib/terminal/browser/sessionsTerminalContribution.ts`: terminal é associado ao workspace/sessão, criado ou reutilizado e limpo no ciclo de vida da sessão.

## Tokens Dark+

`src/styles/theme.css` centraliza os tokens usados pelos componentes. Hexadecimais aparecem somente nesse arquivo de tema; componentes usam exclusivamente `var(--vscode-...)`. Valores principais seguem a referência e Dark+: shell/editor `#1f1f1f`, sidebar/painel `#181818`, borda `#2b2b2b`, foco/botão `#0078d4`, seleção `#04395e`, warning `#cca700`, adição `#2ea043`, remoção `#f85149`, descrição `#969696`.

