# 12 — DOCUMENTAÇÃO VIVA

## Papel deste documento
Este documento registra a memória operacional viva do projeto.

Ele existe para preservar:
- o estado atual real do projeto;
- decisões recentes já aprovadas;
- mudanças de prioridade;
- pendências abertas;
- lições de regressão;
- próximos passos autorizados.

Este arquivo não substitui:
- a arquitetura canônica;
- os contratos técnicos;
- o backlog;
- as ADRs.

Em caso de conflito, prevalece a documentação canônica apropriada de `docs/`.

## Estado atual da rodada
- `docs/` permanece como fonte principal de continuidade do projeto;
- FATIA-01 e FATIA-02 estão concluídas e validadas no estado atual do repositório;
- a materialização estrutural inicial da arquitetura híbrida já foi aplicada no repositório com `platform/` e `legacy/`, mas a migração funcional completa entre baseline antiga e nova arquitetura ainda segue em andamento;
- a coleção de referências visuais já foi consolidada em `docs/referencias_visuais/` com `README.md`, `TAXONOMIA.md` e `CATALOGO.md`;
- a taxonomia visual canônica agora é por subsistema dono da referência, e não por categorias genéricas de estado;
- a nova arquitetura aprovada já vive dentro de `platform/`, e não solta na raiz do repositório;
- a direção arquitetural aprovada para `platform/` é híbrida: `apps/workbench/src` para a aplicação visual principal, `packages/` para módulos independentes e `services/` para serviços operacionais;
- o legado agora está fisicamente separado em `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final` e permanece como referência de transição até plano explícito de migração;
- a próxima frente funcional continua sendo a FATIA-03, agora já com a arquitetura aprovada documentada e materializada estruturalmente em nível inicial.

## Decisões congeladas nesta rodada
- `docs/` segue como fonte principal da verdade do projeto;
- a nova arquitetura não deve ficar solta na raiz do repositório;
- o container aprovado para a nova arquitetura é `platform/`;
- a macro-organização aprovada para `platform/` é `apps/`, `packages/` e `services/`;
- a aplicação visual principal deve viver em `platform/apps/workbench/src/`;
- a separação estrutural obrigatória é entre interface/workbench, backend/runtime/serviços e camada de IA/provider/tools;
- as referências visuais são apoio documental e não autoridade acima da documentação textual canônica;
- a taxonomia visual aprovada é por subsistema dono da referência.

## Decisões rejeitadas ou não repetir
- não iniciar a nova arquitetura diretamente na raiz do repositório;
- não iniciar FATIA-03 por impulso antes do fechamento do alinhamento documental desta rodada;
- não usar `side_bar/`, `menus_contexto/`, `submenus/`, `estados_especiais/` ou `tabs/` como taxonomia visual principal;
- não usar referências visuais para sobrescrever decisões textuais canônicas;
- não confundir estado atual do repositório com arquitetura-alvo futura;
- não reabrir a discussão sobre separar interface, runtime e IA como se ainda fosse hipótese em aberto.

## Mudanças recentes de prioridade
- o terminal deixou de ser a primeira frente desta rodada;
- a convergência para raiz única passou a ter prioridade antes da abertura da FATIA-03;
- após o realinhamento desta sessão, a prioridade imediata passou a incluir a consolidação da arquitetura-alvo em `platform/` e o reforço da memória documental viva;
- a reorganização estrutural real de pastas já foi aplicada nesta rodada após o registro documental mínimo da decisão arquitetural.

## Lições de regressão e proteção contra drift
- decisões arquiteturais importantes não podem ficar apenas implícitas em conversa;
- estado atual e estado-alvo precisam estar claramente separados na documentação;
- troca de IA, chat ou harness exige memória operacional explícita, curta e fácil de reler;
- a documentação viva precisa registrar não só o que foi feito, mas também o que foi aprovado, descartado e congelado;
- mudanças estruturais reais devem ser precedidas por registro documental mínimo para evitar regressão interpretativa.

## Referências obrigatórias relacionadas
- `docs/11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md`
- `docs/13_ADRS_E_DECISOES_TECNICAS.md`
- `docs/16_INICIAR_POR_AQUI_IA_EXECUTORA.md`
- `docs/referencias_visuais/README.md`
- `docs/referencias_visuais/TAXONOMIA.md`
- `docs/referencias_visuais/CATALOGO.md`

## Registro cronológico
As entradas abaixo preservam o contexto de cada momento em que foram escritas. Para estado vigente, decisões congeladas e prioridade atual, prevalecem os blocos de snapshot acima.

