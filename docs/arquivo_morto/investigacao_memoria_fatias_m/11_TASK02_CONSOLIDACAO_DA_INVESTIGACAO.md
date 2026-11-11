# 11 — TASK 02 · Consolidação da investigação de memória e contexto

**Data:** 2026-10-30 (America/Sao_Paulo)
**Natureza:** relatório de consolidação. **Não é arquitetura nova, não é decisão, não é homologação.**
**Autorização:** Task 02 da missão "AGENTE WINDOW — TASK 02 + TASK 03".
**Limites respeitados:** nenhum código-fonte alterado · nenhuma documentação canônica (`docs/01`–`09`) alterada · nenhum roadmap alterado · nenhum commit · nenhum push · nenhuma dependência instalada no projeto.
**Entrega irmã:** [`12_TASK03_PROPOSTA_FATIAS_M1_M8.md`](12_TASK03_PROPOSTA_FATIAS_M1_M8.md) (Task 03 — proposta técnica). Esta Task 02 é a **única base de evidência** da Task 03.

---

## 0. Estado real do repositório no início desta missão (verificação pedida no item 1)

| Item | Estado verificado | Como foi verificado |
|---|---|---|
| Branch | `main` | `git branch --show-current` |
| HEAD | `fe218b8` — *"chore: init projeto agente_window"* | `git log --oneline` |
| Histórico | **1 commit apenas.** O `.git` original foi apagado e o repositório foi reinicializado por ordem do dono nesta mesma sessão, antes desta missão. O histórico anterior (≈300 commits citados nos canônicos) **não existe mais nesta cópia** | `git log` |
| Remote | **nenhum** (`git remote -v` vazio) | `git remote -v` |
| Working tree | **limpa** (`git status --short` vazio) | `git status` |
| Push | **não houve** | ausência de remote |
| Origem do conteúdo | clone de `https://github.com/GuilhermeFerreira42/agente_window` | comando de clone da sessão |

### 0.1 A correção da Task 01 já está commitada? Já foi homologada oficialmente?

**Resposta curta: o código está no GitHub (portanto foi commitado e pushado pelo dono no Windows), mas a homologação oficial pelo dono NÃO está registrada na documentação canônica.**

Evidência de que **o código da Task 01 está presente** neste clone (ou seja, já subiu para o GitHub):

- `src/server/session-persistence/transcripts.ts:57` → `const temporary = \`${destination}.${process.pid}.${randomUUID()}.tmp\`` (temporário exclusivo — correção H02).
- `src/server/session-persistence/transcripts.ts:9` → comentário *"The session queue separately protects catalog/revision + transcript together"* (fila por destino — H02).
- `src/services/sessions/sessionsClient.ts:52` → `SessionPersistenceError(..., 409, 'stale_session_snapshot')` (revisão monotônica — H01).
- `src/services/sessions/SessionPersistenceNotice.tsx` + `sessionRecovery.ts` + `useSessionPersistence.ts` existem, com o botão *"Save a separate copy"* e os estados `UNSAVED_AFTER_409` / `SERVER_NEWER_SNAPSHOT` (H03).
- Testes presentes: `SessionPersistenceNotice.test.tsx`, `sessionsClient.test.ts`, `session-persistence/index.test.ts`, `session-persistence/transcripts.test.ts`.

Evidência de que **a homologação oficial NÃO foi registrada**:

- `docs/03 - ESTADO ATUAL.md:3` ainda diz: *"**PRONTA PARA NOVA HOMOLOGAÇÃO INDEPENDENTE**, sem homologação oficial"* e *"correções não commitadas, sem push"*.
- `docs/07 - HISTORICO.md:6` ainda diz: *"Sem commit/push e sem homologação oficial."*
- `docs/09 - TESTES E AMBIENTE.md:915` ainda diz: *"Sem commit/push [...] não declara homologação oficial."*
- `docs/arquivo_morto/investigacao_memoria_fatias_m/CORRECAO_PERSISTENCIA.md:3` idem.

**Divergência documental registrada (não corrigida, por ordem da missão):** os quatro trechos acima descrevem o estado da **máquina do dono em 30/10** (HEAD `0dfe3c2`, árvore suja). O clone do GitHub já contém o código, logo ele foi commitado e pushado depois disso. Os canônicos estão **desatualizados em relação ao GitHub**. Corrigir isso é tarefa do dono (ou de uma missão com autorização para mexer em `docs/`), não desta.

**Sobre a "aprovação técnica independente do AntiGravity":** ela existe como artefato nesta pasta — [`HOMOLOGACAO_INDEPENDENTE_TASK_01.md`](HOMOLOGACAO_INDEPENDENTE_TASK_01.md), classificação final **"APROVADO TECNICAMENTE"**, com H01/H02/H03 aprovados individualmente, typecheck exit 0, build exit 0 (Vite 33,15 s no Windows 11), 21/21 testes focados, regressão 46✓/1✗ (falha pré-existente de CRLF em `worktrees.test.ts`), App 49✓/13 skip, ESLint focal limpo. O próprio relatório conclui: *"tecnicamente pronta para homologação oficial e autorização de commit"*.
→ **Aprovação técnica independente ≠ homologação oficial do dono.** Pela regra do projeto (`docs/08`: *"Homologado = o dono declara"*), a Task 01 está **tecnicamente aprovada, pendente de homologação oficial**. Este relatório não a declara homologada.

**Limitações que o próprio auditor independente registrou e que continuam valendo** (importam para M2/M7/M8):
1. A fila de concorrência (`withSessionPersistenceQueue`, `withTranscript`) vive **na memória do processo**. Dois servidores sobre a mesma pasta de dados **não** compartilham a fila.
2. SQLite (metadados) × JSONL (mensagens) é coordenado **sequencialmente**, não é transação distribuída: queda de energia ou `SIGKILL` exatamente entre a publicação do JSONL e o upsert do SQLite pode deixar descompasso residual.
3. O envio no `pagehide` continua sujeito às políticas e ao limite de tempo do navegador.
4. Risco residual: quota de `localStorage` para o backup de 409; arquivos `.tmp` órfãos não têm faxina automática retroativa.

---

## 1. Como ler este relatório — critérios de evidência

Mantidos os critérios do [`00_INDICE.md`](00_INDICE.md) desta pasta, com dois acréscimos:

| Rótulo | Significado |
|---|---|
| **Confirmado em código (nosso)** | caminho + símbolo/linha lidos no clone atual do Agente Window |
| **Confirmado em código (referência)** | caminho + símbolo lidos no snapshot fixado da referência |
| **Confirmado em documentação** | texto oficial do fornecedor/projeto |
| **Medido** | execução real com número registrado (nossa ou de relatório anterior) |
| **Secundário** | fonte de terceira parte (blog/imprensa) — **não** é documentação oficial |
| **Inferência** | interpretação fundamentada, não demonstrada |
| **Não localizado** | não encontrado no escopo inspecionado; **não** é prova de inexistência |
| **Hipótese** | precisa de validação antes de virar decisão |

Regra da casa, aplicada aqui: **história ≠ norma** e **documentação oficial descreve disponibilidade, não comportamento verificado**.

---

## 2. O que já existe no Agente Window (confirmado em código, 30/10/2026)

### 2.1 Persistência — o que está pronto e é reutilizável

| Capacidade | Onde | Estado |
|---|---|---|
| Catálogo de sessões em SQLite/WAL | `src/server/session-persistence/database.ts:25-26` (`journal_mode = WAL`, `foreign_keys = ON`) | **Confirmado.** Tabela `sessions` guarda metadados/JSON **sem** arrays de mensagens |
| Transcript JSONL por projeto/sessão | `transcripts.ts` (`readTranscript`, `writeTranscript`, `deleteTranscript`) | **Confirmado.** Temporário exclusivo `.<pid>.<uuid>.tmp` com flag `wx` + `rename` no mesmo diretório |
| Fila por sessão e por destino | `index.ts` (`withSessionPersistenceQueue`), `transcripts.ts` (`withTranscript`) | **Confirmado.** PUT/GET/DELETE da mesma sessão serializados; **só em memória do processo** |
| Revisão monotônica / 409 | `index.ts` + `sessionsClient.ts:52` (`stale_session_snapshot`) | **Confirmado.** Snapshot antigo é recusado explicitamente |
| Recuperação de conflito visível | `SessionPersistenceNotice.tsx`, `sessionRecovery.ts`, `useSessionPersistence.ts` | **Confirmado.** Aviso persistente + backup em `localStorage` (`workbench.sessions.unsaved.v1`) + "Save a separate copy" |
| **Identidade de projeto já existe** | `types.ts:97` → `slug?: string` — *"Stable filesystem-safe project key used by SQLite and JSONL storage"* | **Confirmado.** Ver §2.5 |
| Diretório por projeto já existe | `paths.ts` → `~/.agente_window/projects/<slug>/`; `getDatabasePath()` → `~/.agente_window/agente_window.db` | **Confirmado.** `resolveProjectDir()` tem guarda anti-traversal |
| Grants/permissions server-side | casa Agir + F1 (D103/D104/D119) | **Confirmado em docs + código.** Autoridade é o servidor, não o cliente |

### 2.2 Lacuna central nº 1 — o transcript não guarda a troca de ferramentas

**Confirmado em código:**

- `types.ts:12-28` — `FerramentaNoChat` tem: `id`, `ferramenta`, `alvo`, `previa?`, `status`, `allowSession?`, `progresso?`, `resumo?`, `ordem?`.
  → **Não tem** os argumentos completos do pedido, **não tem** o resultado completo, **não tem** `toolCallId` do protocolo.
- `App.tsx:1678-1681` — `montarHistorico` filtra `running`/`cancelled`/`erro`/vazio e reduz cada mensagem a `{ role, content }`.
- `App.tsx:2066-2068` — o request é `[..., ...montarHistorico(chat.messages), { role:'user', content }]`.
- `bairros/2-inteligencia/casas/agir/contract.ts:72-81` — `MensagemAgir` **é fiel**: `papel: 'usuario'|'assistente'|'ferramenta'`, `pedidos?: PedidoFerramenta[]`, `pedidoId?`, `ferramenta?`. É o "eco fiel do que ela disse, para a próxima iteração reconstruir o diálogo".
- `contract.ts:105-116` — `EventoAgir.tool_result` carrega apenas `{ id, ferramenta, ok, resumo }`. O resultado completo **não** trafega no fio.

**Conclusão (a mesma do [`07_MATRIZ_COMPARATIVA.md`](07_MATRIZ_COMPARATIVA.md), agora com linha de código):** `MensagemAgir` existe **só dentro de um run**, em memória. Quando o run termina, o que sobra no JSONL é o **cartão de UI**. O turno seguinte de uma conversa nova recebe apenas bolhas `role/content`. **Não há replay protocolar de tool calls/results entre turns.**

> Isto **não** é um defeito declarado: é o desenho atual (decisão G5 — "a tela manda o histórico visível"). Mas é o gargalo real para M2/M3/M6/M7, porque **nenhuma** camada de memória pode reconstruir o que não foi gravado.

### 2.3 Lacuna central nº 2 — o indicador de contexto é sintético

**Confirmado em código:**

- `components/ChatInput.tsx:177` → `const contextPercent = Math.min(92, 18 + Math.round(text.length / 9) + attachments.length * 4)`
- `ChatInput.tsx:800-803` → renderizado como *"{contextPercent}% do contexto utilizado"* com barra de progresso.

É uma fórmula sobre **o tamanho do rascunho digitado e o número de anexos**. Não considera: histórico da conversa, system prompt, tool schemas, tool results, iterações do Agir, limite do modelo, nem nenhum `usage` de provedor.

**Confirmado em código — o que NÃO existe:**

- `grep -rn "usage|prompt_eval_count|usageMetadata" bairros/2-inteligencia/casas/` → **1 único hit**, dentro de um **teste** (`conversa/__tests__/conversar.test.ts:174`, um `message_start` com `usage: {}` vazio num fixture Anthropic). **Nenhum código de produção lê `usage`.**
- `conversa/contract.ts:60-71` → `AlvoConversa` tem `providerId, modelId, protocolo, baseUrl, modelo, apiKey, temperatura?, maxSaida?`. **Não tem `contexto`.**
- `conversa/contract.ts` → `EventoChat = chunk | done | error`. **Não tem evento de uso/contexto.**
- `agir/contract.ts:118-124` → `RespostaIteracao = { texto, pedidos, modelo? }`. **Não tem `usage`.**

**Confirmado em código — o que JÁ existe e ninguém está usando (achado novo desta Task 02):**

- `bairros/2-inteligencia/casas/provedores/contract.ts:27` → `padroes: { contexto: number; maxSaida: number; temperatura: number }`
- `provedores/contract.ts:48` → `contexto?: number` (configurável por provedor salvo)
- `provedores/server/providersRepo.ts:132-133` → valida e normaliza `contexto` vindo do arquivo
- `providersRepo.ts:324` → `contexto: salvo.contexto ?? descritor.padroes.contexto`
- `provedores/descritores/nativos.ts` → **os 8 descritores já declaram janela**: OpenAI 128000 · NVIDIA 128000 · Anthropic 200000 · Gemini 1000000 · Ollama 32768 · OpenRouter 128000 · DeepSeek 128000 · openai-compat 128000.

> **Consequência direta para M1:** o **denominador já existe, é configurável, tem default por provedor e já é validado/normalizado**. Ele simplesmente **não chega** ao `AlvoConversa` nem à UI. M1 **não precisa inventar limite** — precisa (a) propagar `contexto` pelo alvo, (b) capturar `usage` por protocolo, (c) trocar a fórmula sintética por estado honesto. Isso é muito mais barato do que o estudo de 22/10 estimava.

### 2.4 Lacuna central nº 3 — continuidade operacional é volátil

**Confirmado em código:** `bairros/2-inteligencia/casas/agir/server/rotas.ts`

```
91: const permissoesPorFluxo   = new Map<string, Set<string>>()
92: const contextoPorFluxo     = new Map<string, ContextoFluxo>()
93: const execucaoPorFluxo     = new Map<string, ExecucaoAgir>()
94: const execucaoPorId        = new Map<string, ExecucaoAgir>()
95: const geracaoPorFluxo      = new Map<string, number>()
108:  pendentes: new Map()
109:  aguardandoComando: new Map()
158: const retomarPorFluxo     = new Map<string, { mensagens: MensagemAgir[]; contexto: ContextoFluxo; alvo: AlvoConversa }>()
```

Sete estruturas em memória de processo. `retomarPorFluxo` guarda **as `MensagemAgir` fiéis** — ou seja, a informação necessária para continuar existe, mas **morre com o processo**. As salvaguardas já implementadas (e que M7 deve preservar, não reinventar):

- `rotas.ts:622-628` → retomada inexistente ⇒ erro; já em curso ⇒ `409 already_running`.
- `rotas.ts:633-638` → a retomada **revalida** `sessionId`, `chatId`, `raiz`, **modo** e **permissão efetiva**. Se qualquer um divergiu, recusa.
- `rotas.ts:658` → verificação de identidade do objeto (`retomarPorFluxo.get(fluxo) !== retomada`) antes de executar.

> M7 **não** parte do zero: o contrato de "continuar" já valida contexto e autorização. O que falta é **sobreviver ao restart** e **distinguir resultado conhecido de indeterminado**.

### 2.5 Achado novo — a identidade de projeto já existe, mas é frágil

**Confirmado em código:**

- `index.ts:154` → `const slug = session.slug || sanitizePath(session.workspacePath)`
- `paths.ts:30-34` → `sanitizePath()` substitui tudo que não é `[a-zA-Z0-9]` por `-`, trunca em 80 chars e acrescenta um hash FNV-1a de 8 hex quando truncou.
- `index.ts:288` → no modo worktree, o `slug` **é preservado** (`input.slug || workspace.slug`) — bom.

**O problema (Inferência de alta confiança, comprovável por inspeção):** o `slug` deriva do **caminho do workspace**, não da raiz do Git nem de um ID de projeto explícito. Logo:

