# 02 - VISAO GERAL — Agente Window

> Leitura: 2.º arquivo (depois do `01`). Curto de propósito: o que é o projeto, com que é feito e onde está cada coisa. Detalhe técnico no `04`; estado no `03`.

## 1. O que é — Identidade do Produto (90 % / 10 %)
O **Agente Window** é construído sob uma proporção clara de fidelidade:
- **90 % Réplica Fiel do VS Code / Code Server (perfil Agents Window):** Centro com chat, landing page, fluxo de escolha de pasta, menus e comandos idênticos ao original. A régua de medição e fidelidade é o **VS Code Server (porta 8080)** e o VS Code real.
- **10 % Modificado por Decisão de Engenharia:** Chassi lateral à direita com terminal integrado e Explorer avançado + página de Provedores com experiência rica inspirada no **Cline**.
- Base em React + Vite em `platform/apps/workbench-v2/`. Monorepo npm em `platform/`. Idioma do time: PT-BR simples; UI em inglês (fiel ao VS Code).

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
| Documentação ativa | `docs/01…09` (este conjunto canônico) |
| Matriz de Dívidas Técnicas | `docs/06 - PROXIMAS FASES E DIVIDAS.md` |
| Raspagens, auditorias e prints | `docs/arquivo_morto/engenharia_reversa/` e `docs/arquivo_morto/referencias_visuais/` |
| Docs antigos (referência, não autoridade) | `docs/arquivo_morto/` |

## 4. Fatias do projeto (Roadmap canônico Spec-Driven)
- **01 Fundação:** setup do monorepo, Vite, single port.
- **02 Shell base:** casca da aplicação, Titlebar, Statusbar.
- **03 Terminal PTY real:** PTY e xterm integrados.
- **04 Motor:** Explorer, Search, SCM e Monaco Editor anexo.
- **05 Chassis-Right:** Activity Bar e Side Bar à direita, DnD de views, Outline/Timeline, maximizar editor (100 % homologada).
- **06 Workspace Simples & Chat Base:** persistência híbrida, Empty State 768 px, base de sessões.
- **06.1 Fechamento de Dívidas Críticas (EM ANDAMENTO - PRÉ-REQUISITO):** Sincronização atômica Workspace-Explorer-Terminal, eliminação do visualizador legado, abertura de Provedores na landing, fix do clear do terminal e lista de recentes.
- **07 Motor de Edição & Operações de Arquivo (File Ops & Monaco):** abas funcionais, tabs persistentes, save atômico, criação/deleção pelo Explorer.
- **08 Diff Viewer & Integração SCM Real:** diff lado a lado fiel ao VS Code original, stage/unstage real no Source Control.
- **09 Página de Provedores Fiel ao Cline & Gestão de Chaves:** formulários ricos (Claude, OpenAI, Gemini, Ollama, OpenRouter, DeepSeek), teste de conexão, sem expor credenciais.
- **10 Runtime de Chat & Streaming do Agente:** conexão com provedores, streaming real de respostas, histórico persistente por sessão.
- **11 Tool Calling & Execução Segura:** chamadas de ferramentas no filesystem e terminal com confirmação do usuário (Human-in-the-loop).
- **12 Drag & Drop Avançado & Painel Inferior do Terminal:** modularidade total do terminal (mover para painel inferior ou lateral, splits reais).
- **13 Worktree Opcional & Isolamento:** modo de árvore de trabalho git temporária e isolamento de sessão opcional.
- **14 Polish Visual, Atalhos & Paridade 90 % VS Code:** posicionamento da Activity Bar (topo/lado), Command Palette, temas e acabamento de animações.

## Estrutura documental: canônicos e relatórios
A raiz `docs/` mantém **exatamente 9 arquivos físicos canônicos numerados, de `01` a `09`**. Toda a Matriz de Dívidas Técnicas e o Roadmap detalhado vivem no `docs/06 - PROXIMAS FASES E DIVIDAS.md`. Relatórios de execução, auditorias e evidências ficam em `docs/arquivo_morto/`.
