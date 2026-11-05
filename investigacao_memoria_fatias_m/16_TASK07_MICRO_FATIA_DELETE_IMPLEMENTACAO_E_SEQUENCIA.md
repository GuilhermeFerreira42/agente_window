# 16 — TASK 07: MICRO-FATIA DELETE implementada + consolidação da sequência oficial

**Data:** 2026-10-31 · **Missão:** Task 07 · **Origem:** carta do dono *"AUTORIZAÇÃO DA MICRO-FATIA DELETE E CONSOLIDAÇÃO DO ROADMAP"* (§1 a §9)
**Natureza:** **primeira missão desde a Fatia 13 que altera código de produção.**
**Estado final:** ✅ implementado · ✅ validado por testes automatizados (Linux) · ⏳ **homologação manual do dono PENDENTE** · ❌ **sem commit, sem push**
**Decisões registradas:** `docs/05 §18` — **D132, D133, D134, D135, D136**
**Relatório anterior:** `15_TASK06_DIAGNOSTICO_FATIA13_EXCLUIR_E_ALINHAMENTO.md` (diagnóstico que esta missão executa)

---

## §0 — Sumário executivo (para ler primeiro)

O dono aprovou a **R1** e autorizou restaurar a exclusão. **Não foi aberta investigação nova** — o diagnóstico da Task 06 bastou, conforme §1 da carta.

Três resultados que importam mais que o resto:

1. **A "incógnita de esforço" foi resolvida a favor do reaproveitamento.** A Task 06 registrou que o corpo da implementação de 21/10 não estava mais no código e que **não se sabia** se `44bbd67`/`133affa` existiam no repositório oficial. **Existem.** O repositório público `GuilhermeFerreira42/agente_window` está acessível, e a restauração partiu da **versão homologada por D97**, não de uma reescrita. Isso mudou o custo da missão de "reescrever e re-derivar" para "restaurar e corrigir três riscos".

2. **A prova de não-regressão é antes × depois, não uma alegação.** A suíte completa foi executada **duas vezes**: uma com os cinco arquivos revertidos ao estado anterior, outra com a restauração aplicada. **As mesmas 14 falhas apareceram nas duas rodadas**, nos mesmos cinco arquivos, **nenhuma em `agir`**. O total de testes subiu **1069 → 1096 (+27)** e **todos os 27 novos passaram**.

3. **A contradição entre testes foi resolvida pela restauração, não por máscara.** O E2E `excluir_fatia12` **sempre afirmou exclusão real e estava certo**. Os que abençoavam a regressão eram `excluir.test.ts`, `lixeira.test.ts` e o bloco F2 de `rotas.test.ts` — os três voltaram ao comportamento homologado, **com a nota explicativa preservada dentro do próprio teste**, para que a próxima pessoa a ler entenda por que aquelas asserções eram o oposto do contrato.

**O que continua NÃO homologado:** o **CRUD completo**, a **Lixeira real do Windows** (não há Windows aqui) e o **E2E** (três bloqueios de ambiente, §6). Roteiro manual de 11 passos em `docs/08`.

---

## §1 — Diagnóstico final (o que estava errado e por quê)

Reafirmado e **confirmado em código** nesta missão, sem alteração de conclusão em relação à Task 06:

| Camada | Estado antes da Task 07 | Estado depois |
|---|---|---|
| Tipo e contrato (`types.ts:14`, `contract.ts:17`) | ✅ íntegro | ✅ íntegro (não tocado) |
| Catálogo (`ferramentas.ts:56-60`) | ✅ íntegro | ✅ íntegro (não tocado) |
| Anúncio nos 4 protocolos (`vizinho.ts:179`, `anuncio.ts:49-51`) | 🔴 **prometia capacidade falsa** | ✅ **voltou a ser verdadeiro sem ser alterado** (§5.4) |
| Agent Loop / permissão (`ehMexida`, `permiteSessao:false`, allow-all `rotas.ts:351`, cartão, negação `agir.ts:184-186`) | ✅ íntegro | ✅ íntegro (não tocado) |
| Prévia do cartão (`descreverAlvoExcluir`) | 🔴 dizia *"a exclusão não está disponível"* | ✅ **mostra o alvo real** |
| **Executor `excluir` (`discos.ts`)** | ❌ **stub que nem delegava** | ✅ **executor real, chama `moverParaLixeira`** |
| **Lixeira (`lixeira.ts`)** | ❌ **corpo removido (862 bytes)** | ✅ **restaurada da versão homologada + K1/K2/K3** |
| Explorer (`App.tsx:1783`) | ✅ íntegro | ✅ íntegro (não tocado) |

