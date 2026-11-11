# Investigação técnica da arquitetura de memória — Fatias M1–M8

> **ARQUIVADO em 11/11/2026, revisão sobre a base `2ac978d`.** Este conjunto preserva os estudos anteriores; seu status abaixo é histórico. Não é documentação canônica vigente. A implementação e sua evolução são regidas pelos nove documentos ativos em `docs/`, especialmente a decisão D196. A mudança de endereço preservou os 19 arquivos; apenas referências e este aviso foram atualizados.

**Status:** investigação M1–M8 continua sem implementação de memória; correção localizada da persistência executada na Task 01, sem alteração de roadmap ou documentos canônicos.  
**Início:** 2026-10-30 (America/Sao_Paulo).  
**Projeto auditado:** `/home/user/agente_window`, HEAD `971a59f5d2a5118e8526d2829ba26039a344b796`, branch `main`, árvore limpa no início da investigação.  
**Escopo:** código atual do Agente Window, relatórios anteriores datados de 2026-10-22/23/24, documentação oficial corrente de VS Code/GitHub Copilot e OpenCode, e testes isolados descartáveis quando possível.

> Relatório investigativo. Nenhuma recomendação está aprovada para implementação. A ausência de achado limita-se aos caminhos e versões explicitamente auditados. Os artefatos anteriores são pistas, não prova atual; conclusões relevantes serão revalidadas contra o HEAD acima.

## Documentos

1. [01 — Estado atual do Agente Window](01_ESTADO_ATUAL_AGENTE_WINDOW.md)
2. [02 — Referências VS Code / GitHub Copilot](02_REFERENCIAS_VSCODE_COPILOT.md)
3. [03 — Referências OpenCode](03_REFERENCIAS_OPENCODE.md)
4. [04 — Arquiteturas de memória](04_ARQUITETURAS_DE_MEMORIA.md)
5. [05 — Recuperação contextual](05_RECUPERACAO_CONTEXTUAL.md)
6. [06 — Resultados dos testes operacionais](06_RESULTADOS_DOS_TESTES.md)
7. [07 — Matriz comparativa](07_MATRIZ_COMPARATIVA.md)
8. [08 — Análise M1–M8](08_ANALISE_FATIAS_M1_M8.md)
9. [09 — Recomendações arquiteturais](09_RECOMENDACOES_ARQUITETURAIS.md)
10. [10 — Pendências e limitações](10_PENDENCIAS_E_LIMITACOES.md)
11. [11 — **TASK 02**: Consolidação da investigação](11_TASK02_CONSOLIDACAO_DA_INVESTIGACAO.md)
12. [12 — **TASK 03**: Proposta técnica das Fatias M1–M8](12_TASK03_PROPOSTA_FATIAS_M1_M8.md)
13. [13 — **INVESTIGAÇÃO COMPLEMENTAR**: decisões DP-01 a DP-06](13_INVESTIGACAO_COMPLEMENTAR_DP01_A_DP06.md)
14. [14 — **TASK 05**: Revisão da sequência — antecipar M1–M8 antes das Fatias 13/14/15?](14_TASK05_REVISAO_DA_SEQUENCIA_M1_M8.md)
15. [15 — **TASK 06**: Diagnóstico da Fatia 13, regressão da ferramenta `excluir` e alinhamento de sequência](15_TASK06_DIAGNOSTICO_FATIA13_EXCLUIR_E_ALINHAMENTO.md)
16. [16 — **TASK 07**: MICRO-FATIA DELETE **implementada** + consolidação da sequência oficial (D132–D136)](16_TASK07_MICRO_FATIA_DELETE_IMPLEMENTACAO_E_SEQUENCIA.md)

## Critérios de evidência

- **Documentado:** descrito em documentação oficial do fornecedor, sem implicar funcionamento testado por esta investigação.
- **Código:** localizado em código-fonte identificado por URL/commit/caminho/símbolo.
- **Teste:** teste automatizado existente ou execução controlada identificada; ler um teste não equivale a executá-lo.
- **Observado:** comportamento obtido diretamente em execução isolada.
- **Inferência:** interpretação fundamentada, mas não demonstrada diretamente.
- **Não localizado:** não encontrado no escopo inspecionado; não equivale a prova universal de inexistência.

## Registro e progresso (2026-10-30)

- HEAD local registrado para a investigação em 2026-10-30; working tree inicialmente limpo. Antes da Task 01, só esta pasta estava não rastreada. A Task 01 iniciou sobre o mesmo HEAD, sem alterações de terceiros.
- Estudo anterior em `docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/` e materiais auxiliares foram usados como roteiro, não como prova; as afirmações sobre indicador, transcript, tools, busca e restart foram confrontadas com o HEAD atual.
- Snapshots analisados: OpenCode v2.2.4 `45898d0f8569225eb1ddb4ee13f8581b34dff311`; VS Code/Copilot `c8a3f819b4a13366d5846a02288ab53b4d89ac50`. Os serviços Copilot cloud privados não estão disponíveis no snapshot.
- Agente Window: suite direcionada em cópia isolada — 17 arquivos, 139 testes passaram e 4 foram skipped; `typecheck` passou. `vite build` foi morto com exit 137 por limite de recursos durante transformação; não repetido.
- A–H: fixtures descartáveis usadas. Persistência/restart e tool cards tiveram round-trip observado; UI confirmou escopo do prompt atual. Corrida de persistência JSONL repetiu 2 erros `ENOENT` em 16 PUTs simultâneos, em duas execuções. Limitações detalhadas em `06` e `10`.
- Teste temporário de escopo UI da investigação foi repetido após correção dos stubs: 1/1 passou; warnings ambientais e 404 stubados não impediram a execução. Cópia e snapshots daquela investigação foram removidos de `/tmp`.
- **Task 01 — Correção e Blindagem da Persistência:** causa raiz confirmada em baseline: nome temporário comum por PID; novo teste reprovou 6/16 operações simultâneas na cópia sem correção. Correção localizada implementada; duas rodadas corrigidas com 16/16 HTTP 200 e integridade comprovada, mais leitura após novo processo. Detalhes/resultados/limites em `CORRECAO_PERSISTENCIA.md`.
- Somente os arquivos de persistência necessários e os testes específicos foram alterados; nenhum documento canônico ou roadmap. M1–M8 seguem sem implementação e recomendações continuam pendentes de aprovação.

## Registro da Task 02 e Task 03 (2026-10-30)

### Estado real do repositório conferido antes de iniciar

