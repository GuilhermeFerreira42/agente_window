# 13 — INVESTIGAÇÃO COMPLEMENTAR · Decisões pendentes DP-01 a DP-06

**Data:** 2026-10-30 (America/Sao_Paulo)
**Natureza:** **RELATÓRIO DE INVESTIGAÇÃO + RECOMENDAÇÕES**. Não é decisão, não é SPEC, não é roadmap, não é homologação, não autoriza implementação.
**Missão:** substituir hipótese por evidência nas seis decisões que a Task 02 registrou como pendentes, para que o dono decida com segurança.
**Base:** `11_TASK02_CONSOLIDACAO_DA_INVESTIGACAO.md` + `12_TASK03_PROPOSTA_FATIAS_M1_M8.md` + documentação canônica `docs/01`–`09` + código atual + investigação nova descrita em §0.3.
**Limites respeitados:** nenhum código-fonte alterado · nenhum teste alterado · nenhuma dependência instalada no projeto · nenhuma documentação canônica alterada · nenhum roadmap alterado · nenhum commit · nenhum push · nenhuma Fatia M implementada · **as seis decisões permanecem formalmente pendentes**.

### Escala de evidência usada neste relatório

| Grau | Significado |
|---|---|
| **E1 — Código verificado** | li o código-fonte no commit citado; afirmo o que o código faz. Caminho, função e linha indicados. |
| **E2 — Documentação oficial** | descrito em documentação ou nota de arquitetura do próprio projeto; **não** implica que eu tenha executado. |
| **E3 — Fonte secundária** | artigo/imprensa/documentação de terceiros. **Grau baixo — não sustenta decisão técnica.** |
| **E4 — Inferência arquitetural** | conclusão minha a partir de E1/E2, **não** demonstrada por execução. Marcada como tal. |
| **E5 — Não localizado** | não encontrei nos caminhos e versões auditados. **Não** é prova de inexistência. |

**Nada neste relatório foi executado contra o Agente Window.** Não há teste novo, não há benchmark novo, não há prova operacional nova. Toda afirmação de comportamento é E1 (código lido), E2 (documentação do fornecedor) ou E4 (inferência minha, marcada).

### Onde estão os 10 itens exigidos por decisão

O item 9 da missão pede dez pontos por decisão. Dois deles — **evidências técnicas** e **vantagens/desvantagens** — não têm subseção própria: as evidências estão rotuladas **E1–E5 em cada afirmação**, e vantagens/desvantagens são **colunas das tabelas de alternativas**. Mapa para conferência:

| Item exigido | DP-01 §2 | DP-02 §3 | DP-03 §4 | DP-04 §5 | DP-05 §6 | DP-06 §7 |
|---|---|---|---|---|---|---|
| 1. Problema no Agente Window | 2.1 | 3.1 | 4.1 | 5.1 | 6.1 | 7.1 |
| 2. Funcionamento atual do nosso projeto | 2.2 | 3.2 | 4.2 | 5.1 | 6.2 | 7.2 |
| 3. Como as referências resolvem | 2.3 | 3.3 | 4.3 | 5.3 | 6.3 | 7.3 |
| 4. Evidências técnicas verificáveis | 2.3/2.4 **+ rótulos E1–E5 em todo o texto** | idem | idem | 5.2 | idem | idem |
| 5. Alternativas arquiteturais | 2.5 (A1–A5) | 3.4 (B1–B5) | 4.4 (C1–C5) | 5.4 (D1–D4) | 6.5 (E1–E5) | 7.4 (F1–F5) |
| 6. Vantagens e desvantagens | **colunas de 2.5** | **colunas de 3.4** | **colunas de 4.4** | **colunas de 5.4** | **colunas de 6.5** + comparação 6.4 | **colunas de 7.4** |
| 7. Riscos e dependências | 2.7 | 3.6 | 4.6 | 5.6 | 6.7 | 7.6 |
| 8. Recomendação fundamentada | 2.6 | 3.5 | 4.5 | 5.5 | 6.6 | 7.5 |
| 9. Consequências para M1–M8 | 2.8 | 3.7 | 4.7 | 5.7 | 6.8 | 7.7 |
| 10. O que exige aprovação humana | 2.9 | 3.8 | 4.8 | 5.8 | 6.9 | 7.8 |

Quadro-síntese da comparabilidade entre projetos: **2.4** (identidade, 15 critérios × 5 colunas). Comparação objetiva pedida explicitamente em DP-05 (global desde o início × depois): **6.4**. Suficiência de evidência por decisão: **§8**. Resumo executivo em linguagem simples: **§9**.

---

## §0 — Estado do repositório, aproveitamento e fontes

### 0.1 Estado do Git (verificado, não modificado)

