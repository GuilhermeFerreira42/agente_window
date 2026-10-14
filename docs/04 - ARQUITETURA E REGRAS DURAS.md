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
8. Princípio **LEGO**: módulos prontos são reposicionados, nunca reescritos. Nada em `legacy/` (removida pelo usuário; não restaurar). **Eliminação definitiva do visualizador legado:** qualquer componente de visualizador antigo é banido da arquitetura; todas as abas e superfícies auxiliares (inclusive Provedores) abrem exclusivamente no editor moderno.
9. **Padrão Spec-Driven / Stream Coding:** 40 % de especificação prévia obrigatória antes de codar; fatias verticais pequenas; proibido iniciar nova fatia com dívida técnica aberta.

## 1.1 Decisão 06.3 — seletor nativo de repositório (2026-10-06)
- **Inspeção técnica:** `workbench-v2` é Vite/React puro; não há `tauri.conf`, pacote `@tauri-apps` nem runtime Tauri. Portanto, `plugin-dialog` não se aplica.
- **Opção C servidor:** no Windows, o plugin Vite chama `powershell.exe` via `child_process.execFile`, em modo STA, e abre `System.Windows.Forms.FolderBrowserDialog`.
- **Fluxo padrão 06.4a:** o caminho deve existir, ser diretório e resolver por `realpath`. Git não é obrigatório. `git rev-parse --show-toplevel` só pode ser exigido quando a chamada explícita usar `requireGit=true`/`useWorktree=true` (worktree opcional da Fatia 11).
- A operação fica em `src/server/session-persistence/`; a UI usa endpoint single-port dedicado. Cancelamento retorna resultado explícito, não cria draft e não altera a seleção atual.
- **Proibido:** usar `FileSystemDirectoryHandle`/File System Access API para inferir caminho absoluto; aceitar caminho sem validação canônica; implementar o diálogo dentro de Explorer ou terminal.
- Fora do Windows, o endpoint de diálogo responde “não suportado”; a validação de caminho e os testes backend continuam multiplataforma.
- **D38 / exceção mínima autorizada:** `POST /fs/workspace { path }` pode recriar os hosts FS/Git com uma raiz canônica por sessão após validar `realpath` e diretório. Apenas o servidor e o wiring de `App.tsx` mudam; componentes visuais de Explorer/Search/SCM permanecem congelados.

## 1.2 Compatibilidade de Stack com o Runtime de Agente (D30 - 2026-10-05)
- **OpenClaude como referência nativa de Runtime:** O repositório de referência `openclaude` é 100% **TypeScript / Bun / Node**, alinhando-se perfeitamente à stack do nosso produto (`platform/apps/workbench-v2/` em React + Vite + TypeScript).
- **Sem necessidade de sidecar Go:** A raspagem prévia de `opencode` (Go + sqlc + goose) apontava para a necessidade de compilação de binários Go e processos sidecar em background. Com o OpenClaude, todos os serviços de persistência (`sessionStorage`), controle de chamadas (`doomLoop`), segurança (`permissions`), worktrees e providers são TypeScript nativo, permitindo integração direta via contratos na camada 2.1 (Motor / Agent Runtime), eliminando pontes IPC pesadas.

## 1.3 Contratos de Sincronização e Visualização da Fatia 6.1 (2026-10-11; hoje **FATIA 07** por D64)
- **Sincronização atômica de Workspace (DEBT-06):** Ao confirmar a escolha de uma pasta (Windows Explorer moderno ou entrada manual Linux), o estado `workspacePath` deve atualizar imediatamente e de forma atômica:
  1. O cliente do Explorer (recarrega a árvore raiz sem exigir reload de página);
  2. O PTY do Terminal (emite `cd` e sincroniza o PWD sem exigir envio de mensagem no chat);
  3. O arquivo de recentes (`~/.agente_window/recent-workspaces.json`).
- **Desacoplamento de Provedores (DEBT-09):** O menu da conta > Provedores deve abrir o painel de configuração independentemente do estado do chat. Funciona tanto na landing page vazia quanto com sessões ativas.
- **Limpeza de buffer do Terminal (DEBT-01):** Execução de `clear`/`cls` no PTY deve disparar limpeza completa do viewport do xterm sem deixar resíduos visuais no topo.
- **Purga de componentes legados (DEBT-04):** Baniu-se qualquer montagem ou referência ao visualizador antigo; todas as telas auxiliares usam a infraestrutura do editor moderno.

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

