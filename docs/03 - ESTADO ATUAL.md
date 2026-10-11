# 03 - ESTADO ATUAL — onde a obra parou

**ATUALIZADO EM: 2026-10-11 · BASE: `f2ff5a3` + working tree · FATIA 06 com Workspace Switcher de topo validado no Linux; aguarda homologação Windows 5174**

> Única fonte de estado. Ao terminar qualquer tarefa, a primeira linha acima (data + HEAD) é atualizada **sempre**. Histórico vai para o `07`; coisa futura para o `06`.


## Status
- **Fatia 06 consolidada (06.4a–06.5) — ✅ implementação e gates locais concluídos:**
  - workspace simples Git/não-Git com `realpath`, persistência, recentes, exclusão segura e raiz por sessão; terminal intocável recebe o PWD pelo contrato público existente;
  - Empty State personalizado em 768 px, foco e transição para histórico;
  - Windows usa `CommonOpenFileDialog { IsFolderPicker=true }` sobre `IFileOpenDialog`/`FOS_PICKFOLDERS` via `powershell.exe -STA`, sem `FolderBrowserDialog`; Linux possui caminho manual com autocomplete real por `GET /api/fs/list?path=`, validado no servidor e sem bloqueio;
  - confirmar a pasta alimenta `workspacePath`; a sessão, Explorer e terminal recebem o PWD real pelo wiring público existente, sem editar TerminalPanel/xterm/PTY;
  - Menu da conta > Provedores abre no editor em Linux/Windows; GET/PUT `/api/providers`, JSON sem segredo, env vars e Ollama configurável; sem runtime real;
  - gates: typecheck 0; SessionLanding 11/11; App 46 pass/13 skip; providers 2/2; workspaces 7/7; Playwright Linux comprovou `/` → `/home/` → `/home/user/`, PWD `/home/user`, 3 cards de Provedores e zero page errors; `git diff --check` verde.
  - **Próximo gate:** checklist humano de 5 minutos no Windows 5174 e Linux; não iniciar Fatia 07 antes do resultado.
- **FATIA-05 "Chassis-Right" = 100 % homologada no Windows (5174 real) em 2026-10-02.** 5.7 por vídeo 08:37:34; 5.8 por teste no 5174.
- **Fatias 07 a 12 + proposta de Fatia 13:** escopos **mapeados**, ainda não prontos nem iniciados. A Fatia 13 é proposta para Agent Host & Multi-host e depende da deliberação D55 no `06`. A especificação construtível de Personalizações está em `docs/arquivo_morto/pesquisa_bruta/especificacao-layout-personalizacoes-2026-10-10.md`; D39–D55 permanecem pendentes de deliberação no `06`. Pastas `fatia-07-input` a `fatia-10-polish` em `pesquisa_bruta/` usam a numeração antiga e não definem os donos atuais.
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
- **D2.72** — campo `auxiliaryVisible` órfão no domínio (`layoutPersistence`, `sessionLayout`, `newSessionViewState`, `layoutController`, `sidePane`): **aceito como fechado para a Fatia 5**; limpeza sem efeito visual fica para a Fatia 12 — Polish Visual & Ruflo.
- Dívidas de layout pós-MVP: pequenos ajustes de fidelidade visual vistos na homologação Windows → Fatia 12 — Polish Visual & Ruflo (não listar; não bloqueiam).
- Fora da Fatia 5 por decisão: Alt+Z e menu de abas → 5.9/futura; Simple Browser → 4.8 separada (só UI, sem runtime IA/CDP).

## Para a próxima IA
1. Ler `docs/01` → `02` → este arquivo → `05 - DECISOES`.
2. A Fatia 6 toma como base o código atual (workbench-v2 com Fatia 5 homologada). Não encostar no chassi direito (Explorer/Search/Git/Activity Bar) nem no terminal. Implementar sessões reais e transição do empty state de 768px sem recriar layouts paralelos nem colunas extras (ver `docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/`).


## Checkpoint final da Fatia 06 — barra superior
- `WorkspaceSwitcher.tsx` na Title Bar, estilo Command Palette, lista `/`, `/mnt/`, `/home/`, inclui ocultas e suporta mouse/setas/Enter/Tab/Esc.
- `POST /api/session/change-workspace { sessionId, path }` persiste workspace simples; Explorer e PTY recebem o mesmo caminho com compensação em falha.
- Playwright Debian confirmou `/tmp` simultaneamente em título, `/fs/root` e `pwd`. Relatório: `arquivo_morto/relatorio_fatia06_final.md`.
