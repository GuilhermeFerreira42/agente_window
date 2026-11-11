# 14 — TASK 05 · Revisão da sequência: antecipar M1–M8 antes das Fatias 13/14/15?

**Data:** 2026-10-30 · **Autor:** Arena (análise técnica independente) · **Natureza:** investigação complementar de planejamento
**Status:** 🔴 **NENHUMA DECISÃO HOMOLOGADA. NENHUM ROADMAP, SPEC, CONTRATO OFICIAL OU CÓDIGO ALTERADO.**

> **A pergunta do dono:** *"Minha preferência é implementar e homologar as Fatias M1 a M8 antes de iniciar as Fatias 13, 14 e 15."*
> **Pedido explícito:** não favorecer artificialmente a proposta; se a sequência atual for tecnicamente superior, explicar por quê.

> **Resposta em uma linha:** a proposta **não é executável como está** (a Fatia 13 já foi implementada e homologada manualmente pelo dono em 29/10), e **não é recomendável** nem reformulada como "M1–M8 antes de 14 e 15" — mas **a preocupação que a origina é real, tem nome, e se resolve com uma decisão de arquitetura, não com oito fatias antecipadas.**

---

## §0 — Escopo, estado verificado e o que não foi repetido

### 0.1 O que esta missão fez e não fez

| | |
|---|---|
| **Fez** | Leu `docs/03`, `docs/05` (D95/D99/D102/D109/D126), `docs/06` (Parte 3, §0 mapa pós-MVP, bloco D99, bloco D102, SPECs 2G/2H/2I, sequência de aprovação), `12_TASK03` (Partes B.1–B.8.7, C.1–C.4, D.1–D.3), `13_INVESTIGACAO_COMPLEMENTAR` (§2.8, §3.7, §4.7, §5.7, §6.8, §7.7) e **cinco arquivos de código-fonte** do Agente Window. |
| **Não fez** | Nenhuma pesquisa externa nova (o senhor pediu: *"não abra novas investigações sem demonstrar uma lacuna bloqueante concreta"* — não há lacuna bloqueante que exija fonte nova). Nenhum código alterado. Nenhum teste executado. Nenhum commit. Nenhuma SPEC fechada. |
| **Não repetiu** | Contratos M1–M8 (estão em `12_TASK03` Parte B). Evidências das referências externas (estão em `11_TASK02` §3 e `13_…` §2.3–§7.3). Matriz de dependências D99 (está em `docs/06:547`). |

**Nada foi executado contra o Agente Window nesta missão.** As únicas provas operacionais do projeto continuam sendo P1–P10 (Task 02) e os testes registrados em `docs/09`.

### 0.2 Uma divergência de vocabulário que preciso registrar

O senhor menciona *"a sequência de 14 etapas, nossa posição atual na etapa 3"*. **Não localizei nenhuma sequência de 14 etapas nos nove documentos canônicos.** As únicas sequências registradas são:

- **Fatias 07 a 20** (`docs/06` Parte 3) — são 14 fatias numeradas, o que pode ser a origem do "14";
- **Gate D98 → 13 → 14 → 15 → 16…20 → M1→M2→M3→M4** (`docs/06:616`) — a sequência de execução vigente.

Presumo que "14 etapas / etapa 3" seja o vocabulário da conversa com o ChatGPT, que ainda não me foi enviado. **Uso abaixo a posição verificada nos canônicos**, e peço que o senhor confirme ou corrija quando enviar a carta.

**Posição atual verificada (2026-10-30):**

| Item | Estado | Evidência |
|---|---|---|
| Fatias 07–12 | ✅ homologadas (15/10 a 21/10; MVP fechado na 10) | `docs/03`, "Últimas fatias fechadas" |
| MICRO-FATIA PERF (Gate D98) | implementada em dois commits locais; **Gate aberto, não homologado** | `docs/06:387` |
| **Fatia 13 — Terminal-para-o-agente** | **🟢 IMPLEMENTADA e com homologação manual declarada pelo dono no Windows** | `docs/06:486`, `docs/03`, SPEC 2G, D126 |
| Fatia 14 — Barra esquerda + Skills | ❌ não iniciada · **SPEC 2H fechada (Q&A 100%)** | `docs/06:494`, `docs/03` |
| Fatia 15 — Janela única de abas | ❌ não iniciada · **SPEC 2I fechada (Q&A 100%)** | `docs/06:501` |
| Iniciativa M1–M8 | ❌ **somente planejamento**; nenhuma iniciada | `docs/06:547`, `docs/03` |
| F1–F5-B | aprovadas por D119, implementadas; **nenhuma homologada** | `docs/06:616`, `docs/03` |

---

## §1 — S-1 · O fato que invalida a premissa: a Fatia 13 já existe

Esta é a terceira vez, em três missões seguidas, que uma premissa do enunciado não sobrevive à verificação (C-2: DP-04 já estava decidida; C-5: o OpenClaude tem escopo global). Registro antes de qualquer análise comparativa, porque **ela remove um terço da pergunta**.

### 1.1 Evidência documental (E1)

`docs/06:486` — cabeçalho da Fatia 13:

> *"**STATUS (2026-10-29):** implementação existente e homologação manual declarada pelo dono para os cenários listados em `08`; não inferir cobertura exaustiva. SPEC 2G fechada e opção A/D126 selecionada: `executar` inicia um processo one-shot em shell detectado, com cwd no workspace ativo validado pelo servidor."*

`docs/06` (Status da implementação/validação da Fatia 13):

> *"A tool `executar` está integrada ao catálogo/provider tools e ao loop Agir existente. […] O executor vive em `server/executorComando.ts`; não reutiliza nem altera sessões/código do terminal humano/PTY."*
> *"**Validação automatizada Linux desta missão:** Vitest focado em 11 arquivos: **132 passaram**; dois testes de banco/grants […] passaram 2/2 em execução separada. `npm run typecheck` e ESLint focal (13 arquivos) passaram."*

### 1.2 Evidência no código (E1 — verificado nesta missão, arquivos apenas lidos)

| Arquivo | O que comprova |
|---|---|
| `bairros/2-inteligencia/casas/agir/server/executorComando.ts` | **existe** — o executor one-shot |
| `bairros/2-inteligencia/casas/agir/__tests__/executorComando.test.ts` | **existe** — teste dedicado |
| `types.ts:14` | `ferramenta: 'ler' \| 'listar' \| 'buscar' \| 'criar' \| 'escrever' \| 'excluir' \| **executar**'` — a ferramenta está no tipo canônico |
| `agir/server/ferramentas.ts:62` | `id: 'executar'` no catálogo |
| `agir/server/anuncio.ts:27` | `case 'executar':` — esquema JSON anunciado ao modelo |
| `server/session-persistence/database.ts:72` | `tool_id TEXT NOT NULL CHECK (tool_id = 'executar')` — **a tabela de grants já nasceu com a coluna** |
| `server/session-persistence/database.ts:119` | `export type SessionToolGrant = 'criar' \| 'escrever' \| 'executar'` |
| `agir/server/rotas.ts:355-480` | Manual/Permitir tudo, grant de sessão, `comandoExigeAprovacaoIndividual` — toda a política de permissão implementada |

### 1.3 Consequência

**"Implementar M1–M8 antes de iniciar a Fatia 13" descreve um estado que não existe mais.** A Fatia 13 não está "a iniciar": está implementada, com 132 testes verdes no Linux, typecheck e ESLint passando, e aceite manual do dono no Windows para os cenários de `docs/08`.