| Item | Estado |
|---|---|
| Branch / HEAD | `main` / `fe218b8` — *"chore: init projeto agente_window"* (commit único) |
| Remote | **nenhum** |
| Commits nesta missão | **nenhum** |
| Push | **nenhum** |
| Working tree no início desta missão | 3 alterações herdadas da Task 02/03, todas dentro de `docs/arquivo_morto/investigacao_memoria_fatias_m/` |
| Working tree ao final | 4 alterações, todas dentro de `docs/arquivo_morto/investigacao_memoria_fatias_m/` (este arquivo novo + `00_INDICE.md` aditivo + os dois da missão anterior) |
| Código-fonte, testes, `docs/01`–`09`, roadmap, dependências | **inalterados** |
| Áreas congeladas (`components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, `explorer-search/{core,server}/**`, `EditorArea.tsx`, specs `sessao_11*`) | **não tocadas** |

### 0.2 O que **não** foi repetido (aproveitamento das Tasks 02 e 03)

Conforme instruído, não re-fiz o que já estava feito. Foram reaproveitados sem nova pesquisa:

- Provas **P1–P10** (nossas, executadas em 2026-10-23/24) — inclusive P1 (FTS5 funciona no `better-sqlite3`), P2 (reescrita JSONL 200 msgs → p50 1,895 ms), P3/P4 (corrida de writer Linux/Windows), P8 (denominador de contexto já existe), P9 (identidade/diretório de projeto já existem), P10 (nenhum código lê `usage`).
- Padrões **R1–R25** já consolidados na Task 02.
- Snapshots já auditados de **Cline** (`590785ef…`) e **Open WebUI** (`91ea4e34…`) — **não reconsultados**; nada neles é relevante às seis decisões.
- Pesquisa **Meta AI / Meta Muse** (só fontes secundárias, E3) — reutilizada como está, sem nova busca.
- Diagnóstico do estado atual do Agente Window (§2 da Task 02) — reutilizado; apenas **re-confirmado por grep** nas linhas que este relatório cita.

### 0.3 Fontes **novas** consultadas nesta missão

| Fonte | Identificação exata | O que foi lido de novo |
|---|---|---|
| **OpenCode** | `sst/opencode` @ `45898d0f8569225eb1ddb4ee13f8581b34dff311` (v2.2.4) | `packages/core/src/project.ts` (20.005 B, **integral**), `packages/core/src/project/sql.ts`, `packages/schema/src/project.ts`, `packages/schema/src/project-id.ts`, `packages/core/src/worktree/directory.ts`, `packages/core/src/session/compaction.ts` (59.439 B, seletivo) |
| **OpenClaude** | `Twigpine/openclaude` @ `3a8e12b804ffd9cea0662534c554aa0f38c9f642` (main, push 2026-10-30), licença `NOASSERTION` — clone raso em `/home/user/.cache/refs/openclaude` (**fora** do snapshot do workspace, conforme `docs/01 §3.B.6`). **Somente referência conceitual; nenhuma cópia de código.** | `src/memdir/paths.ts` (**integral**), `src/memdir/vectorIndex.ts` (**integral**), `src/memdir/autoExtractFacts.ts` (**integral**, 388 linhas), `src/memdir/memoryTypes.ts`, `src/memdir/teamMemPaths.ts`, `src/tools/AgentTool/agentMemory.ts` (**integral**, 177 linhas), `src/utils/sessionStoragePortable.ts`, `src/utils/git.ts` (`resolveCanonicalRoot`), `src/utils/knowledgeGraph.ts` (cabeçalho), `src/utils/conversationArc.ts` (cabeçalho) |
| **DeepSeek Harness** | `deepseek-ai/deepseek-harness` @ `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`, MIT — 27 fontes baixadas por `raw` com SHA fixo | **Notas de arquitetura novas:** `2026-07-24-project-session-directories`, `2026-07-08-tool-output-spill-files`, `2026-07-17-local-spill-startup-cleanup`, `2026-08-13-session-content-search-opt-in`, `2026-08-11-trajectory-conversation-context-assembly`, `2026-09-19-lossless-projection-checkpoint-json`, `2026-07-20-routed-model-context-and-compaction-policy`, `2026-07-31-third-party-memory-mcp-examples`. **Código novo:** `session-persistence-jsonl/src/format.ts` (`projectKey`, `projectDir`, `sessionDir`, `encodeSegment`), `…/src/index.ts`, `…/src/win32.ts`, `spill/spill-policy/src/{types,retention,notice}.ts`, `spill/spill-local/src/store.ts`, `compaction/compaction-tool-result-pruner/{README.md,src/config.ts}`, `session-persistence-jsonl/tests/content-admission.spec.ts`, `llm/token-meter/src/{projection,surface-projection}.ts`, `experimental/tool-session-query/src/workspace-access.ts` |
| **VS Code / GitHub Copilot** | `microsoft/vscode` @ `c8a3f819b4a13366d5846a02288ab53b4d89ac50` | **Novos:** `src/vs/platform/workspaces/common/workspaceIdentifier.ts`, `src/vs/platform/workspace/common/workspace.ts`, `src/vs/platform/workspaces/common/workspaces.ts`, `extensions/copilot/src/platform/workspace/common/workingDirectory.ts`, `extensions/copilot/src/platform/chronicle/node/sessionStore.ts` (22.339 B), `extensions/copilot/src/extension/chronicle/common/secretFilter.ts`, `extensions/copilot/src/extension/chronicle/common/sessionIndexingPreference.ts`, `extensions/copilot/src/extension/tools/common/memoryCleanupService.ts` |
| **Agente Window** | HEAD `fe218b8` | Re-confirmados por grep: `App.tsx:1678/2066/2170`, `server/session-persistence/{chatAlvo,paths,index}.ts`, `services/sessions/*`, `bairros/2-inteligencia/casas/agir/server/rotas.ts:158/189/229/332/594/671`, `bairros/2-inteligencia/casas/conversa/contract.ts`, `docs/05`, `docs/06` |

**Ferramenta de memória do Copilot (`MemoryTool`): E5 — não localizada.** Encontrei apenas o serviço de limpeza que referencia a convenção de diretório `memory-tool/memories` (`extensions/copilot/src/extension/tools/common/memoryCleanupService.ts:38`). Nenhum arquivo com `memory-tool`/`MemoryTool` no nome existe na árvore de `microsoft/vscode` nesse commit (verificado sobre a árvore completa de 25.212 entradas). **Inferência E4:** a implementação vive no `copilot-agent-runtime`, que não está neste repositório. As afirmações da Task 02 sobre o MemoryTool permanecem com o grau que já tinham (E2/E3) e **não** foram reforçadas.

**Gravação do arquivo de identidade do OpenCode: E5 — não localizada.** A **leitura** está confirmada (`packages/core/src/project.ts:292` → `fs.readFileString(path.join(repo.commonDirectory, "opencode"))`). Quem **escreve** esse arquivo não está nos caminhos auditados. Registro honesto: confirmo que o OpenCode **lê** um ID de projeto persistido dentro do diretório Git comum; **não** confirmo que ele o escreva, nem com que frequência.

---

## §1 — Correções ao meu próprio trabalho anterior

Registrar isto é parte do método. Seis afirmações das Tasks 02/03 precisam de ajuste, e **duas delas mudam recomendações**.

### C-1 · "Nenhuma referência usa embeddings/vetor" — a formulação estava errada; a conclusão ficou **mais forte**

A Task 02 concluiu (§11, item 4) que *"nenhuma referência usa embeddings/vetor para recuperar conversa"*. Encontrei agora no OpenClaude um arquivo chamado **`src/memdir/vectorIndex.ts`** cujo cabeçalho diz, literalmente:

> *"Orama **vector** search index over memory/ .md files. Provides **semantic search** across the auto-memory directory."* — **E1**, `3a8e12b`, linhas 1-4.

**O código não faz isso.** Verificado:

| Verificação | Resultado |
|---|---|
| `create({ schema: ORAMA_SCHEMA })` — há `components: { embedder }`? | **Não.** Só o schema (`vectorIndex.ts:239`). Sem embedder, o Orama opera em modo **full-text**. |
| A busca usa `vector: { value, field }`? | **Não.** Usa `search(state.db, { term: query, limit })` (`vectorIndex.ts:337`) — `term` é busca **textual**. |
| `embedder` aparece em algum lugar do `src/`? | **Não** como configuração. Os 16 hits são a palavra inglesa *"embedder"* no sentido de "aplicação hospedeira do SDK" (`entrypoints/sdk/*`, `tools/McpAuthTool/*`, `utils/sessionStorage.ts`). |
| Há modelo de embedding em uso? | Só **entradas de catálogo de fornecedor** (`integrations/vendors/fireworks.ts:1465-1480`, modelos Qwen3 Embedding 0.6B/4B/8B). E `integrations/vendors/xai.ts:5` declara: *"embedding entries are **not usable** on the OpenClaude chat path."* |

**Correção registrada:** a formulação correta é — **nenhuma das quatro referências realiza recuperação vetorial; o OpenClaude é o caso mais próximo de parecer que sim, e não é.** Um arquivo **chamado** `vectorIndex`, **documentado** como "semantic search", implementa busca de texto puro.

**Por que isto importa para nós:** é um alerta metodológico direto. Se eu tivesse confiado no nome do arquivo ou no comentário, teria recomendado banco vetorial. **A recomendação da Task 02 (§9.3: não usar embeddings agora) permanece válida e agora tem evidência mais forte** — mas o motivo muda: não é "ninguém pensou nisso", é "quem nomeou assim não implementou assim".

**E5 — limite:** não auditei se existe um embedder plugável em outro ponto do OpenClaude fora de `src/`. A afirmação vale para os caminhos auditados.

### C-2 · **DP-04 não é uma decisão pendente.** Já está respondida na documentação canônica

A Task 02 registrou DP-04 como "divergência documental de numeração". Relendo `docs/06` com atenção, **a resposta já existe e é explícita**:

> `docs/06:547` — *"## Iniciativa de contexto M1–M4 — análise estática de dependências (D99, 2026-10-23; **não é roadmap numerado**)"*
> `docs/06:549` — *"**Decisão vigente:** M1–M4 são o primeiro conjunto aprovado para planejamento; **não há autorização para implementação, inserção entre fatias oficiais ou renumeração**."*
> `docs/06` (bloco D102) — *"M5–M8 mantêm os nomes/estudos prévios no `arquivo_morto` como **material histórico de apoio**: **não importar a numeração hipotética daquele estudo para Fatias 13–20**."*
> `docs/06` (bloco D102) — *"IDs antigos permanecem citáveis para rastreabilidade; **nada aqui cria Fatia 21 ou altera escopos 13–20**."*

Ou seja: a colisão que apontei entre a "posição hipotética 13…20" do pacote de 22/10 e a numeração D95 **já foi antecipada e proibida** pelo próprio documento canônico. **DP-04 deixa de ser contradição arquitetural e passa a ser uma nota documental** (§5). Sobrou **uma** pergunta residual genuína, e ela é de organização documental, não de arquitetura.

### C-3 · A ordem de execução da Task 03 é a ordem **interna** da iniciativa M — a execução é **posterior à Fatia 15**

A Parte C.4 da Task 03 listou "M1-a como passo 1". Lido isoladamente, isso sugere começar agora. **Está incompleto.** `docs/06` já decidiu:

> *"M1→M2→M3→M4 permanecem **planejamento posterior à 15**"*
> *"A recomendação de executar memória depois da 15 é **por estabilidade de contratos, não dependência funcional**."*
> M1: *"Planejar após contratos de 13/14 estabilizados; **executar depois de 15** para reduzir retrabalho de integração."*
> M2: *"Implementação recomendada **após 15** para evitar migrações concorrentes."*

**Correção:** a sequência da Task 03 vale **dentro** da iniciativa M, que por sua vez só executa **depois das Fatias 13 → 14 → 15**. Nenhuma das duas ordens foi alterada; faltava dizer que elas se aninham.

### C-4 · O OpenClaude tem **duas** extrações automáticas, e uma delas **não** usa IA

A Task 02 descreveu a extração automática do OpenClaude como "fork com prompt cache compartilhado" (R19). Está certo, mas **incompleto**. Existe um **segundo** mecanismo:

- `src/memdir/autoExtractFacts.ts` → `extractFactsIntoMemdir(content, memoryDir?)` — **10 extratores por expressão regular, zero chamada de modelo** (**E1**, arquivo integral, 388 linhas).
- Chamado a partir de `src/utils/conversationArc.ts:304`.
- O comentário em `ensureFactsDir` diz: *"the surrounding callers (`query.ts`) run this **on every turn** and must not throw before the model request starts."* (**E1**)

**Isto muda a DP-02**, porque os dois mecanismos têm naturezas diferentes diante da nossa regra de "Agent Loop único" (`docs/04 §1.5`). Ver §3.

### C-5 · O OpenClaude **tem** escopo global de memória

A Task 02 afirmou (§6, RD-10) que *"nenhum dos quatro projetos de código tem memória global automática de usuário"*. A parte "automática" continua verdadeira; a parte implícita de que **não existe escopo global** está **errada**:

> `src/tools/AgentTool/agentMemory.ts:12` — *"Persistent agent memory scope: `'user'` (`~/.openclaude/agent-memory/`), `'project'` (`.openclaude/agent-memory/`), or `'local'` (`.openclaude/agent-memory-local/`)"*
> `agentMemory.ts:13` — `export type AgentMemoryScope = 'user' | 'project' | 'local'` (**E1**)

Existe **um diretório global fora de `projects/`**, com `MEMORY.md` próprio, e ele **compartilha a mesma infraestrutura** dos escopos de projeto. **Isto muda a DP-05** de forma favorável ao pedido do dono: há precedente de código, sim. Ver §6.

### C-6 · O OpenClaude **já passou** pelo problema de ter duas lojas de memória — e consolidou

> `src/utils/knowledgeGraph.ts:1-8` — *"Knowledge Graph — **compatibility layer over memdir**. Previously maintained its own SQLite/JSON/Orama storage. **Now delegates to memdir** for storage and vector search. The Entity/Relation/Summary types are kept for backward compatibility; the actual data lives as structured .md files in the auto-memory directory."* (**E1**)

Isto é evidência empírica do custo de RD-6/R-14 (duas taxonomias/duas lojas): um projeto real construiu duas, depois fundiu, e hoje carrega uma **camada de compatibilidade** só para não quebrar quem usava a antiga. Argumento concreto para não criarmos uma segunda loja.

---

## §2 — DP-01 · Identidade persistente de projetos

### 2.1 O problema no Agente Window

Toda a persistência do Agente Window é particionada por uma chave derivada do **caminho da pasta**. Se essa chave muda, o histórico, as sessões e (futuramente) a memória ficam **órfãos**: continuam no disco, mas nada os encontra. Os cenários que o dono listou — renomear, mover, trocar de unidade, mesmo repositório em dois caminhos, copiar/clonar, sem Git, múltiplos workspaces — **todos** mudam o caminho. Hoje, todos eles produzem um projeto "novo".

Isto bloqueia **M5** (memória de projeto) e **M6** (recuperação com escopo autorizado), porque "escopo do projeto" é indefinível sem identidade estável. **Não** bloqueia M1, M2, M3 nem M4.

### 2.2 Como funciona hoje (E1 — código verificado)

| Elemento | Onde | O que faz |
|---|---|---|
| `Session.slug?: string` | `src/types.ts:97` | Documentado como *"Stable filesystem-safe project key"* |
| Derivação | `server/session-persistence/index.ts:154` | `slug = session.slug \|\| sanitizePath(session.workspacePath)` — **deriva do caminho**, sem canonicalização, sem Git |
| `sanitizePath` | `server/session-persistence/paths.ts:30-34` | não-alfanumérico → `-`; se passar de **80** caracteres, trunca e anexa hash **FNV-1a** de 8 hex |
| Diretório | `paths.ts` → `resolveProjectDir()` | `~/.agente_window/projects/<slug>/`, com guarda anti-traversal |
| Banco | `paths.ts` → `getDatabasePath()` | `~/.agente_window/agente_window.db` — **um único banco global**, não particionado |
| Worktree | `index.ts:288` | **preserva** o `slug` do projeto de origem |

**Três observações que importam:**
1. **Não há canonicalização.** `workspacePath` é usado como vem. Symlink, diferença de caixa (Windows), `C:\x` vs `C:/x`, e caminho com Unicode não-normalizado produzem chaves diferentes para a mesma pasta.
2. **O hash só aparece acima de 80 caracteres.** Abaixo disso a chave é **puramente lossy** (`/a/b-c` e `/a-b/c` colidem) **e sem desambiguação** — o mesmo defeito que o DeepSeek Harness documenta e **aceita de propósito**, e que o OpenCode documenta e **resolve com outra estratégia**.
3. **O catálogo SQLite já é global.** Isso é uma **vantagem** escondida: nós já temos um banco único onde uma tabela de identidade pode morar sem criar armazenamento novo.

### 2.3 Como as referências resolvem

#### 2.3.1 OpenCode — **escada de identidade** + banco de projetos (E1, o mais completo dos quatro)

`packages/core/src/project.ts`, função `resolve(input: AbsolutePath)`. A identidade é resolvida por uma **escada com fallback**, e o resultado **não é um caminho** — é um ID opaco persistido numa tabela:

```
1. fs.resolve(input)                                   → canonicalização do caminho
2. fs.up({ targets: ['.git','.hg'], mode: 'first' })   → sobe procurando marcador de VCS
3. SE achou .git:
     fingerprint = git.repo.fingerprint(dotGit)        → cache LRU (capacity 512) por `${dotGit}\0${fingerprint}`
     id = remote(repo)                                 → Hash.fast('git-remote:' + normalizado)
          ?? cached(repo.commonDirectory)              → lê <commonDir>/opencode (ID persistido no repo)
          ?? rootCommit(repo)                          → SHA do PRIMEIRO commit do repositório
     canonical = (gitDirectory === commonDirectory)
                 ? repo.worktree
                 : worktree com kind === 'main'         → worktrees ligados apontam para o checkout principal
     vcs = { type:'git', store: repo.commonDirectory }
4. SENÃO SE achou .hg:  id = cached(dotHg) ?? primeiro root changeset
5. SENÃO (sem VCS):     id = Hash.fast('directory:' + directory);  vcs = undefined
6. id ?? ID.global                                     → existe um ID literal "global"
```

Detalhes que importam, todos **E1**:

- **Normalização do remote** (`url()`/`parts()`): `URL.parse`; **`file:` → `undefined`** (remote local não conta como identidade); aceita sintaxe SCP `user@host:path`; remove `/` iniciais, remove `.git/` final, remove `/` finais; **host em minúsculas**. Logo `https://github.com/Foo/bar.git`, `git@github.com:foo/bar.git` e `https://github.com/foo/bar` produzem **o mesmo ID**.
- **Namespace por origem**: `'git-remote:'` e `'directory:'` são prefixos do material hasheado → um ID derivado de caminho **nunca** colide com um derivado de remote.
- **`rootCommit`** (`git.history.rootCommits(repo)[0]`) é a âncora mais robusta: o SHA do primeiro commit **não muda** quando a pasta é renomeada, movida, trocada de unidade ou clonada.
- **Persistência em banco, não em diretório** (`packages/core/src/project/sql.ts`):
  ```
  project(id PK, worktree NOT NULL, vcs, name, icon_url, icon_url_override, icon_color,
          <Timestamps>, time_initialized, time_active NOT NULL default now, time_archived,
          sandboxes NOT NULL, commands json)
  project_directory(project_id → project.id ON DELETE CASCADE, directory, type, strategy, time_created)
     PK (project_id, directory)     -- @deprecated → substituída por WorktreeTable
  ```
  **Identidade é uma linha; diretórios são uma relação 1:N.** Mover/clonar/worktree **adiciona linha**, não cria projeto.
- **`upsertProject` não sobrescreve o canonical**: `onConflictDoUpdate({ target: id, set: { vcs }, setWhere: … })` — atualiza **só** o `vcs`. O comentário no `persist()` explica: *"**Clones share a project ID; only replace a canonical directory that is gone.**"* — o canonical só é trocado se `previous.canonical !== project.canonical` **e** o anterior **não existe mais** (`fs.exists`, com `orElseSucceed(() => true)` → ilegível conta como presente).
- **`Project.activate(id)`**: registra atividade, **no máximo uma vez por minuto** (`ACTIVATE_INTERVAL = 60_000`), e mantém `time_updated` fora do bump implícito (*"Activity is not a metadata edit"*).
- **`Project.sweep()`** a cada hora: arquiva projetos cujos diretórios conhecidos **todos** desapareceram; exclui `ID.global`; *"Treat unreadable paths as present so transient filesystem errors never archive a Project"*; se sobreviver um worktree **main**, ele é **promovido a canonical** em vez de arquivar; concorrência 8.
- **Adoção de projeto sem marcador**: ao anunciar um diretório novo, procura projetos com `vcs IS NULL` cujo `worktree` seja **prefixo** do novo (truque de intervalo em SQL: `worktree >= dir AND worktree <= dir || '\uffff'`), e verifica com `fs.up` se o marcador encontrado pertence mesmo àquele diretório. Se sim, o projeto sem VCS é **adotado** pelo projeto com VCS. → **É exatamente o caso "pasta sem Git que depois vira repositório".**
- **Evento publicado atomicamente com a inserção da linha**: `bus.publish(Worktree.Event.Resolved, {…}, { commit: () => db.insert(WorktreeTable)… })`, com o comentário *"a crash between checks retries on the next resolve instead of stranding the announcement"* e um `Set` de anúncios em voo para não publicar duas vezes.
- **Separação deliberada de custo**: `Project.root()` é documentado como *"Keep this filesystem-only; **permission checks use it and should not execute VCS commands**."* → a resolução de identidade (que pode disparar `git`) **não** fica no caminho quente de permissão.
- **`WorktreeDirectory.canonical()`** (`worktree/directory.ts`): `fs.resolve` + verificação `isDir`, senão `DirectoryUnavailableError` tipado.

#### 2.3.2 OpenClaude — **duas identidades diferentes de propósito** (E1)

O ponto mais importante: **sessão e memória não usam a mesma chave.**

| O quê | Chave | Código |
|---|---|---|
| **Sessões** (transcript `.jsonl`) | caminho **canonicalizado** (`realpath` + NFC), sem Git | `utils/sessionStoragePortable.ts:335-341` `canonicalizePath()`; `:325-327` `getProjectDir()` |
| **Memória** (`memdir`) | **raiz Git canônica**, com fallback para a raiz do projeto | `memdir/paths.ts` → `getAutoMemBase() = findCanonicalGitRoot(getProjectRoot()) ?? getProjectRoot()` |

- **`canonicalizePath(dir)`**: `(await realpath(dir)).normalize('NFC')`, com fallback só-NFC se o `realpath` falhar (diretório ainda não existe). Comentário: *"Ensures symlinked paths (e.g. `/tmp` → `/private/tmp` on macOS) resolve to the same project directory."*
- **`sanitizePath(name)`** (`sessionStoragePortable.ts:311-319`): `name.replace(/[^a-zA-Z0-9]/g,'-')`; se `≤ 200` caracteres (`MAX_SANITIZED_LENGTH = 200`), devolve assim; senão `slice(0,200) + '-' + hash`, onde `hash = Bun.hash(name).toString(36)` **ou** `simpleHash(name) = Math.abs(djb2Hash(str)).toString(36)`.
  → **É quase a nossa função.** A nossa: não-alfanumérico → `-`, trunca em **80** + FNV-1a 8 hex.
- **⚠️ Falha documentada do sufixo de hash** (`findProjectDir`, linhas 343-349): *"The CLI uses `Bun.hash` while the SDK under Node.js uses `simpleHash` — for paths that exceed `MAX_SANITIZED_LENGTH`, these produce **different directory suffixes**. This function **falls back to prefix-based scanning** when the exact match doesn't exist."* → **dois runtimes do mesmo produto geram nomes de diretório diferentes para o mesmo projeto**, e a solução foi varrer o diretório pai procurando `<prefixo>-*`. **Este é o custo concreto de amarrar identidade a uma função de hash.**
- **Fallback de worktree na leitura** (`resolveSessionFilePath`): canonicaliza → `findProjectDir` → se não achar, tenta **cada worktree irmão** (`getWorktreePathsPortable`) → se ainda não achar e nenhum `dir` foi dado, **varre todos** os diretórios de projeto. Arquivos de **zero byte contam como não encontrados**, para a busca continuar.
- **Por que a memória usa a raiz Git** (`paths.ts`, docstring de `getAutoMemBase`): *"Uses `findCanonicalGitRoot` so **all worktrees of the same repo share one auto-memory directory** (anthropics/claude-code#24382)."*
- **🔴 Custo de segurança de ancorar na raiz Git** (`utils/git.ts:146-172`, `resolveCanonicalRoot`): *"**SECURITY:** The `.git` file and `commondir` are **attacker-controlled in a cloned/downloaded repo**. Without validation, a malicious repo can point `commondir` at any path the victim has trusted, **bypassing the trust dialog and executing hooks from `.claude/settings.json` on startup**."* A validação exige **as duas** checagens:
  1. `dirname(worktreeGitDir) === join(commonDir,'worktrees')` — garante que o `commondir` lido vive dentro do diretório comum resolvido, não dentro do repositório do atacante;
  2. `realpath(<worktreeGitDir>/gitdir) === join(realpathSync(gitRoot), '.git')` — impede que o atacante "pegue emprestado" um worktree legítimo da vítima.
  E o comentário explica por que as duas: *"(1) alone fails if victim has a worktree of the trusted repo; (2) alone fails because attacker controls `worktreeGitDir`."* Além disso: aplicar `realpath` no **diretório** e só então juntar `.git` — aplicar `realpath` no arquivo `.git` seguiria um `.git` symlinkado e deixaria o atacante pegar o back-link da vítima. Submódulos não têm `commondir` → retornam a própria raiz (correto: são repositórios separados). Memoizado com LRU pequeno porque está no caminho quente.
- **O caso em que a identidade por caminho quebra de vez** (`paths.ts`, docstring de `getAutoMemPathOverride`): o override existe porque, no Cowork, *"the per-session cwd (**which contains the VM process name**) would otherwise produce a **different project-key for every session**."* → **evidência direta de que identidade derivada de caminho falha em ambiente efêmero/container**, e a correção deles foi permitir um **caminho completo explícito** por variável de ambiente.
- **Validação do caminho de memória** (`validateMemoryPath`): rejeta relativo, raiz/quase-raiz (`length < 3`), raiz de unidade Windows (`/^[A-Za-z]:$/`), UNC (`\\server\share` — *"network paths — opaque trust boundary"*), byte nulo; `~/` só expande em `settings.json`, nunca na variável de ambiente; `~`, `~/`, `~/.`, `~/..` **não** expandem (virariam `$HOME` inteiro); devolve com exatamente um separador final e `.normalize('NFC')`.
- **🔴 Configuração commitada no repositório NÃO pode redirecionar memória** (`getAutoMemPathSetting`): a origem `projectSettings` (`.claude/settings.json` do repo) é **intencionalmente excluída** — *"a malicious repo could otherwise set `autoMemoryDirectory: "~/.ssh"` and gain silent write access to sensitive directories via the filesystem.ts write carve-out"*.
- **Proteção adicional contra traversal** (`memdir/teamMemPaths.ts`): `PathTraversalError`; rejeita byte nulo; rejeita traversal **URL-codificado** (`%2e%2e%2f`), com tratamento de codificação malformada; e rejeita **ataque de normalização Unicode** — *"fullwidth `．．／` (U+FF0E U+FF0F) normalize to ASCII `../` under NFKC"*. Proteção de prefixo: o diretório termina em separador, então `/foo/team-evil` **não** casa com `/foo/team`.

#### 2.3.3 DeepSeek Harness — **caminho legível, lossy de propósito, sem hash** (E1 + E2)

Layout (`2026-07-24-project-session-directories.md`, status *implemented*):
```
<configured-root>/--<normalized-cwd>--/<encoded-session-id>/session.jsonl.zstd
```
Sessões sem `cwd` vão para `_no-cwd`. Código (`session-persistence-jsonl/src/format.ts:225-247`):

```ts
export function projectKey(cwd: string): string {
  // '/' , '\\' , ':' → '-'   (sequências de separadores colapsam em um '-')
  // [A-Za-z0-9._-] fica literal; '~' e qualquer outro → '~XXXX' (hex, 4 dígitos, maiúsculo)
  const slug = readable.replace(/^-+/, '') || 'root'
  return `--${slug.slice(0, 251)}--`
}
projectDir(root, cwd) = cwd === undefined ? join(root,'_no-cwd') : join(root, projectKey(cwd))
sessionDir(root, cwd, id) = join(projectDir(root,cwd), encodeSegment(id))
```

Decisões documentadas, todas relevantes para nós:

- **"The project key intentionally has no hash suffix."** Motivo: *"follows the common human-readable convention used by coding agents and keeps the normalized project path as the complete directory name."*
- **A perda é declarada e aceita:** *"The normalization is **lossy**: paths such as `/a/b-c` and `/a-b/c`, or long paths with the same retained prefix, **share one project directory**. Their distinct session ids still select separate session directories; **reuse of the same session id remains a storage collision and is rejected**."*
- **Mover o projeto muda o diretório — e eles dizem isso abertamente** (Consequences): *"**Moving a project usually selects a different directory**, but distinct cwd strings that normalize to the same name share one project directory by design."*
- **Sistema de arquivos case-insensitive:** *"Identity validation accepts such an alternate spelling **only when filesystem canonicalization resolves the discovered and expected paths to the same transcript**. A different canonical path remains corruption, so case aliases do not weaken the same-id collision check on case-sensitive stores."*
- **A raiz é escolha de deployment:** *"The configured root remains a deployment choice. The layout **neither selects a global root nor requires projects to share one**."*
- **Alternativas consideradas e rejeitadas** (E2, lista literal): hashes opacos de `cwd` (preservavam nomes curtos mas **derrotavam a navegação**); arquivos direto no diretório do projeto (*"matched Claude Code and pi's basic file organization but left no session-level ownership boundary"*); **sufixo de hash resistente a colisão** (*"distinguishes paths whose normalized forms collide, but makes the directory name more than the normalized project path. The chosen convention **accepts lossy project grouping** in exchange for the simpler, recognizable name"*); raiz centralizada obrigatória (rejeitada: *"storage placement belongs to deployment configuration"*); carregar os dois layouts (rejeitado sob a política de sem-compatibilidade de pré-lançamento).
- **Materialização preguiçosa**: `create()` **não faz I/O**; o primeiro `append` cria os diretórios. Diretórios vazios **não** são listados como sessões.
- **`cwd` resolvido uma vez**: `index.ts:325` — *"Resolve once so later `process.cwd()` changes cannot split one backend across roots"*; e `:97` — *"`process.cwd()` would scatter session files as the process's cwd changes"*.

#### 2.3.4 VS Code / Copilot — **quatro identidades diferentes para quatro finalidades** (E1)

Este é o caso mais instrutivo: **a Microsoft não escolheu uma identidade de projeto; escolheu uma por preocupação.**

| Preocupação | Identidade usada | Evidência |
|---|---|---|
| Estado da janela/workspace | `hash(uri.toString()).toString(16)` — **opaco** | `platform/workspaces/common/workspaceIdentifier.ts` |
| Armazenamento de sessões (Chronicle) | **um banco só**; projeto é **metadado indexado** | `extensions/copilot/src/platform/chronicle/node/sessionStore.ts` |
| Consentimento de sincronização | **`repoNwo`** (nome-com-dono do GitHub), com exclusões por glob | `…/chronicle/common/sessionIndexingPreference.ts` |
| Escopo de memória | **dois roots** do extension host (`storageUri` × `globalStorageUri`) | `…/tools/common/memoryCleanupService.ts` |
| Diretório de trabalho do agente | **override explícito** do hospedeiro | `extensions/copilot/src/platform/workspace/common/workingDirectory.ts` |

- **`workspaceIdentifier.ts`** — a função inteira é:
  ```ts
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  // NOTE: DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE
  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  function getWorkspaceId(uri: URI): string { return hash(uri.toString()).toString(16); }
  ```
  O aviso gritado aparece **duas vezes**, antes de `getWorkspaceIdentifier` e antes de `getSingleFolderWorkspaceIdentifier`. **A derivação é tratada como contrato de compatibilidade, não como detalhe de implementação.** Consequência aceita: renomear/mover/trocar de unidade → **outro id** → estado órfão. Para eles é tolerável porque é estado de janela, não memória.
- **Chronicle `sessions`** (schema, `SCHEMA_VERSION = 3`):
  ```sql
  CREATE TABLE sessions ( id TEXT PRIMARY KEY, cwd TEXT, repository TEXT, host_type TEXT,
                          branch TEXT, summary TEXT, agent_name TEXT, agent_description TEXT,
                          created_at TEXT DEFAULT …, updated_at TEXT DEFAULT … );
  CREATE INDEX idx_sessions_repo ON sessions(repository);
  CREATE INDEX idx_sessions_cwd  ON sessions(cwd);
  ```
  **`cwd` e `repository` são colunas separadas, ambas anuláveis, cada uma com índice.** Projeto é **filtro de consulta**, não partição de armazenamento. O upsert usa `COALESCE(excluded.cwd, cwd)` / `COALESCE(excluded.repository, repository)` → **uma escrita posterior com NULL não apaga um valor já conhecido** (enriquecimento monotônico de metadado). `host_type` foi acrescentado por migração aditiva (`ALTER TABLE sessions ADD COLUMN host_type TEXT`).
- **`sessionIndexingPreference.ts`** — três níveis explícitos de indexação de sessão:
  ```ts
  /** - 'local': keep on device only, no remote export
   *  - 'user': sync to cloud, visible only to the user
   *  - 'repo_and_user': sync to cloud, visible to repo collaborators */
  export type SessionIndexingLevel = 'local' | 'user' | 'repo_and_user';
  ```
  Duas configurações independentes: `chat.localIndex.enabled` (índice SQLite local + comandos `/chronicle`) e `chat.sessionSync.enabled` (*"core setting with **enterprise policy**"* → upload). E exclusão **por repositório**: `chat.sessionSync.excludeRepositories`, comparado com `picomatch.isMatch(repoNwo, pattern)`. → **Quando a decisão é sobre compartilhamento/consentimento, a identidade usada é o repositório (`name-with-owner`), não o caminho.**
- **`workingDirectory.ts`** — *"When a working directory is set (**agents window**), it takes priority over workspace folders for all folder-related operations."* Comparações com `extUriBiasedIgnorePathCase` → **URI-comparação com viés de ignorar caixa**, o tratamento de Windows/macOS.
- **Robustez de armazenamento** (`sessionStore.ts`): `CORRUPTION_ERROR_MARKERS = ['malformed','file is not a database','not a database','disk image','disk i/o error']` — se um deles aparecer, **apaga o banco + sidecars WAL/SHM e reabre uma vez**. Motivo documentado: sistemas de arquivo de rede (NFS/SMB/sshfs) em workspaces SSH-Remote, *"where SQLite's locking protocol is not honoured and the file can become permanently malformed"*. E a opção `remote`: *"WAL requires shared-memory (-shm) plus POSIX byte-range locking, neither of which network filesystems reliably provide. A **rollback journal with a longer busy timeout** is far more robust there."*

### 2.4 Quadro comparativo

| Critério | **Agente Window** | **OpenCode** | **OpenClaude** | **DeepSeek Harness** | **VS Code/Copilot** |
|---|---|---|---|---|---|
| Base da identidade | caminho do workspace | **escada**: remote → ID no `.git` → root commit → hash do caminho | **sessão**: caminho canonicalizado · **memória**: raiz Git canônica | `cwd` normalizado | `hash(uri)` para janela; metadados `cwd`+`repository` para sessão |
| Canonicalização (`realpath`/NFC) | **não** | sim (`fs.resolve`) | **sim** (`realpath` + NFC) | não (só normalização de caracteres) | sim (comparação URI biased-ignore-case) |
| Usa Git | não | **sim, como primeira opção** | **sim, só para memória** | não | só como metadado/consentimento |
| Git é opcional | — (nem usa) | **sim** (degrada para hash de caminho) | **sim** (`?? getProjectRoot()`) | **sim** (`_no-cwd`) | sim |
| Forma do nome de diretório | slug lossy + hash se >80 | **não usa diretório por projeto** (banco) | slug lossy + hash se >200 | slug legível lossy, **sem hash**, `--…--`, máx. 251 | hash opaco (janela) / banco único (sessão) |
| Renomear pasta | **órfão** | **mesmo projeto** | sessão: órfão · memória: **mesma** | **outro diretório** (aceito) | **outro id** (aceito) |
| Mover de unidade | **órfão** | **mesmo projeto** | idem acima | **outro diretório** | **outro id** |
| Mesmo repo em 2 caminhos | **2 projetos** | **1 projeto, 2 linhas de diretório** | memória: **1** · sessão: 2 | **2 diretórios** | 1 banco, 2 valores de `cwd` |
| Clonar/copiar | **2 projetos** | **1 projeto** (*"clones share a project ID"*) | memória: **1** | **2 diretórios** | depende do `repository` |
| Sem Git | funciona (é o único caso) | funciona (hash de caminho) | funciona (fallback) | funciona (`_no-cwd`) | funciona |
| Worktrees | preserva `slug` (`index.ts:288`) | `WorktreeTable` + canonical = checkout `main` | **compartilham memória** (#24382) | não trata | não trata |
| Pasta sem Git que vira repo | **novo projeto** | **adoção** implementada | novo (memória muda de chave) | novo diretório | novo metadado |
| Ambiente efêmero (cwd por sessão) | **quebraria** | resolve (remote/root commit) | **quebrava** → resolveram com override explícito | não trata | resolve com `WorkingDirectory` explícito |
| Arquivamento/limpeza | **nenhum** | `sweep()` horário + `activate()` 1×/min | nenhum | nenhum | `MemoryCleanupService` (14 dias, só workspace) |
| Custo de resolver | desprezível (string) | **pode disparar `git`** → cache LRU 512 + `root()` filesystem-only | `realpath` + leitura de `.git` (memoizado LRU) | desprezível | desprezível |
| Superfície de segurança nova | nenhuma | spawn de `git` + leitura de remote | **validação de worktree obrigatória** (2 checagens) + exclusão de `projectSettings` + NFKC | nenhuma | nenhuma |

### 2.5 Alternativas para o Agente Window

| # | Alternativa | Vantagens | Desvantagens | Risco de colisão |
|---|---|---|---|---|
| **A1** | **Manter como está** (slug do caminho) | zero trabalho; P9 já provado; nenhum custo novo | órfão em renomear/mover/unidade/clonar; já é lossy **sem** desambiguação abaixo de 80 chars | **Alto** — `/a/b-c` ≡ `/a-b/c`; sem hash para desfazer |
| **A2** | **Só canonicalizar** (`realpath` + NFC antes de `sanitizePath`) | **mudança mínima**; corrige symlink, caixa e Unicode; sem Git, sem custo, sem superfície nova | continua órfão ao mover/renomear | igual a A1 |
| **A3** | **Escada OpenCode** (remote → root commit → caminho canonical) com tabela `projeto(id)` + `projeto_diretorio(id, caminho)` | resolve **todos** os cenários listados; clones/worktrees/moves preservam dados; Git opcional por construção | dispara `git` (custo, precisa de cache); **exige a validação de segurança de worktree do OpenClaude** se seguir `commondir`; dois clones passam a compartilhar dados (pode ser indesejado); migração dos slugs atuais | **Baixo** (namespace por origem) |
| **A4** | **ID explícito criado e guardado por nós** (arquivo `.agente_window/project-id` no workspace, ou linha no catálogo + escolha do dono) | determinístico, sem `git`, sem hash, sem lossy; o dono vê e controla | escreve **dentro** do workspace do dono (decisão de privacidade/versionamento); exige UX para criar/renomear/fundir; não resolve sozinho o "mesmo repo em 2 caminhos" sem o dono agir | **Muito baixo** |
| **A5** | **Modelo Chronicle**: banco único, projeto como metadado indexado (`caminho`, `repositorio`) | nenhum particionamento de disco; mover/renomear é só **atualizar metadado**; reusa o catálogo SQLite que já temos; `COALESCE` preserva valor conhecido | perde o isolamento físico por projeto (que hoje é uma **barreira de segurança**, não só organização); exige escopo na **consulta e na autorização**, não no caminho; P7 (isolamento por slug) deixa de ser estrutural | **Baixo**, mas o isolamento passa a depender de disciplina de consulta |

### 2.6 Recomendação fundamentada

**Recomendo uma identidade em três camadas, com adoção incremental — A2 imediatamente, A3 como destino, A5 como mecanismo de transição.** Não é uma escolha única; é uma ordem, e cada etapa vale por si.

**Camada 1 — Canonicalizar antes de derivar (A2). Faça isto independentemente de qualquer outra decisão.**
`realpath` + `.normalize('NFC')` antes de `sanitizePath`. É a única mudança que **não** cria risco novo, **não** depende de Git, **não** custa I/O relevante e corrige três causas reais de projeto duplicado (symlink, caixa em Windows, Unicode não-normalizado). Precedente: OpenClaude `canonicalizePath` (`sessionStoragePortable.ts:335-341`) e OpenCode `fs.resolve` + `WorktreeDirectory.canonical`. **Sem isto, qualquer outra camada constrói sobre areia.**

**Camada 2 — Separar identidade de nome de diretório.**
Hoje as duas coisas são a mesma string (`slug`). Recomendo dividir:
- **`projetoId`**: opaco, estável, com **namespace por origem** (padrão OpenCode: `'git-remote:'`, `'directory:'`). Nunca aparece em caminho.
- **`rotulo`**: o slug legível atual, que continua nomeando o diretório. Passa a ser **etiqueta de armazenamento**, não identidade.
Isto é o que o DSH escolheu conscientemente (legibilidade **sem** hash, aceitando a perda) e o que o OpenCode escolheu conscientemente (ID opaco **fora** do caminho). As duas escolhas só são seguras **quando separadas**. O nosso erro atual não é ter escolhido legível nem opaco — é ter feito **as duas coisas com a mesma string**.

**Camada 3 — Tabela de diretórios 1:N no catálogo SQLite que já temos.**
`projeto_diretorio(projeto_id, caminho, tipo, criado_em)` com PK `(projeto_id, caminho)`. Renomear/mover/clonar/worktree **adiciona linha**. Precedente direto: OpenCode `WorktreeTable`/`ProjectDirectoryTable`. **Custo quase nulo para nós**, porque `getDatabasePath()` já devolve **um banco global** (`~/.agente_window/agente_window.db`) — não precisamos criar armazenamento novo.

**Escada de resolução recomendada (Git opcional, como exige D36/D104 e o fluxo 06.4a):**

```
1. linha já conhecida em projeto_diretorio(caminho canonical)     → projetoId   [barato, sem git]
2. ID explícito gravado pelo dono (A4), se existir                → projetoId   [determinístico]
3. remote Git normalizado (host minúsculo, sem .git, file: ignora)→ hash('git-remote:'+n)
4. SHA do commit raiz                                             → o próprio SHA
5. caminho canonical                                              → hash('directory:'+c)
6. falhou tudo                                                    → projeto novo, registrado, NUNCA silêncio
```

Passos 3–5 só rodam se houver marcador de VCS **e** só no caminho de resolução de projeto, **nunca** no caminho de permissão (regra explícita do OpenCode: *"permission checks … should not execute VCS commands"*), com cache por `.git` + fingerprint.

**Três condições que acompanham a recomendação — sem elas, eu recomendaria contra A3:**

1. **🔴 Se a identidade ancorar em raiz Git, implementar as duas validações do OpenClaude.** Não é opcional. `resolveCanonicalRoot` (`utils/git.ts:146-172`) documenta um ataque real: repositório clonado malicioso aponta `commondir` para um caminho já confiado pela vítima e **executa hooks na inicialização, contornando o diálogo de confiança**. As duas checagens são necessárias em conjunto, e o motivo de cada uma está documentado. **O Agente Window tem ferramentas de arquivo e execução com aprovação — o mesmo vetor se aplica.**
2. **🔴 Configuração vinda do repositório nunca pode redirecionar memória/identidade.** Precedente: OpenClaude exclui `projectSettings` de `autoMemoryDirectory` exatamente porque *"a malicious repo could otherwise set `autoMemoryDirectory: "~/.ssh"`"*. Para nós: nada em `<workspace>/.agente_window/*` pode decidir onde fica `~/.agente_window/projects/*`.
3. **🟡 Endurecer a guarda anti-traversal existente.** `resolveProjectDir()` já tem guarda, mas os vetores que o OpenClaude cobre e que **não verifiquei no nosso código** são: byte nulo, traversal **URL-codificado** (`%2e%2e%2f`) e **normalização NFKC de largura total** (`．．／` → `../`). Recomendo testar os três antes de qualquer mudança — é teste, não arquitetura.

**O que recomendo explicitamente NÃO fazer:**
- **Não** escrever dentro do `.git` do dono (o OpenCode **lê** `<commonDir>/opencode`; não localizei quem escreve — E5). Escrever no repositório alheio é decisão de privacidade que não nos cabe tomar por inferência.
- **Não** mudar o hash (FNV-1a) nem o limite (80) dos slugs existentes. O OpenCode documenta o custo exato disso: dois runtimes, dois hashes, diretórios diferentes, varredura por prefixo como remendo. E o VS Code trata a função de derivação como **congelada**, com aviso gritado. **Se a derivação atual for mantida, que seja declarada estável — e aí ela não pode mais mudar.**
- **Não** renomear diretórios no disco automaticamente. Adicionar linha na tabela é reversível; renomear pasta com histórico dentro não é.
- **Não** fundir dois projetos automaticamente. A **adoção** do OpenCode (projeto sem VCS absorvido por projeto com VCS) só é segura porque verifica com `fs.up` que o marcador pertence mesmo àquele diretório, e ainda assim publica evento com `previous` para o consumidor migrar. Fusão automática sem confirmação do dono é risco de mistura de histórico.

### 2.7 Riscos e dependências

| Risco | Severidade | Mitigação |
|---|---|---|
| **Ancorar em raiz Git importa superfície de ataque** (`.git`/`commondir` controlados pelo repo clonado) | **Alta** | As duas validações do OpenClaude, ou não ancorar em Git |
| **Dois clones passam a compartilhar histórico/memória** — pode ser desejado ou não | Média | É **decisão de produto**, não técnica. OpenCode aceita; DSH não (diretórios distintos). Precisa do dono |
| **`git` no caminho de resolução** custa latência e pode travar em repo grande/rede | Média | Cache por `.git`+fingerprint (OpenCode: LRU 512); `root()` filesystem-only; nunca no caminho de permissão |
| **Migração dos slugs existentes** | Média | Tabela 1:N: o slug atual vira **uma linha de diretório** do projeto resolvido. Nenhum rename, nenhuma perda |
| **Repositório sem remote e com raiz reescrita** (`filter-branch`, squash inicial) muda o root commit | Baixa | Escada tem fallback; e o passo 1 (linha conhecida) resolve antes |
| **`repoNwo` como identidade de consentimento** exige remote — sem remote, não há consentimento por repositório | Baixa | Só importa se um dia houver compartilhamento; hoje D105 é local-only |
| **Ambiente efêmero** (cwd por sessão) quebra qualquer identidade por caminho | Baixa hoje, **alta se um dia rodarmos em container/preview** | O OpenClaude **viveu isso** e criou override explícito de caminho completo. Registrar como requisito futuro |

**Dependências:** 🔎 **H6** (suficiência do `slug`) só se resolve com **dados do dono** — quais caminhos reais ele usa. Nenhuma evidência externa substitui isso.

### 2.8 Impacto nas Fatias M1–M8

| Fatia | Impacto |
|---|---|
| **M1** | Nenhum. Não usa identidade de projeto. |
| **M2** | **Médio.** O log é particionado por `slug`. A Camada 3 (tabela 1:N) deve existir **antes** de M2 gravar em volume, senão a migração fica mais cara. Recomendo: M2 grava `projetoId` **junto** com `slug`, mesmo que `projetoId` ainda seja derivado do caminho. Campo aditivo, custo zero, evita migração futura. |
| **M3** | **Médio.** `fingerprintFonte` do checkpoint e o caminho do sidecar usam a chave. Se a chave mudar, checkpoint antigo precisa ser reconhecível. |
| **M4** | **Baixo.** O índice é derivado e descartável (S12): se a identidade mudar, reconstrói. **Mas** o escopo da consulta usa a chave — precisa da mesma. |
| **M5** | **🔴 Bloqueante.** "Memória de projeto" é indefinível sem identidade. |
| **M6** | **🔴 Bloqueante.** Escopo autorizado (`{tipo:'projeto', projetoId}`) depende de M5. |
| **M7** | **Médio-alto.** `workspaceObservado` e a detecção de divergência **são** um problema de identidade: "a pasta mudou" vs "é outro projeto" vs "é o mesmo projeto movido" são três respostas diferentes, e hoje não distinguimos. |
| **M8** | **Alto.** Os canários de isolamento A/B (P7) usam `slug`. Se a identidade mudar, os testes de isolamento precisam cobrir **todos** os caminhos da escada. |

### 2.9 O que ainda exige aprovação humana

1. **A escolha da estratégia** (A1–A5, ou a composição em três camadas recomendada).
2. **Se dois clones do mesmo repositório devem compartilhar histórico e memória.** É decisão de produto. OpenCode diz sim; DSH diz não.
3. **Se aceitamos disparar `git` para resolver identidade**, com o custo e a superfície de segurança que vêm junto.
4. **Se um ID explícito pode ser gravado dentro do workspace do dono** (A4) — implica decisão de versionamento e privacidade.
5. **🔎 H6 — os caminhos reais que o dono usa.** Sem isso, a escolha é teórica. Pergunta concreta: *o senhor abre o mesmo repositório por caminhos diferentes? Move pastas de projeto? Trabalha sem Git? Usa worktrees?*

---

## §3 — DP-02 · Memória automática versus controlada pelo usuário

### 3.1 O problema no Agente Window

O dono quer que o agente *"compreenda decisões antigas e continue tarefas sem exigir que o usuário explique novamente todo o contexto"*. Há dois caminhos: o agente **decide sozinho** o que guardar (automático), ou o dono **manda** guardar (controlado). Automático promete menos fricção e custa: chamada extra de modelo, tokens de protocolo no system prompt, superfície de segurança (conteúdo de conversa virando dado durável sem revisão), e — no nosso caso específico — **um segundo loop de agente**, o que colide com `docs/04 §1.5` (*"Agent Loop único"*).

### 3.2 Como funciona hoje (E1)

**Não existe.** Nenhuma memória, automática ou manual (§2.6 da Task 02). O que existe e restringe a resposta:

| Restrição vigente | Onde |
|---|---|
| **Agent Loop único** | `docs/04 §1.5`, condição de adoção |
| Modos impostos pelo servidor (Perguntar/Planejar são read-only) | `agir/server/modos.ts` — ✅ D108/F5-A |
| Aprovação por ferramenta, grants por sessão+workspace | `agir/server/rotas.ts:91-95` — ✅ D103/D104/D119 |
| Catálogo fechado de 7 ferramentas | `agir/server/ferramentas.ts` |
| `feature()`/tree-shaking do Bun **não se aplica** (somos Vite/React) | 🔎 H10 |

### 3.3 Como as referências resolvem

#### 3.3.1 OpenClaude — **dois mecanismos automáticos, ambos gated por aprovação** (E1)

**Mecanismo A — extração por modelo, em fork** (`services/extractMemories/extractMemories.ts`, já consolidado como R19 na Task 02): fork no fim do loop via `handleStopHooks`, `runForkedAgent` compartilhando prompt cache, tools restritas a leitura + escrita **dentro de memoryDir**.

Gate (`memdir/paths.ts`, `isExtractModeActive`):
```ts
export function isExtractModeActive(): boolean {
  if (!getFeatureValue_CACHED_MAY_BE_STALE('tengu_passport_quail', false)) return false   // ← default FALSE
  return !getIsNonInteractiveSession() || getFeatureValue_CACHED_MAY_BE_STALE('tengu_slate_thimble', false)
}
```
**Está atrás de feature flag com padrão `false`.** E o comentário avisa que o gate de feature **não pode** morar dentro do helper porque `feature()` só faz tree-shake quando usado diretamente numa condição `if`.

**Mecanismo B — extração determinística, sem modelo** (`memdir/autoExtractFacts.ts`, **novo nesta missão**, C-4):

```ts
export async function extractFactsIntoMemdir(content: string, memoryDir?: string): Promise<boolean> {
  const dir = memoryDir || getAutoMemPath()
  if (!dir) return false
  // "extractMemories() returns early when approval is required, so automatic fact extraction
  //  must not silently persist conversation content (paths, URLs, filenames, IPs, concepts)
  //  without the approval prompt."
  if (!isAutoMemoryEnabled() || isMemoryWriteApprovalRequired()) return false
  …
}
```

Os **10 extratores**, em ordem, todos por regex sobre o texto do turno:

| # | O que detecta | O que grava | Guarda específica |
|---|---|---|---|
| 1 | Variáveis de ambiente `KEY=VALUE` (com `export`, com aspas) | **só o nome**; `{ value: '[REDACTED]' }` | o valor **nunca** é gravado |
| 2 | Caminhos absolutos POSIX / unidade Windows / UNC | caminho com segmentos seguros | remove URLs antes; `isSensitivePath` (`/etc /proc /sys /dev /var /tmp /root /boot lost+found /mnt /media /run /srv`; `C:/windows`, `system volume information`, `recovery`; `.ssh .aws .docker .kube .gnupg .npmrc .netrc .pgpass .history`); descarta segmentos `looksLikeSecret`; ignora `node_modules`; exige `length > 8` |
| 3 | Versões (`v1.2.3`, `version 1.2`) | `{ semver }` | — |
| 4 | URLs/hostnames | **host** + `scrubUrlPath(url)` | `scrubUrlPath` mantém scheme+host sempre e **só** segmentos não-secretos; retorna `null` se todos forem opacos |
| 5 | IPv4 | IP + tags de contexto local (janela de ±80 caracteres: `database/db`→`role`, `prod`→`env`, `worker`→`role`) | valida octetos ≤ 255 |
| 6 | Símbolos em crase | conceito | `sanitizeMemoryIdentifier` + `!looksLikeSecret` + 2 < len < 60 |
| 7 | Termos técnicos (PascalCase, camelCase, hifenizados) | conceito | `looksLikeSecret`; stoplist **inglesa** (`The This That With From Here There`); `Set` de deduplicação |
| 8 | Tecnologias específicas | `Redux`, `React` | detecção por `includes` em minúsculas |
| 9 | Assinaturas de arquivo de projeto (`.xml .json .yaml .yml .gradle .toml .bazel`) | `{category:'configuration'}` | — |
| 10 | **Regras de projeto passivas** — *"Always use pnpm", "Never commit secrets", "Prefer SQLite WAL"* | a diretiva como fato durável, *"so they are injected into later prompts"* | 3 padrões (`always/must/should use\|implement\|follow`; `never/cannot/should not`; `prefer`); 4 < len < 200; `containsMemoryRedaction`; `sanitizeMemoryIdentifier`; **e** `looksLikeSecret` por token — *"reject rules containing token-shaped substrings"* para que *"Always use sk-ant-…"* não persista um token |

Mecânica de controle, toda E1:

- **Limites**: `MAX_FACTS_PER_CALL = 20`; por tipo, `concept`/`rule` → **10**, demais → **5**.
- **Deduplicação**: nome de arquivo `fact-<tipo>-<slugify(nome)>-<djb2hash6(nome)>.md`; e antes de gravar compara `stableFactContent(existente) === stableFactContent(novo)`, onde `stableFactContent` **remove a linha `detectedAt`** — *"Skip rewriting when the stable fact content is identical, ignoring the volatile detectedAt timestamp, so repeated turns do not trigger unnecessary `rebuildIndex()` calls (P1)."* → **é assim que duplicação é evitada: identidade estável por nome + comparação de conteúdo sem o timestamp volátil.**
- **Fronteira final de segurança**: `writeFactMemory` comenta — *"Treat this as the **final security boundary**, not merely a formatter. Every extractor above operates on **untrusted conversation text**, and future extractors must not be able to persist a credential by omitting a local heuristic."* Nome → `sanitizeMemoryIdentifier` (nulo ⇒ descarta o fato inteiro); descrição → `sanitizeMemoryText` (`wholeSecret` ⇒ descarta); cada atributo, chave e valor, idem.
- **Formato gravado**: frontmatter YAML `type: reference`, `title`, `description`, `factType`, `detectedAt`, `attributes:` opcional; corpo `Auto-detected fact: **<nome>**` + descrição + `**Details:**`.
- **Falha nunca é fatal**: `ensureFactsDir` retorna `null` em erro de permissão — *"Memory directory may be read-only / permission-denied. Writes must degrade non-fatally; the surrounding callers (`query.ts`) run this on every turn and **must not throw before the model request starts**."* Falha de escrita ⇒ continua sem aquele fato.
- **Ordem de higienização**: primeiro redige valores de env (`NAME=[REDACTED]`) para que os extratores seguintes não os reaproveitem como conceitos; depois `sanitizeMemoryText` completo sobre o resto.

**Custo documentado de desligar** (`isAutoMemoryEnabled`, comentário sobre sessões não-interativas `-p`): *"default off to skip the **~3.2k-token memory protocol section**, the per-request arc/RAG system-prompt append (**which busts the prompt cache**), and turn-end extraction forks."* → **número concreto: ~3.200 tokens de system prompt por request, mais quebra de cache de prompt.**

**Direção segura dos gates** (`paths.ts`): `isAutoMemoryEnabled()` padrão **ON**, mas *"a single `false` in any source wins, so a parent-scope opt-out cannot be re-enabled by a narrower scope (#1326)"*. E `isMemoryWriteApprovalRequired()` (`utils/governancePolicy.ts`) padrão **exigir aprovação**, onde `true` em qualquer fonte vence. → **Opt-out: `false` vence. Aprovação de escrita: `true` vence.** A direção é invertida conforme o risco.

#### 3.3.2 Política do que **não** salvar — e o gate mesmo sob pedido explícito (E1/E2)

`memdir/memoryTypes.ts`, cabeçalho: *"Memories are constrained to four types capturing context **NOT derivable from the current project state**. Code patterns, architecture, git history, and file structure are derivable (via grep/git/CLAUDE.md) and **should NOT be saved as memories**."*

Estrutura por tipo (já consolidada como R11/R12 na Task 02; aqui o detalhe novo que importa para DP-02):

- `feedback` — `<body_structure>`: *"Lead with the rule itself, then a **Why:** line (the reason the user gave — often a past incident or strong preference) and a **How to apply:** line. Knowing *why* lets you judge edge cases instead of blindly following the rule."*
- **Registrar sucesso, não só correção**: *"Record from failure AND success: if you only save corrections, you will avoid past mistakes but **drift away from approaches the user has already validated, and may grow overly cautious**. … Corrections are easy to notice; **confirmations are quieter — watch for them**."*
- **Conflito entre escopos**: *"Before saving a private feedback memory, **check that it doesn't contradict a team feedback memory** — if it does, either don't save it or **note the override explicitly**."*
- **Datas relativas → absolutas**: *"Always convert relative dates in user messages to absolute dates when saving (e.g., 'Thursday' → '2026-03-05'), so the memory **remains interpretable after time passes**."*
- `parseMemoryType`: valor inválido ou ausente → `undefined`; *"legacy files without a `type:` field keep working, files with unknown types **degrade gracefully**."*

#### 3.3.3 As outras três referências

| Projeto | Extração automática? | Evidência |
|---|---|---|
| **VS Code / Copilot** | **Não localizada.** A memória é **curada por ferramenta** (o agente abre/edita arquivos com confirmação). O único serviço de memória encontrado é o de **limpeça** (`memoryCleanupService.ts`) | E1 para a limpeza; **E5** para o MemoryTool (não está neste repositório — §0.3) |
| **OpenCode** | **Não tem** memória persistente de fatos. Tem `compaction` (resumo de sessão), que **não é** memória | E1 (árvore completa auditada: nenhum módulo de memória) |
| **DeepSeek Harness** | **Não tem** memória própria. Terceiriza para **MCP de memória, default-off** (`docs/user/guide/mcp-memory.md`, já consolidado como R25 na Task 02) | E2 |

#### 3.3.4 ⚠️ Portabilidade para PT-BR — verificação que fiz no código e que **desaconselha cópia**

O dono dita por voz e o corpus é português. Os extratores do OpenClaude são **anglocêntricos de forma verificável**:

| Trecho (E1) | Efeito em português |
|---|---|
| `slugify`: `.toLowerCase().replace(/[^a-z0-9]+/g,'-')` | `configuração` → `configura-o`; `sessão` → `sess-o`. **Acentos viram ruído no nome de arquivo e no hash de deduplicação** |
| `looksLikeSecret`: `if (s.length >= 12 && /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(s)) return true` | palavras compostas hifenizadas comuns — `configuracao-de-sistema`, `banco-de-dados-local` (20 chars) — **casam** e são **descartadas como segredo** |
| extrator 7: stoplist `['The','This','That','With','From','Here','There']` | nenhuma palavra portuguesa filtrada; artigos e preposições PT viram "conceitos técnicos" |
| extrator 10: `(?:always\|must\|should)\s+(?:use\|implement\|follow)`, `(?:never\|cannot\|should\s+not)`, `(?:prefer)` | **"sempre use", "nunca faça", "prefira" não são detectados.** O extrator de regras de projeto — o mais valioso dos dez — **não dispara em português** |
| `ARC_KEYWORDS` (`conversationArc.ts`): `init/exploring/implementing/reviewing/completed` com palavras inglesas | detecção de fase da conversa **não funciona** em PT |

**Conclusão E1:** copiar o extrator determinístico para um produto PT-BR produziria uma memória **silenciosamente incompleta** — os fatos mais úteis (regras de projeto, conceitos hifenizados, nomes acentuados) seriam perdidos ou corrompidos, sem erro visível. **Se um dia quisermos extração determinística, ela precisa ser re-escrita para o nosso idioma, não traduzida.**

### 3.4 Alternativas

| # | Alternativa | Custo | Complexidade | Segurança | Colide com "Agent Loop único"? |
|---|---|---|---|---|---|
| **B1** | **Nada automático.** Só o dono manda guardar (ação de UI ou comando), com aprovação | zero de modelo; ~0 tokens de protocolo | **mínima** | **melhor** — nada vira durável sem revisão | **não** |
| **B2** | Extração determinística (estilo `autoExtractFacts`) a cada turno | zero de modelo; mas exige re-escrita PT-BR | média (10 extratores + dedup + sanitização + limites) | boa se a fronteira final de segurança for respeitada | **não** — é função pura sobre o conteúdo do turno, **não é um loop de agente** |
| **B3** | Extração por modelo em fork no fim do turno (estilo `extractMemories`) | 1 chamada extra por turno + **~3,2k tokens de protocolo** + quebra de prompt cache | **alta** (fork, cache, tools restritas, supervisão, telemetria) | exige tools restritas + aprovação por padrão + sanitização | **🔴 SIM** — é um segundo loop de agente |
| **B4** | Automático sem aprovação | — | — | **inaceitável**: viola `docs/02 §1.4` (*"aprovação humana para gravar memória persistente de projeto"*) | — |
| **B5** | Terceirizar para MCP de memória (estilo DSH) | processo filho + runtime adicional | alta | superfície nova (IPC, credenciais) | não, mas viola D105 (local-only) na prática e é *"um prédio"* para um MVP |

### 3.5 Recomendação fundamentada

**Recomendo B1 no primeiro corte, com B2 registrada como evolução possível e B3 explicitamente adiada.**

**Por quê B1:**
1. **É o que a maioria das referências faz.** Três das quatro (VS Code curada, OpenCode nenhuma, DSH terceirizada e default-off). A única que faz extração automática (OpenClaude) a mantém **atrás de feature flag com padrão `false`** (`isExtractModeActive`) **e** subordinada a `isMemoryWriteApprovalRequired()` — ou seja, mesmo lá, quando a aprovação é exigida, **nada é gravado automaticamente**.
2. **É o que a nossa documentação já decidiu.** `docs/02 §1.4`: *"aprovação humana para gravar memória persistente de projeto"*. B4 viola; B3 só satisfaz se o fork inteiro passar por aprovação, o que anula a vantagem de ser automático.
3. **Não colide com `docs/04 §1.5`.** B1 não cria loop nenhum.
4. **Custo zero num produto com 8 provedores heterogêneos**, incluindo Ollama local e pool LiteLLM. 🔎 H3 (custo/latência de chamada auxiliar) **não está medido**; B1 não depende dele.

**A distinção que peço que o dono considere — DP-02 deveria ser dividida em duas:**

| | DP-02a — extração por **modelo** (B3) | DP-02b — extração **determinística** (B2) |
|---|---|---|
| Colide com "Agent Loop único"? | **🔴 Sim** — é um segundo agente | **Não** — é função pura sobre o texto do turno |
| Custo por turno | 1 chamada de modelo + ~3,2k tokens de protocolo + quebra de cache | CPU local, desprezível |
| Depende de credencial/🔎H3 | **Sim** | Não |
| Precisa de aprovação de escrita? | Sim (e isso anula o ganho) | O OpenClaude exige **a mesma** aprovação |
| Portável para PT-BR sem re-escrita? | Parcialmente (o modelo entende PT) | **Não** (§3.3.4) |
| Precedente | OpenClaude, flag-gated `false` | OpenClaude, on-every-turn, gated por aprovação |

**Tratar as duas como uma decisão só é o que tornou DP-02 difícil.** Elas têm respostas diferentes. Minha recomendação: **DP-02a = adiar** (colide com regra arquitetural nossa); **DP-02b = possível mais tarde**, mas só com extratores re-escritos para PT-BR e com o mesmo gate de aprovação.

**Se B2 for adotada um dia, cinco requisitos que a evidência mostra como não-negociáveis:**
1. **Fronteira final de segurança na escrita**, não em cada extrator (padrão `writeFactMemory`).
2. **Teto por chamada e por tipo** (20 / 10 / 5 no OpenClaude) — sem teto, um turno verboso enche a memória.
3. **Deduplicação por identidade estável + comparação de conteúdo ignorando timestamp volátil** — senão cada turno re-grava e re-indexa.
4. **Valor de segredo nunca gravado, nem redigido: o fato de existir é gravado, o valor não** (extrator 1: `{value:'[REDACTED]'}`).
5. **Falha de escrita nunca derruba o turno** (degrada e continua).

### 3.6 Riscos e dependências

| Risco | Severidade | Nota |
|---|---|---|
| Conteúdo de conversa vira dado durável sem revisão | **Alta** | B1 elimina; B2/B3 exigem aprovação |
| Custo recorrente por turno (B3) | Alta se 🔎H3 confirmar | ~3,2k tokens de protocolo + quebra de prompt cache são números do OpenClaude, **não** medidos nos nossos provedores |
| Memória inútil acumula e polui a recuperação | Média | A política "não salvar o derivável" (R11) é o controle; sem ela, automático produz ruído |
| Extração silenciosamente incompleta em PT-BR (B2) | **Alta e invisível** | §3.3.4 — não gera erro, gera ausência |
| Colisão com "Agent Loop único" (B3) | Alta | `docs/04 §1.5` |
| 🔎 H8 — prompt injection via memória | Alta | Nunca reproduzido por nós; só em fixture |

**Dependências:** M5 (loja) precisa existir antes de qualquer extração. DP-01 não bloqueia B1 se a memória for explicitamente escopada pelo dono na UI.

### 3.7 Impacto nas Fatias M1–M8

- **M5**: B1 significa que M5 entrega **CRUD + política de admissão + sanitização + aprovação**, sem fork, sem extratores, sem telemetria de forma de memória. **Reduz M5 substancialmente.**
- **M6**: inalterado — recuperação é ortogonal à origem da memória.
- **M1**: B1 não acrescenta tokens de protocolo. B3 acrescentaria ~3,2k por request, o que **precisaria** aparecer no medidor.
- **M3**: o resumo de compactação **não é** memória e não deve virar memória (a política do OpenClaude exclui explicitamente *"detalhes efêmeros de tarefa"*). B1 mantém essa fronteira nítida.
- **M8**: sem extração automática, a suíte de segredos (R17/R18) fica menor; com extração, ela vira o teste mais importante do conjunto.

### 3.8 O que ainda exige aprovação humana

1. **B1 vs B2 vs B3** — a escolha.
2. **Se DP-02 deve ser dividida em DP-02a (modelo) e DP-02b (determinística).** Recomendo dividir.
3. Se, em B1, gravar memória conta como **leitura ou escrita** para efeito de modo (Perguntar/Planejar são read-only — ✅ D108). **E4:** gravar é escrita, logo **não** deveria funcionar em Perguntar/Planejar; mas o dono pode querer "lembrar disto" disponível em qualquer modo. Precisa decidir.
4. Se aprovação de escrita de memória segue o padrão "verdadeiro vence" (OpenClaude) ou é sempre explícita por registro.

---

## §4 — DP-03 · Armazenamento de resultados grandes de ferramentas

### 4.1 O problema no Agente Window

Precisamos fechar o contrato de **M2** (o que o transcript guarda). Três respostas possíveis — guardar tudo, guardar referência, guardar truncado — têm consequências opostas em quatro eixos: fidelidade de replay, tamanho em disco, tokens no próximo request, e **para onde o conteúdo vai**.

**O agravante que o dono apontou e que é real:** a ferramenta `ler` lê um arquivo **do workspace do dono**. Se gravarmos o resultado em `~/.agente_window/projects/<slug>/…`, estamos **copiando conteúdo do projeto para fora do projeto** — para um lugar que não tem a proteção do próprio repositório (`.gitignore`, permissões do repo, revisão do dono), que sobrevive à exclusão do arquivo original, e que pode conter segredo que estava apenas no arquivo lido. Risco **R-2** da Task 02.

### 4.2 Como funciona hoje (E1)

- `FerramentaNoChat` (`types.ts:12-28`) tem `resumo?` — **um resumo**, não o conteúdo.
- `EventoAgir.tool_result` (`agir/contract.ts:108`) trafega `{ id, ferramenta, ok, resumo }`.
- `MensagemAgir` (`agir/contract.ts:72-81`) é fiel, mas **volátil**.
- **Nada de grande é persistido hoje.** Ou seja: **o problema ainda não existe** — ele nasce com M2. Isto é uma vantagem: podemos escolher antes de ter dado para migrar.
- `excluir` vai para lixeira (✅ D97); `executar` é one-shot e captura stdout/stderr (✅ D126) — **a saída de terminal não tem outra cópia durável em lugar nenhum.**

### 4.3 Como as referências resolvem

#### 4.3.1 DeepSeek Harness — **dois mecanismos separados, com uma regra em comum** (E1 + E2)

**Regra em comum: o log guarda o original inteiro; o que é reduzido é a projeção voltada ao modelo.**

**Mecanismo 1 — *tool-result pruner*** (`packages/compaction/compaction-tool-result-pruner/README.md`, E2; `src/config.ts`, E1):

> *"Once a compaction trigger qualifies, it replaces over-budget text with a bounded head, a short 'middle pruned' marker, and a bounded tail; below-pressure conversations remain unchanged. **The complete original result remains in the session log for exact replay and inspection.** **Trimming makes no model call** and may relieve enough token pressure to **skip summarization**. Character budgets only approximate token use; **the token meter determines whether pressure was relieved**."*

| Parâmetro | Padrão | Significado |
|---|---|---|
| `thresholdChars` | **8192** | corta quando o texto combinado excede isso (pontos de código Unicode) |
| `headChars` | **4096** | pontos de código iniciais mantidos |
| `tailChars` | **1024** | pontos de código finais mantidos |

- *"Character counts are Unicode code points, so slicing **never splits an emoji pair**, though a multi-character grapheme can still be cut."*
- **Invariante de convergência**: head + marcador + tail devem caber dentro do threshold → *"a valid configuration trims every over-budget result **without growth or repeated rewriting**"*.
- *"The replacement keeps the tool call, step, errors, and metadata — **only the text content changes**."*
- *"If a replacement cannot be recorded, **the run fails and the trims already applied stay in place**."*
- **Só roda quando um gatilho de compactação qualifica** — depois de pressão/overflow confirmados, antes de selecionar o que condensar. Abaixo de pressão, nada é cortado.
- Três compromissos de projeto (E2, literal): **convergência determinística em uma passada**; **substituição segura para replay** — *"The original event remains in the **append-only log**; the replacement cites it through `sourceEventSeqs`, so replay recovers the exact input"*; **protocolo de preço-sombra** — o evento `compaction/prune` precede imediatamente a substituição e precifica o intervalo exato através do medidor injetado, *"so pure consumers subtract it without per-node state"*.
- Ordem de montagem: `token-meter` → `tool-result-pruner` → `compaction-basic`.
- *"An unknown setting rejects the plugin at construction."*

**Mecanismo 2 — *spill*** (`.agents/notes/implemented/architecture/2026-07-08-tool-output-spill-files.md`, E2; `packages/spill/*`, E1):

Problema declarado: *"Tool outputs need bounded model-facing previews, but some oversized results are still useful later. A fetched page body or a verbose tool response should not consume the next model request in full, but the model should be able to inspect the complete formatted result later **with existing file-reading tools**."*

Três pacotes: `dsh-spill` (interface + vocabulário, **sem** implementação de armazenamento) · `dsh-spill-local` (backend local: armazenamento de arquivo privado e escopado por sessão) · `dsh-spill-policy` (plugin de política: envolve resultados finais de texto após o dispatch e substitui os excessivos por prévia retida + localizador).

```ts
interface SpillStore { saveText(input: SaveTextSpill): Promise<SpillRef> }
type SpillSource = { kind:'tool'; toolName:string; callId:ToolCallId; label:string }
                 | { kind:'session-reference'; sessionId:SessionId; label:string }
interface SaveTextSpill { owner:{ sessionId:SessionId }; source:SpillSource; suggestedName:string; content:string }
type SpillLocator = Branded<'SpillLocator'>
interface SpillRef { locator:SpillLocator; bytes:number; retrievalHint:string }
```

- **`SpillLocator` é um handle opaco, branded, voltado ao modelo.** *"The local backend renders it as a filesystem path; a remote or database backend can render a URI, key, or command token. Consumers treat it as **opaque** and render it with `retrievalHint` **instead of assuming `read` is always the right retrieval mechanism**."*
- **Caminho real**: `<root>/session-<hash>/<random>-<safeName>`, onde `root` é caminho configurado **ou um diretório temporário privado (0700) por processo, criado preguiçosamente**; o subdiretório de sessão é um prefixo curto de `sha256(sessionId)`; a folha é prefixo hex aleatório + `suggestedName` sanitizado para **um** segmento (mesmo `encodeSegment` do JSONL).
- **Escrita**: `open(path,'wx',0o600)` — *"exclusive and owner-only, **so a planted symlink cannot redirect it**."*
- **`owner.sessionId` é o namespace de armazenamento no momento da gravação**: *"forked sessions **inherit existing spill locators from the seeded log without copying or re-owning them**, and new spills after the fork use the child session id."*
- **`suggestedName` é dica, nunca caminho** (já era R4 na Task 02 — confirmado no código).
- **Três regras de segurança operacional**: orçamento omitido não instala listeners; **falha de recuperação mantém o resultado original**; e — importante — *"model-facing `read` results **skip retention** to avoid a read/spill loop"*.
- Imagens: `saveText()` grava o resultado completo com **caminhos legíveis** de imagem; *"image bytes remain in attachment storage"* → **binário não vai para o spill**.

**Retenção do spill** (`.agents/notes/archived/architecture/2026-07-17-local-spill-startup-cleanup.md`, E2):

Problema: *"The local spill backend never deleted the full tool results it wrote. … **Immediate deletion is wrong because persisted, resumed, and forked sessions may still reference a locator.**"*

- **Uma varredura best-effort na ativação.** Sem timer recorrente, sem processo separado. Pertence à fiber do plugin e é aguardada no disposal.
- `cleanupPeriodDays` padrão **30**; **`0` desliga**; validação de schema rejeita negativo ou fracionário no carregamento.
- Varre a raiz configurada/ativa **mais** raízes temporárias padrão `dsh-spill-*` anteriores encontradas no diretório temporário do SO; apaga **arquivos regulares** com `mtime` estritamente mais velho que `now − período`.
- Poda todo diretório de sessão vazio; remove a própria raiz **só** para raiz padrão anterior descoberta.
- **Alias de raiz deduplicado por identidade device/inode**, com a identidade configurada prevalecendo como ativa e não-podável.
- Usa **`lstat`, então um symlink nunca é seguido nem apagado**; entradas não relacionadas (diretórios que não sejam `session-`, arquivos especiais) são puladas.
- **Toda falha de sistema de arquivo é capturada e logada via `ctx.logger.warn`, e uma exceção no próprio sink de warning também é contida — a varredura nunca lança**, logo não pode reprovar a ativação nem uma gravação concorrente.
- **🔴 Restrição de segurança para apagamento por caminho**: *"restricted to directories an untrusted local OS user cannot replace during the scan. On POSIX, every root and session directory must be **owned by the current user and not writable by group or others**; the root's **ancestor path must also be non-writable or protected by a sticky directory such as `/tmp`**. Discovery rejects symlinks… An unsafe path is skipped with a warning. The same-user account remains the trust boundary."*
  → **⚠️ Isto é POSIX. Não há equivalente documentado para Windows**, que é o nosso ambiente de homologação. Se um dia fizermos faxina de derivado, **a checagem de segurança Windows precisa ser projetada, não portada**.
- Alternativas rejeitadas com motivo: timer periódico (ciclo de vida, controle de sobreposição, mais um botão); apagar no disposal da sessão (*"durable sessions, resumes, and forks retain locators"*); apagar diretórios de sessão velhos recursivamente (*"a concurrent process may create a fresh spill after the age check"* → expiração por arquivo preserva escritas novas); amarrar à exclusão de persistência de sessão (*"the persistence seam has no common deletion lifecycle"*).
- Consequência assumida: *"A long-lived process is not cleaned again until restart."*

**O que entra no log persistido** (`session-persistence-jsonl/tests/content-admission.spec.ts` + `retired-content-admission.spec.ts` + `native-source-admission.spec.ts`, E1 — nomes e existência confirmados; política já consolidada como R9 na Task 02): existe uma **política de admissão de conteúdo** testada por spec, com noção de conteúdo **"retired"**. Não re-derivei a lista aqui; R9 da Task 02 permanece válido.

#### 4.3.2 VS Code / Copilot — **filtrar na fronteira de saída**, e **índice derivado desligado por padrão** (E1)

**`secretFilter.ts`** — *"Filters secrets from event data **before sending to the cloud**. Patterns are sourced from the CLI's SecretFilter (which uses **GitHub Actions log redaction patterns**)."* `REDACTED = '******'`.

Duas camadas:
- **~25 padrões estáticos** por forma conhecida: JWT por prefixo (`eyJ0eXAiOi`, `eyJhbGciOi`, `eyJ4NXQiOi`, `eyJraWQiOi`), `Bearer …`, `Password=`/`Pwd=`, GitHub `gh[pousr]_[A-Za-z0-9]{36}`, `github_pat_…`, `v1.[0-9A-Fa-f]{40}`, **basic auth em URI** (`scheme://user:pass@`), senhas de cliente AAD (`…7Q~…`/`…8Q~…`), `npm_[0-9A-Za-z]{36}`, OpenAI `sk-…T3BlbkFJ…`, genéricos `api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token\s*[:=]\s*…{8,}`, AWS `AKIA[0-9A-Z]{16}`, chaves Azure de 64 e 32 bytes (com marcadores `APIM`/`ACDb`/`AIoT`), NuGet `oy2…`, **blocos de chave privada** (`-----BEGIN…PRIVATE KEY-----`), **connection strings com credencial embutida** (`mongodb(+srv)`, `postgres(ql)`, `mysql`, `redis`, `rediss`, `amqps`), **SAS do Azure** (`[?&]sig=…{20,}`), webhooks Slack/Discord, chaves de Azure Function Host (`…AzFu…`), URLs pré-assinadas GHCR (`x-ghcr-signature=`).
- **Segredos dinâmicos**: 16 nomes de variável de ambiente (`GITHUB_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AWS_SECRET_ACCESS_KEY`, `AZURE_CLIENT_SECRET`, `DOCKER_PASSWORD`, `NPM_TOKEN`, …) cujos **valores** são coletados em tempo de execução e armazenados **em forma plaintext E base64** — *"secrets may appear base64-encoded in logs/output"*. `addSecretValues(...)` permite registrar tokens obtidos depois da inicialização.

**`sessionIndexingPreference.ts`** — índice derivado **desligado por padrão** (`.agents/notes/archived/architecture/2026-08-13-session-content-search-opt-in.md` do DSH chega à mesma conclusão por outro caminho):
- `openAt: 'never'` é a **terceira fase de abertura** (`never` | `first-search` | `startup`).
- Com `never`: `searchSessions`/`searchEvents` falham com `SESSION_QUERY_SEARCH_DISABLED` **antes de qualquer normalização de pedido**; `node:sqlite` **nunca é importado nem aberto**; nenhuma observação/reconciliação de fonte roda. **Mas toda leitura exata, filtro e trace herdados continuam funcionando** (exportação de sessão, herança de workspace em fork, leitura de título).
- O código de erro entra na **taxonomia fechada** `SessionQueryErrorCode`, e a fronteira de ferramenta o traduz para a mensagem segura `session search is disabled in this deployment`.
- Ligar é **uma linha** de override de `openAt` numa camada de patch posterior.
- Alternativas rejeitadas: desmontar a linha do plugin (quebraria a injeção obrigatória `sessionQuery` e a API hospedeira inteira não carregaria); desabilitar nos consumidores — *"**enforcement belongs to the operation that makes the decision**; opt-in model tools or any other consumer would still reach the index"*; um booleano separado ao lado de `openAt` — *"the opening phase already owns when SQLite starts; `never` extends the same axis instead of adding **a second knob that can contradict it**"*.
- Consequência: *"Default deployments run **no derived index**: … **no derived database on disk**."* E a busca na barra lateral degrada para *"local title/workspace matching plus the content-search-unavailable notice"*.

**Robustez do banco derivado** (`chronicle/node/sessionStore.ts`): marcadores de corrupção (`malformed`, `file is not a database`, `not a database`, `disk image`, `disk i/o error`) ⇒ **apaga o banco + sidecars WAL/SHM e reabre uma vez**; em workspace remoto, **WAL é trocado por rollback journal + busy timeout maior**, porque *"WAL requires shared-memory (-shm) plus POSIX byte-range locking, neither of which network filesystems reliably provide"*. E: *"The store is populated **incrementally by live hooks — no background indexing**."*

#### 4.3.3 OpenCode — **escada de degradação do transcript** (E1)

`packages/core/src/session/compaction.ts`:
```ts
/** How far one exchange of a summary transcript is shortened, in the order the levels apply:
 *  whole; tool outputs cut; tool outputs left out and tool inputs cut; only the user's text, cut; omitted. */
const OUTPUTS_CLIPPED = 1, OUTPUTS_REMOVED = 2, USER_ONLY = 3, OMITTED = 4
const TRANSCRIPT_LEVELS = [0, OUTPUTS_CLIPPED, OUTPUTS_REMOVED, USER_ONLY, OMITTED]
const TRANSCRIPT_CLIP = 2_000        // caracteres mantidos do INÍCIO e do FIM de cada corte
const IMAGE_TOKEN_ESTIMATE = 1_500
const PDF_TOKEN_ESTIMATE  = 2_000
```
→ **A resposta do OpenCode a "resultado grande" não é armazenar fora: é degradar em níveis previsíveis, cortando cabeça+cauda a 2.000 caracteres, e só remover/omitir quando o nível anterior não bastou.**

#### 4.3.4 OpenClaude

Não localizei um mecanismo equivalente de *spill* (§4.5 registra isso como E5). O que existe é o **orçamento de recuperação**: 2.000 caracteres / 100 mensagens / 100 sessões em `agenticSessionSearch` (já consolidado como R14), e os buffers de 20k tokens em `autoCompact` (R20). **Orçamento de leitura, não política de armazenamento.**

#### 4.3.5 A armadilha de round-trip que ninguém procura (E2, DSH)

`.agents/notes/archived/architecture/2026-09-19-lossless-projection-checkpoint-json.md`:

> *"Projection checkpoints can contain opaque extension data and message metadata. **A JSON key named `__proto__` is ordinary recorded data.** The Zod JSON parser **drops that own key while rebuilding objects**, so reopening a valid checkpoint can yield **different projection state from replaying the Session log**."*
> Decisão: usar o predicado **somente-leitura** `isJsonValue` em vez de reconstruir. Alternativas rejeitadas: manter `z.json()` (*"Its object reconstruction removes valid own keys, so a successful validation can still change the checkpoint value"*) e validar-clonando com `snapshotJsonValue` (*"copies already immutable stored values"*).

**Tradução para nós:** se M2/M3 validarem JSON persistido com uma biblioteca que **reconstrói** objetos, um checkpoint pode **reabrir diferente do que o log produziria** — e nenhum teste de schema pega, porque a validação **passa**. É um defeito silencioso de fidelidade. **Requisito: a validação de conteúdo persistido deve ser somente-leitura, nunca reconstrutiva.**

### 4.4 Alternativas para o Agente Window

| # | Alternativa | Histórico original | Recuperação posterior | Disco | Tokens no request | **Conteúdo sai do workspace?** | Complexidade |
|---|---|---|---|---|---|---|---|
| **C1** | **Guardar tudo verbatim no JSONL** | ✔ íntegro | ✔ total | **cresce sem teto** | incontrolável sem M3 | **🔴 SIM, para todo resultado** | mínima |
| **C2** | **Truncar na escrita** | ✘ **perdido** | ✘ | pequeno | controlado | parcialmente | mínima |
| **C3** | **Spill** (DSH): conteúdo → arquivo privado + localizador opaco | ✔ íntegro (fora do log) | ✔ via `read`/`grep` | cresce, **com retenção** | controlado | **🔴 SIM** | **alta** (seam + backend + política + retenção + faxina + segurança de apagamento) |
| **C4** | **Log íntegro + projeção podada** (DSH pruner / OpenCode levels) | ✔ íntegro **no log** | ✔ total | cresce com o log | controlado pela projeção | 🔴 SIM, para todo resultado | média |
| **C5** | **C4 + distinção por origem do conteúdo** ← **recomendada** | ✔ íntegro | ✔ total | cresce **só** com o que não tem outra casa | controlado | **🟢 NÃO, para conteúdo do workspace** | média |

### 4.5 Recomendação fundamentada

**Recomendo C5: log íntegro + projeção podada, com uma distinção por origem que nenhuma referência enuncia explicitamente mas que segue diretamente das escolhas delas.**

**Regra 1 — O log guarda o original; a redução é sempre projeção.**
É o pressuposto comum dos dois mecanismos do DSH (*"The complete original result remains in the session log"*; *"The original event remains in the append-only log"*) e é o que torna M3 reversível. **Truncar na escrita (C2) é a única opção que destrói informação, e por isso deve ser descartada.** Consequência para nós: M2 **não** trunca; M3 **projeta**.

**Regra 2 — Distinguir conteúdo que já tem casa durável de conteúdo que não tem.**

| Ferramenta | O conteúdo já existe em outro lugar durável? | O que persistir |
|---|---|---|
| `ler`, `buscar`, `listar` | **Sim** — é o arquivo do dono, no workspace | **localizador** `{ arquivo, intervalo, seq }` + tamanho + digest opcional. **Não os bytes.** |
| `executar` (saída de terminal) | **Não** — ✅ D126: processo one-shot, saída capturada e descartada | **o conteúdo**, íntegro no log, com projeção podada |
| `criar`, `escrever`, `excluir` | Parcialmente — o efeito está no disco, o **diff/retorno** não | resultado/efeito, não o conteúdo integral do arquivo |
| resposta de modelo | Não | íntegra |

**Por que isto responde diretamente ao agravante do dono:** para `ler`/`buscar`/`listar`, gravar o conteúdo em `~/.agente_window` seria (a) duplicar dado que já está durável no workspace, (b) **mover conteúdo do projeto para fora da proteção do projeto**, (c) criar uma cópia que **fica obsoleta** assim que o arquivo muda (R-4), e (d) aumentar o disco sem ganho de recuperação — porque a recuperação pode simplesmente **reler o arquivo**, que é o que o modelo já sabe fazer. **O localizador recupera mais informação verdadeira do que a cópia.**

Isto é **E4 (inferência arquitetural)**, não E1: nenhuma referência enuncia essa regra. Mas ela é **coerente** com três escolhas verificadas: o DSH faz spill de `web_fetch` e de saída de bash (conteúdo **sem outra casa**) e faz *"model-facing `read` results skip retention"*; o OpenClaude grava em memória **caminhos** (`fact-path-…`) e não o conteúdo dos arquivos; e a política "não salvar o derivável" (R11) diz exatamente que conteúdo que pode ser re-obtido do estado atual **não** deve ser guardado.

**Regra 3 — Sem infraestrutura de spill no primeiro corte.**
C3 custa: seam + backend + política + retenção + faxina + segurança de apagamento + localizador opaco + hint de recuperação + tratamento de fork/herança. **Não temos necessidade medida**: P2 mostrou 235 KB / 200 mensagens salvando em p50 1,895 ms. 🔎 **H1** é quem decide. Recomendo: **teto de tamanho por evento com erro tipado**, e reavaliar C3 se H1 mostrar problema real. **Proporcionalidade é o critério que o dono pediu.**

**Regra 4 — Filtro de segredo na fronteira de escrita, com as duas camadas.**
As referências usam filosofias complementares, e as duas são necessárias:
- **padrões por forma conhecida** (VS Code, ~25 regex + 16 nomes de env com valor plaintext **e** base64) — alta precisão para o que é conhecido;
- **heurística por forma opaca** (OpenClaude R17/R18) — pega o desconhecido.
Regras que a evidência mostra como não-negociáveis: filtrar **antes** de persistir (não em scanner posterior); para **identificador**, **rejeitar o valor inteiro** em vez de redigir parcialmente (*"partial redaction is unsafe"*, R18); guardar o valor de env conhecido **nas duas formas** (plaintext e base64), porque segredo aparece base64-codificado em saída; e **nunca ecoar o valor** na mensagem de erro.

**Regra 5 — Round-trip sem reconstrução.**
Validar JSON persistido com predicado **somente-leitura**, nunca com parser que reconstrói objetos (DSH `lossless-projection-checkpoint-json`). Sem isso, `__proto__` como dado legítimo é silenciosamente perdido e o checkpoint reabre diferente do log.

**Regra 6 — Derivado desligado por padrão.**
Se M4 criar índice, seguir o padrão Chronicle/DSH: **`openAt: 'never'`** como padrão de produto, erro **tipado** (`busca_desabilitada`), enforcement **na operação que decide** (não no consumidor), e **não** criar um segundo botão que possa contradizer o primeiro. Consequência aceitável e desejável: *"no derived database on disk"* por padrão.

**Se um dia C3 for adotado, cinco requisitos herdados do DSH:**
`wx` + `0600` (escrita exclusiva, à prova de symlink) · diretório `0700` · localizador **opaco e branded** com `retrievalHint` (nunca assumir `read`) · `suggestedName` como **dica**, nunca caminho · resultado de `read` **pula** retenção (evita loop read/spill) · falha de recuperação **mantém o original** · retenção por **arquivo** (não por diretório), com `lstat`, varredura **uma vez na ativação**, e **nunca lança**.

### 4.6 Riscos e dependências

| Risco | Severidade | Mitigação |
|---|---|---|
| **R-2 — segredo persistido fora do workspace** | **Alta** | Regra 4 (duas camadas) + Regra 2 (não copiar conteúdo do workspace) |
| **R-6 — payload sem teto** | Média-alta | Regra 1 + M3; tetos do pruner (8192/4096/1024) e do OpenCode (clip 2000) como referência de ordem de grandeza |
| **Log cresce sem limite** | Média | 🔎 H1. DSH tem notas de `bounded-session-persistence-write-batching` e `zstandard-jsonl-session-logs` (compressão) — **ambas são evolução, não pré-requisito** |
| **Round-trip infiel silencioso** | Média, **invisível** | Regra 5 + teste de round-trip com chave `__proto__` legítima |
| **Faxina de derivado em Windows sem modelo de segurança** | Média | O DSH só especifica POSIX. Se fizermos faxina, **projetar** a checagem Windows, não portar |
| **Dois armazenamentos sem transação distribuída** (R-9) | Média | Herdado da Task 01; não piora com C5 (não adiciona armazém) |
| **Localizador aponta para arquivo que mudou/sumiu** | **Alta para R-4** | O localizador deve carregar `seq` + digest + tamanho; a leitura posterior **revalida** e reporta divergência em vez de fingir que é o mesmo conteúdo |

**Dependências:** 🔎 H1 (volume real do writer) decide se C5 basta ou se C3 vira necessário. ⏳ DP-01 afeta apenas **onde** o log fica, não **o que** guarda.

### 4.7 Impacto nas Fatias M1–M8

- **M2**: **fecha o contrato.** `EventoTranscript.payload` para `tool_result` passa a ser **união discriminada por origem**: `{tipo:'conteudo', texto}` para `executar`/modelo, `{tipo:'localizador', arquivo, intervalo, digest, bytes}` para `ler`/`buscar`/`listar`. Campo `visibilidade` (já proposto na Task 03) permanece.
- **M3**: herda a poda como **projeção**. Os números das referências dão ordem de grandeza: threshold 8192 / head 4096 / tail 1024 (DSH); clip 2000 cabeça+cauda com 5 níveis (OpenCode). **Nenhum deles é nosso** — precisam ser medidos no nosso corpus (🔎 H1/H2).
- **M4**: Regra 6 (derivado desligado por padrão). E o que indexar muda: indexar **localizador** não serve para busca de conteúdo; indexar o texto **visível** (R15) exige decidir se conteúdo de `ler` é "visível". ⏳ **Pergunta nova para o dono.**
- **M5/M6**: a sanitização (Regra 4) é **o mesmo mecanismo**; implementar uma vez.
- **M7**: `executar` é o caso crítico — saída one-shot sem outra cópia. Se o log não a guarda, a reconciliação pós-restart não tem o que mostrar.
- **M8**: a suíte de segredos (canários em tool result, memória, checkpoint, log, UI, proveniência) vem **inteira** da Regra 4.

### 4.8 O que ainda exige aprovação humana

1. **C1–C5.** Recomendo C5.
2. **Se conteúdo de `ler`/`buscar`/`listar` pode ser copiado para `~/.agente_window`.** Recomendo **não**. É a decisão central e é de privacidade, não de técnica.
3. **Tetos numéricos.** Os das referências são ordem de grandeza, não valores nossos.
4. **Se M4 indexa conteúdo de ferramenta** (e, se sim, o conteúdo real ou o localizador).
5. **Política de retenção do log** (hoje: nenhuma).
6. **Se aceitamos que o log cresça sem teto até 🔎 H1 medir**, ou se colocamos um teto com erro tipado desde já. Recomendo o teto.

---

## §5 — DP-04 · Organização das Fatias M1–M8 no planejamento

### 5.1 O problema como foi registrado — e por que ele **não** existe mais

A Task 02 registrou DP-04 como colisão entre duas numerações: a "posição hipotética 13…20" do pacote de 22/10 e a numeração oficial D95 (Fatias 07–20). Relendo `docs/06`, **a documentação canônica já resolveu isto antecipadamente e em termos explícitos** (C-2).

### 5.2 O que a documentação canônica já decide (E1 — documentos do próprio projeto)

| Trecho | Fonte | O que decide |
|---|---|---|
| *"Iniciativa de contexto M1–M4 — análise estática de dependências (D99, 2026-10-23; **não é roadmap numerado**)"* | `docs/06:547` | M1–M4 **não ocupam posição numerada** |
| *"**não há autorização para implementação, inserção entre fatias oficiais ou renumeração**"* | `docs/06:549` | Nem inserir, nem renumerar |
| *"M5–M8 mantêm os nomes/estudos prévios no `arquivo_morto` como **material histórico de apoio**: **não importar a numeração hipotética daquele estudo para Fatias 13–20**"* | `docs/06`, bloco D102 | **A colisão que apontei já está explicitamente proibida** |
| *"IDs antigos permanecem citáveis para rastreabilidade; **nada aqui cria Fatia 21 ou altera escopos 13–20**"* | `docs/06`, bloco D102 | Rastreabilidade sem renumeração |
| *"MICRO-FATIA PERF … (nova, D98 — **entre a 12 e a 13, sem renumerar**)"* · *"**Não renumera fatias.**"* | `docs/06:387,393` + D98 em `docs/05:127` | **Precedente do próprio projeto** para inserir trabalho sem tocar na numeração: usa-se um **nome** |
| *"FATIA 15 — … **era a 11** (pós-D95)"*, *"FATIA 16 — … **era a 12**"*, … , *"FATIA 20 — … **era a 16**"* | `docs/06:501-539` | **Convenção de rastreabilidade já em uso**: anotação "era a N" |
| *"**IC-01** … **IC-09**"* com *"ID rastreável / Responsabilidade delimitada / CAP / Dependência / Estado documental"* | `docs/06`, bloco D102 | **Registro de iniciativas não-fatia já existe**, com formato próprio |
| *"M1→M2→M3→M4 permanecem **planejamento posterior à 15**; … A recomendação de executar memória depois da 15 é **por estabilidade de contratos, não dependência funcional**"* | `docs/06:556` | Ordem de execução **já decidida** |
| *"**M8 não adia testes de segurança necessários já nas etapas anteriores**"* | `docs/06`, bloco D102 | **Confirma a recomendação S7 da Task 03** (gates por entrega) — já era decisão canônica |
| *"A lista de dependências acima é **hipótese de planejamento para crítica da Arena**, não bloqueio técnico demonstrado nem cronograma definitivo"* | `docs/06`, bloco D102 | A crítica que fizemos na Task 03 **era o esperado** |
| *"A especificação paralela M1/M2 sugerida em D102 foi **revogada por D109**"* | `docs/06:11` | Sem paralelismo M1/M2 |
| *"Registros históricos (05/07 antigos) mantêm os números da época; **o mapa vivo está aqui**"* | D95, `docs/05:124` | Como o projeto preserva rastreabilidade histórica: **não reescreve o passado, anota** |

### 5.3 Como as referências organizam trabalho não-numerado (E1/E2)

Isto é relevante porque DP-04 é, no fundo, "como nomear trabalho que não é fatia":

- **DeepSeek Harness** tem um **sistema de notas de arquitetura por status**, não por número: `.agents/notes/{implemented,archived,proposed,rejected}/{architecture,feature,bug-fix,simplification,testing}/AAAA-MM-DD-<slug>.md`, com `Status:` no cabeçalho e **link explícito de supersessão** (*"This note supersedes the global-capacity and no-model-policy parts of the [replay token meter service Agent Note]"*). Rastreabilidade por **data + slug + status + vínculo de substituição**, nunca por número de fatia.
- **OpenCode** rastreia por **issue/PR** no próprio código: *"Before #48058 (Sep 2026), summaries kept nearly everything…"*, *"anthropics/claude-code#24382"*, *"(#1326)"*.
- **VS Code** rastreia decisões por **nome de configuração + versão de schema** (`SCHEMA_VERSION = 3`, `chat.localIndex.enabled`, `chat.sessionSync.enabled` com *"enterprise policy"*).

**Nenhum dos quatro usa número sequencial de fatia.** Todos usam **identificador estável + status + vínculo de supersessão**. O nosso `docs/06` já faz isso com IC-01…IC-09 e com a anotação "era a N".

### 5.4 Alternativas

| # | Alternativa | Rastreabilidade | Risco |
|---|---|---|---|
| **D1** | **Manter como está**: iniciativa nomeada "M", sem número, com anotações | **✔ já funciona** | nenhum — só exige que a Task 03 **retire** a menção a "posição hipotética" |
| **D2** | Registrar M1–M8 no **formato IC** (ID rastreável / responsabilidade / CAP / dependência / estado documental) | ✔ e ancora nos CAP-08/09/10/16 | baixo; exige decidir o destino de cada um |
| **D3** | Numerar como Fatias 21–28 | ✘ **violaria** *"nada aqui cria Fatia 21"* | **alto** — reabriria D95 |
| **D4** | Adotar o sistema de notas do DSH (data + slug + status + supersessão) para a investigação | ✔ excelente para o **material de investigação** | nenhum, mas **não** substitui o roadmap |

### 5.5 Recomendação fundamentada

**Recomendo D1 + D2 + D4, e o arquivamento explícito da "posição hipotética".**

1. **Manter os rótulos M1–M8 como estão** — iniciativa nomeada, sem posição numérica. Já é decisão canônica (D99/D102); não há nada a decidir, só a **respeitar**.
2. **Retirar formalmente a expressão "posição hipotética 13…20"** do vocabulário da investigação. Ela está em material de `arquivo_morto` (que por definição é histórico e **não** deve ser reescrito); o lugar certo de registrar a retirada é **aqui** e no índice da pasta de investigação. `docs/06` já proíbe importá-la.
3. **Registrar M1–M8 no formato IC** (D2), com o mapeamento de CAP que a Task 03 propôs (M5≈CAP-08, M1+M3≈CAP-09, M4+M6≈CAP-10, M7≈CAP-16) — **como vínculo documental, não como declaração de cobertura**, porque ✅ `docs/08` proíbe marcar CAP homologada por inferência.
4. **Adotar, para o material de investigação, o padrão de notas do DSH** (D4): `Status:` no cabeçalho + vínculo explícito de supersessão. É o que já estou fazendo informalmente em §1 (C-1…C-6) e o que tornaria futuras revisões rastreáveis sem reescrever o passado.
5. **Preservar a ordem canônica sem alteração**: Gate D98 (concluído) → 13 → 14 → 15 → **iniciativa M (M1→M2→M3→M4; M5–M8 só planejamento)**. A Parte C.4 da Task 03 vale **dentro** da iniciativa M (C-3).

### 5.6 Riscos e dependências

| Risco | Severidade | Nota |
|---|---|---|
| Alguém ler "posição hipotética 13–20" no `arquivo_morto` e tratar como roadmap | **Média** | Mitigado por `docs/06` (proíbe importar) e por esta retirada formal |
| Task 03 ser lida como autorização de execução | **Média** | Mitigado por C-3 e pelos rótulos ⏳/🆕 |
| Perda de rastreabilidade se a investigação for reescrita | Baixa | D4 |
| **Perda do histórico Git** (R-15) impede verificar commits citados (`0dfe3c2`, `71c8de7`, `4f277db`, `29b1399`, …) | **Média-alta** | `docs/06:7` **já registra**: *"Estado Git oficial inacessível nesta cópia: sem remote, sem push."* Não é descoberta nova, mas continua sem solução |

### 5.7 Impacto nas Fatias M1–M8

Nenhum impacto **técnico**. O impacto é de **governança**: sem D1+D2, cada nova investigação corre o risco de reinventar uma numeração. Com D4, as seis correções de §1 ficam rastreáveis em vez de sobrescreverem o relatório anterior.

### 5.8 O que ainda exige aprovação humana

**Uma pergunta só, e ela é de organização documental:**

⏳ **Onde os contratos da Task 03 devem morar quando forem aprovados?** Três opções, todas compatíveis com a trava de 9 canônicos (`docs/01`):
- **(a)** nova subseção de `docs/06`, no formato IC — **não** cria canônico novo, mantém tudo num lugar;
- **(b)** SPEC separada por fatia, como as PARTES 2/2B/2E–2I de `docs/06` já fazem para Fatias 07/08/11–15 — coerente com o padrão existente de SPEC dentro de `docs/06`;
- **(c)** documento próprio fora dos canônicos, promovido a canônico só na entrega (D78: *"o restante dos canônicos vira arquivo morto"*).

**Recomendo (b)**, porque é o padrão que o projeto já usa para trabalho especificado e porque mantém `docs/06` como o único mapa vivo. **Mas é decisão do dono** — e note que qualquer uma das três **altera documentação canônica**, o que esta missão não está autorizada a fazer.

---

## §6 — DP-05 · Memória global do usuário versus memória de conversa e de projeto

### 6.1 O problema no Agente Window

O dono pediu os **três escopos**: conversa, projeto e usuário global. A Task 02 recomendou manter o global fora do primeiro corte (RD-10), com base na leitura de que **nenhuma referência de código tinha memória global**. **Essa premissa estava errada** (C-5). O dono foi explícito: *"Não descarte a memória global apenas por simplificação"* e *"Compare objetivamente sua implementação inicial com uma implementação posterior"*. Esta seção refaz a análise.

### 6.2 Como funciona hoje (E1)

Nada. Mas dois fatos do código atual **já** delimitam a resposta:
- O catálogo SQLite é **global** (`getDatabasePath()` → `~/.agente_window/agente_window.db`), enquanto os transcripts são **por projeto** (`~/.agente_window/projects/<slug>/`). **Já temos um armazenamento de dois níveis.**
- `Session.slug?` existe e é opcional (`types.ts:97`) → o contrato **já admite** uma sessão sem projeto.

### 6.3 Como as referências resolvem

#### 6.3.1 OpenClaude — **três escopos compartilhando uma infraestrutura** (E1, o achado central)

`src/tools/AgentTool/agentMemory.ts`:
```ts
// Persistent agent memory scope: 'user' (~/.openclaude/agent-memory/),
// 'project' (.openclaude/agent-memory/), or 'local' (.openclaude/agent-memory-local/)
export type AgentMemoryScope = 'user' | 'project' | 'local'

export function getAgentMemoryDir(agentType: string, scope: AgentMemoryScope): string {
  const dirName = sanitizeAgentTypeForPath(agentType)      // ':' → '-'  (inválido no Windows;
  switch (scope) {                                          //  usado em tipos namespaced "plugin:agent")
    case 'project': return join(getCwd(), '.openclaude', 'agent-memory', dirName) + sep
    case 'local':   return getLocalAgentMemoryDir(dirName)
    case 'user':    return join(getMemoryBaseDir(), 'agent-memory', dirName) + sep
  }
}
export function getAgentMemoryEntrypoint(agentType, scope) {
  return join(getAgentMemoryDir(agentType, scope), 'MEMORY.md')
}
export function getMemoryScopeDisplay(memory) {
  case 'user':    return `User (${join(getMemoryBaseDir(), 'agent-memory')}/)`
  case 'project': return 'Project (.openclaude/agent-memory/)'
  case 'local':   return `Local (${getLocalAgentMemoryDir('...')})`
  default:        return 'None'
}
```

**O que isto prova, e é exatamente a pergunta do dono:**

1. **O escopo global existe e mora FORA de `projects/`** — `<memoryBase>/agent-memory/<tipo>/`, enquanto o de projeto mora em `<cwd>/.openclaude/agent-memory/<tipo>/`.
2. **Compartilha TODA a infraestrutura.** Os três escopos usam o mesmo `MEMORY.md` como entrypoint, o mesmo `buildMemoryPrompt`/`ensureMemoryDirExists` (importados de `memdir/memdir.js`), o mesmo `sanitizeAgentTypeForPath`, e a **mesma** função de guarda `isAgentMemoryPath()` que verifica os três. **A única coisa que muda é o diretório base.** → **Resposta direta: sim, a memória global pode compartilhar a infraestrutura da memória de projeto, e o custo marginal é um valor de enumeração e um caminho base.**
3. **O escopo `project` fica DENTRO do workspace do dono** (`.openclaude/agent-memory/`) — ou seja, **versionável e compartilhável via repositório** — enquanto o `local` fica dentro do workspace mas **explicitamente não versionado** (`agent-memory-local`), e o `user` fica **fora**. **Três escolhas deliberadas de visibilidade, não três implementações.**
4. **Redirecionamento remoto**: com `CLAUDE_CODE_REMOTE_MEMORY_DIR`, o escopo `local` é redirecionado para `<mount>/projects/<sanitized-git-root>/agent-memory-local/<dir>` — **com namespace de projeto no mount**. O escopo `project` é *"always cwd-based (**not redirected**)"*. Comentário explícito no código.

**Além desse sistema, o OpenClaude tem um segundo, `memdir`**, com sub-escopos próprios — e é aqui que a **memória de conversa** aparece:

| Escopo/sub-escopo | Caminho | Natureza |
|---|---|---|
| Projeto (privado, por máquina) | `<base>/projects/<raiz-git-canônica>/memory/` | `MEMORY.md` + arquivos de tópico |
| **Equipe** (compartilhado) | `…/memory/team/MEMORY.md` | `getTeamMemPath() = join(getAutoMemPath(),'team')` — **aninhado dentro do projeto** |
| **Conversa** (arco) | `…/memory/.arc.json` | *sidecar*: `goals[]`, `decisions[]`, `milestones[]`, `currentPhase` (`init/exploring/implementing/reviewing/completed`) — `utils/conversationArc.ts` |
| **Fatos automáticos** | `…/memory/.facts/fact-<tipo>-<slug>-<hash>.md` | extração determinística (§3.3.1) |
| Log diário | `…/memory/logs/<yyyy>/<mm>/<yyyy-mm-dd>.md` | modo assistente (`feature('KAIROS')`) |
| **Usuário/global** | `<base>/agent-memory/<tipo>/` | sistema `agent-memory` |

**Escopo como dimensão da taxonomia, não como diretório** (`memdir/memoryTypes.ts`, E1): os quatro tipos declaram `<scope>`:

| Tipo | `<scope>` declarado |
|---|---|
| `user` | **`always private`** |
| `feedback` | *"default to private. Save as team **only when** the guidance is clearly a project-wide convention that every contributor should follow (e.g., a testing policy, a build invariant), **not a personal style preference**."* |
| `project` | *"private or team, but **strongly bias toward team**"* |
| `reference` | **`usually team`** — *"pointers to where information can be found in external systems"* (ex.: bugs no Linear "INGEST", dashboard Grafana de oncall) |

E duas regras de **convivência entre escopos**:
- **Conflito**: *"Before saving a private feedback memory, **check that it doesn't contradict a team feedback memory** — if it does, either don't save it or **note the override explicitly**."*
- **Duplicação deliberada de texto de prompt**: *"The two `TYPES_SECTION_*` exports below are **intentionally duplicated** rather than generated from a shared spec — keeping them flat makes per-mode edits trivial without reasoning through a helper's conditional rendering."* → duplicam **texto de prompt por modo** (COMBINED = privado+equipe), **não** a taxonomia. **Isto corrige parcialmente RD-6/R-14 da Task 02**: o que eu apontei como "duas taxonomias convivendo" (`memdir/memoryTypes.ts` × `utils/memory/types.ts`) continua sendo dois arquivos, mas a duplicação **intencional e documentada** é de seções de prompt, não de tipos. A duplicação de tipos permanece como risco (E1: dois arquivos existem), porém o projeto **documenta** a razão de uma delas.

#### 6.3.2 VS Code / Copilot — **dois roots do extension host, retenção só no de workspace** (E1)

`extensions/copilot/src/extension/tools/common/memoryCleanupService.ts`:
```ts
const RETENTION_PERIOD_MS = 14 * 24 * 60 * 60 * 1000     // 14 dias
const MEMORY_BASE_DIR = 'memory-tool/memories'
this.baseStorageUri       = URI.joinPath(extensionContext.storageUri,       MEMORY_BASE_DIR)  // workspace
this.globalBaseStorageUri = URI.joinPath(extensionContext.globalStorageUri, MEMORY_BASE_DIR)  // global/usuário
```
- **Os dois escopos são o MESMO caminho relativo sob dois roots diferentes** — exatamente o padrão OpenClaude. **Escopo = prefixo, não subsistema.**
- **A limpeza de 14 dias roda SÓ sobre o root de workspace**: `cleanupStaleResources()` retorna imediatamente se `!this.baseStorageUri` e só itera `this.baseStorageUri`. **O root global nunca é limpo automaticamente.** → **memória de workspace é tratada como efêmera/cache; memória global é tratada como durável/curada.**
- Dentro do root de workspace há **diretórios por sessão** e um subdiretório **`repo`** que é **excluído** da limpeza: *"Read all session directories (**exclude 'repo' which is managed separately**)"* → **três tiers: sessão, repositório, global**, com políticas diferentes.
- **Tempo de acesso**: `ResourceMap<number>` em memória primeiro; **fallback para `mtime` do arquivo**; se o `stat` falhar → *"assume it's stale"* → **apaga**. **Falha pende para apagar.**
- Roda **uma vez na inicialização, em background**, com erro apenas logado como `warn`.
- Diretórios de sessão que ficarem vazios são removidos em seguida.
- `isMemoryUri` compara caminhos **em minúsculas** (case-insensitive).

#### 6.3.3 OpenCode — **um ID de projeto literalmente chamado `global`** (E1)

`packages/schema/src/project-id.ts`:
```ts
export const ProjectID = Schema.String.pipe(
  Schema.brand("Project.ID"),
  statics((schema) => ({ global: schema.make("global") })),
)
```
E em `project.ts`: `id ?? ID.global` nos três ramos de descoberta, e `sweep()` com `ne(ProjectTable.id, ID.global)` → **o projeto global existe, é o fallback quando nada resolve, e é isento de arquivamento.** Não é memória de usuário, mas é **precedente de um escopo "sem projeto" de primeira classe no mesmo modelo de dados**.

#### 6.3.4 DeepSeek Harness (E2)

Sem memória própria. Terceiriza para MCP de memória, **default-off**. Tem o bucket `_no-cwd` para sessões sem `cwd` — o análogo estrutural de "sem projeto".

#### 6.3.5 Meta AI (E3 — **grau baixo, só governança de produto**)

Já consolidado na Task 02 §3.5: memória global **opt-in**, dashboard para ver/editar/apagar, **restrita a conversas 1:1** para evitar *spillover* em grupos. Contra-exemplo documentado: dossiês atualizados a cada hora inclusive de não-usuários, inferência de objetivos não declarados, e *"after you delete something, Muse may still remember information it learned from what you deleted"*. **Uso aqui: apenas como lista de requisitos de governança, nunca como base de mecanismo.**

### 6.4 Comparação objetiva: implementar global **desde o início** versus **depois**

Esta é a comparação que o dono pediu explicitamente.

| Dimensão | **Global desde o início** | **Global depois** |
|---|---|---|
| **Custo de contrato** | **Baixíssimo** se o contrato já for parameterizado por escopo: `{tipo:'usuario'}` além de `{tipo:'projeto', projetoId}`. É o que OpenClaude e VS Code fazem — **um `switch` de caminho base** | **Alto** se o contrato for escrito assumindo projeto: vira refatoração de toda a porta, do manifesto, do índice e da UI |
| **Custo de armazenamento** | Um diretório base a mais (`~/.agente_window/memory/`) | Idem, quando chegar a hora |
| **Custo de UX** | **Alto agora**: precisa de tela para ver/editar/apagar **dois** escopos, indicação de escopo em cada registro, e decisão de conflito entre eles — **antes de existir conteúdo para validar o desenho** | Baixo: a UX é desenhada quando já há memória de projeto real para comparar |
| **Superfície de segurança** | **Alta agora**: vazamento cross-project (R-1), cascata de exclusão entre escopos (H9/R-3), sanitização em dois roots, e o precedente Meta (inferência indevida) | Idêntica, mas **adiada** — e testável contra um corpus real |
| **Testabilidade** | **Fraca**: não há como testar isolamento global sem memória de projeto funcionando; os testes seriam sobre estrutura vazia | **Forte**: testa-se global contra projeto já populado, com canários reais |
| **Dependência de DP-01** | **Não depende** — e isso é uma vantagem real: o escopo global é justamente o que **não** precisa de identidade de projeto | — |
| **Risco de retrabalho** | Baixo se parameterizado; **alto se não** | Baixo se o contrato já for parameterizado |
| **Precedente** | OpenClaude (`'user'`), VS Code (`globalStorageUri`), OpenCode (`ID.global`) | VS Code: o global existe mas **não tem limpeza automática**, sugerindo maturação separada |

**Conclusão da comparação (E4):** o custo de **fazer depois** é quase inteiramente determinado por **uma decisão de contrato tomada agora**. Se `PortaMemoria` nascer parameterizada por escopo, implementar global depois é **aditivo**. Se nascer com `projetoId` obrigatório, é **refatoração**. **Portanto a recomendação não é "fazer global agora" nem "esquecer global" — é tornar o contrato pronto para global sem implementar global.**

### 6.5 Alternativas

| # | Alternativa | Avaliação |
|---|---|---|
| **E1** | **Global fora, contrato cego a escopo** | ✘ Pior dos dois mundos: sem global **e** com refatoração futura |
| **E2** | **Global implementado junto com M5** | ✘ Testabilidade fraca, UX prematura, superfície de segurança antes de haver conteúdo |
| **E3** | **Contrato parameterizado por escopo; só `projeto` implementado; `usuario` reservado e proibido por teste** | ✔ **Recomendada** — custo marginal ~zero agora, aditivo depois |
| **E4** | **Três lojas separadas** (conversa, projeto, usuário) | ✘ **Precedente negativo concreto**: o OpenClaude teve duas (`knowledgeGraph` + `memdir`) e **fundiu**, mantendo camada de compatibilidade (C-6) |
| **E5** | **Memória de conversa como loja própria** | ✘ Nós **já temos** isso: é o **checkpoint de M3** (estado do trabalho) + o **log de M2**. Criar uma quarta loja duplicaria. O `.arc.json` do OpenClaude (goals/decisions/milestones/phase) é **funcionalmente o nosso `SecoesResumo` de M3** |

### 6.6 Recomendação fundamentada

**Recomendo E3, com os três escopos preservados como requisito e uma regra anti-duplicação.**

**1. Os três níveis continuam requisitos — nenhum é descartado.**
- **Conversa** → **já existe como conceito**: é o `CheckpointContexto` de M3 (`SecoesResumo`: objetivo, requisitos, decisões, estado do trabalho {concluído/ativo/bloqueado}, próximo passo, arquivos relevantes, contexto importante). Corresponde 1:1 ao `ConversationArc` do OpenClaude (goals/decisions/milestones/phase). **Não criar loja nova.**
- **Projeto** → M5, em `~/.agente_window/projects/<chave>/memory/`.
- **Usuário global** → reservado em `~/.agente_window/memory/`, **contrato pronto, implementação adiada**.

**2. Escopo é um parâmetro, não um subsistema.**
```ts
export type EscopoMemoria =
  | { tipo: 'projeto'; projetoId: string }   // implementado em M5
  | { tipo: 'usuario' }                       // RESERVADO — implementação adiada (DP-05)
  // 'conversa' NÃO é escopo de memória: é o checkpoint de M3
```
Precedente verificado: OpenClaude (`switch(scope)` sobre três caminhos base, tudo o mais compartilhado) e VS Code (mesmo `MEMORY_BASE_DIR` sob `storageUri` e `globalStorageUri`).

**3. Proibir por teste, não por ausência.** Um teste que falha se qualquer caminho de código assumir um único root. É assim que "adiado" não vira "esquecido" — e é o que torna a implementação futura **aditiva**.

**4. Memória de conversa NÃO vira quarto armazenamento.**
Esta é a recomendação mais importante de §6, e resolve RD-6/R-14 de forma concreta: **conversa → M3 (checkpoint), projeto → M5, usuário → M5 com outro root.** Duas lojas, três escopos.

**5. Adotar as quatro regras de convivência entre escopos que o OpenClaude documenta:**
- **Conflito entre escopos deve ser detectado e resolvido explicitamente** (*"don't save it or note the override explicitly"*).
- **Datas relativas viram absolutas no momento da gravação** (*"Thursday" → "2026-03-05"*) — mecanismo concreto contra R-4 (memória obsoleta como verdade).
- **Tipos desconhecidos/ausentes degradam graciosamente**, nunca quebram (*"legacy files without a `type:` field keep working"*).
- **Registrar sucesso, não só correção** — *"if you only save corrections, you will … grow overly cautious"*.

**6. Se e quando o escopo global for implementado, cinco requisitos mínimos** (derivados de VS Code + Meta, E1/E3):
1. **Opt-in explícito**, não padrão. (Meta: opt-in. OpenClaude: `user` é `always private`.)
2. **Dashboard para ver, editar e apagar** cada registro, com indicação de escopo. (Meta Accounts Center; VS Code tem serviço de limpeza e detecção.)
3. **Cascata de exclusão real** — apagar a origem apaga o derivado. É exatamente onde o Meta falha de forma documentada (*"may still remember information it learned from what you deleted"*). 🔎 H9.
4. **Nenhuma inferência de objetivo não declarado.** É o comportamento criticado publicamente no dossê do Meta; para nós é também o maior risco de R-1.
5. **Decidir a retenção por escopo, e decidir que elas são diferentes.** VS Code: **14 dias para workspace, nenhuma limpeza automática para global**. Isto não é omissão, é uma posição: **o que é global é curado, o que é de projeto é efêmero.**

**7. Não fazer:** memória global **automática**; inferência de perfil; compartilhamento entre projetos sem ação explícita do dono; quarta loja; reescrita de `arquivo_morto`.

### 6.7 Riscos e dependências

| Risco | Severidade | Mitigação |
|---|---|---|
| **R-1 — prompt injection** via memória global (alcance maior que projeto) | **Alta** | Rótulo `historico_nao_confiavel` (M6) + nenhum disparo de ferramenta a partir de memória |
| **R-3 — derivado sobrevive à exclusão da fonte** | **Alta** | Cascata (requisito 3); 🔎 H9 |
| Vazamento cross-project | **Alta** | Escopo na **consulta e na autorização**, não só no filtro; canários em M8 |
| UX prematura | Média | E3 adia a UX, não o contrato |
| "Adiado" virar "esquecido" | Média | **Teste que proíbe** assumir root único |
| 🔎 H6/DP-01 | — | O escopo **global não depende de DP-01**; o de projeto depende. Outra razão para E3 |

### 6.8 Impacto nas Fatias M1–M8

- **M3**: **ganha** uma responsabilidade explícita — é a memória de **conversa**. Isto precisa constar do contrato para que ninguém crie uma quarta loja.
- **M5**: contrato parameterizado por `EscopoMemoria`; implementação só de `projeto`. **Custo adicional: um tipo e um teste.** Ganho: DP-05 deixa de bloquear o desenho.
- **M6**: `PedidoRecordar.escopo` já previa `{tipo:'chat_atual'} | {tipo:'projeto'}`; acrescentar `{tipo:'usuario'}` como **reservado e recusado** (`'escopo_nao_autorizado'`) até a implementação existir.
- **M8**: canário de isolamento precisa cobrir **três** roots (conversa/projeto/usuário) mesmo com o terceiro vazio — senão o teste não existe quando a implementação chegar.
- **M1/M2/M4/M7**: sem impacto.

### 6.9 O que ainda exige aprovação humana

1. **E1–E5.** Recomendo E3.
2. **Se memória de conversa é formalmente o checkpoint de M3** (recomendo sim) ou se o dono quer uma noção separada.
3. **Se o escopo global será opt-in** (recomendo sim).
4. **Retenção por escopo**: adotar a posição VS Code (projeto efêmero com retenção, global curado sem limpeza automática) ou outra.
5. **Se memória de projeto pode viver dentro do workspace** (padrão OpenClaude `project`/`local`, versionável) **ou só fora** (padrão `memdir`, privado). **Recomendo só fora** no primeiro corte: põe conteúdo do dono dentro do repositório é decisão de versionamento e de vazamento acidental em commit.
6. **Requisito 4 (nenhuma inferência de objetivo não declarado)** — vale como norma?

---

## §7 — DP-06 · Projeção e gerenciamento de contexto

### 7.1 O problema no Agente Window

Quem decide **o que entra no request** ao modelo? Hoje é o **browser**: `App.tsx:1678` monta o histórico, `App.tsx:2066` envia, `App.tsx:2170` remonta para regenerar. O servidor **recebe** pronto (`rotas.ts:189/229`), **remapeia com perda** (`rotas.ts:594` → `{papel, conteudo}`) e encaminha. Com M1 (orçamento), M2 (eventos fiéis), M3 (checkpoint) e M6 (recuperação), a montagem passa a depender de dados que **só o servidor tem**. Manter no browser exigiria enviar tudo isso ao browser — inclusive o que `chatAlvo.ts:3` declara que nunca deve ir: *"segredo nunca vai ao browser"*.

Há também um segundo problema, distinto: **quem é dono de cada fato sobre contexto** (limite da janela, medição, política de redução). Confundir os três produz o que o DSH enumera como alternativas rejeitadas.

### 7.2 Como funciona hoje (E1)

| Fato | Onde vive hoje | Avaliação |
|---|---|---|
| **Limite da janela** | `provedores/descritores/nativos.ts` → `padroes.contexto`; override por provedor em `providersRepo.ts:132-133,324` (`salvo.contexto ?? descritor.padraes.contexto`) | ✔ **já no lugar certo** (camada de provedor) |
| **Medição** | **nada** — `ChatInput.tsx:177` é fórmula sobre o rascunho (P10) | ✘ |
| **Montagem do request** | **browser** — `App.tsx:1678/2066/2170` | ✗ viola `docs/04 §1` regra 3 e `docs/01 §3.F` no limite |
| **Remapeamento** | servidor, **com perda** — `rotas.ts:594` | ✘ |
| **Histórico fiel** | servidor, **volátil** — `rotas.ts:158` `retomarPorFluxo` guarda `MensagemAgir[]` | ◐ **prova que o servidor consegue ser o dono** |
| **Teto de iterações** | Casa Config → `lerTeto` (`rotas.ts:15-18`) | ✔ |
| **Resolução de alvo + segredo** | prefeitura `chatAlvo.ts` | ✔ **é o ponto único onde Provedores e Conversa se encontram** |

### 7.3 Como as referências resolvem

#### 7.3.1 DeepSeek Harness — **três donos, nenhuma duplicação** (E2 + E1, o mais explícito dos quatro)

`.agents/notes/implemented/architecture/2026-07-20-routed-model-context-and-compaction-policy.md`. Problema declarado:

> *"Compaction cannot safely apply one global context window when a process routes requests to models with different capacities. … **Neither obvious configuration owner is sufficient.** Compact-basic is optional and does not know which models an adapter accepts. LLM adapters own model routing but **must not depend on an optional compaction plugin** or absorb consumer-specific threshold, retention, summarizer, and retry policy. The design needs an authoritative capacity fact and optional per-target compaction policy **without creating a second model registry**."*

| Dono | O que possui | O que **não** possui |
|---|---|---|
| **Adaptador LLM** | `resolveModel(provider, model, signal?)` → metadados agregados da rota exata, com `context.contextWindow` opcional; valida inteiro positivo; retorna metadados **desanexados** | política de compactação, thresholds, retenção, sumarização, retry |
| **`dsh-token-meter`** | **um** fold de replay fixo; pressão estimada absoluta + preços posicionais de superfície | **não tem configuração nem perfis de modelo**; não sabe o limite da janela |
| **`compaction-basic`** | política do consumidor: `thresholdRatio` (padrão **0.8**), `retainRatio` (**0.16**) **ou** `retainTokens` absoluto (mutuamente exclusivos), `modelPolicies` com overrides parciais por par exato `{provider, model}`, provedor/modelo de sumarização, teto de saída da sumarização, retries de convergência, teto de retry de overflow | capacidade do modelo (lê do adaptador) |

Fórmula do gatilho:
```
gatilho = floor( min( W × thresholdRatio ,  W − O − headroomTokens ) )
headroom padrão = 65.536 tokens
O = maxTokens do envelope efetivo, senão o padrão por request do adaptador, senão zero
```
> *"The window fraction limits history growth while the second cap leaves extra room after a full output for compaction input and generation; **it does not bound arbitrary tool-result growth**."*
> *"**Resolution runs on every check**, so route or output-cap changes immediately affect policy."*

Validação em carga: alvos duplicados e campos desconhecidos/inválidos **reprovam o carregamento do plugin**; e uma retenção por razão que **não seja menor** que o threshold também reprova, *"because no model capacity can make that policy valid"*.

**Degradação quando não há capacidade** (decisivo para nós, com 8 provedores heterogêneos):
> *"An adapter that lacks capacity metadata **remains a valid LLM route**. Manual proactive pressure fails with a target-specific configuration error; the **automatic listener warns once per exact route and continues with full history**. … Canonical provider-confirmed overflow does not need capacity metadata: it **bypasses the proactive threshold and normal retention budget, attempts one maximal balanced reduction, and preserves the original provider error unless replacement proves progress**."*

**Cinco alternativas rejeitadas, cada uma com motivo** — é a análise de separação de responsabilidades mais completa que encontrei:
1. Capacidade **e** todas as políticas no `compaction-basic` → duplicaria conhecimento de modelo do adaptador; modelos dinâmicos não listados exigiriam registro paralelo; **a capacidade desapareceria quando a compactação não estivesse instalada**.
2. Política de compactação em cada adaptador → adaptadores precisam permanecer independentes de consumidores opcionais; sumarização e retry **não são fatos do provedor**.
3. Tornar `listModels()` autoritativo → descoberta é **advisória**; *"Correctness metadata must not turn selector membership into a routing whitelist."*
4. Folds por modelo no token-meter → o algoritmo de replay é compartilhado; múltiplos folds duplicariam estado sem melhorar a estimativa.
5. **Criar um registro de contexto de modelo autônomo** → *"the adapter already owns authoritative route resolution. **A second registry would introduce lifecycle ordering, duplicate-key, and drift problems** without an independent backend."*

**Montagem de views** (`.agents/notes/archived/architecture/2026-08-11-trajectory-conversation-context-assembly.md`, E2) — o padrão que responde à separação UI × modelo:

> *"Session owns **one contiguous Event window** and publishes both Chat and Trajectory snapshots through `Session.views`; it does not run a second history source or business fold."*
> *"Chat and Trajectory **may recognize the same durable Event family, but they keep separate State and final Node payloads**. They share **only** the Assembler's exact-ID matching, ordered Matches, Location facts, Reader dependencies, publication scheduling, and replace/prepend/append lifecycle."*
> *"**Reusing Chat's final Nodes would not solve the ownership problem.** … **Sharing final Node payloads would couple both views to the union of their requirements.**"*
> *"Legacy records that lack the required correlation ID are **ignored by that Definition** rather than merged into an `undefined` Context or crashing the Session."*

E uma honestidade que vale como padrão para nós: *"These reductions preserve the existing view model and are **theoretical from call counts and asymptotic behavior; this decision does not claim benchmark measurements**."*

#### 7.3.2 OpenCode — **tudo no núcleo/servidor**, com números concretos (E1)

`packages/core/src/session/compaction.ts` vive no **core**, com TUI e desktop como clientes. Constantes verificadas:

| Constante | Valor | Significado no código |
|---|---|---|
| `RESERVE_MIN` | **16.000** | *"The least of the window kept free for the last reply before compaction and for the summary itself."* |
| `RESERVE_SHARE` | **0.15** | fração da janela mantida livre antes da compactação automática |
| `UNKNOWN_WINDOW` | **200.000** | *"A common window size, **assumed** for the compaction request when the model's window is unknown."* |
| `SUMMARY_OUTPUT_FLOOR` | **32.000** | saída mínima garantida ao resumo |
| `SHRINK_STEPS` | **[0.85, 0.7, 0.5, 0.35]** | *"After each 'too long' rejection, the next attempt aims at this share of the first rejected request's size."* |
| `TRANSCRIPT_LEVELS` | **[0,1,2,3,4]** | degradação do transcript de entrada do resumo: inteiro → saídas de ferramenta cortadas → saídas removidas e entradas cortadas → só o texto do usuário, cortado → omitido |
| `TRANSCRIPT_CLIP` | **2.000** | caracteres mantidos do início **e** do fim de cada corte |
| `IMAGE_TOKEN_ESTIMATE` / `PDF_TOKEN_ESTIMATE` | **1.500 / 2.000** | estimativa fixa por anexo |
| `PRECOMPUTE_RATIO` | **0.85** | fração do teto em que um resumo em background começa |
| `PRECOMPUTE_MIN_TOKENS` | **64.000** | abaixo disso, *"a background summary is not worth its cost"* |
| `PRECOMPUTED_TAIL_MIN` / `_SHARE` | **30.000 / 0.25** | cauda máxima mantida verbatim ao lado de um resumo pré-calculado |
| `PRECOMPUTE_MAX_FAILURES` | **2** | falhas de resumo em background após as quais nenhum novo começa até a próxima compactação |
| `NOTHING_TO_COMPACT` | — | falha tipada `{ type:'compaction.unavailable', message:'Nothing to compact yet' }` |

Três achados qualitativos importantes:

- **Medição real com cache de prompt**: o gatilho de pré-cômputo testa `anchor.tokens.input + anchor.tokens.cache.read + anchor.tokens.cache.write < PRECOMPUTE_MIN_TOKENS` → usa `usage` **real**, incluindo leitura/escrita de cache.
- **Resumo pré-calculado é retido, não aplicado**: *"That is the prefix the provider just processed, so the summary request reads it from the **prompt cache**. The summary is **held, not applied**: swapping it in now would rewrite the prefix and **throw away the cache for every step** until compaction is actually due."*
- **Margem calibrada por medição real**: *"`summaryRoom` absorbs a large step past the trigger, so the whole conversation still goes out unchanged and reuses the cache. **Single steps grew by up to ~22k tokens at p99 in real sessions.**"*
- E uma mudança de política documentada: *"Before #48058 (Sep 2026), summaries kept nearly everything: every file touched, per-edit changelogs…"* → os resumos foram **encurtados** de propósito.

#### 7.3.3 VS Code — **a UI dona do modelo de conversa; o participante dono do request** (E1/E4)

- O **workbench** (frontend) possui `ChatModel`/histórico e o entrega ao **participante** (extensão). O `Chronicle SessionStore` fica na **extensão** (`extensions/copilot/…`, lado node), não no workbench.
- `WorkingDirectory` (E1): *"When a working directory is set (**agents window**), it takes priority over workspace folders for all folder-related operations."* → o hospedeiro **informa** o diretório; a resolução é do lado que tem o serviço.
- `transcriptContextAttachmentWidget.contribution.ts` (E1): transcript entra como **attachment/contexto explícito** na UI, não como montagem automática invisível.
- **E4 (inferência minha):** o padrão do VS Code é *"quem possui a conexão com o provedor constrói o request"*. É o mesmo princípio que recomenda o backend para nós — com a diferença importante de que lá o "backend" é a extensão, não um servidor remoto.

#### 7.3.4 OpenClaude

CLI de processo único; a separação é entre `services/compact/autoCompact.ts` (montagem voltada ao modelo) e `screens/*` (renderização). Já consolidado como R20/R21/R22 na Task 02; **nada novo nesta missão**.

### 7.4 Alternativas para o Agente Window

| # | Alternativa | Avaliação |
|---|---|---|
| **F1** | **Manter no browser** (`App.tsx:1678`) | ✘ Exigiria enviar orçamento, checkpoint e memória ao browser; viola regra 3 de `docs/04 §1`; e o remapeamento em `rotas.ts:594` já perde informação |
| **F2** | **Servidor compõe; browser envia intenção** | ✔ **Recomendada** — o servidor já resolve segredo, alvo, modos, permissões, teto, **e já guarda `MensagemAgir[]` fiel** (`rotas.ts:158`) |
| **F3** | **Criar uma "casa de Contexto" nova** | ⚠️ Viável, mas `docs/01` trava os canônicos em 9 e `docs/04 §1` impede crescimento estrutural sem ordem; e o DSH adverte contra **segundo registro** |
| **F4** | **Prefeitura compõe; M3 é dona da política** | ✔ **Complemento de F2** — reusa `chatAlvo.ts`, que já é *"o único ponto onde Provedores e Conversa se encontram"* |
| **F5** | **Três donos separados (DSH)**: capacidade no provedor · medição sem configuração · política no consumidor | ✔ **Recomendada como princípio interno de F2/F4** |

### 7.5 Recomendação fundamentada

**Recomendo F2 + F4 + F5: o servidor compõe, a prefeitura é o endereço, e os três fatos têm três donos.**

**1. Três donos, sem segundo registro (F5).** Mapeamento direto do padrão DSH para o nosso código — e a boa notícia é que **um dos três já está certo**:

| Fato | Dono recomendado | Estado atual |
|---|---|---|
| **Capacidade da janela** | camada de **Provedores** (`padroes.contexto` + override por provedor) | ✔ **já é assim.** `salvo.contexto ?? descritor.padraes.contexto` é estruturalmente idêntico ao `exact model capacity wins; else adapter default; else omit` do DSH |
| **Medição** | M1, **sem configuração e sem perfis de modelo** | ✘ a construir. **Requisito: o medidor não sabe o limite da janela** — ele reporta pressão; quem compara é a política |
| **Política de redução** | M3 (consumidor), com override por par exato `{provedor, modelo}` | ✘ a construir |

**Proibição explícita:** a Projeção de Contexto **lê** capacidade da camada de provedores; **nunca** a redeclara. É a alternativa 5 que o DSH rejeitou: *"A second registry would introduce lifecycle ordering, duplicate-key, and drift problems."*

**2. Endereço: a prefeitura (F4).** `chatAlvo.ts` já é o ponto único de encontro e já carrega o princípio certo (*"segredo nunca vai ao browser"*). Acrescentar ali a composição **não** cria casa nova, **não** cresce `App.tsx`, **não** cria segundo registro. **M3 é a casa dona do contrato de política**; a prefeitura é o **endereço de composição**. ⏳ Isto continua sendo decisão arquitetural e continua **PENDENTE DE APROVAÇÃO** — criar um novo ponto de composição não é meu.

**3. Uma fonte durável, três projeções com payloads separados.**
Padrão direto da nota de *trajectory assembly*: **um** log (M2), **três** projeções — **modelo**, **usuário**, **busca** — que *"may recognize the same durable Event family, but keep separate State and final payloads"*, compartilhando **apenas** identidade, ordem e ciclo de vida. **Compartilhar o payload final acopla as três à união dos requisitos.** O campo `visibilidade` proposto em M2 (`modelo_e_usuario` | `so_usuario` | `so_modelo`) é exatamente esse mecanismo.
Corolário prático já proposto em M4 (R15) e agora com fundamento mais forte: **o índice de busca indexa a projeção do usuário, nunca a do modelo.**

**4. Migração aditiva e reversível — sem big-bang.**
Isto é o que torna F2 compatível com `docs/04 §1` regra 3 (*"`App.tsx` só wiring aditivo"*) e com D69 (*"a casa muda de endereço quando a fatia mexer nela"*):

| Etapa | O que muda | `App.tsx` |
|---|---|---|
| **0 (hoje)** | browser monta (`montarHistorico`) e envia `mensagens` | — |
| **1** | servidor **prefere** o próprio log quando existe; se não existe, usa `mensagens` do pedido; e **reporta qual fonte usou** | inalterado |
| **2** | browser deixa de montar quando o servidor confirma ter o log; `montarHistorico` vira fallback | **só remoção de caminho morto, no fim** |
| **3** | `mensagens` no pedido vira opcional/depreciado | — |

Nenhuma etapa exige alterar área congelada, nenhuma exige migração de dados, e cada uma é reversível. **Registro que a etapa 1 cria, temporariamente, duas fontes de verdade** — mitigado pela obrigação de **reportar qual foi usada**, que é o padrão DSH de `baseline.kind = 'usage' | 'estimated'` aplicado à proveniência.

**5. Política para limite desconhecido: recomendo a do DSH, não a do OpenCode.**
As duas referências fazem **opostos**, e a escolha importa porque temos um provedor genérico "Compatível com OpenAI" cuja janela real não conhecemos:

| | **OpenCode** | **DSH** | **Recomendação** |
|---|---|---|---|
| Janela desconhecida | **assume 200.000** (`UNKNOWN_WINDOW`) | adaptador sem capacidade **continua rota válida**; pressão proativa manual falha com erro de configuração específico; o listener automático **avisa uma vez por rota exata e continua com histórico completo** | **DSH** |
| Por quê | simples; mas se a janela real for menor, **estoura**; se for maior, **descarta contexto à toa** | *"A wrong capacity either compacts too late and triggers avoidable overflow or compacts too early and discards useful context"* | assumir número é **adivinhar dos dois lados ao mesmo tempo** |

**Mas adotar a escada reativa do OpenCode:** `SHRINK_STEPS = [0.85, 0.7, 0.5, 0.35]` após rejeição real "too long", combinada com a regra do DSH de que overflow **confirmado pelo provedor** dispensa threshold, tenta **uma** redução balanceada máxima e **preserva o erro original do provedor** a menos que a substituição prove progresso. Isto responde parcialmente 🔎 **H5** com desenho, antes de qualquer medição.

**6. Números das referências são ordem de grandeza, não valores nossos.**
`thresholdRatio 0.8` / `retainRatio 0.16` / `headroom 65.536` (DSH) e `RESERVE_SHARE 0.15` / `RESERVE_MIN 16.000` / `CLIP 2.000` / `PRECOMPUTE_*` (OpenCode) são **coerentes entre si** (reserva de 15–20% da janela), o que dá confiança na **ordem de grandeza**. Mas nenhum foi medido no nosso corpus, com nossos 8 provedores, em PT-BR. **Recomendo: adotar a estrutura, medir os valores.** 🔎 H1/H3/H4/H5.

**7. Alertas 75%/90% permanecem.** Já estão decididos em `docs/02 §1.4` — ✅ **DECIDIDO**, não reabrir. Note que são **mais conservadores** que os thresholds das referências (0.8/0.85), o que é apropriado: os nossos são **alerta ao dono**, os delas são **gatilho de redução automática**.

### 7.6 Riscos e dependências

| Risco | Severidade | Mitigação |
|---|---|---|
| **Duas fontes de verdade durante a migração** | **Alta** | Etapa 1 **reporta** qual fonte usou; nenhuma etapa é irreversível |
| **Segundo registro de capacidade** | Alta | Proibição explícita (§7.5.1); teste de fronteira por casa |
| Crescimento de `App.tsx` | Média | A migração **remove** caminho, não acrescenta (regra 3 de `docs/04 §1`) |
| **Assumir janela desconhecida** | Média-alta | Política DSH (§7.5.5) |
| Medidor cego após compactação | Média | Já é R3 da Task 02: âncora `usage` + delta heurístico + `projectedTokens`; o DSH tem nota específica (`2026-08-05-context-meter-blind-to-compaction`) |
| Perda de cache de prompt ao aplicar resumo cedo | Média (custo) | Padrão OpenCode: resumo pré-calculado é **retido**, não aplicado |
| 🔎 H3/H4/H5 não medidos | — | Sem credencial ⇒ **bloqueado/não executado** (✅ D91/D99) |

**Dependências:** M2 (log fiel) é pré-requisito absoluto — sem `seq` e sem eventos de ferramenta não há projeção protocolar. M1 fornece o orçamento. ✅ D109 mantém M1 → M2 → M3.

### 7.7 Impacto nas Fatias M1–M8

- **M1**: **medição sem configuração e sem perfis de modelo** (§7.5.1). O medidor **não** sabe o limite; compara quem tem política. Isto **simplifica** M1 em relação à proposta da Task 03, que previa `limiteJanela` dentro do `SnapshotContexto` — recomendo manter o campo, mas **como eco do dono (Provedores), nunca como autoridade**.
- **M2**: o campo `visibilidade` deixa de ser conveniência e vira **requisito estrutural** — é o que permite três projeções sobre um log.
- **M3**: **ganha o contrato de Projeção de Contexto** (S2 da Task 03 confirmado) e a política por par `{provedor, modelo}`.
- **M4**: indexa a projeção do **usuário** (R15), com fundamento reforçado.
- **M6**: material recuperado entra como **conteúdo não confiável anexado à mensagem do usuário** (R10), **nunca** como instrução de sistema — e a montagem é do servidor, o que torna isso garantível.
- **M7**: a retomada passa a ser **reconstrução de projeção a partir do log**, não reenvio do que o browser guardou.
- **M8**: gate novo — **provar que não há segundo registro de capacidade** e que a migração reporta a fonte usada.

### 7.8 O que ainda exige aprovação humana

1. **F2 + F4 + F5** — a escolha de responsabilidade. ⏳ **DP-06 continua pendente**; esta seção a fundamenta, não a decide.
2. **A migração em 4 etapas**, especialmente a etapa 1 (duas fontes temporárias com reporte obrigatório).
3. **Política para janela desconhecida**: DSH (recusar e avisar) ou OpenCode (assumir 200k). Recomendo DSH.
4. **Se `limiteJanela` permanece no `SnapshotContexto`** como eco (recomendo) ou sai.
5. **Números**: adotar a estrutura das referências e medir os valores, ou adotar os valores delas como ponto de partida.

---

## §8 — As evidências são suficientes para decidir?

Resposta direta à pergunta final da missão, decisão por decisão.

| DP | Evidência suficiente? | O que a evidência **resolve** | O que **só o dono** resolve |
|---|---|---|---|
| **DP-01** Identidade de projeto | 🟡 **Suficiente para escolher a estratégia; insuficiente para escolher os parâmetros** | Quatro modelos reais comparados (§2.4), com os **custos documentados pelos próprios autores**: DSH declara a perda e aceita; OpenCode documenta a falha do sufixo de hash entre runtimes; OpenClaude documenta o ataque via `commondir` e a quebra em ambiente efêmero; VS Code congela a derivação com aviso gritado. A composição em três camadas tem precedente em todos os quatro | **🔎 H6 — quais caminhos o senhor realmente usa.** Abre o mesmo repo por caminhos diferentes? Move pasta de projeto? Trabalha sem Git? Usa worktree? E: **dois clones devem compartilhar histórico?** (produto, não técnica) |
| **DP-02** Memória automática | 🟢 **Suficiente** | Mecanismos reais lidos por inteiro (§3.3.1): dois automáticos no OpenClaude, ambos gated por aprovação, um atrás de flag `false`; três das quatro referências sem extração automática; custo documentado (~3,2k tokens + quebra de cache); limites, deduplicação e fronteira de segurança verificáveis. **E a divisão DP-02a/DP-02b resolve o conflito com "Agent Loop único"** | Se gravação de memória conta como **escrita** para efeito de modo Perguntar/Planejar |
| **DP-03** Resultados grandes | 🟢 **Suficiente para a política; 🟡 insuficiente para os números** | Política comum das duas referências que têm o mecanismo (log íntegro + projeção podada); spill completo do DSH com caminho, permissões, retenção e segurança de apagamento; ~25 padrões + 16 envs do filtro de segredo do Copilot; escada de 5 níveis e clip de 2.000 do OpenCode; armadilha de round-trip (`__proto__`). **A Regra 2 (distinção por origem) é E4 — inferência minha, coerente com três escolhas verificadas, mas não enunciada por nenhuma referência** | **🔴 Se conteúdo de `ler`/`buscar` pode ser copiado para `~/.agente_window`.** É privacidade, não técnica. E os **tetos numéricos**, que dependem de 🔎 H1 |
| **DP-04** Organização das fatias | 🟢 **Suficiente — e a resposta é que já estava decidida** | `docs/06` proíbe explicitamente importar a numeração hipotética, proíbe criar Fatia 21, dá o precedente D98 (inserir sem renumerar), a convenção "era a N", e o registro IC-01…IC-09. **Não é mais decisão pendente** (C-2) | **Uma só:** onde os contratos aprovados vão morar — subseção de `docs/06`, SPEC por fatia dentro de `docs/06` (recomendado), ou documento próprio. Qualquer resposta **altera documentação canônica**, o que esta missão não pode fazer |
| **DP-05** Memória global | 🟢 **Suficiente** | **A premissa que sustentava "manter fora" estava errada** (C-5): OpenClaude tem escopo `'user'` fora de `projects/`, VS Code tem `globalStorageUri`, OpenCode tem `ID.global`. E os três mostram o mesmo padrão: **escopo = prefixo de caminho sobre infraestrutura compartilhada**. A comparação inicial×depois (§6.4) mostra que o custo de adiar é **uma decisão de contrato tomada agora**, não trabalho futuro | Se global é **opt-in**; se memória de projeto pode viver **dentro** do workspace (versionável) ou só fora; se "nenhuma inferência de objetivo não declarado" vira norma; retenção por escopo |
| **DP-06** Projeção de contexto | 🟢 **Suficiente** | A análise de separação mais completa que existe está no DSH: três donos, **cinco alternativas rejeitadas com motivo**, fórmula de gatilho, e política explícita para capacidade desconhecida. E **o nosso código já está certo em um dos três donos** (`padroes.contexto` + override = adaptador dono da capacidade). O padrão de três projeções sobre um log vem da nota de *trajectory assembly*. A migração em 4 etapas é compatível com regra 3 de `docs/04 §1` | Se aceita a **etapa 1** (duas fontes temporárias com reporte); política para janela desconhecida (DSH × OpenCode); se `limiteJanela` permanece no snapshot como eco |

**Resumo da suficiência:** **duas decisões deixam de ser pendentes** (DP-04 já estava decidida; DP-05 tinha premissa falsa e agora tem precedente claro). **Três têm recomendação pronta para aprovação** (DP-02, DP-03, DP-06). **Uma precisa de um dado que só o dono tem** (DP-01 — 🔎 H6).

**Limitações que registro sem contornar:**
- **Nada foi executado.** Nenhum teste novo, nenhum benchmark novo. Toda afirmação de comportamento é E1 (código lido), E2 (documentação do fornecedor) ou E4 (inferência minha, marcada). As únicas provas executadas continuam sendo P1–P10 da investigação anterior.
- **`MemoryTool` do Copilot: E5.** Não está em `microsoft/vscode` no commit auditado. As afirmações da Task 02 sobre ele **não foram reforçadas**.
- **Quem escreve o arquivo de identidade do OpenCode: E5.** Confirmo a leitura, não a escrita.
- **Nenhum embedder auditado fora de `src/` no OpenClaude** — a afirmação C-1 vale para os caminhos auditados.
- **OpenClaude tem licença `NOASSERTION`** (R-11). **Somente referência conceitual; nenhuma cópia de código**, aqui ou em qualquer entrega.
- **A segurança de apagamento de derivado do DSH é POSIX.** Não há modelo Windows documentado, e Windows é o nosso ambiente de homologação.
- **Meta AI permanece E3.** Usada só como lista de requisitos de governança.

---

## §9 — Resumo executivo em linguagem simples

### O que os projetos originais fazem

**Identidade de projeto — quatro respostas diferentes, e todas documentam o próprio custo.**
O **OpenCode** é o mais completo: sobe a árvore de pastas procurando `.git`; se achar, tenta o endereço remoto do repositório, depois um ID guardado dentro do `.git`, depois **o SHA do primeiro commit da história** — que não muda quando a pasta é renomeada, movida, trocada de unidade ou clonada. Sem Git, usa um hash do caminho. E guarda tudo num **banco**: o projeto é uma linha, e os caminhos são uma **tabela separada com várias linhas por projeto**. Mover ou clonar **adiciona linha**, não cria projeto. Ele ainda **arquiva** projeto cujas pastas sumiram, e **adota** uma pasta sem Git quando ela vira repositório.
O **OpenClaude** usa **duas identidades de propósito**: sessão pelo **caminho canonicalizado** (`realpath` + normalização Unicode), memória pela **raiz do Git** — para que todos os worktrees do mesmo repositório compartilhem memória. E documenta duas coisas que importam muito para nós: que o sufixo de hash deles **quebrou** porque a CLI e o SDK usam funções de hash diferentes (o remédio foi varrer a pasta pai procurando prefixo), e que ancorar na raiz do Git **abre um ataque real** — um repositório clonado malicioso pode apontar o `.git` para uma pasta já confiável e **executar hooks na inicialização, contornando o diálogo de confiança**. Eles validam com duas checagens e explicam por que cada uma sozinha falha.
O **DeepSeek Harness** escolheu o oposto: nome de pasta **legível, derivado do caminho, sem hash, sabidamente lossy** — e escreve isso na documentação: *"Moving a project usually selects a different directory."* Considerou sufixo de hash e **rejeitou**, trocando colisão por legibilidade.
O **VS Code** usa `hash(uri)` para estado de janela, com um aviso gritado duas vezes: **"DO NOT CHANGE. IDENTIFIERS HAVE TO REMAIN STABLE."** E no Copilot não particiona nada: **um banco só**, com `cwd`, `repository`, `host_type` e `branch` como **colunas indexadas**. Para decidir **compartilhamento**, usa outra identidade ainda: o nome-do-dono do repositório no GitHub, com exclusões por padrão glob.

**Memória automática — quase ninguém faz, e quem faz tranca.**
Três das quatro referências **não** extraem memória automaticamente. O OpenClaude tem **dois** mecanismos: um por modelo, em fork no fim do turno, **atrás de feature flag com padrão desligado**; e outro **por expressão regular, sem nenhuma chamada de modelo**, que roda a cada turno e detecta dez classes de fato (variáveis de ambiente, caminhos, versões, URLs, IPs, símbolos em crase, termos técnicos, Redux/React, arquivos de configuração e **regras de projeto** como "sempre use pnpm"). **Os dois são bloqueados quando a aprovação de escrita é exigida.** O teto é 20 fatos por chamada, 10 por tipo de conceito/regra e 5 pelos demais. A duplicação é evitada por nome de arquivo estável + comparação de conteúdo **ignorando o timestamp**. E o custo de manter ligado está escrito: **~3.200 tokens de protocolo por request, mais quebra de cache de prompt.**
**Verifiquei uma coisa que desaconselha copiar:** os extratores são **anglocêntricos de forma concreta**. A função de slug transforma `configuração` em `configura-o`; a heurística de segredo descarta palavras hifenizadas com 12+ caracteres, o que pega `banco-de-dados-local`; a lista de palavras vazias é inglesa; e o extrator de regras procura `always`/`never`/`prefer` — **"sempre use" e "nunca faça" não são detectados.** Copiar isso para um produto em português produziria memória **silenciosamente incompleta**.

**Resultados grandes de ferramentas — todos concordam num ponto.**
O log guarda o **original inteiro**; o que é reduzido é a **projeção voltada ao modelo**. O DeepSeek Harness corta em cabeça de 4.096 + marcador + cauda de 1.024 quando passa de 8.192 caracteres, **sem chamada de modelo**, e a substituição **cita o evento original por sequência** — e diz que isso *"may relieve enough token pressure to skip summarization"*. Quando o conteúdo não tem outra casa (página web, saída de terminal), ele faz **spill**: arquivo privado `0700`, escrita exclusiva `wx` com `0600` **à prova de symlink**, e devolve um **localizador opaco** que o modelo recupera com as ferramentas `read`/`grep` **que já existem**. Retenção: **uma varredura na inicialização**, 30 dias por padrão, `0` desliga, `lstat` para nunca seguir symlink, expiração **por arquivo** (não por pasta), e **nunca lança exceção**. O Copilot filtra segredo **na fronteira de saída** com ~25 padrões conhecidos (JWT, Bearer, tokens GitHub/npm/OpenAI/AWS/Azure/NuGet, chaves privadas, connection strings, SAS, webhooks) **mais** os valores de 16 variáveis de ambiente, guardados **em texto e em base64**. O OpenCode não faz spill: **degrada em 5 níveis** e corta cabeça+cauda a 2.000 caracteres.
Encontrei também uma **armadilha que ninguém procura**: o DSH registrou que validar JSON persistido com um parser que **reconstrói objetos** **descarta** uma chave chamada `__proto__` — que é dado legítimo — e faz o checkpoint **reabrir diferente do log**, com a validação **passando**. Defeito silencioso de fidelidade.

**Organização do trabalho — nenhum dos quatro usa número de fatia.**
DSH usa **nota com data, slug, status e vínculo de supersessão**. OpenCode cita **número de issue/PR**. VS Code usa **nome de configuração + versão de schema**. E o nosso `docs/06` **já faz o mesmo**: IC-01…IC-09 para iniciativas não-fatia, anotação "era a N" para rastreabilidade, e o precedente D98 de inserir a MICRO-FATIA PERF **"entre a 12 e a 13, sem renumerar"**.

**Memória global — existe, e é barata de suportar.**
O OpenClaude tem `AgentMemoryScope = 'user' | 'project' | 'local'`: o **`user` mora fora de `projects/`**, o `project` mora **dentro do workspace** (versionável), o `local` dentro mas não versionado. **Os três compartilham tudo** — mesmo `MEMORY.md`, mesmo construtor de prompt, mesma guarda de caminho. **Só muda o diretório base.** O VS Code faz o mesmo com `storageUri` e `globalStorageUri` sob o **mesmo** caminho relativo — e a limpeza de **14 dias roda só no de workspace**; **o global nunca é limpo automaticamente**, o que é uma posição: o que é global é **curado**, o que é de projeto é **efêmero**. O OpenCode tem um ID de projeto literalmente chamado `"global"`, isento de arquivamento.
E a **memória de conversa** já existe no OpenClaude como `.arc.json` (objetivos, decisões, marcos, fase) — que é **funcionalmente o nosso checkpoint de M3**.

**Projeção de contexto — a análise mais clara está no DSH.**
**Três donos, nenhuma duplicação:** o **adaptador** é dono da capacidade da janela; o **medidor** é dono da medição e **não tem configuração nem perfis de modelo**; a **compactação** é dona da política, com override por par exato `{provedor, modelo}`. Cinco alternativas foram **rejeitadas com motivo**, incluindo *"criar um registro de contexto autônomo"* — *"a second registry would introduce lifecycle ordering, duplicate-key, and drift problems"*. O gatilho é `floor(min(W × 0.8, W − O − 65.536))`, recalculado **a cada verificação**. E quando o adaptador **não sabe** a capacidade, ele **continua sendo rota válida**: o listener automático **avisa uma vez e segue com histórico completo**. O OpenCode faz o contrário: **assume 200.000**.
Sobre views, o DSH estabelece: **uma** janela de eventos durável, **várias** projeções publicadas; os consumidores *"may recognize the same durable Event family, but they keep separate State and final Node payloads"* — porque compartilhar o payload final *"would couple both views to the union of their requirements"*.
O OpenCode acrescenta sofisticação de custo: o resumo pré-calculado é **retido, não aplicado**, porque aplicar antes da hora reescreve o prefixo e **joga fora o cache de prompt** — e mediram que *"single steps grew by up to ~22k tokens at p99 in real sessions"*.

### Qual solução parece mais adequada ao Agente Window

| Decisão | Recomendação | Em uma frase |
|---|---|---|
| **DP-01** | **Três camadas**: canonicalizar já (`realpath`+NFC) · separar identidade de nome de pasta · tabela 1:N de diretórios no banco que já temos · escada remote→commit-raiz→caminho, com Git opcional | Canonicalizar é barato e corrige três causas reais; o resto pode vir depois, sem migração destrutiva |
| **DP-02** | **Nada automático no primeiro corte**; dividir a decisão em **DP-02a (por modelo → adiar)** e **DP-02b (determinística → possível depois, re-escrita para PT-BR)** | A por modelo colide com "Agent Loop único"; a determinística não colide, mas **não é portável** para português |
| **DP-03** | **Log íntegro + projeção podada + distinção por origem**: conteúdo do workspace vira **localizador**, saída de terminal vira **conteúdo** | Não copiar para `~/.agente_window` o que já está durável no projeto; e **sem spill** até 🔎 H1 mostrar necessidade |
| **DP-04** | **Não é mais pendente.** Manter rótulos M, registrar no formato IC, retirar a "posição hipotética", adotar notas com status+supersessão | `docs/06` já proíbe exatamente o que eu tinha apontado como colisão |
| **DP-05** | **Contrato pronto para os três escopos, implementação só do de projeto**; memória de conversa **é o checkpoint de M3**, não uma quarta loja | Adiar custa **uma decisão de contrato agora**, não trabalho depois |
| **DP-06** | **Servidor compõe, prefeitura é o endereço, três fatos com três donos**, migração em 4 etapas aditivas e reversíveis | O servidor já resolve segredo, alvo, modos, permissões **e já guarda histórico fiel** — falta só ser o dono |

### O que podemos aproveitar

**Já nosso, custo zero:** o banco SQLite **global** (`agente_window.db`) — é onde a tabela de identidade mora sem criar armazenamento novo · `padroes.contexto` + override por provedor, que **já é estruturalmente idêntico** ao "adaptador dono da capacidade" do DSH · `chatAlvo.ts` como ponto único e o princípio *"segredo nunca vai ao browser"* · `retomarPorFluxo` com `MensagemAgir[]` fiel, que **prova que o servidor consegue ser o dono do histórico** · `resolveProjectDir()` com guarda anti-traversal · `Session.slug?` já opcional · FTS5 comprovado (P1).

**Das referências, como conceito:** a escada de identidade do OpenCode (com cache e com `root()` filesystem-only) · `canonicalizePath` = `realpath`+NFC · a tabela 1:N projeto↔diretório · `COALESCE` para não apagar metadado conhecido · as duas checagens de segurança de worktree do OpenClaude · a exclusão de configuração vinda do repositório · os três vetores de traversal (byte nulo, URL-codificado, NFKC de largura total) · fronteira final de segurança na escrita de memória · tetos e deduplicação por conteúdo estável · filtro de segredo em duas camadas com valores de env em texto **e** base64 · spill `wx`+`0600`+`0700` com localizador opaco e retenção que nunca lança · índice derivado **desligado por padrão** com erro tipado e enforcement na operação · validação de JSON **somente-leitura** · três donos de contexto sem segundo registro · uma janela de eventos com projeções de payloads separados · resumo pré-calculado **retido** para preservar cache · escada `[0.85, 0.7, 0.5, 0.35]` para rejeição "too long" · escopo como **prefixo** sobre infraestrutura compartilhada · retenção diferente por escopo (14 dias projeto, nenhuma global).

### O que precisaríamos desenvolver

Canonicalização antes de derivar a chave · tabela `projeto_diretorio` e a escada de resolução (com cache e, se ancorar em Git, **as duas validações de segurança**) · política e testes de admissão/deduplicação/sanitização de memória · o filtro de segredo em duas camadas (nada disso existe hoje) · união discriminada por origem no payload de `tool_result` · o medidor de M1 e a Projeção de Contexto no servidor, com a migração em 4 etapas · os canários de isolamento cobrindo **três** roots.
**Nada disso é grande isoladamente.** O que é grande é o conjunto — e é por isso que a ordem canônica (13 → 14 → 15 → M1 → M2 → M3 → M4) e a regra "M5–M8 só planejamento" continuam fazendo sentido.

### Quais riscos existem

**Altos:** ancorar identidade na raiz do Git **importa um ataque real e documentado** (repo malicioso redireciona `commondir` e executa hooks na inicialização) · copiar conteúdo do workspace para `~/.agente_window` **move dado privado para fora da proteção do projeto** e cria cópia que fica obsoleta · extração automática sem aprovação viola `docs/02 §1.4` · prompt injection via memória/transcrição (🔎 H8, nunca reproduzido por nós) · derivado sobreviver à exclusão da fonte (🔎 H9; é exatamente onde o Meta falha de forma documentada).
**Médios:** dois clones passarem a compartilhar histórico sem o dono querer · `git` no caminho de resolução custar latência · **duas fontes de verdade** durante a etapa 1 da migração de DP-06 · round-trip infiel silencioso (`__proto__`) · assumir janela desconhecida e estourar ou descartar à toa · extração em PT-BR silenciosamente incompleta.
**Específicos nossos:** a **faxina de derivado do DSH é POSIX** — não há modelo Windows, e Windows é o nosso ambiente de homologação (R-8) · **perdemos o histórico Git** (R-15), então hashes citados nos canônicos não são verificáveis nesta cópia (`docs/06:7` já registra) · OpenClaude tem licença `NOASSERTION`, então **somente referência conceitual, nenhuma cópia de código**.

### Quais decisões o responsável ainda precisa tomar

**Uma precisa de um dado que só o senhor tem:**
🔴 **DP-01 / 🔎 H6** — *o senhor abre o mesmo repositório por caminhos diferentes? Move pasta de projeto? Trabalha sem Git? Usa worktree?* E: **dois clones devem compartilhar histórico e memória?** Sem isso, a escolha de identidade é teórica.

**Uma é de privacidade, não de técnica:**
🔴 **DP-03** — *conteúdo lido do workspace pode ser copiado para `~/.agente_window`?* Recomendo **não**.

**Cinco estão prontas para aprovação, com recomendação fundamentada:**
🟢 **DP-02** — nada automático no primeiro corte; dividir em DP-02a (adiar) e DP-02b (possível depois, re-escrita para PT-BR).
🟢 **DP-03 (política)** — log íntegro + projeção podada + distinção por origem; **sem spill** até H1 medir.
🟢 **DP-05** — contrato pronto para três escopos, implementação só do de projeto; memória de conversa **é** o checkpoint de M3.
🟢 **DP-06** — servidor compõe, prefeitura é o endereço, três donos, migração em 4 etapas; política DSH para janela desconhecida.
🟢 **DP-04** — **não é mais pendente**: manter rótulos M, registrar no formato IC, retirar a "posição hipotética". **Sobrou uma pergunta documental:** onde os contratos aprovados vão morar — subseção de `docs/06`, SPEC por fatia dentro de `docs/06` (**recomendado**), ou documento próprio? Qualquer resposta **altera documentação canônica**, o que esta missão não pode fazer.

**E sete perguntas menores, listadas ao fim de cada seção** (§2.9, §3.8, §4.8, §5.8, §6.9, §7.8).

---

## §10 — Registro de conformidade, documentos e estado final do Git

### 10.1 Conformidade com as restrições da missão

| Restrição | Cumprimento |
|---|---|
| Não modificar código-fonte | ✅ nenhum arquivo de `src/` alterado |
| Não alterar testes existentes | ✅ nenhum |
| Não instalar dependências no projeto | ✅ `package.json`, lockfiles e `node_modules` intactos; clones e downloads **só** em `/home/user/.cache/refs/`, fora do repositório e fora do snapshot (✅ `docs/01 §3.B.6`) |
| Não alterar documentação canônica | ✅ `docs/01`–`09` intactos |
| Não modificar o roadmap | ✅ nenhuma numeração, ordem ou escopo alterado; DP-04 mostra que o roadmap **já** respondia a questão |
| Não executar commit nem push | ✅ nenhum; sem remote |
| Não implementar as Fatias M1–M8 | ✅ nada implementado |
| Não iniciar novas tarefas de desenvolvimento | ✅ parado após o relatório |
| Não tomar decisões arquiteturais definitivas em nome do responsável | ✅ todas as seis permanecem **PENDENTES DE APROVAÇÃO**; §8 separa o que a evidência resolve do que **só o dono** resolve |
| Não declarar decisões homologadas | ✅ nenhuma homologação declarada |
| Não atualizar contratos oficiais nem roadmap | ✅ os contratos citados da Task 03 são **proposta**, e as recomendações daqui **não** os substituem |
| Diferenciar comprovado × documentado × fonte secundária × inferência × não encontrado | ✅ escala E1–E5 declarada no cabeçalho e aplicada em cada afirmação; **E5 registrado explicitamente** para MemoryTool, para a escrita do arquivo de identidade do OpenCode e para embedder fora de `src/` |
| Apresentar os **10 itens** para cada uma das seis decisões | ✅ mapa verificável no cabeçalho ("Onde estão os 10 itens exigidos por decisão"); itens 4 e 6 são transversais (rótulos E1–E5 e colunas das tabelas de alternativas), como o próprio mapa declara |
| Não repetir integralmente as Tasks 02 e 03 | ✅ §0.2 lista o que foi reaproveitado sem nova pesquisa; as seis correções de §1 são **aditivas** e vinculadas, não reescritas nos relatórios anteriores |
| Registrar limitação em vez de inventar conclusão | ✅ §8, bloco "Limitações que registro sem contornar" |
| Um relatório consolidado, evitando vários documentos | ✅ **um** arquivo novo |
| Verificar o estado do repositório sem modificar o Git | ✅ §0.1 |

### 10.2 Documentos produzidos nesta missão

| Arquivo | Conteúdo | Status |
|---|---|---|
| `docs/arquivo_morto/investigacao_memoria_fatias_m/13_INVESTIGACAO_COMPLEMENTAR_DP01_A_DP06.md` | **Este relatório.** §0 estado/fontes · §1 seis correções ao trabalho anterior · §2–§7 as seis decisões com os 10 itens exigidos cada · §8 suficiência de evidências · §9 resumo executivo · §10 conformidade | **Novo.** Temporário até aprovação |
| `docs/arquivo_morto/investigacao_memoria_fatias_m/00_INDICE.md` | Entrada 13 + registro das fontes novas e das seis correções | **Atualizado** (aditivo) |

**Nenhum outro arquivo foi criado, alterado, movido ou apagado.** Em particular: `11_TASK02_…` e `12_TASK03_…` **não foram reescritos** — as correções vivem aqui, em §1, com vínculo explícito, no padrão de supersessão que §5.5 recomenda adotar.

### 10.3 Arquivos apenas lidos

- **Agente Window:** `docs/01`–`09`; `platform/apps/workbench-v2/src/{types.ts, App.tsx, components/ChatInput.tsx}`; `server/session-persistence/{index,transcripts,database,paths,chatAlvo}.ts`; `services/sessions/*`; `bairros/2-inteligencia/casas/{conversa,agir,provedores,config}/**`; `package.json`; `docs/arquivo_morto/investigacao_memoria_fatias_m/00`–`12`.
- **OpenCode** `45898d0f`: 6 arquivos (§0.3).
- **OpenClaude** `3a8e12b`: 11 arquivos (§0.3), em clone raso fora do workspace.
- **DeepSeek Harness** `22ddee3`: 27 fontes baixadas por `raw` com SHA fixo (§0.3).
- **VS Code** `c8a3f819`: 8 arquivos + árvore completa de 25.212 entradas (§0.3).

### 10.4 Estado final do Git

| Item | Estado |
|---|---|
| Branch | `main` |
| HEAD | `fe218b8` — *"chore: init projeto agente_window"* (commit único) |
| Remote | **nenhum** |
| Commits nesta missão | **nenhum** |
| Push | **nenhum** |
| Working tree | **4 alterações, todas dentro de `docs/arquivo_morto/investigacao_memoria_fatias_m/`**: `00_INDICE.md` (M) · `11_TASK02_…` (??) · `12_TASK03_…` (??) · `13_INVESTIGACAO_COMPLEMENTAR_…` (??) |
| Código-fonte / testes | **inalterados** |
| `docs/01`–`09` | **inalterados** |
| Roadmap / numeração oficial | **inalterados** |
| Dependências | **inalteradas** |
| Áreas congeladas | **não tocadas** |
| Artefatos de pesquisa externos | `/home/user/.cache/refs/` — **fora** do repositório e **fora** do snapshot do workspace; não aparece no `git status` |

### 10.5 Declaração final

- **Nenhuma das seis decisões está homologada.** Todas permanecem **PENDENTES DE APROVAÇÃO**.
- **Nenhuma funcionalidade foi implementada. Nenhum código foi alterado. Nenhum contrato oficial foi atualizado. Nenhum roadmap foi modificado.**
- **Duas decisões mudaram de status por evidência, não por decisão minha:** DP-04 **já estava respondida** pela documentação canônica (C-2) e DP-05 tinha **premissa factual errada** na Task 02 (C-5). Em ambos os casos, registro o achado e **não** declaro decisão.
- **Nada foi executado contra o Agente Window nesta missão.** Não há prova operacional nova; as únicas provas executadas continuam sendo P1–P10.
- A documentação desta investigação **permanece temporária** e **não** foi movida para `arquivo_morto/`.

**Entregue para avaliação e aprovação do responsável pelo Agente Window. Parado aqui.**
