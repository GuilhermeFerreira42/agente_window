# Relatório de alinhamento — desempenho, diagnósticos, memória e testes

**Atualizado:** 23/10/2026  
**Baseline local inspecionado:** branch `main`, HEAD `b7d51cfc698c93ee6d469d6601c8f5d701ae0763`  
**Material adicional confrontado:** `/home/user/uploads/MAPA_MESTRE_DE_ALINHAMENTO.md`  
**Natureza:** auditoria investigativa/comparativa; não é SPEC nem decisão canônica. Nenhuma recomendação abaixo autoriza implementação.  
**Estado Git conhecido nesta auditoria:** repositório local em `main`; HEAD indicado acima. O remoto/GitHub não foi consultado.

## 1. Resumo executivo

1. **PERF/D98:** código e medições históricas sustentam a hipótese de gargalo de UI, mas não provam a causa da tela branca do vídeo. D98 já determina trace CDP e protótipo virtualizado em fixture antes de SPEC/obra. A confirmação não foi executada. O mapa mestre acrescenta uma restrição operacional explícita: só iniciar essa investigação após autorização específica; este relatório não inicia trace, protótipo ou teste.
2. **Central de Diagnósticos:** o mapa mestre registra uma intenção alinhada em conversa: central permanente, registro de falhas/eventos relevantes, avisos discretos e agregados, exportação sanitizada e evolução por áreas. Isso é uma lacuna nos canônicos, não rejeição do responsável. Faltam decisão formal e SPEC; a central não deve ser embutida automaticamente na microfatia PERF.
3. **Responsabilidade por testes reais:** há conflito a deliberar. D91 canônica manda automatizar com stubs e deixa validação real com o responsável na máquina dele. O mapa registra preferência por a Arena executar o máximo possível, inclusive testes reais se houver acesso legítimo/seguro. D91 continua vigente até decisão explícita; nenhuma chave foi solicitada ou usada.
4. **Memória/contexto:** o código restaura chats por `chatId`, mas envia todo o histórico textual elegível do chat corrente; não há checkpoint/compactação ou busca do transcript e as trocas estruturadas de ferramentas não são fielmente carregadas no próximo turno. O mapa registra como intenção a compactação automática e manual, preservação integral do transcript, alertas em 75%/90%, uso real quando reportado e estimativa claramente rotulada caso contrário, busca manual intra-chat, cross-chat apenas habilitada explicitamente, memória de projeto sujeita a aprovação e retomada sem replay automático.
5. **M1–M8 e roadmap:** o mapa favorece continuidade básica M1–M4, deixando M5–M8 para avaliação posterior. O corte M1–M3 versus M1–M4 e a posição relativa à Fatia 13 permanecem pendentes. Não há base para afirmar que M1–M4 necessariamente antecedem a Fatia 13. Os IDs M1–M8 são rótulos do estudo, não números oficiais; Fatias 13–15 não foram renumeradas.
6. **Status do trabalho:** foram lidos os nove canônicos, o estudo arquivado, as notas textuais relevantes, o código atual citado e o mapa mestre anexado. Não rodei testes/typecheck/build/benchmark/trace nem chamadas a provedores. Não alterei código, canônicos, roadmap ou Git e não fiz commit.

## 2. Escopo, hierarquia de evidência e estado do checkout

Confrontei:

- `docs/01`–`docs/09` no checkout local;
- `docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/`, incluindo M1–M8 e a auditoria de rastreabilidade;
- `/home/user/notas_temporarias/diagnostico_desempenho_explorer_scm_2026-10-21.md`, `carta_contexto_chat_arena_bug_desempenho.md`, `estado_atual_memoria_contexto_2026-10-22.md`, análise de isolamento e notas comparativas;
- código atual de `explorer-search`, chat, persistência de sessão, Casas Conversa/Agir e resolução do provedor;
- `/home/user/uploads/MAPA_MESTRE_DE_ALINHAMENTO.md`.

O mapa mestre define a si próprio como transferência/concilição, não SPEC nem decisão canônica. Suas declarações **“ALINHADO EM CONVERSA”** são tratadas neste relatório como intenções relatadas pelo responsável e recebidas no arquivo, não como regra já aprovada em `docs/01`–`docs/09`. Não tive acesso aos registros brutos das conversas para ratificar independentemente cada formulação. A hierarquia prática permanece: canônicos aprovados governam até uma deliberação e formalização autorizadas; ausência no canônico é lacuna documental, não prova de rejeição.