Antecipar M1–M8 "antes da 13" significaria, na prática, **desfazer a 13** — o que nenhuma das três filosofias autoriza e o que o senhor explicitamente proibiu (*"não crie componentes provisórios que precisariam ser descartados"*).

**A pergunta que resta, e que é a real:** *M1–M8 devem vir antes das Fatias **14 e 15**?*

É essa que eu analiso daqui em diante. E a resposta é **não para o conjunto**, **sim para uma parte específica e pequena** — mas não do jeito que a preferência sugere.

### 1.4 Um registro de honestidade sobre o meu próprio workspace

Minha cópia local está em `main` / `fe218b8` com **um único commit e sem remote**, porque a Missão 1 fez `rm -rf .git && git init` para isolar o trabalho. O `docs/03` canônico informa HEAD real `0dfe3c2…` com commits `71c8de7`, `ecdab7c`, `bf79a3f`, `9f5cde4`, `4f277db`, `29b1399` etc.

**Isto não afeta esta análise**: o *working tree* que clonei contém o código real (a seção 1.2 foi verificada nele, não em documentação), e as divergências são apenas de histórico Git. Registro porque R-15 (*"histórico Git perdido"*) já está em `docs/06:7` e porque **não devo citar `fe218b8` como se fosse o estado oficial do projeto**.

---

## §2 — As três sequências em comparação

### Alternativa A — Sequência canônica vigente (o que está escrito)

```
Gate D98 (aberto) ─▶ [13 ✅ feita] ─▶ FATIA 14 ─▶ FATIA 15 ─▶ 16…20
                                                    │
                                                    └─▶ M1 ─▶ M2 ─▶ M3 ─▶ M4 ─▶ (M5 ─▶ M6) ─▶ M7 ─▶ M8
                                                        └───── só planejamento hoje ─────┘
```
**Fonte:** `docs/06:547` (D99), `docs/06:616` (sequência de aprovação), `docs/05` D109.
**Justificativa registrada pelo próprio projeto:** *"A recomendação de executar memória depois da 15 é **por estabilidade de contratos, não dependência funcional**."* (`docs/06:556`)

### Alternativa B — Preferência manifestada pelo dono

```
M1 ─▶ M2 ─▶ M3 ─▶ M4 ─▶ M5 ─▶ M6 ─▶ M7 ─▶ M8 ─▶ [13 ❌ impossível] ─▶ 14 ─▶ 15
```
**Reformulada para ser executável** (removendo a 13, que já existe):
```
M1 ─▶ … ─▶ M8 ─▶ FATIA 14 ─▶ FATIA 15
```

### Alternativa C — Intermediária (a que eu recomendo avaliar)

```
        ┌── DECISÃO DE ARQUITETURA (sem código) ──┐
        │  DP-06 (dono da composição do prompt)   │
        │  DP-03 (contrato do resultado de tool)  │
        └────────────────┬────────────────────────┘
                         ▼
                 FATIA 14  ─▶  FATIA 15
                         │
                         ▼
        M1-a ─▶ M2 ─▶ M3 ─▶ M4 ─▶ (M5 ─▶ M6) ─▶ M7 ─▶ M8
        ▲
        └── pode ser especificada/em paralelo desde JÁ (D109 autoriza)
```

**A diferença de C para A não é de ordem — é de um gate documental novo antes da Fatia 14.** A ordem de execução é idêntica à canônica. O que muda é *o que precisa estar decidido antes de codar a 14*.

---

## §3 — Dependência por dependência: real × documental

O senhor pediu explicitamente essa separação. Fiz as duas direções.

### 3.1 Direção M → Fatias 13/14/15 (as M dependem delas?)

| Fatia M | Depende da 13? | Depende da 14? | Depende da 15? | Tipo | Evidência |
|---|---|---|---|---|---|
| **M1-a** (estado honesto) | ❌ | ❌ | ❌ | **nenhuma** | `12_TASK03` B.1.7: *"De fatias canônicas: **nenhuma**. Não toca Fatia 14/15."* |
| **M1-b** (`usage` real) | ❌ | ❌ | ❌ | nenhuma — mas 🔎 H4 (credencial) | B.1.7 |
| **M2** (transcript fiel) | ⚠️ **consome**, não bloqueia | ⚠️ **consome** | ⚠️ colide em `App.tsx` | **contratual, não funcional** | `docs/06:547` D99: *"Fatia 13 cria novo tipo de tool call; a 14 pode introduzir invocação/contexto de skills"*; B.2.7: *"M2 toca `types.ts` e o caminho de `montarHistorico`"* |
| **M3** (Projeção) | ❌ | ⚠️ **é o ponto de injeção de skills** | ⚠️ superfície | **contratual + endereço** | D99: *"não depende diretamente das Fatias 13–15, mas qualquer tipo de evento novo nelas deve estar contemplado em M2"* · `12_TASK03` C.3 |
| **M4** (busca manual) | ❌ | ❌ servidor · ⚠️ **UI** | ⚠️ **UI** | **só de interface** | C.3: *"A UI de M4 **não deve ser decidida antes** da Fatia 15. O **servidor** de M4 pode ser especificado e aprovado antes."* |
| **M5** (memória de projeto) | ❌ | ⚠️ **UI de gestão** | ⚠️ superfície | **só de interface** + 🔴 DP-01 | C.3: *"A UI de gestão de memória […] **depende** de onde a Fatia 14 colocar Personalizações."* |
| **M6** (recuperação pelo agente) | ✅ **13 já feita** | ⚠️ catálogo | ⚠️ superfície | **governança** | B.6.7: *"Fatia 13 ✅ homologada manualmente: a ferramenta nova entra no **mesmo** catálogo"* + `docs/06:599` F1–F4 bloqueiam *"adicionar ferramentas com novos efeitos"* |
| **M7** (continuidade) | ✅ **herda D126** | ❌ | ❌ | **consome fato decidido** | B.7.7: *"`executar` é one-shot e **cancelar não desfaz efeitos** (D126). M7 herda isso e **não** pode prometer o contrário."* |
| **M8** (homologação) | ❌ | ❌ | ❌ | nenhuma — mas herda DEBT-21 | B.8.7 + C.3 |

**Conclusão da direção M → 13/14/15:** **nenhuma fatia M tem dependência funcional dura** de 14 ou 15. Isso **confirma** o que D99 já registrava. As dependências que existem são de três tipos, e só um deles é bloqueante:

1. **Contratual** (M2/M3 consomem um contrato de prompt/ferramentas que a 14 ainda vai mudar) — *retrabalho, não bloqueio*;
2. **De interface** (M4/M5/M6 precisam saber onde a UI mora) — *bloqueio parcial: só da metade visual*;
3. **De governança** (M6 adiciona ferramenta nova; F1–F4 não homologadas) — *bloqueio real, e não é de sequência*.

### 3.2 Direção 13/14/15 → M (elas dependem das M?) — **aqui está a descoberta**

Esta direção **não foi analisada por D99**, que só cruzou "propostas do estudo de 22/10 × Fatias 13–15". Eu a verifiquei no código.