**Causa-raiz (reafirmada):** **precondição órfã**. A lixeira foi desligada como medida *"temporariamente"* no episódio fail-closed da F2 (missão D119), condicionada a *"ser integrada ao helper de handles e validada por plataforma"* — e **D121 aposentou esse helper**. A exclusão ficou aguardando um componente que o projeto extinguiu. **Nenhuma decisão em `05` (D1–D126) bloqueava a exclusão.**

**Correção de um registro meu próprio (honestidade de rastreabilidade):** a Task 06 escreveu *"se `44bbd67`/`133affa` existirem no repositório oficial, restaurar é barato; se não existirem, é reescrita"* e acrescentou *"a cópia de trabalho da Arena não tem remote nem histórico real"*. **A segunda parte estava certa e a conclusão que tirei dela estava errada.** O `.git` do workspace realmente não tem remote — mas isso é uma **limitação da cópia de trabalho, não do projeto**. O repositório oficial é público e acessível. **Lição registrada:** antes de declarar histórico inacessível, clonar o remote oficial em `/home/user/.cache`; **jamais tocar no `.git` do workspace**.

---

## §2 — Cadeia forense do histórico oficial (como a versão certa foi identificada)

Clone em `/home/user/.cache/refs/aw-history` com `--filter=blob:none --no-checkout` (**nunca dentro do repositório**, conforme regra permanente do projeto). HEAD oficial: **`cea60d5`**.

`git log --follow` em `agir/server/lixeira.ts` devolve **exatamente três commits**:

| Commit | Papel | Tamanho do arquivo |
|---|---|---|
| **`44bbd67`** | C1 — implementação original da Fatia 12 (21/10), +203 linhas, 11 arquivos | 8 124 bytes |
| **`90fe21d`** | **C4 — versão homologada por D97** (contém a lição C4: `-NonFatal` inventado → `-NonInteractive`) | **9 340 bytes** |
| **`f850fc5`** | *"feat: confinar operações Agir no Linux e falhar fechado"* — **o commit que esvaziou a lixeira** | **862 bytes** |

**Decisão de restauração:** partir de **`90fe21d`**, não de `44bbd67`. Motivo: `90fe21d` é a versão que o dono **efetivamente homologou** em 21/10, e já carrega a correção C4 do PowerShell. Restaurar de `44bbd67` teria reintroduzido um defeito já corrigido.

Quatro arquivos extraídos com `git show 90fe21d:<caminho>` para `orig/`: `server/lixeira.ts`, `server/discos.ts`, `__tests__/excluir.test.ts`, `__tests__/lixeira.test.ts`.

**`f850fc5` é a resposta à pergunta que a Task 06 não conseguiu fechar:** o esvaziamento **não foi um acidente nem uma decisão registrada** — foi um commit de "confinar operações Agir no Linux e falhar fechado", ou seja, uma **medida de contenção de missão** que sobreviveu à missão. Isso confirma o diagnóstico de D128.

**Limites cumpridos (carta §2):** o repositório **não foi reinicializado**, o `.git` do workspace **não foi apagado nem tocado**, e o **histórico oficial não foi substituído**. A leitura foi feita por clone separado em cache.

---

## §3 — Arquivos de código alterados (cinco, todos dentro de `casas/agir/`)

Raiz: `platform/apps/workbench-v2/src/bairros/2-inteligencia/casas/agir/`

### 3.1 `server/lixeira.ts` — reescrito (862 → 12 083 bytes)

Restaurado de `90fe21d` **com três correções marcadas K1/K2/K3 no próprio código**.

**Contrato de exportação preservado** (nada que dependia dele precisou mudar): `moverParaLixeira` · `ResultadoLixeira` · `OpcoesLixeira` (com `plataforma`/`pastaTrash`/`executar` **injetáveis**) · `resolverPastaTrashLinux` · `dataBilheteXdg` · `comandoLixeiraWindows` · `detalheErroWindows` · `contarConteudo` · `ContagemPasta` · `formatarTamanho` · `LIMITE_CONTAGEM=20000`.

**Comportamento restaurado:**
- **Linux/XDG:** `$XDG_DATA_HOME/Trash` ou `~/.local/share/Trash`, pastas `files/` + `info/`, colisão de nome resolve para `nome.2`/`nome.3`, bilhete `[Trash Info]` com `Path=<encodeURI>` e `DeletionDate=<AAAA-MM-DDTHH:MM:SS>`. **Falha ao gravar o bilhete desfaz o `rename`** e devolve erro honesto — nunca deixa item na lixeira sem caminho de restauração.
- **Windows:** `powershell.exe -NoProfile -NonInteractive -Command` chamando `Microsoft.VisualBasic.FileIO.FileSystem::DeleteFile`/`DeleteDirectory` com `'OnlyErrorDialogs','SendToRecycleBin'`; apóstrofo escapado como `''`; `windowsHide`; `timeout: 180000`; motivo real extraído por **stderr > stdout > message**, cortado em 300 caracteres. **Lição C4 preservada:** `-NonFatal` não existe no PowerShell 5.1.
- **Outras plataformas:** erro honesto, sem fallback silencioso.

