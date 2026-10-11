# Relatório de verificação de gaps — Personalizações e Agent Host

**Data:** 2026-10-10  
**Escopo:** DOM extraído de `personalizacoes/vscode_agents_mockup_interativo (1).html`, `platform/apps/workbench-v2`, `docs/06` e código-fonte `microsoft/vscode` `main`.  
**Commit do VS Code pesquisado:** `cc3fec8846d0e678357e476fa611774da26d7e24` (clone raso temporário, removido ao fim).  

## 1. Método e limites

1. O HTML foi tratado como captura do DOM/renderização recebida, útil para confirmar textos, seções e estados visíveis.
2. O `workbench-v2` foi pesquisado por UI, domínio, dados, servidor, testes e integrações reais.
3. O `microsoft/vscode main` foi clonado e pesquisado em `src/vs/workbench/contrib/chat` e `src/vs/platform`, incluindo Agent Host, AI Customizations, prompt syntax, plugins, MCP, ferramentas e BYOK.
4. O `main` pesquisado é mais novo e mais amplo que a referência VS Code 1.135 do projeto. Ele prova contratos existentes no código atual do VS Code, mas recursos exclusivos do `main` não devem ser retroativamente chamados de comportamento da versão 1.135 sem nova prova.
5. “Gap” neste relatório significa ausência de função real equivalente. Uma maquete, tipo TypeScript, lista estática ou teste de domínio não fecha o gap de descoberta, persistência, execução e segurança.

## 2. Resultado executivo

Os **11 gaps informados foram confirmados como gaps funcionais reais**. Porém, sete deles já têm parte da casca visual/domínio mockável no `workbench-v2`: Agentes, Skills, Instruções, Prompt Files, MCP, Hooks e Plugins aparecem na superfície `AI Customizations`; Ferramentas também têm representação estática. Isso reduz trabalho visual, mas não entrega leitura do disco, watcher, CRUD real, integração com runtime, permissões ou execução.

Foram encontrados **7 blocos adicionais** que não estavam explicitamente na lista inicial:

1. escopos, precedência e compatibilidade por harness;
2. descoberta/Marketplace, instalação, atualização, reparo e desinstalação;
3. migração de Prompt Files e dados de usuário;
4. editor real de customizações, preview estruturado e override;
5. enablement efetivo e sincronização com o runtime;
6. conectores/credenciais e estado de conexão;
7. diagnóstico, políticas, sandbox, telemetria e observabilidade do Agent Host.

Recomendação: **não criar uma Fatia 13 só para a tela de Personalizações**. Distribuir o núcleo entre 07–10 e deixar integração avançada do Agent Host/multi-host como **nova Fatia 13**, porque esse trabalho envolve processo separado, protocolo, autenticação, sincronização e ciclo de vida — não apenas polish.

## 3. Confirmação dos 11 gaps