## 2.1 Modularização — diagnóstico verificado (2026-10-13; decisão consolidada na §2.2 em 2026-10-14)
> **Pedido do dono:** confirmar se a arquitetura está sendo construída em **módulos separados, com responsabilidades bem definidas e baixo acoplamento** (ex.: mexer no terminal deve afetar **só** o terminal; o mesmo princípio para sessões e demais componentes). **Resposta honesta: parcialmente** — a direção está certa e comprovada em um subsistema, mas **ainda não é o padrão de todo o código**.

**O que já está no padrão (comprovado no código em 13/10):**
- `modules/explorer-search` é um **módulo de verdade**: `contract.ts` (fronteira congelada em 2026-09-20) + `index.ts` (barrel único) + **teste automático de fronteira** (`__tests__/frontier.test.ts`) + 32 arquivos de teste. Auditoria de 13/10: **nenhuma violação** — nada fora do módulo importa `core/`/`ui/`/`server/` diretamente, e o `App.tsx` importa o módulo **uma única vez** pelo barrel.
- O terminal já tem o **backend como pacote separado**: `platform/services/pty-server` (com `package.json`/`tsconfig` próprios).

**O que ainda NÃO está no padrão:**
- **`App.tsx` — 2.247 linhas** — é a "cola" central do sistema: 22 imports de `domain/`, 12 de `components/`, 5 de `shell/`; contém, por exemplo, a **sincronização sessão → terminal** (`fetch('/api/pty/cwd')`). Hoje, mexer nessa sincronização toca o mesmo arquivo que mexe em sessões/chat.
- Chat/sessões, provedores e editor ainda vivem em **pastas por tipo** (`components/`, `domain/`, `server/`), não como módulos com contrato/fronteira próprios.

**Rumo DECIDIDO (2026-10-14 — D68/D69/D70, detalhe na §2.2):** espalhar a receita do explorer-search (contrato + barrel + teste de fronteira) aos próximos módulos e encolher o `App.tsx` até a **composição fina (~200 linhas)**. A ordem é a das próprias fatias: **Provedores (08) → Chat (09) → Agente (10, novo) → Editor + Personalizações (11) → Terminal (12 — endereço congelado, exige ordem) → Sessões + Command Center + Navegador (13)**. **Nada foi alterado no código.**

## 2.2 Arquitetura oficial — Monolito Modular ("Condomínio") — D68/D69/D70 (2026-10-14)

> **Decisão do dono (2026-10-14).** Vocabulário criado na conversa com a IA colaboradora (Meta, 14/10). **Não é microserviço e nem "tudo num arquivo só"** — é uma casa grande com cômodos separados: manutenção isolada sem a complexidade de rede/debug dos microserviços.

### Vocabulário oficial (dicionário)
| Termo | O que é | Exemplo no nosso código |
|---|---|---|
| **Condomínio** | O projeto inteiro | `agente_window` |
| **Bairro** | Grupo de casas que trabalham juntas; **bairro NÃO importa bairro** | 1 Workbench sem IA · 2 Inteligência · 3 Ponte · 4 Agent Host · 5 Extensões |
| **Casa** | Módulo com **memória (estado) + porta (contrato) + ciclo de vida + teste próprio**; pode ser trocada sem quebrar o resto | `modules/explorer-search` (exemplo que funciona — 0 violações) |
| **Móvel** | Peça **só visual**, sem estado próprio; vive DENTRO de uma casa | `WorkspaceSwitcher` (móvel da Casa do Command Center) |
| **Corredor** | Só junta casas; não tem estado (é layout) | Titlebar |
| **Síndico** | `App.tsx` — só cola (wiring); meta: ~200 linhas | `src/App.tsx` (hoje: 2.247 linhas — a ser encolhido) |
| **Prefeitura** | Serviços centrais que todas as casas usam (no MVP: a "caderneta" `shellCommandRegistry`) | `domain/shellCommandRegistry.ts` |
| **Prédio** | Processo separado do SO; se um cai, o outro fica de pé | MVP: 1 prédio · Robusto: 5 prédios |

