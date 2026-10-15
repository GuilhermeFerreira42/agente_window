# 03 - ESTADO ATUAL — onde a obra parou

**ATUALIZADO EM: 2026-10-15 · HEAD público: `76a9ed6` + commits locais do sandbox (até `e182960`: decisões D63–D80, raspagem, handoff, FATIA 07 homologada) · PADRÃO SPEC-DRIVEN ATIVO · FASE ATUAL: FATIA 07 — DESTRAVAR (HOMOLOGADA pelo dono em 15/10) → FATIA 08 — CONECTAR (SPEC proposta na PARTE 2B do `06`; aguardando o OK do dono em 2 pontos)**

> Única fonte de estado. Ao terminar qualquer tarefa, a primeira linha acima (data + HEAD) é atualizada **sempre**. Histórico vai para o `07`; coisa futura para o `06`.
> **Nota de ambiente:** os hashes de commits **locais do sandbox da IA não sobrevivem à troca de sessão** — a fonte durável é o **conteúdo dos arquivos**. O fluxo oficial (validar no Windows → commit/push pelo dono) segue sendo o que fixa de verdade.

## Status Atual
- **2026-10-15 — FATIA 07 HOMOLOGADA pelo dono** ("funcionou perfeitamente") após o pacote de evidências. Entregas: **DEBT-09** (`a69137d`, Provedores pela Conta na landing), **DEBT-06 modo "caminho C"** (`62cf055`, troca de pasta atômica — Explorer na hora; terminal **renasce na pasta nova**; a decisão fina `cd` fica para a FATIA 12), **DEBT-04** conferido (**nada a expurgar**), **onda 1 da faxina D74** (`9985b9e` — 13 E2E mortos em `test.skip`, skips 6→19, contrato anti-trapaça com quarentena documentada → **D79**) e **quarentena pontual dos 2 E2E da Aux** (`e182960` → **D80**). Números finais: typecheck **0** · unit **730✓ / 12✗ (todas pré-existentes) / 16 skip** · E2E **sem regressão** (todas as falhas conferidas no A/B em `e02e486`). Evidências em `validacao_fatia07/` — pasta **externa** ao repositório. Limitações registradas: PTYs órfãos até a FATIA 12; 5 E2E vermelhos pré-existentes fora do §2.4 (`09 §2.6`); sintoma original do DEBT-06 não reproduzido no estado anterior sob as condições testadas.
- **2026-10-15 — FATIA 08 (Conectar) com SPEC proposta:** `06` **PARTE 2B** — tela rica de Provedores estilo Cline (6 provedores, descritores, testar conexão de verdade, buscar modelos, persistir com chave mascarada) + **Casa Provedores nasce** (`2-inteligencia/casas/provedores`, D69 — 1.º módulo extraído). **Aguarda o OK do dono** em 2 pontos (§4: onde mora a chave — D81 proposta; escopo dos provedores — D82 proposta). Só depois começa a implementação.
- **2026-10-14 — 2.ª rodada com a IA colaboradora (Meta):** decisões **D68–D75** (arquitetura "Condomínio", régua 1.135, recortes do MVP, faxina de testes em 2 ondas) registradas e canônicos atualizados (`01`–`09`). Fonte única = **os canônicos deste repositório** (D75). **Código intocado** — próxima ordem esperada: início da FATIA 07.
- **2026-10-14 — Raspagem Total concluída (D77):** VS Code 1.135 · OpenClaude · Cline · Arquitetura limpa → **índice + 12 notas** em `docs/arquivo_morto/referencias/` (com prova de origem; nada de código de terceiros guardado). Dicionário detalhado no `04 §2.2`; língua em **três lugares** (D76); documentação em dois tempos + **etapa ENCERRAMENTO** (D78).
- **Transição Spec-Driven / Stream Coding (2026-10-11):** O projeto encerrou o modo "vibe coding". Todas as fatias são especificadas antes da codificação, e dívidas técnicas abertas bloqueiam o avanço de novas fatias.
- **FATIA 07 — Destravar (Ativa / EM EXECUÇÃO desde 2026-10-15 · D64/D65; SPEC na PARTE 2 do `06`):** só as **3 dívidas estruturais** — o resto da antiga "6.1" foi redistribuído:
  1. **Sincronização atômica de Workspace (DEBT-06):** selecionar uma pasta deve atualizar **na hora** a árvore do Explorer **e** o PTY/Terminal, sem exigir mensagem no chat nem F5. **(Modo homologado em 15/10 — "caminho C", escolha do dono: o terminal renasce já na pasta nova; o `cd` num shell vivo fica para a FATIA 12.)**
  2. **Remoção do Visualizador Legado (DEBT-04):** a aba de Provedores e demais superfícies abrem exclusivamente no editor moderno; sem resquício de visualizador antigo.
  3. **Abertura de Provedores na Landing (DEBT-09):** Conta > Provedores abre com a sessão vazia (Empty State / Landing), sem depender de chat ativo.
  - **Higiene (onda 1 da D74):** marcar como `skip` os 13 E2E mortos do `09 §2.4` (registro preservado — não apagar).
  - **Regra do caminho crítico (D63/D64):** refinamentos saíram daqui — `clear` do terminal (**DEBT-01**) → **FATIA 12 — Terminal 2.0**; lista de recentes (**DEBT-07**), picker nativo (**DEBT-05**) e pesquisa (**DEBT-11**) → **FATIA 13 — Refinamentos**.
  - **Bloqueio:** a **FATIA 08 (Conectar/Provedores)** não inicia enquanto os critérios da Parte 2 do `06` não estiverem verdes e homologados.
