# CURRENT_STATE — Réplica Agents Window (VS Code)
> Última atualização: Fase 10 — Resolução Build OOM, Swipe Mobile e Foco do Terminal | 2026-09-05
> Evidência bruta dos gates: `GATES_EXECUCAO.md` (mesma pasta). Números aqui NUNCA podem contradizê-la.

## ⚡ Handoff Imediato (Retomada Rápida - Arena IA / Antigravity)
- **Status da Tarefa Atual:** Todas as pendências de alta criticidade e bloqueios foram **RESOLVIDOS E ENTREGUES**:
  1. **Build de Produção:** OOM do V8 (exit 134) sanado via chunking dedicado (`manualChunks` no `vite.config.ts`). `npm run build` passa com exit code 0!
  2. **Mobile Swipe:** Gesto de arrastar (swipe) implementado no container raiz (`App.tsx`) para abrir a sidebar a partir da borda esquerda e fechar ao deslizar para a esquerda em telas sensíveis a toque.
  3. **Terminal Focus UX:** Foco automático do terminal ao abrir/alternar de sessão e desfoque inteligente com a tecla `Escape` (`TerminalPanel.tsx`).
- **Status dos Gates:** 4/4 GATES VERDES (Typecheck 0 erros, Unitários 370/370, E2E 62/62, Build de Produção exit 0).
- **Servidores em Execução:** Frontend Vite (`http://localhost:5174`) e Backend PTY (`ws://127.0.0.1:7681`) ativos.
- **Fonte única de verdade documental:** `04_gestao_completo/documentacao_viva/` e `KANBAN.md`. Restrições em `BLUEPRINT_TERMINAL_REAL.md`.

---

## 🏛️ Arquitetura Ativa
- **Framework:** React 18 + TypeScript + Vite.
- **Topologia de Layout:** Single-pane orquestrado por observáveis (`autorun`, `newSessionViewState`, `sessionLayout.ts`).
- **Estado Reativo:** Observable pattern para layout e sessions (sem dependência de events desacoplados).
- **Persistência:** LocalStorage com fallback estruturado e serialização por ID de sessão.
- **Validação de Testes:** Vitest (unitários) + Playwright (E2E com screenshots visuais).

---

## 📦 Módulos e Contratos Vigentes
| Módulo | Arquivo | Contrato Público | Desde |
|--------|---------|------------------|-------|
| `sessionsList` | `src/domain/sessionsList.ts` | `buildSessionsList(sessions, options): SectionGroup[]` | Onda 2 / Val 3 |
| `dragAndDrop` | `src/domain/dragAndDrop.ts` | `canReorderSessions(src, dest): boolean`<br>`reorderSessions(list, srcId, destId): Session[]` | Val 3 |
| `keyboardNavigation` | `src/domain/keyboardNavigation.ts` | `nextRovingIndex(curr, key, max): number` | Val 3 |
| `sessionLayout` | `src/domain/sessionLayout.ts` | `captureSessionLayout(id): LayoutState`<br>`restoreSessionLayout(id): void` | Val 2 |
| `sessionLayoutSync` | `src/domain/sessionLayoutSync.ts` | `syncSessionLayoutOnSwitch(fromId, toId): void` | Val 2 |
| `newSessionViewState` | `src/domain/newSessionViewState.ts` | `getNewSessionViewState(): ViewState` | Val 2 |
| `sidePane` | `src/domain/sidePane.ts` | `isChatCentered(state): boolean` | Onda 1 |
| `SessionSidebar` | `src/components/SessionSidebar.tsx` | `<SessionSidebar sessions={sessions} onSelect={...} />` | Onda 1 / Val 3 |
| `ContextMenu` | `src/components/ContextMenu.tsx` | `<ContextMenu actions={actions} onClose={...} />` | Val 3 |
| `customView` | `src/domain/customView.ts` | `openCustomView(state, id, current)`<br>`closeCustomView(state)`<br>`effectivePartVisibility(state)`<br>`dismissCustomViewOnSessionOpen/OnBack(state)`<br>`load/saveCustomViewState()` | Fase 07 |

