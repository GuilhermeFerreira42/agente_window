# 01 - COMECE AQUI — Agente Window

> **Este é o arquivo de fonte única.** Toda IA (Arena, Meta, Cursor, Claude Code ou outra) lê este arquivo antes de qualquer tarefa.
> Ordem de leitura obrigatória: **01 → 02 → 03**. Os outros (04 a 08) abrem só quando a tarefa precisar.
> Se código e documentação discordarem, **o código manda** — mas reporte a divergência antes de agir.

## 0. Por que a documentação é assim (contexto da decisão, 2026-10-03)

Até 2026-10-02 a pasta `docs/` tinha 373 arquivos e a mesma informação vivia em 5 ou 6 lugares (`00`, `05`, `11`, `12`, `24`, `25`) — cada tarefa exigia atualizar todos. Em 2026-10-02 fizemos uma migração para o padrão "Context Engineering" (Engenharia de Contexto) com arquivos na raiz (`AGENTS.md`, `PROJECT-STATE.md`, `DECISIONS.md`, `CHANGELOG.md`) e pastas `memory-bank/` e `context/` — commits de docs `743772f`, `aa1167e`, `25b3a3b`, `997c308`, `2e14a97`, nenhum de código.

O dono do projeto trabalha por voz, com várias IAs, e pensa em "arquivo 00, arquivo 25". Pastas espalhadas em inglês pioraram o mapa mental dele. Então **ficou decidida a forma híbrida**: mantém o ganho da Engenharia de Contexto (um lugar só para cada coisa, arquivo de entrada curto, histórico separado de estado) e volta para **pasta única `docs/` com numeração**. Os commits da migração não foram revertidos; os arquivos foram **movidos de novo com `git mv`** (histórico preservado).

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
    ├── 05 - DECISOES.md                  ← decisões fechadas (D1–D38, A0.x, O13/O14) — não reabrir
    ├── 06 - PROXIMAS FASES E DIVIDAS.md  ← próximas subfatias/fatias, dívidas e decisões ainda a deliberar
    ├── 07 - HISTORICO.md                 ← changelog + diário de sessão (único lugar de histórico)
    ├── 08 - HOMOLOGACAO.md               ← DO HUMANO: o que cada fatia prova e quando está "pronto" (curto, sem comando)
    ├── 09 - TESTES E AMBIENTE.md         ← DA IA: 5174 × 5175, reseed, flakes, bateria, becos sem saída
    └── arquivo_morto/                    ← tudo que envelheceu: docs antigos, raspagens, prints, planos fechados
