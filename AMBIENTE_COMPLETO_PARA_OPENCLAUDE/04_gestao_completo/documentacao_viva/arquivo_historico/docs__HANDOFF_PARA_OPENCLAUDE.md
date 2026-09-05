# HANDOFF COMPLETO PARA OPENCLAUDE + RUFLO

## CONTEXTO
Replica Agents Window (original 3897 arquivos, replica 115 arquivos). Arena ja admitiu mocks. Video com bugs:
- [00:05] Portas batendo sozinhas
- [00:33] Novo chat esconde laterais
- [02:19] "Nada funciona" - Browser mock, Files mock, Terminal nao digita
- [03:07] Terminal nao digita
- [01:56] Chip workspace nao clicavel
- [06:13] Escolher pasta real
- [03:13] 3 chats aninhados
- [05:50] Menu contexto

## JA CORRIGIDO (5/10) NO ZIP 02_replica_PRODUCAO_REAL_CORRIGIDA.zip
1. 01_BROWSER_REAL: src real, X-Frame banner honesto
2. 02_FILESYSTEM_REAL: showDirectoryPicker + IndexedDB + tree real, chip clicavel
3. 03_LAYOUT_CONTROLLER: sessionLayouts Map persistido B3/B4
4. 05_LAYOUT_TOPOLOGIA: flex:1 sessions-part, partSizesBySession por sessionId
5. 07_TERMINAL_REAL: onData real, digitacao funciona

## FALTA (5/10)
- 04_SESSIONS_LIST: buildSessionsList ja existe, garantir render Hoje/Fixadas, 3 chats aninhados, capping 3, drag bloqueia archived
- 05_RESTANTE: partSizes save real, Custom View Grid mutually exclusive, tab bar keepForDockedTabBar
- 06_SINGLE_PANE: mobileLayout PHONE_MAX 600 TABLET 1024, touch gate, mobileNavigationStack, dockedAuxiliaryController
- 08_CUSTOM_VIEW_GRID: dismiss ao abrir sessao
- 09_MENU_DRAG_TECLADO: ContextMenu, DragTypes, F2/Delete/roving
- 10_MOBILE: detectTouch, drawer 260ms, 24 screenshots

## ORDEM OBRIGATORIA
03 -> 05 -> 04 -> 01 -> 02 -> 07 -> 08 -> 06 -> 09 -> 10
Cada sessao so pronta com E2E + screenshot test-results/

## COMO RODAR
cd 02_replica
npm install
npm run dev
npm run typecheck
npm run test
npx playwright test

## CRITERIOS NAO ACEITA SIMULACAO
- Browser example.com real, Google banner honesto
- Files showDirectoryPicker real, Monaco com conteudo real + badge REAL
- Terminal digita echo/ls/clear, historico, split xterm real
- Layout s1 350px aux aberta -> s2 aux fechada -> s1 restaura, F5 persiste localStorage, novo chat laterais visiveis
- Sessions List Hoje/Fixadas, 3 chats, drag bloqueia archived
- Provas screenshot val3_sessaoXX_TY_*.png

## ARQUIVOS INCLUSOS
- 02_replica/ replica com fixes parciais
- 02_replica_codigo_completo.txt dump original
- INVENTARIO_ESPECIFICACOES.md, RELATORIO_RASPAGEM_COMPORTAMENTOS.md
- VALIDACAO_3_PRODUCAO_REAL.zip 10 sessoes
- VALIDACAO_3_SESSAO_05_TOPOLOGIA.zip 4 testes anti-trapaca
- e2e/ specs Playwright

## RUFLO
Ruflo roda eslint + typecheck + vitest + playwright com screenshots. Se falhar, nao marca pronto.
