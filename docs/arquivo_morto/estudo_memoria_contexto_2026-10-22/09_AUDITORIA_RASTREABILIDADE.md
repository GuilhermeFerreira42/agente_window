# Auditoria de rastreabilidade das provas técnicas

**Data:** 23/10/2026  
**Escopo:** auditoria documental e de repositório, antes de qualquer decisão de implementação.  
**Resultado geral:** a existência do baseline e a natureza documental do commit `6abf789` foram confirmadas nesta auditoria. Os resultados de execução descritos em `08_PROVAS_TECNICAS.md` não foram reproduzidos aqui; exceto por verificações estáticas e metadados do lockfile, permanecem registros da execução anterior, sem logs brutos que os vinculem independentemente ao baseline.

> Este relatório é um adendo de auditoria. Não corrige nem substitui `08_PROVAS_TECNICAS.md`; preserva as afirmações anteriores como registro e separa-as do que foi confirmado agora. Não aprova M1–M8.

## 1. Resumo executivo

A divergência temporal é plausível e não é, por si só, uma contradição factual: `00`, `01` e `02` descrevem uma leitura estática datada de 22/10/2026, sem Git disponível naquela etapa; `08_PROVAS_TECNICAS.md` está datado de 23/10/2026 e descreve um suplemento posterior, depois da criação do baseline. O repositório confirma que o baseline `376d677` precede o commit documental `6abf789` e que o diff entre eles não altera `platform/` nem qualquer arquivo de código.

Isso **não demonstra que `typecheck`, testes, FTS5 ou benchmark foram realmente executados** nem que os resultados vieram daquele baseline. Não há no repositório logs brutos do Vitest/typecheck, script/saída do benchmark ou transcrição da prova SQLite; `08` contém resumos narrativos. O Git fixa a árvore de código e o lockfile, não registra execuções de comandos. O histórico torna a associação alegada plausível, mas não a prova.

Pontos confirmados diretamente nesta auditoria:

- checkout Git válido em `/home/user/agente_window`, branch `main`; no início da auditoria `HEAD` era `6abf789`, com status limpo;
- `6abf789` é filho de `376d677`; ele contém somente arquivos do pacote em `docs/arquivo_morto/` (incluindo o ZIP), sem mudanças em código, e a árvore `platform/` é idêntica nos dois commits;
- o lockfile do baseline fixa `better-sqlite3` em `12.11.1`, mas não comprova a versão/build de SQLite efetivamente carregada em uma execução;
- as expectativas estáticas de alguns testes citadas em `08` correspondem a diferenças observáveis no código atual, sem que isso prove que os testes falharam naquela execução;
- neste ambiente de auditoria não há `node_modules` de `platform/`, nem credenciais OpenAI/Anthropic ou arquivo padrão de configuração de provedores.

**Conclusão:** atribuir os resultados ao código do baseline é compatível com a árvore Git; atribuir-lhes uma execução realmente observada no baseline é **parcial/não verificável** com os artefatos disponíveis. Até se preservar o log original ou repetir as provas sob protocolo controlado, números e resultados de execução devem ser citados como “registrados em `08`, não reproduzidos nesta auditoria”, não como validação independente.

## 2. Escopo e método

Foram lidos `00_INDICE.md`, `01_RESUMO_EXECUTIVO.md`, `02_ESTADO_ATUAL_E_EVIDENCIAS.md`, `04_ARQUITETURA_E_CONTRATOS.md`, `06_TESTES_RISCOS_RASTREABILIDADE.md`, `08_PROVAS_TECNICAS.md`, além de referências em `05_LICENCAS_E_DEPENDENCIAS.md`, `07_PLANO_DE_FATIAS_E_RENUMERACAO.md` e M2/M4/M8 quando pertinentes. Foram consultados ainda o `package-lock.json`, scripts de `package.json`, configuração Vitest/TypeScript e os trechos dos testes e componentes relacionados às falhas reportadas.

Verificações de repositório somente de leitura, executadas em `/home/user/agente_window`:

