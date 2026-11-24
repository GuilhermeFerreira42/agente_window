# U-1 — Configurações unificadas · Relatório de entrega

Base da primeira entrega: `0fb29d0` (sobre `24d686a`) · Branch: `arena/0f2e5de2-agente-window` · Data: 13/11/2026
**Status: implementada e provada tecnicamente. NÃO homologada. Sem merge.**

> Este relatório é a entrega extensa. Os canônicos (`03`, `05`, `06`, `07`, `09`)
> recebem apenas o registro curto. Evidências grandes (JSONs do Vitest,
> Playwright, capturas) ficam **fora do repositório**, em `/home/user/u1-gates/`.

---

## 0. O que esta rodada é

A revisão independente aprovou as 7 jornadas no Windows, mas **reproduziu perda de
rascunho fora dos cenários cobertos** e o proprietário encontrou **layouts
quebrados**. Esta rodada entrega os **7 ajustes** pedidos sobre o modal unificado da
v1 (`0fb29d0`), e cada ajuste tem prova automatizada com nome — nenhum foi fechado
"por inspeção".

| # | Ajuste pedido | O que mudou de fato | Prova |
|---|---|---|---|
| 1 | Lembrar o tamanho do modal | Primeira abertura sempre **expandida**; depois reabre no **último modo** escolhido, e o F5 não esquece. O valor mora em `persistenciaModoModal.ts` (transporte) e a validação no domínio (`modoInicial`) — storage corrompido cai no inicial, storage indisponível degrada sem quebrar. | `U1-E08`, `R01`×3 no shell |
| 2 | Corrigir o layout de cada painel | Cores **100% por token** (o texto de Geral ficava invisível no tema claro), rodapé de Salvar preso com `margin-top:auto` no invólucro do painel, `.config-painel-texto` de `inline-flex` → `block` (quebrava Workspaces a 800×600), painel de Geral com `flex:1`. **Segunda passada:** em altura curta (800×600 restaurado / 1024×700 restaurado) o painel de Provedores espremia o formulário numa fresta de 57 px — lista virou faixa de chips com rolagem, pé compacto de uma linha e sombra sob o pé indicando que o corpo continua abaixo. Medição automatizada dos 13 painéis (com as 3 subseções de Personalizações) em 6 combinações de janela × tema × 2 modos = **180 cenários**. | `U1-E09` + `33-layout-final` (180/0) |
| 3 | Desativar e reativar provedores | Desativar grava `habilitado:false` e **preserva** nome, endereço, modelos e a chave; o provedor sai do catálogo/Auto; a conversa que já usava aquele modelo mostra **"Indisponível"** e a troca fica com o dono; reativar é **um clique**, sem recadastrar. | `U1-E10`, `R03`×2 nos painéis, `ChatInput` (37/37) |
| 4 | Proteger rascunhos de TODOS os painéis, inclusive ocultos | A decisão de fechar passou a olhar o mapa inteiro (`decidirFechamentoDePaineis`), não só a categoria ativa; salvamento em voo em **qualquer** painel manda aguardar (`algumPainelSalvando`). | `U1-E11`, `R04`×2 e `U1-T10` no shell |
| 5 | Separar chave revelada de chave editada | Ver a chave não suja o formulário e não reenvia o segredo no PUT; o reveal vive em mapa separado com `epocaReveal`, limpo ao trocar de categoria, ao fechar **e** quando a resposta do olhinho chega atrasada. | `U1-E12`, `R04`×3 nos painéis |
| 6 | Histórico e restauração de abas antigas | Aba `file` volta a ser restaurada (mas **sem** conteúdo/`isRealFile`); memória de aba ativa órfã é descartada na leitura; aba antiga em **segundo plano** não rouba a categoria ativa, e quando ela era a ativa abre a **categoria equivalente**. | `U1-E13`, `R09`×2 e `persistenciaNativas` no shell |

---

## 1. O que mudou (por requisito original)

