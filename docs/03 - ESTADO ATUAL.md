# 03 - ESTADO ATUAL — onde a obra parou

**ATUALIZADO EM: 2026-10-12 · HEAD público: `76a9ed6` + commits locais do sandbox (limpeza do arquivo_morto, docs e podcast) · PADRÃO SPEC-DRIVEN ATIVO · FASE ATUAL: FATIA 6.1 — FECHAMENTO DE DÍVIDAS CRÍTICAS**

> Única fonte de estado. Ao terminar qualquer tarefa, a primeira linha acima (data + HEAD) é atualizada **sempre**. Histórico vai para o `07`; coisa futura para o `06`.

## Status Atual
- **Transição Spec-Driven / Stream Coding (2026-10-11):** O projeto encerrou o modo "vibe coding". Todas as fatias são especificadas antes da codificação, e dívidas técnicas abertas bloqueiam o avanço de novas fatias.
- **FATIA 6.1 — Fechamento de Dívidas Críticas (Ativa / Em Andamento):**
  - **Bloqueio de avanço:** A Fatia 07 (File Ops & Monaco) **não será iniciada** enquanto as 4 dívidas bloqueantes levantadas na auditoria do vídeo não forem fechadas:
    1. **Sincronização atômica de Workspace (DEBT-06):** Selecionar uma pasta no diálogo deve atualizar simultaneamente a árvore do Explorer e emitir `cd` para o PTY/Terminal imediatamente, sem exigir envio de mensagem no chat nem F5.
    2. **Remoção do Visualizador Legado (DEBT-04):** Eliminar resquícios do visualizador antigo; a aba de Provedores e demais superfícies devem abrir exclusivamente no editor moderno.
    3. **Abertura de Provedores na Landing (DEBT-09):** O item Conta > Provedores deve abrir na área do editor mesmo quando a sessão estiver vazia (Empty State / Landing), sem depender de chat ativo.
    4. **Limpeza do Terminal (DEBT-01):** O comando `clear`/`cls` deve resetar o viewport do xterm sem deixar fantasmas ou resíduos de texto.
    5. **Lista de Recentes (DEBT-07):** Diálogo de pastas deve listar histórico recente para troca ágil.
- **FATIA-05 "Chassis-Right":** 100 % homologada no Windows (5174 real) em 2026-10-02.
- **Fatias 07 a 14:** Replanejadas e detalhadas no padrão Spec-Driven dentro de `docs/06 - PROXIMAS FASES E DIVIDAS.md`.
- Servidor de homologação: Vite **5174** (repo real). Régua comparativa oficial: **VS Code Server (8080)** e VS Code real.

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
- **DEBT-11 (nova, do vídeo de 2026-10-12) — a deliberar:** a pesquisa/centro de comando saiu do topo e o caminho fixo ocupou o lugar; decidir se entra na 6.1 ou em fatia futura. Após a decisão, sai daqui e entra no `06`. Itens do mesmo vídeo ainda não fatiados (Personalizações, histórico de chats, "raspar o código original", chips da Landing, "botão que abre navegador" não identificado) e evidências: `06 - PROXIMAS FASES E DIVIDAS.md`.
- **P3 / P4 / P7** — higiene de testes (specs mortas, skips, flakes de digitação em `sessao_13_search` T6/T10 e `sessao_14` T9).
- **P5** — `legacy/`: removida pelo usuário no Windows (tag `legacy-backup-2026-09`); não restaurar.
- **P9** — layout mobile/single-pane (D2.61) não revisitado.
- **D2.72** — campo `auxiliaryVisible` órfão no domínio (`layoutPersistence`, `sessionLayout`, `newSessionViewState`, `layoutController`, `sidePane`): **aceito como fechado para a Fatia 5**; limpeza sem efeito visual fica para a Fatia 12 — Polish Visual & Ruflo.
- Dívidas de layout pós-MVP: pequenos ajustes de fidelidade visual vistos na homologação Windows → Fatia 12 — Polish Visual & Ruflo (não listar; não bloqueiam).
- Fora da Fatia 5 por decisão: Alt+Z e menu de abas → 5.9/futura; Simple Browser → 4.8 separada (só UI, sem runtime IA/CDP).

## Para a próxima IA
1. Ler `docs/01` → `02` → este arquivo → `05 - DECISOES` → `06 - PROXIMAS FASES E DIVIDAS.md`.
2. O foco exclusivo atual é a **FATIA 6.1 — Fechamento de Dívidas Críticas**. Não iniciar a Fatia 07 nem fatias futuras antes de fechar e homologar a 6.1.
3. Seguir o padrão **Spec-Driven / Stream Coding**: 40 % de pensamento/especificação antes de codar; só commits funcionais pequenos com typecheck 0 e testes verdes.
4. Preservar a identidade de produto: 90 % VS Code original (régua: code-server 8080) e 10 % customizado (chassi direito + Provedores Cline). O visualizador antigo deve ser purgado, abrindo tudo no editor moderno.


## Checkpoint final da Fatia 06 — barra superior
- `WorkspaceSwitcher.tsx` na Title Bar, estilo Command Palette, lista `/`, `/mnt/`, `/home/`, inclui ocultas e suporta mouse/setas/Enter/Tab/Esc.
- `POST /api/session/change-workspace { sessionId, path }` persiste workspace simples; Explorer e PTY recebem o mesmo caminho com compensação em falha.
- Playwright Debian confirmou `/tmp` simultaneamente em título, `/fs/root` e `pwd`. Relatório: `arquivo_morto/relatorio_fatia06_final.md`.