- **Fila do MVP (D65):** 07 → 08 (Provedores) → 09 (chat real + streaming) → **10 (Agir/tools+permissões = MVP ponta a ponta)**.
- **FATIA-05 "Chassis-Right":** 100 % homologada no Windows (5174 real) em 2026-10-02.
- **Fatias 07 a 16:** replanejadas e renumeradas (D64) no padrão Spec-Driven dentro de `docs/06 - PROXIMAS FASES E DIVIDAS.md` (Parte 3 + conversão de numeração).
- Servidor de homologação: Vite **5174** (repo real). Régua comparativa oficial: **VS Code Server (8080)** e VS Code real.

## Estado real do código (verificado em 2026-10-13, somente leitura)
- **O chat responde mock:** `App.tsx::handleSend` monta a mensagem, espera um tempo e devolve frase fixa (regex `\bbuild\b` gera changeset fake). **Nenhuma IA é chamada hoje** — é a lacuna central do MVP (Fatias 08–10).
- **Servidor de arquivos completo (o agente já tem "mãos" no servidor):** `/fs/read`, `/fs/write` (**atômico**), `/fs/createFile`, `/fs/mkdir`, `/fs/delete`, `/fs/rename`, `/fs/copy`, `/fs/list`, `/fs/search`, `/fs/stat`, `/fs/watch`.
- **Terminal:** serviço próprio `@agente-window/pty-server` + rotas `/api/pty/*`. **Provedores:** `src/server/providers.ts` (hoje OpenAI/Gemini/Ollama via ambiente; config em `~/.agente_window/providers.json`).
- **Diff:** SCM view com `git.getDiff` **real** (clique numa alteração M/A/D/U abre a aba Diff) + tela de Aceitar/Desfazer. O "diff antigo" foi substituído de propósito pela barra lateral.
- **Trilha de Navegação (breadcrumbs):** puramente visual — sem clique/dropdown (débito **D2.23**, agora registrado no `06` Parte 4).
- **Modularização (resposta ao dono, 2026-10-13):** **parcial**. A receita que funciona existe em `modules/explorer-search` (contrato + barrel único + `frontier.test.ts`; **zero violações** encontradas) e o PTY é pacote separado; mas o **`App.tsx` tem 2.247 linhas** e é a cola central (22 imports de `domain/`, 12 de `components/`, 5 de `shell/` — inclui a sincronização sessão→terminal). Chat/sessões, provedores e editor ainda são **pastas por tipo**. Diagnóstico no `04 §2.1`; **rumo DECIDIDO (14/10) e consolidado no `04 §2.2` — D68/D69** (arquitetura "Condomínio", migração casa-a-casa).