---

## 🔄 Fluxo Principal
1. Usuário seleciona ou cria uma sessão na `SessionSidebar`.
2. `sessionLayoutSync` captura o layout da sessão atual e restaura a topologia exata da nova sessão.
3. `buildSessionsList` agrupa itens em: Fixadas > Quick Chats > Hoje > Ontem > Última semana > Mais antigos > Arquivadas (com workspace capping = 3).
4. Sessões ativas renderizam até 3 chats aninhados (`NestedChatRow`) com dot de leitura e cards de aprovação.
4b. Abrir uma **custom view** (AI Customizations) cobre Sessions Part/Editor/Aux/Panel; Title Bar, Sidebar e (no phone) o dock permanecem. Abrir sessão ou o back do phone dispensa e restaura a *desired visibility*.
5. Fechamento de abas transitórias segue rigorosamente a regra R-070.

---

## 🛡️ Invariantes Globais (Nunca Violar)
1. **Nenhum filtro mock:** Apenas o campo "Filtrar sessões", `sortMode` e `readState` oficiais são permitidos.
2. **Precedência de Agrupamento:** `archived > pinned > custom > quickChats > date`.
2b. **Grid não-proporcional:** Sidebar, Editor e Auxiliary Bar preservam o tamanho do usuário; a Sessions Part (chat) absorve o delta de resize da janela.
3. **Workspace Capping:** Fora de busca, exibir no máximo 3 workspaces por seção; busca revela todos.
4. **Drag & Drop Seguro:** `canReorderSessions` DEVE retornar `false` para sessões arquivadas.
5. **Navegação por Teclado:** F2 para renomear, Delete para excluir, Espaço/Enter para selecionar, Setas com roving index.
6. **Zero Erros TypeScript:** `npm run typecheck` deve retornar código 0 em qualquer commit/arquivamento.

---

## ⚙️ Restrições Técnicas Ativas
- **Workspace base do código:** `02_replica_final/`
- **Porta do Dev Server:** `http://localhost:5173`
- **Formato dos Prints E2E:** `test-results/val3_sessao*.png`

---

## 🧪 Testes Obrigatórios
| Suite | Arquivo / Alvo | Cobertura / Status | Comando |
|-------|----------------|-------------------|---------|
| Typecheck (projeto inteiro) | `tsc -b --force` | 0 erros | `npm run typecheck` |
| Lint | `eslint .` | 0 erros / 2 warnings (exhaustive-deps intencionais) | `npm run lint` |
| Unitários | `src/**/*.test.ts(x)` | **370/370 passando (44 arquivos)** — execução de 2026-09-05 | `npm run test` |
| Contrato anti-trapaça | `src/__tests__/e2eAssertionContract.test.ts` | 5/5 — reprova spec E2E sem `expect` | `npm run test` |
| E2E completo | `e2e/*.spec.ts` (12 arquivos) | **62/62 passando (5,2 min, 58+ screenshots)** | `npx playwright test` |
| Build de produção | `tsc -b && vite build` | ✅ **Exit code 0 — SUCESSO** (code-splitting com manualChunks no Vite) | `npm run build` |

> Régua E2E: 56 testes / 197 `expect` / 0 `console.log`. `playwright.config.ts` sobe o Vite sozinho (`webServer`, porta 5173) — nenhuma spec hardcoda host/porta.

---

## 📚 Dependências Críticas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `react` / `react-dom` | `^18.2.0` | Core da interface declarativa |
| `vite` | `^5.0.0` | Bundler e HMR ultrarrápido |
| `vitest` | `^1.0.0` | Testes unitários com suporte a ESM e Vite |
| `@playwright/test` | `^1.40.0` | Testes E2E e automação visual de screenshots |
| `xterm` | `^6.0.0` (`@xterm/xterm`) | Terminal funcional integrado (PTY real via pty-server) |
| `monaco-editor` | `^0.44.0` | Editor de código e diff visual |