| Req | Entrega | Onde |
|---|---|---|
| R01 | Porta única `abrirConfiguracoes(rota)`; conta, `Ctrl+,`, lateral e cards convergem. Diálogo aberto só navega; instância preservada; nascimento expandido; alternância de modo **lembrada**. | `src/shell/useConfiguracoesUnificadas.ts`, `src/shell/persistenciaModoModal.ts`, `App.tsx` |
| R02 | 13 categorias em 3 grupos, ordem exata. Personalizações (Visão geral/Habilidades/Ferramentas) na **mesma** nav. Futuras dizem "ainda não está disponível", sem ação. Painel oculto sai do foco/leitor. | `src/domain/configuracoesUnificadas.ts`, `src/shell/ConfiguracoesUnificadas.tsx` |
| R03 | Geral hospeda a ConfigView real (1–250, padrão 25), save explícito, eco do servidor; falha de GET → retry e **PUT bloqueado**; falha de save mantém rascunho. Aparência usa **o mesmo** `agents-theme` da barra. | `ConfigView.tsx`, `paineisConfiguracoes.tsx` |
| R04 | Provedores hospedados: 8 descritores, três estados de chave (mascarada / revelada / digitada), teste de conexão, catálogo dinâmico, desativar/reativar preservando tudo. Abrir **não** faz inferência/teste. | `ProvidersView.tsx`, `usePaineisConfiguracoes.tsx` |
| R05 | Personalizações reais (global/projeto), cards navegam no próprio modal; Permissões explica os controles e aponta a conversa; **nenhum grant novo**. | `PersonalizacoesView.tsx`, `paineisConfiguracoes.tsx` |
| R06 | Conversas informa localização **só com fonte confiável**; Workspaces explica contexto imutável e leva a "Nova sessão com pasta"; sem implementação → estado de categoria futura. | `paineisConfiguracoes.tsx` |
| R07 | Cada painel dono do rascunho e do salvar; troca conserva rascunhos; X/Escape/histórico com dados sujos pedem decisão **olhando todos os painéis**; descartar limpa só rascunhos; save em voo bloqueia o fechamento; painéis fechados desmontam. | `domain/configuracoesUnificadas.ts`, hook + moldura |
| R08 | Diálogo com título, rolagem própria, trap de Tab, setas/Home/End, Escape respeitando a confirmação, foco devolvido ao acionador real; `.app-frame` inert sem desmontar chat/editor/Explorer/terminal. | `ConfiguracoesUnificadas.tsx`, `configuracoesUnificadas.css` |
| R09 | Abas `config`/`providers` e o id `aiCustomizations` traduzidos **antes de montar**; aba ativa abre a categoria, inativa preserva a seleção; abas de arquivo/Browser/Changes intactas; memória de aba ativa órfã saneada; nada de rascunho/segredo persistido. | `persistenciaNativas.ts`, `App.tsx` |
| R10 | App só faz wiring por barrels; moldura não é gerenciador paralelo; sem dependência nova, sem migração, sem permissão nova. | `App.tsx` (**2887** linhas ≤ 2889 do C-2) |

**Arquivos novos:** `src/domain/configuracoesUnificadas.ts`,
`src/shell/ConfiguracoesUnificadas.tsx`, `configuracoesUnificadas.css`,
`src/shell/paineisConfiguracoes.tsx`, `src/shell/useConfiguracoesUnificadas.ts`,
`src/shell/usePaineisConfiguracoes.tsx`, `src/shell/ConfiguracoesUnificadasHost.tsx`,
**`src/shell/persistenciaModoModal.ts` (novo nesta rodada)**, as duas suítes U-1 de
unitárias e `e2e/u1_configuracoes_unificadas.spec.ts`.

**Arquivos alterados (cirúrgico):** `App.tsx`, `ConfigView.tsx`, `ProvidersView.tsx`,
`providers.css`, `config/ui/config.css` (tokens do tema), `PersonalizacoesView.tsx`,
`ChatInput.tsx` (modelo indisponível), `chatAlvo.ts` + teste, `persistenciaNativas.ts`
(+ teste), `useConfiguracoesUnificadas.ts`, `ConfiguracoesUnificadas.tsx`,
`configuracoesUnificadas.css`, `styles/app.css` e os testes nominais da §4.

