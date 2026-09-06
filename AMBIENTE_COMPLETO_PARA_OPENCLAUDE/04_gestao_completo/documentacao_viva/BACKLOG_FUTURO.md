# BACKLOG ESTRATÉGICO — Réplica Agents Window (VS Code)

## Intenção Original
- **Objetivo:** Construir uma réplica de alta fidelidade e 100% funcional da Agents Window do VS Code, eliminando todos os mocks por integrações reais.
- **Estado Atual:** 10 de 10 módulos concluídos e verificados. Terminal Real (W1-04) validou o Gate 0 com sucesso (Sessão 11), confirmando a persistência da sessão e do histórico visual ao alternar a visibilidade do painel. Swipe Mobile e Build de Produção seguem concluídos com evidência real (gates 4 e 5 do `GATES_EXECUCAO.md`).
- **Meta Final:** 100% de conformidade, 0 erros TypeScript (`tsc -b`), 370 testes unitários + 62 testes E2E com asserções reais e screenshots de evidência, build de produção 100% verde.

---

## Onda 1 — Produção Real: Filesystem & Terminal
> Pré-requisito: Sessões 01 a 05 concluídas e validadas

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W1-01 | Sessões List Real (Sessão 04) | Agrupamento completo (Hoje/Fixadas), 3 chats aninhados, workspace capping 3, drag seguro e teclado | `SessionSidebar.tsx`, `sessionsList.ts`, `dragAndDrop.ts` | E2E `sessao_02` passa (5/5) e typecheck 0 erros | CONCLUÍDO |
| W1-02 | Layout Topologia (Sessão 05) | Docked controller, session sync, CannotClose tabs e regra R-070 | `sessionLayout.ts`, `sessionLayoutSync.ts`, `App.tsx` | E2E `sessao_09` passa (5/5) | CONCLUÍDO |
| W1-03 | File System Access API (Sessão 08) | Entregue: `showDirectoryPicker` real, árvore do disco, persistência do handle em IndexedDB e fallback honesto; E2E prova a CHAMADA da API nativa | `src/domain/fileSystem.ts`, `AuxiliaryBar.tsx`, `App.tsx` | E2E `sessao_08` 5/5 e chamada real de `showDirectoryPicker` instrumentada | CONCLUÍDO |
| W1-04 | Terminal Real xterm.js (Sessão 11) | Backend PTY via node-pty + WebSocket integrado. Validado Gate 0 (persistência de output ao fechar/abrir painel) e E2E completo. | `pty-server/`, `TerminalPanel.tsx`, `usePtySession.ts` | Gate 0 do `BLUEPRINT_TERMINAL_REAL.md` §3.4 passando com evidência real, seguido de E2E completo do plano de UX | CONCLUÍDO |

### Meta da Onda 1
- **Critério binário:** Filesystem e Terminal reais integrados sem mocks, com testes unitários passando.
- **Status:** CONCLUÍDO

### CONTRATOS_DA_ONDA 1 — Revisão do Terminal Real (2026-09-06)
```yaml
FONTE: "04_gestao_completo/documentacao_viva/BLUEPRINT_TERMINAL_REAL.md (Revisão 2)"

ORDEM_OBRIGATORIA:
  - "1. Gate 0 (BLUEPRINT §3.4): abrir terminal real, confirmar .terminal-panel visível,
     executar comando com saída determinística, confirmar saída no xterm, fechar/reabrir
     painel e confirmar reconexão ao MESMO PTY (não recriação). Colar saída bruta."
  - "2. Se Gate 0 falhar: corrigir a fundação. NÃO avançar para os itens abaixo."
  - "3. Se Gate 0 passar: implementar/ajustar Session Manager, Workbench, Split conforme
     o plano de UX aprovado, sobre a base do BLUEPRINT_TERMINAL_REAL.md."

OUTPUT_SCHEMAS:
  W1-04: "TerminalSessionProvider -> { open, close(explícito), input, resize, availableProfiles }"

DECISOES_IMUTAVEIS_DESTA_REVISAO:
  - "Terminal pertence contextualmente à Agent Session; processo/infra pertence ao
     workspace/backend (Decisão B, evidência em runInTerminalTool.ts do VS Code real)."
  - "Esconder/fechar painel, trocar de terminal, trocar de sessão: NÃO mata o PTY."
  - "Só mata o PTY: kill explícito do usuário, exit do shell, timeout de 30min, ou
     F5/reload (persistência pós-reload fica fora de escopo desta onda)."
  - "WebSocket vive num provider acima do TerminalPanel.tsx, não no ciclo de
     mount/unmount do componente."
  - "N terminais por workspace, sem limite artificial de interface agora."
  - "Split: layout recursivo H+V na arquitetura; primeira entrega visual só horizontal."
  - "Teste 9 do plano de UX (Sessão A → terminal A; Sessão B → terminal B; voltar A →
     terminal certo) permanece válido e deve ser o E2E principal desta decisão."

FORA_DE_ESCOPO:
  - "Persistência de terminal através de F5/reload."
  - "Ir para Diretório Recente, Executar Comando Recente (Onda B — WB-01, WB-02)."
  - "Executar Arquivo Ativo, Executar Texto Selecionado (Onda B — WB-03, WB-04)."
  - "Serviço de Voz (BLOQUEADO, sem blueprint próprio — WB-05)."
  - "Terminal de Depuração de JavaScript (perfil de debug do editor, não um shell)."
```

---

## Onda 2 — Custom Views, Mobile & Fechamento de Produção
> Pré-requisito: Onda 1 concluída

### Itens

| ID | Entregável | Descrição (planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|------------------------|----------------------|---------------------|--------|
| W2-01 | Custom View Grid (Sessão 08) | Entregue como o original manda: superfície full-surface mutuamente exclusiva com Sessions Part/Editor/Aux/Panel, com desired vs effective visibility, dismiss (sessão, botão, back do phone) e persistência | `src/domain/customView.ts`, `App.tsx`, `CustomizationsView.tsx` | E2E `sessao_10` 6/6 + 15 unitários de `customView` | CONCLUÍDO |
| W2-02 | Responsividade Mobile (Sessão 10A) | Entregue: gate por toque (`pointer:coarse` + maxTouchPoints), dock bottom-bar, alvos de 44px e gesto de swipe lateral no container | `mobileLayout.ts`, `App.tsx`, `app.css` | E2E `sessao_06` 5/5 em 390x780 com toque e handlers de swipe | CONCLUÍDO |
| W2-03 | Suíte Final de E2E & Screenshots (Sessão 10B) | Entregue acima da meta e com asserções reais: 62 testes (12 specs) e 58+ screenshots | `e2e/*.spec.ts`, `test-results/` | `npx playwright test` 62/62 verdes | CONCLUÍDO |
| W2-04 | Build de Produção Limpo | Code-splitting com `manualChunks` no `vite.config.ts` isolando `monaco-editor` e `@xterm/xterm` | `vite.config.ts`, `dist/` | `npm run build` concluir com exit code 0 | CONCLUÍDO |

### Meta da Onda 2
- **Critério binário:** 100% dos testes E2E passando **e** `npm run build` concluindo com exit 0.
- **Status:** CONCLUÍDO

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

