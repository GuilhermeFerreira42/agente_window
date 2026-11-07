# Contrato técnico — migração do ESTADO das abas para fora do `App.tsx`

**Status:** contrato escrito · testes de proteção ESCRITOS E VERDES · migração **não iniciada** (aguarda decisão de produto da §6).
**Requisito:** RNF15-2 (`docs/06` L1444 — "App.tsx DIMINUI: gestão de abas sai dele").
**Decisões preservadas:** D140, D151, D160, D171, D172.
**Autor da regra que trava este documento:** o dono — "cortes que mexem em persistência exigem
gate próprio e decisão do dono". Este documento existe para transformar essa trava em uma
decisão informada, não em uma parada.

---

## 1. O que está no `App.tsx` hoje, medido

| Peça | Onde | O que faz |
|---|---|---|
| `editorTabs` (`useState<EditorTab[]>`) | L380 | a faixa de abas **nativas** (browser, diff, provedores, config, busca) |
| `activeTabId` (`useState`) | L381 | qual aba nativa está ativa |
| `activeTabBySession` (`useRef`) | L502 | qual aba lembrar por sessão quando ela reabre |
| `activeGlobalTabId` (`useRef`) | — | idem para abas sem dono |
| `mruRef` (`useRef`) | — | ordem de uso (sucessão ao fechar) |
| `activateEditorTab` | L725 | ativa, avisa o módulo, marca MRU e memória por sessão |
| `openEditorTab` | L1099 | **já delega** a identidade ao shell (D172); aplica no estado local |
| `createBrowser` | L931 | cria aba de browser **e** a `BrowserViewState` (acoplamento real) |
| `closeEditorTab` | L1344 | fecha, escolhe sucessora, limpa recursos de browser |
| `closeSessionTabs` | L1515 / L1566 | limpeza ao trocar/excluir sessão |

**Não está no `App.tsx` e não será movido:** as abas do **módulo** (arquivo/diff) já vivem no
`EditorService` do módulo desde as ondas 2–3. O `App` apenas as **projeta** (`projetarAbasDoModulo`)
e as **funde** num derivado (`fundirAbas`) para exibir uma faixa só.

### Fato medido que muda o desenho

`initialEditorTabs` é `[]` e **não há restauração das abas nativas no F5**. Quem sobrevive ao F5
hoje é:
- a **sessão ativa** (`ACTIVE_SESSION_KEY` no `localStorage`);
- as abas do **módulo** (`snapshotAttachTabs`/`restoreAttachTabs`, chave `workbench.attachTabs.v1`,
  gravada a cada `editor.tabOpened/tabClosed/tabPinned/activeChanged`).

Ou seja: **as abas de arquivo (`kind: code`) voltam depois do F5; as diffs NÃO são restauradas; as nativas (browser, Provedores,
Configurações, resultado de busca) não voltam — e nunca voltaram.** Antes de migrar é obrigatório
saber se isso é intencional. Se for intencional (leitura da nota de D160: `diff`/`changes` têm
payload que não faz sentido ressuscitar), então "persistência das abas" = ligar as nativas ao
mesmo mecanismo das do módulo, e isso é **produto novo**, não refatoração.

## 2. O desenho proposto

**Um dono só para a faixa inteira: `shell/faixaDeAbas.ts`.**

```
        ┌──────────────────────────┐
        │  shell/faixaDeAbas.ts    │  dono do estado da FAIXA (nativas)
        │  - abas[]                │  + delega ao módulo via porta injetada
        │  - ativaId               │
        │  - porSessao (memória)   │
        │  - mru[]                 │
        └───────────┬──────────────┘
                    │ porta (interface, sem import do módulo)
        ┌───────────┴──────────────┐
        │ portaDasAbasDoModulo     │  project/activate/close — já existe, no App
        └──────────────────────────┘
```

**Não duplicar estado** — a regra que o dono pediu explicitamente. Três invariantes:

1. **O módulo continua dono das abas de arquivo/diff.** A faixa não guarda cópia; ela guarda só
   as nativas e **projeta** o resto. Isso já é verdade hoje (o comentário em L554 é explícito:
   "A FUSÃO ACONTECE NO DERIVADO, NUNCA NO ESTADO"). A migração **preserva** isso.
2. **`browserViews` NÃO vai junto.** Uma aba de browser aponta para uma `BrowserViewState`; mover
   as duas juntas seria mover o browser, não a aba (escopo proibido). A porta recebe
   `removerRecursos(id)` e o `App` mantém `browserViews`.
3. **`activeTabBySession` deixa de ser `useRef` dentro do App** e vira memória do dono — uma
   implementação só, não duas.

## 3. O que NÃO muda (para não reabrir o que está validado)

