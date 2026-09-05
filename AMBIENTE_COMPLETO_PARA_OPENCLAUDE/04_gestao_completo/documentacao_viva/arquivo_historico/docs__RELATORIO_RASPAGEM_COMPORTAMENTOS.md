# Raspagem de comportamento — Referência x Réplica

> Esta etapa somente coleta e organiza dados. Nenhum código da referência ou da réplica foi alterado.

## Escopo e método

- **Referência:** fontes TypeScript e CSS de `projeto_restaurado/sessions` e `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser`, excluindo testes. Foram capturados menus, ações, comandos, Buttons, ActionBars, listeners, estados/observables e regras CSS de todos os arquivos do escopo.
- **Réplica:** `agents-window-replica/src`, capturando botões JSX, campos, elementos `role=button`, handlers, callbacks, estados React, efeitos e CSS.
- **Natureza:** raspagem estática de contratos de UI e handlers. Como as fontes de referência restauradas não formam um pacote executável isolado, este relatório ainda não simula cliques no VS Code original.
- **Arquivo completo:** `raspagem/controles_e_eventos.csv` contém um registro por ocorrência capturada; `raspagem/resumo.json` contém as contagens.

## Contagens

| Métrica | Valor |
|---|---:|
| Registros capturados na referência | 8430 |
| Registros capturados na réplica | 784 |
| Arquivos de referência com ocorrências | 649 |
| Arquivos da réplica com ocorrências | 10 |

### Referência

| Tipo capturado | Quantidade |
|---|---:|
| `action` | 522 |
| `action-bar` | 25 |
| `button` | 125 |
| `change-listener` | 174 |
| `click-listener` | 149 |
| `command` | 48 |
| `context-key` | 1 |
| `css-animation` | 88 |
| `css-media-query` | 28 |
| `css-selector` | 5582 |
| `css-variable` | 115 |
| `dom-listener` | 561 |
| `menu-item` | 98 |
| `state-emitter` | 391 |
| `state-observable` | 523 |
| **Total** | **8430** |

### Réplica

| Tipo capturado | Quantidade |
|---|---:|
| `app-callback` | 39 |
| `css-animation` | 6 |
| `css-media-query` | 4 |
| `css-selector` | 414 |
| `css-variable` | 153 |
| `jsx-button` | 88 |
| `jsx-field` | 8 |
| `jsx-onChange` | 8 |
| `jsx-onKeyDown` | 13 |
| `jsx-onSubmit` | 2 |
| `jsx-role-button` | 5 |
| `react-effect` | 13 |
| `react-state` | 31 |
| **Total** | **784** |

## Matriz comparativa por superfície

Esta é a comparação direta dos fluxos que aparecem nas duas implementações. Cada lado preserva fonte, linha, controle/label, wiring e efeito identificado. A classificação não é uma correção: apenas separa o que está conectado, delegado, visual ou dependente de comando/handler.