**Critério "Casa ou Móvel?"** (para não exagerar e virar micropedaço): é **CASA** se tem estado + contrato + pode ser trocada + teste próprio. Senão, é **MÓVEL**.

### Estrutura de pastas (destino)
```
src/bairros/
  1-workbench/casas/     → editor, terminal*, explorer-search*, navegador, command-center, sessoes, personalizacoes
  2-inteligencia/casas/  → provedores
  3-ponte/casas/         → chat
  4-agent-host/casas/    → agente (runtime, sessões, ferramentas)
  5-extensoes/casas/     → skills, plugins
```
`*` **Endereço congelado:** área com contrato congelado **não muda de pasta** até a fatia que abrir a área **com ordem expressa do dono** — o **Terminal** muda na **FATIA 12**; o **Explorer/Search** pode ficar onde está (já é casa de verdade). Cada casa por dentro segue o desenho que já funciona: `contract.ts` (porta tipada) · `index.ts` (barrel) · `ui/`, `core/`, `server/` internos.

### Regras do Condomínio (valem para o MVP e para o Robusto)
1. **Bairro 1 não importa Bairro 2–5** — desligue a IA e o Workbench continua um editor completo (igual VS Code sem Copilot). **Verificado por teste automático** (não é promessa).
2. Cada casa tem **porta única**: de fora, **só se importa pelo `index.ts`** — `frontier.test.ts` por casa (modelo já existente).
3. **Mover uma casa por vez**, na fatia que já ia mexer nela ("a casa muda de endereço quando a fatia mexer nela") — sem big-bang, sem renomear por renomear, **sem pasta vazia**.
4. **Apelidos de caminho** (`@workbench/…`, `@ia/…`) para evitar `../../..`.
5. **Um padrão de nome só** (o desenho acima); endereços antigos esvaziam aos poucos — **sem renomear por renomear**.

### Registro das Casas (onde mora cada coisa)
| Casa | Bairro | Endereço hoje | Destino | Situação |
|---|---|---|---|---|
| Explorer/Search | 1 | `modules/explorer-search` | (pode ficar) | ✅ verde — exemplo a copiar |
| Terminal | 1 | `components/terminal` + `services/pty-server` | `1-workbench/casas/terminal` | 🔒 congelado — muda na FATIA 12 (ordem expressa) |
| Provedores | 2 | `components/ProvidersView.tsx` + `server/providers.ts` + lógica no `App.tsx` | `2-inteligencia/casas/provedores` | 🟠 nasce na FATIA 08 |
| Chat | 3 | `components/ChatPanel.tsx` + `handleSend` no `App.tsx` | `3-ponte/casas/chat` | 🟠 nasce na FATIA 09 |
| Agente (runtime/sessões/ferramentas) | 4 | (novo) | `4-agent-host/casas/…` | 🆕 nasce na FATIA 10 |
| Editor | 1 | `components/EditorArea.tsx` + gestão de abas no `App.tsx` | `1-workbench/casas/editor` | 🟠 nasce na FATIA 11 |
| Personalizações | 1 | `components/CustomizationsView.tsx` + dados no `App.tsx` | `1-workbench/casas/personalizacoes` | 🟠 nasce na FATIA 11 (E4) |
| Sessões | 1 | `components/SessionSidebar.tsx` + lógica no `App.tsx` | `1-workbench/casas/sessoes` | 🟠 nasce na FATIA 13 |
| Command Center | 1 | `components/TopBar/WorkspaceSwitcher.tsx` + centro da Titlebar | `1-workbench/casas/command-center` | 🟠 nasce na FATIA 13 |
| Navegador | 1 | `BrowserPreview` dentro de `EditorArea.tsx` | `1-workbench/casas/navegador` | 🟠 nasce na FATIA 16 — **por último** (padrão `simple-browser`; acordo com a Meta, 14/10) |
| Skills (agnósticas) | 5 | (novo) | `5-extensoes/casas/skills` | 🆕 pós-MVP (padrão `loadSkillsDir` do OpenClaude) |

