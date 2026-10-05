# 03 - ESTADO ATUAL — onde a obra parou

**ATUALIZADO EM: 2026-10-05 · HEAD de código: `4ee0ed8` (5.8-c3) · Documentação da raspagem movida para pesquisa_bruta/fatia-06-chat/ · Aguardando autorização Fatia 06**

> Única fonte de estado. Ao terminar qualquer tarefa, a primeira linha acima (data + HEAD) é atualizada **sempre**. Histórico vai para o `07`; coisa futura para o `06`.


## Status
- **Raspagem OpenClaude + Cline (2026-10-05):** Raspagem completa do repositório `openclaude` (TypeScript/Bun) e da extensão Cline 4.1.22. Conteúdo de pesquisa arquivado em `docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/` e pasta temporária `docs_atualizada/` removida. Decisões D30–D35 consolidadas no `05` e compatibilidade de stack documentada no `04`. **Fatia 6 permanece PAUSADA aguardando autorização do usuário.**
- **FATIA-05 "Chassis-Right" = 100 % homologada no Windows (5174 real) em 2026-10-02.** 5.7 por vídeo 08:37:34; 5.8 por teste no 5174.
- **Fatia 6 (Alinhamento de Documentação - 2026-10-04):** Especificação recalibrada para a versão real do Windows (**VS Code 1.135.0**, perfil Janela Agentes). Travados: chassi direito (Side Bar 274 + Activity Bar 48) e terminal como intocáveis; transição do empty state de 768px para thread ativa; e substituição de mocks de chat/sessões de `src/data.ts` por serviço real.
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
typecheck 0 · vitest 701 pass / 9 fail (`TerminalPanel.test.tsx`, pré-existentes no sandbox, terminal intocável — não investigar) / 16 skip · bateria §9 15 suítes ×2 verde (flakes conhecidos de digitação).

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