| Item | Estado verificado |
|---|---|
| Branch / HEAD | `main` / `fe218b8` — *"chore: init projeto agente_window"* (commit único) |
| Remote | nenhum — nenhum push nesta missão |
| Working tree no início desta missão | limpo |
| Working tree ao final | 3 alterações, todas dentro desta pasta: `11_…` (novo), `12_…` (novo), `00_INDICE.md` (este arquivo, aditivo) |
| Código-fonte | inalterado |
| Documentação canônica `docs/01`–`09` | inalterada |
| Roadmap / numeração oficial de fatias | inalterados |
| Dependências (`package.json`, lockfiles, `node_modules`) | inalteradas |
| Áreas congeladas | não tocadas |

**Nota sobre o HEAD citado no cabeçalho deste índice:** `971a59f5…` pertencia ao `.git` anterior. Aquele diretório `.git` foi apagado e reinicializado por ordem do dono, então **os hashes antigos citados nos documentos canônicos (`0dfe3c2`, `71c8de7`, `ecdab7c`, `8ec2dda`, `8793b9e`) e o HEAD acima não existem mais nesta cópia**. Registrado como risco **R-15** em `11_TASK02_…` §10 (perda do histórico Git; `docs/04 §4` afirma que prints e `referencias_visuais/` são "recuperáveis no histórico do Git" e **não são mais** nesta cópia).

### Status da Task 01 (conferido, não alterado)

- A correção **está presente no código** desta cópia: temporário exclusivo `${pid}.${uuid}.tmp` (`transcripts.ts:57`), fila por sessão e por destino (`transcripts.ts:9`), `409 stale_session_snapshot` (`sessionsClient.ts:52`), aviso persistente e recuperação com "Save a separate copy" (`SessionPersistenceNotice.tsx`, `sessionRecovery.ts`, `useSessionPersistence.ts`).
- `HOMOLOGACAO_INDEPENDENTE_TASK_01.md` registra **APROVADO TECNICAMENTE** (auditoria em Windows 11) com limitações: fila só em memória de processo, SQLite↔JSONL sem transação distribuída, `pagehide` best-effort, quota de `localStorage`, `.tmp` órfãos sem faxina.
- **Divergência registrada:** `docs/03:3`, `docs/07:6`, `docs/09:915` e `CORRECAO_PERSISTENCIA.md:3` ainda dizem "sem commit/push, sem homologação oficial, HEAD `0dfe3c2`".
- **Veredito:** o código foi commitado e pushado pelo dono; a **homologação oficial do dono NÃO está registrada**. Aprovação técnica independente ≠ homologação, conforme `docs/08` (*"Homologado = o dono declara"*). Nenhuma correção foi aplicada nos canônicos, porque isso não foi autorizado.

### Fontes consultadas nesta missão

| Fonte | Identificação | Grau |
|---|---|---|
| Agente Window (código atual) | HEAD `fe218b8`, verificação por arquivo e linha | **Confirmado** |
| DeepSeek Harness | `deepseek-ai/deepseek-harness` @ `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`, MIT — 11 fontes lidas | **Código** |
| OpenClaude | `Twigpine/openclaude` @ `3a8e12b804ffd9cea0662534c554aa0f38c9f642` (main, push 2026-10-30), licença `NOASSERTION` — clone raso em `/home/user/.cache/refs/openclaude` (**fora** do snapshot do workspace, conforme `docs/01 §3.B.6`); **somente referência conceitual, nenhuma cópia de código** | **Código** |
| VS Code / Copilot | `c8a3f819b4a13366d5846a02288ab53b4d89ac50` (já consolidado em `02_…`, não re-pesquisado) | **Código / Documentado** |
| OpenCode | v2.2.4 `45898d0f8569225eb1ddb4ee13f8581b34dff311` (já consolidado em `03_…`) | **Código / Documentado** |
| Meta AI / Meta Muse | **sem código**; somente fontes secundárias (TIME 06/10/2026, WIRED, Help Center) | **Baixo — não usar como base técnica** |
| Cline / Open WebUI | `590785ef…` / `91ea4e34…` (já consolidados no pacote de 22/10) | **Código** |

### Restrições respeitadas nesta missão

Não alterar código-fonte · não implementar Fatias M · não instalar dependências · não refatorar · não alterar `docs/01`–`09` · não alterar roadmap oficial · não criar fatias oficiais · não commitar nem dar push · não iniciar a próxima etapa do plano de execução · não mover esta pasta para `arquivo_morto/` · não declarar propostas homologadas · não transformar hipótese em decisão oficial.

**Resultado:** nenhum dos itens acima foi violado. A documentação desta investigação **permanece temporária** até aprovação do dono.

### Parado, aguardando aprovação

- **Task 02** registrada formalmente em `11_…` **antes** do início da Task 03, conforme exigido.
- **Task 03** registrada em `12_…`, construída exclusivamente sobre as conclusões verificadas de `11_…` e sobre contratos/decisões já existentes.
- **Nenhuma** proposta arquitetural está homologada. **Nenhuma** funcionalidade foi implementada.

## Registro da Investigação Complementar — DP-01 a DP-06 (2026-10-30)

Missão: substituir hipótese por evidência nas seis decisões que a Task 02 registrou como pendentes. **Nenhuma foi decidida; todas permanecem PENDENTES DE APROVAÇÃO.** Nada foi executado contra o Agente Window — não há prova operacional nova; as únicas provas executadas continuam sendo P1–P10.

### Fontes novas consultadas (detalhe em `13_…` §0.3)

| Fonte | Identificação | Arquivos lidos |
|---|---|---|
| OpenCode | `sst/opencode` @ `45898d0f8569225eb1ddb4ee13f8581b34dff311` | 6 (`core/src/project.ts` integral, `project/sql.ts`, `schema/project{,-id}.ts`, `worktree/directory.ts`, `session/compaction.ts` seletivo) |
| OpenClaude | `Twigpine/openclaude` @ `3a8e12b804ffd9cea0662534c554aa0f38c9f642`, licença `NOASSERTION`, clone raso em `/home/user/.cache/refs/openclaude` (fora do snapshot, `docs/01 §3.B.6`). **Somente referência conceitual; nenhuma cópia de código** | 11 (`memdir/{paths,vectorIndex,autoExtractFacts,memoryTypes,teamMemPaths}.ts` — três integrais, `tools/AgentTool/agentMemory.ts` integral, `utils/{sessionStoragePortable,git,knowledgeGraph,conversationArc}.ts`) |
| DeepSeek Harness | `deepseek-ai/deepseek-harness` @ `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`, MIT | 27 por `raw` com SHA fixo (8 notas de arquitetura novas + `format.ts` com `projectKey`/`projectDir`/`encodeSegment`, spill, tool-result-pruner, content-admission, token-meter) |
| VS Code / Copilot | `microsoft/vscode` @ `c8a3f819b4a13366d5846a02288ab53b4d89ac50` | 8 novos (`workspaceIdentifier.ts`, `workspace.ts`, `workspaces.ts`, `workingDirectory.ts`, `chronicle/node/sessionStore.ts`, `secretFilter.ts`, `sessionIndexingPreference.ts`, `memoryCleanupService.ts`) + árvore completa (25.212 entradas) |