**As três correções (D135):**

| ID | O que a versão homologada fazia | O que passou a fazer | Por quê |
|---|---|---|---|
| **K1** | `stat` cego no alvo | **`lstat` + recusa de symlink/junction** | Seguir link mandaria para a lixeira um alvo **diferente** do apresentado no cartão: o dono aprova "apague X" e some Y |
| **K2** | nenhuma conferência pós-`rename` | **identidade `dev:ino` conferida antes × depois**; divergência ⇒ erro honesto dizendo **onde o item está**, sem desfazer automaticamente | Fecha a janela em que o caminho é trocado entre a validação e a movimentação |
| **K3** | em **EXDEV**, fazia `cp` + `rm(origem, recursive, force)` | **removido** — recusa honesta: *"a lixeira está em outro disco/partição… nada sumiu"* | Era a **única operação destrutiva e irreversível** de todo o fluxo e a **maior superfície de corrida** apontada pela auditoria F2 |

**Nenhuma das três acrescenta serviço, dependência ou camada** — cumpre §1 da carta (*"sem complexidade adicional"*).

### 3.2 `server/discos.ts` — editado em 4 pontos (→ 23 405 bytes)

- **Import** de `contarConteudo`/`formatarTamanho`/`moverParaLixeira`.
- **`normalizaCaminho(c)`** — só em `win32`: remove o prefixo UNC `\\?\`, aplica `toLowerCase()` e converte `/` → `\`. Motivo: **lição C5** — o `realpath` do Windows difere em caixa e prefixo, e sem normalizar a comparação de contenção daria falso negativo.
- **`resolverAlvoExclusao(raiz, caminhoResolvido)`** — contenção própria, com **motivo tipado** (`'fora' | 'raiz' | 'inexistente' | 'link' | 'sem_pasta'`) em vez de checar prefixo de string. Ordem das checagens em §4.
- **`descreverAlvoExcluir(raiz, entrada)`** — prévia **real**: vazio ⇒ *"aprovar não apaga nada"*; arquivo ⇒ `Arquivo "<nome>" (N caracteres):` + 400 primeiros caracteres; pasta ⇒ `Pasta "<nome>": N item(ns) (tamanho).` + aviso de contagem parcial; problema ⇒ frase honesta específica por motivo.
- **Executor `excluir`** — `faltando()` → `prepararPorta(raizResolvida, …)` → **`serializar(porta.caminho, …)`** (a **mesma fila** que `criar`/`escrever` já usam) → `resolverAlvoExclusao` → `contarConteudo` se pasta → `moverParaLixeira(alvo.real)` → falha devolve motivo honesto e **nada some**; sucesso faz `versoesLidas.delete(alvo.real)` e `.delete(porta.caminho)`. **Resumos homologados preservados:** `Arquivo "<e>" movido para a lixeira (para restaurar, abra a lixeira do sistema).` · `Pasta "<e>" (N itens[, contagem parcial]) movida para a lixeira (…)`.

### 3.3 a 3.5 Os três arquivos de teste — ver §5

### 3.6 Verificado como correto e **NÃO tocado**

`ferramentas.ts:56-60/81/88` · `rotas.ts:351-371` · `agir.ts:184-186` · `vizinho.ts:179` · `anuncio.ts` · `contract.ts` · `types.ts:14` · `territorio.ts` · `App.tsx:1783` · `CartaoFerramenta.tsx`.

**Nenhuma área congelada foi tocada** (`components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, specs `sessao_11*`, `explorer-search/{core,server}/**`, `EditorArea.tsx`). **Nenhuma dependência nova. Nenhum Agent Loop, sistema de permissões ou serviço paralelo.**

---

## §4 — Contenção: por que `excluir` é mais estrita que as cinco irmãs (D134)

Este é o ponto em que a carta §1 exige cuidado: *"usar o mesmo modelo de contenção da D121 para as ferramentas de arquivos, sem depender de helper aposentado"*.

**O que a verificação em código mostrou:** **D121 não é um modelo de contenção — é a remoção de uma contenção.** `territorio.ts` hoje **não confina**: recusa apenas caminho vazio e `\0`, e depois faz `path.resolve`. Aceita absolutos externos e `..` que saem da pasta. O próprio cabeçalho do arquivo diz *"não é sandbox"*. Portanto, **aplicar literalmente "o mesmo modelo da D121" ao `excluir` significaria não conter nada** — o que contraria a outra exigência da mesma carta §1: *"preservar proteção contra operações fora do workspace"*.