---

## 2. Provas executadas (Linux Debian, perfis descartáveis)

Comando-base das unitárias (sem retry, sem skip, perfil isolado):

```
AGENTE_WINDOW_TEST_HOME=/tmp/u1-X \
NODE_OPTIONS="--require=<repo>/platform/scripts/test-profile.cjs" \
<runtime>/node platform/node_modules/vitest/vitest.mjs run <arquivo> --maxWorkers=1 --minWorkers=1
```

### 2.1 Resultado POR CENÁRIO (E2E U-1, porta 5218, `--workers=1 --retries=0`)

`sh platform/scripts/e2e-u1.sh` → **13/13 aprovados** (1,4 min), sem skip e sem retry.
Evidência das capturas desta rodada: `/home/user/u1-gates/34-e2e-final/` (61 PNG).

| Cenário | O que ele prova (asserção, não narrativa) | Resultado |
|---|---|---|
| U1-E01 | Conta→Provedores, Conta→Configurações e lateral→Personalizações caem no **mesmo** `dialog` (1 instância); nenhuma aba `providers`/`config` é criada | ✅ |
| U1-E02 | 3 grupos com os `aria-label` aprovados, **13 rótulos na ordem exata**, categoria futura com **0 botões** | ✅ |
| U1-E03 | teto `min=1`/`max=250`; PUT envia `teto:40`; **F5 mostra 40** (eco real); com GET derrubado: alerta + "Tentar novamente" e **0 PUT** | ✅ |
| U1-E04 | abrir Provedores **não** chama o provedor (0 requisições à fixture); campo nasce `password`; reveal não atravessa a troca de categoria | ✅ |
| U1-E05 | Personalizações: **1** `nav`, **0** `.personalizations-navigation`, **1** `h2`, seções trocando pela nav comum, dados do servidor | ✅ |
| U1-E06 | rascunho sujo → `alertdialog`; "Continuar editando" preserva o `77`; "Descartar" fecha **sem PUT** | ✅ |
| U1-E07 | setas/Home/End movem o foco, Tab preso, `.app-frame` inert; tema alternado **dentro** do modal; 800×600 cabe; foco devolvido ao acionador | ✅ |
| **U1-E08** (novo) | 1ª abertura `data-modo="expandido"`; restaurar → fechar → reabrir **`restaurado`**; **F5** → reabre `restaurado`; maximizar volta a `expandido` e persiste | ✅ |
| **U1-E09** (novo) | 7 painéis funcionais × 2 janelas (1400×900, 800×600) × 2 temas × 2 modos: `Salvar` e `Fechar` **dentro** da caixa do modal, zero transbordo horizontal, zero elemento cortado | ✅ |
| **U1-E10** (novo) | cadastra fixture e habilita modelo; desativa → PUT com `habilitado:false`, **modelo e endereço continuam no formulário**, **0 PUT de config**; reativa → `habilitado:true` com o mesmo modelo (sem recadastrar) | ✅ |
| **U1-E11** (novo) | altera **Geral**, vai para **Aparência** e fecha: `alertdialog` aparece; "Continuar editando" → Geral ainda tem `133`; "Descartar" fecha e **0 PUT** | ✅ |
| **U1-E12** (novo) | cadastra com chave e modelo próprio; "Mostrar a chave" → fecha **sem** confirmação (ver ≠ editar); reabre, revela e **Salvar**: o PUT **não** contém a chave revelada | ✅ |
| **U1-E13** (novo) | snapshot com aba de arquivo ativa + aba antiga de Provedores: após o boot sobra **só** a aba de arquivo, ela continua ativa, e **nenhum** modal abre por cima | ✅ |

### 2.2 Unitárias dos critérios (nomes carregam o ID)

| Suíte | Critérios | Resultado |
|---|---|---|
| `src/__tests__/u1ConfiguracoesShell.test.tsx` | U1-T01, T02, T08, T09, T10 + R01/R04/R09 | **29/29** |
| `src/__tests__/u1ConfiguracoesPaineis.test.tsx` | U1-T03, T04, T05, T06, T07 + R03/R04 | **22/22** |