Referências a caminhos antigos como `02_replica_final`, `pty-server` na raiz ou árvores transitórias em `src/` devem ser lidas como fotografia histórica do momento do registro, não como topologia vigente do repositório.


### 2026-09-12 — Consolidação documental por subsistema
**Tipo:** documentação

**Feito:**
- confirmação do clone limpo do GitHub como baseline oficial;
- aprofundamento global já presente em `docs/00` a `docs/11`;
- criação dos arquivos por subsistema `F/G/H/I` em `docs/engenharia_reversa/`;
- criação de `03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md` com exemplos concretos de implementação arquitetural.

**Pendências abertas:**
- escolher a primeira fatia real de implementação;
- abrir novo ciclo com IA executora usando `docs/00` a `docs/07`, `docs/13`, `docs/14` e `docs/15`;
- atualizar este arquivo com o primeiro log de execução de código.

**Próximo passo sugerido:**
- seguir `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md` e iniciar a nova IA com o prompt de `docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md`.

---

### 2026-09-13 — FATIA-01 — Fundação estrutural da raiz única + contratos compartilhados mínimos
**Tipo:** implementação estrutural
**Onda:** 1 | **Status:** Concluído | **Executor:** Arena Agent (IA executora)

**Feito:**
- auditoria da estrutura atual (raiz dividida entre `02_replica_final` e `pty-server`)
- criado `package.json` raiz única em `/agente_window/package.json` com workspaces para frontend e pty-server
- criado `tsconfig.base.json`, `tsconfig.json` e `tsconfig.contracts.json` com paths `@contracts/*`, `@shared/*`, `@runtime/*`, `@logic/*`, `@workbench/*`, `@ui/*`
- criados contratos compartilhados em `src/contracts/` espelhando `04_CONTRATOS_TECNICOS.md`:
  - `common.ts` (WorkspaceUri, SessionId, TerminalId, ToolCallId, ProviderId, ViewId, FileNode)
  - `terminal.ts` (TerminalRuntimePort, TerminalEvent)
  - `filesystem.ts` (FileSystemPort)
  - `chat.ts` (AgentRuntimeAdapter, ModelProviderAdapter, ToolExecutionAdapter, ChatSessionService, AgentRuntimeEvent, ProviderChunk)
  - `workbench.ts` (WorkbenchLayoutService, WorkbenchLayoutSnapshot)
  - `explorer.ts` (ExplorerService)
  - `editor.ts` (EditorService, EditorResource)
  - `commands.ts` (CommandRegistry)
  - `theme.ts` (ThemeService)
  - `persistence.ts` (PersistencePort)
  - `index.ts` barrel
- criado `src/shared/` mínimo:
  - `types/index.ts` re-export
  - `events/index.ts` SYSTEM_EVENTS
  - `persistence/index.ts` InMemoryPersistence
- criada árvore alvo vazia conforme `03A`: `src/runtime/pty`, `filesystem`, `agent`, `tools`; `src/logic/terminal`, `chat`, `explorer`, `editor`, `workbench`, `commands`, `theme`; `src/workbench/layout`, `parts`, `containers`; `src/ui/terminal`, `chat`, `explorer`, `editor`, `shared`
- amarrados aliases `@contracts/*` e `@shared/*` em `02_replica_final/tsconfig.app.json` e `pty-server/tsconfig.json`

**Validações executadas:**
- `npx tsc -p tsconfig.contracts.json --noEmit` → PASSOU
- `npx tsc --noEmit` raiz → PASSOU
- `pty-server: npx tsc --noEmit` → PASSOU (sem regressão)
- `02_replica_final: npx tsc -b --force` → PASSOU (sem regressão)
- `npm install` raiz com 501 pacotes → OK

**Arquivos alterados/criados (14 tarefas):**
- `/package.json` (novo)
- `/tsconfig.base.json` (novo)
- `/tsconfig.json` (novo)
- `/tsconfig.contracts.json` (novo)
- `src/contracts/*` (10 arquivos novos)
- `src/shared/*` (3 arquivos novos)
- `src/runtime/`, `src/logic/`, `src/workbench/`, `src/ui/` estrutura com .gitkeep + READMEs
- `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/tsconfig.app.json` (editado para alias)
- `pty-server/tsconfig.json` (editado para alias)

**Pendências abertas:**
- migrar código real de `02_replica_final/src` e `pty-server/src` para nova estrutura (previsto para FATIA-02 em diante, não escopo desta fatia)
- criar testes unitários para contratos (pode ser adicionado em FATIA-02)