### Seis correções ao trabalho anterior (registro em `13_…` §1)

| # | Correção | Efeito |
|---|---|---|
| **C-1** | O OpenClaude tem `memdir/vectorIndex.ts`, **documentado** como *"Orama vector search index … semantic search"* — mas o código usa `create({schema})` **sem embedder** e `search(db,{term})`. `embedder` não aparece como configuração em `src/`; modelos de embedding só existem como entrada de catálogo de fornecedor, e `xai.ts:5` diz que *"embedding entries are not usable on the OpenClaude chat path"* | A conclusão 4 da Task 02 **fica mais forte**, com formulação corrigida: nenhuma referência realiza recuperação vetorial; a que mais parece, não é |
| **C-2** | **DP-04 não é decisão pendente.** `docs/06:547/549` e o bloco D102 já decidem: *"não é roadmap numerado"*, *"não há autorização para … inserção entre fatias oficiais ou renumeração"*, *"não importar a numeração hipotética daquele estudo para Fatias 13–20"*, *"nada aqui cria Fatia 21"*. Precedente D98 (MICRO-FATIA PERF *"entre a 12 e a 13, sem renumerar"*), convenção "era a N", registro IC-01…IC-09 | DP-04 vira **nota documental** com uma pergunta residual de organização |
| **C-3** | A ordem da Parte C.4 da Task 03 é a ordem **interna** da iniciativa M. `docs/06:556` já decide: *"M1→M2→M3→M4 permanecem planejamento posterior à 15"* | As duas ordens se aninham; nenhuma foi alterada |
| **C-4** | O OpenClaude tem **dois** mecanismos automáticos: o fork com modelo (R19, flag-gated `false`) **e** `autoExtractFacts.ts` — **10 extratores por regex, zero chamada de modelo, a cada turno** | **DP-02 deve ser dividida** em DP-02a (modelo → colide com "Agent Loop único") e DP-02b (determinística → não colide) |
| **C-5** | A premissa de RD-10 estava errada: o OpenClaude **tem** escopo global — `AgentMemoryScope = 'user' \| 'project' \| 'local'`, com `'user'` em `<base>/agent-memory/` **fora** de `projects/`. VS Code tem `globalStorageUri`; OpenCode tem `ID.global` | **DP-05 muda de figura**: há precedente de código, e os três mostram **escopo = prefixo sobre infraestrutura compartilhada** |
| **C-6** | `utils/knowledgeGraph.ts:1-8` — *"compatibility layer over memdir. Previously maintained its own SQLite/JSON/Orama storage. Now delegates to memdir"* | Evidência empírica do custo de ter duas lojas (RD-6/R-14): um projeto real fundiu e hoje carrega camada de compatibilidade |

### Achado que desaconselha cópia (verificado em código, `13_…` §3.3.4)

Os extratores automáticos do OpenClaude são **anglocêntricos de forma concreta**: `slugify` transforma `configuração` → `configura-o`; `looksLikeSecret` descarta hifenizados com 12+ caracteres (`banco-de-dados-local`); a stoplist é inglesa; e o extrator de regras procura `always`/`never`/`prefer` — **"sempre use" e "nunca faça" não são detectados**. Copiar para um produto PT-BR produziria memória **silenciosamente incompleta**.

### Resultado por decisão (`13_…` §8)

| DP | Suficiência de evidência | Recomendação (não homologada) |
|---|---|---|
| **DP-01** | 🟡 suficiente para a estratégia; insuficiente para os parâmetros | Três camadas: canonicalizar (`realpath`+NFC) já · separar identidade de nome de pasta · tabela 1:N no banco que já temos · escada remote→commit-raiz→caminho, Git opcional. **Precisa de 🔎 H6 (caminhos reais do dono)** |
| **DP-02** | 🟢 suficiente | Nada automático no primeiro corte; dividir em DP-02a (adiar) e DP-02b (depois, re-escrita para PT-BR) |
| **DP-03** | 🟢 suficiente para a política; 🟡 para os números | Log íntegro + projeção podada + **distinção por origem**: conteúdo do workspace vira localizador, saída de terminal vira conteúdo. **Sem spill** até 🔎 H1 medir |
| **DP-04** | 🟢 **já estava decidida** | Manter rótulos M, registrar no formato IC, retirar a "posição hipotética", adotar notas com status+supersessão |
| **DP-05** | 🟢 suficiente | Contrato pronto para três escopos, implementação só do de projeto; **memória de conversa é o checkpoint de M3**, não uma quarta loja |
| **DP-06** | 🟢 suficiente | Servidor compõe, prefeitura é o endereço, três fatos com três donos (capacidade no provedor · medição sem configuração · política no consumidor), migração em 4 etapas aditivas |

> ⚠️ **Nota de supersessão aditiva (Task 05, 2026-10-30).** A linha **DP-01** acima foi **reformulada** por `14_TASK05_…` §7.1, depois que o dono manifestou duas preferências funcionais: *pasta que desaparece → informar e aguardar seleção manual* e *duas cópias em caminhos diferentes → projetos independentes*. A segunda **responde 🔎 H6** e torna **desnecessárias** a Camada 2 (`projetoId` opaco por origem), a Camada 3 (tabela `projeto_diretorio` 1:N) e os dois primeiros degraus da escada (remote do Git, SHA do commit raiz). DP-01 colapsa para: **identidade = caminho real canonicalizado (`realpath` + NFC), re-vínculo manual e registrado quando o caminho não resolve, Git irrelevante para identidade.** A Camada 1 (canonicalizar antes de derivar) **permanece e fica mais importante**. Suficiência passa de 🟡 para 🟢. **Nada homologado.** As linhas DP-02 a DP-06 continuam válidas como registradas.

### Estado do Git ao final (somente leitura)

`main` / `fe218b8` · **sem remote** · **nenhum commit, nenhum push** nesta missão · working tree com **4 alterações, todas dentro desta pasta** · código-fonte, testes, `docs/01`–`09`, roadmap e dependências **inalterados** · áreas congeladas **não tocadas** · artefatos de pesquisa em `/home/user/.cache/refs/`, fora do repositório e fora do snapshot.

**Parado, aguardando aprovação. Nenhuma etapa seguinte do plano de execução foi iniciada.**

---

