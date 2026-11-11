# 15 — TASK 06 · Diagnóstico da Fatia 13, regressão da ferramenta `excluir` e alinhamento de sequência

**Data:** 2026-10-31 · **Autor:** Arena · **Natureza:** confronto entre documentação canônica e comportamento real do código
**Status:** 🔴 **Nenhum código alterado. Nenhuma exclusão executada. Nenhum commit. Nenhuma homologação declarada.**

> **Pedido do dono (§2 da carta):** *"Existe uma divergência importante entre a documentação e minha avaliação funcional. A documentação registra a Fatia 13 como implementada e homologada manualmente. Entretanto, considero que ela continua aberta porque o agente ainda não consegue realizar a exclusão de arquivos e pastas, impedindo o CRUD completo esperado."*
> *"Não presuma que a existência da ferramenta no catálogo significa que ela funciona corretamente."*

> **Resposta em uma linha:** **o senhor tem razão sobre o fato e razão sobre a gravidade, mas a causa não é a que a documentação sugere.** A exclusão **não está "bloqueada por decisão anterior"** — nenhuma decisão a bloqueou. Ela **já foi implementada e homologada** (D97, Fatia 12), foi **desligada como medida temporária** durante o episódio fail-closed da F2, e **nunca foi religada** porque a condição declarada para religá-la foi **aposentada por uma decisão posterior** (D121). É uma **regressão não registrada contra uma fatia homologada**, com uma **precondição órfã** — e não uma lacuna de escopo da Fatia 13.

---

## §0 — Método e limites desta missão

| | |
|---|---|
| **O que foi feito** | Leitura de **13 arquivos de código-fonte** do Agente Window (somente leitura), de **2 artefatos de teste** da exclusão, e de `docs/02`, `03`, `04`, `05`, `06`, `07`, `08`, `09` nos pontos que mencionam `excluir`/lixeira/Fatia 12/Fatia 13. |
| **O que NÃO foi feito** | **Nenhuma exclusão executada** — nem em arquivo real, nem em fixture (o senhor proibiu, e a spec E2E ativa apaga arquivos reais em `/tmp` e escreve na lixeira real do Linux). Nenhum código alterado. Nenhum teste executado. Nenhum commit ou push. |
| **Consequência do limite** | **A afirmação de que `e2e/excluir_fatia12.spec.ts` não pode passar é uma dedução de leitura de código (E1), não uma execução observada.** Está marcada como tal em §3.4. Se o senhor quiser prova executada, é preciso autorizar rodar a spec — e ela é destrutiva por construção. |

---

## §1 — Diagnóstico simples e objetivo da Fatia 13

### 1.1 O que **funciona** (verificado em código, não presumido)

**A ferramenta `executar` — escopo real da Fatia 13 — está inteira:**

| Peça | Local | Estado |
|---|---|---|
| Executor one-shot | `agir/server/executorComando.ts` | ✅ existe, com teste dedicado `__tests__/executorComando.test.ts` |
| Shell padrão por SO | `executorComando.ts:67` — `['-NoLogo','-NoProfile','-NonInteractive','-Command', comando]` | ✅ **e usa `-NonInteractive`, não o `-NonFatal` inventado** que causou o incidente C4 da Fatia 12 |
| Ferramenta no tipo canônico | `types.ts:14` · `agir/contract.ts:17` | ✅ |
| Catálogo | `ferramentas.ts:62-67` | ✅ |
| Anúncio ao modelo nos 4 protocolos | `anuncio.ts:26-31` (`case 'executar'`) · `anuncio.ts:48-81` | ✅ |
| Permissão: Manual / Permitir tudo | `rotas.ts:351-371` | ✅ incl. `comandoExigeAprovacaoIndividual` para a negação dura Q13-6 |
| Grant de sessão | `session-persistence/database.ts:72` — `CHECK (tool_id = 'executar')` · `:119` `SessionToolGrant` | ✅ **a coluna já nasceu no schema** |
| Cancelamento | `rotas.ts:472-480` | ✅ `Parar` sem desfazer efeitos (D126) |
| PTY humano | nenhum toque | ✅ áreas congeladas preservadas |

**Registro de homologação:** `docs/06:486` e `docs/03` — homologação **manual, declarada pelo dono no Windows em 29/10**, limitada aos cenários de `docs/08`. Validação automatizada Linux: **132 testes passando** em 11 arquivos + `database.test.ts` 2/2 isolado (`docs/09:895`). **Esse trabalho é real e não deve ser perdido.**

### 1.2 O que **falta** — e não é da Fatia 13

**A exclusão de arquivos e pastas pelo agente.** O senhor está certo: o CRUD **não** está completo. Mas a causa e o dono do problema são outros:

- **A SPEC 2G (Fatia 13) nunca incluiu exclusão.** Ela diz expressamente: *"`excluir` segue bloqueada por decisão anterior e não é desbloqueada por shell nem Permitir tudo"* e, nos limites, *"a ferramenta `excluir` permanece fail-closed"*.
- **A exclusão é escopo da SPEC 2F (Fatia 12)** — e foi **entregue e homologada** por **D97 em 21/10**.
- **"CRUD completo" é um requisito explícito do senhor**, registrado em `docs/07:210`: *"declarou necessidade de **DELETE (CRUD completo)**"*, e em `docs/07:167`: *"reversão pelo dono (CRUD completo)"*.

**Portanto: a Fatia 13 não está incompleta. A Fatia 12 regrediu depois de homologada.** Isso muda completamente o remédio — ver §4.

---

## §2 — A cadeia de evidências: a exclusão existiu, foi desligada e não foi religada

### 2.1 Ela **existiu** e foi homologada (E1 — documentação + registros de commit)

`docs/07:173` — **C1 `44bbd67`** (21/10):
> *"`excluir` no catálogo + anúncio 4 canais (`anuncio.ts`) + `ehMexida` + `permiteSessao` (RF12-3) + **`lixeira.ts` nova (Windows = Lixeira real via PowerShell+FileSystem; Linux = XDG `~/.local/share/Trash` à mão com `.trashinfo`; resto = erro honesto)** + executor em `discos.ts` (território, raiz nunca alvo, contagem antes de mover) + `descreverAlvoExcluir` (prévia do cartão) + negação *"nada sumiu"* no loop + rota."*

`docs/07:174` — **C2 `133affa`**:
> *"E2E `excluir_fatia12` **5/5** (T1 arquivo+pasta na lixeira real com bilhete · T2 negar · T3 sessão-não-cobre · T4 ../fora · T5 regressão 10). Régua 08+09+10+11+12 **23/23**."*

`docs/07:177` — **C4** (teste real do dono, Windows):
> *"excluir no Windows falhava sempre — causa: switch `-NonFatal` **INVENTADO** (não existe no powershell.exe 5.1, confirmado na doc oficial) → trocado por `-NonInteractive`; de quebra, a recusa agora traz o detalhe do Windows (nunca mais cega) + teto de 3 min no PowerShell."*

**Este C4 é a prova mais forte de que a exclusão Windows funcionava**: o incidente só existe porque o PowerShell **foi invocado de verdade** e o switch errado **falhou de verdade**. Não se descobre um switch inventado numa função que nunca roda.

`docs/05` **D97** e `docs/08:118`:
> *"Cobre a tool `excluir` (**arquivo+pasta → lixeira do SO, com contagem**) + cartão reforçado + sessão nunca cobre (RF12-3) + território = pasta ativa + os 2 fixes do teste real (C4 switch PowerShell + C5 território no Windows)."*
> *"**Registro honesto:** o retest no Windows real dos C4+C5 **não foi confirmado** neste chat (homologação por declaração, padrão D94)."*

### 2.2 Ela foi **desligada como medida temporária** (E1 — código)

`agir/server/lixeira.ts` **integral** (21 linhas):
```ts
// F2: exclusão está temporariamente fail-closed. A implementação anterior
// usava operações pathname-based (XDG/PowerShell) vulneráveis a corridas entre
// validação e movimentação. Não existe fallback até a lixeira ser integrada ao
// helper de handles e validada por plataforma.
…
export async function moverParaLixeira(_absoluto: string, _opcoes: OpcoesLixeira = {}): Promise<ResultadoLixeira> {
  return {
    ok: false,
    motivo: 'Exclusão bloqueada: lixeira sem contenção segura contra links e alterações concorrentes. Nenhum item foi movido ou removido.',
  }
}
```
Os parâmetros `_absoluto` e `_opcoes` estão **sublinhados como não usados**. A função ignora plataforma, pasta de trash e o executor injetável — **todo o mecanismo que existia foi removido**, sobrou a assinatura.