```text
git rev-parse --show-toplevel
git status --short --branch
git branch --show-current
git log --oneline --decorate -8
git show --no-patch --format=fuller 376d677
git show --no-patch --format=fuller 6abf789
git diff --stat 376d677..6abf789
git diff --name-status 376d677..6abf789
git diff-tree --no-commit-id --name-status -r 6abf789
git diff --quiet 376d677..6abf789 -- platform
```

Também foram feitas buscas por arquivos com nomes de logs/resultados/benchmarks no repositório, leitura de assertions e de código correspondente, comparação do hash do lockfile do baseline com o atual, uma comparação estática de tokens CSS segundo a expressão usada por `themeTokens.test.ts` e verificações booleanas de presença de credenciais/configuração. Nenhum segredo foi lido ou impresso.

**Não foram executados** `npm ci`, FTS5, `npm run typecheck`, `npm run test`, build, benchmark ou chamada a provedor. Não se alteraram dependências para habilitar tais execuções. No estado auditado, os diretórios `platform/node_modules` e `platform/apps/workbench-v2/node_modules` não existem; uma tentativa limitada de ler metadados do pacote instalado confirmou a ausência (`MODULE_NOT_FOUND`).

Ambiente observado nesta auditoria: Node `v20.20.2`, npm `10.8.2`, Linux x86_64. Isso descreve o ambiente atual da auditoria, não comprova o ambiente histórico em que os resultados de `08` teriam sido obtidos.

## 3. Estado observado do repositório

### 3.1 Histórico e working tree

Estado inicial observado:

```text
$ git status --short --branch
## main

$ git branch --show-current
main

$ git log --oneline --decorate -2
6abf789 (HEAD -> main) docs: provas tecnicas estudo memoria
376d677 baseline: estado atual pós Fatia 12 DELETE validada
```

Identidades e horários fornecidos pelo próprio banco Git:

| Commit | Hash completo | Pai | Data do commit (UTC) | Mensagem |
|---|---|---|---|---|
| Baseline | `376d677c3f5cba01ffc852199c3ef69f64a54bdc` | raiz | 23/10/2026 11:50:55 +0000 | `baseline: estado atual pós Fatia 12 DELETE validada` |
| Documentação | `6abf789af305a12641344dabf0058fef4a2b1459` | `376d677c3f5cba01ffc852199c3ef69f64a54bdc` | 23/10/2026 11:58:54 +0000 | `docs: provas tecnicas estudo memoria` |

O intervalo entre os timestamps é de 7 min 59 s. É compatível com a hipótese de uma execução e elaboração documental posterior, mas timestamp de commit não é log de comando e não permite concluir quando testes/benchmark ocorreram.

### 3.2 Conteúdo do commit documental

`git diff-tree` lista quatro caminhos, todos dentro do pacote do arquivo morto:

```text
A docs/arquivo_morto/estudo_memoria_contexto_2026-10-22.zip
M docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/00_INDICE.md
M docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/04_ARQUITETURA_E_CONTRATOS.md
A docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/08_PROVAS_TECNICAS.md
```

Não há alterações em código, manifests ou canônicos entre baseline e `6abf789`; `git diff --quiet 376d677..6abf789 -- platform` retornou sucesso e o diff de caminhos fora do pacote do estudo ficou vazio. A mudança em `04_ARQUITETURA_E_CONTRATOS.md` documenta FTS5 como viável para avaliação, sem decisão de adoção. O ZIP é um arquivo do mesmo pacote documental, não evidência de execução.

O status estava limpo antes desta auditoria. O relatório presente é novo e não foi commitado; depois de sua criação, espera-se somente esse arquivo como não rastreado. Nenhuma alteração local anterior foi descartada.

### 3.3 Baseline, código e dependências

O commit baseline existe e é pai direto do commit documental. O diff comprova que os arquivos Git-tracked de `platform/` não mudaram entre eles. O hash do `platform/package-lock.json` obtido do baseline coincide com o arquivo atual (`e774cd3a8120b58beaf51c503e7e13a0d8f6f7e981fe5020d40b4b726f1c6eaa`), e o lock fixa `better-sqlite3@12.11.1`.

Isso permite afirmar que o **código e o lockfile versionados** eram iguais no baseline e no commit documental. Não permite identificar o binário instalado durante uma prova antiga: `node_modules` é ignorado/não versionado, não está presente agora e não existe hash/log da instalação anterior. A versão do lockfile, por si só, tampouco confirma compile options ou versão de SQLite runtime.