Destaques do que é medido de fato: um único `dialog` com `data-modo="expandido"`;
ordem literal dos 13 rótulos; `hidden` + `aria-hidden` no painel não ativo; `.app-frame`
com `inert === true` aberto e `false` depois; foco devolvido ao acionador;
`aiCustomizations` → `personalizacoes/visao`; `config` → `geral`; `providers` →
`provedores`; `file` → sem tradução; GET 500 → alerta + retry + **zero PUT**; eco
grampeado do servidor (250) aplicado ao `autoScroll`; **rascunho de painel oculto
ainda pede confirmação**; **save em voo manda aguardar**; **ver a chave não marca
rascunho** e **não reenvia o segredo**; **resposta tardia do olhinho é descartada**;
**desativar preserva config/modelos/chave** e **reativar é um clique**; **aba antiga
em segundo plano não rouba a categoria** e **aba antiga ativa abre a equivalente**.

### 2.3 Comparação nominal com a baseline

| | Base `24d686a` | Depois da U-1 (revisão) |
|---|---|---|
| Asserções | 2265 | **2320** |
| Aprovadas | 2229 | **2284** |
| Falhas | 3 | **3** |
| Ignoradas | 33 | **33** |
| Falhas novas | — | **0** |
| Skips novos | — | **0** |

As três falhas são **as mesmas três** da base, medidas pelo `--mode ampla`:
`fatia07_destravar` (DEBT-06), `editorTabs` (breadcrumbs) e `monacoLoadFailure`
(caminho feliz). Nenhuma foi renomeada, enfraquecida ou posta em quarentena.

### 2.4 Gates do pacote

| Gate | Comando | Resultado |
|---|---|---|
| Preflight | `VALIDAR_U1.mjs --mode preflight` | arquivos presentes (`27-preflight`) |
| Foco | `VALIDAR_U1.mjs --mode foco` | **227 aprovadas, 0 falhas nominais, 13 pulados** (`35-foco`) |
| Ampla | `VALIDAR_U1.mjs --mode ampla --baseline-json 01-baseline/vitest.json` | **2284 aprovadas, 3 falhas nominais (as da base), 33 pulados** (`36-ampla`) |

### 2.5 Layout — medição, não olhômetro

Harness fora do repo (`/tmp/u1-pw/inspecao_layout3.cjs`) abre o app real na 5218,
percorre as **13 categorias** (Personalizações nas 3 subseções) em
**1400×900 / 1024×700 / 800×600 × claro/escuro × expandido/restaurado** e mede, no DOM:

- `Salvar` e `Fechar` **dentro** da caixa do modal, sem precisar rolar;
- clipping real (ancestral com `overflow:hidden` que **não** rola);
- sobreposição de texto;
- rolagem vertical disponível quando o conteúdo passa da dobra.

| Rodada | Cenários | Com problema |
|---|---|---|
| `20-layout-antes` (v1, só 3 janelas × 2 temas × 2 modos, 7 categorias) | 90 | 0 (medidor v1, menos estrito) |
| `21-layout-depois` (medidor v3, antes do CSS final) | 180 | **34** |
| `22-layout-final` (após o CSS final) | 180 | **0** |
| `28-layout-final` (regravado após a alteração de CSS) | 180 | **0** |
| `33-layout-final` (regravado após a correção do painel de Provedores em altura curta) | 180 | **0** |

Os 34 defeitos de `21-layout-depois` eram, nominalmente: `config-sr` com
`overflow-x` (leitor de tela), `customizations-item-desc` transbordando nas três
subseções de Personalizações, `INPUT` de Provedores abaixo da dobra no modo
restaurado e um `DD` largo em Personalizações/Visão geral. Todos fechados; nenhum
sobra em `22`/`28`.

### 2.6 E2E nominais de regressão (runners da casa, cada spec na sua porta)