## Registro da Task 05 — Revisão da sequência de execução (2026-10-30)

**Pergunta do dono:** *"implementar e homologar as Fatias M1 a M8 antes de iniciar as Fatias 13, 14 e 15."* Pedido explícito de análise independente, **sem favorecer a proposta**.

### S-1 · O fato que invalida a premissa

**A Fatia 13 já está implementada e com homologação manual declarada pelo dono no Windows (2026-10-29, D126).** Verificado em código nesta missão, não só em documentação:

| Evidência | Local |
|---|---|
| Executor one-shot | `agir/server/executorComando.ts` (+ `__tests__/executorComando.test.ts`) |
| Ferramenta no tipo canônico | `types.ts:14` — `'… \| 'executar'` |
| Catálogo e anúncio ao modelo | `ferramentas.ts:62` · `anuncio.ts:27` |
| **Tabela de grants já nasceu com a coluna** | `session-persistence/database.ts:72` (`CHECK (tool_id = 'executar')`) e `:119` (`SessionToolGrant`) |
| Política Manual / Permitir tudo | `rotas.ts:355-480` |
| Documentação | `docs/06:486` + SPEC 2G + `docs/03` · 132 testes Linux, typecheck e ESLint focal passando |

**Consequência:** "antes da Fatia 13" descreve um estado que não existe. A pergunta real é apenas **M1–M8 antes das Fatias 14 e 15**. É a terceira premissa de enunciado que não sobrevive à verificação (C-2 e C-5 foram as anteriores).

### O achado novo — não existe ponto de composição de prompt no servidor

Direção **14 → M**, que **D99 não analisou** (D99 só cruzou "estudo de 22/10 × Fatias 13–15"):

- O histórico é montado **no browser**: `App.tsx:1678` `montarHistorico`, chamado em `:2066` e `:2170`. **Único lugar do produto.**
- O servidor **apenas copia**: `rotas.ts:332` `historico: fio.mensagens` → `agir.ts:96` `[...opcoes.historico]` → `agir.ts:113` `vizinho(mensagens,…)`. `agir.ts:91`: *"O `historico` de entrada **NUNCA é alterado**."*
- **Não existe `system prompt` em todo o caminho servidor** (grep em `bairros/2-inteligencia`, `server`, `services` → **zero** resultados fora de testes).
- **O contrato não tem papel `system`**: `agir/contract.ts:73` — `papel: 'usuario' | 'assistente' | 'ferramenta'`.
- O anúncio de ferramentas **já é servidor** (`anuncio.ts`), então RF14-4 ("desligada some do anúncio") ✅ já tem casa.

**A SPEC 2H exige** *"injetar skill no loop"* (RF14-2 + critério de aceite 3: *"`/nome` → agente segue a skill"*). Hoje isso **só pode** entrar em `agir.ts:96`, e como não há papel `'system'`, entraria como **`papel: 'usuario'`** — o que (a) cria um **segundo** ponto de composição, (b) faz instrução do dono viajar disfarçada de fala do usuário (contradiz a Regra 10 de DP-06), e (c) se for feito no browser para evitar (b), **cresce o `App.tsx`** contra RNF14-3/RNF15-2.

> **DP-06 não pode esperar "depois da 15": ela será tomada de fato durante a Fatia 14.** A única escolha é se o dono a toma antes ou se ela é tomada por acaso dentro da implementação.

### Comparação e recomendação

| | **A — canônica** | **B — M1–M8 antes de 14/15** | **C — A + gate DP-03/DP-06 antes da 14** |
|---|---|---|---|
| Executável | ✅ | ❌ (13 já existe; DP-01 e F1–F4 bloqueiam) | ✅ |
| Retrabalho em M2/M3 | 🟡 | 🔴 alto | 🟢 baixo |
| Retrabalho na Fatia 14 | 🔴 alto (improvisa o ponto de injeção) | 🟢 | 🟢 baixo |
| Capacidade visível ao dono | 🟢 14 e 15 (prioridade declarada) | 🔴 8 fatias internas antes | 🟢 idêntica a A |
| Componentes provisórios | 🟡 | 🔴 alto (**proibido pelo dono**) | 🟢 nenhum |
| Conformidade D99/D102/D109 | ✅ | ❌ viola *"não há autorização para saltar fatias"* | ✅ (D109 já autoriza investigação paralela) |

**Recomendação (não homologada):** **manter integralmente a ordem canônica** — 14 → 15 → M1 → M2 → M3 → M4 → (M5 → M6) → M7 → M8 — **e acrescentar um único gate documental antes de autorizar o código da Fatia 14: decidir DP-06 e DP-03.** Custo: **uma decisão**, zero código, zero componente provisório, zero renumeração.

**Cinco motivos para NÃO antecipar M1–M8**, todos com evidência: (1) a 13 já existe · (2) **DP-01 bloqueia M5/M6** · (3) **M6 adiciona ferramenta nova** e `docs/06:599` exige F1–F4 tratadas *"antes de ampliar autonomia ou adicionar ferramentas com novos efeitos"* — F1–F4 **não estão homologadas** · (4) **a UI de M4/M5/M6 depende de onde 14/15 colocarem Personalizações, busca e abas** → decidir antes cria componente provisório · (5) adiar 14/15 inverte a **prioridade declarada do dono** (SPEC 2H §1).

**Sem dependência circular.** Existe um **ciclo aparente** (M3 precisa saber onde a 14 injeta · a 14 precisa saber onde M3 compõe) que **não é ciclo: é decisão compartilhada de endereço** — condomínio literal, o lote é definido antes de qualquer morador construir.

**M1-a** é a única fatia M **sem nenhuma** dependência canônica (B.1.7: *"nenhuma. Não toca Fatia 14/15"*) e conserta o percentual de contexto **18%–92% falso** de hoje (R-5). **Não recomendo** implementá-la antes da 14 (a 14 é a prioridade), mas **não a considero incorreta** se o dono preferir. **Especificá-la em paralelo já é autorizado por D109.**

### Confronto com as seis preferências manifestadas pelo dono (`14_…` §7)

| Preferência | Confronto |
|---|---|
| Recuperar de conversas anteriores do mesmo projeto | 🟢 convergente (M4+M6, M3) — mas o "mesmo projeto" agora é definido pela preferência 4 |
| Exigir aprovação para gravar memória | 🟢 **já é canônico** — `docs/02 §1.4`. Não é decisão nova |
| VS Code: pasta sumiu → informar e aguardar seleção manual | 🟡 **ambígua**: como comportamento de erro 🟢 concordo; como **trocar o algoritmo de derivação** 🔴 desaconselho (órfa dados em `~/.agente_window/projects/`; VS Code congela com *"DO NOT CHANGE"*; OpenCode documenta a quebra entre runtimes) |
| **Duas cópias em caminhos diferentes = projetos independentes** | 🔴 **divergente da minha DP-01 — e a preferência do dono vence. Responde 🔎 H6** |
| Preservar três níveis de memória | 🟢 **idêntica à recomendação DP-05 (E3)** |
| Contratos consistentes antes da implementação | 🟢 fundamento da alternativa C; distinção: **contrato consistente ≠ implementação antecipada** (D109 já separa) |