`docs/04:313` confirma a causa e o alcance:
> *"Exclusão/lixeira permanece bloqueada porque o fluxo anterior usava paths e não fechava TOCTOU. **Windows/macOS não geram addon no script de build e o loader marca indisponível** (há somente um stub-fonte opcional); sem fallback path-based e sem declarar a garantia testada."*

`docs/07:68` (missão D119, F1–F5-B):
> *"Exclusão/lixeira e prévia ficam fail-closed: **nenhum path-based access; Windows/macOS recebem stub indisponível, sem fallback**."*

### 2.3 Ela **não foi religada** — e a razão é uma precondição órfã

**D121** (27/10) substituiu a estratégia fail-closed de F2/F4, a pedido do senhor. `docs/04:102`:
> *"D121 substitui, somente para F2/F4 desta missão, a barreira absoluta ao workspace e a exigência de resistir a um processo malicioso da mesma conta… Caminhos absolutos/externos explicitamente solicitados **podem ser usados sob permissões normais do sistema operacional**. O workspace é base de resolução, **não sandbox**. Node.js direto e APIs normais do SO; **helper nativo permanece desativado**. … **excluir continua indisponível**."*

`docs/05:190` (Alcance de D121):
> *"não reabre a FATIA 10/12 homologada **nem autoriza implementar a lixeira/exclusão**… A ferramenta `excluir` permanece indisponível **nesta implementação**."*

**Aqui está o nó, e ele é circular:**

```
lixeira.ts:1-4   →  "só religa quando for integrada ao HELPER DE HANDLES e validada por plataforma"
                                    ▲
                                    │  mas…
                                    │
docs/04:102      →  D121: "helper nativo PERMANECE DESATIVADO"; as outras 5 ferramentas
                    passam a usar caminho + permissões normais do SO, sem contenção física
```

> **A condição declarada para restaurar a exclusão é um componente que uma decisão posterior aposentou.** As cinco ferramentas irmãs (`ler`, `listar`, `buscar`, `criar`, `escrever`) foram **liberadas exatamente do requisito** que ainda prende a `excluir`. Ninguém decidiu manter a exclusão desligada; ela ficou **esperando um trem que foi cancelado**.

E o endurecimento documental fez o resto. Três lugares repetem *"bloqueada por decisão anterior"*:
- `docs/05:225` (Precedência de D126)
- `docs/07:19`
- `docs/08:145`

**Não existe nenhuma decisão, em `docs/05`, que bloqueie a exclusão.** Verifiquei D1 a D126. O que existe é:
1. um comentário de código que diz **"temporariamente"**;
2. uma **exclusão de escopo de missão** (*"não autoriza implementar"* ≠ *"decide não implementar"*);
3. e a **repetição** dessa exclusão como se fosse decisão.

**Um limite de missão virou política permanente por repetição, sem que ninguém a decidisse.** É exatamente o tipo de coisa que o senhor me pediu para procurar: *"não quero que uma informação documental incorreta prevaleça sobre o comportamento real do sistema."*

### 2.4 E há um segundo stub, que nem chama o primeiro

`agir/server/discos.ts:271`:
```ts
const excluir: ExecutorFerramenta = async () => falha('Exclusão bloqueada: esta missão não altera a implementação da lixeira. Nenhum item foi lido, movido ou removido.')
```

**`moverParaLixeira` nunca é chamado.** Existem **duas mensagens de bloqueio diferentes** no produto, e a que o usuário e o modelo de fato recebem é a de `discos.ts` — que contém **vocabulário de missão de desenvolvimento** (*"esta missão não altera a implementação da lixeira"*). O `docs/09:502` descreve o estado com precisão: *"Lixeira/exclusão e prévia **não acessam o disco e falham fechado**."*

---

## §3 — Resposta às cinco perguntas do senhor

### 3.1 "`excluir` está implementada, anunciada ao modelo e integrada ao Agent Loop?"

**Anunciada: SIM — e é aí que mora o defeito mais sério.**

| Camada | Estado | Evidência |
|---|---|---|
| Catálogo | ✅ presente, com descrição **prometendo a capacidade** | `ferramentas.ts:56-60`: *"Move um arquivo ou pasta da pasta de trabalho para a **LIXEIRA do sistema** (nunca apaga permanente; restaurar é pela lixeira). Sempre pede permissão ao dono, uma a uma."* |
| Anúncio ao modelo | ✅ **em toda chamada, sem filtro** | `vizinho.ts:179`: `const anuncio = anunciarFerramentas(alvo.protocolo)` — **o parâmetro `permitidas` não é passado**, logo `anuncio.ts:49-51` usa `catalogoFerramentas` inteiro, e `f.descricao` vai no corpo HTTP para os 4 protocolos |
| Loop Agir | ✅ integrada | `ehMexida('excluir')` = true (`ferramentas.ts:81`) · `permiteSessao` = false (RF12-3, `ferramentas.ts:88`) · fora do allow-all (`rotas.ts:351`) · cartão com prévia do servidor (`rotas.ts:364`) · negação "nada sumiu" (`agir.ts:184-186`) · UI `CartaoFerramenta.tsx:16,72,74,132` · Explorer atualiza pós-excluir (`App.tsx:1783`) |
| **Executor** | ❌ **stub de falha, em dois níveis** | `discos.ts:271` · `lixeira.ts:17-21` |
| Prévia do cartão | ✅ **honesta** | `discos.ts:87`: *"A exclusão **não está disponível nesta versão**; nenhum item foi lido, movido ou removido."* |

> **Assimetria de honestidade:** o **usuário** vê a verdade no cartão (`discos.ts:87`). O **modelo** recebe, em toda chamada, a promessa de que move para a lixeira (`ferramentas.ts:58` via `vizinho.ts:179`). O modelo vai propor exclusões que sempre falham, e vai receber de volta uma mensagem de erro com vocabulário de missão.

### 3.2 "Consegue realmente excluir arquivos e diretórios, respeitando permissões e proteções?"

**Não. Nenhuma exclusão acontece, em nenhuma plataforma, em nenhum cenário.** Sempre `ok: false`.

**Mas é preciso ser preciso sobre o que funciona em volta:** toda a **máquina de proteção** está viva e correta — cartão sempre pergunta, sessão nunca cobre, Permitir tudo não habilita, território conferido, raiz nunca é alvo, prévia honesta. **A proteção está guarding uma operação que nunca ocorre.** Isso é seguro e é inútil ao mesmo tempo: não há risco de apagar nada, e não há como apagar nada.

### 3.3 "Essa capacidade estava prevista na SPEC 2G ou em outro contrato já aprovado?"

| Contrato | Prevê exclusão? | Texto |
|---|---|---|
| **SPEC 2G (Fatia 13)** | ❌ **NÃO — exclui expressamente** | *"`excluir` segue bloqueada por decisão anterior e não é desbloqueada por shell nem Permitir tudo"* |
| **SPEC 2F (Fatia 12)** | ✅ **SIM — e foi entregue** | Q12-1 fechado · RF12-2/RF12-3/RF12-6 · `docs/08:107-118` roteiro de 8 passos |
| **D97** | ✅ **SIM — homologada pelo dono** | *"Cobre a tool `excluir` (arquivo+pasta → lixeira do SO, com contagem)"* |
| **DEBT-16** | ✅ origem do requisito | *"dono pediu decisão imediata… reversão pelo dono (**CRUD completo**)"* |
| **CAP-04** (`docs/02:36`) | ✅ visão de produto | *"criar, ler, editar, mover ou **excluir** arquivos, respeitando o escopo, as permissões e as aprovações aplicáveis"* |
| **DEBT-23** | ⚠️ tangencia, mas **não foi aberta** | *"ajuste lixeira × permanente + modo YOLO… **Reabre D72-parcial e SPEC 2F §6 (nunca-permanente) — só com ordem expressa na abertura da 13**"* (`docs/07:167`). **Nenhuma ordem expressa foi registrada.** A Fatia 13 foi aberta por DEBT-23 apenas na parte de permissões/modos (`docs/05` D126 + `docs/06` adendo de vigência). |

