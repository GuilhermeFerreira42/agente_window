# 03 - ESTADO ATUAL — onde a obra parou

**ATUALIZADO EM: 2026-10-07 · BASE: `1f12a93` · 06.4a implementada e validada localmente · aguardando homologação Windows**

> Única fonte de estado. Ao terminar qualquer tarefa, a primeira linha acima (data + HEAD) é atualizada **sempre**. Histórico vai para o `07`; coisa futura para o `06`.


## Status
- **Fatia 06 em execução estrita por subfatia:**
  - **06.1 Persistência Híbrida — ✅ homologada no Windows real 5174 em 2026-10-06:** commits `c9e1f0c` + reparo `9ba48db`; SQLite em `~/.agente_window/agente_window.db`, JSONL por sessão e restauração após F5 comprovados pelo usuário.
  - **06.2 Worktree + troca de diretório + fix UI — ✅ homologada no Windows real 5174 em 2026-10-06:** commit `f1afebd`; vídeo 12:06 comprovou `+` abrindo a landing contínua, duas sessões com `pwd` em worktrees distintos, troca automática de cwd pelo picker e restauração de sessões/worktrees após F5.
  - **06.3 — concluída tecnicamente; rota revisada pela 06.4a:** seletor nativo do servidor preservado; worktree deixa de ser obrigatório e fica desligado por padrão para reativação opcional na Fatia 11.
  - **06.4a — ✅ implementação e validação local concluídas; aguardando homologação Windows:** qualquer pasta com/sem Git, `worktree_path=NULL`, branch nula, terminal direto, recentes em `recent-workspaces.json`, exclusão simples e migração SQLite. D38 autoriza `POST /fs/workspace` aditivo: Explorer/Search/SCM trocam a raiz real ao mudar sessão, sem alterações visuais.
  - **06.3 Empty State 768px:** Reutilização do componente `SessionLanding.tsx` (já existente no `workbench-v2`, validado no vídeo), acionado pelo `+` GLOBAL.
  - **06.4 Listagem e Buscador:** Distinção entre `+` GLOBAL (novo worktree) e `+` NO PROJETO (múltiplos chats sob o mesmo slug); modal central Session Picker com grupos NEEDS INPUT / RECENTLY OPENED / OTHER SESSIONS unificado ao filtro lateral; criação do doc `SESSION_PICKER.md`.
  - **06.5 Terminal e Contexto:** Chaveamento automático de `cwd` do Terminal PTY ao trocar de sessão.
  - **06.6 Homologação e Testes:** Roteiro de smoke tests na porta 5174 real documentado no `09 §6`.
  - **Próximo gate:** homologação da 06.4a no Windows real 5174; não iniciar 06.4b antes da aprovação explícita do usuário.
- **FATIA-05 "Chassis-Right" = 100 % homologada no Windows (5174 real) em 2026-10-02.** 5.7 por vídeo 08:37:34; 5.8 por teste no 5174.
- **Fatias 7 a 10 (Engenharia Reversa e Especificações):** Mapeamento em `docs/arquivo_morto/pesquisa_bruta/`. Prontas para fases subsequentes.
- Servidor de homologação: Vite **5174** (repo real), subir via processo em background.

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

Medidas finais em 1400 px: boot chat 768 / Side Bar 274; 3 abas 420/341; maximizado `[lista 300][EDITOR 767][SB 274][AB 48]`; F5 mantém abas. Prints: `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c5.8/01–07`.

## Qualidade (último estado medido)
06.4a: typecheck 0 · alvo 71 pass / 13 skip · suíte completa 722 pass / 9 fail (`TerminalPanel.test.tsx`, preexistentes) / 16 skip · Playwright terminal 3/3 · loop físico com pasta sem Git e pasta Git confirmou `worktree_path=NULL`, zero worktrees/branches, PWD direto, F5, exclusão limpa, migração nullable e troca de Explorer/Search/SCM por D38.

## Pendências abertas
- **P3 / P4 / P7** — higiene de testes (specs mortas, skips, flakes de digitação em `sessao_13_search` T6/T10 e `sessao_14` T9).
- **P5** — `legacy/`: removida pelo usuário no Windows (tag `legacy-backup-2026-09`); não restaurar.
- **P9** — layout mobile/single-pane (D2.61) não revisitado.
- **D2.72** — campo `auxiliaryVisible` órfão no domínio (`layoutPersistence`, `sessionLayout`, `newSessionViewState`, `layoutController`, `sidePane`): **aceito como fechado para a Fatia 5**; limpeza sem efeito visual fica para Hardening.
- Dívidas de layout pós-MVP: pequenos ajustes de fidelidade visual vistos na homologação Windows → Fatia 10 Hardening (não listar; não bloqueiam).
- Fora da Fatia 5 por decisão: Alt+Z e menu de abas → 5.9/futura; Simple Browser → 4.8 separada (só UI, sem runtime IA/CDP).

## Para a próxima IA
1. Ler `docs/01` → `02` → este arquivo → `05 - DECISOES`.
2. A Fatia 6 toma como base o código atual (workbench-v2 com Fatia 5 homologada). Não encostar no chassi direito (Explorer/Search/Git/Activity Bar) nem no terminal. Implementar sessões reais e transição do empty state de 768px sem recriar layouts paralelos nem colunas extras (ver `docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/`).