## Placar FATIA-05
| Etapa | Commit | O quê |
|---|---|---|
| Gate 0 | — | ✅ aprovado 2026-09-29 (`docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/05_00_…`) |
| 5.1 c1 | `3fcc913` | Activity Bar 3 ícones à direita |
| 5.1 c2 | `fd05507` | Side Bar à direita, sash 4 px, persistência |
| 5.1 c3 | `1e9978f` | viewRegistry + layoutState + Explorer migrado |
| 5.2 | `22a1523` | Search → Side Bar |
| 5.3 | `2bd6cc3` | Source Control → Side Bar (maquete "Changes N" removida) |
| 5.4 | `7bd528b` | Activity Bar movível (A0.1 = desvio consciente, O13) |
| 5.5 | `1f1ed79` + fix `4e10381` | Drag & drop de views + Views Panel |
| 5.6 | `7d05c7d` | Outline e Timeline reais (A0.6) |
| 5.7 | `9a11319` (+ fixes `a9a73f4`/`0a8ce9a`/`d0a2f81`) | Editor fino default + maximizar/restaurar; maximizado mantém Side Bar 274 (D6 v1.2) |
| 5.8 c1 | `d0c2a8d` | **Coluna "Detalhes" removida de vez** (+ botões "Barra auxiliar"/"Alternar detalhes"); T39 |
| 5.8 c3 | `4ee0ed8` | 16 tokens `--vscode-*` usados sem fallback adicionados (dark + light) |

Medidas finais em 1400 px: boot chat 768 / Side Bar 274; 3 abas 420/341; maximizado `[lista 300][EDITOR 767][SB 274][AB 48]`; F5 mantém abas. Prints: `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c5.8/01–07` *(prints e demais mídias do arquivo_morto removidos em 2026-10-12 a pedido do usuário para liberar espaço — recuperáveis no histórico do Git)*.

## Qualidade (último estado medido)
Fatia 06 consolidada no checkpoint `a65a246`: typecheck 0 · `WorkspaceSwitcher` 3/3 · `SessionLanding` 11/11 · workspaces 7/7 · providers 2/2 · `App.test.tsx` 46 pass / 13 skip. Playwright Linux comprovou listagem de `/`, estado vazio de `/mnt/`, troca para `/tmp`, `/fs/root=file:///tmp`, `document.title=/tmp`, `pwd=/tmp`, Provedores com 3 cards e zero `pageerror`. A suíte global histórica anterior permanece em 722 pass / 9 falhas P4 preexistentes de terminal / 16 skip.

## Pendências abertas
- **✅ DECIDIDO (2026-10-13, D63/D64/D65) — reordenação + renumeração MVP-first:** fila do MVP = **FATIA 07 (Destravar) → 08 (Conectar) → 09 (Conversar) → 10 (Agir)**; refinamentos → **FATIA 13**. Numeração nova e conversão: `05` D64 e `06` Parte 3.
- **✅ DECIDIDO (2026-10-13, D66) — projeto de referência oficial: a "Agents Window" do VS Code** (90 %; fonte da verdade). Material raspado no `arquivo_morto/pesquisa_bruta/**` é fonte de fidelidade; infraestrutura do Agent Host não será reproduzida. Estratégia acordada: agora só compreender; quando autorizado, clonar o VS Code para consultar o código.
- **✅ DECIDIDO (2026-10-13, D67) — kit de contexto para IA colaboradora:** carta avulsa **fora do repositório** + registro das conversas também fora. A regra dos 9 documentos permanece intacta.
- **✅ PERGUNTAS DO ALINHAMENTO — RESPONDIDAS (2026-10-14, 2.ª rodada com a IA colaboradora; decisões D68–D75):**
  1. **Sequência pós-MVP:** **mantida** (11 Conferir → 12 Terminal 2.0 → 13 Refinamentos → 14 Painéis → 15 Worktree → 16 Polimento), com donos definidos: Personalizações → **11** (E4); histórico de chats → **13**; navegador → **16 (por último)**.
  2. **O que sai primeiro do `App.tsx`:** **Provedores é o 1.º módulo extraído** (FATIA 08); o resto sai casa-a-casa, na fatia que mexer (D69). O Terminal só muda na 12 e **com ordem expressa** (área congelada).
  3. **Régua do VS Code:** fixada **1.135** (D71); versões posteriores = refinamento futuro.
  4. **Barra lateral esquerda fiel:** entra na **FATIA 13** (Casas Sessões + Command Center); detalhes finos (contador 29/29, "Novo Grupo", "+1 mais workspace") se fecham com a fatia aberta, contra o mockup.
  5. **Higiene de testes:** **2 ondas** (D74) — `skip` nos 13 E2E mortos (FATIA 07); conserto das 9 falhas do terminal (FATIA 12).
  6. **Escopo do "Agir" (FATIA 10):** no MVP o agente **só mexe em arquivos** (D72); terminal fica para a FATIA 12.