**Conclusão:** a capacidade **está contratualmente aprovada e homologada** — pela **Fatia 12**, não pela 13. Não é preciso criar contrato novo; é preciso **restaurar** o que foi homologado.

### 3.4 "O problema é ausência de implementação, falha de integração, permissão ou diferença de escopo?"

**Nenhuma das quatro.** É uma quinta coisa:

> **Regressão não registrada contra fatia homologada, causada por precondição órfã.**

| Candidata | Veredito | Por quê |
|---|---|---|
| Ausência de implementação | ❌ | Existiu: `44bbd67` (XDG + PowerShell), `133affa` (cartão + E2E 5/5), C4 (fix real do PowerShell no Windows do dono) |
| Falha de integração | ❌ | A integração está **inteira e funcional**: catálogo, anúncio, `ehMexida`, `permiteSessao`, allow-all, cartão, prévia, negação, Explorer. Só o executor é stub |
| Permissão | ❌ | A permissão **funciona** e é conservadora. `docs/09:901`: *"`excluir` segue fail-closed e distinta de `executar`; nenhuma permissão de shell a desbloqueia"* |
| Diferença de escopo | ⚠️ **parcial** | É verdade que **não era escopo da 13**. Mas era escopo **homologado da 12** — então chamar de "diferença de escopo" esconde que algo aprovado **deixou de funcionar** |
| **Regressão + precondição órfã** | ✅ | §2.3: desligada como *"temporariamente"*, condicionada a um helper que **D121 desativou permanentemente**, e descrita desde então como *"decisão anterior"* que **não existe** |

**O achado de teste que acompanha a regressão (E1 por leitura; dedução, não execução):**

- `e2e/excluir_fatia12.spec.ts` continua **ativa — sem `skip`, sem `fixme`, sem marca de quarentena** (verifiquei). Ela afirma exclusão **real**: `expect(existsSync(\`${PASTA}/alvo.txt\`), 'aprovado some da pasta').toBe(false)` e `readFileSync(\`${TRASH}/files/alvo.txt\`) === 'conteúdo do alvo 12'` e `.trashinfo` contendo o caminho de origem — usando a **lixeira real do Linux** (`~/.local/share/Trash`).
- **Contra o código atual essa spec não pode passar.** Dedução de leitura, **não executada** nesta missão.
- Enquanto isso, `__tests__/excluir.test.ts` foi **reescrito para afirmar o oposto**: `describe('excluir — fora do escopo desta missão e fail-closed')`, com `expect(arquivo.resumo).toContain('Exclusão bloqueada')`.
- E `docs/09:165` ainda declara a régua canônica: *"Ordem canônica **OBRIGATÓRIA**… `excluir_fatia12`. Esperado: 6/6 + 5/5 + 5/5 + 2/2 + **5/5 = 23/23**."*

**Dois artefatos de teste do mesmo comportamento afirmam coisas contraditórias, e nenhum registro aponta a contradição.** Isso fere o espírito de **D79** — *"Quarentena de teste **nunca é silenciosa**… spec com 100% dos testes em quarentena precisa **citar o registro**"* — não porque a spec foi quarentenada, mas porque **ela deveria ter sido e não foi**: foi deixada ativa e vermelha, enquanto o teste unitário era virado ao contrário.

*(Registro de precisão: `docs/09:470` **está correto** e já diz a verdade — *"Windows/macOS e junction/reparse não testados; **exclusão não implementada**; F2 incompleta"*. `docs/09:502` também. A contradição é **interna ao próprio `docs/09`**: L470/L502 dizem "não implementada", L165 diz "5/5".)*

### 3.5 "Quais cenários já foram homologados e quais ainda não foram?"

**Homologados por declaração do dono (Windows):**

| Fatia | Cenários | Fonte |
|---|---|---|
| **12** (D97, 21/10) | Cartão reforçado com prévia e aviso "Sem desfazer direto" · negar = nada some · **pasta com contagem → lixeira** · sessão nunca cobre · território = pasta ativa | `docs/08:107-118` (roteiro de 8 passos) · `docs/05` D97 |
| **12 — ressalva já registrada** | *"o retest no Windows real dos **C4+C5 não foi confirmado** neste chat (homologação por declaração, padrão D94)"* | `docs/05` D97 · `docs/08:118` |
| **13** (29/10) | Conversas · leitura/criação/edição · **comandos PowerShell reais** · `Rename-Item` com conteúdo preservado · Manual e Permitir tudo nos cenários testados · Perguntar/Planejar sem criar arquivos · `Parar` após 30 s · PTY humano operacional | `docs/06:486` · `docs/03` · `docs/08` |
| **13 — ressalva já registrada** | *"É declaração manual do dono, **não E2E automatizado** do agente. Não foram afirmados testes de todos os comandos, shells, permissões, provedores ou acesso externo."* | `docs/06:486` |

**Não homologados / atualmente quebrados:**

| Item | Estado |
|---|---|
| 🔴 **Exclusão real de arquivo pelo agente** | **Não funciona em nenhuma plataforma desde o episódio F2 (~27/10)**. A homologação D97 descreve um comportamento que **o código atual não produz** |
| 🔴 **Exclusão real de pasta pelo agente** | idem |
| 🔴 **E2E `excluir_fatia12` 5/5** | **Não pode estar passando** (dedução de leitura, §3.4). A régua "23/23" de `docs/09:165` está **desatualizada** |
| 🟡 **Honestidade do anúncio ao modelo** | Nunca homologada; defeito presente (§3.1) |
| 🟡 **C4/C5 no Windows real** | já registrado como não confirmado em D97 |
| 🟡 **Automação Linux/Windows da Fatia 13** | só manual; `docs/09:901` reafirma os limites |

---

## §4 — A menor proposta de regularização contratual

O senhor pediu: *"Se a exclusão estiver fora do escopo original da Fatia 13, apresente a menor proposta de regularização contratual antes de incorporá-la à implementação."*

**Está fora do escopo da 13.** As três opções que avaliei:

| | Opção | Custo | Problema |
|---|---|---|---|
| **R1** ✅ **recomendada** | **Restaurar o contrato já homologado** (SPEC 2F + D97) sob o **modelo de contenção que D121 já estabeleceu para as cinco ferramentas irmãs** | Baixo — o desenho existe, foi implementado, foi homologado; o que falta é religar e revalidar | Exige **uma decisão** do senhor (levantar o fail-closed) e revalidação por plataforma |
| **R2** | Manter bloqueada e **tornar o bloqueio honesto** (desanunciar `excluir`, ajustar `ferramentas.ts:58`) | Muito baixo | **Anula retroativamente a homologação D97.** O senhor homologou uma capacidade que deixaria de existir oficialmente. Custo de governança maior que o de código |
| **R3** | Embutir na **DEBT-23** (lixeira × permanente × YOLO) | Médio | **Mistura duas coisas distintas**: restaurar o que foi homologado (lixeira, recuperável) × acrescentar o que nunca foi (exclusão permanente, YOLO). E DEBT-23 exige **ordem expressa** para reabrir SPEC 2F §6 ("nunca-permanente"), que não foi dada |

### 4.1 R1 detalhada — a menor regularização possível

**Nenhum contrato novo precisa ser escrito.** O contrato é SPEC 2F + D97, e continua válido. O que precisa ser registrado é:

| # | Item | Natureza |
|---|---|---|
| **1** | **Decisão do dono** levantando o fail-closed da `excluir`, com o fundamento explícito: **D121 já aceitou, para as cinco ferramentas irmãs, acesso por caminho sob permissões normais do SO, sem claim de contenção física.** Aplicar à exclusão o **mesmo** modelo, nem mais nem menos fraco. | 🔴 **só o dono decide** |
| **2** | **Corrigir a precondição órfã** em `lixeira.ts:1-4`: substituir *"até a lixeira ser integrada ao helper de handles"* pela condição real vigente pós-D121 (validação por plataforma + território + raiz nunca alvo + contagem antes de mover). | contratual |
| **3** | **`discos.ts:271` deve chamar `moverParaLixeira`**, e não stubar por conta própria. Elimina as **duas** mensagens divergentes e o vazamento de vocabulário de missão. | contratual |
| **4** | **Enquanto estiver bloqueada, o anúncio deve dizer a verdade.** `ferramentas.ts:58` promete lixeira; ou a capacidade volta, ou a descrição passa a dizer que está indisponível, ou `excluir` sai do anúncio (`vizinho.ts:179` já aceita `permitidas`). **Isto vale mesmo que o senhor escolha R2.** | 🔴 honestidade — **defeito presente hoje** |
| **5** | **Quarentena com registro** de `e2e/excluir_fatia12.spec.ts` (padrão **D79**: nunca silenciosa, citar o registro em `docs/09`) **até** a restauração — ou restaurar primeiro e manter a spec ativa. **O estado atual (ativa e vermelha, sem registro) é o pior dos três.** | 🔴 rastreabilidade |
| **6** | **Corrigir `docs/09:165`**: a régua "23/23" incluindo `excluir_fatia12` 5/5 não descreve o código atual. | documental |
| **7** | **Revalidar por plataforma**: Linux (XDG + `.trashinfo`) e **Windows** (Lixeira real via PowerShell, com `-NonInteractive` e teto — o C4 já ensinou). macOS: erro honesto, como antes. | teste |
| **8** | **Não misturar com DEBT-23.** Exclusão **permanente** e YOLO continuam fora, e SPEC 2F §6 ("nunca-permanente") **continua valendo** até ordem expressa. | escopo |

### 4.2 Onde encaixar — e aqui há uma dependência nova que encontrei

**Não recomendo anexar à Fatia 13.** Motivos:
1. A SPEC 2G **exclui expressamente** a `excluir`; anexar reescreveria um contrato fechado e homologado.
2. A exclusão é escopo da **12**, e a 12 está homologada — o correto é registrar a **regressão** e tratá-la como dívida, não reabrir a fatia.
3. O precedente do projeto para isto já existe: **D98 / MICRO-FATIA PERF — *"entre a 12 e a 13, sem renumerar"***. É o mecanismo aprovado para inserir trabalho sem tocar na numeração.

**Recomendo: `DEBT-24` + MICRO-FATIA DELETE (restauração), posicionada entre a 13 e a 14, sem renumerar.**

**E há uma razão concreta para ser antes da 14, não depois.** SPEC 2H §2(d), entregável da Fatia 14:
> *"(d) **Ferramentas** lista as **tools reais (as 5 + `excluir` + `executar`)** com liga/desliga por grupo"*

**A Fatia 14 vai renderizar um interruptor para `excluir`.** Se a ferramenta continuar quebrada, a barra de Personalizações vai oferecer ao usuário **liga/desliga de uma capacidade que não existe** — e RF14-4 (*"ferramenta desligada = some do anúncio ao modelo"*) implica que **ligada** ela anuncia ao modelo uma mentira. A Fatia 14 **transforma o defeito de anúncio (§3.1) em defeito de interface visível.**

> **Esta é uma dependência real 14 → restauração da exclusão, que não estava registrada em D99 nem na minha Task 03.** D99 analisou "M × 13–15"; ninguém analisou "14 × estado real das ferramentas que ela vai listar".

---

## §5 — Registro das decisões de sequência (carta §1, §3, §5)

### 5.1 Sequência confirmada

```
[Fatia 13 — implementada; homologação manual registrada; divergência §2 deste relatório]
        │
        ▼
[DEBT-24 / MICRO-FATIA DELETE — restauração da exclusão]   ← proposta, depende de aprovação
        │
        ▼
[GATE D129 — decidir DP-03 e DP-06]   ← decisão, não código
        │
        ▼
FATIA 14 (SPEC 2H fechada) ──▶ FATIA 15 (SPEC 2I fechada) ──▶ M1 ─▶ M2 ─▶ M3 ─▶ M4 ─▶ (M5 ─▶ M6) ─▶ M7 ─▶ M8
                                                                                    │
                                                                                    └──▶ roadmap posterior (16–20), a confirmar nos canônicos antes de qualquer alteração
```

| Item | Registro |
|---|---|
| **Sequência principal** | 13 → 14 → 15 → M1–M8. **Confirmada pelo dono.** |
| **Antecipação de M1–M8** | ❌ **Recusada pelo dono.** Nenhuma das oito será implementada antes de 14/15. |
| **Numeração** | **Preservada.** M1–M8 **não geram renumeração** das fatias oficiais. Precedente D98 (*"entre a 12 e a 13, sem renumerar"*) e rótulos M (`docs/02 §4`: *"não são números oficiais de fatia"*) mantidos. |
| **Roadmap posterior a M** | 16 → 20 nos escopos existentes (`docs/06` Parte 3). **A sequência deverá ser confirmada nos canônicos antes de qualquer alteração** — registrado como pendência, não como autorização. |
| **SPECs 2H e 2I** | **Não reabertas.** Contratos preservados. O único acréscimo proposto é o gate D129 e a nota sobre `excluir` na lista de ferramentas da 14 — **adendo, não reabertura**. |
| **Posição de M1–M8** | **Posterior às Fatias 14 e 15**, como já constava em `docs/06:556` e `docs/06:616`. **Nada mudou.** |

### 5.2 Gate D129 — DP-03 e DP-06 antes da codificação da Fatia 14

**Fundamento técnico (verificado em código na Task 05, `14_…` §4):** não existe ponto de composição de prompt no servidor. O histórico é montado no browser (`App.tsx:1678`, chamado em `:2066` e `:2170`); o servidor apenas copia (`rotas.ts:332` → `agir.ts:96` `[...opcoes.historico]` → `:113` envia), e `agir.ts:91` declara *"O `historico` de entrada **NUNCA é alterado**"*. **Não há `system prompt` em todo o caminho servidor** (grep em `bairros/2-inteligencia`, `server`, `services` → zero resultados fora de testes) e **o contrato não tem papel `'system'`** (`agir/contract.ts:73`: `'usuario' | 'assistente' | 'ferramenta'`).

A SPEC 2H exige *"injetar skill no loop"* (RF14-2 + critério de aceite 3). Hoje isso só pode entrar em `agir.ts:96`, e sem papel `'system'` entraria como `'usuario'` — criando um **segundo** ponto de composição e fazendo instrução do dono viajar disfarçada de fala do usuário.

**Orientação arquitetural registrada (do dono):** *evitar dois mecanismos independentes de montagem de contexto, um no frontend e outro no backend; concentrar a composição no servidor, com contratos claros, respeitando separação de responsabilidades e a futura integração com Skills e memória.*

**Alcance da autorização — e aqui preciso ser explícito, porque o senhor foi:**

| Autorizado | NÃO autorizado |
|---|---|
| ✅ **Registrar a necessidade** do alinhamento DP-03/DP-06 antes da Fatia 14 | ❌ Considerar as soluções detalhadas **homologadas** |
| ✅ **Preparar a proposta técnica** | ❌ Implementar qualquer parte dela |
| ✅ Apresentar as escolhas estruturais ainda necessárias | ❌ Alterar `agir/contract.ts`, `App.tsx`, `vizinho.ts` ou qualquer código |

**Escolhas estruturais que continuam exigindo aprovação explícita do senhor** (nenhuma está decidida):

| # | Escolha | Opções | Recomendação da investigação (não homologada) |
|---|---|---|---|
| **E-1** | **Papel da instrução no contrato** | (a) acrescentar `'system'` a `MensagemAgir.papel` · (b) campo separado `instrucoes` fora do array de mensagens · (c) manter `'usuario'` com marcador | **(b)** — não polui o transcript, não obriga os 4 protocolos a traduzir um papel novo, e separa "o que o usuário disse" de "o que o produto instrui". `traduzirHistorico` (`vizinho.ts:180`) já é o lugar onde cada protocolo recebe o formato próprio |
| **E-2** | **Endereço da composição** | (a) `chatAlvo.ts` (prefeitura) · (b) novo módulo na casa Agir · (c) casa nova | **(a)** — já é o endereço do alvo efetivo e já carrega a regra *"segredo nunca vai ao browser"*. Criar (b) ou (c) é o *"second registry"* que o DSH rejeitou |
| **E-3** | **Migração do `montarHistorico`** | (a) remover de uma vez · (b) 4 etapas aditivas, servidor **prefere** o próprio log e **reporta** a fonte usada | **(b)** — compatível com a regra 3 de `docs/04 §1` (duas fontes temporárias com reporte), reversível, e não exige que a 14 espere M3 |
| **E-4** | **Contrato do resultado de ferramenta (DP-03)** | (a) integral · (b) localizador · (c) spill · (d) truncamento · **(e) união discriminada por origem** | **(e)** — `ler`/`buscar`/`listar` → localizador `{arquivo, intervalo, digest, seq}`; `executar` → conteúdo (não há outra cópia, D126 one-shot). **Sem spill** no primeiro corte (P2: 235 KB em p50 1,895 ms) |
| **E-5** | **Ordem do gate** | (a) decidir antes da 14 · (b) decidir durante a 14 · (c) decidir depois | **(a)** — é o que o senhor autorizou registrar; (b) é o que acontece hoje por omissão |