**Resolução registrada como decisão (D134), não como escolha silenciosa:** as contenções são **diferentes de propósito**, porque os efeitos são diferentes.

- **D121 vale para `ler`/`listar`/`buscar`/`criar`/`escrever`:** workspace é **base de resolução**, caminho externo é aceito sob permissões normais do SO.
- **`excluir` segue D97:** *"território = pasta ativa"*. É destrutiva; a carta manda preservar essa proteção.

**Implementação em `resolverAlvoExclusao`, sem o helper aposentado e sem usar `territorio.ts` como sandbox:**

1. **Território lexical e "a raiz nunca é alvo" — ANTES de olhar o disco.** Não é detalhe cosmético: se a existência for verificada primeiro, `../fora.txt` devolve *"não existe"* em vez de *"fora da pasta"*, e o modelo aprende a sondar o sistema de arquivos pelo motivo do erro. **O motivo certo importa porque é o que o modelo e o dono leem.**
2. **`lstat` no caminho pedido — link recusado.** Precisa vir **antes** do `realpath`, que resolveria o link e esconderia a troca de alvo.
3. **Território físico via `realpath`** — resolve links de componentes pai e **fecha o escape por symlink de pasta apontando para fora** (achado comprovado da auditoria F2).
4. **Re-conferência com `lstat` no caminho real**, no momento da ação.

**Regra dura derivada e registrada em `docs/04 §1.10`:** nenhuma ferramenta destrutiva futura pode confiar em `territorio.ts` para contenção; precisa da sua própria resolução canônica.

---

## §5 — Testes: o que foi reescrito, o que foi preservado e por quê

### 5.1 `__tests__/lixeira.test.ts` — 3 → **19 testes**

Os **3 testes que abençoavam o fail-closed foram descartados** e os **testes originais de `90fe21d` foram restaurados na íntegra, sem alteração de conteúdo** (4 `describe`s: XDG no Linux, Windows por comando puro, detalhe do erro C4, contagem e tamanho). **Acrescentados 6 testes novos** provando K1/K2/K3, incluindo **duas travas de regressão por leitura de fonte** (padrão que o projeto já usa em `e2eAssertionContract.test.ts`): `lixeira.ts` precisa conter `lstat`/`isSymbolicLink()` e **não pode** conter `force: true` nem `cp(`.

### 5.2 `__tests__/excluir.test.ts` — 3 → **13 testes**

Mesmo critério: originais de `90fe21d` restaurados sem alteração + **5 testes novos** de contenção e corrida (C1 a C4).

### 5.3 `__tests__/rotas.test.ts` — 40 → **41 testes** (o coração da contradição)

O `describe` chamava-se **'F2 — excluir pede confirmação mas permanece fail-closed até lixeira segura'** e afirmava:

```
expect(String(cartao.previa)).toContain('exclusão não está disponível')
expect(String(resultado.resumo)).toContain('Exclusão bloqueada')
expect(await readFile(...'alvo-f2.txt')).toBe('fixture sanitizada')   // origem intacta
```

**Era um teste verde abençoando uma capacidade quebrada** — exatamente o que D79 proíbe, e a metade da contradição que a carta §3 mandou resolver. Passou a afirmar o comportamento homologado: prévia com `Arquivo "alvo-f2.txt"` e o conteúdo · `tool_result` **`ok:true`** com *"movido para a lixeira"* · origem **some** · conteúdo íntegro em `Trash/files/` · bilhete `.trashinfo` com `DeletionDate`. **Acrescentado um teste de recusa do dono** (`decisao:'negar'` ⇒ `ok:false`, *"dono negou"*, *"nada sumiu"*, origem intacta, **lixeira vazia**).

**Os dois testes RF12-3 que já existiam foram preservados sem alteração**, porque continuam corretos e são a proteção que a carta manda manter: *"Permitir na Sessão"* para `excluir` → **400** honesto, e `permissoes:['excluir']` no pedido **não auto-libera**.

**A nota explicativa foi deixada dentro do próprio teste**, no corpo do `describe`, para que ninguém volte a "corrigir" aquelas asserções sem entender que elas já foram o instrumento que escondeu a regressão.

### 5.4 Achado que evitou mudança desnecessária