## 4. Matriz de rastreabilidade das provas

### Legenda de classificação

- **Confirmada nesta auditoria:** observação direta nesta inspeção; vale para o estado e escopo declarados, não automaticamente para a execução histórica.
- **Registrada anteriormente, não reproduzida:** aparece em `08`, sem artefato bruto e sem repetição nesta auditoria.
- **Parcial:** algum componente foi confirmado diretamente, mas o resultado de execução ou sua associação histórica permanece sem prova suficiente.
- **Não verificável:** os artefatos disponíveis não permitem confirmar o fato alegado.

| Item | Resultado informado em `08` | Evidência concreta disponível nesta auditoria | Vínculo com commit/estado | Reprodutibilidade e limitações | Classificação/conclusão |
|---|---|---|---|---|---|
| FTS5 / `better-sqlite3` | Pacote `12.11.1`, SQLite `3.53.2`, `ENABLE_FTS5`, criação de tabela e consulta `MATCH` bem-sucedidas. | `package-lock.json` do baseline confirma pacote `12.11.1`; `node_modules` ausente; não há stdout, script exato ou arquivo de banco/probe. A versão SQLite, compile options e resultado de `MATCH` constam apenas na narrativa de `08`. | A dependência declarada é vinculável ao baseline. O binário carregado e seus compile options não são vinculáveis por Git. | Reproduzível com dependências instaladas e banco `:memory:`; seria uma prova isolada, sem banco de produto. Não foi executada, pois o binding não está instalado agora e não foi feito `npm ci`. | **Parcial** quanto à dependência; execução FTS5 **registrada anteriormente, não reproduzida**. Não afirmar validação atual de FTS5 com base apenas no lockfile. |
| Benchmark JSONL, 200 mensagens | Arquivo 235.429 bytes; 30 repetições de reescrita/leitura; gravação p50 1,895 ms, p95 2,419 ms; reabertura p50 1,143 ms, p95 2,084 ms; máximos e heartbeat também descritos. | `08` descreve método, massa sintética, aquecimento e resultados agregados. Não foi encontrado script do benchmark, fixture, amostra bruta, stdout, fórmula/implementação de percentis ou metadado do filesystem/dispositivo. O código fonte do writer integra `platform/` e está idêntico no intervalo Git. | A fonte usada é a árvore versionada igual ao baseline, mas o script executado e os dados exatos não estão salvos. | Reexecução controlada é possível com `HOME` novo e temporário, mas a narrativa não basta para refazer a mesma fixture byte a byte. Variações de máquina, filesystem e carga impedem tratar tempos antigos como invariantes. | **Registrada anteriormente, não reproduzida**; associação ao código do baseline é plausível, não comprovada como execução. |
| `npm run typecheck` | `tsc -b --force`, código de saída 0, aproximadamente 12,022 s. | Script `typecheck` no `package.json` corresponde ao comando citado. Não há log bruto nem artefato de saída. Dependências ausentes atualmente. | O código fonte do baseline é igual ao do commit documental; nenhum registro de processo fixa que o comando foi lançado sobre esse commit. | Reexecutável após instalação. `tsc -b --force` é um build-mode e pode gravar metadados incrementais; revisar `tsconfig`/artefatos e preservar o working tree antes de qualquer repetição. Não executado. | **Registrada anteriormente, não reproduzida**. O script existe; aprovação histórica depende do relato de `08`. |
| `npm run test` / totais | 111 arquivos; 107 passaram, 4 falharam; 934 casos: 906 passaram, 12 falharam, 16 ignorados; Vitest `2.1.9`, código 1. | `package.json` define `vitest run`, `vitest.config.ts` inclui testes `src/**/*.{test,spec}.{ts,tsx}` e usa jsdom. Os totais aritméticos de `08` são internamente consistentes (107+4=111; 906+12+16=934), mas não há saída Vitest bruta ou JSON/JUnit de resultado. | Arquivos de teste/código não mudaram do baseline a `6abf789`; o resultado histórico ainda não está ligado por log de execução. | Repetível, mas executa a suíte completa. A configuração e testes podem tocar fixtures, mocks de rede/PTY e temporários; não foram auditados os efeitos de todos os testes individuais. Dependências ausentes e não instaladas nesta auditoria. | **Registrada anteriormente, não reproduzida**. A consistência aritmética não confirma que o runner produziu esses números. |
| Quatro arquivos de teste/falhas | Falhas concentradas em `TerminalPanel.test.tsx` (9), `iconLabels.test.ts`, `themeTokens.test.ts` e `visualStates.test.ts` (1 cada). | Leitura estática confirma incompatibilidades que podem explicar falhas atuais: testes de Terminal consultam região nomeada `Terminal`, enquanto o componente declara `aria-label="Painel Inferior"`; o teste de ícones espera `title="Mostrar sessões"`, mas o botão usa `title={activeSession.title}`; o contrato visual rejeita `outline: 1px solid var(--vscode-focusBorder)`, existente no CSS; a comparação estática usada pelo teste de tokens encontra três tokens ausentes: `--vscode-quickInput-foreground`, `--vscode-quickInputList-focusBackground` e `--vscode-quickInputList-focusForeground`. | Os trechos estão na árvore atual, idêntica à árvore baseline para `platform/`. Isso confirma o estado estático atual, não o estado do runner na execução passada. | É possível reproduzir cada assertion ao rodar os testes, mas não se executaram os testes nesta auditoria. A leitura estática não confirma número de falhas, ordem, nem se outras falhas ocorreram. | **Parcial**: incompatibilidades estáticas confirmadas; a ocorrência histórica dos 12 erros e a distribuição por arquivo permanecem registradas, não reproduzidas. |
| Credenciais e `usage` real | `08` afirma ausência de `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AGENTE_WINDOW_PROVIDERS_PATH` e `~/.agente_window/providers.json`, sem request ou mock. | Nesta auditoria, os três env vars foram verificados apenas por presença/ausência booleana; nenhum está definido. O arquivo padrão não existe. `providersRepo.ts` confirma a resolução por `AGENTE_WINDOW_PROVIDERS_PATH` ou `~/.agente_window/providers.json`. Nenhuma chave foi lida/mostrada. | Confirma a ausência no ambiente atual, não o estado histórico de 23/10 nem se ocorreu tráfego externo anteriormente. Não há log de request/resposta. | A ausência atual é reproduzível com a mesma checagem local. Uma prova de usage real exigiria autorização explícita separada e credencial configurada seguramente fora do chat; nenhuma chamada foi feita. | **Parcial**: ausência atual confirmada; ausência histórica e não ocorrência de request anterior não verificáveis sem logs. O `usage` real segue **não comprovado/bloqueado**. |