| # | Gap | Estado no `workbench-v2` | Evidência no HTML/original | Evidência no VS Code `main` | Veredito | Dono sugerido |
|---|---|---|---|---|---|---|
| 1 | **Agentes personalizados** | Seção, itens mock e filtro existem em `aiCustomizationsData.ts`, `aiCustomizations.ts` e `CustomizationsView.tsx`; não há descoberta/CRUD de arquivos nem agente executável. | “Agentes”, “New Agente (Workspace)”, empty state, descrição de persona/instruções/ferramentas/comportamento. | `PromptsType.agent`, `.github/agents/*.agent.md`, criação/edição, providers e sincronização com Agent Host. | **Gap funcional confirmado; UI parcial existe.** | **10** para arquivos/descoberta; **13** para execução por Agent Host. |
| 2 | **Habilidades / Skills agentskills.io** | Lista estática e botão runnable simulado; não lê pastas, `SKILL.md`, recursos ou scripts. | “Habilidades”, Workspace/User/Built-in, contagens e skills internas; agente carrega quando relevante. | `newPromptFileActions.ts` segue agentskills.io: pasta por skill + `SKILL.md`; nome 1–64, minúsculas/números/hífens, sem hífen nas bordas ou duplicado; `.github/skills`; descoberta, enablement e execução. | **Gap funcional confirmado; maquete parcial existe.** | **10**. |
| 3 | **Instruções / AGENTS.md** | Dois registros mock; sem leitura, hierarquia, precedência ou aplicação ao prompt. O `AGENTS.md` atual do repositório é regra para IAs, não implementação do produto. | “Instruções”, `AGENTS.md`, Workspace/User e aplicação automática. | `AGENT_MD_FILENAME`, busca de `**/AGENTS.md`, opção para arquivos aninhados, combinação com `CLAUDE.md`, `copilot-instructions.md` e `.github/instructions/*.instructions.md`. | **Gap funcional confirmado.** | **10**. |
| 4 | **Prompt Files** | Seção `prompts` e mocks; sem `.prompt.md`, criação, execução ou migração. | Ação “Migrate Prompt Files”; prompts não aparecem como seção principal no DOM, mas entram no fluxo de migração. | `.github/prompts`, create/run/save-as, pickers, rewriter e conversão para skills. | **Gap funcional confirmado.** | **10**. |
| 5 | **MCP `.vscode/mcp.json`** | Dois servidores mock e filtro por coleção; não lê JSON, inicia processo/transporte, autentica, expõe tools nem observa estado. | Lista, Browse Marketplace, desabilitado, vazio e detalhe; descrição de ferramentas/serviços externos. | Testes e suporte usam `.vscode/mcp.json`; Agent Host recebe servidores, respeita escopo/coleções, compatibilidade, auth e migração. | **Gap funcional confirmado.** | **09** runtime/protocolo; **08** consentimento/segredos. |
| 6 | **Ferramentas específicas do mockup** | As tools CRUD planejadas ainda não estão implementadas como runtime de agente; Customizations mostra itens estáticos. | Grupos Copilot, VS Code, Navegador Integrado e extensões; toggle por grupo; bash, create/edit/view, agentes/subagentes, skill, web, browser/Playwright. | `languageModelToolsService`, tool sets, picker, confirmação, risco, compressão de resultado, ferramentas client-side e Agent Host. | **Gap funcional confirmado.** | **07** ferramentas; **08** risco/permissões; browser/CDP em **09**. |
| 7 | **Hooks / Ganchos** | Um `pre-commit` mock; não lê configuração nem dispara eventos. | “Configure Hooks”, estado vazio e comandos em pontos do ciclo de vida. | `hooks.json`, ações, debug renderer, eventos do runtime; plugins também contribuem hooks. | **Gap funcional confirmado.** | **10** configuração/descoberta; execução e isolamento em **09/08**. |
| 8 | **Plugins `plugin.json`** | Domínio e discovery mockáveis, prioridade, enablement e projeção de contribuições; não lê disco/rede nem instala pacote. | Browse Marketplace, instalar da origem, disabled/empty; plugin agrega tools, skills, agents, hooks e MCP. | Suporta `plugin.json`, `.plugin/plugin.json` e `.claude-plugin/plugin.json`; criar plugin, instalar, atualizar, fontes, Marketplace, validação de portabilidade e colisões. | **Gap funcional confirmado; modelo parcial é aproveitável.** | **10** catálogo/contribuições; **08** confiança; **13** integração multi-harness. |
| 9 | **Personalizações — Visão Geral** | Existe uma view própria, mas o layout é árvore simples com select de harness e busca; não replica overview, cards, páginas de seção, detalhes e ações New/Browse. | Navegação lateral, contagens, Overview, cards, New/Browse, empty/disabled/detail e editor embutido. | `aiCustomizationManagementEditor`, discovery page, list widgets, detail editors, toolbar, breadcrumbs/back e Marketplace. | **Gap de produto/layout confirmado; fundação parcial existe.** | **12** para fidelidade; funções pertencem às fatias 09/10. |
| 10 | **Rubber Duck + multi-janela Agent Host** | Há providers estáticos `Agent Host`/`Local Agent Host` e modelos de sessão, mas nenhum processo Agent Host, AHP, endpoint local, outra janela, background agent real ou sincronização. | DOM mostra delegação a `@agent-host-claude`, sessão em segundo plano e configuração do Host. | `src/vs/platform/agentHost`; processo separado; AHP; WebSocket por Unix socket/named pipe; descoberta de múltiplos hosts/janelas; providers Copilot/Claude/Codex; sessões, peer chats, background shells e remote host. | **Gap arquitetural confirmado.** | **Nova 13 — Agent Host & Multi-host**. |
| 11 | **BYOK** | 06.4c só planeja provedores; não há armazenamento seguro de chave, catálogo real de modelos, conexão, health check, capability negotiation ou envio ao runtime. | “No models available” e configurações de host; BYOK não está claramente provado pelo trecho visual, mas é confirmado no código `main`. | `agentHostByokLmHandler.ts`, `AgentHostByokModelsEnabledConfigKey`, default utility model e aviso para remote BYOK; modelos vêm de providers/extensões. | **Gap funcional confirmado pelo `main`; evidência visual limitada.** | **06.4c** UI básica; **09** runtime; segredos em **08**; integração Agent Host em **13**. |