O diagnóstico da Task 06 listou como agravante o **anúncio mentiroso ao modelo** (`ferramentas.ts:58` prometendo lixeira em toda chamada, via `vizinho.ts:179` sem filtro `permitidas`). **Verificado nesta missão: com a capacidade restaurada, o anúncio volta a ser verdadeiro e nenhuma mudança é necessária.** O que mentia não era o texto do anúncio — que sempre descreveu o **contrato** corretamente — e sim o **código**, que não o cumpria. Corrigir o anúncio teria sido tratar o sintoma; restaurar o código tratou a causa. **Zero linhas alteradas em `ferramentas.ts`, `vizinho.ts` e `anuncio.ts`.**

### 5.5 Fixtures — conformidade com §3 da carta

Todos os testes usam **exclusivamente arquivos e pastas temporários criados para esse fim** (`mkdtemp`). **Nenhum arquivo real foi lido, movido ou apagado.** Detalhe que tornou os testes executáveis neste ambiente: o original já colocava `$XDG_DATA_HOME` **dentro da mesma pasta `base`** do workspace de teste ⇒ **mesmo dispositivo**, sem EXDEV. **Nada precisou ser adaptado.**

---

## §6 — Resultados: o que foi executado, o que NÃO foi

### 6.1 ✅ Executado de verdade

| Verificação | Comando | Resultado |
|---|---|---|
| Suíte `agir` | `npx vitest run src/bairros/2-inteligencia/casas/agir` | ✅ **11 arquivos · 137 passaram · 4 skipped · 0 falharam** |
| Typecheck | `npx tsc -b --force` | ✅ **exit 0** |
| Lint dos 5 arquivos alterados | `npx eslint <os cinco>` | ✅ **exit 0**, zero problemas |
| Suíte completa — **DEPOIS** | `npx vitest run` | 5 arquivos falharam · 122 passaram · 2 skipped (129) / **14 testes falharam** · **1055 passaram** · 27 skipped (**1096**) |
| Suíte completa — **ANTES** | `npx vitest run` com os 5 arquivos revertidos | 5 arquivos falharam · 122 passaram · 2 skipped (129) / **14 testes falharam** · 1028 passaram · 27 skipped (**1069**) |

**Prova de não-regressão.** As **14 falhas são exatamente as mesmas antes e depois**, nos mesmos cinco arquivos, **nenhum em `agir`**: `TerminalPanel.test.tsx` · `iconLabels.test.ts` · `themeTokens.test.ts` · `visualStates.test.ts` · `session-persistence/index.test.ts` (esta por `AGENTE_WINDOW_TEST_HOME` indefinido). **O total subiu 1069 → 1096 (+27) e todos os 27 novos passaram.**

**Método do baseline, para ser reproduzível:** as cinco versões novas foram copiadas para `/home/user/.cache/base/`, os cinco caminhos foram revertidos com `git checkout --`, a suíte completa rodou, e as versões novas foram copiadas de volta. **O `.git` não foi alterado além de `checkout --` de arquivos já rastreados.**

**Delta por arquivo da pasta `agir`:** `excluir.test.ts` 3→**13** · `lixeira.test.ts` 3→**19** · `rotas.test.ts` 40→**41** · os outros oito inalterados. Total da pasta **114 → 141**.

### 6.2 ❌ NÃO executado — e não declarado como executado

**(1) E2E `e2e/excluir_fatia12.spec.ts` — NÃO EXECUTADO.** Três bloqueios **independentes**:
- **(a)** falta `uploads/stub_agir.cjs` no repositório, e a spec espera esse stub na porta **4610**;
- **(b)** **não há browsers do Playwright** instalados (`/opt/playwright` ausente; `npx playwright install` não funciona neste sandbox);
- **(c)** o fixture usa `/tmp/excluir-e2e-ws` com lixeira real em `~/.local/share/Trash/`, e `/tmp` (**dev 29**) × `$HOME` (**dev 65024**) são **filesystems diferentes** ⇒ **EXDEV**, que a correção K3 transforma em recusa honesta.

**A spec não foi alterada, não recebeu `skip`, não recebeu `fixme` e não foi quarentenada.** Ela já afirmava o comportamento correto. **A régua volta a ser 23/23 no papel, mas permanece NÃO observada em execução.**

**(2) Lixeira real do Windows — NÃO TESTADA.** Não há Windows no ambiente. O caminho PowerShell foi provado **apenas por comando puro com execução injetável**, o que valida a **montagem do comando e o tratamento do erro**, não o efeito real no SO.

**(3) 4 erros de ESLint pré-existentes — NÃO corrigidos.** `agir/server/fsSeguro.ts:24` (`_raiz` definido e nunca usado) e `agir/__tests__/fsSeguro.test.ts:127/130/144` (três `catch {}` vazios). **Verificado com `git show cea60d5:<caminho>` que já existem no HEAD oficial** — não foram introduzidos por esta missão e estão **fora do escopo autorizado** (carta §8: *"não modificar áreas não relacionadas"*). Consequência registrada: `npm run lint` global **não passa**, antes e depois.