### Escolhas do MVP — justificativa e "quando revisitar"
| Escolha | Por quê | Quando revisitar |
|---|---|---|
| **Comandos: caderneta simples** | ~30 comandos hoje, 36 linhas de código, já verde. A "central da prefeitura" custa **~10 linhas por comando**; benefício só aparece com 100+ comandos, menus e atalhos | **100+ comandos** ou precisar de atalho/menu/condicional (→ DEBT-ROBUST-01) |
| **Processos: mesmo prédio** | Sem ponte (IPC), debug fácil, é o que já existe; custo aceito **de propósito** | Agente **travar a tela** · **mesma sessão em 2 janelas** · **vários agentes** (→ DEBT-ROBUST-02) |
| **Titlebar = corredor** | Não tem estado próprio; o estado (pasta atual, sessões) fica na Casa do Command Center | Layout ficar complexo (→ DEBT-ROBUST-03) |
| **Bairro 1 independente** | Garante "desligue a IA e o editor continua completo"; protege o que já foi aprovado | Nunca (regra dura; no Robusto ganha DI) |

### Condomínio Robusto (pós-MVP) — quando migrar
> **Regra de ouro:** só migrar **depois do MVP pronto, funcionando e com o dono usando** — e **sempre por decisão do dono**. Nunca no meio do caminho. **Não é outro programa:** as casas, portas, regra do Bairro 1 e testes continuam; muda a **fundação**.

| Dívida | O que muda | Gatilho (o "sinal") | Custo estimado |
|---|---|---|---|
| **DEBT-ROBUST-01** | Comandos: caderneta → CommandsRegistry + MenuRegistry + Keybindings + DI | Querer **atalhos/menus/comandos condicionais** em tudo, ou **100+ comandos** | 3–4 dias |
| **DEBT-ROBUST-02** | Processos: mesmo prédio → **5 prédios** (Main · Workbench · Extension Host · Agent Host (AHP) · Pty Host) | **Tela travar com o agente** · **mesma sessão em 2 janelas** · **vários agentes ao mesmo tempo** | 1–2 semanas |
| **DEBT-ROBUST-03** | Layout: Titlebar corredor → **LayoutService com Parts** (Command Center desmembrado: QuickOpen Ctrl+P · CommandPalette Ctrl+Shift+P · CommandCenter) | **Layout complexo** (esconder/mostrar partes, comandos de layout) | 2–3 dias |
| **DEBT-ROBUST-04** | Bairro 1 ganha **DI** (peças trocáveis via `accessor.get`) | **Trocar uma peça sem quebrar** (ex.: arquivos local ↔ nuvem) | 2 dias |

**O que NUNCA muda (nem no Robusto):** o vocabulário (condomínio/bairro/casa/móvel/corredor/síndico/prédio) · **Bairro 1 funciona sem IA** · cada casa com **porta única** + teste de fronteira · o fluxo de trabalho (conversar → especificar → implementar → testar → reportar).

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
Ver `docs/arquivo_morto/README.md`: `FATIA-05_LAYOUT_BYTE_A_BYTE/`, `docs/arquivo_morto/00_COMO_LER_ESTA_DOCUMENTACAO.md`, `docs/arquivo_morto/12-DOCUMENTACAO-VIVA.md`, `docs/arquivo_morto/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/arquivo_morto/15_HANDOFF_PROMPT_PARA_NOVA_IA.md`, histórico do terminal (`ANALISE_…`, `CORRECAO_…`, `comparacao-terminal/`, `historico_migracao_temporaria/`), `platform/apps/workbench-v2/tsc` e `test-results-debug/`. `shot.tmp.mjs` não existia; `legacy/` já não existe.