O checkout observado estava em `main`, HEAD `b7d51cfc698c93ee6d469d6601c8f5d701ae0763`. O estudo local aparece não rastreado e foi preservado. Depois de produzir este relatório, o status mostra o relatório e a pasta de estudo como não rastreados; não há diff rastreado. Não consultei o remoto para validar o envio ao GitHub mencionado no mapa.

**Não foram executados** testes, typecheck, build, benchmark, trace, `npm ci`, protótipos ou chamadas externas. Nenhuma chave foi solicitada, lida, copiada ou impressa. O mapa também determina autorização específica antes de iniciar a confirmação D98; essa condição foi respeitada.

### Legenda

- **Compatível:** a intenção e as regras atuais podem coexistir sem mudança.
- **Conflitante:** a intenção reportada difere de uma regra canônica vigente ou há risco de interpretação contraditória.
- **Sem evidência:** não há documento/código/prova suficiente para afirmar o fato ou o resultado.
- **Precisa de decisão:** exige aprovação do responsável antes de virar regra, SPEC, roadmap ou execução.
- **Resultado relatado:** consta em material anterior, mas não foi reproduzido contra este HEAD.

## 3. Matriz de conciliação A01–A10 do mapa mestre

| ID | Classificação | Confronto e resultado | Gate necessário |
|---|---|---|---|
| **A01 — Central de Diagnósticos** | **Precisa de decisão** | Intenção conversacional está registrada no mapa (central permanente, falhas/eventos relevantes, notificações discretas, deduplicação/agregação, exportação sanitizada). Não há equivalente aprovado nos nove canônicos nem no estudo. Lacuna, não rejeição. | Aprovar princípios e escopo; depois elaborar SPEC de eventos, UI, storage, retenção, acesso e privacidade. Não inserir automaticamente na PERF. |
| **A02 — Responsabilidade por testes reais** | **Conflitante / precisa de decisão** | D91 canônica determina stubs para automação e serviço real validado pelo responsável na própria máquina. O mapa registra intenção de a Arena executar também validações reais se houver acesso seguro. Não substituir D91 por inferência. | Deliberar revisão formal de D91 e limites de credenciais, autorização, disponibilidade do ambiente e prova mínima quando acesso real não existir. |
| **A03 — M1–M8** | **Compatível quanto às capacidades; precisa de decisão quanto ao corte/ordem** | O mapa prioriza M1–M4 e adia avaliação de M5–M8; o estudo descreve M1–M8 como propostas. Não são fatias oficiais. O mapa diz para não presumir M1–M4 antes da 13 sem verificar as dependências reais. | Escolher M1–M3 ou M1–M4 e a posição relativa às Fatias 13–15; não renumerar até aprovação explícita. |
| **A04 — D98** | **Compatível; execução pendente** | D98 define microfatia PERF entre 12 e 13, SCM + Explorer, trace CDP + protótipo virtualizado em fixture, antes de SPEC/obra. A nota anterior sustenta a hipótese, mas não encerra a confirmação. | Autorização específica para investigação; depois preservar evidência e apresentar SPEC separada para aprovação. |
| **A05 — metas PERF** | **Sem evidência suficiente / precisa de decisão** | Há medidas históricas em fixtures e objetivo qualitativo “em segundos”, mas não meta numérica aprovada de tempo utilizável, long task, ganho mínimo, volume, p50/p95 ou comportamento de timeout. | Usar a confirmação autorizada para fundamentar critérios; aprovar metas na SPEC mínima, sem inventá-las retroativamente. |
| **A06 — DEBT-23** | **Compatível; gate de escopo necessário** | D97 já requer desenho novo ao abrir a Fatia 13; a SPEC 2G não abrange automaticamente acesso total, exclusão permanente/lixeira e YOLO. | Na abertura da 13, delimitar a SPEC nova e pedir decisão antes de ampliar escopo ou comportamento de permissões. |
| **A07 — referência à carta PERF** | **Conflitante como referência de caminho** | `docs/03`, `docs/06` e `docs/09 §3.8` citam `uploads/carta_contexto_chat_arena_bug_desempenho.md`; a carta lida está em `/home/user/notas_temporarias/carta_contexto_chat_arena_bug_desempenho.md`. O caminho canônico está desatualizado no workspace observado. | Propor correção pontual só depois de autorização para editar canônicos; não alterada nesta auditoria. |
| **A08 — testes de `usage`** | **Sem evidência / precisa de decisão de procedimento** | Teste com stub valida parsing/contrato, não prova usage real. O estudo registra prova real bloqueada por falta de configuração e sua auditoria posterior não reproduziu resultados. | Definir política segura; se não houver ambiente real autorizado, reportar “não executado/bloqueado” e não declarar aceitação real. |
| **A09 — writer/transcript/FTS5** | **Sem evidência independente suficiente** | Há relatório anterior de prova FTS5 e benchmark de JSONL com 200 mensagens; `09_AUDITORIA_RASTREABILIDADE.md` os classifica como registrados, não reproduzidos, sem logs/script/fixture brutos. Isso não prova necessidade nem ausência de necessidade de append-only/FTS5. | Benchmark controlado e reprodutível antes de propor migração ou adoção. |
| **A10 — privacidade/exclusão** | **Precisa de decisão antes de novas capacidades** | M1–M8 e o mapa pedem isolamento, sanitização, exportação/exclusão e retenção; não há política única aprovada para transcript, checkpoint, memória, índice e diagnóstico. | Aprovar política coerente de escopo, sanitização, retenção e exclusão antes de persistir derivados ou logs. |