**(4) As 14 falhas da suíte completa NÃO foram investigadas.** Prova acima de que são pré-existentes deste ambiente Linux. Fora do escopo.

### 6.3 Limitação de produto criada por K3 — ponto de decisão para o dono

**K3 removeu o fallback EXDEV.** Consequência conhecida e aceita conscientemente: **em Linux, se a lixeira ficar em dispositivo diferente do alvo, `excluir` recusa** com motivo honesto (*"a lixeira está em outro disco/partição… nada sumiu"*) em vez de copiar-e-apagar.

**No Windows — plataforma de homologação do dono — o caminho não é afetado:** a Lixeira do Windows aceita itens de qualquer volume. **O passo 10 do roteiro em `docs/08` existe justamente para confirmar isso no Windows real.**

**Se um dia for necessário em Linux,** a alternativa seria `gio trash`/`trash-cli`, que **exige dependência externa** — portanto **fora do escopo autorizado**. **Isto não foi decidido: fica registrado como ponto de decisão do dono.**

**K2 não tem teste negativo.** Forçar divergência de `dev:ino` entre validação e `rename` exigiria uma corrida real, não reproduzível de forma determinística. O que existe é a **trava de regressão por leitura de fonte** mais o caso positivo. Registrado como limite, não omitido.

---

## §7 — Nova sequência oficial: demonstração de que foi registrada corretamente

Carta §4 e §9 exigem **demonstrar** o registro e **registrar expressamente qual decisão anterior foi substituída**. Segue a matriz de onde cada trecho foi gravado.

**Sequência oficial vigente:**

> **MICRO-FATIA DELETE → Fatia 14 → Fatia 15 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → Fatia 16 → Fatia 17 → Fatia 18 → Fatia 19 → Fatia 20**

| Onde foi registrado | O que diz |
|---|---|
| **`docs/05 §18`, D133** | Registro **normativo**: a sequência completa, e a lista **expressa** das três posições substituídas (a), (b), (c) |
| **`docs/06` PARTE 3 (cabeçalho do roadmap)** | Nota 🟢 com a sequência completa, lida por quem abre o roadmap |
| **`docs/06` — parágrafo *"Sequência vigente, sem alterar ordem…"*** | Atualização inline: MICRO-FATIA DELETE entre 13 e 14 + M1–M8 entre 15 e 16 |
| **`docs/06` — bloco ✅ D127/D129** | Nota 🟢 *"SUPERADA POR D132/D133"* com o registro da posição substituída |
| **`docs/06` — bloco ✅ D127/D128/D129** | Nota 🟢 *"SUBSTITUÍDA POR D132/D133/D136"* |
| **`docs/03` bloco corrente, item 6** | Estado atual, com o registro das três substituições |
| **`docs/03` item 1 (bloco da Task 06)** | Nota 🟢 *"ATUALIZADO POR D133"* — o item que deixava 16–20 "a confirmar" |
| **`docs/07` (novo, topo)** | Entrada histórica *"nova sequência oficial: M1–M8 entre a Fatia 15 e a Fatia 16 (D133)"* |
| **`docs/07:144`** | Nota aditiva 🟢 sobre a linha que listava *"planejamento M1–M4 e Fatias 16–20"* |

### 7.1 As três posições substituídas, registradas expressamente

**(a) `docs/06` — *"Sequência vigente (atualizada em 2026-10-29)"*.** Dizia: *"Gate D98 → Fatia 13 → Fatia 14 (SPEC 2H) → Fatia 15 (SPEC 2I) → **Fatias 16–20 nos escopos existentes**"*, com *"M1–M4 continuam somente como **planejamento posterior** à estabilização 13–15; **M5–M8 e ICs não foram encaixadas em execução**"*. **É exatamente a posição que a carta §4 descreve como anterior** — memória depois das Fatias 16–20. **Deixa de valer.**

**(b) A cláusula de D127 que deixava a ordem pendente.** D127 dizia: *"Depois da iniciativa de memória segue o roadmap posterior (Fatias 16–20 nos escopos existentes), **cuja sequência deverá ser confirmada nos documentos canônicos antes de qualquer alteração**"*. **A confirmação foi dada agora pelo dono**, e a ordem **16 → 17 → 18 → 19 → 20** fica registrada. **Deixa de ser pendência.**

**(c) `docs/07:144`** listava *"a sequência D98 → 13 → 14 → 15 → planejamento M1–M4 e Fatias 16–20"*, sem posicionar M5–M8 antes das 16–20. **Recebeu nota aditiva.**

### 7.2 O que NÃO foi substituído (para não exagerar o alcance)