| Situação | Efeito |
|---|---|
| Mesmo repo aberto de dois caminhos (`C:\projetos\app` e `C:\work\app`) | **dois slugs → dois projetos** |
| Repo movido/renomeado | **slug novo → histórico órfão** |
| Pasta diferente sem Git | slug diferente (correto) |
| Sessão em worktree | slug preservado (correto) |
| Dois projetos diferentes cujo caminho sanitizado colide nos primeiros 80 chars | hash diferencia (correto) |

Para **transcript** isso é tolerável (cada sessão guarda o seu). Para **memória de projeto (M5)** e **recuperação entre conversas (M6)** isso é **estrutural**: define o que é "o mesmo projeto" e, portanto, o que pode ser compartilhado. Intersecta diretamente **D104** (*"permissões vinculadas ao workspace [...] Troca de sessão, pasta ou identidade do projeto exige revalidação"*).

→ Registrado como **DP-01** em §8. **Não foi inventada solução.**

### 2.6 O que o Agente Window NÃO tem (Não localizado, confirmado por busca)

| Ausência | Como foi verificado |
|---|---|
| Compactação / checkpoint / resumo de conversa | `grep` por `compact`, `checkpoint`, `summar`, `resumo de contexto` nas casas Conversa/Agir → nada de produção |
| Busca no transcript (manual ou pelo agente) | `05_RECUPERACAO_CONTEXTUAL.md` + inspeção: a única busca é a do módulo `explorer-search`, sobre **arquivos do workspace** |
| Memória persistente (projeto ou usuário) | nenhuma casa, nenhum arquivo em `~/.agente_window` além de `providers.json`, `agente_window.db`, `projects/<slug>/*.jsonl`, `recent-workspaces.json` |
| Camada de instruções persistentes injetadas no prompt | não localizada. `AGENTS.md` existe na raiz do repo **como documentação para IAs**, mas **não** é lido pelo aplicativo |
| Captura de `usage` de provedor | §2.3 |
| Índice derivado (FTS/qualquer) | não localizado |
| Embeddings / banco vetorial | não localizado — **e nenhuma referência auditada tem** (§3) |

---

## 3. O que foi encontrado nos projetos de referência

### 3.0 Snapshots fixados (para reconsulta)

| Referência | Snapshot | Método desta Task 02 |
|---|---|---|
| **VS Code / Copilot** | `microsoft/vscode` @ `c8a3f819b4a13366d5846a02288ab53b4d89ac50` | reaproveitado de [`02_REFERENCIAS_VSCODE_COPILOT.md`](02_REFERENCIAS_VSCODE_COPILOT.md); **sem re-auditoria** (já suficiente) |
| **OpenCode** | `anomalyco/opencode` tag `v2.2.4` @ `45898d0f8569225eb1ddb4ee13f8581b34dff311` | reaproveitado de [`03_REFERENCIAS_OPENCODE.md`](03_REFERENCIAS_OPENCODE.md); **sem re-auditoria** |
| **DeepSeek Harness** | `deepseek-ai/deepseek-harness` @ `22ddee3792402c3e70ec5f86a63c3e3e895a2f60` (o mesmo fixado em `docs/04 §1.5`) | **NOVO — investigado agora** (árvore de 21.889 entradas + 6 documentos de subsistema + 3 fontes) |
| **OpenClaude** | `Twigpine/openclaude` @ `3a8e12b804ffd9cea0662534c554aa0f38c9f642` (main, 30/10/2026) | **NOVO — investigado agora.** Substitui como estado atual os snapshots `a63ad4a` (22/10) e `cd35052` (`docs/04 §1.5`) |
| **Meta AI / Meta Muse** | sem código; produto fechado | **NOVO — só documentação secundária** (§3.5). Grau de evidência **baixo** |
| Cline · Open WebUI | commits do estudo de 22/10 | reaproveitados do `arquivo_morto/estudo_memoria_contexto_2026-10-22/03_COMPARATIVO_REFERENCIAS.md`; sem re-auditoria |

> Clone raso do OpenClaude feito em `/home/user/.cache/refs/openclaude` (55 MB) — **fora** do snapshot do workspace, conforme `docs/01 §3.B.6`. Nenhum arquivo de terceiros foi copiado para dentro do projeto.

### 3.1 VS Code / Copilot — três camadas que não se confundem

*(Consolidado de [`02_REFERENCIAS_VSCODE_COPILOT.md`](02_REFERENCIAS_VSCODE_COPILOT.md); Confirmado em código (referência).)*

1. **Memory Tool local (arquivos)** — `extensions/copilot/src/extension/tools/node/memoryTool.tsx`. Três escopos separados **por diretório**: usuário (`globalStorageUri/memory-tool/memories/`), sessão (`storageUri/.../<sessionId>/`) e repo (`storageUri/.../repo/`). `validatePath`/`_resolveUri` rejeitam caminho fora do prefixo e traversal. **Mutações pedem confirmação** (`prepareInvocation`); leitura não. `memoryCleanupService.ts` limpa memória de **sessão** com retenção de **14 dias** (não varre `repo`).
2. **Injeção parcial e assimétrica** — `memoryContextPrompt.tsx`: só as notas de **usuário** são carregadas automaticamente, e só quando `isNewChat && hasMemoryTool`, com **teto de 200 linhas**. Os nomes dos arquivos de sessão/repo são **listados**, mas o agente precisa **abrir** o que precisar. → *Auto-load caro é evitado por desenho.*
3. **Chronicle — histórico consultável pelo agente** — `platform/chronicle/node/sessionStore.ts`: SQLite, schema version 3, WAL, tabelas `sessions`/`turns`/`checkpoints`/`session_files`/`session_refs` + **índice FTS5 `search_index`**; `search()` usa `MATCH` com ordenação **BM25**. Ingestão incremental de spans OTel (`sessionStoreTracker.ts`), atrás de `chat.localIndex.enabled`. Conteúdo **deliberadamente truncado**: 1.000 chars para mensagem do usuário, 5.000 para resposta do agente, 1.000 para resumo. `sessionStoreSqlTool.ts` expõe ao modelo **SQL somente leitura** (`SELECT`/`WITH`), **limitado a 100 linhas**, exigindo authorizer do SQLite (Node 24.10+) e **falhando fechado** sem ele. Sincronização cloud é opt-in (`chat.sessionSync.enabled`, **desligado por padrão**) e o backend remoto **não está no snapshot público**.

**Copilot Memory (cloud, GitHub):** apenas **documentação**. Descreve "fatos de repositório" e "preferências pessoais" com escopos e gestão próprios, e **não promete cumprimento perfeito**. Nenhuma base de código para afirmar extração/ranking/retenção.

### 3.2 OpenCode v2.2.4 — compaction orientada a continuidade

*(Consolidado de [`03_REFERENCIAS_OPENCODE.md`](03_REFERENCIAS_OPENCODE.md); Confirmado em código (referência).)*

- **Transcript estruturado:** `packages/core/src/session/sql.ts` (`session_v2`, `session_message`, `session_part`, `session_inbox`); mensagens com `session_id`, **`seq`**, tipo e payload JSON. `store.ts` faz leitura ordenada/paginada e reconstrução de contexto. Sessão tem pai/fork.
- **Compaction:** `session/compaction.ts` — `compact`, `summarize`, `compactNatively`. Defaults no código: **`auto: true`, `keep: 15_000`, `precompute: false`**. `keep` é **orçamento em tokens** para o texto recente mantido **verbatim**. Dispara por limite/overflow ou manualmente.
- **`SUMMARY_TEMPLATE` com seções obrigatórias:** `Objective`, `Requirements`, `Decisions`, `Work State` (**Completed / Active / Blocked**), `Next Move`, `Relevant Files`, `Important Context`.
- **Degradação progressiva do input da sumarização:** transcript completo → corta saídas de ferramenta → remove/corta conteúdo de ferramenta → preserva só texto do usuário → omite turnos antigos.
- **Retomada:** `session/execution/restart.ts` — `resumeSuspendedSessions` retoma turnos órfãos e injeta aviso sintético *"The server restarted while you were working..."*. O comentário define recuperação **at-least-once** e **explicita que não impede repetição de efeitos externos**. Teto padrão de **10** retomadas; excedeu ⇒ terminaliza.
- **Busca:** `SessionStore.list` transforma `search` em **`LIKE` sobre `SessionTable.title`**. **Não localizado** índice de mensagens nem embeddings.
- **Instruções:** `session/context.ts` compõe built-ins + descoberta + skills + references + MCP + entries. A tool `read`, após leitura bem-sucedida, procura `AGENTS.md` próximo e injeta como **mensagem sintética durável** com metadata de paths; a deduplicação deriva dos synthetics visíveis, permitindo redescoberta se a compaction remover.

### 3.3 DeepSeek Harness — **achados novos desta Task 02**

*(MIT declarada no snapshot oficial, conforme `docs/04 §1.5`. Tudo abaixo é **Confirmado em código/documentação (referência)** — leitura estática, sem executar o harness.)*

#### (a) Token meter — o desenho mais maduro encontrado para M1

Fonte: `docs/subsystems/token-meter.md` + `packages/llm/token-meter/`.

- `TokenMeasurement.baseline.kind` é **`'usage'` ou `'estimated'`** — a distinção é **de tipo**, não de convenção.
  - `'usage'` só vale quando **a última chamada bem-sucedida tem o mesmo envelope canônico de request** e o total não é menor que a âncora precificada daquela chamada.
  - `'estimated'` = não existe âncora conservadora reutilizável ⇒ o serviço precifica o envelope completo ele mesmo.
- `ContextPressureProjection` tem **três campos independentes e todos opcionais**:
  - `pressureTokens` — tamanho de prompt **reportado pelo provedor** na requisição mais recente: *input não-cacheado + leituras e escritas de cache*, **excluindo a saída**, "so it does not grow as the current turn streams". **Ausente até um provedor reportar usage.**
  - `projectedTokens` — *"What the NEXT request's prompt would cost"*: `pressureTokens` **+ reprecificação heurística apenas do que a superfície ganhou ou perdeu desde aquela amostra**. **"Only the delta is estimated, so the figure stays anchored to the provider while still reacting the moment a compaction shadows a span — which `pressureTokens` alone cannot do, since compaction reports no usage of its own."**
  - `contextWindow` — *"Newest recorded route capacity; **absent when no adapter advertised one**."*
- **Honestidade explícita sobre a própria imprecisão** (citação literal do doc): *"The fields, when present, are deliberately NOT one atomic request observation: each is a last-wins record of a different moment. Switching models can therefore pair a fresh capacity with the previous route's pressure until the next request reports usage. This is an intentional trade — **the value is a user-facing reference, not a billing or gating input**."*
- `logRevision` = número de eventos duráveis consumidos para cada campo da medição (proveniência da medição).
- Precificação por rota: imagens são precificadas como tokens visuais declarados pela rota + texto visível ao modelo; rotas sem preço declarado mantêm heurística fixa. `heuristicTokens` coexiste com `tokens` em cada nó para manter o fold O(1) coerente.
- **Ausência é estado válido em todo o contrato** — nenhum campo tem default numérico inventado.

> **Por que importa:** valida e **refina** a proposta M1 de 22/10 (estados `reportado`/`estimado`/`indisponível`). O refinamento novo é o **`projectedTokens` = âncora do provedor + delta heurístico**: resolve o problema prático de que **compactação não reporta usage**, então um medidor puramente baseado em `usage` fica **cego** após compactar. (Eles têm inclusive um bug-fix arquivado chamado `2026-08-05-context-meter-blind-to-compaction.md`.)

#### (b) Compaction — `shadow` em vez de `delete`, e corte seguro por pareamento de ferramentas

Fontes: `docs/subsystems/compaction.md`, `packages/compaction/compaction/src/checkpoint.ts`, `.../tool-pairing.ts`.

- **Três eventos `compaction/*`, todos *log-only*:** não entram na superfície. `SurfaceEventType` **deliberadamente não é estendido** — só eventos que produzem mensagem chegam ao modelo.
- **A única mutação de superfície** é um `user/message` com `surfaceOp: { op: 'replace', startSeq, endSeq }`. O resumo "cavalga" numa mensagem de usuário substituta.
- **Os eventos originais são *shadowed*, não apagados.** `CompactionResult.shadowedSeqs` é *"the authoritative set of shadowed nodes, in surface order"*; `shadowedRange` é um par de **posições de superfície**, não um intervalo numérico — e o doc alerta que, após um `replace` anterior, `start` pode ser **maior** que `end`.
- **Trava de operação com detecção de crash:** `compaction/start` é anexado **primeiro**; depois sumarização, o registro `compaction/summary` e o `replace`; **só então** `compaction/end`. Citação: *"Releasing the lock last turns a crash mid-operation into a detectable orphaned lock (a `compaction/start` with no matching `compaction/end`) rather than a `compaction/end` that falsely claims compaction finished."*
- **`tool-pairing.ts` — o predicado de corte seguro, algorítmico e testável:**
  - Para cada corte de superfície, mantém `inProgressToolCalls`; `assistant/message` soma o número de blocos `tool-call`, `tool/result` subtrai 1.
  - Um corte é **balanceado** quando `inProgressToolCalls === 0` naquele ponto.
  - `toolPairingBalancedBefore(session, seq)` / `toolPairingBalancedAfter(session, seq)`.
  - **Falha fechada:** lança erro se a seq não existe na superfície, se um evento de superfície não tem evento de log correspondente, ou se um `tool/result` não tem `tool-call` aberto (*"corrupt surface"*).
  - Citação do módulo: *"Compaction changes surface positions, so **safe cuts are derived from tool-call/result content in current surface order rather than step markers**."*
  - Cache por `WeakMap<Session, BalanceCache>` com `generation` — invalida e **reconstrói** quando a geração da superfície muda; valida o trecho novo **antes** de mutar o cache vivo, *"so a corrupt append cannot leave a partially advanced state behind"*.
- **`compaction/tool-result-pruner` (serviço opcional, ANTES da sumarização):** substitui conteúdo de tool result por versão podada, **preservando o original *shadowed***. Reporta por entrada: `originalSeq`, `replacementSeq`, `callId`, `charsBefore`, `charsAfter`, e a redução agregada em code points Unicode. `compaction-basic` *"invokes optional `ctx.toolResultPruner` before range selection, remeasures through `ctx.tokenMeter`, and **can advance the surface without a summary**."*
  → **Redução de tokens sem chamar LLM nenhum.**
- **Triggers distintos:** `CompactionTrigger = 'pressure' | 'context-overflow'`; implementações *"may treat confirmed overflow more aggressively than ordinary pressure"*.
- **Fronteiras:** *"Region boundaries preserve tool-call/result pairing **but not whole turns**, allowing early closed steps of one oversized turn to compact."*
- **Taxonomia fechada de falha manual:** `'busy' | 'cancelled' | 'changed' | 'summary' | 'commit' | 'persistence'`. `changed`/`summary` fecham e persistem a tentativa falha **sem** substituição; `commit` pode seguir mutação parcial; `persistence` = a trava fechou em memória mas o flush falhou.
- **Identidade correlacionável:** `compactCheckpointSource(compactionId, sourceCommandId?)` → objeto congelado `{ kind: 'compact-checkpoint', compactionId, sourceCommandId? }`, + predicado `isCompactCheckpointSource()`. Um **único `compactionId`** correlaciona toda a vida durável da operação.
- **Compaction é *capability seam* opcional, não espinha do loop:** *"Compaction is **one optional capability**, not part of the agent-loop spine."* Service Definition (`dsh-compaction`) / Service Provider (backend, ex.: `dsh-compaction-basic`) / Consumer humano (`dsh-command-compact`). Um backend por tokenizer ou por template é **um pacote irmão implementando a mesma interface**.

#### (c) Session query — dois escopos de busca, índice **descartável**, e uma taxonomia de erro fechada

Fontes: `docs/subsystems/session-query.md`, `packages/session-query/session-query-sqlite/src/schema.ts`.