**Custo da preferência 4 que o dono deve aceitar conscientemente:** trabalhar no mesmo repositório em duas pastas **não compartilha** histórico nem memória. Contrapartida recomendada: re-vínculo **manual, explícito, confirmado e registrado**; mover pasta **desvincula, nunca apaga**; fusão, se um dia desejada, é **migração com preview e confirmação**, jamais efeito colateral da derivação de chave.

### Divergência de vocabulário registrada

O dono citou *"sequência de 14 etapas, posição atual na etapa 3"*. **Não localizada nos nove canônicos.** As únicas sequências registradas são Fatias 07–20 (14 fatias) e `Gate D98 → 13 → 14 → 15 → 16…20 → M1→M4` (`docs/06:616`). Presumido como vocabulário da conversa com o ChatGPT (carta ainda não enviada). **Posição verificada:** 07–12 homologadas · D98 implementada com **Gate aberto** · **13 implementada + homologação manual** · **14 e 15 com SPEC fechada, não iniciadas** · M1–M8 **só planejamento** · F1–F5-B implementadas, **nenhuma homologada**.

### Limitações (`14_…` §9)

**Nada executado** contra o Agente Window (P1–P10 continuam as únicas provas operacionais) · comportamento do VS Code para pasta ausente **não re-verificado** nesta missão (lembrança de E2, não evidência fresca) · histórico Git local `fe218b8` é **sintético** (Missão 1 fez `rm -rf .git && git init`); o HEAD real é `0dfe3c2…` — toda afirmação foi verificada no **working tree**, não no histórico · `docs/08`/`docs/09` **não lidos na fonte primária** nesta missão (homologação da 13 lida como citada por `docs/03`/`docs/06`) · estimativas de esforço são **ordem de grandeza E4**, sem base de velocidade do projeto.

### Estado do Git ao final da Task 05 (somente leitura)

`main` / `fe218b8` · **sem remote** · **nenhum commit, nenhum push** · working tree com **5 alterações, todas dentro desta pasta** (`00_INDICE.md` M; `11_…`, `12_…`, `13_…`, **`14_…`** ??) · **nenhuma alteração fora de `docs/arquivo_morto/investigacao_memoria_fatias_m/`** (verificado) · código-fonte, testes, `docs/01`–`09`, roadmap e dependências **inalterados** · áreas congeladas **não tocadas**.

**Nenhuma decisão homologada. Nenhum roadmap, SPEC, contrato oficial ou código alterado. Parado, aguardando a decisão do dono sobre o gate DP-03/DP-06 antes da Fatia 14.**

---

## Registro da Task 06 — Diagnóstico da Fatia 13 e alinhamento (2026-10-31)

**Primeira missão com autorização para alterar documentação canônica** (carta do dono §7). Até aqui, todas as missões eram somente-leitura sobre `docs/`.

### D-1 · O achado central: a exclusão **regrediu**, não "está bloqueada por decisão"

O dono apontou divergência: a documentação diz que a Fatia 13 está implementada e homologada, mas o agente **não exclui arquivos nem pastas**, logo o CRUD não está completo. **A verificação em código confirmou o fato e corrigiu a causa.**

| Pergunta do dono | Resposta verificada |
|---|---|
| `excluir` está implementada? | ❌ **NÃO.** `discos.ts:271` retorna falha fixa **sem chamar** `moverParaLixeira`; `lixeira.ts:17-21` tem o corpo removido (`_absoluto`/`_opcoes` não usados), sempre `ok:false` |
| Está anunciada ao modelo? | ✅ **SIM — e é o defeito mais sério.** `ferramentas.ts:58` promete *"Move… para a LIXEIRA do sistema (nunca apaga permanente)"* e `vizinho.ts:179` chama `anunciarFerramentas(alvo.protocolo)` **sem o parâmetro `permitidas`** → catálogo inteiro em **toda** chamada, nos 4 protocolos |
| Está integrada ao Agent Loop? | ✅ **SIM, a casca está íntegra:** `ehMexida` · RF12-3 (`permiteSessao` false) · fora do allow-all (`rotas.ts:351`) · cartão com **prévia honesta** (`discos.ts:87`) · negação "nada sumiu" (`agir.ts:184-186`) · Explorer atualiza (`App.tsx:1783`) |
| Consegue excluir de verdade? | ❌ **Não, em nenhuma plataforma.** A proteção inteira está viva e **guarda uma operação que nunca ocorre** |
| Estava na SPEC 2G? | ❌ **NÃO — a 2G a exclui expressamente.** Estava na **SPEC 2F** e foi **entregue e homologada por D97** |
| É ausência, integração, permissão ou escopo? | ❌ **Nenhuma das quatro.** É **regressão não registrada contra fatia homologada, por precondição órfã** |

**Cadeia de evidências:** existiu (commits `44bbd67`/`133affa`, 21/10 — Linux XDG com `.trashinfo`, Windows Lixeira real via PowerShell; E2E 5/5; **fix C4 `-NonFatal` inventado → `-NonInteractive`**, que só se descobre invocando o PowerShell de verdade) → foi desligada como **"temporariamente"** no episódio fail-closed da F2 (missão D119), condicionada a *"ser integrada ao helper de handles e validada por plataforma"* → **D121 aposentou esse helper** (`04:102`) e liberou as cinco ferramentas irmãs para caminho + permissões normais do SO → **a exclusão ficou esperando um trem cancelado**.

> **Nenhuma decisão em `05` (D1–D126) bloqueia `excluir`.** A expressão *"bloqueada por decisão anterior"*, repetida em `05:225`, `07:19` e `08:145`, é um **limite de escopo de missão que endureceu em política permanente por repetição** — *"não autoriza implementar"* ≠ *"decidiu não implementar"*.

### D-2 · Três agravantes de rastreabilidade