- **D127 não foi apagada.** Permanecem válidos os seus dois núcleos: *"sem renumeração"* (rótulos M não são números oficiais) e *"sem antecipação da implementação das oito fatias de memória"*. **O que mudou foi apenas a posição relativa** M1–M8 × Fatias 16–20, que passou de "a confirmar" para explícita.
- **A Fatia 13 permanece implementada e homologada dentro do seu escopo original** (`executar`). A MICRO-FATIA DELETE é **correção complementar entre a 13 e a 14, sem renumeração** — não é reabertura da 13.
- **As SPECs 2H e 2I não foram reabertas.**
- **O gate D129 continua obrigatório** antes da codificação da Fatia 14, e **E-1 a E-5 permanecem pendentes** (§8 abaixo).
- **É decisão de planejamento e NÃO autoriza implementar** a 14, a 15, M1–M8 nem 16–20. Nenhuma dessas etapas foi iniciada.

---

## §8 — Itens da carta que NÃO foram executados (e por quê)

| Item da carta | Estado | Motivo |
|---|---|---|
| **§5 — formalizar DP-03 e DP-06 antes da Fatia 14** | ❌ **não feito** | A carta diz *"devem ser formalizados antes da implementação da Fatia 14"*. **A Fatia 14 não foi iniciada** (§8 proíbe). O gate **D129 permanece obrigatório e aberto**. As diretrizes foram **registradas** em D133, mas **E-1 a E-5 continuam pendentes** — a carta é explícita: *"NÃO as declarar homologadas só com base nestas diretrizes"*. |
| **§6 — preferências de memória** | ✅ já registradas em **D130** (Task 06) | Nenhuma alteração foi necessária; a implementação permanece para depois da Fatia 15. **Nenhum código de identidade foi tocado.** |
| **§7 — os 14 pontos metodológicos** | ❌ **não feito, conforme mandado** | **Adiados** por **D131**. Nenhuma quarta filosofia criada; as três permanecem. |
| **§3 — E2E e Lixeira do Windows** | ❌ **não executado** | Limitações de ambiente (§6.2). **Registradas**, com roteiro manual entregue em `docs/08`. |

---

## §9 — Canônicos atualizados (9 arquivos, nenhum criado)

A regra permanente é **docs travadas em 9 arquivos — nenhum canônico novo**. `ls docs/*.md` continua retornando **9**. **Sete** foram atualizados nesta missão:

| Canônico | O que mudou |
|---|---|
| **`03 - ESTADO ATUAL.md`** | Novo bloco corrente (itens 1–6) · bloco da Task 06 remarcado como *"ATUALIZAÇÃO ANTERIOR"* com aviso de que seus itens 1 e 2 foram superados · nota 🟢 no item 1 (D133) |
| **`04 - ARQUITETURA E REGRAS DURAS.md`** | **Regra nova D134** em §1.10 (contenção de `excluir` mais estrita que D121, de propósito; ordem obrigatória das checagens; *"nenhuma ferramenta destrutiva futura pode confiar em `territorio.ts`"*) · resolução da **precondição órfã** em §316 |
| **`05 - DECISOES.md`** | **Nova seção 18 com D132–D136** + parágrafo de precedência |
| **`06 - PROXIMAS FASES E DIVIDAS.md`** | **DEBT-24** marcada como aprovada/implementada + **nova linha de RESOLUÇÃO** na mesma tabela (7 colunas nas duas, integridade verificada) · correção aditiva na linha **DEBT-23** (a frase *"bloqueada por decisão anterior"* que ainda sobrevivia lá) · nota 🟢 na **PARTE 3** · notas 🟢 nos **dois** parágrafos de *"Sequência vigente"* e nos **dois** blocos ✅ D127 |
| **`07 - HISTORICO.md`** | **Três entradas novas** no topo (implementação · nova sequência · **e a entrada da Task 06, que estava faltando** neste arquivo) + nota aditiva 🟢 em `:144` |
| **`08 - HOMOLOGACAO.md`** | Resolução 🟢 da nota D128 no roteiro da FATIA 12 · **nova seção *"MICRO-FATIA DELETE — ⏳ AGUARDANDO HOMOLOGAÇÃO MANUAL"*** com o registro honesto do provado × não provado, **Parte A** (os 8 passos do D97 continuam valendo) e **Parte B** (passos 9–11 para K1/K2/K3) · atualização 🟢 na nota de alcance da Fatia 13 |
| **`09 - TESTES E AMBIENTE.md`** | Resolução 🟢 da nota de correção em `:167` (régua) · linha **Caminhos/F2** atualizada · **nova seção §3.25** com ambiente, placares, prova antes × depois, o que os 27 testes novos provam, o que NÃO foi executado e limites |