## 4. Desempenho de SCM e Explorer — evidência e limites

### 4.1 Resultados históricos disponíveis, não reproduzidos nesta auditoria

A nota `/home/user/notas_temporarias/diagnostico_desempenho_explorer_scm_2026-10-21.md` relata fixtures temporárias em `/tmp`, cache aquecido e `core.untrackedCache=false`/`core.fsmonitor=false`:

| Fixture SCM | `GitHost.status` mediano | `/git/status` | UI utilizável | Maior tarefa longa | Linhas SCM relatadas |
|---:|---:|---:|---:|---:|---:|
| 1.000 | 7,74 ms | 56 ms | 1,75 s | 242 ms | 1.002 |
| 5.000 | 17,09 ms | 80 ms | 3,58 s | 1.136 ms | 5.002 |
| 10.000 | 32,00 ms | 93 ms | 6,16 s | 2.592 ms | 10.002 |
| 25.000 | 79,88 ms | 204 ms em chamada separada; 3,1 MiB | Não ficou utilizável no timeout de 300 s | Sem medida válida | Sem medida válida |

A nota informa cinco medições por tamanho para `GitHost.status`. O caso de 25k **não mede duração exata de travamento**: a espera visual expirou e o request de 204 ms foi medido separadamente. No Explorer, 1.000 filhos: 2,16 s, 2 chamadas `/fs/list`, 1.002 `/fs/stat`, 1.001 linhas e long task máxima de 354 ms. O teste com 5.000 filhos expirou em 240 s sem resultado intermediário; é inconclusivo.

A mesma nota relata 48 testes direcionados de Git/Explorer/filesystem e typecheck aprovados. Não há log bruto, script/fixture versionados ou vínculo verificável desses resultados ao HEAD atual. Citá-los apenas como **resultados relatados em 21/10**, não como prova independente desta auditoria.

### 4.2 Corroboração estática no código atual

- `platform/apps/workbench-v2/src/modules/explorer-search/server/git/gitHost.ts`, `GitHost.status()` (aprox. 204–214): verifica o repositório e executa `git status --porcelain=v2 -z --branch --untracked-files=all`. O adapter `execFile` usa `maxBuffer: 16 MiB` e timeout de 15 s. Não foi encontrado limite de 10k entradas no caminho observado; a saída completa é parseada, convertida e ordenada.
- `ui/attach/changes/ChangesList.tsx`, `ChangesList`/`GroupRows` (aprox. 50–148): `group.items.map(...)` constrói uma linha React por recurso; não há virtualização nesse componente.
- `core/git/gitService.ts`, `refresh()`/`refreshNow()` (aprox. 178–205): debounce de 300 ms e token para descartar resposta obsoleta. O token não cancela o processo Git já lançado; o timeout fixo não equivale a cancelamento solicitado pelo usuário/serviço.
- `core/treeState.ts`, `ensureResolved()` (aprox. 102–146): lista filhos e faz `Promise.all(entries.map(...fs.stat...))`, uma chamada stat por entrada incluída, sem limite de concorrência nessa rotina.
- `TreeState.visibleRows()` (aprox. 178–191) achata todas as linhas visíveis. `ui/ExplorerView.tsx` percorre `rows` e monta `RowShell` por linha; a altura da lista é calculada por `rowCount`, sem virtualizador/filtro de viewport no caminho examinado.

