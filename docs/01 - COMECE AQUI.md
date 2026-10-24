# 01 - COMECE AQUI — Agente Window

> **Este é o arquivo de fonte única.** Toda IA (Arena, Meta, Cursor, Claude Code ou outra) lê este arquivo antes de qualquer tarefa.
> Ordem de leitura obrigatória: **01 → 02 → 03**. Os outros (04 a 08) abrem só quando a tarefa precisar.
> Se código e documentação discordarem, **o código manda** — mas reporte a divergência antes de agir.

## 0. Por que a documentação é assim (contexto da decisão, 2026-10-03)

Até 2026-10-02 a pasta `docs/` tinha 373 arquivos e a mesma informação vivia em 5 ou 6 lugares (`00`, `05`, `11`, `12`, `24`, `25`) — cada tarefa exigia atualizar todos. Em 2026-10-02 fizemos uma migração para o padrão "Context Engineering" (Engenharia de Contexto) com arquivos na raiz (`AGENTS.md`, `PROJECT-STATE.md`, `DECISIONS.md`, `CHANGELOG.md`) e pastas `memory-bank/` e `context/` — commits de docs `743772f`, `aa1167e`, `25b3a3b`, `997c308`, `2e14a97`, nenhum de código.

O dono do projeto trabalha por voz, com várias IAs, e pensa em "arquivo 00, arquivo 25". Pastas espalhadas em inglês pioraram o mapa mental dele. Então **ficou decidida a forma híbrida**: mantém o ganho da Engenharia de Contexto (um lugar só para cada coisa, arquivo de entrada curto, histórico separado de estado) e volta para **pasta única `docs/` com numeração**. Os commits da migração não foram revertidos; os arquivos foram **movidos de novo com `git mv`** (histórico preservado).

## 0.1 Linguagem do projeto — Dicionário do Condomínio (D68, 2026-10-14)

> O projeto é **Monolito Modular**: uma casa grande com cômodos separados — **não** microserviço, **nem** "tudo num arquivo só". Detalhe, justificativas e migração: `04 §2.2`.

- **Condomínio** = o projeto inteiro · **Bairro** = grupo de casas (**1** Workbench sem IA · **2** Inteligência · **3** Ponte · **4** Agent Host · **5** Extensões) — **bairro não importa bairro**.
- **Casa** = módulo com **memória + porta (contrato) + teste próprio** (ex.: `modules/explorer-search`) · **Móvel** = peça só visual dentro da casa · **Corredor** = só layout (Titlebar) · **Síndico** = `App.tsx` (meta: ~200 linhas, só cola) · **Prefeitura** = serviços centrais (no MVP: a "caderneta" `shellCommandRegistry`) · **Prédio** = processo separado (MVP: 1 prédio; futuro **Condomínio Robusto**: 5 — `04 §2.2`).
- **Regra de ouro do desenho:** **Bairro 1 funciona sem IA** — desligue a IA e o Workbench continua um editor completo (verificado por teste automático).
- **"Casa muda de endereço quando a fatia mexer nela"** (D69): sem big-bang, sem pasta vazia; áreas congeladas só mudam com ordem expressa do dono.
- **A língua em três lugares (D76):** dicionário (aqui e no `04 §2.2`) + pastas do código + **cartão de visita por casa** (README curto criado na migração de cada casa) — para que o projeto **se explique sozinho**, sem depender de quem participou da conversa. Todo termo novo nomeado pelo dono entra no dicionário.
- **Apelidos registrados (D76):** **Provedores / Cérebro / Runtime** são sinônimos de 2 Inteligência / 3 Ponte / 4 Agent Host (vocabulário da IA colaboradora); os nomes oficiais são os de cima.

## 1. Estrutura travada — 9 arquivos ativos, NUNCA aumentar

```
agente_window/
├── AGENTS.md                 (1 linha: "leia docs/01 - COMECE AQUI") — só para ferramentas acharem a entrada
├── platform/                 (o código — apps/workbench-v2)
└── docs/
    ├── 01 - COMECE AQUI.md               ← este arquivo: entrada, regras de trabalho, rotina de atualização
    ├── 02 - VISAO GERAL.md               ← o que é o projeto, stack, onde está cada coisa (curto)
    ├── 03 - ESTADO ATUAL.md              ← onde a obra parou: HEAD, placar, pendências, próximo passo
    ├── 04 - ARQUITETURA E REGRAS DURAS.md← como é construído + o que é intocável (terminal, core/server, App.tsx)
    ├── 05 - DECISOES.md                  ← decisões fechadas (D1–D99… — a lista cresce; ver o fim do arquivo) — não reabrir
    ├── 06 - PROXIMAS FASES E DIVIDAS.md  ← próximas subfatias/fatias, dívidas e decisões ainda a deliberar
    ├── 07 - HISTORICO.md                 ← changelog + diário de sessão (único lugar de histórico)
    ├── 08 - HOMOLOGACAO.md               ← DO HUMANO: o que cada fatia prova e quando está "pronto" (curto, sem comando)
    ├── 09 - TESTES E AMBIENTE.md         ← DA IA: 5174 × 5175, reseed, flakes, bateria, becos sem saída
    └── arquivo_morto/                    ← tudo que envelheceu: docs antigos, raspagens, prints, planos fechados
```