**`01`, `02` intocados** — nenhuma regra de método nem contrato de capacidade mudou.

**Lacuna de rastreabilidade corrigida de passagem:** a Task 06 foi missão documental de peso (D127–D131, DEBT-24, seis canônicos) e **não tinha entrada em `07 - HISTORICO.md`**. Foi acrescentada agora, marcada como preenchimento de lacuna.

---

## §10 — Implementado × testado × depende de homologação manual

A carta §9 pede essa separação **clara**. Segue sem mistura.

### 10.1 ✅ IMPLEMENTADO (código escrito, revisado, typecheck e lint limpos)

Movimentação de **arquivo** e de **pasta** para a lixeira do SO · Linux/XDG com `files/`+`info/`+`.trashinfo`+colisão de nome · Windows por PowerShell com `SendToRecycleBin` · prévia real do cartão · contenção com as quatro checagens em ordem · recusa de link · conferência de identidade · recusa honesta em EXDEV · serialização na fila existente · invalidação de `versoesLidas` · resumos homologados.

### 10.2 ✅ TESTADO (executado neste ambiente, Linux, só temporários)

**137 testes da pasta `agir` passando, 0 falhando** · +27 testes novos · **prova de não-regressão antes × depois com as mesmas 14 falhas** · typecheck exit 0 · lint dos cinco arquivos exit 0. Cobre: exclusão de arquivo **e** diretório · envio para a lixeira · **recusa** da aprovação · proteções de caminho (relativo externo, absoluto externo, raiz inteira, symlink de alvo, symlink de componente pai) · comunicação do resultado ao agente · corrida de duas exclusões concorrentes · RF12-3 (sessão nunca cobre).

### 10.3 ⏳ DEPENDE DE HOMOLOGAÇÃO MANUAL DO DONO (Windows real)

**Os 11 passos em `docs/08`** — Parte A (8 passos do D97) + Parte B (passos 9–11: link não é seguido · lixeira em outro disco no Windows · resultado comunicado de verdade nas três pontas). **Até lá: CRUD completo NÃO homologado, DEBT-24 não fechada, E2E não observado, Lixeira do Windows não comprovada.**

### 10.4 ❌ FORA DO ESCOPO (não feito, e não deve ser inferido)

Exclusão **permanente** (DEBT-23 separada) · Fatias 14, 15, M1–M8, 16–20 · refatorações amplas · áreas não relacionadas · DP-03/DP-06 formalizados · E-1 a E-5 homologadas · os 14 pontos metodológicos · quarta filosofia · **commit** · **push**.

---

## §11 — Verificações finais de conformidade (executadas)

- `git status --porcelain` ⇒ **exatamente 12 arquivos modificados**: 7 canônicos + `00_INDICE.md` + os 5 arquivos de código/teste em `casas/agir/`. **Nenhuma alteração fora de `docs/`, da pasta de investigação e de `casas/agir/`.**
- `ls docs/*.md` ⇒ **9 arquivos**. **Nenhum canônico novo criado.**
- Varredura de contaminação CJK/zero-width nos canônicos + índice ⇒ **1 achado** (soft hyphen U+00AD introduzido por mim em `docs/03`), **corrigido na mesma hora**; revarredura ⇒ **0**.
- Integridade da tabela de dívidas em `docs/06` ⇒ **7 colunas** na linha DEBT-24 original **e** na linha nova de RESOLUÇÃO.
- Unicidade de âncoras conferida com `grep -c` **antes** de cada `edit_file`.
- HEAD local do workspace permanece **`fe218b8`**, **sem remote**. **O HEAD oficial é `cea60d5`** e não foi tocado.
- **Nenhum commit. Nenhum push.**

---

## §12 — Parada

**A MICRO-FATIA DELETE está implementada e validada por testes automatizados. A documentação canônica e o roadmap estão atualizados, com a nova sequência registrada e as posições substituídas identificadas uma a uma.**

**INTERROMPIDO AQUI, conforme §9 da carta. Aguardando homologação manual do dono no Windows real.**

**Três coisas que precisam da palavra do dono:**
1. **Homologação manual** pelos 11 passos de `docs/08` — é o que fecha DEBT-24 e permite falar em CRUD completo.
2. **A limitação K3 em Linux** (lixeira em outro dispositivo ⇒ recusa em vez de copiar-e-apagar). No Windows não afeta; em Linux, afeta. **Aceitar como está, ou decidir outra coisa** (que exigiria dependência externa).
3. **As 14 falhas pré-existentes da suíte e os 4 erros de lint em `fsSeguro.*`** foram **deliberadamente não corrigidos** por estarem fora do escopo autorizado. **Se o dono quiser que virem item próprio**, precisa abrir — não foram tocados.
