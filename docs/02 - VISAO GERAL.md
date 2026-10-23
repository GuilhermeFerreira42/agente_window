# 02 - VISAO GERAL — Agente Window

> Leitura: 2.º arquivo (depois do `01`). Curto de propósito: o que é o projeto, com que é feito e onde está cada coisa. Detalhe técnico no `04`; estado no `03`.

## 1. O que é — Identidade do Produto (90 % / 10 %)
O **Agente Window** é construído sob uma proporção clara de fidelidade:
- **90 % Réplica Fiel da "Agents Window" do VS Code** (**projeto de referência oficial — D66, 2026-10-13**; é a fonte da verdade das funcionalidades): centro com chat, lista de sessões, landing page, fluxo de escolha de pasta, menus e comandos. A régua de medição e fidelidade é o **VS Code Server (porta 8080)** e o VS Code real.
- **10 % Modificado por Decisão de Engenharia:** chassi lateral à direita com terminal integrado e Explorer avançado + página de Provedores com experiência rica inspirada no **Cline** (+ referências que o dono indicar ao longo do avanço).
- **O que É a Agents Window (pesquisa 2026-10-13):** recurso real do VS Code — prévia na **1.115** (abr/2026), **Stable na 1.120**, **Agent Host + protocolo aberto AHP** nas **1.129/1.130** (jul/2026: processo dedicado, sessões que sobrevivem à janela, múltiplos clientes, worktrees) e consolidação na **1.135/1.136** (set/2026). **A infraestrutura de bastidor (Agent Host/protocolo) NÃO será reproduzida** — reproduzimos comportamento visível + interface, com backend próprio mais simples.
- **Régua fixada (D71, 2026-10-14): VS Code 1.135** — versão de referência para fidelidade (comportamento + visual), homologada pelo dono. Versões **posteriores** (1.136+) são consultadas apenas como **refinamento futuro** — nunca para contradizer a 1.135.
- Base em React + Vite em `platform/apps/workbench-v2/`. Monorepo npm em `platform/`. Idioma do time: PT-BR simples; UI em inglês (fiel ao VS Code).

## 2. Com o que é feito (stack)
- **npm** (não pnpm). Vite 5 + React + TypeScript strict. Playwright E2E (`npx playwright test`; `npm run e2e` não existe). Vitest unitário.
- **Single Port**: um Vite serve app + `/fs/*` + `/git/*` + PTY (`singlePort.ts`, `vite-plugin-pty.ts`). Sem `.env`, caminhos relativos.
- **5174 = repo real** (`npx vite --host 0.0.0.0 --port 5174 --strictPort`), **5175 = fixture** (`FS_TEST_ROOT=file:///tmp/explorer-fs-fixture npx vite --host 0.0.0.0 --port 5175 --strictPort`).
- Terminal: PTY real (`platform/services/pty-server`) + xterm.js. Editor anexo: Monaco. Tema: tokens `--vscode-*` em `src/styles/theme.css` (dark + light).

## 3. Onde está cada coisa
| O quê | Onde |
|---|---|
| Código do app | `platform/apps/workbench-v2/src/` — `App.tsx` (wiring), `shell/` (Activity Bar, Side Bar, sash, DnD, painel de views), `components/` (AuxiliaryBar = editor anexo, terminal **intocável**, Titlebar, Chat), `modules/explorer-search/` (`core/` e `server/` **congelados (exceção vigente: micro-fatia PERF no escopo D98 — ver `05`)**; `ui/` montagem), `styles/theme.css` (tokens dark/light), `domain/` (layout/persistência) |
| Serviço PTY | `platform/services/pty-server/` (**intocável**) |
| Testes | `src/__tests__/` (Vitest) · `e2e/sessao_*.spec.ts` (Playwright) · `run-antiregressao.sh` (bateria com reseed) |
| Documentação ativa | `docs/01…09` (este conjunto canônico) |
| Matriz de Dívidas Técnicas | `docs/06 - PROXIMAS FASES E DIVIDAS.md` |
| Raspagens, auditorias e pesquisa | `docs/arquivo_morto/engenharia_reversa/` e `docs/arquivo_morto/pesquisa_bruta/` (card de permissões, provedores estilo Cline, streaming/input, mockup raspado da Agents Window). A antiga `referencias_visuais/` foi removida na limpeza de 2026-10-12 (recuperável no histórico do Git) |
| Carta de contexto para IA colaboradora | Fora do repositório (D67) — entregue pelo dono; contém o índice curado do `arquivo_morto` com a regra "história ≠ norma" |
| Notas de alinhamento (fora do repo) | `/home/user/registro_alinhamento/` — ex.: nota DEBT-23 p/ a FATIA 13 (21/10). Movida de `uploads/` em 21/10 a pedido do dono |
| Stubs E2E + carta PERF (fora do repo) | `/home/user/uploads/`: `stub_provider.cjs` (4599) + `stub_agir.cjs` (4610) — sem eles não há régua E2E — e `carta_contexto_chat_arena_bug_desempenho.md` (investigação-base da micro-fatia PERF) |
| Docs antigos (referência, não autoridade) | `docs/arquivo_morto/` |

## 4. Fatias do projeto (Roadmap canônico Spec-Driven — **renumeração vigente: D95 de 2026-10-19** (antes D64) — detalhe no `06` Parte 3)
- **01 Fundação:** setup do monorepo, Vite, single port.
- **02 Shell base:** casca da aplicação, Titlebar, Statusbar.
- **03 Terminal PTY real:** PTY e xterm integrados.
- **04 Motor:** Explorer, Search, SCM e Monaco Editor anexo.
- **05 Chassis-Right:** Activity Bar e Side Bar à direita, DnD de views, Outline/Timeline, maximizar editor (100 % homologada).
- **06 Workspace & Chat base:** persistência, Empty State 768 px, base de sessões (implementada).
- **07 Destravar** ✅ 15/10 · **08 Conectar** ✅ 17/10 (D89) · **09 Conversar** ✅ 18/10 (D92) · **10 Agir** ✅ 19/10 (D94) — **MVP FECHADO** · **11 Teto+Continuar+Config** ✅ 21/10 (D96) · **12 DELETE-micro** ✅ 21/10 (D97).
- **PERF (micro, D98)** — desempenho SCM/Explorer em pastas gigantes — entre a 12 e a 13, sem renumerar. Status: decidida 21/10; próximo passo = confirmação.
- **13 Terminal-para-o-agente** (SPEC 2G fechada + DEBT-23 desenhada junto) · **14 Barra+Personalizações+skills** (SPEC 2H) · **15 Janela única de abas** (SPEC 2I, abre por DEBT-12) · **16 Terminal 2.0 visual** · **17 Refinamentos** · **18–20** (painéis, sessões isoladas, navegador/polimento).

> Tabela de conversão antigo→novo e o detalhe de cada fatia: `06 - PROXIMAS FASES E DIVIDAS.md` (Partes 2 e 3).

## Estrutura documental: canônicos e relatórios
A raiz `docs/` mantém **exatamente 9 arquivos físicos canônicos numerados, de `01` a `09`**. Toda a Matriz de Dívidas Técnicas e o Roadmap detalhado vivem no `docs/06 - PROXIMAS FASES E DIVIDAS.md`. Relatórios de execução, auditorias e evidências ficam em `docs/arquivo_morto/`.