| Fatia | Depende de algo que M entregaria? | Evidência |
|---|---|---|
| **13** | ❌ Não. Já implementada e homologada. | §1.2 |
| **14** | 🔴 **SIM — e é uma dependência real, verificada em código, que ninguém registrou.** | §4 abaixo |
| **15** | 🟡 **Parcialmente benéfica:** RNF15-2 exige *"App.tsx **DIMINUI**"*; a recomendação de DP-06 (servidor compõe) **remove** `montarHistorico` do `App.tsx` — ou seja, **M3 ajuda a 15 a cumprir o próprio critério**. | `docs/06` SPEC 2I RNF15-2 · `App.tsx:1678/2066/2170` · `13_…` §7.5 |

### 3.3 Skills, MCP, plugins, execução automática

| Item | Onde está | Relação com M |
|---|---|---|
| **Skills v1 (manuais)** | Fatia 14, SPEC 2H fechada | 🔴 injeta conteúdo no prompt → §4 |
| **Skills v2-auto + Instruções** | *"logo após a 14"*, decidido em 20/10 (Q14-3) | 🔴 **injeção automática e recorrente** no prompt → agrava §4 |
| **MCP / Plugins** | **IC-06**, destino 15+, *"Fatia 14 não é autorização para MCP"* | ❌ fora de todas as M (`12_TASK03` C.3 / S11) |
| **Execução automática de skills** | *"Fora. Nenhuma fatia M executa skill. M6 recupera **dado**, não dispara execução."* | ❌ |
| **Command Center / Pesquisa** | Fatia 17 (Q14-5) | ⚠️ concorrência futura de superfície com M4 |

### 3.4 O que **não** é dependência de sequência (e o senhor deve tratar separado)

Estes quatro bloqueiam fatias M **independentemente** de onde elas estejam na fila. Antecipar M não os resolve; adiá-las também não.

| Bloqueio | O que é | Onde está registrado |
|---|---|---|
| 🔴 **DP-01** (identidade de projeto) | Sem escopo confiável, "memória de projeto" é indefinível. **Bloqueia M5 e M6**, não M1–M4. | `12_TASK03` C.1/C.4 passo 0 · `13_…` §2.9 |
| 🔴 **F1–F4 não homologadas** | *"F1–F4 devem ser tratados no planejamento **antes de ampliar autonomia ou adicionar ferramentas com novos efeitos**."* M6 adiciona a ferramenta `recordar`. | `docs/06:599` (matriz F1–F8, bloco "Bloqueio") |
| 🟡 **"Não há autorização para saltar fatias"** | Regra de governança, não técnica. | `docs/06:556` |
| 🟡 **DEBT-21** (isolamento de E2E) | M8 herda: specs 08/09 já dividem armazém persistente sem fixture. Qualquer E2E de memória/índice precisa de fixture própria. | `12_TASK03` C.3 |

---

## §4 — O achado: **não existe ponto de composição de prompt no servidor**

Esta é a contribuição nova desta missão. É E1 (código verificado hoje), é concreta, e **muda a resposta**.

### 4.1 O que o código mostra

**1. O histórico é montado no browser.**
```
App.tsx:1678   const montarHistorico = (mensagens: ChatMessage[]): MensagemSimples[] =>
App.tsx:2066        ...montarHistorico(chatOrigem?.messages ?? []),
App.tsx:2170     const historicoRegenerar = montarHistorico(
```
Três chamadas. **Único lugar do produto onde o contexto é composto.**

**2. O servidor apenas copia o que recebeu.**
```
agir/server/rotas.ts:332      historico: fio.mensagens,
agir/server/agir.ts:96        const mensagens: MensagemAgir[] = [...opcoes.historico]
agir/server/agir.ts:113       resposta = await vizinho(mensagens, { … })
```
`agir.ts:91` é explícito: *"de iterações estourar. O `historico` de entrada **NUNCA é alterado**."* O loop faz `push` de mensagens de assistente/ferramenta (`:150`, `:162`, `:170`, `:214`), mas **não compõe nada antes do primeiro envio**.

**3. Não existe `system prompt` em lugar nenhum do caminho servidor.**
```
grep "'system'" / "\"system\"" / "papel: 'system'" / "role: 'system'"
  em bairros/2-inteligencia · server · services  →  ZERO resultados (fora de testes)
```

**4. O contrato não tem papel `system`.**
```
agir/contract.ts:73     papel: 'usuario' | 'assistente' | 'ferramenta'
```

**5. O anúncio de ferramentas, por outro lado, JÁ é servidor.**
```
agir/server/anuncio.ts:1-6   "é este payload que diz ao modelo 'você tem mãos'"
agir/server/anuncio.ts:27    case 'executar': …
```

### 4.2 Por que isso importa para a Fatia 14

A SPEC 2H exige duas coisas que **precisam de um lugar para entrar no prompt**:

- **RF14-2** — *"invocar = `/nome` ou clique"* e critério de aceite 3: *"Invocar `/nome` → **agente segue a skill**"*. Para o agente seguir, o conteúdo do `SKILL.md` tem que chegar ao modelo.
- **RF14-4** — *"ferramenta desligada = **some do anúncio** ao modelo"* → essa já tem casa: `anuncio.ts`. ✅
- **Dependências da 2H** — *"casa Agir (**injetar skill no loop**; registro de tools)"*.

**"Injetar skill no loop" hoje só pode acontecer em `agir.ts:96`** — e como `contract.ts:73` não tem papel `'system'`, a skill entraria como **`papel: 'usuario'`**.

Isso tem três consequências que a SPEC 2H **não endereça**:

| Consequência | Por quê |
|---|---|
| **(a) Um segundo ponto de composição nasce** | O browser compõe histórico (`App.tsx:1678`); o servidor passaria a compor instrução (`agir.ts:96`). É exatamente o que DP-06 chama de *"duplicação de lógica"* e o que o DSH rejeitou ao recusar *"criar um registro de contexto autônomo"* — *"a second registry would introduce lifecycle ordering, duplicate-key, and drift problems"*. |
| **(b) Instrução de produto viajando como mensagem de usuário** | Contradiz frontalmente a Regra 10 que eu mesmo recomendei em DP-06: material recuperado entra como **conteúdo não confiável anexado à mensagem do usuário**, *"**nunca** como instrução de sistema"*. Aqui seria o inverso: uma instrução *do dono* disfarçada de fala do usuário. Confunde o modelo e confunde a auditoria. |
| **(c) Risco de estourar RNF14-3 e RNF15-2** | Se a injeção for feita no browser para evitar (b), `App.tsx` **cresce** — e as duas SPECs dizem o contrário (*"App.tsx não cresce"* / *"App.tsx DIMINUI"*). |

### 4.3 O que isto significa para a pergunta do senhor

**A Fatia 14 vai tomar, na prática, a decisão DP-06 — quer o senhor queira, quer não.** Ela não pode ser implementada sem escolher onde a instrução entra no prompt.

E aqui está o ponto central da minha análise:

> **DP-06 não é uma decisão que pode esperar "depois da 15". Ela vai ser tomada de fato durante a 14 — só que sem o senhor na sala, se não for decidida antes.**

Isto **não** justifica antecipar M1–M8. Justifica algo muito menor e muito mais barato: **decidir DP-06 (e DP-03, que é o contrato do que a 14 também vai produzir — resultado de invocação de skill) antes de autorizar a implementação da Fatia 14.**

Custo: **uma decisão**. Ganho: a Fatia 14 já nasce injetando no lugar certo, e M3 encontra o ponto de composição pronto em vez de ter que migrar um segundo ponto depois.

