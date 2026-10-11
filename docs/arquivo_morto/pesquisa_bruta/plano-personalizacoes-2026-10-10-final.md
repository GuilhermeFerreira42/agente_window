# Plano final de Personalizações — inventário consolidado de 18 gaps

**Data:** 2026-10-10  
**Aprovado como escopo documental:** 11 gaps iniciais + 7 gaps adicionais.  
**Fonte detalhada:** `relatorio-verificacao-gaps-2026-10-10.md`.  
**Regra:** este plano define donos e ordem; não autoriza implementação de código nem fecha as decisões propostas D39–D47.

## 1. Resumo

O `workbench-v2` já possui uma base visual e contratos mockáveis para AI Customizations e Plugins. Essa base deve ser reaproveitada. Contudo, fixtures, listas estáticas e toggles locais não contam como implementação funcional: faltam descoberta de disco, parsers, watcher, CRUD, runtime, permissões, instalação, sincronização e segurança.

O plano distribui o núcleo nas Fatias 07–12 e cria a **Fatia 13 — Agent Host & Multi-host** para a fronteira multi-processo, multi-janela, background/remote e BYOK integrado.

## 2. Inventário final — 18 gaps

| # | Gap consolidado | O que precisa existir para fechar | Dono principal | Apoio |
|---|---|---|---|---|
| 1 | **Agentes personalizados** | Descoberta, CRUD e parser de agentes; nome, descrição, instruções, tools e comportamento; seleção e aplicação real à sessão. | **10** | 13 para execução via Agent Host |
| 2 | **Skills agentskills.io** | Pastas `<nome>/SKILL.md`, validação do nome, recursos/scripts, descoberta, enablement, criação/movimentação/exclusão e invocação real. | **10** | 08 segurança; 09 execução |
| 3 | **Instruções e `AGENTS.md`** | Leitura de raiz/aninhados, compatibilidade decidida, precedência, orçamento de tokens e explicação do conjunto aplicado. | **10** | 13 sincronização |
| 4 | **Prompt Files** | Descobrir `.github/prompts/*.prompt.md`, criar, editar, executar, salvar como e converter para Skill. | **10** | 12 UX final |
| 5 | **MCP `.vscode/mcp.json`** | Parser/validação, CRUD, start/stop/restart, stdio/HTTP aprovado, autenticação, status, logs e publicação de tools. | **09** | 08 trust/segredos |
| 6 | **Ferramentas do agente** | Registry único, schemas, grupos, enablement real, execução, progresso, cancelamento, resultado/erro e tools de filesystem/browser/subagentes. | **07** | 08 permissões; 09 runtime |
| 7 | **Hooks/Ganchos** | Descoberta de `hooks.json`, eventos, CRUD, enablement, ordem, filtros e execução observável com timeout. | **10** configuração | 09 execução; 08 sandbox |
| 8 | **Plugins `plugin.json`** | Detectar três formatos, fontes/Marketplace, instalar/atualizar/reparar/remover, projetar contribuições e resolver colisões. | **10** | 08 supply chain; 13 multi-harness |
| 9 | **Personalizações — Visão Geral** | Overview, navegação, contagens, cards, listas, detalhes, New/Browse, empty/disabled states, editor e busca. | **12** visual | 09/10 funções reais |
| 10 | **Rubber Duck + Agent Host multi-janela** | Processo isolado, protocolo AHP, transporte autenticado, catálogo de hosts/janelas, sessões background/remote e sincronização. | **13** | 08 segurança; 09 runtime |
| 11 | **BYOK** | Providers/modelos, chave segura, capabilities, teste de conexão, seleção, fallback, utility model, erros, custo/rate limit. | **13** integrado | 06.4c UI; 08 segredos; 09 runtime |
| 12 | **Escopos, fontes, precedência e harness** | Roots Workspace/User/Built-in/Extension/Plugin, precedência determinística, colisões, overrides e capabilities por harness. | **10** | 13 sync |
| 13 | **Marketplace e ciclo de instalação** | Catálogo, busca, origem, install/update/repair/uninstall, integridade, estado e rollback. | **10** | 08 segurança |
| 14 | **Migrações** | Migrate Prompt Files/User Data, preview, destino, conversão, idempotência, backup e conflito sem sobrescrita silenciosa. | **10** | 12 UX |
| 15 | **Editor, preview e override real** | Abrir fonte, preview estruturado, View Raw/Edit Source, salvar Workspace/User, autosave seguro e diagnóstico. | **10** | 12 fidelidade/a11y |
| 16 | **Enablement sincronizado** | Toggle/grupo desabilitado deixa de ser anunciado e executado; persistência e propagação para runtime/Agent Host. | **09/10** | 13 multi-host |
| 17 | **Conectores e credenciais** | Ciclo disconnected/checking/reconnecting/error/connected, autenticação, armazenamento seguro e integração local/remota. | **13** | 08 segredos; 09 conexão |
| 18 | **Diagnóstico, políticas e observabilidade** | Diagnósticos por item, debug, logs correlacionados, policy readiness, protected resources, sandbox e telemetria sem segredo. | **13** | 08/09 |