1. **Assimetria de honestidade:** o **cartão diz a verdade ao humano** (`discos.ts:87`: *"A exclusão não está disponível nesta versão"*); o **anúncio mente ao modelo** (`ferramentas.ts:58`). Vale corrigir **mesmo que o dono decida não restaurar**.
2. **Testes contraditórios sem registro:** `e2e/excluir_fatia12.spec.ts` continua **ativa, sem `skip`/`fixme`/quarentena** (verificado), afirmando exclusão real — **não pode passar**; `__tests__/excluir.test.ts` foi **reescrito** para afirmar o oposto. Contra o espírito de **D79**.
3. **`09` se contradiz internamente:** L165 declara régua **23/23** com `excluir_fatia12` **5/5**; L470/L502 dizem *"exclusão não implementada"*. **Prevalecem L470/L502.**

### D-3 · Dependência nova, não registrada em D99

**SPEC 2H §2(d)** manda a Fatia 14 listar *"as 5 + `excluir` + `executar`"* com liga/desliga. **A Fatia 14 tornaria o defeito visível na interface** — interruptor de capacidade inexistente, e por RF14-4 anúncio de mentira quando ligada. D99 analisou "M × Fatias 13–15"; **ninguém analisou "14 × estado real das ferramentas que ela vai listar"**. **Razão concreta para DEBT-24 vir antes da 14.**

### D-4 · Menor regularização contratual proposta (⏳ pendente)

**Três opções:** **R1** ✅ recomendada — restaurar o contrato **já homologado** (SPEC 2F + D97) sob o **mesmo** modelo de contenção que D121 aplica às cinco irmãs (nem mais fraco, nem mais forte) · **R2** manter bloqueada e tornar o bloqueio honesto (**anula retroativamente D97** — custo de governança maior que o de código) · **R3** embutir em DEBT-23 (**mistura** restaurar lixeira recuperável com acrescentar exclusão permanente/YOLO, e exige ordem expressa que não foi dada).

**R1 em 8 itens:** decisão do dono levantando o fail-closed · corrigir a precondição órfã em `lixeira.ts:1-4` · `discos.ts:271` chamar `moverParaLixeira` (elimina as duas mensagens divergentes e o vazamento de vocabulário de missão) · consertar o anúncio · quarentena **com registro D79** ou restauração prévia · corrigir `09:165` · revalidar Linux (XDG) e **Windows** (Lixeira real, `-NonInteractive`, teto — lição do C4) · **não misturar com DEBT-23** (SPEC 2F §6 "nunca-permanente" continua valendo).

**Posição proposta:** `DEBT-24` + **MICRO-FATIA DELETE entre a 13 e a 14, sem renumerar** — precedente **D98** (*"entre a 12 e a 13, sem renumerar"*). **Não anexar à Fatia 13**: a SPEC 2G é fechada e homologada, e a exclusão é escopo da 12.

**⚠️ Incógnita de esforço:** o corpo da implementação de 21/10 **não está mais no código** (sobrou a assinatura). Se `44bbd67`/`133affa` existirem no repositório oficial, restaurar é barato; senão é reescrita. **A cópia de trabalho da Arena não tem remote nem histórico real — verificar no GitHub oficial antes de autorizar.**

### Decisões registradas nos canônicos (`05` §17)

| ID | Conteúdo |
|---|---|
| **D127** | Sequência confirmada: **13 → 14 → 15 → M1–M8**, sem antecipação, sem renumeração; roadmap 16–20 a confirmar antes de qualquer alteração; SPECs 2H/2I não reabertas |
| **D128** | Regressão da `excluir` constatada em código; **correção expressa** de *"bloqueada por decisão anterior"*; causa-raiz = precondição órfã; **DEBT-24** criada; **D97 não apagada**, alcance explicitado; **CRUD completo NÃO homologado**; restauração **não autorizada** |
| **D129** | Gate **DP-03 + DP-06** antes da codificação da Fatia 14; orientação do dono (composição no servidor, sem dois mecanismos); **autorizado registrar a necessidade e preparar a proposta — NÃO homologar soluções**; escolhas **E-1 a E-5 pendentes** |
| **D130** | Preferências funcionais de memória e identidade, distinguindo **já vigente** (aprovação humana = D99/`02 §1.4`; contratos consistentes = D109) de **novo** (caminhos distintos = projetos distintos, **responde 🔎 H6**; pasta sumiu → informar e aguardar escolha manual **sem Git**; três escopos). **DP-01 simplificada**: retiradas Camada 2, Camada 3 e os dois primeiros degraus da escada; canonicalização permanece. **Regra de compatibilidade: não substituir o algoritmo de `paths.ts:30-34` sem avaliar migração** |
| **D131** | Discussão metodológica dos **14 pontos ADIADA** para depois das Fatias 13/14/15; **nenhuma quarta filosofia criada, nenhuma regra nova, nenhuma investigação aberta**; as três filosofias permanecem |

### Conflitos documentais encontrados (6) — todos registrados, nenhum corrigido em silêncio

| # | Conflito | Prevalece |
|---|---|---|
| **CF-1** 🔴 | *"bloqueada por decisão anterior"* × nenhuma decisão existe | **o código + a ausência de decisão** |
| **CF-2** 🔴 | D97 homologa exclusão funcional × código sem exclusão | **ambos, em datas diferentes** → registrado como regressão |
| **CF-3** 🔴 | `09:165` régua 23/23 × spec que não passa × `09:470/502` "não implementada" | **`09:470/502`** |
| **CF-4** 🟡 | anúncio promete lixeira × prévia diz indisponível | **a prévia** (o anúncio é o defeito) |
| **CF-5** 🟡 | `lixeira.ts` condiciona ao helper × D121 aposenta o helper | **D121** → precondição órfã |
| **CF-6** 🟡 | SPEC 2H manda listar `excluir` × `excluir` não funciona | **DEBT-24 antes da 14** |

### Pendentes de aprovação do dono (9)

**P-1** levantar o fail-closed e autorizar DEBT-24 · **P-2** escolher R1/R2/R3 · **P-3** as cinco escolhas E-1 a E-5 do gate · **P-4** posição da MICRO-FATIA DELETE · **P-5** destino do E2E (quarentena com registro × restaurar antes) · **P-6** confirmar a sequência 16–20 · **P-7** homologação oficial da Task 01 · **P-8** Gate D98 · **P-9** F1–F4 (bloqueiam M6, que **adiciona** ferramenta — restaurar `excluir` **não** é adicionar).

### Limitações (`15_…` §9)

**Nenhuma exclusão executada** — nem em arquivo real, nem em fixture. **Nenhum teste executado**: a afirmação de que `excluir_fatia12.spec.ts` não pode passar é **dedução de leitura (E1)**, não observação. **Sem histórico Git utilizável**: os commits `44bbd67`/`133affa` foram citados **a partir de `docs/07`, não inspecionados**. **A implementação anterior não está mais no código** — quanto é recuperável depende do repositório oficial. **Windows não testado aqui.** `docs/08`/`docs/09` lidos **apenas nos trechos** que mencionam `excluir`/lixeira/Fatias 12-13.

