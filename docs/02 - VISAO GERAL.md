# 02 - VISAO GERAL — Agente Window

> Leitura: 2.º arquivo (depois do `01`). Curto de propósito: o que é o projeto, com que é feito e onde está cada coisa. Detalhe técnico no `04`; estado no `03`.

## 1. O que é
Réplica fiel do layout do **VS Code 1.135 (perfil Agents Window)** em React + Vite, em `platform/apps/workbench-v2/`. Monorepo npm em `platform/`. Idioma do time: PT-BR simples (o usuário dita por voz); peças novas de UI em inglês (igual ao VS Code).

## 2. Com o que é feito (stack)
- **npm** (não pnpm). Vite 5 + React + TypeScript strict. Playwright E2E (`npx playwright test`; `npm run e2e` não existe). Vitest unitário.
- **Single Port**: um Vite serve app + `/fs/*` + `/git/*` + PTY (`singlePort.ts`, `vite-plugin-pty.ts`). Sem `.env`, caminhos relativos.
- **5174 = repo real** (`npx vite --host 0.0.0.0 --port 5174 --strictPort`), **5175 = fixture** (`FS_TEST_ROOT=file:///tmp/explorer-fs-fixture npx vite --host 0.0.0.0 --port 5175 --strictPort`).
- Terminal: PTY real (`platform/services/pty-server`) + xterm.js. Editor anexo: Monaco. Tema: tokens `--vscode-*` em `src/styles/theme.css` (dark + light).

## 3. Onde está cada coisa
| O quê | Onde |
|---|---|
| Código do app | `platform/apps/workbench-v2/src/` — `App.tsx` (wiring), `shell/` (Activity Bar, Side Bar, sash, DnD, painel de views), `components/` (AuxiliaryBar = editor anexo, terminal **intocável**, Titlebar, Chat), `modules/explorer-search/` (`core/` e `server/` **intocáveis**; `ui/` montagem), `styles/theme.css` (tokens dark/light), `domain/` (layout/persistência) |
| Serviço PTY | `platform/services/pty-server/` (**intocável**) |
| Testes | `src/__tests__/` (Vitest) · `e2e/sessao_*.spec.ts` (Playwright) · `run-antiregressao.sh` (bateria com reseed) |
| Documentação ativa | `docs/01…09` (este conjunto) |
| Raspagens, auditorias e prints | `docs/arquivo_morto/engenharia_reversa/` (FATIA-04 vídeo, FATIA-05 layout com `auditoria_05/c5.x`) e `docs/arquivo_morto/engenharia_reversa/referencias_visuais/` |
| Docs antigos (referência, não regra) | `docs/arquivo_morto/` (03, 04, 13, 18, 24, 25, 05 backlog…) |
| Material bruto futuro (raspagem Fatia 6) | `docs/arquivo_morto/pesquisa_bruta/` quando existir — nunca em `docs/` |

## 4. Fatias do projeto (numeração canônica, D8)
01 Fundação · 02 Shell base · 03 Terminal PTY real (homologado, blindado) · 04 Motor: Explorer/Search/SCM/Diff/Editor anexo (homologada) · **05 Chassis-Right: Activity Bar + Side Bar à direita, DnD de views, Outline/Timeline, maximizar editor (100 % homologada 2026-10-02)** · **06 Workspace Simples & Chat Real (em execução por subfatia)** · **07 Tools CRUD & Filesystem** · **08 Permissões & Proteção** · **09 Runtime IA & Erros & Reset** · **10 Skills & Memória** · **11 Worktree Opcional** · **12 Polish Visual & Ruflo** · **13 Agent Host & Multi-host (proposta no roadmap; depende da deliberação D55 no `06`)**.
