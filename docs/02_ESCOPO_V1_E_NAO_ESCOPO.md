# 02 — ESCOPO V1 E NÃO ESCOPO — DOC-02

## Escopo V1 — Réplica Modular Exata do 02_replica_final

### No escopo
1. **Inventário visual completo do 02_replica_final**
   - Tokens: --titlebar-height 35px, --statusbar-height 22px, --activitybar-width 48px, --sidebar-width, --terminal-height
   - Layout: ActivityBar + Sidebar + EditorArea + Panel + StatusBar + TitleBar
   - Comportamentos: resize, maximize terminal, tabs, drag&drop, command palette, tema claro/escuro

2. **Nova fundação modular `platform/apps/workbench-v2/`**
   - Estrutura:
     - `platform/apps/workbench-v2/src/` — app visual principal (réplica exata)
     - `platform/packages/contracts/` — contratos
     - `platform/packages/shared/` — shared
     - `platform/packages/agent-runtime/` — filesystem, explorer, editor, search, browser, terminal
     - `platform/services/pty-server/` — PTY real
     - `platform/services/browser-runtime/` — browser com CDP
   - Cada módulo com boundary: só exporta via index.ts, sem import interno cruzado

3. **Módulos obrigatórios replicados 1:1**
   - Layout Base (TitleBar, ActivityBar, SideBar, EditorArea, Panel, StatusBar)
   - Terminal PTY Real — portar VSCodeTerminal.tsx 68KB como módulo preservando pendingOutputRef, fitAllInstancesRef, MutationObserver tema, display: contents/none
   - EditorArea, ChatPanel, SessionSidebar

4. **Validação pixel-perfect**
   - Comparação lado a lado: legacy na 5173 vs nova fundação na 5174
   - Mesma renderização, mesmos aria-labels, mesmas classes para E2E

### Fora de escopo nesta DOC-02
- Implementação completa da FATIA-04 (Explorer completo, Editor em anexo, Browser com IA) — virá depois, sobre a nova fundação já validada
- Multi-root workspace
- Deploy/produção
- Migração de dados de usuários

### Critério de pronto desta DOC-02
Nova fundação modular roda em 5174, visualmente idêntica ao 02_replica_final em 5173, com terminal PTY real funcionando, sem regressão dos 14 itens do docs/18, com testes passando.