## 5. Divergências documentais e interpretação temporal

1. **`01`/`02` versus `08`: fases diferentes, proveniência incompleta.** `01` e `02` são datados de 22/10 e dizem que a investigação original foi estática, sem `.git`, build, testes ou benchmarks. `08` é datado de 23/10 e descreve uma complementação após a criação do baseline. Isso torna coerente a hipótese de que a execução foi posterior à investigação original. Não há identificador de sessão, log original ou artefato externo que confirme a sessão/ambiente da execução. A conclusão correta é “provável suplemento posterior conforme o registro”, não “execução provada em outro ambiente/sessão”.
2. **`06` também é um plano sem execução.** O cabeçalho diz “nenhum teste foi executado nesta investigação” e a seção de comandos marca-os como não executados. Lido como retrato da investigação de 22/10, não contradiz necessariamente um suplemento de 23/10; sem delimitação explícita, porém, um leitor pode interpretar como status atual do pacote. Recomenda-se, após aprovação, registrar escopo temporal e remeter a `08`/este relatório, sem apagar o histórico.
3. **Baseline existe, execução não.** O commit `376d677` foi criado às 11:50:55 UTC; `6abf789` foi criado às 11:58:54 UTC e é apenas documental. A igualdade da árvore `platform/` mostra que não há mudança de código entre esses commits. Não há evento Git para `npm ci`, FTS5, benchmark, typecheck ou Vitest. O timestamp e a mensagem de `08` não substituem log de execução.
4. **Status FTS5 ainda varia entre documentos.** `05_LICENCAS_E_DEPENDENCIAS.md` e M4 ainda registram a verificação FTS5 como pendente; `04_ARQUITETURA_E_CONTRATOS.md` foi atualizado em `6abf789` e chama o suporte de confirmado. Como a prova de runtime não foi reproduzida nesta auditoria, essa atualização deve ser entendida como “confirmada no registro anterior”, não como confirmação independente atual. Uma nota futura poderá reconciliar o status sem remover a análise histórica.
5. **ZIP não é artefato de execução.** O ZIP comprometido em `6abf789` contém o pacote de documentos daquela data; não contém logs brutos de teste/benchmark. Este relatório novo não foi incluído no ZIP nesta auditoria.