Existem testes nomeados de Git/Explorer, como `gitHost.test.ts`, `gitService.test.ts`, `treeState.test.ts`, `explorerView.test.tsx` e `fsHost.test.ts`; sua presença não comprova aprovação no HEAD corrente.

### 4.3 Conclusão calibrada e confirmação futura

- **Fato de código:** SCM constrói linhas por item; Explorer faz `stat` por filho e materializa linhas visíveis; o resultado obsoleto do Git é descartado sem abortar o subprocesso.
- **Resultado relatado:** em 5k/10k, request/backend era da ordem de dezenas de milissegundos e a UI demorava segundos, com long tasks crescentes.
- **Inferência forte:** o custo de UI é candidato importante à lentidão SCM sintética; Explorer tem, além da renderização, o volume de chamadas stat.
- **Não provado:** causa exclusiva do vídeo, irrelevância do Git em outros hosts/repos ou suficiência isolada da virtualização.

`docs/09 §3.8` define o teste seguro: fixture descartável, Vite 5175; nunca mutar fixture na 5174/repo real; trace CDP em 5k/10k correlacionando `/git/status`, long tasks, commits React e nós DOM; protótipo virtualizado temporário mantendo fixture/Git/API; Explorer 1k/5k com logs progressivos de list/stat. A SPEC ainda precisa de critérios mensuráveis derivados dessa evidência. O ZIP Code-OSS 1.138.0 mencionado na nota foi consultado estaticamente, não compilado/executado; não confundir com a régua de fidelidade VS Code 1.135.0 dos canônicos.

**Gate operacional:** a intenção/D98 não basta para iniciar a confirmação por si só. A autorização específica para rodar trace/protótipo continua necessária; depois da investigação, qualquer integração de produção requer SPEC e aprovação próprias.

## 5. Central de Diagnósticos — intenção, divergência e formalização

### 5.1 O que consta

O mapa mestre anexo registra como **ALINHADO EM CONVERSA** o desejo de uma Central permanente com: registro de falhas e eventos relevantes; notificações discretas apenas para problemas importantes; registro silencioso de eventos comuns; deduplicação/agregação; exportação sanitizada; evolução futura para diagnóstico de ferramentas, backend, UI e contexto.

Nos documentos e código consultados antes de receber o mapa, não encontrei aprovação canônica, interface ou armazenamento persistente com esse nome/contrato. Essa ausência é lacuna documental, **não revogação da intenção**. D98 exige um trace CDP temporário; M1 propõe snapshot contextual por request; M8 recomenda telemetria/logs minimizados. São escopos distintos, nenhum substitui a Central do produto.

### 5.2 O que falta decidir

A Central permanece **intenção conversacional a formalizar**, não recurso aprovado para construir. Antes de SPEC, deliberar: categorias e severidade; eventos registrados; correlação sem conteúdo sensível; localização e estados da UI; armazenamento local versus eventual telemetria externa; consentimento/ativação; deduplicação; limites de tamanho; retenção, limpeza e exportação; controles de acesso; filtros para segredos. O mapa proíbe presumir envio externo e recomenda não registrar chaves, prompts completos, conteúdo de arquivos ou respostas de ferramentas por padrão.

**Recomendação, não decisão:** manter separadas (a) confirmação D98 temporária, (b) observabilidade de contexto/request M1 e (c) Central persistente. Não incluir a Central completa na PERF sem aprovação explícita.

## 6. Memória/contexto — código atual e intenções reportadas

### 6.1 Fatos verificados no baseline local