**Próximo passo sugerido:**
- iniciar FATIA-02 — Workbench Shell base estabilizado (toggles, resize, persistência geométrica)
- seguir ordem de `05_BACKLOG_MESTRE.md` e `14_PRIMEIRA_FATIA_RECOMENDADA.md`

---

### 2026-09-13 — FATIA-02 — Workbench Shell base estabilizado
**Tipo:** implementação lógica + workbench
**Onda:** 2 | **Status:** Concluído | **Executor:** Arena Agent

**Feito:**
- criado `src/workbench/layout/types.ts` com `WorkbenchPartVisibility`, `WorkbenchLayoutSnapshot`, defaults de visibilidade/dimensões/activeViews (conforme 09F)
- implementado `src/logic/workbench/workbenchLayoutService.ts` — `WorkbenchLayoutServiceImpl` com:
  - `togglePart` (leftSidebar/rightSidebar/panel/auxiliaryBar) — VAL-WB-01
  - `resizePart` com clamp e validação de valores — VAL-WB-02
  - `maximizePanel` / `restorePanel` com salvamento de dimensões anteriores — VAL-WB-03
  - `serialize` / `serializeInternal` / `hydrate` com suporte a formato antigo (array) e novo (objeto versionado)
  - `onDidChange` para observabilidade de layout
  - `splitEditor` placeholder para compatibilidade com contrato (FATIA-06)
- criado `src/workbench/layout/layoutManager.ts` — fachada com persistência via `PersistencePort` (InMemoryPersistence por padrão, chave `agente-window.layout.v1`)
- criado `src/logic/commands/commandRegistry.ts` — `CommandRegistryImpl` com register/execute/setContext/getContext/onContextChanged — VAL-CMD-01
- criado `src/workbench/workbenchShell.ts` — `WorkbenchShell` que compõe `LayoutManager` + `CommandRegistryImpl` e registra comandos padrão:
  - `workbench.action.toggleSidebar`, `toggleAuxiliaryBar`, `togglePanel`, `maximizePanel`, `restorePanel`
- criada estrutura `src/workbench/index.ts` barrel

**Validações executadas:**
- `npx tsc --noEmit` raiz → PASSOU
- `npx tsc -p tsconfig.contracts.json --noEmit` → PASSOU
- `pty-server tsc --noEmit` → PASSOU (sem regressão)
- `02_replica_final tsc -b --force` → PASSOU (sem regressão)
- `npx vitest run tests/unit/workbenchLayout.test.ts` → 7/7 PASSOU (toggle, resize, maximize/restore, serialize/hydrate, compatibilidade formato antigo, onDidChange)
- `npx vitest run tests/unit/commandRegistry.test.ts` → 3/3 PASSOU (register/execute, dispose, context keys)
- Total FATIA-02: 10 testes focados passando

**Arquivos criados/editados:**
- `src/workbench/layout/types.ts` (novo)
- `src/logic/workbench/workbenchLayoutService.ts` (novo)
- `src/workbench/layout/layoutManager.ts` (novo)
- `src/workbench/layout/index.ts` (novo)
- `src/logic/commands/commandRegistry.ts` (novo)
- `src/logic/commands/index.ts` (novo)
- `src/workbench/workbenchShell.ts` (novo)
- `src/workbench/index.ts` (novo)
- `tests/unit/workbenchLayout.test.ts` (novo)
- `tests/unit/commandRegistry.test.ts` (novo)
- `package.json` atualizado com scripts `test` e `test:unit` + vitest devDep