**Regra de ouro:** são **9 arquivos**. O `08` é do humano (homologar), o `09` é da IA (operar testes). **Nenhum outro arquivo é criado por motivo nenhum** — nem "é longo", nem "é importante", nem "é só um log" (nada de `10 - LOG`, `11 - TODO`). Se precisa anotar algo, entra em um dos 9. Coisa técnica de teste vai no `09`, nunca no `08`. O que fecha vai para `arquivo_morto/` na hora, não acumula.

**Kit de contexto para IA colaboradora (D67, 2026-10-13):** quando o dono convida uma IA externa para **opinar** (sequência, riscos, dívidas), ela recebe uma **carta de contexto avulsa, FORA do repositório** — a regra dos 9 permanece intacta. A carta traz: resumo do projeto e do estado real, decisões recentes, dívidas, **perguntas em aberto**, kit de leitura (estes 9 canônicos + **índice curado do `arquivo_morto`**, com a regra **"história ≠ norma"**) e armadilhas (as 4 numerações que circulam: nova 07–16 · antiga 6.1–14 · pastas `pesquisa_bruta/fatia-XX` · docs do arquivo morto `00`–`28`). O registro das conversas de alinhamento também vive **fora do repo**.

## 2. De onde veio cada arquivo (mapeamento real, com os nomes que existiam no repo)

| Novo | Veio de |
|---|---|
| `01 - COMECE AQUI` | antigo `00_COMECE_AQUI` + regras de trabalho do antigo `27_REGRAS_DE_TRABALHO_COM_IA` |
| `02 - VISAO GERAL` | novo e curto; conteúdo = resumo do `AGENTS.md` da migração (projeto, stack, portas 5174/5175) |
| `03 - ESTADO ATUAL` | antigo `25_ESTADO_ATUAL_E_PENDENCIAS_FATIA-05` + `PROJECT-STATE.md` |
| `04 - ARQUITETURA E REGRAS DURAS` | resumo dos antigos `03_ARQUITETURA_EXECUTAVEL`, `04_CONTRATOS_TECNICOS`, `13_ADRS`, `18_PROTOCOLO_ANTI_REGRESSAO` (terminal intocável) e `28_INVENTARIO_OBSOLETOS` (lista do que não tocar). Os originais ficam em `arquivo_morto/` como referência |
| `05 - DECISOES` | `DECISIONS.md` (que veio do `24_PLANO_FATIA-05 §2` + A0.x do `25`) |
| `06 - PROXIMAS FASES E DIVIDAS` | antigo `05_BACKLOG_MESTRE` (só o que não começou) + pendências P3/P4/P5/P9/D2.72 do `25` |
| `07 - HISTORICO` | antigo `12-DOCUMENTACAO-VIVA` + `CHANGELOG.md` + parte de diário do antigo `16` |
| `08 - HOMOLOGACAO` | antigos `07_MATRIZ_DE_VALIDACAO` + `08_CRITERIOS_DE_HOMOLOGACAO` |
| `09 - TESTES E AMBIENTE` | antigo `26_MAPA_SUITE_E2E_E_AMBIENTE_DE_TESTES` (inteiro — foi escrito depois que uma IA apagou 206 arquivos reais) |
| `arquivo_morto/` | todo o resto: `01, 02, 03, 04, 06, 09, 10, 11 (Kanban), 13, 14, 15, 16, 17, 18, 24, 25, 27, 28` (originais, como referência), `engenharia_reversa/` (raspagens e prints), `referencias_visuais/`, `historico_homologacao/`, histórico do terminal, plano BYTE_A_BYTE, resíduos de `platform/` |

## 3. Como trabalhar com o humano e neste projeto — Padrão Spec-Driven / Stream Coding

> **Novo padrão mandatório (2026-10-11): Spec-Driven Development / Stream Coding (Documentation-First).**
> - **40 % pensando e especificando antes de codar:** nenhuma linha de código é escrita sem uma SPEC clara de 1 página com objetivos, arquivos, critérios testáveis e o que NÃO fazer.
> - **Zero tolerância com dívidas técnicas:** é estritamente proibido iniciar uma fatia nova empurrando dívidas de fatias anteriores com a barriga. Dívidas abertas bloqueiam avanço.
> - **Identidade do Produto (90 % / 10 %):**
>   - **90 % Réplica Fiel do VS Code / Code Server (Agent Mode):** o centro (chat, landing page, fluxo de pastas, comandos) segue rigidamente o original (régua: code-server 8080 e VS Code real).
>   - **10 % Modificado por Decisão do Usuário:** Chassi lateral à direita com terminal integrado avançado + página de Provedores baseada na experiência do **Cline**.