- `server/session-persistence/index.ts` (`transcriptEntries`, `restoreMessages`, `saveSession`) grava referências com `chatId` e restaura mensagens no chat correspondente; mensagens ainda em streaming não são persistidas. `transcripts.ts::writeTranscript()` reserializa o arquivo JSONL inteiro em arquivo temporário e faz `rename`; SQLite guarda metadados de sessão. `working` é normalizado na restauração, não reanima uma execução.
- `App.tsx::montarHistorico()` (aprox. 1660) filtra bolhas vazias, running, canceladas ou de erro e as projeta como `{role, content}`. `handleSend()` (aprox. 1958–2000) envia todo o histórico textual elegível do chat atual junto com o turno novo. Não há checkpoint/compactação/busca seletiva nesse caminho.
- `agir/server/agir.ts::rodarAgir()` mantém pedidos e resultados tipados durante o loop ativo. No turno futuro, a UI recompõe `role/content`; cartões de ferramenta não são o transcript estruturado integral que o runtime consumiu.
- Estado de “Continuar” após teto/erro é em memória no servidor. Restaurar histórico não é retomar exatamente execução; não há replay durável após reinício.
- `components/ChatInput.tsx` calcula `min(92, 18 + round(text.length / 9) + attachments.length * 4)` (aprox. 156) e exibe “% do contexto utilizado” (aprox. 693–695). Não mede tokens nem payload; é mock visual.
- `server/chatAlvo.ts::obterAlvoDeConversa()` fornece protocolo, modelo, temperatura e `maxSaida`, mas não o limite `contexto`; `conversa/server/requisicao.ts` monta payloads por protocolo, mas o caminho auditado não interpreta `usage` real. Os provedores podem reportar usage diferentemente; ainda não há prova de uso real chegando ao medidor.

A restauração do mesmo chat e espera por nova instrução já têm base no código. A lacuna principal é continuidade de chat longo, fidelidade de tool exchange e montagem honesta do orçamento — não memória automática compartilhada entre chats.

### 6.2 Intenções de produto registradas no mapa mestre

As seguintes diretrizes são **intenção reportada e pendente de SPEC/aprovação**, não implementação:

1. Compactação automática, com opção manual; transcript original integral sempre preservado.
2. Alertas de ocupação em 75% e 90%.
3. Preferir usage real fornecido pelo provedor; sem isso, estimativa marcada como tal ou estado indisponível.
4. Limites por modelo/provedor, com ajuste manual e origem visível; compactação usando o modelo ativo e respeitando orçamento/falhas.
5. Contexto ativo como resumo/checkpoint + mensagens originais recentes + referências recuperáveis ao histórico completo.
6. Busca manual primeiro dentro do chat atual; recuperação da IA entre chats apenas após habilitação explícita, nunca por padrão.
7. Memória persistente por projeto, com sugestão da IA e gravação dependente de aprovação do responsável.
8. Armazenamento local em `~/.agente_window`, isolamento por projeto/conversa, eventos de ferramentas limitados/estruturados/sanitizados, exportação e exclusão com efeitos claros.
9. Retomada segura após interrupção sem reexecutar ferramentas/ações de escrita automaticamente.
10. Priorizar continuidade básica M1–M4 e avaliar M5–M8 depois, conforme dependências e aprovação.

Esses itens conciliam-se em grande parte com as propostas do estudo, mas os thresholds, fonte do limite, tipo de tokenizer, retenção, schema, UI, falhas e consentimento ainda não estão fechados. O escopo isolado por chat e a separação entre restaurar transcript e reviver execução aparecem também nas notas de 22/10.

### 6.3 M1–M8: dependências do estudo, com ressalvas do mapa

| Rótulo do estudo | Proposta | Dependências principais | Situação de alinhamento |
|---|---|---|---|
| **M1** | Medição/orçamento por request; reported/estimated/configured/unknown; medidor honesto | Provider/modelo efetivos, uso por protocolo, origem do limite, Conversa/Agir | Alinhado ao desejo do mapa; ainda sem usage real comprovado e sem especificação de thresholds/fonte de limite. |
| **M2** | Transcript por chat estruturado, ordenado e fiel a chamadas/resultados/aprovações/erros/cancelamentos | Persistência, IDs/sequência, sanitização, retenção, testes de writer | Base proposta para M3 e recuperação; não implica migrar JSONL para append-only sem benchmark. |
| **M3** | Checkpoint/resumo versionado + cauda recente, preservando fonte | M1 + M2, fronteiras seguras de tool rounds, tratamento de falha | Alinha-se à compactação automática/manual; limiares e formato continuam pendentes. |
| **M4** | Busca manual literal e navegável no transcript do chat atual | M2; M3 ajuda, mas não é dependência estrita | É o limite funcional que distingue M1–M4; não concede cross-chat ao modelo. |
| **M5** | Memória explícita por projeto, editável e com proveniência | Origem confiável M2, distinção em relação a M3, aprovação/retenção/escopo | Coerente com a intenção do mapa; escrita precisa de aprovação; fora do primeiro corte sugerido. |
| **M6** | Recuperação histórica pelo agente, com ferramenta/ACL/origem/limite | M1 + M2/M4, permissões; M5 se consultar memória | Cross-chat deve permanecer desabilitado sem habilitação explícita; busca manual da UI não equivale a tool. |
| **M7** | Reconstrução operacional observando workspace/Git, sem replay | M2/M3, estado Agir, política de aprovação; coordenar com ferramentas da Fatia 13 | Problema diferente de restaurar transcript; M7 é posterior/candidato e pode tocar contratos da 13. |
| **M8** | Hardening, privacidade, concorrência, desempenho e homologação integrada | Apenas capacidades efetivamente aprovadas | Gate proposto, não obrigação atual nem autorização para alargar roadmap. |