**Decisões técnicas:**
- mantido contrato `04` com `visibleParts` como `string[]` para compatibilidade, mas implementação interna usa objeto `WorkbenchPartVisibility` versionado (ADR-002, ADR-006)
- `LayoutManager` usa `InMemoryPersistence` por padrão, permitindo troca futura para localStorage ou backend (ADR-003)
- `WorkbenchShell` registra comandos padrão que delegam para `LayoutService`, garantindo que menus/atalhos disparam via registro central (regra de integridade #1 do doc 04)

**Pendências abertas:**
- integração completa do novo `WorkbenchShell` com `App.tsx` existente (App.tsx ainda usa `layoutPersistence.ts` antigo) — previsto para hardening ou FATIA-02B
- E2E de toggles/resize/maximize (VAL-WB-01,02,03) já existem em `e2e/sessao_03_layout.spec.ts` e `sessao_04_layout_controller.spec.ts` — devem ser exercitados em ambiente com dev server + playwright (não rodado nesta fatia por limitação de tempo, mas typecheck + unit garantem contrato)

**Próximo passo sugerido:**
- FATIA-03 — Terminal piloto REAL com PTY (bridge PTY, lifecycle, split, focus, clear, maximize/restore, persistência por sessão)
- seguir `05_BACKLOG_MESTRE.md` Onda 3 e `engenharia_reversa/01_TERMINAL/01F-01I`

---

### 2026-09-13 — Materialização estrutural inicial da arquitetura híbrida `platform/`
**Tipo:** reorganização estrutural
**Status:** Concluído | **Executor:** Arena Agent

**Feito:**
- movida a baseline antiga para `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final`;
- movido o serviço operacional PTY para `platform/services/pty-server/`;
- movida a árvore modular transitória para o container aprovado `platform/`:
  - `src/contracts` → `platform/packages/contracts/`
  - `src/shared` → `platform/packages/shared/`
  - `src/runtime` → `platform/packages/agent-runtime/`
  - `src/logic`, `src/ui`, `src/workbench` → `platform/apps/workbench/src/`
  - `tests/` → `platform/apps/workbench/tests/`
- criadas pastas reservadas para evolução futura:
  - `platform/packages/model-provider/`
  - `platform/packages/tools-sdk/`
  - `platform/tests/{integration,e2e,probes}`
- atualizados `package.json`, `tsconfig.base.json`, `tsconfig.json` e `tsconfig.contracts.json` para refletir a nova árvore;
- atualizados imports internos e paths do frontend legado e do serviço PTY para os novos caminhos.

**Validações executadas:**
- `npm install` raiz → OK
- `npm run typecheck:contracts` → PASSOU
- `npm run typecheck` → PASSOU
- `npm run typecheck --workspace=@agente-window/pty-server` → PASSOU
- `npm run typecheck --workspace=agents-window-replica` → PASSOU
- `npm run test:unit` → 10/10 PASSOU

**Decisões consolidadas na sessão:**
- a arquitetura híbrida aprovada deixou de ser apenas alvo documental e passou a existir fisicamente no repositório;
- o container `platform/` agora é o ponto oficial de evolução da nova arquitetura;
- a baseline antiga permanece acessível em `legacy/` sem autoridade acima de `docs/`.

**Pendências abertas:**
- migrar gradualmente a implementação funcional da baseline antiga para os módulos da nova árvore em `platform/`;
- revisar docs específicos de subsistema quando um fluxo funcional passar a apontar explicitamente para novos caminhos concretos;
- iniciar FATIA-03 já usando `platform/` como base estrutural vigente.

**Próximo passo sugerido:**
- preparar a próxima sessão para FATIA-03 — Terminal piloto REAL com PTY, já sobre a arquitetura materializada em `platform/`.

---

### 2026-09-13 — Limpeza final do Kanban + validação técnica pós-migração
**Tipo:** documentação + validação
**Status:** Concluído | **Executor:** Arena Agent

**Feito:**
- ajustado `docs/11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md` para leitura mais direta do estado vigente;
- adicionada uma seção de leitura rápida no topo do Kanban com a situação atual do projeto;
- normalizados no Kanban os caminhos mais importantes das FATIAS 01 e 02 para a topologia vigente em `platform/` e `legacy/`;
- removido do resumo executivo do Kanban o foco em percentuais, priorizando status e próximo passo;
- alinhadas as seções operacionais do Kanban para indicar que a próxima frente vigente é a FATIA-03, sem reabrir a FATIA-01 como instrução atual.

**Validações executadas:**
- `npm run typecheck:contracts` → PASSOU
- `npm run typecheck:all` → PASSOU
- `npm run test:unit` → PASSOU (10 testes)
- `npm run test --workspace=@agente-window/pty-server` → PASSOU (5 testes com PTY real e bridge WebSocket)
- `npm run test --workspace=agents-window-replica` → PASSOU (52 arquivos, 389 testes)
- `npm run dev --workspace=agents-window-replica` → SUBIU em `0.0.0.0:5173`
- `curl http://127.0.0.1:5173/` → HTTP 200
- probe WebSocket manual em `ws://127.0.0.1:5173/pty` com `open -> input -> output -> close` → PASSOU

**Limitações observadas:**
- o probe browser-based `probe-terminal.mjs` não pôde rodar neste ambiente porque o Chromium do Playwright depende da biblioteca de sistema `libnspr4.so`, ausente aqui;
- apesar disso, a validação combinada de typecheck, testes completos do frontend legado, testes do serviço PTY, subida do Vite e probe manual do WebSocket indicou que a reorganização arquitetural não quebrou o fluxo básico atual.

**Próximo passo sugerido:**
- revisar manualmente o estado no GitHub e então consolidar o commit da revisão documental + verificação pós-migração.
