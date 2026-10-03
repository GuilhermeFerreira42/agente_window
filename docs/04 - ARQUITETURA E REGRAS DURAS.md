# 04 - ARQUITETURA E REGRAS DURAS

> Da IA. Lido antes de tocar em código. Resume `03_ARQUITETURA_EXECUTAVEL`, `04_CONTRATOS_TECNICOS`, `13_ADRS`, `18_PROTOCOLO_ANTI_REGRESSAO` e `28_INVENTARIO_OBSOLETOS` (originais íntegros em `docs/arquivo_morto/`). Em caso de dúvida sobre o terminal, **abrir o 18 original** antes de agir.

## 1. Regras duras (violação = rollback imediato)
1. **Terminal intocável** — `src/components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `platform/services/pty-server/**`, specs `e2e/sessao_11*`. Homologado pelo comitê (`17`, `75c6686`). Zero linhas, nem "só CSS".
2. **`src/modules/explorer-search/{core,server}/**` intocáveis.** Única exceção já concedida: `server/git` **aditivo** (`POST /git/log`, 5.6). `index.ts`/`contract.ts` do módulo só aditivos; `ui/**` só montagem; **o módulo nunca importa do shell**.
3. **`App.tsx` só wiring aditivo** via barrel (`src/shell/index.ts`, `modules/explorer-search/index.ts`). `EditorArea.tsx` segue só com Browser/Customizations.
4. **Zero cor hardcoded** — só tokens `--vscode-*` definidos em `styles/theme.css` (dark **e** light). Zero `any` em porta de serviço. **`.env` proibido.** npm (não pnpm/yarn).
5. Sem `position: fixed`. Recolher superfície com box = `display: flex/none` (`contents/none` só em wrapper transparente — Regra 10 do 18). Sem transição CSS de largura em Side Bar/sash (o VS Code não anima).
6. Chassi à **direita**: `[lista 300][centro: chat | editor anexo][Side Bar 274][Activity Bar 48]`; sash da Side Bar 4 px; maximizado do editor **mantém** Side Bar 274 (D6 v1.2).
7. RAM ~1,9 GB: **um Vite por vez**; proibido buildar VS Code/code-server; runtimes/clones em `~/.cache`.
8. Princípio **LEGO**: módulos prontos são reposicionados, nunca reescritos. Nada em `legacy/` (removida pelo usuário; não restaurar).

## 2. Arquitetura em 4 camadas (de `03`)
| Camada | Responsabilidade | Exemplos de componentes | Dependências permitidas |
|---|---|---|---|
| 2.1 Motor / Agent Runtime | acesso ao SO, PTY, filesystem, rede, providers de IA e execução de tools | `PtyHost`, `FileHost`, `AgentRuntimeAdapter`, `ToolExecutionAdapter` | nenhuma dependência de UI |
| 2.2 Workbench | carcaça do produto, layout global, partições, docking, focus, persistência geométrica | `WorkbenchShell`, `LayoutManager`, `PartRegistry`, `ViewContainerCoordinator` | pode consumir contratos da Lógica, nunca detalhes de Runtime |
| 2.3 Lógica / Backend do Workbench | regras de negócio, orquestração de sessões, comandos, estados e adaptação entre Workbench e Runtime | `TerminalService`, `ExplorerService`, `ChatSessionService`, `CommandRegistry` | pode falar com contratos do Runtime e notificar o Workbench |
| 2.4 Interface Visual | renderização e interação com o usuário | `TerminalPanel`, `ExplorerTree`, `ChatPanel`, `Titlebar`, `AuxiliaryBar` | só consome estado/comandos da Lógica e do Workbench |

## Regra principal de dependência
A dependência desce nesta ordem:

`Visual -> Workbench -> Lógica -> Runtime`

É proibido:
- UI importar detalhes internos do Runtime;
- Runtime conhecer componentes de UI;
- um subsistema acessar estado interno de outro sem passar por serviço/contrato;
- camadas pularem contratos para “ganhar velocidade”.

Contratos por subsistema (runtime do agente, model provider, tools, terminal, filesystem, explorer, editor, layout, sessões de chat, persistência, comandos, tema) → `docs/arquivo_morto/04_CONTRATOS_TECNICOS.md`. ADRs → `docs/arquivo_morto/13_ADRS_E_DECISOES_TECNICAS.md`.

## 3. Contratos congelados do terminal (títulos das 14 regras do `18` — texto completo lá)
- Regra 1: Altura e Redimensionamento via CSS Variable
- Regra 2: Visibilidade Condicional da Sidebar de Abas
- Regra 3: Preservação de Sessões PTY e Instâncias xterm.js
- Regra 4: Fidelidade Visual dos Itens da Aba (Tabs)
- Regra 5: As 5 Abas do Painel
- Regra 6: Maximização Confinada ao `.right-section` (`position: absolute`)
- Regra 7: Prevenção de Tela em Branco e Buffer PTY (`pendingOutputRef` + `fitAllInstancesRef`)
- Regra 8: Arraste de Divisor (Split Sash) via Geometria Absoluta
- Regra 9: Reatividade Dinâmica de Tema (`useTerminalTheme`)
- Regra 10: Preservação de Sessões em Background via `display: contents / none`
- Regra 11: IDs Únicos sem Colisão via crypto.randomUUID()
- Regra 12: Portas Dinâmicas via /api/ports (BUG-02)
- Regra 13: Drag & Drop MVP de Abas (BUG-06)
- Regra 14: Atributos data-pty-* e Classes E2E para Validação (Compatibilidade Testes)

Contratos de layout das Fatias 01/02 (`.right-section` relativo, Titlebar 35 px, Statusbar 22 px, Activity Bar 48 px) também estão no `18 §4`.

## 4. Inventário: o que é obsoleto, morto ou intocável (antigo `28`)
**Data:** 2026-09-29 · **HEAD:** `0e36af4`. Lista do que está (ou esteve) no repositório e **não** deve ser lido, testado, corrigido ou restaurado. Cada linha diz o que é, por que ficou, e o destino decidido.

## 1. `legacy/` — REMOVIDA de propósito
- **O que era:** cópia antiga ("Casa Velha", porta 5173) do ambiente, incl. terminal de referência (`legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`).
- **Decisão do usuário (2026-09-29): apagar do branch principal.** Motivos: nenhum código depende dela (verificado: só um comentário em `platform/services/pty-server/src/vitePlugin.ts` a cita como fonte histórica); IAs sem contexto gastam tokens lendo-a; foi apagada por acidente por specs de fixture rodadas contra a 5174 (`docs/09 - TESTES E AMBIENTE.md §1`); pesa em RAM/inotify.
- **Backup = Git.** Recomendação para o commit de remoção (feito pelo usuário no Windows): `git tag legacy-backup-2026-09 <último commit com legacy/>` antes de `git rm -r legacy/`. Recuperação, se um dia precisar: `git checkout legacy-backup-2026-09 -- legacy/`.
- **Regra para IAs:** não referenciar, não restaurar, não procurar. Docs 00/01/03/03A/05 ainda citam `legacy/` em trechos **históricos** — leia como passado.

## 2. Testes mortos — **INTOCÁVEIS, NÃO MOVER** (decisão do usuário 2026-10-02, Etapa 2 da migração)
| Grupo | Onde | Status | Motivo |
|---|---|---|---|
| 13 E2E mortos | `e2e/sessao_08*`, `sessao_10` (T3–T5), `sessao_11b/c/d/e/f` | pré-existentes; não corrigir, não investigar, **não mover para archive** | fazem parte da área do terminal homologado (`docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO…`); causa em `docs/09 - TESTES E AMBIENTE.md §2.4` |
| 9 unitários falhando | `src/__tests__/TerminalPanel.test.tsx` | pré-existentes no sandbox; **INTOCÁVEL — docs/18** | terminal homologado; só reportar o número no relatório de vitest (701 pass / 9 fail / 16 skip em 2026-10-02) |

Qualquer IA que "consertar", mover ou apagar esses arquivos viola regra dura (`AGENTS.md §4.1`). Destino final só por ordem do usuário (P3/P4 em `docs/03 - ESTADO ATUAL.md`).

## 2b. Arquivados em `docs/arquivo_morto/` (2026-10-02)
Ver `docs/arquivo_morto/README.md`: `FATIA-05_LAYOUT_BYTE_A_BYTE/`, `docs/00_COMO_LER…`, `docs/12-DOCUMENTACAO-VIVA`, `docs/14`, `docs/15`, histórico do terminal (`ANALISE_…`, `CORRECAO_…`, `comparacao-terminal/`, `historico_migracao_temporaria/`), `platform/apps/workbench-v2/tsc` e `test-results-debug/`. `shot.tmp.mjs` não existia; `legacy/` já não existe.

## 3. Planos superados (histórico, não autoridade)
| Caminho | Substituído por |
|---|---|
| `docs/arquivo_morto/FATIA-05_LAYOUT_BYTE_A_BYTE/05_00…05_06` (plano "Byte a Byte", Side Bar à esquerda, decisões A0.x) | `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` v1.1 (Chassis-Right) + `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/` |
| Rascunhos "docs 21–23" citados em conversas | nunca entraram no repo; `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` os absorveu |
| `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md` | ponto de entrada atual é `docs/00_COMECE_AQUI.md` → `docs/arquivo_morto/16-INICIAR-POR-AQUI-IA-EXECUTORA.md` |
| `docs/historico_migracao_temporaria/`, `docs/comparacao-terminal/`, `docs/ANALISE_TERMINAL_CODE_SERVER_CLONE.md`, `docs/CORRECAO_REGRESSAO_TERMINAL_V2.md` | histórico do terminal (FATIA-03), congelado em `docs/arquivo_morto/17_COMITE_TERMINAL_FIDELIDADE_2026-09-14.md`/`docs/04 - ARQUITETURA E REGRAS DURAS.md (protocolo completo em docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md)` |

## 4. Arquivos soltos em `platform/apps/workbench-v2/`
| Arquivo | O que é | Destino |
|---|---|---|
| `shot.tmp.mjs` | utilitário de print da FATIA-05 | **não existe mais** (verificado 2026-10-02) |
| `tsc` (arquivo vazio) | resíduo de um `npx tsc` errado | **arquivado** em `docs/arquivo_morto/platform-residuos/` |
| `probe-terminal.mjs`, `validacao-real-workspace.mjs` | sondas manuais da FATIA-03/04 | não usadas; manter até decisão |
| `manual_evidence/`, `test-results/`, `test-results-debug/` | evidências antigas e saída do Playwright | `test-results*` são descartáveis; `manual_evidence/` é histórico da FATIA-03 |
| `Data Nesta` (se aparecer no `ls`) | não é arquivo — artefato de exibição | ignorar |

## 5. Fora do repositório (só no sandbox / uploads do usuário)
- `/home/user/uploads/APRENDIZADOS_REGRAS_INTERACAO_ARENA_VSCODE_WORKSPACE.txt` → incorporado em `docs/01 - COMECE AQUI.md §3`.
- `/home/user/uploads/meu_documento.txt` (aprovação do Gate 0, decisões a–g) → incorporado em `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §2` e `docs/07 - HISTORICO.md`.
- `/home/user/uploads/05_00_relatorio_validacao_pre_fase.md` (auditoria externa) → copiado em `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.
- `/home/user/restore-code-server.sh` e o tarball do code-server → ambiente de medição; não fazem parte do produto.
- Prints antes/depois da FATIA-05 vivem em `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1|c2|c3/` (movidos da raiz do repo em 2026-09-29 — a pasta solta `auditoria_05/` na raiz **não deve existir**). São versionados (prints antes/depois exigidos pelo protocolo Opção C).