| Spec | Runner / porta | Resultado |
|---|---|---|
| `provedores_fatia08` | app 5174 + stub 4599 | **6/6** |
| `c1_correcoes` | `platform/scripts/e2e-c1.sh` — 5211 | **6/6** |
| `c2_centro` | `platform/scripts/e2e-c2.sh` — 5212 | **17/17** |
| `c3b_multimodal` | `platform/scripts/e2e-c3b.sh` — 5216 | **12/12** |

**Lição de ambiente registrada (não é regressão):** rodar `c1`/`c2` com
`PLAYWRIGHT_BASE_URL` apontando para a instância U-1 (5218) faz o `resetApp` da spec
esperar `.session-row` num banco que não é o dela — o `B1` estoura por timeout
(240 s). Com o runner próprio de cada spec (que sobe o seu Vite e o seu banco), o
placar é 23/23. O mesmo vale para `provedores_fatia08`: o `request` do Playwright
precisa mandar `Origin` (o produto exige mesma origem em `/api`) e a instância
precisa ter pelo menos 1 sessão, senão o `resetApp` não encontra `.session-row`.

### 2.7 Typecheck e lint

`npx tsc -b --force` → **0 erros**. `npx eslint` por arquivo: **0** nos arquivos
novos/tocados, exceto o `hospedado` não usado em `ProvidersView.tsx` (**idêntico à
base**) e os **16** de `App.tsx` (a base tem 17; nenhum novo, um a menos após a
extração). Nenhum aviso novo introduzido.

---

## 3. Cobertura contra a matriz original

### 3.1 U1-T01 … U1-T10 (critérios)

| Critério | Onde é provado | Situação |
|---|---|---|
| U1-T01 | shell (`U1-T01`×3) + E2E `U1-E01` | coberto |
| U1-T02 | shell (`U1-T02`×5) + E2E `U1-E02` | coberto |
| U1-T03 | painéis (`U1-T03`×6) + E2E `U1-E03` | coberto |
| U1-T04 | painéis (`U1-T04`×3, `R04`×3) + E2E `U1-E04`/`U1-E12` | coberto |
| U1-T05 | painéis (`U1-T05`×2) + shell (`R04`), E2E `U1-E06`/`U1-E11` | coberto |
| U1-T06 | painéis (`U1-T06`×2) + E2E `U1-E04` | coberto |
| U1-T07 | painéis (`U1-T07`×3) + E2E `U1-E05` | coberto |
| U1-T08 | shell (`U1-T08`×5) + E2E `U1-E07`/`U1-E09` | coberto |
| U1-T09 | shell (`U1-T09`×4, `R09`×2) + E2E `U1-E13` | coberto |
| U1-T10 | shell (`U1-T10`×4) | coberto |

### 3.2 U1-E01 … U1-E07 (jornadas) — e a extensão pedida nesta revisão

| Jornada | Coberta por | Lacuna declarada |
|---|---|---|
| U1-E01 | `U1-E01` + capturas 1400×900/800×600 claro/escuro (`34-e2e-final`) | `Ctrl+,` é exercitado na unitária (`abrirConfiguracoes`); no E2E entra pelo menu da conta e pela lateral |
| U1-E02 | `U1-E03` (GET derrubado, retry, eco, 0 PUT) | "valor em disco" é provado pelo **eco do servidor após F5**, não por leitura direta do arquivo de settings |
| U1-E03 | `U1-E04` (reveal), `U1-E12` (reveal × PUT), `provedores_fatia08` T2–T5 (teste/catálogo/401/405 no app hospedado fora do modal) | teste de conexão **dentro** do modal é provado pela unitária (`U1-T04`) + fixture local, não por jornada E2E própria |
| U1-E04 | `U1-E06`, `U1-E11`, `R04`×2 (save em voo) | save em curso é determinístico por estado injetado na unitária; no E2E não há rede lenta artificial |
| U1-E05 | `U1-E05` + `U1-E09` (3 subseções) | criar/alternar skill controlada é coberto por `PersonalizacoesView` (18/18) + `App.test`; o E2E confere leitura real do servidor |
| U1-E06 | `U1-E13`, `persistenciaNativas`, `useWorkbenchHistory` | restauração com editor/terminal **abertos** foi provada na v1; nesta rodada o foco é a aba antiga × arquivo ativo |
| U1-E07 | `U1-E07` + `U1-E09` | menus da barra com o modal aberto: `.app-frame` inert é provado; "menus utilizáveis" é provado depois de fechar |