## 3. Planos superados (histórico, não autoridade)
| Caminho | Substituído por |
|---|---|
| `docs/arquivo_morto/FATIA-05_LAYOUT_BYTE_A_BYTE/05_00…05_06` (plano "Byte a Byte", Side Bar à esquerda, decisões A0.x) | `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` v1.1 (Chassis-Right) + `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/` |
| Rascunhos "docs 21–23" citados em conversas | nunca entraram no repo; `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` os absorveu |
| `docs/arquivo_morto/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/arquivo_morto/15_HANDOFF_PROMPT_PARA_NOVA_IA.md` | ponto de entrada atual é `docs/01 - COMECE AQUI.md` → `docs/arquivo_morto/16-INICIAR-POR-AQUI-IA-EXECUTORA.md` |
| `docs/arquivo_morto/historico_migracao_temporaria/`, `docs/arquivo_morto/comparacao-terminal/`, `docs/arquivo_morto/ANALISE_TERMINAL_CODE_SERVER_CLONE.md`, `docs/arquivo_morto/CORRECAO_REGRESSAO_TERMINAL_V2.md` | histórico do terminal (FATIA-03), congelado em `docs/arquivo_morto/17_COMITE_TERMINAL_FIDELIDADE_2026-09-14.md`/`docs/04 - ARQUITETURA E REGRAS DURAS.md (protocolo completo em docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md)` |

## 4. Arquivos soltos em `platform/apps/workbench-v2/`
| Arquivo | O que é | Destino |
|---|---|---|
| `shot.tmp.mjs` | utilitário de print da FATIA-05 | **não existe mais** (verificado 2026-10-02) |
| `tsc` (arquivo vazio) | resíduo de um `npx tsc` errado | **arquivado** em `docs/arquivo_morto/platform-residuos/`; removido em 2026-10-12 na limpeza de espaço (recuperável no histórico do Git) |
| `probe-terminal.mjs`, `validacao-real-workspace.mjs` | sondas manuais da FATIA-03/04 | não usadas; manter até decisão |
| `manual_evidence/`, `test-results/`, `test-results-debug/` | evidências antigas e saída do Playwright | `test-results*` são descartáveis; `manual_evidence/` é histórico da FATIA-03 |
| `Data Nesta` (se aparecer no `ls`) | não é arquivo — artefato de exibição | ignorar |

## 5. Fora do repositório (só no sandbox / uploads do usuário)
- `/home/user/uploads/APRENDIZADOS_REGRAS_INTERACAO_ARENA_VSCODE_WORKSPACE.txt` → incorporado em `docs/01 - COMECE AQUI.md §3`.
- `/home/user/uploads/meu_documento.txt` (aprovação do Gate 0, decisões a–g) → incorporado em `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §2` e `docs/07 - HISTORICO.md`.
- `/home/user/uploads/05_00_relatorio_validacao_pre_fase.md` (auditoria externa) → copiado em `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.
- `/home/user/restore-code-server.sh` e o tarball do code-server → ambiente de medição; não fazem parte do produto.
- Prints antes/depois da FATIA-05 viviam em `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1|c2|c3/` (movidos da raiz do repo em 2026-09-29 — a pasta solta `auditoria_05/` na raiz **não deve existir**). Eram versionados (exigidos pelo protocolo Opção C). **Removidos em 2026-10-12 a pedido do usuário para liberar espaço (46 MB); recuperáveis pelo histórico do Git.**

## Fatia 06 consolidada — fronteiras multiplataforma
- `TerminalPanel.tsx` e xterm permanecem intocáveis. O PWD inicial vem de `activeSession.worktreePath ?? activeSession.workspacePath`; a troca em uma sessão viva usa apenas o wiring aditivo `/api/pty/cwd`, que escreve `cd`/`Set-Location` no PTY existente sem recriar a UI do terminal.
- Picker nativo é exclusivamente Windows e roda no servidor por `powershell.exe -STA`, usando COM `IFileOpenDialog` com `FOS_PICKFOLDERS`; Provedores não importam nem chamam código Windows.
- Em sistemas sem picker, caminho manual oferece autocomplete por `GET /api/fs/list?path=` (somente diretórios reais, ordenados) e a confirmação passa por `POST /api/workspaces/validate`: `realpath`, existência e diretório. Nunca confiar apenas no input do navegador.
- `providers.json` não contém `apiKey`; OpenAI/Gemini usam apenas status das env vars e Ollama guarda somente `baseUrl` HTTP(S).

- A troca de workspace em sessão existente usa identidade explícita `{ sessionId, path }`; nunca há “sessão ativa global” no backend. UI coordena persistência, `/fs/workspace` e `/api/pty/cwd`, com compensação para o caminho anterior se uma etapa falhar.