- **🟡 Próximo passo imediato:** o dono dá o **OK na SPEC da FATIA 08** (PARTE 2B §4 — D81 "onde mora a chave" e D82 "escopo dos provedores") → a implementação começa (commits a cada conquista, testes antes de cada commit, validação com Playwright; a FATIA 09 não inicia sem a 08 homologada).
- **🟡 Botão "abre navegador" (vídeo de 2026-10-12, ~2:18):** o dono disse "é outro — mostro depois". **Decidido (14/10): tratado por último — FATIA 16** (o "qual é" continua aguardando o dono mostrar; não adivinhar).
- **DEBT-11 (pesquisa/centro de comando):** destino **FATIA 13**; **forma decidida (D73/E9): a pesquisa volta ao lugar e a troca de pasta vira seletor dentro dela.** Itens dos vídeos: Personalizações → **FATIA 11**; histórico de chats → **FATIA 13**; navegador → **FATIA 16**; demais itens seguem mapeados com dono no `06`.
- **P3 / P4 / P7** — higiene de testes (specs mortas, skips, flakes de digitação em `sessao_13_search` T6/T10 e `sessao_14` T9).
- **P5** — `legacy/`: removida pelo usuário no Windows (tag `legacy-backup-2026-09`); não restaurar.
- **P9** — layout mobile/single-pane (D2.61) não revisitado.
- **D2.72** — campo `auxiliaryVisible` órfão no domínio (`layoutPersistence`, `sessionLayout`, `newSessionViewState`, `layoutController`, `sidePane`): **aceito como fechado para a Fatia 5**; limpeza sem efeito visual fica para o **Polimento final** (antiga "Fatia 12 — Polish Visual & Ruflo" = **FATIA 16** por D64).
- Dívidas de layout pós-MVP: pequenos ajustes de fidelidade visual vistos na homologação Windows → **FATIA 16 — Polimento final** (não listar; não bloqueiam).
- Fora da Fatia 5 por decisão: Alt+Z e menu de abas → 5.9/futura; Simple Browser → 4.8 separada (só UI, sem runtime IA/CDP).

## Para a próxima IA
1. Ler `docs/01` → `02` → este arquivo → `05 - DECISOES` → `06 - PROXIMAS FASES E DIVIDAS.md`. **IA externa convidada a opinar:** pedir ao dono a **carta de contexto** (vive fora do repo — D67).
2. O foco atual é a **FATIA 07 — Destravar** (SPEC na Parte 2 do `06`). Não iniciar a **FATIA 08** nem fatias futuras antes de fechar e homologar a 07. **Atenção à numeração nova (D64):** "Fatia 07" antiga = "Conferir", hoje **11**.
3. Seguir o padrão **Spec-Driven / Stream Coding**: 40 % de pensamento/especificação antes de codar; só commits funcionais pequenos com typecheck 0 e testes verdes.
4. Preservar a identidade de produto (D66): 90 % **Agents Window do VS Code** (régua: code-server 8080) e 10 % customizado (chassi direito + Provedores Cline). O visualizador antigo deve ser purgado, abrindo tudo no editor moderno.


## Checkpoint final da Fatia 06 — barra superior
- `WorkspaceSwitcher.tsx` na Title Bar, estilo Command Palette, lista `/`, `/mnt/`, `/home/`, inclui ocultas e suporta mouse/setas/Enter/Tab/Esc.
- `POST /api/session/change-workspace { sessionId, path }` persiste workspace simples; Explorer e PTY recebem o mesmo caminho com compensação em falha.
- Playwright Debian confirmou `/tmp` simultaneamente em título, `/fs/root` e `pwd`. Relatório: `arquivo_morto/relatorio_fatia06_final.md`.