### 5.3 Preferências funcionais de memória e identidade (carta §5)

**Confronto com a documentação existente, distinguindo o que já está aprovado do que continua pendente:**

| Preferência do dono | Já é canônico? | Onde | Status |
|---|---|---|---|
| Recuperação contextual de conversas anteriores do mesmo projeto, sem carregar todo o histórico | ⚠️ **parcial** — é a visão CAP-10, sem SPEC | `docs/02 §1.3` CAP-10 · `docs/06` IC-04 | 🟡 **proposta** — M4 + M6, só planejamento (D102/D109) |
| **Aprovação humana para gravar memórias permanentes** | ✅ **SIM, já aprovado** | **D99** (*"aprovação humana para memórias persistentes"*) · `docs/02 §1.4` | 🟢 **decisão vigente** — não precisa de nova aprovação |
| Projetos em caminhos distintos com memórias e históricos independentes | ❌ **não registrado** | — | 🟡 **preferência nova** — responde 🔎 H6; ver §5.4 |
| Pasta que desaparece → informar e aguardar escolha manual, **sem identificação automática por Git** | ❌ **não registrado** | — | 🟡 **preferência nova** — ver §5.4 |
| Preservar escopos de conversa, projeto e usuário, com arquitetura preparada para implantação gradual | ⚠️ **parcial** — `docs/02 §1.4` exige *"isolamento entre projetos e conversas"* | `docs/02 §1.4` | 🟡 **proposta** — o terceiro escopo (usuário) é novo; DP-05 |
| Evitar refatorações previsíveis por contratos consistentes antes da implementação | ✅ **SIM, é princípio vigente** | **D109** (*"Investigações preparatórias podem correr em paralelo, sem alterar sequência"*) · `docs/04 §1` | 🟢 **decisão vigente** |

### 5.4 Consequência técnica das duas preferências novas sobre DP-01

**Ambas apontam na mesma direção e simplificam DP-01 substancialmente.** Registro aqui a **correção da minha própria recomendação** feita em `13_…` §2.6:

| O que eu recomendei em DP-01 (`13_…` §2.6) | Efeito das preferências do dono |
|---|---|
| **Camada 1** — canonicalizar `realpath` + NFC **antes** de derivar a chave | ✅ **Permanece, e fica mais importante.** "Caminhos distintos = projetos distintos" só é regra justa se o caminho for o **real**. Hoje `session-persistence/paths.ts:30-34` deriva de string sem canonicalização: não-alfanumérico → `-`, acima de 80 caracteres trunca + FNV-1a 8 hex. `C:\Proj`, `c:\proj` e um symlink para `C:\Proj` podem gerar chaves diferentes **para a mesma pasta** — violando a preferência no sentido oposto |
| **Camada 2** — `projetoId` opaco com namespace por origem (`'git-remote:'` / `'directory:'`) | ❌ **Retirada.** Existia para **unificar** origens; o dono quer **separar** |
| **Camada 3** — tabela `projeto_diretorio` 1:N no banco global | ❌ **Retirada.** 1:N só faz sentido se vários diretórios podem apontar para o mesmo projeto |
| **Escada**: remote normalizado → SHA do commit raiz → caminho canonical | ❌ **Dois primeiros degraus retirados** — a preferência diz **"sem identificação automática por Git"** de forma explícita. Resta apenas o caminho canonical |
| **Re-vínculo manual** quando o caminho não resolve | ✅ **Confirmado e promovido a requisito**: *"informar o problema e aguardar uma escolha manual"* |

**DP-01 reformulada (proposta, não homologada):**
> A identidade de projeto **é o caminho real canonicalizado** (`realpath` + NFC), derivado pelo algoritmo existente. Quando o caminho não resolve, **informar e aguardar escolha manual** — nunca inferir, nunca identificar por Git. Re-vincular é operação **manual, explícita, confirmada e registrada**; mover pasta **desvincula, nunca apaga**; fusão de históricos, se um dia desejada, é **migração com prévia e confirmação**, jamais efeito colateral da derivação de chave.

**Compatibilidade com dados existentes — o senhor pediu explicitamente, e é o ponto mais delicado:**

- **Não substituir o algoritmo** `sanitizePath` + FNV-1a/80 de `paths.ts:30-34`. **Motivos verificados:** (i) já existe dado gravado em `~/.agente_window/projects/<slug>/` — trocar a derivação **órfã esse histórico**; (ii) o VS Code congela a própria derivação com aviso *"DO NOT CHANGE"*; (iii) o OpenCode **documenta a falha** de trocar hash entre runtimes (CLI usa `Bun.hash`, SDK usa `djb2` → pastas diferentes; o remédio foi varrer por prefixo).
- **Canonicalizar é aditivo e seguro**: `realpath` + NFC produz, para o caminho já normal, **a mesma string** — logo o mesmo slug. Só diverge quando o caminho **não** era o real (symlink, caixa diferente no Windows, forma Unicode diferente). Nessas situações o comportamento atual já é inconsistente.
- **Recomendação de segurança:** aplicar a canonicalização **acompanhada de um teste de não-regressão** que prove que, para um conjunto de caminhos reais já em uso, o slug produzido **não muda**. Se mudar para algum, o caso precisa de **migração explícita** (renomear a pasta de projeto + registrar), nunca de troca silenciosa.
- **Risco residual a registrar:** `realpath` **falha** se o caminho não existe. É exatamente o caso da preferência "pasta desapareceu". Logo a canonicalização precisa de duas saídas: caminho resolve → canonicaliza e deriva; **caminho não resolve → não deriva nada, informa e aguarda escolha manual.** Isso **implementa** a preferência em vez de apenas convivere com ela.

**Custo conhecido da preferência de separação, para aceitar de olhos abertos:** histórico e memória ficam **atados à estabilidade do caminho**. Trabalhar no mesmo repositório em duas pastas **não compartilha nada**. É a posição mais segura contra vazamento entre projetos (o risco R-2/R-4 de DP-03), e é coerente com "sem identificação automática por Git" — mas significa que a utilidade da memória depende de o caminho não mudar. A contrapartida é o re-vínculo manual acima.

---

## §6 — Adiamento da discussão metodológica (carta §6)

Registrado conforme pedido, sem executar nada:

| Item | Registro |
|---|---|
| **Os 14 pontos de atenção** sobre metodologia e eficiência do ciclo de entrega | ⏸️ **ADIADOS** — ficarão para **depois** do tratamento das Fatias 13, 14 e 15 |
| **Quarta filosofia arquitetural** | ❌ **Não criada.** Nenhuma proposta foi elaborada nesta missão |
| **Transformar os pontos em regras** | ❌ **Não feito.** Nenhuma regra nova foi introduzida em `docs/01` ou `docs/04` |
| **Nova investigação metodológica** | ❌ **Não aberta** |
| **As três filosofias existentes** | ✅ **Permanecem válidas**: arquitetura de condomínio · arquitetura Lego · aproveitar soluções existentes sem introduzir complexidade desnecessária |
| **A carta com os 14 pontos** | **Não foi recebida.** As duas missões anteriores anunciaram que ela viria; ela não veio. **Nada foi analisado sobre ela.** Quando chegar, será tratada como missão própria |

**Nota:** a única vez que esta missão tocou em eficiência de ciclo foi ** incidental** — o gate D129 (§5.2) reduz retrabalho, mas é uma **decisão de arquitetura**, não uma regra metodológica nova. Não foi registrado como tal.

---

## §7 — Conflitos documentais encontrados

Todos os seis são **contradições entre documentos canônicos, ou entre documento e código**. Nenhum foi corrigido silenciosamente: cada um recebeu registro explícito e indicação do que prevalece.