### Arquivos canônicos alterados nesta missão (autorizado pela carta §7) — todos **aditivos**

| Arquivo | Alteração |
|---|---|
| `docs/05 - DECISOES.md` | **nova seção 17** com **D127–D131** + nota de correção na Precedência de D126 |
| `docs/06 - PROXIMAS FASES E DIVIDAS.md` | **DEBT-24** na matriz · nota de divergência na **Fatia 13** · gate D129 na **sequência vigente** e na **sequência de aprovação** · nota aditiva na **SPEC 2H** |
| `docs/03 - ESTADO ATUAL.md` | **novo bloco de atualização corrente** (6 itens) no topo; blocos anteriores preservados |
| `docs/04 - ARQUITETURA E REGRAS DURAS.md` | nota de correção no §313 (precondição órfã) e no §109 (*"decisão anterior"*) |
| `docs/08 - HOMOLOGACAO.md` | nota de alcance na homologação da **Fatia 12 (D97)** e nota de correção na da **Fatia 13** |
| `docs/09 - TESTES E AMBIENTE.md` | nota de correção na régua **23/23** (L165) |

**SPECs 2F, 2G, 2H e 2I NÃO foram reabertas. D97, D121 e D126 NÃO foram apagados.** Nenhum código-fonte, teste ou dependência alterado. Áreas congeladas não tocadas. **Nenhum commit, nenhum push.**

**Parado, aguardando as decisões P-1 a P-6.**


---

## Registro da Task 07 — MICRO-FATIA DELETE implementada + sequência oficial consolidada (2026-10-31)

> **Origem:** carta do dono *"AUTORIZAÇÃO DA MICRO-FATIA DELETE E CONSOLIDAÇÃO DO ROADMAP"* (§1 a §9). **A opção R1 foi aprovada** e a implementação autorizada. **Nenhuma investigação nova foi aberta** — o diagnóstico de `15_…` bastou, conforme §1. **Esta é a primeira missão desde a Fatia 13 que altera código de produção.** Relatório: `16_TASK07_MICRO_FATIA_DELETE_IMPLEMENTACAO_E_SEQUENCIA.md`.

### O que foi feito

| # | Ação | Resultado |
|---|---|---|
| 1 | **Cadeia forense do histórico oficial** (clone em `/home/user/.cache`, `git show <sha>:<caminho>`) | `lixeira.ts` tem exatamente 3 commits: `44bbd67` (C1, 8 124 b) → **`90fe21d` (C4, versão homologada por D97, 9 340 b)** → **`f850fc5` (*"confinar operações Agir no Linux e falhar fechado"*, 862 b — o esvaziamento)**. **Base de restauração: `90fe21d`.** |
| 2 | **Resolução da "incógnita de esforço"** deixada por `15_…` | `44bbd67`/`133affa` **existem** no repositório público oficial ⇒ **reaproveitamento, não reescrita** (autorizado por §2). **O `.git` do workspace não foi tocado, o histórico oficial não foi substituído, o repositório não foi reinicializado.** |
| 3 | **`npm ci --no-audit --no-fund`** em `platform/apps/workbench-v2` | exit 0 · **590 pacotes** |
| 4 | **`server/lixeira.ts` reescrito** (862 → 12 083 b) | Corpo restaurado de `90fe21d` + **K1** (`lstat` + recusa de symlink) · **K2** (identidade `dev:ino` antes × depois) · **K3** (**removido** o fallback destrutivo `cp` + `rm(recursive, force)` em EXDEV ⇒ recusa honesta). **Contrato de exportação preservado.** |
| 5 | **`server/discos.ts` editado** (4 pontos → 23 405 b) | Import da lixeira · `normalizaCaminho` (lição C5) · **`resolverAlvoExclusao`** (contenção própria, motivo **tipado**) · **`descreverAlvoExcluir`** com prévia real · **executor `excluir` real** chamando `moverParaLixeira`, na **mesma fila `serializar`** de `criar`/`escrever` |
| 6 | **Três arquivos de teste reescritos** | `lixeira.test.ts` **3→19** · `excluir.test.ts` **3→13** · `rotas.test.ts` **40→41**. Originais de `90fe21d` restaurados **sem alteração de conteúdo** + provas novas de K1/K2/K3 e de contenção/corrida |
| 7 | **Contradição resolvida pela restauração, não por máscara** | O E2E **sempre afirmou exclusão real e estava certo**. O bloco F2 de `rotas.test.ts` **abençoava a regressão** (*"exclusão não está disponível"* / *"Exclusão bloqueada"*) e passou a afirmar o comportamento homologado, **com a nota explicativa preservada dentro do teste**. **Nada foi quarentenado, nenhum `skip` novo criado.** |
| 8 | **Prova de não-regressão antes × depois** | Suíte completa rodada **duas vezes** (5 arquivos revertidos via `git checkout --` com as versões novas guardadas em `/home/user/.cache/base/`, e restauradas depois). **As mesmas 14 falhas nas duas rodadas**, mesmos 5 arquivos, **nenhuma em `agir`** |
| 9 | **Atualização de 7 canônicos + deste índice** | Ver tabela abaixo. **`ls docs/*.md` continua 9 — nenhum canônico novo.** |

### Placares reais (nunca inventados)

| Verificação | Resultado |
|---|---|
| Suíte `agir` (11 arquivos) | ✅ **137 passaram · 4 skipped · 0 falharam** (antes **114**; **+27**) |
| `npx tsc -b --force` | ✅ **exit 0** |
| `npx eslint` nos 5 arquivos alterados | ✅ **exit 0**, zero problemas |
| Suíte completa **DEPOIS** | 5 arq. falharam · 122 passaram · 2 skipped (129) / **14 testes falharam** · **1055 passaram** · 27 skipped (**1096**) |
| Suíte completa **ANTES** | 5 arq. falharam · 122 passaram · 2 skipped (129) / **14 testes falharam** · 1028 passaram · 27 skipped (**1069**) |

**Falhas pré-existentes (idênticas antes e depois, nenhuma em `agir`):** `TerminalPanel.test.tsx` · `iconLabels.test.ts` · `themeTokens.test.ts` · `visualStates.test.ts` · `session-persistence/index.test.ts` (por `AGENTE_WINDOW_TEST_HOME` indefinido). **4 erros de ESLint em `fsSeguro.ts`/`fsSeguro.test.ts` verificados como já presentes no HEAD oficial `cea60d5`** com `git show` ⇒ **não corrigidos** (fora do escopo autorizado).

### ❌ NÃO executado — registrado como tal