Isto é exatamente a sua filosofia nº 3 (aproveitar o que existe sem inventar complexidade) aplicada ao contrário do que parece: **antecipar oito fatias inventa complexidade; antecipar uma decisão evita que a complexidade seja inventada por acidente.**

---

## §5 — Comparação objetiva das três alternativas

Critérios pedidos pelo senhor: retrabalho, estabilidade de contratos, capacidade funcional entregue, esforço, facilidade de homologação.

| Critério | **A — canônica** | **B — M1–M8 antes de 14/15** | **C — canônica + gate DP-03/DP-06 antes da 14** |
|---|---|---|---|
| **Executável?** | ✅ sim | ❌ **não** (13 já existe); reformulada, esbarra em DP-01 e F1–F4 | ✅ sim |
| **Risco de retrabalho em M2/M3** | 🟡 médio — a 14 muda o contrato de prompt depois de M3 pronto | 🔴 **alto** — M3 seria construído sobre um contrato que a 14 muda em seguida; M6 sobre catálogo que a 14 muda | 🟢 **baixo** — o contrato é decidido antes dos dois lados |
| **Risco de retrabalho na Fatia 14** | 🔴 **alto** — vai improvisar o ponto de injeção (§4.2) | 🟢 baixo — M3 já existiria | 🟢 **baixo** — injeta no endereço decidido |
| **Risco de retrabalho na Fatia 15** | 🟡 médio — reponta 31 unit + 11 E2E sobre o `App.tsx` de hoje; M3 depois remove `montarHistorico` | 🟢 baixo — `App.tsx` já menor | 🟡 médio (igual a A) — mas com **contrato** de projeção já decidido, a remoção é planejada |
| **Estabilidade de contratos** | 🟡 contratos M amadurecem depois; contratos 14/15 estáveis | 🔴 contratos M congelados cedo demais, sobre fundamento que muda | 🟢 **os dois contratos que atravessam as fronteiras decididos primeiro** |
| **Capacidade funcional visível ao dono** | 🟢 14 e 15 entregam barra esquerda, Personalizações, skills, janela única — **prioridade declarada do dono** (`docs/06` SPEC 2H §1) | 🔴 8 fatias internas antes de qualquer novidade visível; a lateral esquerda continua incompleta | 🟢 **idêntica a A** |
| **Esforço até a primeira entrega visível** | 🟢 1 fatia (a 14) | 🔴 8 fatias | 🟢 1 fatia + 1 decisão |
| **Facilidade de homologação** | 🟢 uma SPEC fechada por vez, roteiro do dono já escrito em 2H/2I | 🔴 M8 exige homologação integrada; 8 gates novos antes de qualquer aceite; e M6 esbarra em F1–F4 não homologadas | 🟢 **idêntica a A** |
| **Componentes provisórios descartáveis** | 🟡 risco na 14 (ponto de injeção improvisado) | 🔴 **alto** — UI de M4/M5/M6 decidida antes de 14/15 = componentes que mudam de endereço depois; o senhor proibiu isso explicitamente | 🟢 nenhum |
| **Conformidade com D99/D102/D109** | ✅ total | ❌ **viola** *"não há autorização para saltar fatias"* e *"M1→M2→M3→M4 permanecem planejamento posterior à 15"* | ✅ total — D109 já autoriza *"investigações preparatórias podem correr em paralelo, sem alterar sequência"* |
| **Conformidade com as 3 filosofias** | ✅ | ⚠️ fere a nº 3 (introduz complexidade provisória) | ✅✅ reforça a nº 1 (endereço decidido antes de construir) e a nº 3 |

### 5.1 Veredito da comparação

**A alternativa B é tecnicamente inferior a A em quase todos os critérios, e inferior a C em todos.** Não é uma questão de preferência: ela é bloqueada por DP-01, por F1–F4, pela proibição de componentes provisórios e pela ausência de autorização para saltar fatias.

**A alternativa A é boa, mas tem um defeito concreto e evitável** (§4): deixa a Fatia 14 decidir sozinha onde o prompt é composto.

**A alternativa C é A com esse defeito removido.**

---

## §6 — Recomendação técnica independente

### 6.1 Recomendação

> **Manter integralmente a sequência canônica (A): Fatia 14 → Fatia 15 → M1 → M2 → M3 → M4 → (M5 → M6) → M7 → M8.**
> **Acrescentar um único gate documental antes de autorizar a implementação da Fatia 14: decidir DP-06 (quem compõe o prompt) e DP-03 (o contrato do resultado de ferramenta).**
> **Não antecipar nenhuma implementação de M1–M8. Especificação e investigação preparatória podem — e devem — correr em paralelo, porque D109 já autoriza.**

### 6.2 Por que **não** antecipar M1–M8 — os cinco motivos, em ordem de força

1. **A Fatia 13 já está feita** (§1). Metade da proposta é irrealizável.
2. **M5 e M6 estão bloqueadas por DP-01**, que continua pendente. Antecipar o conjunto significa parar no meio da fila.
3. **M6 adiciona uma ferramenta nova (`recordar`)**, e `docs/06:599` diz que F1–F4 devem ser tratadas *"antes de ampliar autonomia ou adicionar ferramentas com novos efeitos"*. F1–F4 **não estão homologadas**.
4. **A UI de M4, M5 e M6 depende de onde a 14 e a 15 colocarem Personalizações, busca e abas.** Decidir antes cria componentes provisórios — proibido pelo senhor nesta missão e pela D69 (casa nasce com endereço).
5. **Adiar 14 e 15 adia a capacidade que o dono declarou prioritária.** SPEC 2H §1: *"terminar a barra lateral esquerda como casa das Personalizações (**prioridade declarada do dono**)"*. Oito fatias internas antes disso inverte a prioridade que o próprio projeto registrou.

### 6.3 Por que **sim** decidir DP-06 e DP-03 antes da Fatia 14

1. **A 14 não consegue ser implementada sem tomar essa decisão** (§4.2). Ela vai ser tomada de qualquer jeito; a única escolha é *quem* a toma.
2. **É a menor solução possível**: uma decisão, zero código, zero componente provisório, zero renumeração.
3. **Está dentro da autorização existente.** D109: *"Investigações preparatórias podem correr em paralelo, sem alterar sequência, iniciar implementação ou antecipar SPEC definitiva."* Decidir DP-06 é investigação preparatória aplicada — não é salto de fatia.
4. **Elimina o único retrabalho concreto identificado nesta análise.** Sem o gate: a 14 improvisa, M3 migra. Com o gate: a 14 injeta no endereço certo, M3 só assume.
5. **DP-03 também atravessa a fronteira.** A 14 produz resultado de invocação de skill — um resultado de ferramenta. Se o contrato de DP-03 (localizador × conteúdo × visibilidade) não estiver decidido, a 14 grava do jeito dela e M2 migra depois.

### 6.4 O que fazer com M1-a

**M1-a é a única fatia M sem nenhuma dependência de fatia canônica** (B.1.7: *"nenhuma. Não toca Fatia 14/15"*), e entrega o maior ganho imediato de honestidade: hoje o dono vê um percentual de contexto entre **18% e 92% falso** (R-5, Task 02).

Ainda assim, **não recomendo implementá-la antes da 14** — porque a 14 é a prioridade declarada do dono e M1-a não bloqueia nada. Mas recomendo:

- **especificá-la agora** (D109 autoriza), para que a autorização de implementação possa ser dada imediatamente depois da 15, sem nova rodada de investigação;
- e registrar que, **se o senhor quiser uma entrega de M antes da 14**, M1-a é a única candidata defensável — custo baixo, risco baixo, nenhuma dependência, nenhum componente provisório. É uma escolha de prioridade, não de arquitetura. **Não a recomendo, mas não a considero incorreta.**

### 6.5 Dependências circulares

**Não há dependência circular.** Verifiquei nos dois sentidos (§3.1 e §3.2) e o grafo é acíclico:

```
DP-06 ──▶ Fatia 14 ──▶ Fatia 15 ──▶ M1 ──▶ M2 ──▶ M3 ──▶ M4 ──▶ M6 ──▶ M8
  ▲                                          │       │              ▲
  │                                          ▼       ▼              │
  └──── M3 é o dono do contrato ──────── DP-01 ─▶ M5 ──────────────┘
```

Existe um **ciclo aparente** que vale nomear, porque é o que torna a proposta do senhor intuitivamente atraente:

> *M3 precisa saber onde a 14 injeta skills · e a 14 precisa saber onde M3 compõe o prompt.*

**Não é ciclo: é uma decisão compartilhada.** A resolução é decidir o **endereço** (DP-06) antes dos dois, e deixar que cada um implemente o seu conteúdo depois. É a arquitetura de condomínio aplicada literalmente: **o lote e o endereço são definidos antes de qualquer morador construir** — não se constrói primeiro para descobrir o endereço depois.

### 6.6 A menor solução compatível com as três filosofias

| Filosofia | Como a alternativa C a respeita |
|---|---|
| **Condomínio** | DP-06 decide o **endereço** (prefeitura/`chatAlvo.ts` como endereço, M3 como casa dona do contrato) antes de a 14 construir. Sem componente provisório, sem casa que muda de lugar. |
| **Lego** | O contrato de DP-03 (união discriminada por origem) e o de DP-06 (uma janela de eventos, três projeções) são **peças** que a 14 encaixa sem fabricar peça nova. |
| **Aproveitar sem inventar** | Usa a autorização **já existente** (D109), o endereço **já existente** (`chatAlvo.ts`, cuja regra é *"segredo nunca vai ao browser"*), o catálogo **já existente** (`anuncio.ts`), o banco **já existente** (`database.ts`, que já tem a coluna de grants). **Nada novo é inventado para viabilizar a antecipação.** |

---

## §7 — Confronto com as seis preferências funcionais manifestadas

O senhor pediu que eu as confrontasse com as recomendações da investigação, apontando divergências. **Nenhuma está homologada**; trato as seis como preferência declarada nesta conversa.

| # | Preferência | Confronto |
|---|---|---|
| **1** | *Recuperar informações relevantes de conversas anteriores do mesmo projeto, sem carregar todo o histórico* | 🟢 **Convergente.** É exatamente M4 (2º escopo da porta) + M6, e o "sem carregar tudo" é M3. **Mas**: "conversas anteriores **do mesmo projeto**" exige **DP-01** — e aí a preferência 4 muda a resposta (§7.1). |
| **2** | *Exigir aprovação do usuário para gravar memórias permanentes* | 🟢 **Convergente — e já é canônico.** `docs/02 §1.4` já registra *"**aprovação humana para gravar memória persistente de projeto**"*. Minha recomendação DP-02 (B1, nada automático) diz o mesmo. **Não é decisão nova: é decisão já tomada.** Vale registrar isso para não gastar aprovação duas vezes. |
| **3** | *Manter o comportamento de identificação de pastas do VS Code: se a pasta desaparecer, informar e aguardar seleção manual* | 🟡 **Parcialmente divergente — ver §7.2.** Como *comportamento de erro*, é excelente e compatível. Como *estratégia de identidade*, "do VS Code" significa hash do URI — e eu **desaconselho** trocar a nossa derivação. |
| **4** | *Duas cópias do mesmo projeto em caminhos diferentes = projetos independentes, com históricos e memórias separados* | 🔴 **Divergente da minha recomendação DP-01 — e a preferência do senhor vence.** Ver §7.1. **Ela responde a 🔎 H6.** |
| **5** | *Preservar três níveis de memória (conversa, projeto, usuário), mesmo que gradualmente* | 🟢 **Convergente — idêntica à minha recomendação DP-05 (E3).** Contrato parameterizado por `EscopoMemoria`, implementação só de `projeto`, memória de conversa = checkpoint de M3 (não é quarta loja). |
| **6** | *Priorizar arquitetura e contratos consistentes antes da implementação* | 🟢 **Convergente — e é o fundamento da alternativa C.** Só faço uma distinção: **contrato consistente ≠ implementação antecipada.** D109 já separa as duas coisas. |

### 7.1 A preferência 4 responde 🔎 H6 — e simplifica DP-01

No relatório 13, §8, eu registrei que DP-01 era 🟡 porque faltava **uma decisão de produto que só o dono pode tomar**:

> *"dois clones do mesmo repo devem compartilhar histórico e memória? O OpenCode diz **sim** (*'clones share a project ID'*), o DSH diz **não** (diretórios distintos)."*

**A preferência 4 responde: NÃO. Caminhos diferentes = projetos independentes.**

Consequências técnicas diretas, e eu preciso ser honesto sobre elas porque **duas desmontam partes da minha própria recomendação**:

| O que eu recomendei em DP-01 | O que a preferência 4 implica |
|---|---|
| **Camada 2** — `projetoId` opaco com namespace por origem (`'git-remote:'` / `'directory:'`) | ❌ **Deixa de ser necessária.** Se dois caminhos são dois projetos, não há identidade a compartilhar entre origens. O namespace por origem existe justamente para unificar — e o senhor não quer unificar. |
| **Camada 3** — tabela `projeto_diretorio` **1:N** no banco global | ❌ **Deixa de ser necessária** (ou vira 1:1, o que é o `slug` de hoje). Uma relação 1:N só tem razão de ser se vários diretórios podem apontar para o mesmo projeto. |
| **Escada**: remote → SHA do commit raiz → caminho canonical | ❌ **Os dois primeiros degraus devem ser removidos.** Eles servem para reconhecer "o mesmo projeto em outro lugar". A preferência 4 diz que isso **não deve** ser reconhecido. |
| **Camada 1** — canonicalizar `realpath` + NFC **antes** de derivar a chave | ✅ **Permanece integralmente, e fica mais importante.** "Caminhos diferentes = projetos diferentes" só é uma regra justa se o caminho for **o caminho real**. Hoje `paths.ts:30-34` deriva de uma string sem canonicalização: `C:\Proj`, `c:\proj` e um symlink para `C:\Proj` podem produzir três chaves para **a mesma pasta** — e isso viola a preferência 4 no sentido oposto (o mesmo projeto virando dois). |
| **Rebind manual** quando a pasta desaparece (preferência 3) | ✅ **Encaixa perfeitamente** e substitui a escada: em vez de *adivinhar* que é o mesmo projeto, o sistema **informa e pergunta**. É mais simples, mais seguro e mais honesto. |

**DP-01 colapsa para algo muito menor do que eu propus:**

> **DP-01 (reformulado pela preferência 3+4):** a identidade de projeto **é o caminho real canonicalizado** (`realpath` + NFC), derivado como hoje. Quando o caminho não resolve, **informar e aguardar seleção manual** — nunca inferir. Nenhum namespace por origem, nenhuma tabela 1:N, nenhuma escada Git. **Git permanece irrelevante para identidade**, o que é consistente com "no AW o Git é opcional".

