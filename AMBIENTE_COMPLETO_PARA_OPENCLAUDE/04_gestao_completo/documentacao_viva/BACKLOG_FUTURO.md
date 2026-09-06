# BACKLOG ESTRATÉGICO — Réplica Agents Window (VS Code)

## Intenção Original
- **Objetivo:** Construir uma réplica de alta fidelidade e 100% funcional da Agents Window do VS Code, eliminando todos os mocks por integrações reais.
- **Estado Atual:** 88% concluído (9 dos 10 módulos da Validação 3 entregues; régua de testes capaz de falhar; resta o Terminal real e o resíduo de topologia da Sessão 05).
- **Meta Final:** 100% de conformidade, 0 erros TypeScript (`tsc -b`), 368 testes unitários + 55 testes E2E com asserções reais (190 `expect`) e screenshots de evidência.

---

## Onda 1 — Produção Real: Filesystem & Terminal
> Pré-requisito: Sessões 01 a 05 concluídas e validadas

### ❓ DEFINIÇÕES PENDENTES (Terminal Real)
Para avançar com a Sessão 07 (Terminal Real), as seguintes definições são necessárias para "bater o martelo":
1. **Implementação do Backend PTY:** Como será a infraestrutura do Pseudo-Terminal? (O `xterm.js` é apenas a interface; a execução real exige um backend/processo externo para gerenciar o shell).
2. **Sincronização de Foco:** Qual o comportamento esperado do cursor e do estado de foco ao alternar entre abas e panes de sessões diferentes?
3. **Escopo de Interatividade:** Quais funcionalidades do shell são prioritárias (ex: suporte total a cores ANSI, redimensionamento dinâmico de colunas/linhas, interatividade de apps de terminal)?

### Itens


| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W1-01 | Sessões List Real (Sessão 04) | Agrupamento completo (Hoje/Fixadas), 3 chats aninhados, workspace capping 3, drag seguro e teclado | `SessionSidebar.tsx`, `sessionsList.ts`, `dragAndDrop.ts` | E2E `sessao_02` passa (5/5) e typecheck 0 erros | CONCLUÍDO |
| W1-02 | Layout Topologia (Sessão 05) | Docked controller, session sync, CannotClose tabs e regra R-070 | `sessionLayout.ts`, `sessionLayoutSync.ts`, `App.tsx` | E2E `sessao_09` passa (5/5) | CONCLUÍDO |
| W1-03 | File System Access API (Sessão 08) | Entregue: `showDirectoryPicker` real, árvore do disco, persistência do handle em IndexedDB e fallback honesto; E2E prova a CHAMADA da API nativa | `src/domain/fileSystem.ts`, `AuxiliaryBar.tsx`, `App.tsx` | E2E `sessao_08` 5/5 e chamada real de `showDirectoryPicker` instrumentada | CONCLUÍDO |
| W1-04 | Terminal Real xterm.js (Sessão 07) | Backend PTY via node-pty + WebSocket, shell dropdown e substituição de mock no TerminalPanel | `pty-server/`, `TerminalPanel.tsx`, `usePtySession.ts` | Execução de comandos reais com validação de PID e saída no xterm | EM ANDAMENTO (Onda A em execução) |

### Meta da Onda 1
- **Critério binário:** Filesystem e Terminal reais integrados sem mocks, com testes unitários passando.
- **Status:** EM ANDAMENTO

### CONTRATOS_DA_ONDA 1
```yaml
OUTPUT_SCHEMAS:
  W1-03: "FileSystemDirectoryHandle -> TreeItem[] (name, path, isDirectory, children)"
  W1-04: "TerminalInstance -> { onData, write, resize, clear, dispose }"

ESCOPO_CONGELADO:
  - "src/domain/sessionsList.ts"
  - "src/domain/sessionLayoutSync.ts"
  - "src/domain/newSessionViewState.ts"

ARQUIVOS_A_DELETAR:
  - "src/data/mockFilesystem.ts" (após substituição pelo driver real)

REESCRITAS:
  - FileTree: INCREMENTAL — manter componentes visuais, trocar fonte de dados para handle real
  - TerminalPanel: INCREMENTAL — conectar ao xterm real mantendo layout de abas

DECISOES_EXTRAS:
  - Usar fallback transparente em memória caso o browser não suporte File System Access API
```

---

## Onda 2 — Custom Views, Mobile & Fechamento de Produção
> Pré-requisito: Onda 1 concluída

### Itens