## 4. Requisitos extraídos por área

### 4.1 Agentes

**Funcionais**
- Descobrir agentes de workspace e usuário; mínimo compatível: `.github/agents/*.agent.md`.
- Criar, listar, abrir, editar, excluir, habilitar/desabilitar e selecionar agente.
- Metadados: nome, descrição, instruções, ferramentas permitidas e comportamento/modo.
- Resolver colisões e precedência por escopo/harness.
- Anexar agente selecionado à sessão e refletir no runtime.

**Não funcionais**
- Watcher de filesystem com atualização incremental.
- Parser tolerante, diagnóstico de frontmatter e falha isolada por item.
- Caminhos normalizados por `realpath`; impedir escape/traversal.
- Estado determinístico após F5.

### 4.2 Skills

**Funcionais**
- Formato pasta `<nome>/SKILL.md`, com recursos/scripts ao lado.
- Validar nome conforme agentskills.io: 1–64, `[a-z0-9-]`, sem hífen inicial/final e sem `--`.
- Descobrir ao menos `.github/skills`, e só adicionar caminhos globais após decisão explícita.
- Mostrar Workspace/User/Built-in/Plugin, descrição, origem, estado e conflitos.
- Carregar skill sob demanda e disponibilizar ferramenta `skill`/equivalente no runtime.
- Criar/mover/copiar/excluir a pasta completa.

**Não funcionais**
- Lazy load do corpo/recursos; cache invalidado por watcher.
- Limites de tamanho, timeout de scripts, sandbox e permissão explícita.
- Não confiar em symlink para fora das raízes permitidas.

### 4.3 Instruções

**Funcionais**
- Ler `AGENTS.md` raiz e aninhados; decidir e documentar se aninhados valem por subárvore.
- Compatibilidade opcional: `CLAUDE.md`, `.github/copilot-instructions.md` e `.github/instructions/*.instructions.md`.
- Resolver ordem e precedência entre workspace, pasta, usuário, plugin e built-in.
- Mostrar origem e preview do conjunto efetivamente aplicado à sessão.

**Não funcionais**
- Orçamento de tokens e deduplicação.
- Explicabilidade: quais arquivos entraram no prompt e por quê.
- Erro de um arquivo não pode apagar instruções válidas restantes.

### 4.4 Prompt Files

**Funcionais**
- Descobrir `.github/prompts/*.prompt.md`.
- Criar, editar, executar e “salvar como”.
- Migrar prompt para skill com preview, destino Workspace/User e relatório de mudanças.

**Não funcionais**
- Migração idempotente, sem sobrescrever silenciosamente.
- Backup ou confirmação em conflito.

### 4.5 MCP

**Funcionais**
- Ler e validar `.vscode/mcp.json`.
- CRUD de servidores; stdio e HTTP quando suportados.
- Start/stop/restart, status, logs, tools publicadas e erros por servidor.
- Autenticação/segredos fora do JSON versionado.
- Ativar/desativar por sessão/harness e encaminhar ferramentas ao runtime.

**Não funcionais**
- Timeout, limite de output, cancelamento e cleanup de subprocesso.
- Consentimento antes de iniciar servidor ou expor segredo.
- Política de workspace trust e allowlist.
- Redação de segredos em log/telemetria.