| Superfície/fluxo | Referência — fonte | Ref. linha | Referência — controle/label | Ref. wiring/efeito | Réplica — fonte | Réplica linha | Réplica — controle/label | Réplica wiring/efeito | Classificação |
|---|---|---|---|---|---|---|---|---|---|
| Command Center / barra de título | `sessions/browser/parts/titlebarPart.ts; sessions/contrib/sessions/browser/sessionsTitleBarWidget.ts` | 36–46; 319–331; 673–702 | CommandCenter; SessionsTitleBarWidget; active session / sessions requiring input | menu-item → ActionViewItem → handler; Renderiza o pill da sessão ativa, estado bloqueado e toolbar contextual; reconstroi o widget quando o contexto muda. | `agents-window-replica/src/components/Titlebar.tsx; agents-window-replica/src/App.tsx` | 46–92; 163–185 | Command Center; Nova sessão; Command Center; Nova sessão | delegated → onNewSession; connected in App; Abre/cria sessão mockada e atualiza activeSession; demais botões delegam para Browser, Search, Diff, terminal, sidebar e auxiliary bar. | delegated |
| Lista de sessões e chats aninhados | `sessions/contrib/sessions/browser/views/sessionsList.ts` | 400–482; 1354–1647; 2639–2840 | SessionItemRenderer; SessionChatItemRenderer; tree; session title / chat title | tree renderer + selection/change events; Renderiza sessões e chats filhos, status, guias hierárquicas, hover, seleção, collapse e atualização reativa do modelo. | `agents-window-replica/src/components/SessionSidebar.tsx; agents-window-replica/src/App.tsx` | 56–85; 90–224; 230–324; 79–85 | SessionRow; NestedChatRow; Expandir chats; chat title; sessão ativa | connected local handlers → delegated parent callbacks; Seleciona sessão ou chat, expande/recolhe filhos, limpa unread ao selecionar e muda o chat ativo por sessão. | connected |
| Ações da sessão: fixar, arquivar, renomear e excluir | `sessions/contrib/sessions/browser/sessionsActions.ts` | 543–625; 1476–1628 | RenameSessionListChatAction; DeleteSessionListChatAction; TogglePinSessionAction; CloseSessionAction; Rename / Delete / Pin / Archive | Action2 → command/context-key handler; Ações ficam disponíveis conforme context keys e alteram a sessão/editor; rename e delete têm ações próprias para sessão/chat. | `agents-window-replica/src/components/SessionSidebar.tsx; agents-window-replica/src/App.tsx` | 123–184; 187–209; 320–324 | session-action-button; onRename; onToggleArchived; onDelete; Fixar; Arquivar/Restaurar; Renomear; Excluir | delegated → App callbacks; Atualiza a lista; arquivar/excluir remove browser views e tabs pertencentes à sessão; renomear grava o novo título. | connected/delegated |
| Needs input / aprovação de ferramenta | `sessions/contrib/sessions/browser/views/sessionsList.ts; sessions/contrib/sessions/browser/blockedSessionsIndicatorModel.ts; sessions/contrib/sessions/browser/media/sessionsList.css` | 484–522; 561–608; 68–170; 18–25; 795–818 | approval row; AgentSessionApprovalModel; needs-input; Allow / terminal approval / requires input | observable model → approval event → command/service; Exibe aprovação por sessão e por chat, renderiza código/markdown limitado, hover completo, altura reativa e animação de atenção. | `agents-window-replica/src/components/SessionSidebar.tsx; agents-window-replica/src/components/ChatPanel.tsx; agents-window-replica/src/App.tsx` | 80–84; 196–209; 140–148; 211–221 | session-approval-card; chat approval card; handleApprove; Permitir | delegated → handleApprove; Remove approval, marca sessão/chat como working, mostra feedback temporário e conclui o fluxo mockado. | connected/delegated |
| Composer: texto, envio, anexos, modo, modelo e histórico | `vscode-main/src/vs/workbench/contrib/chat/browser/widget/input/chatInputPart.ts` | 1005–1060; 1325–1420; 2330–2368; 3471–3620; 4018–4152 | ChatInputPart; ChatHistoryNavigator; ModelPicker; ModePicker; Enter/send; model; mode; attachments | toolbar/menu actions + input model + command handlers; Mantém estado de input/attachments, histórico, seleção de modelo/modo e aceita a entrada para disparar o request. | `agents-window-replica/src/components/ChatInput.tsx; agents-window-replica/src/App.tsx` | 58–218; 224–247 | chat-input-textarea; send-button; mode/model popovers; Enviar mensagem; Parar execução; anexos; Agente; modelo | connected local state → delegated onSend/onStop/onChange; Envia mensagem mockada com anexos, alterna modo/modelo, aceita Ctrl/Cmd+Enter e troca o botão para parar durante working. | connected/delegated |
| Ações da mensagem | `vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCopyActions.ts; vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 157–283; 142–752 | CopyAllAction; CopyFinalResponseAction; code block actions; Copy / apply / run / compare | Action2 → command / menu; Copia respostas/blocos e expõe ações de aplicação, execução e comparação por menus/ações. | `agents-window-replica/src/components/ChatPanel.tsx` | 37–58 | MessageActions; Copiar; Regenerar; Útil; Não útil | Copiar conectado; demais sem callback direto; Copiar usa clipboard e feedback; Regenerar, Útil e Não útil são controles presentes sem efeito identificado na raspagem. | partial + visual-only |
| Browser no editor, navegação e escopo por sessão | `sessions/contrib/browserView/browser/sessionBrowserView.ts` | 38–108; 129–162 | SessionBrowserViewController; contextual filter; lifecycle; browser editor / active session | service registration → contextual filter/open handler → disposal; Filtra browsers pela sessão ativa, trata restauração, acompanha ownership e destrói input quando sessão é removida/arquivada. | `agents-window-replica/src/components/EditorArea.tsx; agents-window-replica/src/App.tsx` | 65–110; 262–286; 91–161; 187–207 | BrowserPreview; BrowserViewState; browser history callbacks; Voltar; Avançar; Recarregar; Endereço; Desk/768/375 | connected callbacks; state scoped by sessionId; Abre browser como aba do Editor, grava history/status/viewport e remove views/tabs ao fechar, arquivar ou excluir a sessão. | connected |
| Search como aba do editor | `sessions/contrib/sessions/browser/views/sessionsList.ts` | 2217–2240; 2784–2799 | tree find widget; onDidChangeFindPattern; filter/find sessions | input/tree event listener; A busca da lista usa find widget do tree e atualiza o padrão de busca por evento. | `agents-window-replica/src/components/EditorArea.tsx; agents-window-replica/src/App.tsx` | 142–158; 58–62; 117 | SearchView; filteredSearchResults; openSearch; Pesquisar no workspace | connected → openEditorTab + onChangeQuery; Abre Search no Editor, filtra resultados mockados por path/conteúdo/match e abre arquivo selecionado como aba. | connected; surface differs |
| Branch Changes / multi-diff | `sessions/contrib/changes/browser/changesView.ts; sessions/contrib/changes/browser/sessionChangesEditor.ts; sessions/contrib/changes/browser/media/multiFileDiffEditor.css` | 136–327; 686–798; 1697–1704; 1879–2034 | ChangesView; SessionChangesEditor; multi-diff actions; Changes; Files; checks; commit/PR | ViewPane + menu/action bar + diff editor; Compõe árvore de mudanças, checks, toolbar de ações, multi-diff e ciclo de vida do editor de alterações. | `agents-window-replica/src/components/AuxiliaryBar.tsx; agents-window-replica/src/components/EditorArea.tsx; agents-window-replica/src/App.tsx` | 40–114; 162–231; 118–123; 252–258 | AuxiliaryBar; DiffView; diffFiles callbacks; Changes; Files; Revisar; Aceitar tudo; Reverter tudo; Commit; Criar PR | connected/delegated; Revisar abre Editor + auxiliary changes; Lista Changes/Files e Checks na barra auxiliar; Branch Changes abre no Editor e aceita/reverte arquivos ou todos. | connected; surface split |
| Terminal por sessão | `sessions/contrib/terminal/browser/sessionsTerminalContribution.ts` | 190–263; 666–844 | SessionsTerminalContribution; DumpTerminalTrackingAction; terminal lifecycle / command actions | service/event handler → session ownership cleanup; Rastreia terminais por sessão, limpa ao remover/arquivar conforme regras de ownership e registra ações. | `agents-window-replica/src/components/TerminalPanel.tsx; agents-window-replica/src/App.tsx` | 17–76; 40; 279–303 | TerminalPanel; terminalVisible; Limpar; Maximizar; Fechar terminal | Limpar/Fechar conectados; Maximizar sem callback direto; Usa xterm mockado, limpa e fecha; o botão Maximizar foi capturado como visual-only. | partial + visual-only |
| Single-pane / responsividade | `sessions/contrib/layout/browser/singlePaneLayoutController.ts; sessions/contrib/layout/browser/singlePane/singlePaneLayoutStrategy.ts; sessions/contrib/layout/browser/mobileSessionLayoutController.ts` | 20–112; 24–52; 9–19 | SinglePaneLayoutController; SinglePaneLayoutStrategy; MobileLayoutController; docked tabs / detail panel / mobile layout | layout controller → strategies/coordinators; Mantém perfis de visibilidade, abas docked e painel de detalhes por estratégia de layout. | `agents-window-replica/src/App.tsx; agents-window-replica/src/components/EditorArea.tsx` | 51–69; 344–366; 262–286 | mobilePane; isSinglePane; dock-tab; Chat; Editor; Detalhes | connected local state + resize listener; Abaixo de 900px troca entre panes docked; Browser/Search/Diff continuam no Editor e Detalhes concentra a auxiliary bar. | connected; approximation |
| Animações e estados visuais | `sessions/contrib/sessions/browser/media/sessionsList.css; vscode-main/src/vs/workbench/contrib/chat/browser/widget/media/chat.css` | 18–25; 225–231; 795–818; CSS selectors/animations in CSV | needs-input pulse; chat transitions; reduced motion; pulse / hover / transition | css-rule; prefers-reduced-motion rule; Aplica pulse de needs-input, transições e adaptações de reduced motion por CSS. | `agents-window-replica/src/styles/theme.css; agents-window-replica/src/styles/app.css` | CSS variables; component selectors | CSS variables and component selectors; needs-input; hover; reduced motion | visual-only CSS rule; Centraliza cores e estados visuais; replica animações/estados principalmente por classes e regras CSS, sem callback de evento. | visual-only |

O arquivo `raspagem/comparativo_superficies.csv` contém a mesma matriz sem a limitação de largura do Markdown.

## Tabela completa de controles e eventos

Abaixo há uma amostra legível dos primeiros 80 registros de cada sistema. A tabela completa, sem truncamento, está em `raspagem/controles_e_eventos.csv`.

### Referência

| Sistema | Superfície | Tipo | Controle/ID | Label | Fonte | Linha | Comportamento capturado | Wiring |
|---|---|---|---|---|---:|---:|---|---|
| referência | chat | `state-emitter` | _onDidChangeContent | Emitter reativo | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/accessibility/chatResponseAccessibleView.ts` | 242 | Declara/deriva estado observado por eventos ou context keys | state/observable |
| referência | chat | `change-listener` | onDidChange | state change | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/accessibility/chatResponseAccessibleView.ts` | 269 | Evento/observable de mudança; atualiza ou reconcilia estado | event-listener |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatAccessibilityActions.ts` | 119 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatAccessibilityActions.ts` | 120 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `change-listener` | onDidChange | state change | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 425 | Evento/observable de mudança; atualiza ou reconcilia estado | event-listener |
| referência | chat | `action` | TOGGLE_CHAT_ACTION_ID | TOGGLE_CHAT_ACTION_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 602 | Action2 ToggleChatAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | TOGGLE_CHAT_ACTION_ID | TOGGLE_CHAT_ACTION_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 603 | Action2 ToggleChatAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | TOGGLE_CHAT_ACTION_ID | TOGGLE_CHAT_ACTION_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 606 | Action2 ToggleChatAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | TOGGLE_CHAT_ACTION_ID | TOGGLE_CHAT_ACTION_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 618 | Action2 ToggleChatAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | TOGGLE_CHAT_ACTION_ID | TOGGLE_CHAT_ACTION_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 622 | Action2 ToggleChatAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | ACTION_ID_OPEN_CHAT | ACTION_ID_OPEN_CHAT | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 668 | Action2 NewChatEditorAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | ACTION_ID_OPEN_CHAT + '.copilotIcon' | ACTION_ID_OPEN_CHAT + '.copilotIcon' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 706 | Action2 NewChatEditorCopilotIconAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | ACTION_ID_OPEN_CHAT + '.newSessionIcon' | ACTION_ID_OPEN_CHAT + '.newSessionIcon' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 731 | Action2 NewChatEditorNewSessionIconAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | ACTION_ID_OPEN_CHAT + '.commentIcon' | ACTION_ID_OPEN_CHAT + '.commentIcon' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 756 | Action2 NewChatEditorCommentIconAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.openChatToSide' | 'workbench.action.openChatToSide' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 781 | Action2 NewChatEditorToSideAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | `workbench.action.newChatWindow` | `workbench.action.newChatWindow` | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 799 | Action2 NewChatWindowAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.clearInputHistory' | 'workbench.action.chat.clearInputHistory' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 826 | Action2 ClearChatInputHistoryAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'chat.action.focus' | 'chat.action.focus' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 842 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.chat.action.focusLastFocused' | 'workbench.chat.action.focusLastFocused' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 880 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.focusInput' | 'workbench.action.chat.focusInput' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 918 | Action2 FocusChatInputAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | FocusTodosViewAction.ID | FocusTodosViewAction.ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 944 | Action2 FocusTodosViewAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | FocusQuestionCarouselAction.ID | FocusQuestionCarouselAction.ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 975 | Action2 FocusQuestionCarouselAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | PreviousQuestionCarouselQuestionAction.ID | PreviousQuestionCarouselQuestionAction.ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1003 | Action2 PreviousQuestionCarouselQuestionAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | NextQuestionCarouselQuestionAction.ID | NextQuestionCarouselQuestionAction.ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1027 | Action2 NextQuestionCarouselQuestionAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | FocusQuestionCarouselTerminalAction.ID | FocusQuestionCarouselTerminalAction.ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1051 | Action2 FocusQuestionCarouselTerminalAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | FocusNoticeAction.ID | FocusNoticeAction.ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1075 | Action2 FocusNoticeAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.showContextUsage' | 'workbench.action.chat.showContextUsage' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1109 | Action2 ShowContextUsageAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.compactAgentHostConversation' | 'workbench.action.chat.compactAgentHostConversation' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1127 | Action2 CompactAgentHostConversationAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.toggleShowContextUsage' | 'workbench.action.chat.toggleShowContextUsage' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1151 | Action2 ToggleShowContextUsageAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.manageSettings' | 'workbench.action.chat.manageSettings' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1175 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.showExtensionsUsingCopilot' | 'workbench.action.chat.showExtensionsUsingCopilot' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1208 | Action2 ShowExtensionsUsingCopilot; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.configureCodeCompletions' | 'workbench.action.chat.configureCodeCompletions' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1226 | Action2 ConfigureCopilotCompletions; execução definida no método run/handler | action-class |
| referência | chat | `action` | OPEN_CHAT_QUOTA_EXCEEDED_DIALOG | Upgrade GitHub Copilot Plan | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1251 | Action2 ShowQuotaExceededDialogAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.resetTrustedTools' | 'workbench.action.chat.resetTrustedTools' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1314 | Action2 ResetTrustedToolsAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID | GENERATE_AGENT_INSTRUCTIONS_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1330 | Action2 GenerateInstructionsAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID | GENERATE_ON_DEMAND_INSTRUCTIONS_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1352 | Action2 GenerateInstructionAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | GENERATE_PROMPT_COMMAND_ID | GENERATE_PROMPT_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1374 | Action2 GeneratePromptAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | GENERATE_SKILL_COMMAND_ID | GENERATE_SKILL_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1397 | Action2 GenerateSkillAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | GENERATE_AGENT_COMMAND_ID | GENERATE_AGENT_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1420 | Action2 GenerateAgentAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | GENERATE_HOOK_COMMAND_ID | GENERATE_HOOK_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1443 | Action2 GenerateHookAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | INSERT_FORK_CONVERSATION_COMMAND_ID | INSERT_FORK_CONVERSATION_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1466 | Action2 InsertForkConversationSlashCommandAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | INSERT_TROUBLESHOOT_COMMAND_ID | INSERT_TROUBLESHOOT_COMMAND_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1488 | Action2 InsertTroubleshootSlashCommandAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.openFeatureSettings' | 'workbench.action.chat.openFeatureSettings' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1509 | Action2 OpenChatFeatureSettingsAction; execução definida no método run/handler | action-class |
| referência | chat | `menu-item` | AICustomizationManagementCommands.OpenEditor | AICustomizationManagementCommands.OpenEditor | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1539 | Ação de menu delegada ao comando AICustomizationManagementCommands.OpenEditor; ícone Codicon.gear; grupo navigation | delegated-to-command |
| referência | chat | `menu-item` | 'workbench.action.chat.toggleDefaultVisibility' | Generate Code | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1816 | Ação de menu delegada ao comando 'workbench.action.chat.toggleDefaultVisibility'; grupo 1_chat | delegated-to-command |
| referência | chat | `action` | 'workbench.action.chat.toggleDefaultVisibility' | 'workbench.action.chat.toggleDefaultVisibility' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1829 | Action2 ToggleDefaultVisibilityAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.editToolApproval' | 'workbench.action.chat.editToolApproval' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts` | 1856 | Action2 EditToolApproval; execução definida no método run/handler | action-class |
| referência | chat | `action` | commandId | commandId | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatAgentRecommendationActions.ts` | 65 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.copyCodeBlock' | 'workbench.action.chat.copyCodeBlock' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 142 | Action2 CopyCodeBlockAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | APPLY_IN_EDITOR_ID | APPLY_IN_EDITOR_ID | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 287 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.insertCodeBlock' | 'workbench.action.chat.insertCodeBlock' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 333 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.insertIntoNewFile' | 'workbench.action.chat.insertIntoNewFile' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 369 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.runInTerminal' | 'workbench.action.chat.runInTerminal' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 439 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.nextCodeBlock' | 'workbench.action.chat.nextCodeBlock' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 554 | Action2 NextCodeBlockAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.previousCodeBlock' | 'workbench.action.chat.previousCodeBlock' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 576 | Action2 PreviousCodeBlockAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.applyCompareEdits' | 'workbench.action.chat.applyCompareEdits' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 647 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.discardCompareEdits' | 'workbench.action.chat.discardCompareEdits' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 701 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.toggleCompareBlockDiffViewMode' | 'workbench.action.chat.toggleCompareBlockDiffViewMode' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 727 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.openCompareBlockInDiffEditor' | 'workbench.action.chat.openCompareBlockInDiffEditor' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCodeblockActions.ts` | 752 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `change-listener` | onDidChange | state change | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatContext.ts` | 275 | Evento/observable de mudança; atualiza ou reconcilia estado | event-listener |
| referência | chat | `action` | AttachResourceAction | AttachResourceAction | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatContextActions.ts` | 61 | Action2 AttachResourceAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | AttachResourceAction | AttachResourceAction | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatContextActions.ts` | 62 | Action2 AttachResourceAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | AttachResourceAction | AttachResourceAction | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatContextActions.ts` | 63 | Action2 AttachResourceAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | AttachResourceAction | AttachResourceAction | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatContextActions.ts` | 64 | Action2 AttachResourceAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | AttachResourceAction | AttachResourceAction | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatContextActions.ts` | 65 | Action2 AttachResourceAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | AttachResourceAction | AttachResourceAction | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatContextActions.ts` | 66 | Action2 AttachResourceAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.copyAll' | 'workbench.action.chat.copyAll' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCopyActions.ts` | 157 | Action2 CopyAllAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | CopyItemActionId | CopyItemActionId | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCopyActions.ts` | 189 | Action2 CopyItemAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.copyFinalResponse' | 'workbench.action.chat.copyFinalResponse' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCopyActions.ts` | 244 | Action2 CopyFinalResponseAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | 'workbench.action.chat.copyKatexMathSource' | 'workbench.action.chat.copyKatexMathSource' | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatCopyActions.ts` | 283 | Action2 CopyKatexMathSourceAction; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 42 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 43 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 44 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 45 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 46 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 47 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 48 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatDeveloperActions.ts` | 49 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatElicitationActions.ts` | 65 | Action2 Action2; execução definida no método run/handler | action-class |
| referência | chat | `action` | Action2 | Action2 | `projeto_restaurado/vscode-main/src/vs/workbench/contrib/chat/browser/actions/chatExecuteActions.ts` | 1170 | Action2 Action2; execução definida no método run/handler | action-class |
| … | … | … | … | … | … | … | **8350 registros adicionais no CSV** | … |

### Réplica

| Sistema | Superfície | Tipo | Controle/ID | Label | Fonte | Linha | Comportamento capturado | Wiring |
|---|---|---|---|---|---:|---:|---|---|
| réplica | web-app | `react-state` | sessions | sessions | `agents-window-replica/src/App.tsx` | 72 | Estado React local; setter setSessions | state-local |
| réplica | web-app | `react-state` | activeSessionId | activeSessionId | `agents-window-replica/src/App.tsx` | 73 | Estado React local; setter setActiveSessionId | state-local |
| réplica | web-app | `react-state` | sidebarVisible | sidebarVisible | `agents-window-replica/src/App.tsx` | 75 | Estado React local; setter setSidebarVisible | state-local |
| réplica | web-app | `react-state` | auxiliaryVisible | auxiliaryVisible | `agents-window-replica/src/App.tsx` | 76 | Estado React local; setter setAuxiliaryVisible | state-local |
| réplica | web-app | `react-state` | terminalVisible | terminalVisible | `agents-window-replica/src/App.tsx` | 77 | Estado React local; setter setTerminalVisible | state-local |
| réplica | web-app | `react-state` | auxiliaryTab | auxiliaryTab | `agents-window-replica/src/App.tsx` | 78 | Estado React local; setter setAuxiliaryTab | state-local |
| réplica | web-app | `react-state` | editorTabs | editorTabs | `agents-window-replica/src/App.tsx` | 79 | Estado React local; setter setEditorTabs | state-local |
| réplica | web-app | `react-state` | activeTabId | activeTabId | `agents-window-replica/src/App.tsx` | 80 | Estado React local; setter setActiveTabId | state-local |
| réplica | web-app | `react-state` | browserViews | browserViews | `agents-window-replica/src/App.tsx` | 81 | Estado React local; setter setBrowserViews | state-local |
| réplica | web-app | `react-state` | searchQuery | searchQuery | `agents-window-replica/src/App.tsx` | 82 | Estado React local; setter setSearchQuery | state-local |
| réplica | web-app | `react-state` | searchFocusRequest | searchFocusRequest | `agents-window-replica/src/App.tsx` | 83 | Estado React local; setter setSearchFocusRequest | state-local |
| réplica | web-app | `react-state` | approved | approved | `agents-window-replica/src/App.tsx` | 94 | Estado React local; setter setApproved | state-local |
| réplica | web-app | `react-state` | toast | toast | `agents-window-replica/src/App.tsx` | 95 | Estado React local; setter setToast | state-local |
| réplica | web-app | `react-state` | mobilePane | mobilePane | `agents-window-replica/src/App.tsx` | 96 | Estado React local; setter setMobilePane | state-local |
| réplica | web-app | `react-state` | isSinglePane | isSinglePane | `agents-window-replica/src/App.tsx` | 97 | Estado React local; setter setIsSinglePane | state-local |
| réplica | web-app | `react-effect` | useEffect | effect | `agents-window-replica/src/App.tsx` | 117 | Efeito/lifecycle React; revisar cleanup e dependências | effect |
| réplica | web-app | `app-callback` | update | update | `agents-window-replica/src/App.tsx` | 118 | Atualiza setIsSinglePane, setTimeout, setToast; chama browserViews | state-callback |
| réplica | web-app | `react-effect` | useEffect | effect | `agents-window-replica/src/App.tsx` | 124 | Efeito/lifecycle React; revisar cleanup e dependências | effect |
| réplica | web-app | `react-effect` | useEffect | effect | `agents-window-replica/src/App.tsx` | 129 | Efeito/lifecycle React; revisar cleanup e dependências | effect |
| réplica | web-app | `react-effect` | useEffect | effect | `agents-window-replica/src/App.tsx` | 133 | Efeito/lifecycle React; revisar cleanup e dependências | effect |
| réplica | web-app | `app-callback` | notify | notify | `agents-window-replica/src/App.tsx` | 138 | Atualiza setToast | state-callback |
| réplica | web-app | `app-callback` | copyText | copyText | `agents-window-replica/src/App.tsx` | 140 | Atualiza estado/efeito | state-callback |
| réplica | web-app | `app-callback` | selectSession | selectSession | `agents-window-replica/src/App.tsx` | 148 | Atualiza setActiveSessionId, setActiveTabId, setMobilePane, setSessions | state-callback |
| réplica | web-app | `app-callback` | selectEditorTab | selectEditorTab | `agents-window-replica/src/App.tsx` | 158 | Atualiza setActiveTabId | state-callback |
| réplica | web-app | `app-callback` | updateSession | updateSession | `agents-window-replica/src/App.tsx` | 166 | Atualiza setSessions; chama updateSessionAndChatStatus | state-callback |
| réplica | web-app | `app-callback` | clearPendingTimersForSession | clearPendingTimersForSession | `agents-window-replica/src/App.tsx` | 177 | Atualiza estado/efeito | state-callback |
| réplica | web-app | `app-callback` | createBrowser | createBrowser | `agents-window-replica/src/App.tsx` | 187 | Atualiza setActiveTabId, setBrowserViews, setEditorTabs, setMobilePane; chama browserId, browserOrdinalBySession, browserSequence, browserViews, openEditorTab, reloadToken | state-callback |
| réplica | web-app | `app-callback` | openBrowser | openBrowser | `agents-window-replica/src/App.tsx` | 219 | Atualiza setSearchFocusRequest; chama openEditorTab, openSearch | state-callback |
| réplica | web-app | `app-callback` | openDiff | openDiff | `agents-window-replica/src/App.tsx` | 225 | Atualiza setAuxiliaryTab, setAuxiliaryVisible; chama openEditorTab, selectSession | state-callback |
| réplica | web-app | `react-effect` | useEffect | effect | `agents-window-replica/src/App.tsx` | 232 | Efeito/lifecycle React; revisar cleanup e dependências | effect |
| réplica | web-app | `app-callback` | handleSearchShortcut | handleSearchShortcut | `agents-window-replica/src/App.tsx` | 233 | Atualiza estado/efeito; chama handleSearchShortcut, openSearch | state-callback |
| réplica | web-app | `app-callback` | closeEditorTab | closeEditorTab | `agents-window-replica/src/App.tsx` | 243 | Atualiza setActiveTabId, setBrowserViews, setEditorTabs; chama browserViews | state-callback |
| réplica | web-app | `app-callback` | navigateBrowser | navigateBrowser | `agents-window-replica/src/App.tsx` | 261 | Atualiza estado/efeito; chama navigateBrowserState | state-callback |
| réplica | web-app | `app-callback` | browserBack | browserBack | `agents-window-replica/src/App.tsx` | 263 | Atualiza estado/efeito | state-callback |
| réplica | web-app | `app-callback` | browserForward | browserForward | `agents-window-replica/src/App.tsx` | 264 | Atualiza estado/efeito | state-callback |
| réplica | web-app | `app-callback` | reloadBrowser | reloadBrowser | `agents-window-replica/src/App.tsx` | 265 | Atualiza estado/efeito; chama reloadBrowserState | state-callback |
| réplica | web-app | `app-callback` | setBrowserStatus | setBrowserStatus | `agents-window-replica/src/App.tsx` | 266 | Atualiza setBrowserStatusState | state-callback |
| réplica | web-app | `app-callback` | setBrowserViewport | setBrowserViewport | `agents-window-replica/src/App.tsx` | 267 | Atualiza setBrowserViewportState | state-callback |
| réplica | web-app | `app-callback` | handleNewSession | handleNewSession | `agents-window-replica/src/App.tsx` | 268 | Atualiza setActiveChatBySession, setActiveSessionId, setMobilePane, setSessions | state-callback |
| réplica | web-app | `app-callback` | handleToggleArchived | handleToggleArchived | `agents-window-replica/src/App.tsx` | 292 | Atualiza setBrowserViews, setEditorTabs; chama browserViews, updateSession, updateSessionStatus | state-callback |
| réplica | web-app | `app-callback` | handleDelete | handleDelete | `agents-window-replica/src/App.tsx` | 308 | Atualiza setActiveChatBySession, setActiveSessionId, setBrowserViews, setComposerDrafts, setComposerHistoryByChat, setDiffFilesBySession, setEditorTabs, setModeByChat, setModelByCh | state-callback |
| réplica | web-app | `app-callback` | handleApprove | handleApprove | `agents-window-replica/src/App.tsx` | 340 | Atualiza setApproved, setTimeout; chama updateSession, updateSessionAndChatStatus | state-callback |
| réplica | web-app | `app-callback` | handleSend | handleSend | `agents-window-replica/src/App.tsx` | 368 | Atualiza setTimeout; chama updateSession, updateSessionAndChatStatus | state-callback |
| réplica | web-app | `app-callback` | handleStop | handleStop | `agents-window-replica/src/App.tsx` | 426 | Atualiza estado/efeito; chama updateSession, updateSessionStatus | state-callback |
| réplica | web-app | `app-callback` | handleRegenerate | handleRegenerate | `agents-window-replica/src/App.tsx` | 457 | Atualiza setTimeout; chama updateSession, updateSessionAndChatStatus | state-callback |
| réplica | web-app | `app-callback` | handleMessageCopy | handleMessageCopy | `agents-window-replica/src/App.tsx` | 512 | Atualiza estado/efeito | state-callback |
| réplica | web-app | `app-callback` | handleCopyAll | handleCopyAll | `agents-window-replica/src/App.tsx` | 516 | Atualiza estado/efeito | state-callback |
| réplica | web-app | `app-callback` | handleCopyFinalResponse | handleCopyFinalResponse | `agents-window-replica/src/App.tsx` | 523 | Atualiza estado/efeito | state-callback |
| réplica | web-app | `app-callback` | handleFeedback | handleFeedback | `agents-window-replica/src/App.tsx` | 531 | Atualiza estado/efeito; chama updateSession | state-callback |
| réplica | web-app | `app-callback` | handleReport | handleReport | `agents-window-replica/src/App.tsx` | 543 | Atualiza estado/efeito; chama updateSession | state-callback |
| réplica | web-app | `app-callback` | updateDiffFilesForSession | updateDiffFilesForSession | `agents-window-replica/src/App.tsx` | 555 | Atualiza setDiffFilesBySession | state-callback |
| réplica | web-app | `app-callback` | selectDiffFile | selectDiffFile | `agents-window-replica/src/App.tsx` | 562 | Atualiza setSelectedDiffFileBySession | state-callback |
| réplica | web-app | `app-callback` | acceptDiff | acceptDiff | `agents-window-replica/src/App.tsx` | 566 | Atualiza setDiffAccepted | state-callback |
| réplica | web-app | `app-callback` | revertDiff | revertDiff | `agents-window-replica/src/App.tsx` | 568 | Atualiza setDiffAccepted | state-callback |
| réplica | web-app | `app-callback` | acceptAllDiff | acceptAllDiff | `agents-window-replica/src/App.tsx` | 569 | Atualiza setAllDiffAccepted | state-callback |
| réplica | web-app | `app-callback` | revertAllDiff | revertAllDiff | `agents-window-replica/src/App.tsx` | 570 | Atualiza setAllDiffAccepted | state-callback |
| réplica | web-app | `app-callback` | toggleViewed | toggleViewed | `agents-window-replica/src/App.tsx` | 571 | Atualiza estado/efeito; chama toggleDiffViewed | state-callback |
| réplica | web-app | `app-callback` | renderChat | renderChat | `agents-window-replica/src/App.tsx` | 572 | Atualiza setActiveChatBySession, setAuxiliaryVisible, setComposerDrafts, setComposerHistoryByChat, setModeByChat, setModelByChat; chama handleApprove, handleCopyAll, handleCopyFina | state-callback |
| réplica | web-app | `app-callback` | renderEditor | renderEditor | `agents-window-replica/src/App.tsx` | 605 | Atualiza setActiveChatBySession, setAuxiliaryTab, setAuxiliaryVisible, setBrowserStatus, setBrowserViewport, setMobilePane, setSearchQuery, setSidebarVisible, setTerminalVisible, s | state-callback |
| réplica | web-app | `jsx-button` | `dock-tab${mobilePane === 'chat' ? ' is-active' : '' | Chat | `agents-window-replica/src/App.tsx` | 674 | Troca aba docked do single-pane | wired |
| réplica | web-app | `jsx-button` | `dock-tab${mobilePane === 'editor' ? ' is-active' : '' | Editor{visibleEditorTabs.length > 0 ? ` · $ ` : ''} | `agents-window-replica/src/App.tsx` | 675 | Troca aba docked do single-pane | wired |
| réplica | web-app | `jsx-button` | `dock-tab${mobilePane === 'details' ? ' is-active' : '' | Detalhes | `agents-window-replica/src/App.tsx` | 676 | Troca aba docked do single-pane | wired |
| réplica | web-app | `jsx-button` | button | Fechar aviso | `agents-window-replica/src/App.tsx` | 698 | Callback delegado ao componente pai | delegated |
| réplica | web-app | `jsx-button` | toolbar-button | Fechar barra auxiliar | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 43 | Callback delegado ao componente pai | delegated |
| réplica | web-app | `jsx-button` | `aux-tab${tab === 'changes' ? ' is-active' : '' | Changes | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 46 | Alterna Changes/Files | wired |
| réplica | web-app | `jsx-button` | `aux-tab${tab === 'files' ? ' is-active' : '' | Files | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 47 | Alterna Changes/Files | wired |
| réplica | web-app | `react-state` | checksOpen | checksOpen | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 61 | Estado React local; setter setChecksOpen | state-local |
| réplica | web-app | `jsx-button` | text-button | Revisar | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 65 | Callback delegado ao componente pai | delegated |
| réplica | web-app | `jsx-button` | change-tree-row | + − | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 67 | Callback delegado ao componente pai | delegated |
| réplica | web-app | `jsx-button` | secondary-button | Abrir multi-diff | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 73 | Callback delegado ao componente pai | delegated |
| réplica | web-app | `jsx-button` | ci-header | Checks 3 1 | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 76 | Expande/recolhe Checks | wired |
| réplica | web-app | `jsx-button` | secondary-button | Executar novamente | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 86 | Nenhum callback onClick no JSX detectado | visual-only |
| réplica | web-app | `jsx-button` | secondary-button | Preparar PR | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 91 | Callback delegado ao componente pai | delegated |
| réplica | web-app | `jsx-button` | file-tree-row | button | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 110 | Abre arquivo como aba do Editor | wired |
| réplica | web-app | `react-state` | modeOpen | modeOpen | `agents-window-replica/src/components/ChatInput.tsx` | 125 | Estado React local; setter setModeOpen | state-local |
| réplica | web-app | `react-state` | modelOpen | modelOpen | `agents-window-replica/src/components/ChatInput.tsx` | 126 | Estado React local; setter setModelOpen | state-local |
| réplica | web-app | `react-state` | modelQuery | modelQuery | `agents-window-replica/src/components/ChatInput.tsx` | 127 | Estado React local; setter setModelQuery | state-local |
| réplica | web-app | `react-state` | attachmentPickerOpen | attachmentPickerOpen | `agents-window-replica/src/components/ChatInput.tsx` | 128 | Estado React local; setter setAttachmentPickerOpen | state-local |
| réplica | web-app | `react-state` | attachmentPickerView | attachmentPickerView | `agents-window-replica/src/components/ChatInput.tsx` | 129 | Estado React local; setter setAttachmentPickerView | state-local |
| réplica | web-app | `react-state` | workspaceQuery | workspaceQuery | `agents-window-replica/src/components/ChatInput.tsx` | 130 | Estado React local; setter setWorkspaceQuery | state-local |
| … | … | … | … | … | … | … | **704 registros adicionais no CSV** | … |

## Controles da réplica capturados sem callback direto

Esses itens são importantes para a revisão posterior porque aparecem como controles visuais, mas a raspagem não encontrou `onClick`/delegação direta no JSX:

| Controle identificado na réplica | Fonte | Linha | Observação |
|---|---|---:|---|
| Executar novamente | `agents-window-replica/src/components/AuxiliaryBar.tsx` | 86 | Nenhum callback onClick no JSX detectado |
| Dividir editor | `agents-window-replica/src/components/EditorArea.tsx` | 350 | Nenhum callback onClick no JSX detectado |
| Maximizar editor | `agents-window-replica/src/components/EditorArea.tsx` | 351 | Nenhum callback onClick no JSX detectado |
| Maximizar terminal | `agents-window-replica/src/components/TerminalPanel.tsx` | 75 | Nenhum callback onClick no JSX detectado |
| Conta | `agents-window-replica/src/components/Titlebar.tsx` | 92 | Nenhum callback onClick no JSX detectado |

## Leitura inicial do comportamento encontrado

- A referência distribui o comportamento em **menu item → comando → handler**, além de listeners de DOM e observables. Portanto, o label visual raramente está no mesmo arquivo que implementa o efeito.
- A réplica concentra o estado principal em `App.tsx` e delega superfícies para componentes. A coluna `wiring` diferencia callback local (`wired`), callback recebido do pai (`delegated`), registro/handler (`event-listener`) e controle somente visual (`visual-only`).
- O CSV deve ser usado como base da próxima etapa: comparar cada `identifier`/`label`, seguir a cadeia de callback e então testar os fluxos no navegador.

## Arquivos gerados

- `raspagem/controles_e_eventos.csv` — tabela completa, uma linha por ocorrência.
- `raspagem/comparativo_superficies.csv` — matriz comparativa direta por fluxo/superfície.
- `raspagem/resumo.json` — contagens resumidas.
- `raspagem_comportamentos.py` — raspador reproduzível.