## A. Contexto humano (por que as coisas são como são)
- O usuário **dita por voz** — as mensagens têm frases soltas e palavras trocadas. Interprete a intenção; em dúvida real, pergunte com opções curtas. Responda em **PT-BR, linguagem simples**, sem jargão desnecessário.
- **Fluxo de entrega:** a IA trabalha no sandbox ou IDE; o usuário **valida manualmente no Windows 11 real (porta 5174), grava prints/vídeo e faz commit/push no GitHub**. Por isso os hashes dos commits no GitHub **não coincidem** com os citados nos docs; o conteúdo é o mesmo. Referencie commits pela **mensagem**, não pelo hash.
- O sandbox é **recriado a cada mensagem** do usuário (`docs/09 - TESTES E AMBIENTE.md §3`). Só arquivos em `/home/user` sobrevivem.
- Podem existir **outras IAs** trabalhando a partir de clones do GitHub, sem este contexto. **Tudo que for descoberto ou decidido tem de ir para `docs/`** — a conversa não é memória do projeto.
- Homologação de fase = **validação manual do usuário no Windows**, nunca só o teste verde da IA.

## B. Workspace e servidores
1. O workspace é a fonte de verdade. Reinspecione antes de afirmar que algo falta.
2. **Nunca** resetar sessão, apagar arquivos do usuário, restaurar `legacy/` (foi removida de propósito) ou fazer ação irreversível sem ordem explícita.
3. Um `.txt` que é tarball renomeado **não** se lê como texto (ver cabeçalho de `restore-code-server.sh`).
4. Servidores **sempre** via `start_process`, bind `0.0.0.0`. code-server na **8080 com `--auth none`**, abrindo `/home/user/agente_window`; é ambiente de **medição** (régua do VS Code 1.135), não de produção.
5. Não derrubar o 8080 ou o Vite sem necessidade; se derrubar por RAM, avisar e **religar ao final**. Verificar no fim de cada interação se o 8080 está de pé (quando o turno o exigia).
6. Clones grandes e runtimes ficam em `/home/user/.cache` (fora do snapshot), nunca em `/tmp`.
7. **Proibido** buildar VS Code/code-server da fonte (RAM ~1,9 GB).
8. Não "consertar" código para contornar limitação do sandbox — registrar o bloqueio e orientar validação local.

## C. Como reportar
- No **chat**, não em arquivo extra: **verificado / mudou / passou / falhou / falta**. Sem zip, sem relatório automático.
- **Nunca inventar sucesso** de build/teste. Mostrar números reais (ex.: "708/717, 9 pré-existentes").
- Honestidade sobre feito/não feito; não criar helper paralelo escondido para fazer um teste passar.
- Spec E2E **falhando antes** de cada gap (colar a saída), passando depois.
- **Relatório binário + parada** ao fim de cada commit; **aguardar OK** antes do próximo. Após entregar, não iniciar implementação nem propor "próximos passos" por conta própria ("protocolo de espera ativa").
- "Vamos apenas conversar" = **zero** execução de código/comandos que alterem algo; leitura é permitida.

## D. Como validar
- Preferir `npm run typecheck` + testes focados; bateria completa (`docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §9`, receita em `docs/09 - TESTES E AMBIENTE.md §3`) **em cada commit** de código da FATIA-05; build completo só ao fechar fase.
- Comandos longos sempre com `timeout`; explicar o que está sendo feito.
- Rollback imediato se teste falhar **após** commit. Quando travar: derrubar todos os processos e recomeçar.
- Flaky conhecido (`docs/09 - TESTES E AMBIENTE.md §4.2`): re-rodar 1× antes de declarar regressão.