## 3. Donos por fatia

### 06.4c — Provedores
- Tela/base de OpenAI, Gemini e Ollama local.
- Seleção de modelo e estados básicos.
- Não prometer BYOK completo: segurança/runtime/Agent Host pertencem a 08/09/13.

### 07 — Tools CRUD & Filesystem
- Registry e execução real de tools.
- Filesystem CRUD, glob/grep e upload.
- Schemas, progresso, cancelamento e grupos básicos.

### 08 — Permissões & Proteção
- Trust, credenciais, risco e aprovação.
- Doom loop, sandbox, timeout, limites e supply-chain safety.
- Política transversal para tools, hooks, MCP, scripts de Skills e Plugins.

### 09 — Runtime IA & Erros & Reset
- Lifecycle de tools e enablement real.
- MCP por `.vscode/mcp.json`.
- Runtime de Hooks.
- Browser/CDP, NDJSON, autenticação/conexão, erros e reset.

### 10 — Personalizações, Skills & Memória
- Agentes, Skills, Instruções, Prompt Files e memória.
- Configuração de Hooks e Plugins.
- Registry de customizações, roots, precedência, parsers, watcher e CRUD.
- Marketplace, migrações, editor/preview/override e diagnósticos funcionais.

### 11 — Worktree Opcional
- Roots/watchers/customizações seguem `worktreePath ?? workspacePath`.
- Nenhum vazamento de cache, processo, MCP ou configuração entre sessões.

### 12 — Polish Visual & Ruflo
- Fidelidade da Visão Geral e páginas list/detail.
- Tokens `--vscode-*`, teclado, ARIA, foco, virtualização e desempenho.
- Não usar polish para mascarar backend mockado.

### 13 — Agent Host & Multi-host
- Processo isolado e protocolo versionado/autenticado.
- Multi-janela/multi-host, background e remote sessions.
- Sync de customizações, roots, tools e permissões.
- Providers nativos, conectores, observabilidade e BYOK integrado.

## 4. Dependências obrigatórias

1. **D39–D47 precisam ser decididas antes do código correspondente.**
2. Registry e segurança vêm antes de Marketplace/plugins/hooks executáveis.
3. Tool Registry da 07 vem antes do MCP/runtime completo da 09.
4. Trust e credential store da 08 vêm antes de BYOK, MCP autenticado e conectores.
5. Registry de customizações da 10 vem antes de sincronização multi-host da 13.
6. A Fatia 11 deve consumir o mesmo contrato de roots da D47; não criar descoberta paralela.
7. A Fatia 12 só fecha após estados reais substituírem fixtures nas áreas implementadas.

## 5. Ordem final de implementação

1. Deliberar D39–D47.
2. Fatia 07: registry/schema/progresso/cancelamento e tools CRUD.
3. Fatia 08: trust, permissões, credential store, risco e sandbox.
4. Fatia 09-A: runtime IA/NDJSON e lifecycle de tools.
5. Fatia 09-B: MCP real, autenticação, status/logs e runtime de Hooks.
6. Fatia 10-A: registry, roots, precedência, watcher, parsers e diagnósticos.
7. Fatia 10-B: Instruções/AGENTS.md e Prompt Files.
8. Fatia 10-C: Skills agentskills.io e memória.
9. Fatia 10-D: Agentes e Hooks config.
10. Fatia 10-E: Plugins, Marketplace, migrações e editor/override.
11. 06.4c + 09: provedores/modelos e BYOK local mínimo, somente se aprovado.
12. Fatia 11: integração com worktree opcional.
13. Fatia 12: fidelidade, acessibilidade, desempenho e homologação.
14. Fatia 13: Agent Host, multi-host, background/remote, conectores e BYOK completo.

## 6. Critérios gerais de pronto

- Nenhuma fixture é fonte de produção.
- Troca de sessão troca roots, watchers, tools, MCP e customizações sem vazamento.
- F5 não duplica item, watcher, host ou subprocesso.
- Arquivo inválido gera diagnóstico local sem derrubar a seção.
- Escrita e migração são atômicas; conflito não sobrescreve silenciosamente.
- Conteúdo descoberto não executa sem trust e política aplicável.
- Segredos não entram em DOM, SQLite, JSONL, repositório, logs ou telemetria.
- Processo/subprocesso possui timeout, cancelamento e cleanup.
- UI funciona por teclado, possui ARIA, foco previsível e tokens `--vscode-*`.
- Logs correlacionam sessão/request/tool sem conteúdo sensível por padrão.

## 7. Estado deste plano

- **18 gaps:** aprovados documentalmente.
- **Donos/fatias:** documentados em `docs/06`.
- **Fatia 13:** acrescentada ao roadmap documental.
- **D39–D47:** registradas em `docs/05` como **PROPOSTAS, não fechadas**.
- **Código do `workbench-v2`:** não alterado.
- **Próximo avanço:** somente após novo OK explícito do usuário.