- `abas.ts` (regras de preview/MRU/sucessão): intocado — Regra 8.
- `identidadeDaAba.ts` (D172): intocado.
- `ponteAnexo.ts` e `persistenciaDeAbas.ts`: intocados.
- Toda a superfície do módulo `explorer-search` (`core/**` é regra dura 2): intocada.
- Comportamento visível: mesma faixa, mesmo "Abrir ao lado", mesmo diálogo de não-salvo.

## 4. Testes de proteção — escritos ANTES da migração

Estes testes rodam contra o **App real** e travam o comportamento de hoje. Eles não testam a
nova unidade; testam o **produto**. Se a migração quebrar qualquer um, é regressão.

| # | Protege | Asserção |
|---|---|---|
| P1 | abrir arquivo | 1 aba, ativa, faixa visível |
| P2 | abrir 2º arquivo | 2 abas, sem duplicata |
| P3 | abrir arquivo já aberto | **não** duplica; foca a existente |
| P4 | memo por sessão | trocar de sessão e voltar restaura a aba lembrada |
| P5 | abas globais | Provedores não herda a sessão ativa |
| P6 | sucessão ao fechar | fechar a ativa ativa o vizinho (regra do MRU) |
| P7 | aba suja | fechar pede confirmação; Cancelar não fecha |
| P8 | recursos de browser | fechar aba de browser remove a `BrowserViewState` órfã |
| P9 | limpeza por sessão | excluir sessão remove só as abas dela |
| P10 | F5 (módulo) | somente abas `kind: code` voltam; diff e nativas não (comportamento atual) |

**Estado dos testes de proteção (medido em 2026-11-06):**
`src/__tests__/faixaDeAbasProtecao.test.tsx` — **7 testes, 7 aprovados**.
P6, P8 e P9 já existiam e estão verdes em `App.test.tsx` (sucessão ao fechar; remoção de
recursos de browser ao arquivar/excluir sessão). O arquivo novo cobre o que faltava: id estável
da aba entre renders (P1), não-duplicação ao abrir duas abas (P2), clique em aba existente não
cria outra (P3), memória por sessão no vai-e-volta (P4), `data-browser-id` ligando aba a
`BrowserViewState` (P5) e o contrato de chaves de storage (P10). **P10 é guarda de chave, não uma simulação de F5:** o F5 real de arquivos no split foi medido separadamente no navegador. O teste automatizado de recarga de diff permanece pendente.

Gate completo do escopo, congelado **antes** da migração:
`arena-operacional/evidencias/gate-estado-abas-ANTES-MIGRACAO.json` — **181 testes = 168 ok |
0 falhas | 13 pulados**, 38 arquivos.

P8–P10 são o coração do risco: são exatamente os pontos onde "estado" toca "recursos" e
"persistência". Se P10 revelar que o dono **quer** as nativas no F5, então o escopo muda de
migração para feature e eu paro e pergunto — é decisão de produto, não técnica.

## 5. Gate próprio

```
sh platform/scripts/gate-unit.sh \
  src/__tests__/App.test.tsx src/__tests__/centerFrontier.test.tsx \
  src/__tests__/editorAreaDirty.test.tsx src/__tests__/dragAndDrop.test.ts \
  src/__tests__/sessionState.test.ts src/shell/abas.test.ts \
  src/shell/ponteAnexo.test.ts src/shell/identidadeDaAba.test.ts \
  src/shell/faixaDeAbas.test.ts        # novo, escrito antes
```

**Critério de aprovação:** o gate roda verde **antes** (estado atual) e verde **depois**, com
o conjunto de testes só crescendo. Zero teste alterado para "acompanhar" a migração, exceto
quando o próprio contrato mudar — e nesse caso a mudança vai num commit separado, com o porquê.

## 6. Decisões que NÃO são técnicas (precisam do dono)

1. **As abas nativas devem voltar depois do F5?** Hoje não voltam. Ligar isso é feature.
2. **`App.tsx` pode crescer durante a migração?** A D172 cresceu 5 linhas. Uma migração de
   estado com adaptador costuma crescer antes de encolher. Se a meta for o número, o corte tem
   que ser outro (mover `createBrowser` + `browserViews` juntos, o que mexe em navegador).

Nada aqui contraria D140, D151 ou a arquitetura de condomínio: a faixa fica no Bairro 1 (sem IA),
o módulo continua dono do que é dele, e o `App` fica com o papel de síndico — orquestrar.

---

**Próximo passo, se aprovado:** escrever os 10 testes de proteção contra o App atual, rodar o
gate (verde), só então mover o estado, e rodar o gate de novo. Se P10 mostrar que o F5 das
nativas é requisito, este documento para e volta para o dono antes de qualquer linha de código.