```

**Regra de ouro:** são **9 arquivos**. O `08` é do humano (homologar), o `09` é da IA (operar testes). **Nenhum outro arquivo é criado por motivo nenhum** — nem "é longo", nem "é importante", nem "é só um log" (nada de `10 - LOG`, `11 - TODO`). Se precisa anotar algo, entra em um dos 9. Coisa técnica de teste vai no `09`, nunca no `08`. O que fecha vai para `arquivo_morto/` na hora, não acumula.

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

## 3. Como trabalhar com o humano e neste projeto (antigo `27`, mantido na íntegra — nada novo)

> Fluxo com várias IAs (Arena, Meta, Cursor, outras), cada uma com recursos diferentes — **não engessar formato**. Regras duras de código estão detalhadas no `04`; como testar sem apagar arquivos reais, no `09`.

## A. Contexto humano (por que as coisas são como são)
- O usuário **dita por voz** — as mensagens têm frases soltas e palavras trocadas. Interprete a intenção; em dúvida real, pergunte com opções curtas. Responda em **PT-BR, linguagem simples**, sem jargão desnecessário.
- **Fluxo de entrega:** a IA trabalha no sandbox da Arena; o usuário **baixa o workspace, roda no Windows 11, valida manualmente e faz commit/push no GitHub**. Por isso os hashes dos commits no GitHub **não coincidem** com os citados nos docs; o conteúdo é o mesmo. Referencie commits pela **mensagem**, não pelo hash.
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
- Conferir perímetro antes de commitar: `git diff --name-only` **não** pode listar `modules/explorer-search/{core,server}/**`, `EditorArea.tsx` (até 5.7), `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, `components/terminal/**`, specs `sessao_11*`.
- Não commitar utilitários temporários (`shot.tmp.mjs`), `test-results/`, prints fora de `auditoria_*/`.

## F. Escopo e arquitetura (resumo operacional; detalhe em `docs/arquivo_morto/16-INICIAR-POR-AQUI-IA-EXECUTORA.md`, `docs/04 - ARQUITETURA E REGRAS DURAS.md (protocolo completo em docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md)`, `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §11`)
- Princípio **LEGO**: módulos prontos são **reposicionados**, não reescritos.
- **Intocáveis:** Terminal homologado (`components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server`), contratos congelados (`docs/04 - ARQUITETURA E REGRAS DURAS.md (protocolo completo em docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md)`), `modules/explorer-search/{core,server}/**`, `EditorArea.tsx` (até 5.7).
- `App.tsx` só **wiring aditivo** via barrel único (`src/shell/index.ts` e `modules/explorer-search/index.ts`); `index.ts`/`contract.ts` do módulo **apenas aditivos**; `ui/**` só montagem; **módulo nunca importa do shell**.
- `.env` não existe e não deve existir; npm (não pnpm/yarn); rodar E2E com `npx playwright test` (não há script `npm run e2e`).
- **Inglês só em peças novas/migradas** (lista em `docs/arquivo_morto/25_ESTADO_ATUAL_E_PENDENCIAS_FATIA-05.md (histórico) §5 O7`). Nada existente é traduzido.
- Nada em `position: fixed`. Recolher container com box = `display: flex/none`; `contents/none` só em wrapper transparente (Regra 10 do `docs/04 - ARQUITETURA E REGRAS DURAS.md (protocolo completo em docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md)`).

## G. Documentação
- Viva em `docs/` (markdown). Atualizar ao fim de cada sub-fase: `docs/07 - HISTORICO.md` (topo cronológico), `docs/03 - ESTADO ATUAL.md` (Kanban), `docs/06 - PROXIMAS FASES E DIVIDAS.md (backlog completo antigo em docs/arquivo_morto/05_BACKLOG_MESTRE.md)` (débitos), `docs/03 - ESTADO ATUAL.md` (estado), `docs/arquivo_morto/16-INICIAR-POR-AQUI-IA-EXECUTORA.md` quando muda o protocolo.
- Sem citar vídeos ou pessoas; sem cor hex (usar tokens `--vscode-*`); medidas só de fontes reais: `04_17`, `05_01`, `05_02`, vscode.dev, 8080. **"Não confie na doc, confie no preview real"**: checar atributos reais no 8080 antes de codar. Prints do Windows do usuário prevalecem sobre o 8080 do sandbox.
- Cada doc novo com **data + HEAD válido + "substitui X"** no cabeçalho. Doc superado recebe aviso de OBSOLETO no topo (não se apaga histórico sem ordem).
- Gaps de fidelidade → `docs/07 - HISTORICO.md` "Débito Técnico do Shell"; pendências herdadas de fases anteriores → backlog `docs/06 - PROXIMAS FASES E DIVIDAS.md (backlog completo antigo em docs/arquivo_morto/05_BACKLOG_MESTRE.md)`, não entram na sub-fase corrente.
- Protocolo **Opção C**: prints antes/depois em `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1|c2|c3` provando fidelidade vs. 8080.

## H. Regra final
Em dúvida entre criar artefato / derrubar serviço / assumir algo: **não criar, preservar, reinspecionar, perguntar**. Se surgir imprevisto (conflito de teste, medida nova, erro não previsto): **parar e reportar antes de improvisar**.

## 4. Rotina obrigatória ao TERMINAR qualquer tarefa

1. **`03 - ESTADO ATUAL`**: atualizar HEAD, o que foi feito, o que falta, próximo passo. (Único lugar de estado.)
2. **`07 - HISTORICO`**: uma entrada com data, commits e o que mudou. (Único lugar de histórico.)
3. Tomou decisão que não pode ser reaberta? → uma linha no fim do **`05 - DECISOES`**, com data.
4. Surgiu coisa nova para depois, ou dívida? → **`06 - PROXIMAS FASES E DIVIDAS`**. Começou a fazer? sai do `06` e entra no `03`. Terminou? sai do `03` e vira linha no `07`.
5. Fechou uma fatia? → mover as pastas/prints dela para `docs/arquivo_morto/` **na hora** e conferir se `03` e `06` não ficaram com link quebrado.
6. **Não copiar a mesma informação em dois arquivos.** Se está no `03`, o `07` só aponta.

## 5. Estado em uma linha (detalhe no `03`)

FATIA-05 "Chassis-Right" **100 % homologada no Windows em 2026-10-02**. **Fatia 06 — Workspace Simples & Chat Real — EM EXECUÇÃO por subfatia:** 06.4a homologada com ressalvas no Windows real em 2026-10-10; 06.4b está liberada como próxima subfatia.