- **Dois escopos no mesmo seam:** `searchSessions()` (cross-corpus, **agrupa por sessão e ranqueia pelo evento mais forte** — `SessionSearchHit.bestMatch`) e `searchEvents(sessionId, ...)` (**dentro de uma sessão**).
  → Confirma **empiricamente** a separação que propusemos entre **M4** (dentro do chat) e **M6** (entre chats): **não é redundância, são dois escopos de um mesmo serviço.**
- **A query é DADO, nunca sintaxe:** *"Full-text query interpreted as data, **never executable FTS syntax**."*
- **Índice FTS5 concreto:** `CREATE VIRTUAL TABLE persisted_docs USING fts5(text, session_id UNINDEXED, seq UNINDEXED, type UNINDEXED, time UNINDEXED, surface UNINDEXED, codepoint_length UNINDEXED, tokenize = 'unicode61')`.
- **O índice é explicitamente descartável e reconstruível:**
  - comentário do schema: *"Current derived-index schema version. **Incompatible versions reset in place.**"* (`SESSION_QUERY_SQLITE_SCHEMA_VERSION = 8`)
  - `PRAGMA application_id = 0x44534851` protege bancos não-relacionados: se o `application_id` não bate ⇒ *"belongs to another application"*; se é 0 mas há tabelas ⇒ *"is not an empty or recognized derived index"*.
  - `assertDerivedUserTables()` recusa tabela desconhecida; `resetDerivedSchema()` dropa tudo e zera `user_version`.
  - Criação do arquivo com `open(path, 'wx', 0o600)` e diretório `mode: 0o700`.
  - Tabelas persistentes (`persisted_*`) separadas de tabelas **TEMP** de conexão (`live_sessions`, `temp.live_docs`).
- **O que contribui texto semântico (resposta direta à nossa "decisão pendente" de M4):** *"Messages, tool calls/results, todos, and failure/status detail contribute semantic text; **reasoning blocks, blocked prompts, structural events, and stream chunks do not**."*
- **Camada de superfície como filtro:** `SessionEventSurface = 'current' | 'shadowed' | 'log-only'` — é um **filtro de busca**, não só metadata.
- **Filtros:** `SessionResultFilter` = `id | cwd | created-at | parent | availability`; `SessionEventResultFilter` = `seq | time | type | surface | text`. Arrays são **AND**, valores dentro de uma cláusula são **OR**, faixas **inclusivas**. A cláusula `text` é um scan **literal, case-insensitive, flexível em espaços**, **independente de provedor full-text**.
- **Paginação por cursor opaco** (`SessionSearchCursor`, *branded*), ligado à query normalizada + filtros + limite. `nextCursor` ausente na última página. `SESSION_QUERY_STALE_CURSOR` e `INVALID_CURSOR` na taxonomia.
- **Snippet limitado:** `SessionEventSearchHit.snippet` = *"Plain text excerpt selected around the match"*.
- **Busca dentro da sessão devolve o header observado mesmo sem hits** (`SessionEventSearchPage.session`) — o consumidor sabe **o que** foi indexado, não só o que achou.
- **Taxonomia fechada de 16 códigos:** `ABORTED`, `CORRUPT_SESSION`, `EVENT_NOT_FOUND`, `INDEX_FAILED`, `INVALID_CONFIG`, `INVALID_CURSOR`, `INVALID_FILTER`, `INVALID_LIMIT`, `INVALID_QUERY`, `INVALID_LINEAGE`, `INVALID_SURFACE`, `INVALID_WINDOW`, `PERSISTENCE_FAILED`, `SEARCH_DISABLED`, `SESSION_NOT_FOUND`, `STALE_CURSOR`, `SOURCE_CONFLICT`.
- **Metadados de sessão indexados incluem `cwd`, `parent_session`, `agent_preset`, `delegation_depth`, `seed_length`** → escopo por **pasta de trabalho** é um filtro de primeira classe.
- Nota: usam `node:sqlite` (`DatabaseSync`), **não** `better-sqlite3`.

#### (d) Session reference — recuperar contexto de outra sessão é **explícito, orçado e rotulado como não-confiável**

Fonte: `docs/subsystems/session-reference.md` + `packages/context/session-reference/`.

- **É o humano quem referencia**, por menção canônica `@[label](dsh-session:…)`. Não é auto-RAG.
- **Descoberta nunca busca em texto de transcript:** *"filtering searches both alongside Session id and cwd, **never transcript text**"* — busca por título, display title, id e cwd.
- **`sameWorkspace: boolean`** — flag explícita para o host que só quer mostrar "é do mesmo workspace ou não", **sem comparar caminhos que nunca recebeu**. → *Escopo de projeto como conceito de UI, não como string comparada no cliente.*
- **Contabilidade completa por referência** (`SessionReferenceSource.references[]`): `sessionId`, `label`, `capturedFormatVersion?`, `capturedThroughSeq`, **`compacted`**, **`originalMessages`**, **`retainedMessages`**, **`omittedMessages`**, **`omittedBytes`**, **`truncated`**, `inputIndex`.
- **O material recuperado entra como `additionalContext?: UserMessage`, descrito como *"aggregated **untrusted** snapshot"*** — mensagem de **usuário**, não instrução de sistema.
- `form: 'recall'` — o material é explicitamente *"lifted out of another session's log"*.
- `capturedThroughSeq` é coordenada **na geração original da sessão referenciada**; *"they never reinterpret it as a seq in the containing Session"*.
- **Taxonomia fechada de erro:** `INVALID_CONFIG`, `INVALID_REFERENCE`, **`SELF_REFERENCE`**, **`TOO_MANY`**, `READ_FAILED`, **`BUDGET_EXCEEDED`**, `CANCELLED`.
- `packages/context/session-reference/src/spill.ts` existe → a referência **pode transbordar** para o spill.

#### (e) Spill — a resposta para "tool result grande" sem perder o dado

Fonte: `docs/subsystems/spill.md` + `packages/spill/`.

- **Uma única operação:** `saveText` persiste o texto **verbatim** e devolve **um localizador opaco voltado ao modelo + uma dica de recuperação + a contagem exata de bytes**.
- `suggestedName` é **dica de nome, nunca caminho** — *"The backend sanitizes it to a single safe path segment before use"*.
- `SpillOwner { sessionId }` é o **namespace de armazenamento**; sessões forkadas **herdam localizadores já presentes no log semeado, mas os artefatos não são copiados nem re-owned**.
- `SpillSource` é **descritivo, nunca controle de acesso**: `{ kind:'tool', toolName, callId, label }` ou `{ kind:'session-reference', sessionId }`.
- `spill-policy` possui `retention.ts` e `notice.ts`; `spill-local` possui `cleanup.ts`. O seam **não** define política de limpeza por sessão.
- **Spill é opcional, não espinha do loop**; *"consumers own preview and spill decisions, while storage saves the supplied text verbatim"*.

> **Por que importa:** é exatamente a peça que resolve a nossa "decisão pendente" de M2 — *"persistir bytes ou refs de anexos; política de conteúdo completo de leitura de arquivo"*. O padrão **conteúdo grande → artefato em disco + localizador no contexto** evita escolher entre "transcript fiel" e "contexto estourado".

#### (f) Memória: o DeepSeek Harness **não tem** memória nativa

Fontes: `docs/user/guide/mcp-memory.md`, `apps/cli/config/examples/mcp-memory/`.

- Ele documenta **três servidores MCP de memória de terceiros**, todos **default-off**: **Memorix** `1.3.0` (stdio), **@modelcontextprotocol/server-memory** `2026.7.4` (stdio), **Engram** `v1.20.0` (stdio/Go).
- *"No memory server is present in the shipped composition, so omitting `--patch` keeps all three disabled."*
- O que o DSH faz: parseia o overlay, lança o comando stdio ou conecta na URL HTTP, descobre tools MCP e expõe como `mcp__<serverName>__<tool>`. O que ele **não** faz: baixar o servidor, inicializar o banco, **escolher modelo ou provedor de embeddings**, criar conta em nuvem, migrar dados do vendor, supervisionar serviço HTTP separado.
- **Segurança:** o bridge stdio **remove deliberadamente as variáveis de ambiente cujos nomes tipicamente identificam credenciais** e **todas** as variáveis `DSH_*` antes de lançar o filho.
- Sobre o servidor de referência MCP: *"stores a local knowledge graph and exposes entity, relation, observation, read, search, and open tools. **It needs no model or embedding service.**"* e — decisivo — *"**Search is case-insensitive substring matching** over entity names, types, and observations, **not semantic retrieval**. The server does not add embeddings, automatic summarization, conflict resolution, or a forgetting policy."*
- Instrução opcional e vendor-neutral sugerida ao modelo: *"When the user asks you to remember something, call a memory write tool. When historical information may be relevant, search memory and use relevant results."* — **aditiva**, não substitui a persona do system prompt.
- Roteiro de verificação em 3 passos (sessão A grava → **sessão B nova, sem copiar a conversa de A** → pergunta → usa). *"A new DSH session is required; a Host restart is not."*
- `.agents/notes/proposed/feature/2026-07-06-recallable-compaction.md` está em **`proposed/`** (não `implemented/`) → **"compaction recuperável" é proposta, não recurso.**

> **Achado de consolidação:** o harness mais completo dos quatro **terceiriza memória por completo** e, ainda assim, o servidor de memória de referência do próprio ecossistema MCP faz **substring case-insensitive**, não busca semântica.

### 3.4 OpenClaude @ `3a8e12b` (30/10/2026) — **achados novos desta Task 02**

⚠️ **Restrição de proveniência mantida e reforçada** (`docs/04 §1.5`, `05_LICENCAS_E_DEPENDENCIAS.md`): o `LICENSE` do snapshot declara código derivado do Claude Code proprietário, MIT apenas "where legally permissible" e ausência de autorização da Anthropic. O campo `license` da API do GitHub hoje retorna **`NOASSERTION`**. → **Somente referência conceitual. Nenhuma cópia de código ou de estrutura substancial.** Tudo abaixo é mecanismo observado, não receita a importar.

#### (a) Taxonomia e **política** de memória — o material mais diretamente útil para M5 e para o requisito de confiabilidade

Fonte: `src/memdir/memoryTypes.ts`.

- **Quatro tipos:** `'user' | 'feedback' | 'project' | 'reference'`. (Uma taxonomia paralela em `src/utils/memory/types.ts` lista `'User' | 'Project' | 'Local' | 'Managed' | 'AutoMem'` + `'TeamMem'` sob `feature('TEAMMEM')` — **duas taxonomias convivem**, o que é em si um aviso de projeto.)
- **Princípio de admissão, citação literal do cabeçalho do módulo:** *"Memories are constrained to four types capturing context **NOT derivable from the current project state**. Code patterns, architecture, git history, and file structure **are derivable** (via grep/git/CLAUDE.md) and **should NOT be saved as memories**."*
- **`WHAT_NOT_TO_SAVE_SECTION`** (idêntico nos dois modos):
  - padrões/convenções de código, arquitetura, caminhos de arquivo, estrutura do projeto — *"can be derived by reading the current project state"*;
  - histórico Git, mudanças recentes, quem-mudou-o-quê — *"`git log` / `git blame` are authoritative"*;
  - soluções de debug ou receitas de correção — *"the fix is in the code; the commit message has the context"*;
  - qualquer coisa já documentada em arquivos `CLAUDE.md`;
  - detalhes efêmeros de tarefa: trabalho em andamento, estado temporário, contexto da conversa corrente.
  - **E uma trava de gate explícito:** *"These exclusions apply **even when the user explicitly asks you to save**. If they ask you to save a PR list or activity summary, **ask what was *surprising* or *non-obvious* about it** — that is the part worth keeping."* (comentário interno: `H2: explicit-save gate. Eval-validated (memory-prompt-iteration case 3, 0/2 → 3/3): prevents "save this week's PR list" → activity-log noise.`)
- **`MEMORY_DRIFT_CAVEAT`** (literal): *"Memory records can become stale over time. Use memory as context for **what was true at a given point in time**. Before answering the user or building assumptions based solely on information in memory records, **verify that the memory is still correct and up-to-date by reading the current state of the files or resources**. If a recalled memory conflicts with current information, **trust what you observe now** — and update or remove the stale memory rather than acting on it."*
- **`WHEN_TO_ACCESS_SECTION`** inclui o anti-padrão do "ignore": *"If the user says to **ignore** or **not use** memory: proceed as if MEMORY.md were empty. **Do not apply remembered facts, cite, compare against, or mention memory content**."* (comentário interno: o modo de falha real era o modelo tratar "ignore" como *"acknowledge then override"* em vez de *"don't reference at all"* — `1/3` em eval).
- **`TRUSTING_RECALL_SECTION`** — seção própria, intitulada **"## Before recommending from memory"**:
  - *"A memory that names a specific function, file, or flag is a claim that it existed **when the memory was written**. It may have been renamed, removed, or never merged. Before recommending it: if the memory names a file path — **check the file exists**; if it names a function or flag — **grep for it**; if the user is about to act on your recommendation, **verify first**."*
  - *"'The memory says X exists' is not the same as 'X exists now.'"*
  - *"A memory that summarizes repo state (activity logs, architecture snapshots) is **frozen in time**. If the user asks about recent or current state, prefer `git log` or reading the code over recalling the snapshot."*
- **Evidência de que a posição do texto muda o resultado** (comentários internos com números de eval, `memory-prompt-iteration.eval.ts`, 2026-03-17):
  - H1 (verificar afirmações de função/arquivo): **0/2 → 3/3** via `appendSystemPrompt`; **caiu para 0/3** quando enterrado como bullet sob "When to access" — *"position matters"*.
  - H5 (rejeição de ruído no lado da leitura): **0/2 → 3/3** via `appendSystemPrompt`, **2/3** como bullet no lugar.
  - **A redação do cabeçalho mudou o resultado:** *"Before recommending"* (pista de ação no ponto de decisão) foi **3/3**; *"Trusting what you recall"* (abstrato) foi **0/3** — **mesmo corpo de texto, só o cabeçalho diferiu**.
  - **Lacuna conhecida e declarada:** *"H1 doesn't cover slash-command claims (0/3 on the /fork case — slash commands aren't files or functions in the model's ontology)."*
  - Orçamento de tokens documentado: *"Old 4 lines were ~70 tokens; new 4 lines are ~73 tokens. Net ~+3."*
- **Formato de cada memória:** arquivo Markdown com frontmatter `name`, `description`, `type`. A `description` é explicitamente *"used to decide relevance in future conversations, so be specific"*. Para tipos `feedback`/`project`, o corpo deve ser estruturado como **regra/fato, depois linhas `**Why:**` e `**How to apply:**`**.

> **Por que importa:** é a única referência auditada que traz **política de memória validada por avaliação**, com números. Nosso requisito de **Confiabilidade** ("impedir que a IA invente decisões, funções, resultados de testes") tem aqui um mecanismo concreto e barato: **verificar antes de recomendar + tratar memória como afirmação datada + preferir observação atual sobre snapshot**. E traz um alerta de projeto: **a posição e o cabeçalho da instrução mudam a taxa de acerto**.

#### (b) Armazenamento e escopos

Fontes: `src/memdir/paths.ts`, `src/memdir/teamMemPaths.ts`, `src/memdir/memoryScan.ts`.

- **Base:** `getMemoryBaseDir()` → `CLAUDE_CODE_REMOTE_MEMORY_DIR` se definido, senão o config home (`~/.claude`).
- **Escopo de projeto:** `<memoryBase>/projects/<sanitized-git-root>/memory/` — **derivado da RAIZ DO GIT**, com `memoize`.
- **Entrypoint:** `MEMORY.md` dentro desse diretório, tratado como **índice vivo**.
- **Log diário:** `getAutoMemDailyLogPath()` → `<memory>/logs/<yyyy>/<mm>/<yyyy-mm-dd>.md`. Comentário: em vez de manter `MEMORY.md` como índice vivo, o agente **anexa a um arquivo de log datado** e mantém arquivos de tópico + `MEMORY.md`.
- **Escopo de equipe:** `<memoryBase>/projects/<sanitized-project-root>/memory/team/MEMORY.md`.
- **`scanMemoryFiles`** lê `.md` **excluindo `MEMORY.md`** (regra case-sensitive, com testes que fixam essa semântica) e produz `MemoryHeader` com `filename`, `description`, `type`, `mtimeMs`, `filePath`.
- **`formatMemoryManifest()`** — formato literal do manifesto: `- [type] filename (ISO timestamp): description` (uma linha por memória; sem `description`, só `- [type] filename (ISO)`).