| # | Conflito | Lados | Resolução registrada |
|---|---|---|---|
| **CF-1** 🔴 | **`excluir`: "bloqueada por decisão anterior" × nenhuma decisão existe** | `docs/05:225`, `docs/07:19`, `docs/08:145` dizem *"bloqueada por decisão anterior"* · `docs/05` D1–D126 **não contém** tal decisão · `lixeira.ts:1` diz *"**temporariamente**"* · `docs/05:190` é **escopo de missão** (*"não autoriza implementar"*) | **Prevalece o código + a ausência de decisão.** Registrado como **D128 + DEBT-24**. A expressão *"decisão anterior"* é **corrigida expressamente** nos três locais, sem apagar o texto histórico |
| **CF-2** 🔴 | **Fatia 12 homologada com exclusão funcional × código atual sem exclusão** | `docs/05` D97 e `docs/08:118`: *"Cobre a tool `excluir` (arquivo+pasta → lixeira do SO)"* · `discos.ts:271` e `lixeira.ts:17-21`: sempre `ok:false` | **Ambos são verdadeiros em datas diferentes.** Registrado como **regressão** (D128). A homologação D97 **não é apagada** — seu **alcance** fica explícito: descreve o estado de 21/10, não o atual |
| **CF-3** 🔴 | **`docs/09:165` régua "23/23" com `excluir_fatia12` 5/5 × spec que não pode passar × `docs/09:470/502` que dizem "exclusão não implementada"** | contradição **interna ao próprio `docs/09`** | **Prevalecem L470/L502** (descrevem o código). L165 recebe **nota de correção**, sem apagar o registro histórico |
| **CF-4** 🟡 | **Anúncio ao modelo promete lixeira × prévia do cartão diz indisponível** | `ferramentas.ts:58` (promete) via `vizinho.ts:179` (sem filtro) × `discos.ts:87` (nega) | **Defeito de honestidade presente.** Registrado em DEBT-24 item 4. Vale **mesmo se o dono escolher R2** |
| **CF-5** 🟡 | **`lixeira.ts` condiciona restauração ao "helper de handles" × D121 desativa o helper permanentemente** | `lixeira.ts:1-4` × `docs/04:102` (*"helper nativo permanece desativado"*) | **Precondição órfã.** Registrada como a **causa-raiz** em D128. A condição de restauração passa a ser a de D121, não a de F2 |
| **CF-6** 🟡 | **SPEC 2H manda listar `excluir` em Ferramentas × `excluir` não funciona** | `docs/06` SPEC 2H §2(d): *"as 5 + `excluir` + `executar`"* | **Dependência nova, não registrada em D99.** A Fatia 14 tornaria o defeito **visível na interface**. Registrada como razão para DEBT-24 vir **antes** da 14 |

---

## §8 — O que continua pendente de aprovação do senhor

| # | Pendência | Bloqueia |
|---|---|---|
| **P-1** 🔴 | **Levantar o fail-closed da `excluir`** (R1 item 1) e autorizar a MICRO-FATIA DELETE / DEBT-24 | O fechamento funcional do CRUD · a honestidade da lista de Ferramentas da Fatia 14 |
| **P-2** 🔴 | **Escolher R1, R2 ou R3** (§4) | idem |
| **P-3** 🔴 | **As cinco escolhas estruturais E-1 a E-5** do gate DP-03/DP-06 (§5.2) | A codificação da Fatia 14 |
| **P-4** 🟡 | **Confirmar a posição da MICRO-FATIA DELETE**: entre 13 e 14 (recomendado, precedente D98) · dentro da 14 · depois da 15 | A sequência |
| **P-5** 🟡 | **Autorizar quarantenar `excluir_fatia12.spec.ts` com registro D79**, ou restaurar a exclusão primeiro | A rastreabilidade de testes · a régua `docs/09:165` |
| **P-6** 🟡 | **Confirmar a sequência do roadmap posterior a M8** (16 → 20) nos canônicos, como o senhor pediu | Nada imediato — mas o senhor pediu confirmação antes de qualquer alteração |
| **P-7** 🟢 | **Homologação oficial da Task 01** (persistência) — aprovada tecnicamente, **sem homologação oficial registrada** | M2, que tem a Task 01 como base |
| **P-8** 🟢 | **Gate D98** — implementado, **aberto e não homologado** (`docs/06:387`) | Nada imediato |
| **P-9** 🟢 | **F1–F4 não homologadas** — e `docs/06:599` exige tratá-las *"antes de ampliar autonomia ou adicionar ferramentas com novos efeitos"*. **Restauration de `excluir` é restaurar ferramenta já aprovada, não adicionar nova** — mas M6 (`recordar`) **é** nova | M6 |

---

## §9 — Limitações registradas sem contornar

- **Nenhuma exclusão foi executada**, nem em arquivo real nem em fixture. O senhor proibiu, e a spec E2E ativa é destrutiva por construção (apaga em `/tmp/excluir-e2e-ws` e escreve na lixeira real do Linux).
- **Nenhum teste foi executado nesta missão.** A afirmação de que `excluir_fatia12.spec.ts` não pode passar é **dedução de leitura de código (E1)**, não observação. Para virar prova, é preciso autorizar a execução — sabendo que ela apaga arquivos.
- **Não há histórico Git utilizável.** Minha cópia local está em `main`/`fe218b8` com **um único commit sintético e sem remote** (a Missão 1 fez `rm -rf .git && git init`). O HEAD real é `0dfe3c2…`. **Os commits `44bbd67` e `133affa` foram citados a partir de `docs/07`, não inspecionados** — não posso confirmar o conteúdo desses diffs, apenas o que o histórico documental afirma sobre eles.
- **A implementação anterior da lixeira não está mais no código.** `lixeira.ts` conserva a **assinatura** (`OpcoesLixeira` com `plataforma`, `pastaTrash`, `executar` injetável) mas o corpo foi removido. **Não sei, sem consultar o histórico Git real, quanto do código de 21/10 é recuperável.** Se o commit `44bbd67` existir no repositório oficial, a restauração é barata; se não existir, é reescrita. **Isto é uma incógnita que afeta diretamente o esforço de DEBT-24** e só se resolve consultando o Git oficial — que esta cópia não tem.
- **Windows não foi testado aqui.** Nenhum PowerShell real, nenhuma Lixeira real do Windows. O cenário C4 (switch `-NonInteractive`) é registro documental do teste do dono em 21/10.
- **`docs/08` e `docs/09` foram lidos apenas nos trechos que mencionam `excluir`/lixeira/Fatias 12-13.** Não fiz leitura integral; pode haver outro registro de alcance que eu não tenha encontrado.
- **Estimativas de esforço são ordens de grandeza (E4)**, não medição. Não há base de velocidade no projeto para estimar horas.

---

## §10 — Resumo em linguagem simples

**O senhor percebeu uma coisa real, e ela é mais séria do que parecia.**

**A exclusão já funcionou.** Em 21 de outubro a Fatia 12 foi implementada: no Linux ela movia o arquivo para `~/.local/share/Trash` com o bilhete de origem (`.trashinfo`), no Windows ela usava a Lixeira real via PowerShell. O senhor testou no Windows, encontrou um defeito real — o código usava um parâmetro `-NonFatal` que **não existe** no PowerShell 5.1 — e isso foi corrigido para `-NonInteractive`. Depois o senhor disse *"a fatia 12 ja esta homologada"*, e isso virou a decisão **D97**. Existe até hoje o roteiro de 8 passos que o senhor seguiu, em `docs/08`.

**Depois ela foi desligada.** Durante uma auditoria de segurança no fim de outubro, descobriu-se que operações baseadas em caminho não resistem a um truque de troca de pasta no meio da operação (TOCTOU). A reação foi desligar tudo que era "fail-closed" — e a exclusão entrou junto. O comentário no código diz **"temporariamente"**, e diz qual era a condição para religar: *"até a lixeira ser integrada ao helper de handles e validada por plataforma"*.

**Só que esse helper foi aposentado.** Dois dias depois, a decisão **D121** — que o senhor pediu — relaxou justamente essa exigência para as outras cinco ferramentas: `ler`, `listar`, `buscar`, `criar` e `escrever` passaram a operar por caminho, com as permissões normais do sistema, sem promessa de contenção física. E o mesmo texto diz: *"helper nativo permanece desativado"*.

