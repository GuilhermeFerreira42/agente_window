# CURRENT_STATE — Réplica Agents Window (VS Code)
> Última atualização: Fase 08 — Consolidação da documentação viva | 2026-09-05
> Evidência bruta dos gates: `GATES_EXECUCAO.md` (mesma pasta). Números aqui NUNCA podem contradizê-la.

## ⚡ Handoff Imediato (Retomada Rápida)
- **Status da Tarefa Atual:** Fase 08 concluída — consolidação documental: relatórios soltos mesclados nos documentos vivos e movidos para `arquivo_historico/`; três KANBANs concorrentes eliminados (só `04_gestao_completo/KANBAN.md` é canônico); gates reexecutados do zero.
- **Último Arquivo Editado:** `documentacao_viva/*` (consolidação) + `CLAUDE.md` (nova regra de governança documental).
- **Próxima Ação Imediata:** Sessão 07 (Terminal real com PTY — adiado por decisão do usuário) e o gesto de swipe do mobile. O resíduo de topologia da Sessão 05 foi fechado (grid não-proporcional).
- **Comando de Teste Rápido:** `npm run typecheck && npm run test && npx playwright test`
- **Fonte única de verdade documental:** só `04_gestao_completo/documentacao_viva/` (+ `KANBAN.md` ao lado). Qualquer relatório fora daí é proibido pelo `CLAUDE.md`; o histórico anterior está em `documentacao_viva/arquivo_historico/`.
- **ATENÇÃO (armadilha corrigida):** `tsc --noEmit` na raiz é NO-OP (`tsconfig.json` tem `"files": []`). O gate real é `tsc -b --force`, já configurado em `npm run typecheck`. Ele revelou `onToggleFolder` inexistente em `App.tsx`.

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
| Unitários | `src/**/*.test.ts(x)` | **368/368 passando (43 arquivos)** — execução de 2026-09-05 | `npm run test` |
| Contrato anti-trapaça | `src/__tests__/e2eAssertionContract.test.ts` | 5/5 — reprova spec E2E sem `expect` | `npm run test` |
| E2E completo | `e2e/*.spec.ts` (11 arquivos) | **56/56 passando (5,4 min, 58 screenshots)** | `npx playwright test` |
| Build de produção | `tsc -b && vite build` | ❌ **exit 134 — OOM do V8** (2 GB de RAM; morre perto de 900 MB de heap no bundle do Monaco). `tsc -b` passa. Ver `GATES_EXECUCAO.md` §4 | `npm run build` |

> Régua E2E: 56 testes / 197 `expect` / 0 `console.log`. `playwright.config.ts` sobe o Vite sozinho (`webServer`, porta 5173) — nenhuma spec hardcoda host/porta.

---

## 📚 Dependências Críticas
| Pacote | Versão | Motivo |
|--------|--------|--------|
| `react` / `react-dom` | `^18.2.0` | Core da interface declarativa |
| `vite` | `^5.0.0` | Bundler e HMR ultrarrápido |
| `vitest` | `^1.0.0` | Testes unitários com suporte a ESM e Vite |
| `@playwright/test` | `^1.40.0` | Testes E2E e automação visual de screenshots |
| `xterm` | `^5.3.0` | Terminal funcional integrado |
| `monaco-editor` | `^0.44.0` | Editor de código e diff visual |