> **Contraste direto com o nosso §2.5:** OpenClaude ancora o projeto na **raiz do Git**; nós ancoramos no **caminho do workspace**. Ambos são escolhas; a nossa **fragmenta** quando o mesmo repo é aberto de dois caminhos. → alimenta **DP-01**.

#### (c) Recall de memória — seleção por LLM sobre o **manifesto**, não sobre conteúdo

Fonte: `src/memdir/findRelevantMemories.ts`.

- Varre os **cabeçalhos** das memórias e pede a um modelo (`getDefaultSonnetModel()`, via `sideQuery`) para escolher **até 5** arquivos relevantes.
- Prompt do seletor (pontos-chave, literais): *"Return a list of filenames for the memories that will clearly be useful [...] (up to 5). **Only include memories that you are certain will be helpful** based on their name and description. **If you are unsure [...] do not include it.** Be selective and discerning. If there are no memories that would clearly be useful, feel free to return an empty list."*
- **Regra fina sobre ferramentas:** *"If a list of recently-used tools is provided, **do not** select memories that are usage reference or API documentation for those tools (Claude Code is already exercising them). **DO** still select memories containing **warnings, gotchas, or known issues** about those tools — active use is exactly when those matter."*
- **`alreadySurfaced`** filtra caminhos já mostrados em turnos anteriores **antes** da chamada, *"so the selector spends its 5-slot budget on fresh candidates instead of re-picking files the caller will discard"*.
- **`mtimeMs` é propagado** *"so callers can surface freshness to the main model without a second stat"*.
- **Exclui `MEMORY.md`** — *"already loaded in system prompt"*.
- **Telemetria de forma** (`feature('MEMORY_SHAPE_TELEMETRY')` → `logMemoryRecallShape(memories, selected)`): *"Fires even on empty selection: selection-rate needs the denominator, and **-1 ages distinguish 'ran, picked nothing' from 'never ran'**."*
- **Não há embeddings, não há índice, não há banco.** É scan de cabeçalhos + seleção por LLM.

#### (d) Busca de sessões — dois estágios, léxico + re-rank por modelo pequeno, e **não é tool do agente**

Fonte: `src/utils/agenticSessionSearch.ts` + chamadores.

- **Pré-filtro léxico** `logContainsQuery()` verifica, **nesta ordem e com o mais caro por último**: título → título customizado → tag → branch Git → resumo (gerado por IA) → primeiro prompt → transcript. Comentário: *"Check transcript (more expensive, do last)"*.
- **Orçamentos fixos:** `MAX_TRANSCRIPT_CHARS = 2000` por sessão · `MAX_MESSAGES_TO_SCAN = 100` (metade do início + metade do fim) · `MAX_SESSIONS_TO_SEARCH = 100`.
- **Preenchimento de vagas:** se houver menos de 100 sessões léxicas compatíveis, completa com sessões recentes **não** compatíveis "for context".
- **Re-rank por modelo pequeno e rápido:** `getSmallFastModel()` + `sideQuery()`, com prompt que prioriza: (1) tag exata, (2) tag parcial, (3) título, (4) branch, (5) resumo/transcript, (6) similaridade semântica.
- **Viés declarado de recall:** *"CRITICAL: Be VERY inclusive [...] **When in doubt, INCLUDE the session.** It's better to return too many results than too few."* — o oposto do seletor de memórias (viés de precisão). **A mesma organização usa viés diferente para tarefas de recuperação diferentes.**
- Saída: `{"relevant_indices": [2, 5, 0]}` — **somente JSON, sem markdown**.
- **Consumidor:** apenas `src/screens/ResumeConversation.tsx:315` e `src/commands/resume/resume.tsx:276`, ambos passando `onAgenticSearch={agenticSessionSearch}` para `LogSelector`. Em `LogSelector.tsx:275`: `const isAgenticSearchEnabled = typeof onAgenticSearch === "function"`.
  → **É um recurso do SELETOR DE SESSÕES HUMANO, não uma ferramenta do agente.** Confirmado por `grep` em todo `src/`.
- **Mudança de estado em relação ao snapshot de 22/10:** naquele snapshot a busca agêntica cross-session estava **desativada (`false`)**. Agora os dois chamadores a passam sempre, e `LogSelector` tem estado (`idle`/`searching`/`results`), `AbortController` com abort da busca anterior a cada nova query, e foco próprio na opção. → **hoje está ligada para o humano.** Continua **não** sendo tool do modelo.

#### (e) Busca no transcript corrente — indexar o que o usuário **vê**, não o que o modelo recebe

Fonte: `src/utils/transcriptSearch.ts`.

- **O problema que eles documentaram (citação literal):** *"b.content is the **MODEL-facing serialization** [...] adds system-reminders, `<persisted-output>` wrappers, backgroundInfo strings, CYBER_RISK_MITIGATION_REMINDER. The UI renders msg.toolUseResult (the tool's native Out) — **DIFFERENT text**. Indexing b.content yields **phantoms**: `/malware` → matches the reminder, `/background` → matches the model-only ID string, **none render**."*
- **Solução:** duck-type do `Out` nativo — cobre `Bash {stdout,stderr}`, `Grep {content,filenames}`, `Read {file.content}`. **Formas desconhecidas indexam vazio:** *"**under-count is honest, phantom is a lie**. Proper fix is per-tool `extractSearchText(Out)` on the Tool interface (TODO)."*
- **Texto substituído por sentinela na UI é excluído** do índice: `RENDERED_AS_SENTINEL = { INTERRUPT_MESSAGE, INTERRUPT_MESSAGE_FOR_TOOL_USE }`. Comentário: *"Raw text never appears on screen; searching it yields phantom matches — `/terr` → in[terr]upted."*
- **`thinking` é pulado** (é escondido por `hidePastThinking` na montagem do transcript).
- **Cache `WeakMap<RenderableMessage, string>` já minúsculo:** *"messages are append-only and immutable so a hit is always valid. Lowercased at cache time: the only caller immediately `.toLowerCase()`d the result, **re-lowering ~1.5MB on every keystroke (the backspace hang)**."*

> **Por que importa:** é um **princípio de correção** para M4 que nenhuma das nossas propostas anteriores enunciava: **um resultado de busca que aponta para texto que o usuário não vê é uma mentira.** E um alerta de desempenho concreto (re-minúscular 1,5 MB por tecla ⇒ travamento no backspace).

#### (f) Auto-compactação — limites, poda determinística e disjuntor

Fonte: `src/services/compact/autoCompact.ts`.