## 6. O que está comprovado, parcialmente comprovado e não verificável

### Confirmado nesta auditoria

- O Git válido, a branch `main`, `HEAD` `6abf789` e status limpo no início da auditoria.
- O baseline `376d677`, seu hash completo e sua relação de pai direto com `6abf789`.
- O commit documental contém somente quatro caminhos do pacote em `docs/arquivo_morto/`; nenhum código ou canônico mudou entre os dois commits.
- A árvore `platform/` e o `package-lock.json` são iguais entre baseline e commit documental; o lock fixa `better-sqlite3@12.11.1`.
- Os scripts de typecheck/test estão configurados como descrito; existem incompatibilidades estáticas nos contratos citados. Isso é análise de fonte, não resultado de execução.
- No ambiente atual, não há `node_modules` da plataforma, nem credenciais/configuração padrão de provedor.

### Parcial

- A afirmação de que a execução, se ocorreu como descrita, usou código do baseline: plausível e compatível com a árvore Git, mas sem log que vincule comando e revisão.
- Os detalhes das falhas reportadas: alguns fatores estáticos foram corroborados, mas os 12 resultados e a distribuição histórica não foram reproduzidos.
- A ausência de credenciais para usage: confirmada agora, não demonstrada para a data do relatório anterior.

### Registrado anteriormente, não reproduzido

- FTS5 funcional e SQLite `3.53.2` no binding instalado.
- Estatísticas e comportamento medido no benchmark JSONL.
- Saída bem-sucedida de `npm run typecheck`.
- Totais e código de saída de `npm run test`.

### Não verificável com o material disponível

- Em qual sessão/ambiente exato as provas foram executadas.
- O instante efetivo de cada comando e a árvore Git realmente carregada pelo processo.
- O stdout original, artefatos do runner, script/fixture original do benchmark e configuração/binário SQLite usados naquela ocasião.
- Se houve ou não tentativa/request externo anterior: não há log de rede/provedor. O relatório anterior afirma que não houve request, e esta auditoria não fez nenhum.

## 7. Lacunas e riscos

- **Rastreabilidade de execução:** resultados numéricos em Markdown sem logs brutos podem ser propagados como validação independente, embora sejam apenas relatos da execução anterior.
- **Dependência não versionada:** `node_modules` não está no Git; lockfile fixa o pacote, não as opções de compilação SQLite nem o artefato nativo executado.
- **Benchmark sem script arquivado:** sem fixture/dataset, cálculo de percentil e saída bruta, outra execução pode não reproduzir exatamente o resultado.
- **Testes sem detalhes completos:** não há IDs/nome das 12 falhas nem log integral; a análise estática explica alguns contratos, não substitui o runner.
- **Status de teste ambíguo no pacote:** `06` e `01` são históricos, mas podem ser lidos como status atual depois do adendo 08.
- **Evidência externa ausente:** sem resposta real do provedor não existe `usage` observável; sem log, não se certifica a afirmação histórica sobre ausência de request.
- **Arquivamento:** o ZIP anterior não inclui este relatório novo; sua regeneração deve ser decidida explicitamente para preservar a distinção de versões documentais.

## 8. Ações recomendadas por prioridade