**Isto é um ganho**: elimina a Camada 2, a Camada 3, os riscos de colisão entre origens, as três condições de segurança que eu havia proposto para ancoragem em Git (incluindo o ataque de `commondir`/hooks), e a necessidade de 🔎 H6 como investigação. **DP-01 passa de 🟡 para 🟢 suficiente para decidir.**

**Um resíduo permanece e é preciso dizer:** a preferência 4 tem um custo que o senhor deve aceitar conscientemente. Se o dono clonar o mesmo repositório em duas pastas (ou mover a pasta), **perde o vínculo com o histórico e a memória anteriores**. Não é bug — é a escolha. Mas ela precisa de uma contrapartida de usabilidade, e a preferência 3 é essa contrapartida: **informar e permitir re-vincular manualmente**. Recomendo que o re-vínculo manual seja explícito, confirmado e **registrado** (nunca automático), e que mover pasta **não** apague nada — só desvincule.

### 7.2 A preferência 3 precisa ser desambiguada

*"Manter o comportamento de identificação de pastas do VS Code"* pode significar duas coisas muito diferentes:

| Leitura | O que é | Minha posição |
|---|---|---|
| **(a) Comportamento diante de pasta ausente** — informar o problema e aguardar seleção manual | Comportamento de erro/UX | 🟢 **Concordo.** É o que o VS Code faz com workspaces quebrados e é mais seguro do que inferir. Encaixa em DP-01 reformulado. |
| **(b) Algoritmo de derivação do identificador** — trocar o nosso `sanitizePath` + FNV-1a/80 pelo esquema do VS Code | Estratégia de identidade | 🔴 **Desaconselho.** Motivos já verificados: (i) `paths.ts:30-34` **já está em produção** e trocar a derivação **órfã os dados existentes** em `~/.agente_window/projects/<slug>/`; (ii) o próprio VS Code congela a sua com aviso *"DO NOT CHANGE"*; (iii) o OpenCode **documenta a falha** de trocar hash entre runtimes (Bun × djb2 → pastas diferentes). **A leitura (a) já entrega o benefício que o senhor quer, sem o custo da (b).** |

**Registro de honestidade:** eu **não re-verifiquei nesta missão** o comportamento exato do VS Code para pasta ausente. Os caches de pesquisa (`/home/user/.cache/refs/`) não persistem entre mensagens, e o senhor pediu para não abrir investigação nova sem lacuna bloqueante. A afirmação sobre o VS Code em (a) vem da leitura feita na Task 04 (`workingDirectory.ts`, `workspaceIdentifier.ts`) e está marcada como **E2 com lembrança não re-conferida**. Se o senhor quiser que eu confirme no código antes de decidir, é uma verificação curta e vale pedir.

### 7.3 Divergência residual entre a preferência 1 e a 4

A preferência 1 quer *"recuperar informações relevantes de **conversas anteriores do mesmo projeto**"*. A preferência 4 define "mesmo projeto" como **mesmo caminho**.

**Consequência prática que o senhor deve conhecer:** se o dono trabalha no mesmo repositório ora em `D:\trabalho\aw` ora em `E:\backup\aw`, **a recuperação não atravessa**. Cada caminho tem seu histórico e sua memória.

Isso **não é contraditório** — é uma escolha coerente (isolamento forte, zero vazamento entre pastas, que é o que DP-03 e DP-05 mais temem). Mas é uma escolha com custo, e o custo é: **a utilidade da memória fica atada à estabilidade do caminho.** Como a preferência 3 já prevê que caminhos podem desaparecer, recomendo registrar explicitamente:

> *"Memória e histórico pertencem ao caminho. Re-vincular a um caminho novo é operação manual, explícita e registrada; não é automática e não funde históricos."*

Se um dia o senhor quiser fusão, ela deve ser uma **operação de migração consciente** (com preview e confirmação), nunca um efeito colateral da derivação de chave.

---

## §8 — O que **não** deve ser modificado

O senhor pediu para identificar o que já funciona corretamente. Esta é a lista que eu defendo como intocada:

| # | O que já está certo | Por que não mexer |
|---|---|---|
| **1** | **A ordem canônica 13 → 14 → 15 → M.** | Decidida por D99, reafirmada em `docs/06:556` e `docs/06:616`. A análise desta missão **a confirma**, não a contesta. |
| **2** | **A ordem interna M1 → M2 → M3 → M4.** | Decidida por **D109**, que inclusive **revogou** a especificação paralela M1/M2 de D102. Minha Task 03 já havia descartado a sugestão anterior de M4 antes de M3 em respeito a D109. |
| **3** | **A numeração das Fatias 07–20 e o precedente D98** (*"entre a 12 e a 13, sem renumerar"*). | É o mecanismo que permite inserir trabalho sem destruir rastreabilidade. DP-04 já o adotou. |
| **4** | **"Rótulos M não são números oficiais de fatia"** (`docs/02 §4`). | Preserva a distinção entre iniciativa de planejamento e fatia de roadmap. |
| **5** | **A SPEC 2H (Fatia 14) e a SPEC 2I (Fatia 15) — Q&A 100% fechadas.** | Não precisam ser reabertas. Precisam de **um adendo** sobre onde a skill entra no prompt (§4) — adendo, não reabertura. |
| **6** | **D126 (executor one-shot) e a separação do PTY humano.** | M7 herda e não pode prometer o contrário. Áreas congeladas permanecem congeladas. |
| **7** | **A distinção "homologação manual do dono × teste automatizado da IA"** (`docs/08`). | É o que impede que esta análise vire falsa evidência. Mantida integralmente aqui. |
| **8** | **O gate F1–F4 antes de ampliar autonomia.** | É o que impede M6 de nascer antes da contenção estar homologada. |
| **9** | **A Task 01 (persistência).** | Aprovada tecnicamente, com homologação oficial pendente. M2 **não pode enfraquecer** fila/temp exclusivo/revisão monotônica/409. |
| **10** | **D109 como válvula de escape.** | *"Investigações preparatórias podem correr em paralelo."* É a autorização que torna a alternativa C legal sem mudar o roadmap. |

---

## §9 — As evidências são suficientes para decidir?

| Pergunta | Veredito |
|---|---|
| A Fatia 13 já está implementada? | 🟢 **Sim, comprovado em código e documentação** (§1). Não é inferência. |
| Existe dependência **funcional** dura de alguma M sobre 14 ou 15? | 🟢 **Não existe.** Confirmado por D99 e por B.x.7. |
| Existe dependência **contratual** real? | 🟢 **Sim, e é bidirecional** — e a direção 14 → M3 **não estava registrada** (§4). |
| Existe dependência circular? | 🟢 **Não.** Existe um ciclo aparente, resolvido por decisão de endereço (§6.5). |
| Antecipar M1–M8 é seguro? | 🟢 **Não** — cinco motivos concretos (§6.2), todos com evidência. |
| Existe alternativa intermediária com benefício concreto? | 🟢 **Sim** — a C, e o benefício é mensurável em retrabalho evitado (§5, §6.3). |
| As seis preferências foram confrontadas? | 🟢 **Sim** (§7), com **duas divergências** apontadas e **uma correção à minha própria recomendação DP-01**. |
| Falta alguma evidência para recomendar a sequência? | 🟢 **Não falta.** |
| O que ainda falta para **decidir**? | 🟡 **Três coisas, todas de autoridade do dono:** (i) aprovar ou recusar o gate DP-03/DP-06 antes da 14; (ii) confirmar a leitura (a) da preferência 3 (§7.2); (iii) confirmar se M1-a pode ser especificada em paralelo agora. |