### 3.3 Cobertura da matriz estendida do pedido de revisão

O pedido desta rodada cita U1-E01…E07; as jornadas **E08–E13** foram criadas para
os ajustes 1–6 e são numeradas em sequência para não colidir com a matriz canônica.

---

## 4. Testes alheios que precisaram acompanhar a mudança de contrato

Nenhum foi afrouxado; todos provam o contrato novo com mais rigor.

| Teste | Antes | Depois |
|---|---|---|
| `App.test.tsx` › "abre Provedores pelo menu da conta" | exigia aba `providers` | exige o `dialog` na categoria Provedores **e a ausência da aba** |
| `App.test.tsx` › "abre Personalizações…" | exigia `region` da tela antiga | exige a categoria no modal, as 3 seções na nav comum, `0` nav própria, e mantém as provas de dado real |
| `faixaDeAbasProtecao.test.tsx` (2) | "Provedores continua como aba após F5" | "Provedores não é aba e não volta após o F5", com Browser preservado |
| `fatia07_destravar.test.tsx` › DEBT-09 | achava aba `providers` na landing | acha o modal na categoria certa |
| `c2_centro.spec.ts` › J7 | modal "Personalizações do Agent Window" | modal "Configurações" em Personalizações, **1 diálogo**, sem 2ª coluna |
| `provedores/__tests__/frontier.test.ts` › FT-05 | a regra só valia no App | continua valendo e passou a valer em **todo** o `src` |
| `persistenciaNativas.test.ts` | snapshot com 2 abas | 3 abas (inclui `file`) e **conteúdo/`isRealFile` nunca gravados** |
| `ChatInput.test.tsx` (+25) | — | modelo indisponível tem rótulo acessível e não envia |

---

## 5. Roteiro de homologação no Windows (não executado aqui)

> O ambiente desta execução é Linux. **Tudo abaixo está pendente de plataforma** —
> não foi rodado e, portanto, não é declarado como aprovado.

Pré-requisitos: Node fixado em `platform/runtime.json` (26.13.0), Chromium/Edge
disponível, `platform/node_modules` instalado.

1. **Typecheck e unitárias**
   ```powershell
   cd platform\apps\workbench-v2
   npx tsc -b --force
   npx vitest run src/__tests__/u1ConfiguracoesShell.test.tsx src/__tests__/u1ConfiguracoesPaineis.test.tsx
   ```
   Esperado: 0 erros de tipo; **29** e **22** testes verdes.

2. **Gates do pacote**
   ```powershell
   node VALIDAR_U1.ps1 -Repo <repo> -Mode foco -Out <pasta-nova>
   node VALIDAR_U1.ps1 -Repo <repo> -Mode ampla -Out <pasta-nova> -BaselineJson <baseline>\vitest.json
   ```
   Esperado: foco **227/0/13**; ampla **2284** aprovadas com **exatamente** as 3
   falhas pré-existentes e nenhuma nova.

3. **E2E da U-1** — porta 5218
   ```powershell
   powershell -File platform\scripts\e2e-u1.ps1
   ```
   Esperado: **13/13**. Para salvar as capturas do layout, defina
   `U1_EVIDENCIA_DIR` antes de rodar (gera os 56 PNG de `U1-E09` + os 5 de `U1-E07`).

4. **E2E de regressão (runners da casa — cada um na SUA porta)**
   ```powershell
   powershell -File platform\scripts\e2e-c1.ps1     # 5211 → 6/6
   powershell -File platform\scripts\e2e-c2.ps1     # 5212 → 17/17
   powershell -File platform\scripts\e2e-c3b.ps1    # 5216 → 12/12
   ```
   Para `provedores_fatia08`: suba o stub `uploads\stub_provider.cjs` (4599) e o app
   em 5174 com `AGENTE_WINDOW_PROVIDERS_PATH` na fixture, e rode com o header
   `Origin` no `request` do Playwright. **Nunca** rode essas specs com
   `PLAYWRIGHT_BASE_URL` apontando para a instância de outra suíte.