## E. Git
- Commit **a cada grupo funcional atômico**, só com typecheck 0 + testes verdes. Exige `git -c user.name="Arena Agent" -c user.email="agent@arena.local" commit …`.
- Passos de "só documentação" não geram commit **salvo ordem** do usuário.
- Conferir perímetro antes de commitar: `git diff --name-only` **não** pode listar `modules/explorer-search/{core,server}/**` (exceção D98 limitada à investigação autorizada após validação documental; mudança permanente exige SPEC e aprovação — ver `05`), `EditorArea.tsx` (até 5.7), `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, `components/terminal/**`, specs `sessao_11*`.
- Não commitar utilitários temporários (`shot.tmp.mjs`), `test-results/`, prints fora de `auditoria_*/`.

## F. Escopo e arquitetura
- Princípio **LEGO**: módulos prontos são **reposicionados**, não reescritos.
- **Intocáveis:** Terminal homologado (`components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server`), contratos congelados (`docs/04 - ARQUITETURA E REGRAS DURAS.md`), `modules/explorer-search/{core,server}/**` (D98 autoriza apenas investigação técnica após validação documental; qualquer mudança permanente exige SPEC e aprovação), `EditorArea.tsx` (até 5.7).
- `App.tsx` só **wiring aditivo** via barrel único (`src/shell/index.ts` e `modules/explorer-search/index.ts`); `index.ts`/`contract.ts` do módulo **apenas aditivos**; `ui/**` só montagem; **módulo nunca importa do shell**. *Diagnóstico de acoplamento e rumo de modularização (2026-10-13): `04 §2.1`.*
- `.env` não existe e não deve existir; npm (não pnpm/yarn); rodar E2E com `npx playwright test` (não há script `npm run e2e`).
- **Inglês só em peças novas/migradas**. Nada existente é traduzido.
- Nada em `position: fixed`. Recolher container com box = `display: flex/none`; `contents/none` só em wrapper transparente (Regra 10 do `docs/04`).

## G. Documentação
- Viva em `docs/` (markdown). Atualizar ao fim de cada sub-fase: `docs/07 - HISTORICO.md` (topo cronológico), `docs/03 - ESTADO ATUAL.md` (Kanban), `docs/06 - PROXIMAS FASES E DIVIDAS.md` (débitos e roadmap), `docs/03 - ESTADO ATUAL.md` (estado).
- Sem citar vídeos ou pessoas; sem cor hex (usar tokens `--vscode-*`); medidas só de fontes reais: `04_17`, `05_01`, `05_02`, vscode.dev, 8080. Prints do Windows do usuário prevalecem sobre o 8080 do sandbox.
- Cada doc novo com **data + HEAD válido + "substitui X"** no cabeçalho. Doc superado recebe aviso de OBSOLETO no topo.
- Gaps de fidelidade e dívidas técnicas → `docs/06 - PROXIMAS FASES E DIVIDAS.md` (Matriz canônica de Dívidas Técnicas).

## H. Regra final
Em dúvida entre criar artefato / derrubar serviço / assumir algo: **não criar, preservar, reinspecionar, perguntar**. Se surgir imprevisto: **parar e reportar antes de improvisar**.

## 4. Rotina obrigatória ao TERMINAR qualquer tarefa

1. **`03 - ESTADO ATUAL`**: atualizar HEAD, o que foi feito, o que falta, próximo passo. (Único lugar de estado.)
2. **`07 - HISTORICO`**: uma entrada com data, commits e o que mudou. (Único lugar de histórico.)
3. Tomou decisão que não pode ser reaberta? → uma linha no fim do **`05 - DECISOES`**, com data.
4. Surgiu coisa nova para depois, ou dívida? → **`06 - PROXIMAS FASES E DIVIDAS`**. Começou a fazer? sai do `06` e entra no `03`. Terminou? sai do `03` e vira linha no `07`.
5. Fechou uma fatia? → mover as pastas/prints dela para `docs/arquivo_morto/` **na hora** e conferir se `03` e `06` não ficaram com link quebrado.
6. **Não copiar a mesma informação em dois arquivos.** Se está no `03`, o `07` só aponta.

## 5. Estado em uma linha (detalhe no `03`)

FATIA-05 "Chassis-Right" **100 % homologada** · Fatia 06 homologada · **fases renumeradas e reordenadas em 2026-10-13 (D63–D67)** · **FATIA 07 homologada (15/10) e FATIA 08 homologada (17/10, D89)** · **FATIA 09 — Conversar: HOMOLOGADA em 18/10 (D92) · FATIA 10 — Agir: HOMOLOGADA em 19/10 (D94) — MVP FECHADO; SPECs 11–15 FECHADAS (Q&A 100% 20/10) —  **FATIA 11 ✅ HOMOLOGADA 21/10 (D96) · FATIA 12 ✅ HOMOLOGADA 21/10 (D97) · D98 entre as fatias 12 e 13 — confirmação técnica autorizada em princípio, mas aguarda validação do pacote documental; Central de Diagnósticos futura aprovada (SPEC pendente); planejamento inicial M1–M4 aprovado sem implementação nem numeração oficial, M5–M8 ficam para depois** · histórico da renumeração: **fase que era ativa em 13/10 = FATIA 07 — Destravar** (SPEC pronta na Parte 2 do `06`), seguida por **08 Conectar → 09 Conversar → 10 Agir, onde o MVP fecha (D65)**; refinamentos foram para a FATIA 17 (pós-D95; era 13). Referência oficial de fidelidade: **"Agents Window" do VS Code** (D66; régua code-server 8080).