1. **P0 — Preservar proveniência antes de citar como validação.** Se os logs da sessão anterior ainda existirem em um local autorizado, arquivar cópias sem segredos e registrar o comando, timestamp, `git rev-parse HEAD`, status, Node/npm, hash do lockfile, saída completa e artefatos. Se não existirem, manter os resultados de `08` rotulados como “registrados, não reproduzidos”. Não completar lacunas por memória ou inferência.
2. **P1 — Repetição controlada das verificações locais, se aprovada.** Primeiro revisar impactos e dependências; instalar via lockfile somente quando autorizado. Para FTS5, usar banco `:memory:` e salvar script/saída. Para o benchmark, salvar script e fixture sintética, usar `HOME` temporário isolado, definir percentis e guardar amostras/saída. Para typecheck/test, guardar logs integrais e revisar artefatos laterais/fixtures antes e depois; não alterar código para “fazer passar” durante a auditoria.
3. **P1 — Fechar a rastreabilidade do baseline.** Cada log novo deve capturar o hash completo imediatamente antes da execução e `git status`; ao final, capturar novamente. Não inferir vínculo pelo commit criado depois.
4. **P2 — Reconciliar os estados documentais em adendo aprovado.** Manter `01`, `02`, `06` como história da investigação estática de 22/10, explicitar que 08 é suplemento de 23/10 e indicar o nível de evidência. Reavaliar as frases pendentes sobre FTS5 em `05`/M4 somente depois de validar ou classificar formalmente o resultado anterior.
5. **P2 — Detalhar a matriz de falhas se a suíte for repetida.** Preservar o relatório completo do Vitest, nome de cada caso, arquivo, motivo e resumo de testes ignorados. Distinguir expectativa estática de saída do runner.
6. **P3 — Usage de provedor é uma etapa separada.** Só realizar chamada externa após autorização explícita para essa chamada e configuração segura fora do chat. Registrar a resposta de usage minimizada/redigida; nunca registrar chave. Até lá, manter o critério bloqueado, sem mock apresentado como evidência real.
7. **P3 — Atualizar o ZIP apenas por decisão explícita.** Se o objetivo for distribuir o pacote auditado inteiro, gerar um ZIP novo versionado que inclua este relatório, mantendo o ZIP anterior como snapshot histórico em vez de sobrescrevê-lo silenciosamente.

## 9. Critérios objetivos para considerar a auditoria encerrada

A auditoria de rastreabilidade poderá ser marcada como encerrada quando:

1. Cada resultado de execução tiver um artefato verificável (log integral ou resultado estruturado), comando exato, timestamp, ambiente, hash da revisão e status pré/pós execução; ou estiver explicitamente reclassificado como não verificável/registrado anteriormente.
2. FTS5 tiver script de prova, versão do pacote, versão SQLite, opções de compilação e saída da criação/consulta vinculados a uma revisão identificada.
3. O benchmark tiver script/fixture sintética versionada ou arquivada, tamanho de arquivo, número de repetições, política de aquecimento, fórmula de percentil, host/FS e saída bruta, em diretório temporário isolado.
4. Typecheck e testes tiverem saída integral preservada e referência inequívoca ao hash executado; as falhas/ignorados tiverem detalhe suficiente para distinguir comportamento do produto, contrato de teste e skip.
5. O estado histórico de credenciais/requests não seja afirmado além das evidências disponíveis; `usage` real continue pendente até existir chamada autorizada e resposta real, ou o critério seja formalmente retirado.
6. As diferenças entre investigação original (22/10) e suplemento técnico (23/10) estejam explicitamente delimitadas, sem apagar versões históricas nem fazer a validação parecer retroativa.
7. O working tree permaneça sem mudanças de código, documentos canônicos ou roadmap; qualquer empacotamento adicional preserve o ZIP histórico e tenha conteúdo/versão identificados.

## 10. Declaração de preservação e não execução

Nesta auditoria não foram alterados código-fonte, `docs/01`–`docs/09` canônicos, roadmap oficial, numeração oficial ou fichas M1–M8. Nenhum teste, build, typecheck, benchmark, `npm ci` ou probe FTS5 foi executado; nenhuma chamada externa foi realizada; nenhuma credencial foi solicitada, lida ou impressa. Não houve reset, checkout destrutivo, limpeza forçada, descarte de alterações ou alteração de histórico. O único arquivo produzido por esta tarefa é este relatório novo no diretório do estudo.