- `WARNING_THRESHOLD_BUFFER_TOKENS = 20_000` e `ERROR_THRESHOLD_BUFFER_TOKENS = 20_000`; `warningThreshold = threshold - 20_000`, `errorThreshold = threshold - 20_000`. Comentários registram que o threshold **nunca pode ficar negativo** (issue #635) e que a regra mantém o threshold **monotônico** e preserva o buffer de 20 k para janelas médias.
- `partitionContext(messages, { contextWindow, recentCount: 5 })` → devolve `canFitInWindow` e `totalTokens`.
- **Quando não cabe:** `availableSpace = Math.floor(contextWindow * 0.1)`.
- **Poda determinística ANTES de qualquer LLM:** `pruneByRelevance(nonSystemMessages, { targetTokens: availableSpace, preserveRecent: <normalizado>, preserveTools: true, preserveErrors: true })`, e **mensagens de sistema são sempre preservadas** (`finalMessages = [...systemMessages, ...pruned]`). Só avança se `finalMessages.length > 0 && finalMessages.length < messages.length`.
- **Normalização defensiva de config:** *"Config may be hand-edited; `normalizeCompactTailTurns` is the single rule (shared with the `/config` UI) — a stray `0.5` must not floor to a zero-message tail, and invalid values fall back to the default."*
- **Disjuntor:** `breakerState.effectiveConsecutiveFailures`, `nextRetryAtMs`; comentário: *"misconfiguration cannot effectively disable the circuit breaker"*. Há também **cooldown** (`QueryEngine.autoCompactCooldown.test.ts`) e `autoCompactReason = forcedBy ?? 'token-threshold'`.
- Comandos/UX dedicados: `/compact`, `/clear-context-window`, `/set-context-window`, `CompactProgressBar`, `CompactSummary`, `CompactBoundaryMessage`, `ResumeCompactPrompt`, `ContextVisualization`, `MemoryUsageIndicator`, `usePostCompactSurvey`.

#### (g) Extração automática de memória — fork com cache compartilhado, ferramentas restritas e **aprovação por padrão**

Fontes: `src/services/extractMemories/extractMemories.ts`, `src/utils/governancePolicy.ts`.

- **Quando roda:** *"once at the end of each complete query loop (when the model produces a final response with no tool calls) via `handleStopHooks` in `stopHooks.ts`."*
- **Como roda:** `runForkedAgent` — *"a perfect fork of the main conversation that **shares the parent's prompt cache**"* + `createCacheSafeParams`. → O custo da extração é reduzido por reuso de cache, não por pagar o prompt duas vezes.
- **Conjunto de ferramentas do fork, restrição literal:** *"only `FILE_READ`, `GREP`, `GLOB`, **read-only `BASH`**, and `FILE_EDIT`/`FILE_WRITE` **within `memoryDir`** are allowed."* (`BASH_TOOL_NAME` tem tratamento especial na linha 200.)
- **Aprovação:** importa `isMemoryWriteApprovalRequired` de `utils/governancePolicy.ts`.
  ```
  isMemoryWriteApprovalRequired(): percorre as fontes de configuração habilitadas;
    se qualquer uma tem memory.requireApprovalBeforeWrite === true  → return true
    se alguma tem === false                                         → marca explicitlyDisabled
    ao final: return !explicitlyDisabled
  ```
  → **O padrão é EXIGIR aprovação.** Um `false` explícito em alguma fonte desliga; um `true` em qualquer fonte **vence**. (Contraste deliberado com a regra de opt-out de auto-memória abaixo, onde um `false` vence — ou seja: **a direção segura é diferente conforme o risco.**)
- **Supersessão:** `MEMORY_EXTRACTION_SUPERSEDED_ABORT_REASON = 'memory-extraction-superseded'` → extração em voo é abortada quando outra a substitui.
- **Estado em closure** dentro de `initExtractMemories()`, não em nível de módulo (mesmo padrão de `confidenceRating.ts`).
- **Visibilidade:** `createMemorySavedMessage(...)` + `components/memory/MemoryUpdateNotification.tsx` → o usuário **vê** que uma memória foi salva.
- **Gate de build/feature:** `isExtractModeActive()` exige `getFeatureValue_CACHED_MAY_BE_STALE('tengu_passport_quail', false)`; chamadores precisam **também** testar `feature('EXTRACT_MEMORIES')`. Comentário: *"that check cannot live inside this helper because `feature()` only tree-shakes when used directly in an `if` condition."*

#### (h) Higiene de segredos — sanitização **antes** de persistir e guarda no `validateInput` das tools

Fontes: `src/memdir/memorySecurity.ts`, `src/services/teamMemorySync/teamMemSecretGuard.ts`, `secretScanner.ts`.

- `sanitizeMemoryText(value)` → `{ text, changed, wholeSecret }`, aplicado a **texto não-confiável antes de ser gravado em memória persistente**.
  - **Segredo inteiro** (parece segredo **ou** é valor de uma env var de provedor conhecida) ⇒ `text = '[REDACTED]'`, `wholeSecret = true` — o cabeçalho diz que isso permite ao chamador **descartar campos** cujo valor completo é uma senha.
  - **Credencial em contexto:** dois padrões — atribuição explícita (`api key|access key|private key|password|passwd|passphrase|pwd|access token|refresh token|auth token|token|credential|secret` seguido de `:`/`=`/`is`/`was`/`are`/`were`) e linguagem imperativa (`use|using|with|set|enter|supply|provide|send|store|save|remember|implement|configure` + nome da credencial).
  - **URLs protegidas em duas passadas:** extrai cada URL para um placeholder `__OPENCLAUDE_MEMORY_URL_<i>__`, sanitiza (`redactSecretSubstringsForDisplay` contra `process.env`; descarta `username:password@` e query params sensíveis `token|key|secret|password|passwd|pwd|auth|signature|sig`), e **restaura no final** — para que o texto em volta sobreviva.
  - **Tokens base64 opacos:** `[A-Za-z0-9_-]{8,}/[A-Za-z0-9+/_=-]{8,}` + `looksLikeMemorySecretValue` (≥20 chars, contém `[+/=]`, contém letra **e** dígito).
  - **Exclusão deliberada:** *"deliberately avoids slash-containing values because URLs and paths are common configuration values."*
- `sanitizeMemoryIdentifier(value)` → `string | null`. **Rejeita o valor inteiro** se vazio, se mudou, se é segredo inteiro, ou se contém marcador de redação. Justificativa literal: *"Identifiers are persisted in titles and filenames, so **partial redaction is unsafe**."*
- `containsMemoryRedaction(value)` → testa `/\[(?:redacted[^\]]*|configured)\]/i`.
- **`checkTeamMemSecrets(filePath, content)`** é chamado **a partir de `FileWriteTool` e `FileEditTool.validateInput`** para impedir o modelo de gravar segredos em arquivos de memória de equipe, *"which would be synced to all repository collaborators"*. Retorna mensagem de erro ou `null`. O guard interno `feature('TEAMMEM')` o mantém inerte quando a flag está desligada, **mas os chamadores podem invocá-lo incondicionalmente**.
- `isAutoMemoryEnabled()`: **default ligado**. Opt-outs: `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, `CLAUDE_CODE_SIMPLE` (o `--bare` já remove a seção de memória do system prompt; este gate *"stops the other half (extractMemories turn-end fork, autoDream, /remember, /dream, team sync)"*), `CLAUDE_CODE_REMOTE` sem `CLAUDE_CODE_REMOTE_MEMORY_DIR`. E a regra de precedência: **`memory.autoWrite` e `autoMemoryEnabled` são equivalentes, avaliados por fonte bruta, e um único `false` em qualquer fonte vence** — *"a parent-scope opt-out cannot be silently re-enabled by a narrower scope flipping the same key to `true` (#1326)"*.
- Consolidação adicional: `src/services/autoDream/autoDream.ts`, `src/tasks/DreamTask/`, `/dream`, `/remember`, `src/tools/AgentTool/agentMemory.ts` + `agentMemorySnapshot.ts`, `src/memdir/memoryAge.ts`, `src/utils/memory/versions.ts`.

### 3.5 Meta AI / Meta Muse — **grau de evidência BAIXO** (só secundário)

**Registro de lacuna prévia:** não existe **nenhuma** investigação anterior de Meta AI neste repositório (`grep -rni "meta ai" docs/ docs/arquivo_morto/investigacao_memoria_fatias_m/` → zero ocorrências). O que segue vem de fontes de **terceira parte** (blogs técnicos e imprensa), não de documentação oficial da Meta nem de código. **Não usar como base de decisão técnica.**

| Achado | Fonte | Utilidade para nós |
|---|---|---|
| Memória persistente é **opt-in**, separada da janela de contexto da sessão; a janela é descrita como *"rolling, relevance-weighted buffer rather than an archive"* | datastudios.org (fev/2026) | Confirma a separação conceitual **janela × memória** que já temos em §2.3/§3.3 |
| Gestão via **Accounts Center**: ver, editar, apagar memórias individuais ou **limpar tudo**; sincroniza entre superfícies (WhatsApp/Messenger/Instagram) | datastudios.org, mashable, getcoai | Padrão de **governança de memória global de usuário**: dashboard + edição + apagamento total |
| Memória **restrita a conversas 1:1**, deliberadamente **excluída de grupos** para evitar "spillover" | mashable (jan/2025), getcoai | Analogia útil para **regra de escopo**: um limite de contexto pode ser uma **decisão de segurança**, não só de produto |
| Meta Muse: TIME (06/10/2026) reportou que as instruções internas mandam atualizar **dossiês do usuário e das pessoas mencionadas a cada hora**, inclusive de quem não usa o produto; e **inferir objetivos não declarados** | aiagentslibrary.com citando TIME/WIRED | **Contra-exemplo de governança.** Choca-se com `docs/02 §1.5` (privacidade: *"nenhuma telemetria externa presumida"*, aprovação humana para gravar memória de projeto) |
| Meta Help Center, citado: *"after you delete something, **Muse may still remember information it learned from what you deleted**"* | aiagentslibrary.com | **O risco mais importante desta seção:** apagar a **fonte** não apaga o **derivado**. Vira requisito explícito de M5/M8 (ver §7 R7) |
| Sem interruptor único documentado para desligar a memória do Muse (out/2026); os controles são editar, pedir para esquecer, apagar mensagens/side chats e **reset** completo | aiagentslibrary.com | Sinal de que "desligar memória" precisa ser **requisito de projeto**, não descoberta tardia |
| Pergunta de "esquecer" não remove necessariamente a mensagem original que continha o fato | aiagentslibrary.com citando TIME | Reforça a necessidade de distinguir **apagar registro** de **apagar origem** — e de dizer honestamente qual dos dois aconteceu |

**Recomendação de consolidação:** tratar Meta AI como **referência de governança de produto** (o que o usuário consegue ver/editar/apagar; onde a linha de privacidade foi cruzada), **não** como referência de mecanismo. Nenhum dos quatro projetos de código auditado tem memória global automática de usuário; a única memória global observada é **produto fechado, secundário e com histórico público de crítica**.

---

## 4. Matriz comparativa consolidada

Legenda: **✔** = confirmado em código · **◐** = parcial/limitado · **✘** = não localizado · **—** = não aplicável / não verificável.

| Capacidade | **Agente Window** (`fe218b8`) | **VS Code/Copilot** (`c8a3f81`) | **OpenCode v2.2.4** (`45898d0`) | **DeepSeek Harness** (`22ddee3`) | **OpenClaude** (`3a8e12b`) | **Meta AI** |
|---|---|---|---|---|---|---|
| **Transcript durável** | ✔ SQLite catálogo + JSONL por sessão | ✔ JSONL local + projeção Chronicle em SQLite | ✔ SQLite (`session_v2`/`_message`/`_part`), `seq`, paginado | ✔ log de eventos durável + superfície derivada | ✔ JSONL por sessão/projeto | — (secundário) |
| **Fidelidade de tool calls no persistido** | ✘ **cartão de UI só** (`resumo`, sem args/result/`toolCallId`) | ◐ Chronicle resume turnos (1k/5k/1k chars) e guarda paths/refs | ✔ trocas estruturadas persistidas | ✔ eventos `assistant/message` com blocos `tool-call` e `tool/result` | ✔ mensagens com blocos `tool_use`/`tool_result` | — |
| **Reenvio fiel no turno seguinte** | ✘ `montarHistorico` → só `role/content` | ◐ histórico resumido (`SummarizedConversationHistory`) | ✔ reconstrução de contexto por sessão | ✔ superfície atual + checkpoint | ✔ | — |
| **Medição de contexto** | ✘ fórmula `18 + chars/9 + anexos*4`, teto 92 | ✔ `computePromptTokenDetails` sobre mensagens efetivas + tools; reporta `fetchResult.usage` | ◐ `keep: 15_000` tokens como orçamento de cauda | **✔✔** `baseline.kind: 'usage'\|'estimated'`; `pressureTokens` / `projectedTokens` (âncora + delta) / `contextWindow` opcional | ✔ `partitionContext`, thresholds com buffer 20 k, `/context`, `/set-context-window` | — |
| **Limite da janela conhecido** | ◐ **existe nos descritores (128k–1M) mas não é propagado** | ✔ por modelo/configuração efetivos | ✔ por modelo | ✔ *"absent when no adapter advertised one"* | ✔ `getContextWindowForModel` | — |
| **Compactação** | ✘ | ✔ | ✔ auto (`auto:true`) + manual, `SUMMARY_TEMPLATE` de 7 seções, degradação progressiva | ✔ seam opcional; `replace` de superfície; eventos *log-only*; trava start→end | ✔ `/compact` + auto com poda determinística prévia | — |
| **Original preservado após compactar** | — | ✔ | ✔ | ✔ **`shadowed`, não apagado**; `shadowedSeqs` autoritativo | ✔ | — |
| **Corte seguro por pareamento de ferramentas** | — | — | ◐ fronteira por `keepID` | **✔✔ `toolPairingBalancedBefore/After`, falha fechada** | ◐ `preserveTools: true` na poda | — |
| **Redução sem LLM** | — | — | ◐ corta saídas de ferramenta na degradação | **✔ `tool-result-pruner` pode avançar a superfície sem resumo** | ✔ `pruneByRelevance` determinístico | — |
| **Busca manual no transcript** | ✘ | ◐ Ctrl+F no transcript corrente | ✔ Ctrl+F literal na timeline, com IDs | ✔ `searchEvents(sessionId, …)` + snippet + cursor | ✔ `transcriptSearch` sobre texto **visível** | — |
| **Busca entre sessões** | ✘ | ✔ Chronicle FTS5 + BM25, tool SQL read-only (100 linhas) | ✘ só `LIKE` no título | ✔ `searchSessions()` agrupado por `bestMatch` | ◐ léxico + re-rank por modelo pequeno — **só no seletor humano de retomada** | — |
| **Busca como ferramenta do modelo** | ✘ | ✔ `SessionStoreSqlTool` (SQL somente leitura, falha fechada) | ✘ | ◐ `ctx.sessionQuery` é serviço; exposição como tool não confirmada nesta leitura | ✘ | — |
| **Índice derivado/descartável** | — | ◐ `chat.localIndex.enabled` | — | **✔✔ schema v8, `application_id`, reset in place, `wx`+0600/0700, TEMP separado** | ✘ (scan direto) | — |
| **Memória explícita de projeto** | ✘ | ✔ `repo/` no storage local da extensão | ✘ (instruções ≠ memória) | ✘ **terceirizada via MCP** | ✔ `<base>/projects/<git-root>/memory/` + `MEMORY.md` + logs diários | — |
| **Memória global de usuário** | ✘ | ✔ `globalStorageUri/memory-tool/memories/` + Copilot Memory cloud (doc) | ✘ | ✘ (via MCP, se o servidor tiver) | ✔ tipos `user`/`feedback` (+ `TeamMem` sob flag) | ✔ opt-in, Accounts Center, 1:1 apenas |
| **Política do que NÃO salvar** | — | — | — | — | **✔✔ 5 exclusões + gate mesmo sob pedido explícito** | ✘ (crítica pública por inferir demais) |
| **Verificar memória antes de recomendar** | — | — | — | — | **✔✔ seção própria, eval 3/3; posição do texto muda o resultado** | ✘ |
| **Seleção de memória por relevância** | — | ◐ auto-load de notas de usuário (teto 200 linhas) | — | — | **✔ manifesto (`- [tipo] arquivo (ISO): descrição`) + LLM escolhe ≤5, viés de precisão** | — |
| **Extração automática** | ✘ | — (não verificável) | ✘ | ✘ | ✔ fork no fim do loop, cache compartilhado, tools restritas, **aprovação por padrão** | ✔ (horária, segundo TIME) |
| **Sanitização de segredos antes de persistir** | ✘ | ◐ filtragem no exportador cloud (não testada) | — | — | **✔✔ `sanitizeMemoryText` + `sanitizeMemoryIdentifier` (rejeita) + guard no `validateInput` das tools** | — |
| **Retomada de execução após restart** | ✘ 7 `Map`s voláteis; `retomarPorFluxo` perde-se | ◐ depende do harness | ✔ claim durável + `resumeSuspendedSessions`, **at-least-once**, teto 10 | ◐ `SessionLogSnapshot` para *resume preflight* | ◐ resume restaura conversa; não prova reviver ferramenta | — |
| **Revalidação de contexto antes de continuar** | **✔ `rotas.ts:633-638` (sessão, chat, raiz, modo, permissão)** | — | ◐ | ✔ balanceamento de turnos interrompidos no *preflight* | — | — |
| **Tratamento de tool result grande** | ◐ só `resumo`/`progresso` no cartão | ◐ truncamento Chronicle | ◐ truncagem na projeção recente | **✔✔ spill: `saveText` → localizador opaco + bytes exatos + retenção/limpeza** | ◐ `<persisted-output>` wrapper (mencionado em comentário) | — |
| **Taxonomia fechada de erro** | ✔ `CategoriaErro`/`CategoriaErroAgir` | — | — | **✔✔ 16 códigos de query + 7 de reference + 6 de compaction manual** | ◐ `Agentic session search failed` | — |
| **Embeddings / banco vetorial** | ✘ | ✘ | ✘ | ✘ | ✘ | — |
| **Evidência operacional nesta auditoria** | ✔ A–H + Task 01 (fixtures) | ✘ nenhum teste executado | ✘ nenhum teste executado | ✘ nenhuma execução | ✘ nenhuma execução | — |

---

## 5. Mecanismos tecnicamente **comprovados**

### 5.1 Comprovados **no nosso ambiente** (Medido)

| # | Mecanismo | Evidência | Fonte |
|---|---|---|---|
| **P1** | **SQLite com FTS5 funciona no binding que já usamos.** `better-sqlite3@12.11.1` compilado com `ENABLE_FTS3/FTS4/FTS5`; `sqlite_version()` = 3.53.2; `CREATE VIRTUAL TABLE ... USING fts5(body)` + `MATCH` funcionaram | execução real, 23/10/2026 | `arquivo_morto/estudo_memoria_contexto_2026-10-22/08_PROVAS_TECNICAS.md §2` |
| **P2** | **Reescrita integral de JSONL é barata até ~200 mensagens.** 200 registros sintéticos (~1.000 chars cada), arquivo de **235.429 bytes**, 30 repetições: salvar p50 **1,895 ms** / p95 2,419 / máx 2,778; reler+parsear p50 **1,143 ms** / p95 2,084 / máx 4,399. Drift de heartbeat 1 ms: máx 4,055 ms em 89 amostras | execução real | idem `§3` |
| **P3** | **A corrida de writer JSONL era real e está corrigida.** Baseline: 2/16 `ENOENT` (duas rodadas) e depois 6/16 na revalidação. Causa: `<destino>.<pid>.tmp` compartilhado. Correção: temporário exclusivo + `wx` + fila por sessão + JSONL antes do SQLite + revisão monotônica. Reteste: 2 rodadas × 16 PUTs = 16/16 HTTP 200, snapshot íntegro; processo novo restaurou IDs/conteúdo/ordem | execução real + código | [`CORRECAO_PERSISTENCIA.md`](CORRECAO_PERSISTENCIA.md), `docs/09 §3.24` |
| **P4** | **No Windows/NTFS a corrida é muito pior e a correção a elimina.** Sonda nativa independente: 100 `fs.rename` concorrentes no mesmo destino ⇒ **47 EPERM (47%)**; 160 renames paralelos no mesmo destino ⇒ **91 EPERM**; mesmo destino serial ⇒ 160/160; destinos distintos paralelos ⇒ 160/160. Writer corrigido: **320 gravações em 20 rodadas de 16, zero falha, zero `.tmp` residual** | execução real no Windows 11 do auditor | [`HOMOLOGACAO_INDEPENDENTE_TASK_01.md §2`](HOMOLOGACAO_INDEPENDENTE_TASK_01.md) |
| **P5** | **Round-trip de persistência e restart funciona.** `PUT /api/sessions` 200 → processo encerrado → processo novo com o mesmo `HOME` → `GET` recuperou metadados, chats, mensagens, cartões e caminhos | execução real (cenário A) | [`06_RESULTADOS_DOS_TESTES.md`](06_RESULTADOS_DOS_TESTES.md) |
| **P6** | **O escopo do prompt atual é o chat selecionado, e só texto.** Canário de outro projeto, conteúdo de `FerramentaNoChat`, mensagem em `running`, `cancelled` e `erro` **não** entraram no request | teste UI isolado, 1/1 duas vezes | idem |
| **P7** | **Isolamento por slug funciona em fixture.** Sessões A/B com workspaces e slugs distintos no mesmo DB; canário de B permaneceu em B | execução real (cenário C) | idem |
| **P8** | **O denominador de contexto já existe nos descritores.** 8 descritores com `padroes.contexto` (32.768 a 1.000.000); `providersRepo` valida, normaliza (`Math.floor`) e faz fallback `salvo.contexto ?? descritor.padroes.contexto` | **Confirmado em código (nosso), verificado nesta Task 02** | §2.3 |
| **P9** | **Identidade e diretório de projeto já existem.** `Session.slug` ("stable filesystem-safe project key"), `~/.agente_window/projects/<slug>/`, `resolveProjectDir()` com guarda anti-traversal | **Confirmado em código (nosso), verificado nesta Task 02** | §2.1, §2.5 |
| **P10** | **Nenhum código de produção lê `usage`.** Único hit de `usage` nas casas 2-inteligencia é um fixture de teste Anthropic com `usage: {}` | **Confirmado em código (nosso), `grep` nesta Task 02** | §2.3 |

**Bloqueio registrado e não superado:** prova de `usage` **real** de OpenAI/Anthropic continua **bloqueada** — sem `OPENAI_API_KEY`, sem `ANTHROPIC_API_KEY`, sem `AGENTE_WINDOW_PROVIDERS_PATH`, sem `~/.agente_window/providers.json`. Resultado permanece **pendente**, não "passou" (`08_PROVAS_TECNICAS.md §4`). Nesta Task 02 **nenhuma credencial foi usada e nenhuma chamada real foi feita**.

### 5.2 Comprovados **nas referências** (Confirmado em código de referência — mecanismo existe e é testado lá; **não** é prova no nosso produto)

| # | Mecanismo | Onde | Transferível? |
|---|---|---|---|
| **R1** | Índice FTS5 **descartável** com `application_id`, versão de schema, reset in place, recusa de banco estranho, `wx`+0600/0700 | DSH `session-query-sqlite/src/schema.ts` | **Sim, como padrão.** Nossa variante: `better-sqlite3` (P1) em vez de `node:sqlite` |
| **R2** | Predicado **algorítmico** de corte seguro por pareamento tool-call/result, com falha fechada | DSH `compaction/src/tool-pairing.ts` | **Sim, como algoritmo.** Independente de framework |
| **R3** | Medidor com **âncora de usage + delta heurístico** (`projectedTokens`) e ausência como estado | DSH `docs/subsystems/token-meter.md` | **Sim, como contrato.** Casa com P8/P10 |
| **R4** | **Spill**: conteúdo grande → artefato em disco + localizador opaco + bytes exatos + retenção | DSH `docs/subsystems/spill.md` | **Sim, como padrão.** Resolve a pendência de M2 |
| **R5** | Compaction como **seam opcional** (Definition/Provider/Consumer), não espinha do loop | DSH `docs/subsystems/compaction.md` | **Sim — e coincide com o nosso Monolito Modular (D68)** |
| **R6** | **Trava start→end** com detecção de lock órfão em vez de falso "terminou" | DSH compaction | **Sim, como padrão** |
| **R7** | Dois escopos de busca no mesmo serviço (`searchEvents` × `searchSessions`) | DSH session-query | **Sim.** Confirma M4/M6 como escopos, não duplicatas |
| **R8** | **Query como dado, nunca sintaxe FTS** | DSH session-query | **Sim — requisito de segurança** |
| **R9** | O que entra no índice: mensagens, tool calls/results, todos, detalhe de falha/status. **Não** entra: reasoning, prompts bloqueados, eventos estruturais, chunks de stream | DSH session-query | **Sim, como política inicial** |
| **R10** | Referência cross-session **explícita**, orçada, com contabilidade (`retained`/`omitted`/`omittedBytes`/`truncated`/`compacted`) e rótulo **untrusted** em `additionalContext` | DSH session-reference | **Sim, como contrato** |
| **R11** | **Política do que NÃO salvar** em memória, com gate mesmo sob pedido explícito | OpenClaude `memoryTypes.ts` | **Sim, como política** (conceito, não código — restrição de proveniência) |
| **R12** | **Verificar antes de recomendar**: memória é afirmação datada; checar arquivo/função; preferir `git log`/código a snapshot | OpenClaude `TRUSTING_RECALL_SECTION` | **Sim, e com evidência de eval (0/2→3/3; posição e cabeçalho mudam o resultado)** |
| **R13** | Seleção por **manifesto de cabeçalhos** + LLM escolhendo ≤5, com viés de **precisão**, `alreadySurfaced`, `mtime` de frescor | OpenClaude `findRelevantMemories.ts` | **Sim, como padrão** |
| **R14** | Busca de sessões em **dois estágios**: pré-filtro léxico barato (metadata → transcript por último) + re-rank por modelo pequeno, com orçamentos fixos e viés de **recall** | OpenClaude `agenticSessionSearch.ts` | **Sim, como padrão.** Nota: **viés oposto ao R13** — a mesma organização calibra diferente por tarefa |
| **R15** | **Indexar o texto que o usuário vê**, não a serialização voltada ao modelo; forma desconhecida ⇒ vazio (*"under-count is honest, phantom is a lie"*) | OpenClaude `transcriptSearch.ts` | **Sim — princípio de correção para M4** |
| **R16** | Cache `WeakMap` de texto de busca já minúsculo para mensagens imutáveis (evitou re-minúscular ~1,5 MB por tecla) | OpenClaude `transcriptSearch.ts` | **Sim, como otimização medida** |
| **R17** | **Sanitização de segredos antes de persistir memória**, com `wholeSecret` para descartar o campo inteiro e **rejeição total** para identificadores | OpenClaude `memorySecurity.ts` | **Sim, como requisito** |
| **R18** | Guarda de segredo **no `validateInput` das tools de escrita**, não num scanner posterior | OpenClaude `teamMemSecretGuard.ts` | **Sim, como posicionamento de controle** |
| **R19** | Extração de memória em **fork que compartilha o cache do prompt**, com tools restritas a leitura + escrita **dentro do diretório de memória**, e **aprovação por padrão** | OpenClaude `extractMemories.ts` + `governancePolicy.ts` | **Parcialmente — ver DP-02** (choca-se com "Agent Loop único") |
| **R20** | Poda **determinística** antes de qualquer LLM: preserva system, `preserveRecent`, `preserveTools`, `preserveErrors`; fallback `10%` da janela | OpenClaude `autoCompact.ts` | **Sim, como primeiro estágio de M3** |
| **R21** | **Disjuntor + cooldown** de auto-compactação; normalização defensiva de config manual (`0.5` não pode virar cauda de zero mensagens) | OpenClaude `autoCompact.ts` | **Sim, como requisito de robustez** |
| **R22** | `SUMMARY_TEMPLATE` com seções fixas (Objective / Requirements / Decisions / Work State{Completed,Active,Blocked} / Next Move / Relevant Files / Important Context) | OpenCode `session/compaction.ts` | **Sim — e casa quase 1:1 com o M3 proposto em 22/10** |
| **R23** | Retomada **at-least-once** declarada, com aviso sintético ao usuário e teto de tentativas (10) | OpenCode `session/execution/restart.ts` | **Sim, como honestidade contratual** (não como promessa de idempotência) |
| **R24** | Consulta ao histórico exposta ao modelo como **SQL somente leitura**, com limite de linhas e **falha fechada** sem authorizer | VS Code `sessionStoreSqlTool.ts` | **Sim, mas com ressalva:** SQL livre ao modelo é superfície de risco; o nosso equivalente mínimo é uma porta com filtros fechados (R8) |
| **R25** | Memória local em **arquivos** com três escopos por diretório, mutação com confirmação, injeção automática **parcial** (só usuário, teto 200 linhas) e limpeza de sessão em 14 dias | VS Code `memoryTool.tsx`, `memoryContextPrompt.tsx`, `memoryCleanupService.ts` | **Sim, como padrão de escopo e de injeção parcimoniosa** |

---

## 6. Propostas anteriores **redundantes**, superadas ou a corrigir

| # | O que estava proposto | Onde | Veredito desta consolidação |
|---|---|---|---|
| **RD-1** | "Construir corpus sintético/anotado e comparar busca exata × FTS5/BM25 **antes de escolher RAG/embeddings**; só avaliar busca semântica depois" | [`05_RECUPERACAO_CONTEXTUAL.md`](05_RECUPERACAO_CONTEXTUAL.md) "Avaliação recomendada"; [`09_RECOMENDACOES_ARQUITETURAIS.md`](09_RECOMENDACOES_ARQUITETURAIS.md) | **Parcialmente redundante / a rebaixar.** O protocolo comparativo continua válido e barato, mas a **pergunta mudou**: após auditar 4 projetos de código, **nenhum** usa embeddings ou banco vetorial para recuperar conversa. Dois usam FTS5 (VS Code, DSH), um usa `LIKE` no título (OpenCode) e um usa **léxico + re-rank por LLM pequeno** (OpenClaude). O benchmark deixa de ser "porta de entrada para decidir entre lexical e semântico" e passa a ser **verificação de qualidade do lexical no nosso corpus** (português + acentos + identificadores de código). Manter o benchmark; **remover a simetria implícita** entre as duas opções. |
| **RD-2** | M8 = "hardening + privacidade + desempenho + regressão + homologação integrada", incluindo "corrida concorrente corrigida, exclusão/retention, migração/corrupção, isolamento" | `arquivo_morto/…/fatias/M8_HARDENING_E_HOMOLOGACAO.md` | **Redundante em parte — a Task 01 já absorveu.** Concorrência de writer, atomicidade, revisão monotônica, recuperação de 409 e seus testes **já foram entregues** (P3/P4). O próprio `08_ANALISE_FATIAS_M1_M8.md` já dizia: *"M8 mais amplo continua fora deste fix e exige planejamento próprio"*. → M8 precisa ser **estreitado**: sai o que já foi feito, fica o que só existe quando houver derivado (índice, checkpoint, memória). |
| **RD-3** | "Avaliar gravação incremental somente com benchmark, já que o writer atual regrava JSONL inteiro" | `M2_TRANSCRIPT_E_EVENTOS_DE_FERRAMENTA.md` | **Prematuro / já respondido parcialmente por P2.** 200 mensagens (~235 KB) reescritas em p50 1,895 ms. **Não há gargalo medido.** Manter como **hipótese a re-medir em volume maior** (§7 H1), não como item de escopo de M2. |
| **RD-4** | "SQLite FTS5 é **candidato, não decisão**: o app já usa `better-sqlite3`, mas FTS5 precisa ser validado na build" | `M4_BUSCA_MANUAL_NO_MESMO_CHAT.md` | **Superado — a validação já foi feita (P1).** FTS5 está compilado e funcional no binding instalado, comprovado por execução em 23/10. A dúvida residual **não** é "FTS5 existe?" e sim "a relevância do FTS5 é suficiente no nosso corpus?" (§7 H2). |
| **RD-5** | M1 fala em "não inventar limite sem metadados" e "identificar limite efetivo por provider metadata / dono configurou / descritor default / desconhecido" | `M1_MEDICAO_E_ORCAMENTO.md` | **Correto, mas subestima o que já existe (P8).** Os 8 descritores **já** declaram `contexto`, o `providersRepo` **já** valida e **já** faz fallback para o default, e o campo **já** é configurável por provedor salvo. O trabalho de M1 é **propagar + capturar usage + trocar a fórmula**, não **construir a noção de limite**. |
| **RD-6** | Duas taxonomias de tipo de memória no OpenClaude (`user/feedback/project/reference` em `memdir/memoryTypes.ts` × `User/Project/Local/Managed/AutoMem/TeamMem` em `utils/memory/types.ts`) | referência | **Aviso de projeto, não proposta nossa.** Registrar como **risco de desenho**: se criarmos duas noções de "tipo de memória" em casas diferentes, teremos o mesmo problema. Decidir **uma** taxonomia antes de M5. |
| **RD-7** | "M5 — memória de projeto" e "M6 — recuperação pelo agente" tratados como fatias possivelmente sobrepostas | `08_ANALISE_FATIAS_M1_M8.md` | **NÃO são redundantes — evidência nova.** DSH tem exatamente essa separação: **armazenamento/política** de um lado, **serviço de consulta com escopos** do outro; e OpenClaude separa **`memdir` (loja)** de **`findRelevantMemories` (seleção)**. Manter separadas. |
| **RD-8** | "M4 (busca no mesmo chat)" e "M6 (busca cross-chat)" como possíveis duplicatas | idem | **NÃO são redundantes.** DSH expõe **`searchEvents(sessionId)`** e **`searchSessions()`** como **dois escopos do mesmo seam**. → A simplificação correta **não** é fundir as fatias; é **fundir a infraestrutura** (um único serviço/porta de busca com dois escopos) e manter as fatias com aceites distintos. |
| **RD-9** | Estudo de 22/10 posiciona M1–M8 como "posição hipotética 13…20" | `arquivo_morto/…/fatias/M*.md` | **Conflita com a numeração canônica D95** (`docs/06` Parte 3), em que 13 = Terminal-para-o-agente, 14 = Barra+Personalizações+Skills, 15 = Janela única de abas, 16 = Terminal 2.0, 17 = Refinamentos, 18 = Painéis, 19 = Worktree, 20 = Polimento. → **RD-9 é divergência documental, não técnica.** Ver **DP-04**. Nenhuma renumeração foi feita nesta missão. |
| **RD-10** | "Evitar memória global no corte inicial sem decisão de escopo" (M5) | `08_ANALISE_FATIAS_M1_M8.md`, `M5_MEMORIA_DE_PROJETO.md` | **Continua válido, e agora com reforço.** Nenhum dos quatro projetos de código tem memória **global automática** de usuário. VS Code tem escopo `user` **curado por ferramenta** (o agente abre/edita arquivos, com confirmação); OpenClaude tem tipos `user`/`feedback` **com aprovação de escrita por padrão**; DSH **não tem**. A única memória global observada é Meta AI — produto fechado, evidência secundária, com crítica pública registrada. → Ver **DP-05**. |

---

## 7. Hipóteses que **ainda precisam de validação**

| # | Hipótese | Por que ainda é hipótese | Como validar (sem implementar produção) | Bloqueia? |
|---|---|---|---|---|
| **H1** | O writer JSONL de reescrita integral aguenta sessões longas reais | P2 mediu **200 mensagens / 235 KB**. Sessões reais com tool results podem passar muito disso. DeepSeek tem notas de `bounded-session-persistence-write-batching` e `large-session-jsonl-restore-pipeline` — ou seja, **eles encontraram o problema** | Repetir o benchmark de P2 em 2k / 10k / 50k mensagens e com tool results realistas, medindo salvar, reler e **restaurar após restart**. Comparar com append-only **só em protótipo descartável** | **M2** (decidir append vs. reescrita) |
| **H2** | FTS5 com `unicode61` tem relevância aceitável para o nosso corpus | P1 provou que FTS5 **funciona**; não provou **relevância**. Nosso corpus é português (acentos) + identificadores de código (`camelCase`, `snake_case`, `kebab-case`) + caminhos Windows. DSH usa `unicode61`; Cline **exclui** multimodal/reasoning/metadata e limita documento a 128 KiB | Corpus anotado sintético (perguntas × mensagens-fonte), medir **precisão@k, recall@k, MRR**, latência, tamanho do índice. Testar especificamente: acentuação, prefixo de identificador, caminho com `\`, e "palavras diferentes das originais" (o caso de uso declarado pelo dono) | **M4** (e M6) |
| **H3** | Seleção/re-rank por LLM tem custo e latência aceitáveis **com os nossos provedores** | R13/R14 mostram o padrão funcionando **com modelo pequeno e rápido**. Nós temos 8 provedores, incluindo Ollama local (32k de janela, modelo escolhido pelo dono) e um genérico OpenAI-compatible. **Não medimos nada** | Medir com provedor **autorizado e em ambiente seguro** (D91/D99): latência, tokens consumidos, taxa de acerto. Se não houver acesso legítimo, registrar como **bloqueado/não executado**, nunca como "passou" | **M6** |
| **H4** | `usage` é de fato obtível nos protocolos que suportamos | P10 mostra que **não lemos** usage. O estudo de 22/10 registrou o bloqueio por falta de credencial. A documentação dos 4 protocolos (OpenAI Chat `usage`, Anthropic `usage`, Gemini `usageMetadata`, Ollama `prompt_eval_count`/`eval_count`) é conhecida, mas **o suporte real varia por endpoint/modelo** — e o dono usa LiteLLM e Ollama Cloud, que são intermediários | Com credencial autorizada: uma chamada por protocolo, registrar **somente os campos de uso**, nunca o segredo. Marcar por par (provedor, modelo) como `reportado` / `não reporta` / `intermediário altera` | **M1** |
| **H5** | O comportamento em **413 / overflow** é conhecido para os nossos provedores | Temos a categoria `'limite'` (413) no contrato, mas **nenhuma evidência** de como cada provedor sinaliza estouro, nem de se o erro chega antes ou depois de consumir tokens | Provar contra endpoint controlado/autorizado com payload deliberadamente grande; registrar status, corpo sanitizado e momento | **M3** (recuperação de overflow) |
| **H6** | A identidade de projeto por `slug` derivado de `workspacePath` é suficiente para memória | §2.5 mostra o mecanismo; **não** medimos quantos projetos reais do dono seriam fragmentados | Levantar com o dono os caminhos reais que ele usa; testar os casos: mesmo repo por dois caminhos, repo movido, subpasta vs. raiz, worktree | **M5/M6** — e é a **DP-01** |
| **H7** | Um índice derivado em SQLite adicional não degrada o boot nem a RAM | Sabemos que a RAM é ~1,9 GB no sandbox (`docs/01 §3.B.7`) e que o build já morreu por OOM. DSH mantém índice separado e descartável; **não medimos** o custo no nosso processo único | Protótipo descartável: abrir o índice, indexar N sessões, medir boot, RSS e latência de consulta. Rodar **com um Vite só** (`docs/09 §4.1`) | **M4** |
| **H8** | Prompt injection via transcript/memória é um risco real **no nosso fluxo** | Todas as propostas desde 22/10 listam isso como risco; **ninguém reproduziu**. DSH mitiga rotulando como `untrusted` e colocando em `additionalContext` de mensagem de **usuário**; OpenClaude mitiga com "verificar antes de recomendar" | Caso de teste: gravar num transcript/memória um texto que instrui uma ação; verificar se o agente executa sem aprovação. Deve rodar **somente em fixture** e com as permissões atuais (Manual) | **M5/M6/M8** |
| **H9** | A exclusão de uma memória apaga **todos** os derivados | §3.5 (Meta Muse) mostra o contra-exemplo público. Nosso código **ainda não tem** derivados, então hoje é trivialmente verdadeiro — deixará de ser quando houver índice, checkpoint e memória | Definir e testar a cascata: apagar origem ⇒ invalidar índice + marcar checkpoint que a citou + remover de qualquer manifesto/cache | **M5/M8** |
| **H10** | `feature()`/tree-shaking e flags são um padrão aplicável a nós | OpenClaude usa `feature('TEAMMEM'|'EXTRACT_MEMORIES'|'MEMORY_SHAPE_TELEMETRY')` do `bun:bundle`; nós somos **Vite/React**, sem Bun | Verificar se o mecanismo equivalente no Vite (`define`/`import.meta.env` em build) atende, ou se usamos **configuração em runtime** (como já fazemos com `providers.json` e o teto da Config). **Tender a runtime**, porque o dono homologa no Windows sem rebuild | Não bloqueia; **decisão de desenho** |

---

## 8. Decisões pendentes (contradições arquiteturais registradas — **sem solução inventada**)

> Conforme o item 5 da missão: *"Caso encontre uma contradição arquitetural importante que impeça uma recomendação confiável, registre a questão como decisão pendente. Não invente uma solução para completar a documentação."*

### DP-01 — O que é "o mesmo projeto"? 🔴 **impede recomendação confiável para M5/M6**

- **Fato nosso:** `slug = sanitizePath(session.workspacePath)` (`index.ts:154`), fixado no primeiro save. Diretório `~/.agente_window/projects/<slug>/`.
- **Fato das referências:** OpenClaude ancora na **raiz do Git** (`<base>/projects/<sanitized-git-root>/memory/`); DSH indexa e filtra por **`cwd`**; VS Code usa `storageUri` (workspace) **e** um escopo `repo` no storage local da extensão; a documentação do GitHub separa "fatos de repositório" de "preferências pessoais".
- **Conflito interno nosso:** **D104** diz *"Autorizações não transitam automaticamente entre projetos. Troca de sessão, **pasta ou identidade do projeto** exige revalidação"* — usando "pasta" **e** "identidade do projeto" como coisas distintas, sem definir a segunda. Já a Fatia 06 decidiu que **`git rev-parse --show-toplevel` só pode ser exigido quando a chamada usar `requireGit=true`/`useWorktree=true`** (`docs/04 §1.1`, fluxo 06.4a) — ou seja, **Git é explicitamente opcional** no nosso modelo de workspace.
- **Por que impede:** se "projeto" = caminho, memória de projeto **fragmenta** (mesmo repo por dois caminhos, repo movido). Se "projeto" = raiz do Git, **exclui** as pastas sem Git — que o nosso fluxo 06.4a aceita de propósito. Se for um terceiro ID explícito, é uma **nova entidade** com migração de dados.
- **Opções (não avaliadas, não recomendadas — apenas enumeradas para deliberação):** (a) manter `slug` por caminho e aceitar fragmentação; (b) derivar da raiz do Git **quando houver**, com fallback para caminho; (c) ID de projeto explícito escolhido/confirmado pelo dono na primeira abertura; (d) manter caminho como identidade **de armazenamento** e adicionar um campo de **agrupamento** opcional para memória.
- **O que NÃO foi feito:** nenhuma opção foi escolhida, nenhuma migração foi desenhada, nenhum código foi tocado.

### DP-02 — Extração automática de memória cabe no "Agent Loop único"? 🟡 **não impede M5 explícito; impede M5 automático**

- **Fato da referência:** OpenClaude roda `extractMemories` como **fork do agente** (`runForkedAgent`) no fim de cada loop de query, com **cache de prompt compartilhado** e tools restritas (R19).
- **Fato nosso:** `docs/04 §1.5`, condições comuns para adoção, item (2): preservar *"**Agent Loop único**"* e *"não criar serviços redundantes"*. `docs/02 §1.5`: *"Separação entre memória, recuperação de informações e estado de execução."*
- **Conflito:** um fork de agente é **um segundo loop**. Ou (i) abrimos exceção documentada ao "Agent Loop único" para forks internos de manutenção, ou (ii) fazemos extração **dentro** do loop existente (custo: ocupa iterações do teto da Fatia 11 e pode consumir o orçamento do usuário), ou (iii) **não fazemos extração automática** (memória só explícita: `/remember`, botão, ou pedido do dono).
- **Nota:** a opção (iii) é a **única** que não exige decisão arquitetural nova, e é compatível com o que VS Code e DSH fazem (memória **curada**, não extraída). OpenCode **não tem** extração automática. Ou seja: **3 das 4 referências de código não fazem extração automática.**
- **O que NÃO foi feito:** nenhuma opção foi escolhida.

### DP-03 — Fidelidade de tools × conteúdo sensível: onde mora o conteúdo grande? 🟡 **impede fechar o contrato de M2**

- **Fato nosso:** M2 precisa persistir tool calls/results para haver replay protocolar; ao mesmo tempo, `docs/02 §1.5` exige *"proteger credenciais e dados sensíveis"* e a proposta de 22/10 já listava *"persistir bytes ou refs de anexos"* como pendente.
- **Fato das referências:** DSH resolve com **spill** (R4) — conteúdo verbatim em artefato separado, localizador opaco no contexto, bytes exatos, retenção própria. OpenClaude resolve com **truncamento + `<persisted-output>`**. VS Code resolve com **truncamento duro** no Chronicle (1k/5k/1k chars). Cline resolve com **limite de 128 KiB por documento** e exclusão de multimodal/reasoning.
- **Conflito:** são **quatro respostas diferentes**, com garantias diferentes. Escolher uma define (a) se o transcript continua sendo a fonte completa, (b) se precisamos de um novo subsistema de armazenamento, (c) o que sobrevive a exclusão/backup, (d) se `ler` de um arquivo com segredos grava segredo em disco **fora** do workspace.
- **Agravante nosso:** a tool `ler` lê arquivos do workspace do dono. Se o resultado completo for persistido em `~/.agente_window/projects/<slug>/`, **conteúdo do projeto passa a existir fora do projeto** — inclusive segredos que estavam só num arquivo local. Isso é uma decisão de privacidade do dono, não técnica.
- **O que NÃO foi feito:** nenhuma das quatro respostas foi adotada.

### DP-04 — Numeração: as fatias M têm "posição" no roadmap? 🟢 **documental; não impede a proposta técnica**

- **Fato:** `docs/05` D109 fixa a sequência **M1 → M2 → M3 → M4** (revogando a especificação paralela M1/M2 da D102). `docs/02 §4` diz que **M5–M8** estão formalizadas **somente para planejamento** (D102) e que *"os rótulos M não são números oficiais de fatia"*. `docs/06` mantém a ordem oficial **D98 → 13 → 14 → 15 → M1 → M2 → M3 → M4**.
- **Fato divergente:** o pacote de 22/10 atribui "posição hipotética 13…20" a M1–M8, o que **colide** com a numeração D95 (13 = Terminal-para-o-agente, já implementado e homologado manualmente; 14 = Barra+Personalizações+Skills; 15 = Janela única de abas; 20 = Polimento+Navegador).
- **Conflito:** dois esquemas de numeração circulando para os mesmos rótulos — exatamente a armadilha que `docs/01 §1` lista como conhecida (*"as 4 numerações que circulam"*).
- **O que NÃO foi feito:** **nenhuma renumeração, nenhuma alteração de sequência canônica** (proibido pela missão, item 9). A Task 03 usa **apenas** os rótulos M1–M8 e propõe ordem **interna** entre eles, sem tocar na posição oficial.

### DP-05 — Memória global do usuário entra no primeiro corte? 🟡 **o dono pediu os três escopos; a evidência recomenda cautela**

- **Pedido do dono (item 1 da missão):** três escopos — conversa, projeto, **global do usuário "disponível entre projetos conforme regras de acesso"**.
- **Fato das referências:** ver RD-10. **Nenhum** projeto de código auditado tem memória global **automática**. O que existe: VS Code com escopo `user` **curado por ferramenta e confirmado**; OpenClaude com tipos `user`/`feedback` **e aprovação de escrita por padrão** (`isMemoryWriteApprovalRequired()` retorna `true` salvo `false` explícito); DSH **terceirizando** para MCP; Meta AI com memória global **opt-in, editável, 1:1-only** — e com o caso Muse reportado como excesso.
- **Conflito:** o escopo global pedido **não tem precedente de implementação segura** nas referências de código; o único precedente em produto é justamente o que gerou crítica pública (dossiês horários, "pode continuar lembrando do que foi apagado").
- **Recomendação de processo (não de arquitetura):** tratar memória global como **decisão própria, posterior**, com requisitos mínimos observados nas referências: opt-in explícito, dashboard de ver/editar/apagar, apagamento em cascata (H9), sanitização de segredos (R17) e **nenhuma inferência de objetivo não declarado**.
- **O que NÃO foi feito:** o escopo global **não** foi desenhado nem proposto como fatia. A Task 03 o mantém **fora do corte M5** e o registra como decisão do dono.

### DP-06 — Quem monta o contexto de cada request? 🟡 **lacuna de responsabilidade, não contradição**

- **Fato:** hoje a montagem é `montarHistorico` no `App.tsx:1678` — **no browser**, reduzindo a texto. Com M1 (orçamento), M2 (eventos fiéis), M3 (checkpoint + cauda) e M6 (trechos recuperados), a montagem passa a depender de dados e decisões **do servidor** (usage, sequência, fronteiras de tool, escopo autorizado).
- **Conflito com regras duras:** `docs/04 §1` regra 3 — **`App.tsx` só wiring aditivo**; e `docs/01 §3.F` — *"módulo nunca importa do shell"*, composição na **prefeitura**. Uma montagem de contexto rica **não pode** continuar no `App.tsx`.
- **Nenhuma fatia M1–M8 proposta em 22/10 nomeia explicitamente esse dono.** M1 fala do medidor, M3 do checkpoint, M6 da recuperação — mas **"quem monta o request"** fica implícito.
- **Registro:** a Task 03 propõe nomear esse contrato explicitamente (**Projeção de Contexto**) e atribuí-lo, **como proposta**, à prefeitura (`chatAlvo.ts` já é o ponto onde Provedores e Conversa se encontram) — **PENDENTE DE APROVAÇÃO**, porque criar um novo ponto de composição é decisão arquitetural.

---

## 9. Tecnologias que podemos **aproveitar**

### 9.1 Já estão no projeto (custo zero de dependência)

| Tecnologia | Onde | Para quê |
|---|---|---|
| **`better-sqlite3@^12.11.1`** | única dependência de banco em produção; WAL + `foreign_keys=ON` já ligados | M2 (eventos), M4/M6 (índice FTS5 — **P1 provou**), M5 (memória), M7 (estado operacional) |
| **FTS5 (`unicode61`)** | compilado no binding instalado (**P1**) | M4/M6 — mesmo mecanismo usado por VS Code (Chronicle) e DSH |
| **SQLite + JSONL, dois armazenamentos com papéis distintos** | `database.ts` (catálogo) + `transcripts.ts` (mensagens) | manter; **não migrar sem benchmark e plano de rollback** (`09_RECOMENDACOES §Prioridade 0`) |
| **Fila por sessão + temporário exclusivo + revisão monotônica** | Task 01 | base de confiabilidade para tudo que escrever derivado |
| **`~/.agente_window/projects/<slug>/`** com guarda anti-traversal | `paths.ts` | M5: diretório de memória de projeto **já tem lugar** |
| **`randomUUID` de `node:crypto`** | já usado em `transcripts.ts:1` | identificadores de evento, checkpoint, memória |
| **`CategoriaErro`/`CategoriaErroAgir`** (taxonomia fechada, mensagens em PT-BR claro) | `conversa/contract.ts`, `agir/contract.ts` | M1–M7: estender **aditivamente**, no mesmo estilo (é o equivalente local das taxonomias fechadas do DSH) |
| **Padrão casa/porta única + fiscal de fronteira** (`frontier.test.ts` em `explorer-search` e em `agir`) | Monolito Modular D68–D70 | todas as fatias M entram como **casa nova ou extensão aditiva**, nunca como internals importados |
| **`shellCommandRegistry` / prefeitura** | `docs/01 §0.1` | ponto de composição para DP-06 |
| **`obterAlvoDeConversa`** (`server/chatAlvo.ts`) | já é o único lugar onde Provedores + Conversa se encontram, e já valida habilitação, modelo, baseUrl e chave | M1: **candidato natural** para carregar `contexto` (já vem do `providersRepo`) |
| **`EventoAgir.iteracao`** (`{ iteracao, teto, model? }`) | já existe no fio | M1: **veículo aditivo natural** para um snapshot de uso por iteração |
| **Casa Config** (`lerTeto`) | já injetada pela prefeitura nas rotas do Agir | M1: precedente de **limite configurável pelo dono** — o mesmo mecanismo serve para orçamento/limiar de compactação |
| **`AGENTS.md` na raiz do repo** | já existe (1 linha, apontando para `docs/01`) | **candidato** a instruções persistentes de projeto — mas hoje **não é lido pelo aplicativo**; decidir se vira mecanismo de produto é decisão nova |

### 9.2 Padrões a adaptar (custo de projeto, sem custo de dependência)

R1 (índice descartável) · R2 (corte por pareamento) · R3 (âncora + delta) · R4 (spill) · R5 (seam opcional) · R6 (trava start→end) · R7 (dois escopos) · R8 (query como dado) · R9 (política de indexação) · R10 (contabilidade + untrusted) · R11 (o que não salvar) · R12 (verificar antes de recomendar) · R13 (manifesto + seleção com viés de precisão) · R14 (léxico + re-rank com viés de recall) · R15 (indexar o visível) · R16 (cache de texto de busca) · R17/R18 (sanitização e guarda no validateInput) · R20 (poda determinística) · R21 (disjuntor + cooldown) · R22 (template de resumo) · R23 (at-least-once declarado) · R25 (escopos por diretório + injeção parcimoniosa).

**Todos como conceito.** `docs/04 §1.5` já estabelece as condições comuns: SPEC aprovada identificando necessidade e consumidor, preservar Monolito Modular / processo local único / Single Port / casas e contratos / Agent Loop único / SQLite+JSONL, revisar proveniência e licença, e **demonstrar por testes reproduzíveis no nosso produto** antes de declarar adoção. **OpenClaude permanece somente referência conceitual** (proveniência; licença `NOASSERTION`).

### 9.3 O que **não** é necessário agora

| Não usar | Por quê (evidência) |
|---|---|
| **Banco vetorial / embeddings / auto-RAG** | **Nenhum** dos quatro projetos de código auditados usa para recuperar conversa: VS Code = FTS5+BM25; DSH = FTS5 `unicode61` + filtros de metadata; OpenCode = `LIKE` no título; OpenClaude = léxico + re-rank por LLM pequeno. O servidor de memória de referência do ecossistema MCP faz *"case-insensitive substring matching […] not semantic retrieval"* e *"does not add embeddings"*. Adicionar embeddings traria custo, superfície de segurança, dependência e (se remoto) **decisão de consentimento/retenção** — sem problema medido que o justifique (§7 H2 é sobre relevância **do lexical**, não sobre falta de semântica) |
| **Serviço de memória remoto / em nuvem** | `docs/02 §1.5`: armazenamento **local** preferencialmente em `~/.agente_window`; nenhuma telemetria externa presumida. **D105**: acesso exclusivamente local nesta etapa. DSH remove variáveis de credencial antes de lançar um MCP filho — sinal de que mesmo o caso local exige cuidado |
| **Servidores MCP de memória (Memorix / server-memory / Engram)** | São **default-off** até no DSH, exigem Node 22+/Go 1.25+ instalados globalmente e processo filho separado. Nosso MVP é **um prédio** (`docs/01 §0.1`). Integração MCP é evolução futura (Fatia 14 cobre skills v1, **não** plugins/MCP completos — `docs/08`) |
| **Segundo motor de banco (DuckDB, Postgres, `node:sqlite`)** | DSH usa `node:sqlite` porque é o runtime deles; nós já temos `better-sqlite3` com FTS5 comprovado (P1). Adicionar motor = dependência nova sem necessidade, contra `docs/02 §1.6` |
| **Múltiplos agentes / subagentes para memória** | OpenClaude tem `AgentTool`/`subagent`, DSH tem `packages/subagent` — mas **a recuperação de memória deles não usa subagente**: usa `sideQuery` com modelo pequeno. Nós temos Agent Loop único (DP-02). Não há caso medido |
| **Memória global automática de usuário** | DP-05. Sem precedente seguro nas referências de código; único precedente em produto tem crítica pública registrada |
| **Compactação automática como primeiro corte** | R20/R21 mostram que auto-compactação exige thresholds, disjuntor, cooldown, normalização de config e poda determinística — **superfície grande**. As próprias propostas de 22/10 já diziam *"começar manual/opt-in"*. DSH trata compaction como **seam opcional**, não espinha |
| **Migração do writer JSONL para append-only** | RD-3 + H1: **sem gargalo medido** em 200 mensagens. Só avaliar depois de medir volume real |
| **SQL livre exposto ao modelo** (estilo `SessionStoreSqlTool`) | R24: exige authorizer do SQLite (Node 24.10+); nós rodamos Node **20.20.2**. Além disso, é superfície de risco desnecessária quando filtros fechados (R8) resolvem |

---

## 10. Riscos e dependências a considerar

| # | Risco | Severidade | Evidência / precedente | Mitigação disponível (não aplicada) |
|---|---|---|---|---|
| **R-1** | **Prompt injection via memória/transcript.** Texto histórico recuperado pode conter instrução. | **Alta** | DSH rotula como *untrusted* e injeta em `additionalContext` de mensagem de **usuário**; OpenClaude tem seção própria "Before recommending from memory" validada por eval; nosso `09_RECOMENDACOES` já lista "texto histórico recuperado é dado não confiável, nunca instrução executável" | Rótulo de não-confiável + posição no request + verificação antes de recomendar + **nunca** executar ferramenta com base só no trecho (§7 H8) |
| **R-2** | **Segredo persistido em memória/transcript fora do workspace.** A tool `ler` lê arquivo do projeto; gravar o resultado em `~/.agente_window` **move** o segredo para fora do projeto. | **Alta** | OpenClaude tem `sanitizeMemoryText` **antes** de gravar + `checkTeamMemSecrets` **no `validateInput`** das tools de escrita; D125 explicitamente **não** oferece isolamento contra outros usuários da máquina | R17 + R18 + decisão DP-03 (spill vs. verbatim vs. truncar) |
| **R-3** | **Derivado sobrevive à exclusão da fonte.** | **Alta** | Meta Help Center citado: *"Muse may still remember information it learned from what you deleted"*. Nosso caso: apagar mensagem/sessão deve invalidar índice, checkpoint que a citou e manifesto em cache | Cascata de exclusão explícita + teste (§7 H9); DSH já tem `retention.ts`/`cleanup.ts` no spill e limpeza de 14 dias no VS Code |
| **R-4** | **Memória obsoleta apresentada como verdade atual.** | **Alta** | `MEMORY_DRIFT_CAVEAT` e `TRUSTING_RECALL_SECTION` do OpenClaude, com eval: H1 0/2→3/3 quando em seção própria, **0/3** quando enterrado como bullet | R12 + propagar `mtime`/data de origem (R13) + estado `provisional/confirmed/superseded` (já proposto em 22/10) |
| **R-5** | **Indicador de contexto enganoso continua em produção enquanto M1 não vem.** | **Média-Alta** | `ChatInput.tsx:177` mostra "18% … 92%" derivado de chars do rascunho. O dono **vê** esse número hoje | M1 é a fatia de menor risco e maior honestidade imediata; pode ser fatiada em M1-a (remover/rotular o sintético) e M1-b (usage real) |
| **R-6** | **Crescimento sem teto do payload.** `montarHistorico` reenvia **todo** o texto elegível do chat, sem corte. | **Média-Alta** | `05_RECUPERACAO_CONTEXTUAL.md`: *"pode crescer sem orçamento explícito"*. Temos categoria `'limite'` (413) mas **nenhuma** evidência de comportamento real (H5) | M1 (orçamento) → M3 (poda determinística R20 antes de LLM) |
| **R-7** | **RAM/build.** Sandbox com ~1,9 GB; `vite build` já morreu por OOM/exit 137 em duas ocasiões registradas. | **Média** | `docs/09 §4.1`; `06_RESULTADOS_DOS_TESTES.md` (exit 137); `docs/07` (build oficial abortou por OOM); `08_PROVAS_TECNICAS` não repetiu | Um Vite por vez; índice derivado **fora** do bundle; medir H7 antes de indexar em runtime |
| **R-8** | **Windows é o ambiente de homologação e o runner não tem Windows.** | **Média** | P4 mostra que o NTFS se comporta de modo **materialmente diferente** (47% EPERM em rename concorrente). Toda fatia M que escrever em disco tem risco específico de Windows | Manter o padrão da Task 01: entregar + registrar + **parar para validação no Windows do dono** |
| **R-9** | **Dois armazenamentos sem transação distribuída.** | **Média** | Limitação 2 do auditor independente: SIGKILL entre publicar JSONL e upsert SQLite ⇒ descompasso residual | Ordem de gravação já mitigada (JSONL primeiro); adicionar reconciliação na leitura é proposta, não decisão |
| **R-10** | **Fila só em memória de processo.** | **Média** | Limitação 1 do auditor independente | Aceito para MVP (um prédio); **registrar** que memória/índice herdam o mesmo limite |
| **R-11** | **Proveniência/licença.** OpenClaude com `license: NOASSERTION` e NOTICE de código proprietário derivado. Open WebUI com licença por proveniência/data. | **Média** | `docs/04 §1.5`; `05_LICENCAS_E_DEPENDENCIAS.md` | Somente conceito; revisar licença **por arquivo** se um dia houver cópia localizada autorizada |
| **R-12** | **Fragilidade de prompt.** Posição e cabeçalho de instrução mudam a taxa de acerto (0/3 vs 3/3 no mesmo corpo de texto). | **Média** | evals internos do OpenClaude citados em comentário de código | Qualquer instrução de memória/M6 precisa de **teste de comportamento**, não só teste unitário de plumbing |
| **R-13** | **Custo/latência de chamadas auxiliares.** Seleção de memória e re-rank usam uma chamada extra de modelo. | **Média** | R13/R14 usam `getSmallFastModel`/`sideQuery`. Nós não temos noção de "modelo pequeno rápido" configurada; o dono usa Ollama local e pool LiteLLM | H3; tornar a chamada auxiliar **opcional e desligável**, com fallback puramente léxico (como o DSH faz com o índice: opcional e descartável) |
| **R-14** | **Duplicação de noções.** Duas taxonomias de tipo de memória convivem no OpenClaude. | **Baixa-Média** | RD-6 | Decidir **uma** taxonomia antes de M5; registrar em `docs/05` quando aprovado |
| **R-15** | **Perda de histórico do Git.** O `.git` foi reinicializado nesta sessão. | **Baixa (operacional)** | §0. Docs citam hashes (`0dfe3c2`, `71c8de7`, `ecdab7c`, `8ec2dda`, `8793b9e`, …) que **não existem mais nesta cópia**; `docs/04 §4` diz que prints e `referencias_visuais/` são *"recuperáveis no histórico do Git"* — **não são mais, a partir desta cópia** | Registrar a divergência (feito em §0) e deixar ao dono decidir se recupera o histórico antigo do GitHub. **Nenhuma ação foi tomada** |

### 10.1 Dependências externas

| Dependência | Estado | Impacto |
|---|---|---|
| **Credencial de provedor real** para H4/H5/H3 | **Bloqueada** (D91/D99: sem ambiente/acesso/autorização seguros ⇒ registrar como bloqueado) | M1 não pode declarar `usage` real sem isso; pode entregar o contrato e os estados `estimado`/`indisponível` |
| **Windows 11 do dono** | Disponível só com ele | Toda fatia que escreve em disco exige essa etapa |
| **Node 20.20.2** | Fixo no sandbox | Exclui `node:sqlite` estável e o authorizer do SQLite (R24) |
| **RAM ~1,9 GB** | Fixa no sandbox | Exclui bateria pesada + build simultâneo; H7 precisa ser medido com folga |
| **Fatia 13 (executar) e DEBT-23 (permissões)** | Implementada; homologação manual limitada | M7 depende do contrato de `executar` para saber o que é "efeito já realizado" |
| **Fatia 14 (Personalizações/skills)** | Não iniciada | Skills/MCP são o caminho natural para memória plugável; M5/M6 não devem antecipar |
| **Fatia 15 (janela única de abas)** | Não iniciada | Define onde uma UI de busca/memória pode viver |

---

## 11. Conclusões técnicas da Task 02

1. **O nosso gargalo não é falta de tecnologia de recuperação — é fidelidade da fonte.** Três lacunas concretas, todas confirmadas em código: o transcript não guarda a troca de ferramentas (§2.2), o indicador de contexto é uma fórmula sobre o rascunho (§2.3) e a continuidade operacional mora em sete `Map`s voláteis (§2.4). **Nenhuma camada de memória construída sobre essa fonte recupera o que não foi gravado.**
2. **M1 é muito mais barato do que parecia.** O denominador já existe nos 8 descritores, é configurável, validado e com fallback (P8). Falta propagar, capturar `usage` (P10) e trocar a fórmula por estado honesto. O desenho do DSH (R3) resolve a armadilha conhecida — **compactação não reporta usage**, então um medidor só de `usage` fica cego após compactar; a resposta é **âncora do provedor + delta heurístico**.
3. **M2 é o pré-requisito de tudo.** Sem eventos fiéis com identidade e sequência, não há checkpoint validável (M3), não há busca com trecho original (M4), não há memória com proveniência (M5), não há recuperação citável (M6) e não há estado operacional reconstruível (M7).
4. **Nenhuma referência usa embeddings ou banco vetorial para recuperar conversa.** Quatro projetos de código, quatro respostas diferentes, **todas léxicas ou por seleção de LLM sobre metadata** (§4, última linha; §9.3). A hipótese de que "precisamos de RAG" **não tem suporte** na evidência reunida. O que tem suporte é: FTS5 descartável (P1/R1), dois escopos de busca (R7), query como dado (R8), e — opcionalmente — re-rank por modelo pequeno (R14).
5. **Compactação tem um pré-requisito algorítmico que não é de IA.** `toolPairingBalancedBefore/After` (R2) é um predicado determinístico, testável e com falha fechada. E a **poda determinística** (R20: preservar system/recentes/tools/erros) e o **pruning de tool result** (R4/DSH: pode avançar a superfície **sem resumo**) reduzem tokens **sem chamar modelo nenhum**. Isso significa que M3 pode entregar valor **antes** de qualquer sumarização por LLM.
6. **O requisito de "confiabilidade" tem mecanismo concreto e evidência de avaliação.** R11 + R12: política do que **não** salvar (com gate mesmo sob pedido explícito) + verificar arquivo/função antes de recomendar + tratar memória como afirmação datada + preferir `git log`/código a snapshot. Com números de eval e um alerta de projeto: **posição e cabeçalho da instrução mudam o resultado** (R-12).
7. **Memória de projeto tem lugar físico pronto, mas não tem identidade estável.** `~/.agente_window/projects/<slug>/` existe e tem guarda anti-traversal (P9); o `slug`, porém, deriva do caminho (DP-01/H6). **É a única contradição que impede uma recomendação confiável** para M5/M6 — e foi registrada como pendência, **sem solução inventada**.
8. **M4 e M6 não são duplicatas; a infraestrutura é que deve ser única.** DSH expõe `searchEvents(sessionId)` e `searchSessions()` no **mesmo** seam (R7). A simplificação correta é **um serviço de busca com dois escopos**, não duas implementações.
9. **M8 precisa ser estreitado.** Concorrência, atomicidade, revisão monotônica e recuperação de 409 **já foram entregues e aprovadas tecnicamente** (P3/P4, RD-2). O que resta em M8 é o que só existe **quando houver derivado**: índice, checkpoint, memória, cascata de exclusão, isolamento entre escopos, segredos e regressão integrada.
10. **Busca no transcript tem um critério de correção que não estava nas nossas propostas.** R15: indexar **o texto que o usuário vê**; forma desconhecida indexa vazio, porque *"under-count is honest, phantom is a lie"*. Um resultado que aponta para texto que não aparece na tela é uma mentira — e isso é exatamente o tipo de coisa que o requisito de Confiabilidade do dono proíbe.
11. **A Task 01 está tecnicamente aprovada e pendente de homologação oficial** (§0.1). Suas quatro limitações registradas (fila em memória, dois armazenamentos sem transação distribuída, `pagehide`, quota de `localStorage`) **são herdadas** por qualquer fatia M que escreva em disco — e devem ser repetidas nos aceites, não redescobertas.
12. **Nada disto está pronto para virar norma.** Cinco decisões pendentes (DP-01 a DP-06, sendo DP-01 bloqueante) e dez hipóteses (H1–H10) separam esta consolidação de uma SPEC implementável. A Task 03 converte esse material em **proposta**, nunca em decisão.

---

## 12. Registro de conformidade da Task 02

| Exigência da missão | Cumprimento |
|---|---|
| Conferir o estado real do repositório e registrar se a correção da Task 01 foi homologada/commitada | ✅ §0 e §0.1 |
| Não alterar o estado da correção | ✅ nada tocado |
| Investigar `docs/arquivo_morto/investigacao_memoria_fatias_m/` | ✅ os 13 arquivos lidos |
| Investigar relatórios anteriores de memória e persistência | ✅ `arquivo_morto/estudo_memoria_contexto_2026-10-22/` (10 arquivos + 8 propostas de fatia) |
| Documentação atual das Fatias M1 a M8 | ✅ `08_ANALISE_FATIAS_M1_M8.md` + as 8 propostas de 22/10 + D99/D102/D109 em `docs/05`/`06` |
| Roadmap e contratos existentes | ✅ `docs/06` (Partes 1–4), `docs/04` (§1, §1.5–§1.8), `docs/05` (D1–D126) |
| Código atual, para confirmar capacidades | ✅ §2, com arquivo + linha |
| VS Code/Copilot, OpenCode | ✅ reaproveitados, sem duplicar pesquisa (§3.1, §3.2) |
| **OpenClaude correto** (`Twigpine/openclaude`) | ✅ §3.4 — snapshot **novo** `3a8e12b`, investigado agora |
| **DeepSeek Harness** (ferramentas, recuperação, verificação) | ✅ §3.3 — investigado agora |
| **Meta AI** | ✅ §3.5 — lacuna preenchida, com grau de evidência declarado **baixo** |
| Não presumir que todos oferecem os mesmos mecanismos | ✅ matriz §4 mostra ✔/◐/✘ por projeto |
| Diferenciar comprovado × proposta × hipótese × não encontrado | ✅ §1 (critérios), §5, §7, §2.6 |
| Evitar repetir pesquisas já documentadas | ✅ VS Code/OpenCode reaproveitados; só DeepSeek/OpenClaude/Meta foram investigados de novo |
| Análises obrigatórias (7 eixos) | ✅ conversa (§2.2, §3.x, R22/R20) · projeto (§2.5, DP-01, R11/R25) · global (DP-05, §3.5) · continuidade (§2.4, R23, R6) · recuperação contextual (§3.3c/d, §3.4c/d/e, R7/R13/R14/R15) · confiabilidade (§3.4a, R11/R12/R17, R-1/R-4) · gerenciamento de contexto (§2.3, §3.3a/b, R3/R20/R4) |
| Não assumir RAG/embeddings/banco vetorial/múltiplos agentes | ✅ §9.3 justifica a exclusão por evidência |
| Não criar arquitetura nova nesta etapa | ✅ §8 registra contradições **sem** resolvê-las; §11 são conclusões, não desenho |
| Registrar contradição arquitetural como decisão pendente | ✅ DP-01 a DP-06 |
| Matriz comparativa objetiva | ✅ §4 |
| Registrar formalmente o resultado antes da Task 03 | ✅ este arquivo, gravado antes de iniciar `12_TASK03_…` |
| Não alterar código-fonte | ✅ `git status` limpo ao final (§0) — verificação repetida no fim da missão |
| Não alterar documentação canônica | ✅ `docs/01`–`09` intactos |
| Não alterar roadmap / não criar fatias oficiais | ✅ nenhuma numeração oficial tocada (DP-04) |
| Não fazer commit nem push | ✅ nenhum |
| Não instalar dependência no projeto | ✅ nada em `platform/`; o clone raso do OpenClaude ficou em `/home/user/.cache/refs/`, fora do snapshot |