| ID | Entregável | Descrição (planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|------------------------|----------------------|---------------------|--------|
| W2-01 | Custom View Grid (Sessão 08) | Entregue como o original manda: superfície full-surface mutuamente exclusiva com Sessions Part/Editor/Aux/Panel, com desired vs effective visibility, dismiss (sessão, botão, back do phone) e persistência | `src/domain/customView.ts`, `App.tsx`, `CustomizationsView.tsx` | E2E `sessao_10` 6/6 + 15 unitários de `customView` | CONCLUÍDO |
| W2-02 | Responsividade Mobile (Sessão 10A) | Entregue: gate por toque (`pointer:coarse` + maxTouchPoints), dock bottom-bar e alvos de 44px. FALTA só o gesto de swipe para a sidebar | `mobileLayout.ts`, `App.tsx`, `app.css` | E2E `sessao_06` 5/5 em 390x780 com toque | PARCIAL (swipe pendente) |
| W2-03 | Suíte Final de E2E & Screenshots (Sessão 10B) | Entregue acima da meta e com asserções reais: 56 testes (197 `expect`, 0 sem assert) e 58 screenshots | `e2e/*.spec.ts`, `test-results/` | `npx playwright test` 56/56 em 2026-09-05 | CONCLUÍDO |
| W2-04 | Build de Produção Limpo | `tsc -b` passa; `vite build` aborta com OOM do V8 (exit 134) no sandbox de 2 GB — exige máquina com ≥ 4 GB | `dist/` | `npm run build` concluir sem OOM | PENDENTE (bloqueio de ambiente) |

### Meta da Onda 2
- **Critério binário:** 100% dos testes E2E passando (hoje 56/56, 58 screenshots — ver `GATES_EXECUCAO.md`) **e** `npm run build` concluindo sem OOM. Falta só o build.
- **Status:** PENDENTE

### CONTRATOS_DA_ONDA 2
```yaml
OUTPUT_SCHEMAS:
  W2-01: "GridState -> { panes: PaneItem[], activePaneId: string, splitDirection: 'horizontal' | 'vertical' }"

ESCOPO_CONGELADO:
  - "src/components/SessionSidebar.tsx"

DECISOES_EXTRAS:
  - Não adicionar novos frameworks visuais; utilizar apenas css customizado existente
```

---

## Regras do Backlog
1. Itens movem de `PENDENTE` para `CONCLUÍDO` apenas após validação estrita (`typecheck` + `test` + `playwright`) registrada em `GATES_EXECUCAO.md` na mesma sessão.
2. Nenhuma Onda inicia sem a anterior validada e arquivada.
3. Se um contrato for definido no `CONTRATOS_DA_ONDA`, a IA deve tratá-lo como fato imutável.

---

## Onda B — Extensões do Terminal Real
> Pré-requisito: Onda A (Backend PTY + dropdown de shell) concluída e validada
> Decisão registrada em: 2026-09-05 — itens adiados da Onda A por decisão explícita do usuário

Estes itens **não foram esquecidos** — foram conscientemente adiados. O motivo de cada adiamento está registrado abaixo para rastreabilidade.

| ID | Feature | Motivo do adiamento | Status |
|----|---------|---------------------|--------|
| WB-01 | "Ir para Diretório Recente" | Exige histórico de diretórios persistido (ex.: localStorage ou arquivo). O backend PTY não muda — é uma camada de persistência simples acima do terminal real. Onda A não inclui nenhum mecanismo de persistência de histórico. | PENDENTE |
| WB-02 | "Executar Comando Recente" | Mesma razão do WB-01: precisa de histórico persistido de comandos (análogo ao ~/.bash_history, mas gerenciado pela UI). Backend não muda. | PENDENTE |
| WB-03 | "Executar Arquivo Ativo" | Integração editor↔terminal — requer que o EditorArea exponha o arquivo atualmente focado e que o TerminalPanel receba esse dado via prop ou evento. Sistema separado do PTY em si; requer design de integração próprio. | PENDENTE |
| WB-04 | "Executar Texto Selecionado" | Integração editor↔terminal — requer que o Monaco Editor exponha o texto selecionado e o injete no PTY ativo. Mesma dependência de WB-03. | PENDENTE |
| WB-05 | "Iniciar Serviço de Voz" | **Feature de voz — sem nenhuma relação com o terminal PTY.** Nenhum subsistema de voz existe no projeto. Não iniciar implementação sem blueprint próprio e aprovação explícita do usuário. Colocado aqui apenas para não perder o registro da solicitação original. | BLOQUEADO — aguarda blueprint próprio |