O estudo anterior sugere M1→M2→M3, depois M4; o mapa registra prioridade de **M1–M4**, mas deixa **M1–M3 versus M1–M4** e o posicionamento em aberto. A auditoria não conclui que M1–M4 devem anteceder a Fatia 13: devem ser verificados contratos de Agir/terminal, writer, UI e testes antes de propor ordem.

## 7. Testes automatizados e serviços reais

### 7.1 Regra vigente e intenção nova

- **D91 canônica:** fluxos automatizados usam stub local; validação com serviço real fica com o responsável na máquina dele; não pedir/colar chaves na conversa ou no repositório.
- **Mapa mestre:** registra preferência por a Arena executar o máximo de trabalho técnico — unit, integração, E2E, regressão, benchmark e possível validação real se houver acesso legítimo/seguro. Isso **não revoga D91**; o próprio mapa pede deliberação formal. Não solicitar nem inferir que chaves estejam disponíveis.
- Se acesso real não existir, o resultado correto é “não executado/bloqueado”, com a menor etapa necessária indicada e sem declarar aprovação. Homologação funcional do responsável continua sendo coisa distinta de testes técnicos feitos pela Arena.

### 7.2 Evidência de testes anterior e proveniência

`estudo_memoria_contexto_2026-10-22/08_PROVAS_TECNICAS.md` relata prova FTS5, benchmark JSONL com 200 mensagens, typecheck aprovado e suíte com 906 pass/12 fail/16 skip; registra que `usage` real ficou bloqueado. O `09_AUDITORIA_RASTREABILIDADE.md` classifica execuções como **registradas anteriormente, não reproduzidas** por falta de logs brutos, script/fixture e vínculo inequívoco ao baseline. A nota de performance relata 48 testes direcionados e typecheck, sem artefatos reproduzíveis. Nenhum desses relatos equivale a uma execução contra o HEAD atual.

`docs/09 §3.7` mantém a bateria E2E 08–12 em ordem, com stubs e isolamento de fixtures; §3.8 exige a fixture PERF na 5175 e diz que a confirmação ainda não ocorreu. Testes unitários com usage fixture provam parsing/contrato, não a resposta real de um serviço. Homologações anteriores com Ollama/LiteLLM não provam que `usage` real esteja integrado ao medidor.

### 7.3 Opções de política para deliberar sobre D91

- **Opção A — manter D91 como está:** Arena executa automatizados determinísticos; a validação real fica com o responsável na própria máquina. Menor dependência de credenciais, mas exige que o responsável faça a prova de provider quando o critério exigir.
- **Opção B — revisão condicional de D91:** autorizar execução real pela Arena **somente** quando houver ambiente e acesso legítimos disponibilizados por mecanismo seguro, com escopo de chamadas, controle de segredo, redaction e logs mínimos aprovados. Sem acesso, classificar bloqueado/não executado; nunca pedir chave no chat.
- **Opção C — modelo híbrido com prova técnica pela Arena e uso final pelo responsável:** Arena valida real usage/protocolo se o ambiente permitir; o responsável ainda confirma o comportamento funcional na máquina real. A SPEC define qual evidência satisfaz cada gate.

Nenhuma alternativa foi aprovada nesta auditoria. Nenhuma credencial foi verificada, usada ou solicitada.

## 8. Proposta de integração documental — somente após aprovação

Não editei canônicos. Se o responsável aprovar formalização, esta é uma proposta de mudanças **pontuais**, respeitando o máximo de nove documentos e a autoridade dos arquivos:

| Documento | Atualização candidata após decisão | O que não fazer |
|---|---|---|
| `docs/01 - COMECE AQUI.md` | Apenas se necessário, apontar a hierarquia atualizada de decisão/spec/homologação. | Não transformar o mapa mestre em norma por simples presença no workspace. |
| `docs/02 - VISAO GERAL.md` | Registrar comportamentos de produto aprovados: Central, memória/contexto, isolamento, exportação/exclusão, uso/alertas. | Não inserir ainda as intenções como requisitos já decididos. |
| `docs/03 - ESTADO ATUAL.md` | Atualizar estado somente depois de autorização D98, execução e aprovação; registrar próximo gate e evidência real. | Não afirmar que trace, teste, protótipo ou SPEC ocorreu antes de ocorrer. |
| `docs/04 - ARQUITETURA E REGRAS DURAS.md` | Após desenho, registrar fronteiras/portas para diagnósticos, usage, transcript/checkpoint/busca/memória e dados/sanitização. | Não fixar banco, Casa, FTS5, embeddings ou esquema antes da decisão técnica. |
| `docs/05 - DECISOES.md` | Formalizar D98 para autorização de investigação se necessária; registrar decisões sobre Central, revisão de D91, corte M1–M4 e privacidade. | Não sobrescrever D91 nem decisões D95–D98 sem deliberação explícita. |
| `docs/06 - PROXIMAS FASES E DIVIDAS.md` | Só após escolha, registrar escopo oficial, dependências com 13/14/15, gates e prioridade, sem renumerar por inferência. | Não converter M1–M8 em 13–20, não reabrir Fatia 15 por causa da PERF. |
| `docs/07 - HISTORICO.md` | Registrar cronologia de confirmação D98, resultados, limitações, decisões e homologação quando ocorrerem. | Não substituir resultados anteriores sem manter proveniência e distinção entre medição e relato. |
| `docs/08 - HOMOLOGACAO.md` | Definir critérios de aceite humanos para Central/continuidade e separar uso real, resultado automatizado e homologação funcional. | Não tratar testes de stub como teste real nem como homologação do responsável. |
| `docs/09 - TESTES E AMBIENTE.md` | Após aprovação de processo, acrescentar comandos/logging/ambiente seguro para D98 e política de execução automatizada/real com proveniência. Corrigir a referência da carta PERF para o caminho existente mediante aprovação. | Não iniciar D98 sem autorização; não testar mutações na 5174; não incluir credenciais/dados sensíveis em logs. |

O arquivo `MAPA_MESTRE_DE_ALINHAMENTO.md` permanece documento de transferência, não canônico. A referência de caminho da carta PERF foi identificada como inconsistente, mas não corrigida. Uma atualização documental futura deve ser mínima, autorizada e preservar histórico.

## 9. Sequência candidata e dependências com as Fatias 13–15

### 9.1 O que é canônico

- Fatia 12 está homologada (D97).
- Micro-PERF está definida por D98 entre 12 e 13, sem renumerar e com confirmação antes de SPEC/obra.
- Fatia 13 trata terminal-para-o-agente e exige desenho novo para DEBT-23; 2G não cobre automaticamente esse acréscimo.
- Fatia 14 é Personalizações/Skills/barra esquerda.
- Fatia 15 é janela única de abas/DEBT-12 e roteia Editor/Explorer/Busca/SCM.
- M1–M8 não alteram esses marcos.

### 9.2 Ordem candidata sem renumeração — precisa de autorização

1. **Deliberação de processo:** autorizar ou não a investigação D98; resolver se e como rever D91; confirmar que a Central requer uma formalização separada.
2. **Se D98 for autorizada:** executar apenas confirmação isolada em fixture, preservar HEAD, ambiente, script, logs e resultados brutos; não integrar protótipo.
3. **Após evidência:** apresentar SPEC mínima PERF com metas e alternativas; aguardar aprovação antes de código.
4. **Continuidade:** decidir M1–M3 versus M1–M4 e sua posição relativa à 13. O estudo dá dependência M1+M2→M3 e M2→M4; o mapa corretamente pede validar possíveis conflitos com Agir/terminal, persistência, UI e testes. Não se afirma que a sequência tem de ficar antes da 13.
5. **M5–M8:** avaliar posteriormente e em separado, conforme a intenção do mapa; não entram automaticamente na primeira entrega.
6. **Central permanente:** formalizar princípios e política de dados, depois criar SPEC independente, sem acoplar à PERF por conveniência.
7. **Homologação/roadmap:** só registrar numeração, ordem, alterações canônicas e aceites após decisão expressa. Preservar 13, 14 e 15 até lá.