5. **Conferência humana (o que o dono precisa olhar)**
   - Abrir Configurações pelo menu da conta e por `Ctrl+,`: mesmo modal, **expandido**
     na primeira vez.
   - Restaurar o tamanho, fechar e reabrir → volta **restaurado**. **F5** e reabrir →
     continua restaurado. Maximizar → volta a expandido.
   - **Geral**, mudar o teto, salvar, **F5**, reabrir: o valor salvo aparece.
   - **Aparência**, alternar claro/escuro: a barra muda junto; no **tema claro**, o
     texto de Geral e de Provedores precisa estar legível (era o defeito).
   - **Provedores**: revelar a chave, trocar de categoria e voltar → escondida de
     novo; **Salvar** depois de só revelar **não** pode reenviar a chave.
   - **Desativar** um provedor configurado: modelo e endereço continuam na tela,
     ele sai do seletor/Auto, a conversa que o usava mostra "Indisponível";
     **reativar** e salvar → volta sem recadastrar nada.
   - **Sujar um rascunho em Geral, ir para Aparência e fechar**: tem de perguntar.
   - **Redimensionar para ~800×600** e percorrer as 13 categorias nos dois tamanhos
     e nos dois temas: Salvar e Fechar sempre visíveis, nada cortado, rolagem
     funcionando (comparar com `/home/user/u1-gates/28-layout-final/`).

6. **O que NÃO entra na homologação:** qualquer teste com provedor real, conta ou
   chave. Toda a bateria usa fixture local e perfis descartáveis.

---

## 6. Capturas (fora do repo)

| Pasta | Conteúdo |
|---|---|
| `/home/user/u1-gates/34-e2e-final/` | **61 PNG** gerados pela spec nesta rodada: 7 painéis × 1400×900/800×600 × claro/escuro × expandido/restaurado (de `U1-E09`) + os 5 de `U1-E07` |
| `/home/user/u1-gates/28-layout-final/` e `/home/user/u1-gates/33-layout-final/` | **180 PNG** + `relatorio.json` (0 problemas) cada: 13 categorias + 3 subseções × 3 janelas × 2 temas × 2 modos — o segundo regravado depois da correção de Provedores em altura curta |
| `/home/user/u1-gates/35-foco/` · `36-ampla/` | `vitest.json`, `nominais.json`, `criterios.json` e logs dos gates finais (foco 227/0/13 · ampla 2284/3/33) |
| `/home/user/u1-gates/21-layout-depois/` | 180 PNG + `relatorio.json` com os **34** defeitos **antes** do CSS final (prova da correção) |
| `/home/user/u1-gates/20-layout-antes/` | 90 PNG da v1 com o medidor antigo (menos estrito) |

Nenhuma captura é prova por si: cada uma acompanha a asserção correspondente na §2.

---

## 7. Declaração de escopo

- **Executado:** unitárias U-1 (29+22), suíte completa com comparação nominal
  (2284/3/33), gates preflight/foco/ampla, E2E U-1 **13/13** na 5218, as quatro E2E
  nominais (6/6, 6/6, 17/17, 12/12), medição de layout em 180 cenários e typecheck/lint.
- **Simulado:** provedor e backend de teste — sempre fixture HTTP local, nunca
  serviço remoto, conta ou chave real.
- **Pendente de plataforma:** todo o roteiro Windows da §5 e a conferência visual
  humana das capturas.
- **Não feito, por decisão:** merge; correção da exclusão de chats (fica **depois**
  da U-1); próxima fatia (MM-I/MM-O/E1–E6); alteração de aceites em `08`; force
  push; dependência nova; segundo store de configurações ou de abas; "Salvar tudo"
  atravessando as três Casas; reset global de padrões; grants/permissões novas;
  ações fictícias nas categorias futuras.

**A U-1 não está homologada.** A palavra final é do proprietário.