### 4.6 Tools

**Funcionais**
- Registry único de tools com nome, descrição, schema, origem e capabilities.
- Grupos configuráveis e contador `habilitadas/total`.
- Tools desabilitadas não são anunciadas ao modelo.
- Separar built-in/runtime, cliente, browser e extensão/plugin.
- Confirmação, progresso, cancelamento, resultado e erro estruturado.

**Não funcionais**
- Validação de schema nos dois lados.
- Idempotência/doom-loop, limite de repetição e auditoria.
- Risco calculado por operação e recurso alvo.

### 4.7 Hooks

**Funcionais**
- Descobrir `hooks.json` em raízes aprovadas e contribuições de plugin.
- Eventos documentados do ciclo de vida; ordem, filtro, timeout e política de falha.
- CRUD/configuração, enable/disable e execução observável.

**Não funcionais**
- Shell escapado corretamente por SO.
- Sandbox, timeout, cancelamento e limite de concorrência.
- Nunca executar hook de workspace não confiável sem consentimento.

### 4.8 Plugins

**Funcionais**
- Detectar os formatos do original: `plugin.json`, `.plugin/plugin.json`, `.claude-plugin/plugin.json`.
- Fontes locais/remotas/Marketplace; instalar, atualizar, reparar e remover.
- Projetar commands/prompts/skills/agents/hooks/MCP no registry comum.
- Enablement por identidade canônica e resolução determinística de colisão.
- Validar portabilidade de comandos/cwd/env/headers MCP.

**Não funcionais**
- Assinatura/integridade, origem visível, revisão de capabilities e trust.
- Instalação atômica e rollback.
- Não executar conteúdo apenas por aparecer no catálogo.

### 4.9 Personalizações — UX

**Layout observado**
- Editor dedicado com título “Agent Customizations for Copilot [Agent Host]”.
- Navegação de seções à esquerda com contagens.
- Overview com texto introdutório e cards; ações `New...` ou `Browse...`.
- Página de lista por seção; agrupamento por origem; empty e disabled states.
- Detail pane/editor embutido; back navigation.
- Tools em árvore por grupo, chevron, contador e toggles.

**Requisitos**
- Usar tokens `--vscode-*`, teclado, foco, ARIA e virtualização para listas grandes.
- Estado selecionado e scroll restaurados.
- Busca/filtro sem bloquear a UI.
- Não misturar “há UI” com “runtime conectado”; estados offline/indisponível devem ser honestos.

### 4.10 Agent Host, multi-janela e BYOK

**Funcionais**
- Processo separado do renderer, protocolo versionado e restart supervisionado.
- Transporte local autenticado; no `main`, Unix socket/named pipe e catálogo de hosts vivos.
- Múltiplos providers/harnesses e sessões em background.
- Persistência canônica de sessão/chat; descoberta sem duplicar backing chats internos.
- Sincronização de cwd, customizações, tools, permissões e modelo.
- BYOK: catálogo de modelos, seleção, capabilities, chave segura, teste de conexão e fallback explícito.

**Não funcionais**
- Isolamento de falhas: crash do host não derruba a janela.
- Backpressure, cancelamento, reconnect, heartbeat e version negotiation.
- Identidade/autorização por host; impedir outro usuário/processo de acessar a sessão.
- Segredos no credential store do SO, nunca SQLite/JSONL/log.
- Observabilidade com correlação session/request/tool, mas sem conteúdo sensível por padrão.

## 5. Novos gaps além dos 11