### 9.3 Dependências e sobreposições a verificar

- **PERF ↔ 15:** compartilham as superfícies Explorer/Busca/SCM, mas D98 declara que não reabre a 15. Planejar commits/ordem para não confundir a reforma de abas com a correção de escalabilidade.
- **M1/M2/M3 ↔ 13:** M1 e M2 podem tocar Agir, contratos de provider, persistência e tela; a Fatia 13 também estende o runtime com terminal e DEBT-23. Há potencial conflito de contratos/aceite, não uma dependência formal provada. Mapear antes de escolher “antes” ou “depois”.
- **M4 ↔ chat UI:** busca manual depende de identidade/origem M2; não requer busca de workspace nem cross-chat.
- **M5/M6 ↔ segurança:** projeto/ACL, aprovação de memória, prompts históricos não confiáveis e limite de tokens são gates antes de recuperação automática.
- **M7 ↔ 13:** retomada operacional futura deve reconhecer novas ferramentas/ações do terminal, checar estado e exigir nova autorização; não reexecutar ação interrompida.
- **M8:** só abrange o conjunto efetivamente aprovado; não pode virar um atalho para ampliar escopo ou declarar homologação sem provas.

## 10. Perguntas de aprovação para o responsável

1. **D98:** autoriza especificamente a execução do trace CDP e protótipo virtualizado temporário na fixture/porta 5175, sem integração de produção? Se não, a etapa permanece pendente.
2. **Central:** confirma que a intenção registrada no mapa é requisito a formalizar? Aprova como princípios iniciais notificações apenas para eventos importantes, registro comum silencioso, deduplicação/agregação e exportação sanitizada — deixando a SPEC de dados/retention para depois?
3. **D91:** prefere manter a regra atual (Opção A), revisá-la condicionalmente à disponibilidade de acesso seguro da Arena (Opção B), ou adotar o híbrido (Opção C)? Nenhuma opção implica pedir uma chave no chat.
4. **Continuidade inicial:** escolhe M1–M3 ou M1–M4 como corte para uma SPEC? A escolha ainda não aprova implementação.
5. **Posição no roadmap:** a iniciativa escolhida deve ser analisada antes ou depois da Fatia 13? A resposta deve vir após mapear os impactos em Agir/terminal/persistência/UI; não muda os números 13–15.
6. **Alertas e limite:** confirma os thresholds 75%/90% como requisito inicial ou prefere que sejam avaliados na SPEC? Como sinalizar limite/configuração cuja origem seja manual/default/desconhecida?
7. **Privacidade/ciclo de vida:** aprova armazenamento local isolado, aprovação humana para gravar memória de projeto, exportação e exclusão explícitas? Qual retenção se aplica aos logs, checkpoints, índices e eventos de ferramenta?
8. **Prova real de usage:** se existir ambiente legítimo e seguro, autoriza que a Arena execute a validação técnica por mecanismo local apropriado? Se não existir, aceita “bloqueado/não executado” e validação mínima do responsável em seu ambiente?
9. **PERF:** após a medição autorizada, quais critérios devem entrar na SPEC: tempo até interagir, p50/p95, long tasks, tamanho máximo, comportamento de cancelamento, ou combinações? Os números devem ser definidos com base no trace, não antes dele.
10. **DEBT-23:** ao abrir a Fatia 13, confirma que o novo desenho de escopo/permissões será uma gate própria, sem herdar automaticamente os termos da 2G?

## 11. Limites e declaração de não implementação

Este relatório foi atualizado para incorporar o `MAPA_MESTRE_DE_ALINHAMENTO.md` anexado e a matriz A01–A10. É o único arquivo produzido/modificado nesta auditoria; o mapa anexado e o estudo preexistente foram preservados. Nenhum código, teste, canônico, roadmap ou histórico Git foi alterado. Não executei testes, benchmark, trace, protótipo, build, typecheck, instalação de dependências ou chamadas a provedor. Nenhuma credencial foi solicitada/usada. Não houve commit, merge, troca de branch, consulta ao remoto ou renumeração. Recomendações e alternativas dependem de aprovação do responsável.