**Limitações registradas, sem contornar:**

- **Nada foi executado** contra o Agente Window nesta missão. Não há prova operacional nova; P1–P10 continuam sendo as únicas.
- **O comportamento do VS Code para pasta ausente não foi re-verificado** nesta missão (§7.2) — marcada como lembrança de E2, não como evidência fresca.
- **O meu histórico Git local (`fe218b8`) não é o histórico oficial** (§1.4). Toda afirmação sobre código foi verificada no *working tree*, não no histórico.
- **Não examinei `docs/08` nem `docs/09` nesta missão** — a homologação manual da 13 e os placares de teste foram lidos **como citados por `docs/03` e `docs/06`**, não na fonte primária. Se o senhor quiser rigor máximo sobre a cobertura real da homologação da 13, essa é uma leitura curta que vale pedir antes de decidir.
- **Estimativas de esforço** (§5) são **ordens de grandeza arquiteturais (E4)**, não medição. Não há base para estimar horas neste projeto sem histórico de velocidade.

---

## §10 — Resumo em linguagem simples

**O senhor prefere arrumar toda a casa de memória antes de construir os próximos cômodos. A intenção é boa e o raciocínio é correto — mas três coisas impedem, e uma delas é uma boa notícia.**

**Primeiro: a Fatia 13 já foi construída.** Ela foi implementada, teve 132 testes passando no Linux, e o senhor mesmo a homologou no Windows em 29 de outubro. O executor de comandos existe (`executorComando.ts`), a ferramenta `executar` está no catálogo, no anúncio ao modelo, no banco de permissões e nas rotas. Então "fazer M1 a M8 antes da 13" não é uma escolha — é desfazer o que já está pronto. A pergunta real é só sobre as Fatias **14 e 15**.

**Segundo: antecipar as oito fatias M antes da 14 e da 15 não é seguro**, por cinco motivos que não dependem de opinião. Duas delas (M5 e M6) estão travadas numa decisão que ainda não foi tomada — a de saber o que é "o mesmo projeto". Uma delas (M6) cria uma ferramenta nova para o agente, e o próprio roadmap diz que as travas de segurança F1 a F4 precisam estar homologadas antes de dar mais poder ao agente — e não estão. A interface de três delas depende de onde a Fatia 14 vai colocar "Personalizações" e a Fatia 15 vai colocar as abas: decidir antes significa criar tela que depois muda de lugar, que é exatamente o que o senhor me proibiu de fazer. E, por fim, adiar a 14 e a 15 adia justamente o que o projeto registrou como **prioridade declarada do dono**: a barra lateral esquerda com Personalizações e Habilidades.

**Terceiro — e aqui está a descoberta que vale esta missão: a sua preocupação está certa, mas o remédio é muito menor do que oito fatias.**

Eu fui ler o código para descobrir onde a Fatia 14 vai colocar o conteúdo de uma skill quando o senhor digitar `/nome`. E descobri que **não existe lugar para colocar**. O histórico da conversa é montado no navegador (`App.tsx`, linha 1678) e enviado pronto; o servidor só copia o que recebeu (`agir.ts`, linha 96) e manda para o modelo. **Não existe nenhum "system prompt" em todo o caminho do servidor — procurei, zero resultados.** E o contrato de mensagem só aceita três papéis: usuário, assistente e ferramenta. **Não existe papel "sistema".**

Ou seja: para a Fatia 14 funcionar, alguém vai ter que inventar um lugar para a instrução entrar. Se ninguém decidir antes, esse lugar vai ser improvisado — provavelmente uma mensagem de "usuário" fabricada no meio do loop do servidor. Isso cria um **segundo** ponto de montagem de contexto (o navegador monta um, o servidor monta outro), faz uma instrução sua viajar disfarçada de fala do usuário, e depois a fatia M3 vai ter que desmontar e migrar tudo.

**A decisão sobre onde o contexto é montado é justamente a DP-06 — uma das seis que estão pendentes.** Ela não pode esperar "depois da Fatia 15", porque **ela vai ser tomada durante a Fatia 14 de qualquer jeito**. A única escolha é se o senhor a toma antes, ou se ela é tomada por acaso dentro da implementação.

**Então a minha recomendação é:**

1. **Manter a ordem exatamente como está**: Fatia 14, depois Fatia 15, depois M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8.
2. **Antes de autorizar o código da Fatia 14, decidir duas coisas**: DP-06 (quem monta o contexto — recomendo o servidor, com a prefeitura `chatAlvo.ts` como endereço) e DP-03 (o que fazer com resultado grande de ferramenta). **É uma decisão, não é uma fatia.** Custa uma conversa; evita que duas fatias se desfizessem depois.
3. **Não implementar nenhuma M antes da 14.** Mas **especificar** pode — e a decisão D109 já autoriza isso explicitamente: *"investigações preparatórias podem correr em paralelo, sem alterar sequência"*. É assim que o senhor obtém "arquitetura e contratos consistentes antes da implementação" **sem** pagar o preço de antecipar a implementação.
4. **Se o senhor quiser mesmo uma entrega de memória antes da 14**, a única candidata defensável é **M1-a** (o medidor honesto de contexto). Ela não depende de fatia nenhuma, não cria componente provisório, e conserta um problema real de hoje: o percentual de contexto que aparece na tela varia entre 18% e 92% de erro. **Eu não recomendo** — a 14 é a sua prioridade declarada — mas **não considero errado** se o senhor preferir assim.

**Sobre as seis preferências que o senhor manifestou:**

- **Duas já estão resolvidas e o senhor talvez não saiba.** "Exigir aprovação para gravar memória permanente" **já é documentação canônica** (`docs/02 §1.4`). "Preservar os três níveis de memória" é **idêntico** ao que eu recomendei em DP-05. Não precisa gastar decisão nova com elas.
- **Uma corrige uma recomendação minha, e a sua vence.** O senhor disse que duas cópias do mesmo projeto em caminhos diferentes devem ser **projetos independentes**. Isso responde exatamente a pergunta que eu registrei como "só o dono pode responder" (🔎 H6). E a consequência é que **três das cinco peças que eu propus para DP-01 deixam de ser necessárias**: o identificador opaco por origem, a tabela de vários diretórios para um projeto, e a escada que tenta reconhecer o mesmo projeto pelo remote do Git ou pelo primeiro commit. Tudo isso existia para *unificar* — e o senhor não quer unificar. **DP-01 fica muito mais simples**: o projeto é o caminho real (normalizado), e quando o caminho some o sistema **informa e pergunta**, em vez de adivinhar. Foi um ganho, não uma perda.
- **Uma precisa de um esclarecimento seu.** "Manter o comportamento de identificação de pastas do VS Code" pode querer dizer duas coisas. Se for *"quando a pasta some, avisa e espera eu escolher outra"* — **concordo plenamente**. Se for *"trocar o nosso cálculo de identificador pelo do VS Code"* — **desaconselho**, porque isso deixaria órfãos todos os dados já gravados em `~/.agente_window/projects/`, e porque o próprio VS Code congela o cálculo dele com um aviso de "não mude", e o OpenCode documenta que trocar isso quebrou entre versões. **A primeira leitura já entrega o benefício sem o custo.**
- **Uma tem um custo que vale aceitar de olhos abertos.** Se histórico e memória pertencem ao caminho, então trabalhar no mesmo repositório em duas pastas diferentes **não compartilha nada**. É coerente e é o mais seguro contra vazamento entre projetos. Mas significa que a utilidade da memória fica presa à estabilidade do caminho. A contrapartida é o re-vínculo manual: explícito, confirmado, registrado, e **nunca** fundindo históricos automaticamente.