**Ou seja: a exclusão está esperando um componente que o projeto decidiu não usar mais.** Ninguém decidiu manter a exclusão desligada. Ela ficou presa a uma condição que deixou de existir. E, com o tempo, os documentos começaram a dizer *"bloqueada por decisão anterior"* — **mas eu procurei essa decisão em `docs/05`, de D1 a D126, e ela não existe.** O que existe é um comentário de código dizendo "temporariamente" e uma frase de escopo de missão dizendo *"não autoriza implementar"* — que é diferente de *"decidiu não implementar"*. **Um limite provisório de uma missão virou política permanente por repetição.**

**Três consequências práticas que o senhor precisa conhecer:**

**Primeira: o modelo está sendo enganado.** Em **toda** chamada, o servidor anuncia as sete ferramentas sem filtro (`vizinho.ts:179`). A descrição da `excluir` diz: *"Move um arquivo ou pasta da pasta de trabalho para a LIXEIRA do sistema (nunca apaga permanente; restaurar é pela lixeira)."* **É uma promessa que sempre falha.** Curiosamente, o **cartão que o senhor vê é honesto** — diz *"A exclusão não está disponível nesta versão"*. A verdade aparece para o humano e a mentira para o modelo.

**Segunda: os testes se contradizem, e ninguém registrou.** O teste unitário foi **reescrito** para afirmar o bloqueio (`describe('excluir — fora do escopo desta missão e fail-closed')`). Mas o teste E2E da Fatia 12 continua **ativo, sem skip, sem quarentena**, afirmando que o arquivo **some da pasta e aparece na lixeira real**. Contra o código atual, **ele não pode passar**. E `docs/09` ainda declara, na linha 165, que a régua obrigatória dá **23/23 incluindo `excluir_fatia12` 5/5** — enquanto as linhas 470 e 502 do mesmo arquivo dizem *"exclusão não implementada"*. **O documento contradiz a si mesmo.** Isto fere o espírito da sua regra D79: *"quarentena de teste nunca é silenciosa"*.

**Terceira: a Fatia 14 vai tornar isto visível.** A SPEC 2H manda a barra de Ferramentas listar *"as 5 + `excluir` + `executar`"* com liga/desliga. Se a exclusão continuar quebrada, a tela de Personalizações vai oferecer um interruptor para uma capacidade que não existe — e, ligado, ela anuncia ao modelo uma mentira. **Ninguém tinha registrado essa dependência.** A análise D99 cruzou "memória × fatias 13–15"; ninguém cruzou "Fatia 14 × estado real das ferramentas que ela vai listar".

**O que eu recomendo:**

1. **Não anexar isto à Fatia 13.** A SPEC 2G exclui expressamente a `excluir`, e a Fatia 13 foi homologada — anexar reescreveria um contrato fechado. O trabalho da 13 (`executar`) **está inteiro e deve ser preservado**.
2. **Registrar como `DEBT-24` + uma MICRO-FATIA DELETE, entre a 13 e a 14, sem renumerar** — usando exatamente o precedente que o senhor já aprovou para o desempenho (D98: *"entre a 12 e a 13, sem renumerar"*).
3. **Restaurar sob o modelo que D121 já criou.** Não é preciso inventar contrato novo: é aplicar à exclusão **o mesmo** nível de garantia que as cinco ferramentas irmãs já têm — caminho + permissões normais do SO + as proteções que já existem (cartão sempre pergunta, sessão nunca cobre, Permitir tudo não habilita, território conferido, raiz nunca é alvo, contagem antes de mover, prévia honesta). **Nem mais fraco, nem mais forte.**
4. **Consertar o anúncio enquanto estiver bloqueado** — mesmo que o senhor decida não restaurar agora. Ou a capacidade volta, ou a descrição deixa de prometer. **Isto é independente da decisão de restaurar.**
5. **Dar destino ao E2E**: quarentena **com registro** (D79), ou restaurar primeiro e mantê-lo ativo. **O estado atual — ativo, vermelho e não registrado — é o pior dos três.**
6. **Não misturar com DEBT-23.** Exclusão **permanente** e modo YOLO continuam fora. SPEC 2F §6 ("nunca-permanente") **continua valendo** até o senhor dar ordem expressa.

**Uma incógnita que afeta o esforço, e que eu não consigo resolver daqui:** a implementação de 21 de outubro **não está mais no código** — sobrou só a assinatura da função. Se os commits `44bbd67` e `133affa` existirem no repositório oficial do GitHub, restaurar é barato (recuperar + revalidar por plataforma). Se não existirem, é reescrita. **Minha cópia local não tem remote nem histórico real**, então não posso verificar. **Vale o senhor olhar o GitHub oficial antes de autorizar a micro-fatia**, para sabermos qual dos dois casos é.

**Sobre a sequência:** registrei exatamente como o senhor decidiu — **13 → 14 → 15 → M1 a M8**, sem antecipar nenhuma das oito, sem renumerar nada, e com o roadmap posterior (16 a 20) **a confirmar nos canônicos antes de qualquer alteração**. As SPECs 2H e 2I **não foram reabertas**. E o gate **DP-03 + DP-06 antes da Fatia 14** ficou registrado como **necessidade autorizada e proposta a preparar** — **não como solução homologada**. Listei as cinco escolhas estruturais (E-1 a E-5) que continuam dependendo do senhor.

**Sobre a identidade de projeto:** as suas duas preferências novas — *caminhos distintos são projetos distintos* e *pasta que sumiu informa e espera escolha manual, sem Git* — **respondem a pergunta que eu tinha registrado como "só o dono pode responder"**, e **simplificam** DP-01. Três das cinco peças que eu havia proposto **deixam de ser necessárias**: o identificador opaco por origem, a tabela de vários diretórios para um projeto, e a escada que tentava reconhecer o mesmo projeto pelo remote do Git ou pelo primeiro commit. **Sobrou o essencial:** canonicalizar o caminho real antes de derivar, e informar + perguntar quando ele não resolve.

**E o senhor acertou em exigir compatibilidade com os dados existentes.** Minha recomendação é **não trocar o algoritmo** de identificação — até porque o VS Code congela o dele com aviso de "não mude", e o OpenCode documenta que trocar hash quebrou entre versões. **Canonicalizar é aditivo**: para um caminho já normal, produz a mesma string e o mesmo slug; só diverge onde hoje o comportamento já é inconsistente. Mesmo assim, recomendo que a mudança venha **com um teste de não-regressão** provando que o slug de caminhos reais em uso **não muda** — e, se mudar para algum, que seja **migração explícita com registro**, nunca troca silenciosa.

**Um detalhe técnico que faz a sua preferência funcionar de verdade:** `realpath` **falha** quando o caminho não existe — que é justamente o caso da pasta que desapareceu. Então a canonicalização precisa ter duas saídas: *resolve → canonicaliza e deriva*; **não resolve → não deriva nada, informa e espera o senhor escolher.** Assim a sua preferência deixa de ser uma convivência com o problema e vira o mecanismo que o trata.

**Um custo para aceitar de olhos abertos:** se histórico e memória pertencem ao caminho, trabalhar no mesmo repositório em duas pastas **não compartilha nada**. É a posição mais segura contra vazamento entre projetos, e é coerente com "sem Git". Mas a utilidade da memória fica atada à estabilidade do caminho. A contrapartida é o re-vínculo manual: explícito, confirmado, registrado, e **nunca** fundindo históricos automaticamente.

**Sobre os 14 pontos metodológicos:** registrei o **adiamento** e não fiz mais nada. **Nenhuma quarta filosofia foi criada, nenhuma regra nova foi introduzida, nenhuma investigação metodológica foi aberta.** As três filosofias permanecem. E a carta com os 14 pontos **ainda não chegou** — as duas missões anteriores anunciaram que ela viria. Quando vier, será tratada como missão própria.

---

## §11 — Conformidade, documentos produzidos e estado do Git

### 11.1 Conformidade com as restrições da carta

