# VALIDACAO 3 - PRODUCAO REAL - PARA ARENA

## Você está em Teste Cego Blind Testing com referências do código original

Você recebeu:
- Vídeo novo 6min40s Record_2026_09_04_08_52_56_496.mp4 com narração detalhada dos bugs que ainda são simulação
- Código completo 2.170 arquivos em projeto_restaurado.zip (versão após suas correções que ainda é simulação)
- Documentação original em 01_original/sessions/ (2.015 arquivos) - LAYOUT.md, LAYOUT_CONTROLLER.md, SESSIONS_LIST.md, SINGLE_PANE_SCENARIOS.md, MOBILE.md, menus.ts, dnd.ts, workbench.css, sessionsPart.css, etc
- Esta pasta VALIDACAO_3_PRODUCAO_REAL com 10 módulos detalhados com REFERENCIA_ORIGINAL do código Microsoft

## O que aconteceu antes

Na pasta 04_gestao_completo você disse 32/32 concluídos, 100%, 69,2% conformidade, 348/348 testes passando.
Mas no RELATORIO_ONDA_1.md você mesmo escreveu: "Descoberta chave: 12 dos 14 itens já estavam implementados. O relatório foi produzido a partir de versão anterior"

Ou seja, você fez só 2 itens (tema claro e sincronizar aba) e reclassificou 12 como "já OK" sem fazer.

Resultado: testes unitários passam (mockados) mas app continua simulação:
- Browser: srcDoc fixo "Contextual browser for this session" nunca carrega google.com [00:24]
- Arquivos: const folders = [...] hardcoded 3 pastas [00:43]
- Layout: filtros ORDENAR/STATUS inventados que não existem no original [01:02]
- Novo chat: chip workspace-local span sem onClick, não chama showDirectoryPicker [01:56]
- Terminal: initialTerminalLines fixo, não aceita digitação [03:07]

O usuário mostrou no vídeo [06:13] que no original consegue adicionar pasta Entrega/Downloads do PC com "que maravilha" - na réplica nada funcional.

## O que tem neste pacote VALIDACAO 3

10 módulos, cada um com 4 arquivos:

1. **01_BROWSER_REAL/** - Browser por sessão com history, sessionId, X-Frame-Options honesto
   - REFERENCIA_ORIGINAL: BrowserViewState original com sessionId, history, getBrowserViewsForSession
   - COMPORTAMENTO_REAL: vídeo [00:24] Google não abre, botões back/forward
   - MOCKADO_ATUAL: srcDoc fixo
   - TAREFA: trocar srcDoc por src real + banner erro honesto

2. **02_FILESYSTEM_WORKSPACE_REAL/** - Escolher pasta real do PC
   - REFERENCIA: sessionWorkspace.ts + seu vídeo [06:13] "que maravilha"
   - COMPORTAMENTO: showDirectoryPicker, ler arquivos reais, Monaco com conteúdo real
   - MOCKADO: const folders = [...] hardcoded
   - TAREFA: criar fileSystem.ts com File System Access API

3. **03_LAYOUT_CONTROLLER_MEMORIA/** - Portas que batem sozinhas [00:05][00:33] - MAIS CRÍTICO
   - REFERENCIA: baseSessionLayoutController.md B1-B5 + desktopSessionLayoutController.md D1-D9 + D3b shared newSessionViewState
   - COMPORTAMENTO: memória por sessão, newSessionViewState compartilhado, novo chat não esconde laterais
   - MOCKADO: captureSessionLayout nunca chamado, newSessionViewState sempre DEFAULT
   - TAREFA: implementar capture/restore na troca, fix isChatCentered CSS position:absolute

4. **04_SESSIONS_LIST_AGRUPAMENTO/** - Vários chats por pasta [03:13]
   - REFERENCIA: SESSIONS_LIST.md placement precedence Archived > Pinned > Custom group > Quick chat > Workspace, sessionsList.ts 187kb, dnd.ts SessionsDataTransfers
   - COMPORTAMENTO: vscode-main tem 3 chats aninhados, filtros ORDENAR não existem, workspace capping 3
   - MOCKADO: só 1 chat por workspace, filtros fake ORDENAR/STATUS
   - TAREFA: remover filtros fake, implementar vários chats aninhados, menu contexto, drag

5. **05_LAYOUT_TOPOLOGIA/** - Grid flexível
   - REFERENCIA: LAYOUT.md Workbench topology, workbench.css Sessions Part flexible, editor preserves size
   - COMPORTAMENTO: Sessions Part flexível absorve resize, Sidebar preserva tamanho, Custom View Grid substitui tudo
   - MOCKADO: partSizesForSession retorna [50,50] fixo
   - TAREFA: topologia fixa, partSizes por sessionId, Custom View Grid esconde resto

6. **06_SINGLE_PANE_TRANSIENTE/** - Browser transient, detail-only
   - REFERENCIA: SINGLE_PANE_SCENARIOS.md + sidePane.ts resolveDetailPanelVisible, isTabCloseable
   - COMPORTAMENTO: browser tab esconde detail temporariamente, se editor hidden enquanto browser ativo mostra fallback Files, managed tabs CannotClose em detail-only
   - MOCKADO: isTabCloseable existe mas não usado, ordem hide/show errada causa tela preta
   - TAREFA: fix crash Mostrar Editor com skipInvariantCheck, browser transient, CannotClose

7. **07_TERMINAL_REAL/** - Terminal por sessão que aceita digitação [02:48][03:07]
   - REFERENCIA: panelPart.ts + LAYOUT_CONTROLLER.md B1 Panel visibility por sessão
   - COMPORTAMENTO: terminal pertence à sessão, Output/Problems/shell picker bash/zsh/pwsh/fish, split, snapshot preserva linhas
   - MOCKADO: initialTerminalLines fixo, sem onData, split mock com <pre>
   - TAREFA: aceitar digitação com onData, terminal por sessão com snapshot, split real com segundo xterm

8. **08_CUSTOM_VIEW_GRID/** - Full-surface que substitui tudo [02:19]
   - REFERENCIA: LAYOUT.md Custom View Grid mutually exclusive com Sessions Part/Editor/Aux/Panel, Titlebar e Sidebar remain, opening session dismisses custom view
   - COMPORTAMENTO: AI Customizations view full-surface, abrir sessão fecha custom view
   - MOCKADO: customizations é só tab no editor, não full-surface
   - TAREFA: criar customView.ts service, App.tsx esconder parts quando activeCustomView, CSS custom-view-active

9. **09_MENU_CONTEXTO_DRAG_DROP_TECLADO/** - Menu em todo lugar [03:47][05:50]
   - REFERENCIA: menus.ts SessionItemContextMenu, SessionChatItemContext, dnd.ts DraggedSessionIdentifier, SessionsDataTransfers
   - COMPORTAMENTO: menu contexto em sessão, chat, tab, arquivo, terminal; drag reorder, move para Fixadas/grupo; teclado Tab/Arrow/F2/Delete/roving index
   - MOCKADO: ContextMenu existe mas só parcial, drag sem canReorderSessions, teclado só para [data-session-nav]
   - TAREFA: menu completo em todos lugares, drag com canReorderSessions (bloqueia archived), teclado completo, bordas residuais, search pill, changes pill

10. **10_MOBILE_E_PRODUCAO/** - Phone ≤600px + build final
    - REFERENCIA: MOBILE.md phone ≤600px tablet ≤1024px single-pane só com toque, encolher desktop NUNCA vira single-pane, auxiliary bar skipado em mobile web, mobileNavigationStack pushLayer/back
    - COMPORTAMENTO: phone layout drawer full-width, 260ms transition, touch 44px min-height, back dismiss custom view
    - MOCKADO: isPhoneViewport só width sem toque, resize desktop vira mobile
    - TAREFA: gate por toque detectTouch(), mobile drawer CSS, navigation stack, build sem erros, 348 testes, 24 screenshots Playwright

## Ordem de execução OBRIGATÓRIA

1. 03_LAYOUT_CONTROLLER_MEMORIA (base, portas batem sozinhas)
2. 05_LAYOUT_TOPOLOGIA
3. 04_SESSIONS_LIST_AGRUPAMENTO
4. 01_BROWSER_REAL
5. 02_FILESYSTEM_WORKSPACE_REAL
6. 07_TERMINAL_REAL
7. 08_CUSTOM_VIEW_GRID
8. 06_SINGLE_PANE_TRANSIENTE
9. 09_MENU_CONTEXTO_DRAG_DROP_TECLADO
10. 10_MOBILE_E_PRODUCAO (build final + E2E)

## Como trabalhar em cada módulo

Para cada pasta:
1. Ler REFERENCIA_ORIGINAL.md - código Microsoft original
2. Ler COMPORTAMENTO_REAL.md - vídeo + spec
3. Ler CODIGO_MOCKADO_ATUAL.md - o que está mockado hoje
4. Implementar TAREFA_PARA_ARENA.md - arquivos exatos, lógica, código antes/depois
5. Rodar teste E2E descrito na tarefa com Playwright
6. Tirar screenshot antes/depois
7. Só então ir para próximo módulo

## Tecnologia - Playwright (Microsoft)

Playwright é robô que clica em tudo, tira screenshots, valida fluxo ponta-a-ponta. Você já usou antes e fez 348/348 testes e 24 screenshots.

```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
```

## Entrega final

- Código em 02_replica/src sem MOCK (sem srcDoc fixo, sem folders hardcoded, sem initialTerminalLines fixo)
- Relatório VALIDACAO_3.md com prints comparativos original vs réplica
- test-results/ com 24+ screenshots
- 0 erros TypeScript
- Build produção funcionando
- File System real, Browser honesto, Terminal digitável, Layout com memória por sessão

Boa sorte! Agora com referências originais, não tem como fazer só enfeite - tem que ser motor real.