**Por que esta ordem reduz retrabalho:** porque ela decide primeiro as duas coisas que atravessam as fronteiras (onde o contexto é montado, e o que se guarda de um resultado grande), e só depois constrói dos dois lados. Antecipar as oito fatias faria o contrário: construiria a casa de memória sobre um contrato de prompt que a Fatia 14 ainda vai mudar, e depois mudaria a casa de memória de novo. Manter a ordem **sem** o gate deixaria a Fatia 14 improvisar um endereço que a M3 teria que desfazer. **A ordem canônica com o gate é a única das três que não paga retrabalho dos dois lados.**

---

## §11 — Registro de conformidade, documentos e estado do Git

### 11.1 Conformidade com as restrições da missão

| Restrição | Cumprimento |
|---|---|
| Não alterar código-fonte | ✅ Cinco arquivos **apenas lidos** (`App.tsx`, `types.ts`, `agir/contract.ts`, `agir/server/{agir,rotas,anuncio,ferramentas}.ts`, `session-persistence/database.ts`) — §11.3 |
| Não alterar testes | ✅ Nenhum teste tocado ou executado |
| Não alterar contratos oficiais, SPECs, documentação canônica ou roadmap | ✅ `docs/01`–`09` **inalterados**. As SPECs 2H/2I **não foram reabertas**; a recomendação é um **adendo futuro**, sujeito à aprovação do senhor |
| Não implementar nenhuma fatia | ✅ Nenhuma fatia M, 14 ou 15 iniciada. Nenhum componente criado |
| Não favorecer artificialmente a proposta do dono | ✅ A proposta foi **recusada** com cinco motivos (§6.2); a alternativa intermediária foi construída a partir de evidência de código (§4), não para agradar |
| Não criar componentes provisórios descartáveis | ✅ A alternativa C não cria **nenhum** componente |
| Preservar numeração das fatias e rastreabilidade | ✅ Nenhuma renumeração. Precedente D98 e rótulos M preservados |
| Diferenciar dependência técnica real de dependência documental | ✅ §3, com coluna "Tipo" em cada linha |
| Identificar dependências circulares | ✅ §6.5 — **não há**; há um ciclo aparente, nomeado e resolvido |
| Indicar evidência por dependência | ✅ Tabela §3.1/§3.2 com coluna "Evidência"; §4 com linhas de código |
| Encerrar com recomendação se as evidências bastarem | ✅ §6.1 — **nenhuma investigação nova aberta** |
| Não fazer commit ou push | ✅ §11.4 |
| Não iniciar a próxima etapa do planejamento | ✅ Parado |
| Relatório complementar na área de investigação, sem duplicar | ✅ §0.1 declara o que **não** foi repetido |
| Registrar limitações em vez de inventar | ✅ §9, cinco limitações |
| Resumo em linguagem simples | ✅ §10 |

### 11.2 Documento produzido nesta missão

| Arquivo | Conteúdo |
|---|---|
| `docs/arquivo_morto/investigacao_memoria_fatias_m/14_TASK05_REVISAO_DA_SEQUENCIA_M1_M8.md` | **Este relatório.** §0 escopo e posição verificada · §1 o fato que invalida a premissa · §2 as três sequências · §3 dependências nos dois sentidos · §4 o achado do ponto de composição · §5 comparação · §6 recomendação · §7 confronto com as seis preferências · §8 o que não mexer · §9 suficiência · §10 resumo simples · §11 conformidade |
| `docs/arquivo_morto/investigacao_memoria_fatias_m/00_INDICE.md` | **Atualizado aditivamente** — entrada 14 + registro desta missão |

**Relatórios anteriores NÃO foram reescritos.** A correção a DP-01 (§7.1) fica registrada **aqui**, com vínculo explícito a `13_…` §2.6, no padrão de supersessão que `13_…` §5.5 recomenda adotar.

### 11.3 Arquivos apenas lidos (não alterados)

**Documentação canônica:** `docs/03 - ESTADO ATUAL.md` · `docs/05 - DECISOES.md` (D95, D99, D102, D109, D126) · `docs/06 - PROXIMAS FASES E DIVIDAS.md` (Parte 3, §0 mapa pós-MVP, MICRO-FATIA PERF/D98, Fatias 13/14/15, bloco D99 L547-556, bloco D102 L562-638, matriz F1–F8, SPECs 2G/2H/2I).

**Investigação anterior:** `11_TASK02_…` (não relido nesta missão; citado) · `12_TASK03_PROPOSTA_FATIAS_M1_M8.md` (B.1.7–B.8.7, C.1–C.4, D.1–D.3) · `13_INVESTIGACAO_COMPLEMENTAR_DP01_A_DP06.md` (§2.8, §3.7, §4.7, §5.7, §6.8, §7.7, §8).

**Código-fonte (somente leitura):** `platform/apps/workbench-v2/src/App.tsx` (1678, 2066, 2170) · `src/types.ts:14` · `src/bairros/2-inteligencia/casas/agir/contract.ts:73` · `src/bairros/2-inteligencia/casas/agir/server/agir.ts` (37, 75, 91, 96, 113, 150, 162, 170, 214, 228) · `…/server/rotas.ts` (332, 355-480) · `…/server/anuncio.ts` (1-45) · `…/server/ferramentas.ts` (62, 81) · `…/server/executorComando.ts` (existência) · `…/__tests__/executorComando.test.ts` (existência) · `src/server/session-persistence/database.ts` (72, 119, 128, 133).

### 11.4 Estado final do Git (somente leitura)

| Item | Estado |
|---|---|
| Branch / HEAD local | `main` / `fe218b8` (commit único, sintético — ver §1.4) |
| Remote | **nenhum** |
| Commits nesta missão | **nenhum** |
| Push nesta missão | **nenhum** |
| Working tree | **5 alterações, todas dentro de `docs/arquivo_morto/investigacao_memoria_fatias_m/`**: `00_INDICE.md` (M) · `11_TASK02_…` (??) · `12_TASK03_…` (??) · `13_INVESTIGACAO_…` (??) · **`14_TASK05_…` (??)** |
| Fora dessa pasta | **nenhuma alteração** (verificado com `git status --porcelain`) |
| Código-fonte, testes, `docs/01`–`09`, roadmap, dependências | **inalterados** |
| Áreas congeladas (`components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, specs `sessao_11*`, `explorer-search/{core,server}/**`, `EditorArea.tsx`) | **não tocadas** |

### 11.5 Declaração final

**Nenhuma decisão foi homologada neste relatório. Nenhum roadmap, SPEC, contrato oficial ou código foi alterado. Nenhuma fatia foi implementada ou iniciada. A decisão sobre qualquer mudança de sequência permanece exclusivamente com o dono.**

A recomendação técnica é: **manter a sequência canônica e acrescentar um gate de decisão (DP-03 + DP-06) antes de autorizar a implementação da Fatia 14.**

**Parado, aguardando avaliação.**