| # | Gap adicional | O que falta no nosso | Evidência no original/`main` | Dono |
|---|---|---|---|---|
| A | **Escopos, fontes, precedência e harness** | Há filtro mock por harness, mas não há roots reais, precedência, colisão ou sync. | Workspace/User/Extension/Plugin/Built-in; providers fornecem diretórios e capabilities diferentes. | 10 + 13 |
| B | **Marketplace e ciclo de instalação** | Nenhuma rede, catálogo, install/update/repair/uninstall. | Discovery page, Marketplace providers, estados checking/repairing/uninstalling/error e plugin sources. | 10; segurança em 08 |
| C | **Migrações** | Não há Migrate Prompts nem Migrate User Data. | HTML mostra ambas; `aiCustomizationManagementEditor` escolhe destino e faz preview/conversão. | 10 |
| D | **Editor/preview/override real** | A lista não abre fonte nem salva alteração. | Preview estruturado, View Raw/Edit Source, save override Workspace/User e autosave/erro. | 10; acabamento em 12 |
| E | **Enablement sincronizado** | Toggle altera apenas estado React/mock. | Itens e grupos desabilitados deixam de ser anunciados ao agente; sync com Agent Host. | 09/10 |
| F | **Conectores e credenciais** | Ausente. | `embeddedConnectorDetail`; estados disconnected/checking/reconnecting/error/connected e credenciais do remote host. | 09 + 08 + 13 |
| G | **Diagnóstico, políticas e observabilidade** | Ausente para agentes/customizações. | debug panel, hook/tool renderers, logs, policy readiness, sandbox, protected resources e OTel do Agent Host. | 08/09/13 |

## 6. Inventário final consolidado

### Já existe de forma reutilizável
- `CustomizationsView.tsx`: superfície básica, busca, seção, agrupamento e toggle.
- `domain/aiCustomizations.ts`: contratos de seção, fonte, harness, enablement e modelo de gestão.
- `domain/agentPlugins.ts`: discovery abstrata, prioridade, colisão, enablement e projeção.
- `agentPluginsData.ts` e `aiCustomizationsData.ts`: fixtures úteis para testes, não backend.
- Modelos de sessões/providers e nomes Agent Host/Local Agent Host.
- Explorer/filesystem e persistência de sessão, que podem sustentar watchers e escopo por workspace.

### Falta implementar de verdade
1. Registry backend de customizações por workspace/usuário.
2. Watcher + parsers + diagnósticos para agentes, skills, instruções, prompts e hooks.
3. CRUD atômico e editor/preview.
4. Registry real de tools e integração ao modelo.
5. MCP runtime e lifecycle.
6. Segurança, trust, permissões e credential store.
7. Plugins/Marketplace e supply-chain safety.
8. Runtime de hooks.
9. Migrações.
10. Agent Host process/protocol/multi-host.
11. BYOK completo.
12. UX final fiel e acessível.

## 7. Sugestão de dono por fatia

| Fatia | Conteúdo recomendado |
|---|---|
| **06.4c** | Tela de provedores: OpenAI/Gemini/Ollama, base da seleção de modelo e estados; sem prometer BYOK completo. |
| **07** | Registry e execução de Tools CRUD/filesystem; schemas, progress/cancel, tool groups básicos. |
| **08** | Permissões, workspace trust, segredos, risco, aprovação, doom loop, sandbox e política para hooks/MCP/plugins/tools. |
| **09** | Runtime IA, MCP, NDJSON, tools conectadas, hooks execution, browser/CDP, erro/reset e enablement propagado ao runtime. |
| **10** | AI Customizations funcional: agentes, skills, instruções, prompts, memória, parsers, watcher, CRUD, migrações, plugins/catalog/Marketplace e escopos. |
| **11** | Worktree opcional; apenas garantir que roots/watchers/customizações acompanhem a raiz efetiva da sessão. |
| **12** | Fidelidade do editor de Personalizações, overview/cards/list/detail, tokens, acessibilidade, desempenho e release gate. |
| **Nova 13** | Agent Host & Multi-host: processo isolado, AHP/transporte, múltiplas janelas/hosts, background/remote sessions, sync de customizações, providers nativos e BYOK integrado. |

## 8. Onde atualizar `docs/06` e `docs/05` depois da aprovação

### `docs/06 - PROXIMAS FASES E DIVIDAS.md`

Atualizar a tabela 07–12 e acrescentar Fatia 13:

- **07:** explicitar registry/schema/progresso/cancelamento de tools.
- **08:** incluir trust, credential store, sandbox e supply-chain para hooks/MCP/plugins.
- **09:** explicitar MCP `.vscode/mcp.json`, runtime de hooks, propagação de enablement e tool lifecycle.
- **10:** substituir “Skills & Memória” por escopo detalhado de Personalizações: Agents, Skills, Instructions, Prompt Files, Hooks config, Plugins e migrações.
- **12:** limitar a layout/acessibilidade/polish da superfície, sem esconder backend pendente.
- **13:** Agent Host & Multi-host, incluindo BYOK integrado.
- Corrigir o registro anterior que deixava Agentes/Hooks/Plugins “sem dono”. Este relatório fornece donos.

### `docs/05 - DECISOES.md`

Decisões novas recomendadas, ainda **não tomadas**:

1. **Contrato de roots e precedência** por tipo e harness.
2. **Compatibilidade de formatos**: `.github/*`, AGENTS/CLAUDE/Copilot, três manifests de plugin.
3. **Registry único** de customizações e tools; UI não pode consumir fixtures em produção.
4. **Credential store** e regra de nunca persistir chaves em SQLite/JSONL/repositório.
5. **Workspace trust/sandbox** para hooks, MCP, plugins e scripts de skills.
6. **Process boundary do Agent Host**, protocolo, autenticação local e política multi-janela.
7. **BYOK**: providers suportados, capabilities, fallback, health check e tratamento de custo/rate limit.
8. **Migração e colisão**: idempotência, backup, precedência e override.
9. **Watcher/realpath/symlink policy** alinhada à D38 e ao workspace ativo da sessão.

Nenhuma dessas decisões deve ser registrada como fechada sem aprovação explícita.

## 9. Ordem recomendada de implementação

1. **Decisões/contratos:** roots, precedência, trust, registry, manifests e segredos.
2. **Fatia 07:** Tool Registry e CRUD/filesystem reais, com schema/progress/cancel.
3. **Fatia 08:** permissões, risco, trust, credential store e sandbox transversal.
4. **Fatia 09-A:** runtime IA e protocolo NDJSON com lifecycle de tool.
5. **Fatia 09-B:** MCP `.vscode/mcp.json`, status/log/auth e tool publication.
6. **Fatia 10-A:** registry de customizações, watcher, fontes e diagnósticos.
7. **Fatia 10-B:** Instruções/AGENTS.md e Prompt Files.
8. **Fatia 10-C:** Skills agentskills.io e memória.
9. **Fatia 10-D:** Agentes e Hooks config; execução dos hooks apoiada em 09/08.
10. **Fatia 10-E:** Plugins, Marketplace e migrações.
11. **Fatia 06.4c + 09:** providers/modelos e BYOK local mínimo, se aprovado.
12. **Fatia 11:** integração dos roots com worktree opcional.
13. **Fatia 12:** layout fiel, acessibilidade, performance e homologação.
14. **Fatia 13:** Agent Host/multi-host/background/remote e BYOK completo.

## 10. Critérios mínimos de aceite transversais

- Fixtures não aparecem em produção quando o backend estiver habilitado.
- Troca de sessão troca roots, watchers, tools, MCP e customizações sem vazamento entre workspaces.
- F5 restaura estado sem duplicar item/processo.
- Arquivo inválido gera diagnóstico localizado; não derruba toda a seção.
- Operações de escrita são atômicas e conflitos não sobrescrevem silenciosamente.
- Hooks/scripts/MCP/plugins não executam sem trust e política de permissão.
- Segredos nunca aparecem em logs, JSONL, SQLite, DOM ou telemetria.
- Todos os processos/subprocessos têm timeout, cancelamento e cleanup.
- UI funciona por teclado, possui ARIA, foco previsível e tokens `--vscode-*`.
- Logs correlacionam sessão/request/tool sem conteúdo sensível por padrão.

## 11. Conclusão

Os 11 gaps são reais no nível funcional. O projeto já antecipou parte importante do domínio e da UI de AI Customizations e Plugins, portanto não deve recomeçar do zero. A prioridade é substituir fixtures por um registry real e construir segurança/runtime antes do polish. Os gaps adicionais mostram que a tela do mockup é apenas a superfície de um subsistema maior. Fatias 07–10 comportam o núcleo; a arquitetura de Agent Host multi-processo/multi-janela e BYOK integrado justifica uma Fatia 13 própria.