- **E2E `e2e/excluir_fatia12.spec.ts` NÃO EXECUTADO** — três bloqueios independentes: falta `uploads/stub_agir.cjs` (a spec o espera na porta 4610) · sem browsers do Playwright (`/opt/playwright` ausente) · `/tmp` (dev 29) × `$HOME` (dev 65024) em dispositivos diferentes ⇒ EXDEV no fixture. **A spec não foi alterada, não recebeu `skip`/`fixme` e não foi quarentenada.** Régua volta a **23/23 no papel**, **não observada em execução**.
- **Lixeira real do Windows NÃO TESTADA** (sem Windows no ambiente). PowerShell provado **apenas por comando puro com execução injetável**. **Roteiro objetivo de 11 passos em `docs/08`** (Parte A = os 8 do D97 + Parte B = passos 9–11 para K1/K2/K3).
- **DP-03/DP-06 NÃO formalizados** e **E-1 a E-5 NÃO homologadas** — a carta exige isso **antes da codificação da Fatia 14**, e a Fatia 14 **não foi iniciada**. Gate **D129 permanece obrigatório e aberto**.
- **Os 14 pontos metodológicos seguem adiados** (D131). Nenhuma quarta filosofia criada.

### Decisões registradas — `docs/05 §18`

| ID | Assunto |
|---|---|
| **D132** | MICRO-FATIA DELETE **aprovada (R1) e implementada**; posição entre a 13 e a 14 sem renumeração (precedente D98); reaproveitamento de `90fe21d`; exclusão permanente fora (DEBT-23 separada) |
| **D133** | **Nova sequência oficial** + **registro expresso das três posições substituídas** |
| **D134** | **Contenção de `excluir` mais estrita que D121 DE PROPÓSITO** (D97: *"território = pasta ativa"*); ordem obrigatória das checagens; sem o helper aposentado; sem `territorio.ts` como sandbox |
| **D135** | **Correções K1/K2/K3** sobre a versão homologada + **limitação EXDEV registrada como ponto de decisão do dono** |
| **D136** | **DEBT-24 implementada e validada por testes automatizados; homologação manual PENDENTE**; o que foi × o que não foi testado; homologações de D97 e da Fatia 13 preservadas |

### Sequência oficial vigente (D133)

> **MICRO-FATIA DELETE → Fatia 14 → Fatia 15 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → Fatia 16 → Fatia 17 → Fatia 18 → Fatia 19 → Fatia 20**

**Substitui expressamente** (exigência do dono em §4/§9):
- **(a)** `docs/06` *"Sequência vigente (atualizada em 2026-10-29)"*, que punha **Fatias 16–20 no fluxo principal logo após a 15** e rebaixava M a *"planejamento posterior à estabilização 13–15"*, com **M5–M8 "não encaixadas em execução"** — **é exatamente a posição anterior que a carta descreve**;
- **(b)** a cláusula de **D127** que deixava a ordem das 16–20 *"a confirmar nos canônicos antes de qualquer alteração"* — **confirmação dada agora pelo dono**, ordem **16→17→18→19→20** registrada, **deixa de ser pendência**;
- **(c)** `docs/07:144` (*"planejamento M1–M4 e Fatias 16–20"*) — **nota aditiva**.

**D127 NÃO foi apagada** (permanecem *"sem renumeração"* e *"sem antecipação da implementação"*). **A Fatia 13 permanece homologada no seu escopo original** (`executar`). **SPECs 2H/2I não reabertas.** **É decisão de planejamento: NÃO autoriza implementar** 14, 15, M1–M8 nem 16–20.

### Canônicos atualizados nesta missão

| Canônico | O que mudou |
|---|---|
| `docs/03` | **novo bloco corrente** (6 itens) · bloco da Task 06 remarcado como *"ATUALIZAÇÃO ANTERIOR"* com aviso de supersessão · nota 🟢 D133 no item 1 |
| `docs/04` | **regra nova D134** em §1.10 · resolução da **precondição órfã** em §316 |
| `docs/05` | **nova seção 18 — D132 a D136** + precedência |
| `docs/06` | **DEBT-24** aprovada/implementada + **nova linha de RESOLUÇÃO** (7 colunas nas duas) · correção aditiva em **DEBT-23** · nota 🟢 na **PARTE 3** · notas 🟢 nos **dois** parágrafos de *"Sequência vigente"* e nos **dois** blocos ✅ D127 |
| `docs/07` | **três entradas novas** no topo (implementação · nova sequência · **e a entrada da Task 06, que estava faltando**) + nota aditiva em `:144` |
| `docs/08` | resolução 🟢 da nota D128 · **nova seção MICRO-FATIA DELETE ⏳** com registro honesto e **roteiro manual de 11 passos** · atualização 🟢 na nota da Fatia 13 |
| `docs/09` | resolução 🟢 da nota da régua (`:167`) · linha **Caminhos/F2** atualizada · **nova seção §3.25** com placares, prova antes × depois e limites |

**`docs/01` e `docs/02` intocados.** **Nenhum canônico novo criado** (`ls docs/*.md` = 9).

### Conformidade verificada

`git status --porcelain` ⇒ **exatamente 12 modificados** (7 canônicos + `00_INDICE.md` + 5 arquivos em `casas/agir/`) — **nada fora de `docs/`, desta pasta e de `casas/agir/`** · **nenhuma área congelada tocada** · **nenhuma dependência nova** · **nenhum Agent Loop, sistema de permissões ou serviço paralelo** · varredura CJK/zero-width em 28 arquivos ⇒ **2 achados** (um soft hyphen U+00AD em `docs/03` e dois ideogramas CJK no relatório `16_…`, ambos introduzidos por mim nesta missão), **corrigidos na mesma hora**, revarredura ⇒ **0** · HEAD local **`fe218b8`** sem remote · HEAD oficial **`cea60d5`** não tocado · **nenhum commit, nenhum push**.

### Parado, aguardando a palavra do dono

1. **Homologação manual** pelos 11 passos de `docs/08` — é o que fecha DEBT-24 e permite falar em CRUD completo.
2. **A limitação K3 em Linux** (lixeira em outro dispositivo ⇒ recusa em vez de copiar-e-apagar). No Windows não afeta. **Aceitar como está ou decidir outra coisa** (que exigiria dependência externa — fora do escopo autorizado).
3. **As 14 falhas pré-existentes da suíte e os 4 erros de lint em `fsSeguro.*`** foram **deliberadamente não corrigidos**. Se o dono quiser que virem item próprio, **precisa abrir**.

**CRUD completo continua NÃO homologado.** Fatias 14, 15, M1–M8 e 16–20 **não iniciadas**.