| Restrição | Cumprimento |
|---|---|
| Não alterar código-fonte | ✅ **13 arquivos apenas lidos** (§11.3). Nenhum editado |
| Não implementar funcionalidades | ✅ Nada implementado. A restauração da exclusão é **proposta**, não execução |
| Não executar operações destrutivas | ✅ **Nenhuma exclusão executada**, nem em arquivo real nem em fixture |
| Não testar exclusões destrutivas em arquivos reais | ✅ Nenhum teste executado; a spec E2E **não foi rodada** (§9) |
| Não fazer commit ou push | ✅ §11.4 |
| Não iniciar outra fatia | ✅ Nenhuma fatia iniciada — 13, DEBT-24, 14, 15 e M1–M8 permanecem não iniciadas |
| Confrontar cada decisão com o código, SPECs e registros de homologação | ✅ §1–§5, com evidência linha a linha |
| Não deixar informação documental incorreta prevalecer | ✅ **Seis conflitos registrados e resolvidos com indicação do que prevalece** (§7) |
| Preservar o registro histórico da homologação anterior, explicitando o alcance | ✅ D97 e a homologação da 13 **não foram apagadas**; o **alcance** foi explicitado (§3.5) |
| Não declarar CRUD completo homologado | ✅ **Não declarado.** Registrado como **regressão** e **pendência** |
| Apresentar a menor proposta de regularização contratual | ✅ §4, com três opções comparadas e oito itens |
| Autorizar registro do alinhamento DP-03/DP-06 sem homologar soluções | ✅ §5.2 — tabela explícita "autorizado × NÃO autorizado" + **cinco escolhas E-1 a E-5 pendentes** |
| Distinguir decisões aprovadas de propostas pendentes | ✅ §5.3 (tabela "já é canônico?") · §8 (nove pendências) |
| Preservar compatibilidade com dados existentes na identidade | ✅ §5.4 — não trocar o algoritmo, canonicalização aditiva, teste de não-regressão, migração explícita |
| Alterações documentais mínimas e rastreáveis | ✅ §11.2 — seis arquivos canônicos, todos **aditivos**, com o texto histórico preservado |
| Não reescrever contratos aprovados sem necessidade | ✅ SPECs 2F, 2G, 2H e 2I **não reabertas**. D97, D121, D126 **não apagados** |
| Indicar expressamente decisão substituída ou corrigida | ✅ CF-1 a CF-6 (§7) + notas de correção nos próprios canônicos |
| Não criar quarta filosofia / não transformar os 14 pontos em regras / não abrir investigação metodológica | ✅ §6 |
| Preservar numeração das fatias | ✅ Nenhuma renumeração. Precedente D98 reutilizado |

### 11.2 Documentos

**Produzidos na área de investigação (não canônicos):**

| Arquivo | Conteúdo |
|---|---|
| `docs/arquivo_morto/investigacao_memoria_fatias_m/15_TASK06_DIAGNOSTICO_FATIA13_EXCLUIR_E_ALINHAMENTO.md` | **Este relatório.** §0 método · §1 diagnóstico da Fatia 13 · §2 cadeia de evidências da regressão · §3 as cinco perguntas respondidas · §4 menor regularização contratual · §5 sequência, gate D129 e preferências · §6 adiamento metodológico · §7 seis conflitos documentais · §8 nove pendências · §9 limitações · §10 resumo simples · §11 conformidade |
| `docs/arquivo_morto/investigacao_memoria_fatias_m/00_INDICE.md` | **Atualizado aditivamente** — entrada 15 + registro da Task 06 |

**Canônicos alterados nesta missão (autorizado pela carta §7) — todos aditivos:**

| Arquivo | O que foi acrescentado |
|---|---|
| `docs/05 - DECISOES.md` | **Nova seção 17** com **D127** (sequência), **D128** (regressão da `excluir` + correção de *"decisão anterior"*), **D129** (gate DP-03/DP-06), **D130** (preferências funcionais de memória e identidade), **D131** (adiamento metodológico) · **nota de correção aditiva** na Precedência de D126 |
| `docs/06 - PROXIMAS FASES E DIVIDAS.md` | **DEBT-24** na matriz de dívidas · **nota de divergência** na Fatia 13 · **gate D129** na sequência vigente (L556) e na sequência de aprovação (L616) · **nota** na SPEC 2H sobre `excluir` na lista de Ferramentas |
| `docs/03 - ESTADO ATUAL.md` | **Novo bloco de atualização corrente** no topo, com o estado verificado e a divergência |
| `docs/08 - HOMOLOGACAO.md` | **Nota de alcance** na homologação da Fatia 12 (D97) e na da Fatia 13 — explicitando o que cada uma cobre e o que **não** cobre hoje |
| `docs/09 - TESTES E AMBIENTE.md` | **Nota de correção** na régua 23/23 (L165) + registro da contradição entre os dois artefatos de teste |
| `docs/04 - ARQUITETURA E REGRAS DURAS.md` | **Nota de correção** em §313 (precondição órfã) e no §109 (*"bloqueada por decisão anterior"*) |

**Relatórios anteriores NÃO foram reescritos.** As correções a DP-01 vivem em §5.4 deste relatório e na nota aditiva de `00_INDICE.md`, com vínculo explícito a `13_…` §2.6 e a `14_…` §7.1.

### 11.3 Arquivos apenas lidos

**Código-fonte (13, nenhum alterado):** `src/App.tsx` (1678, 1766, 1783, 2066, 2170) · `src/types.ts:14` · `src/components/CartaoFerramenta.tsx` (16, 72, 74, 132) · `agir/contract.ts` (17, 73, 98) · `agir/server/anuncio.ts` (1-81) · `agir/server/ferramentas.ts` (integral) · `agir/server/discos.ts` (1-30, 85-99, 250-273) · `agir/server/lixeira.ts` (integral) · `agir/server/agir.ts` (37, 75, 91, 96, 113, 150, 162, 170, 184-186, 214, 228) · `agir/server/rotas.ts` (25, 332, 340-375, 472-480) · `agir/server/vizinho.ts` (22, 173-183) · `agir/server/executorComando.ts:67` · `session-persistence/database.ts` (72, 119, 128, 133) · `session-persistence/paths.ts:30-34`

**Testes (2, nenhum executado):** `e2e/excluir_fatia12.spec.ts` (1-32, 106-161; verificado **ausência** de `skip`/`fixme`/quarentena) · `agir/__tests__/excluir.test.ts` (19-57)

**Documentação:** `docs/02` (CAP-04, §1.3, §1.4) · `docs/03` (topo) · `docs/04` (102, 109, 313) · `docs/05` (D8, D34, D79, D95, D96, D97, D99, D121, D125, D126, D1–D126 varridos em busca de decisão que bloqueie `excluir`) · `docs/06` (Parte 1 matriz DEBT-01–23, Parte 3, §0 mapa pós-MVP, MICRO-FATIA PERF/D98, Fatias 13/14/15, bloco D99, bloco D102, matriz F1–F8, SPECs 2F/2G/2H/2I) · `docs/07` (19, 68, 69, 163-177, 184, 199, 210, 214, 221-222, 318, 323, 513) · `docs/08` (61, 107-119, 145, 207) · `docs/09` (165, 470, 502, 752-758, 895, 901)

**Investigação anterior:** `11_TASK02_…` · `12_TASK03_…` (Partes B.x.7, C.1–C.4, D) · `13_INVESTIGACAO_COMPLEMENTAR_…` (§2.6, §2.8–§7.7, §8) · `14_TASK05_…` (§1, §3, §4, §7.1)

### 11.4 Estado final do Git (somente leitura quanto a commits)

| Item | Estado |
|---|---|
| Branch / HEAD local | `main` / `fe218b8` (commit único **sintético** — ver §9; o HEAD real do projeto é `0dfe3c2…`) |
| Remote | **nenhum** nesta cópia |
| Commits nesta missão | **nenhum** |
| Push nesta missão | **nenhum** |
| Working tree | alterações em **`docs/arquivo_morto/investigacao_memoria_fatias_m/`** (`00_INDICE.md` + `11_…`, `12_…`, `13_…`, `14_…`, **`15_…`**) **e em `docs/`** (`03`, `04`, `05`, `06`, `08`, `09`) — estas últimas **autorizadas pela carta §7** |
| Código-fonte, testes, dependências | **inalterados** |
| Áreas congeladas (`components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, specs `sessao_11*`, `explorer-search/{core,server}/**`, `EditorArea.tsx`) | **não tocadas** |

### 11.5 Declaração final

**Nenhuma homologação foi declarada neste relatório. A regressão da `excluir` foi registrada como pendência, não como corrigida. Nenhum código foi alterado. Nenhuma exclusão foi executada. As soluções DP-03/DP-06 permanecem propostas, com cinco escolhas estruturais pendentes de aprovação. A discussão metodológica dos 14 pontos permanece adiada e nenhuma quarta filosofia foi criada.**

**Parado, aguardando as decisões P-1 a P-6 (§8).**
