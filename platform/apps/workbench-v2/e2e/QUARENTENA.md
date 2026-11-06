# Quarentena de E2E — Fatia 15, Onda 3 (D168)

**Regra da casa (RNF15-1 / D79):** teste obsoleto vai para **quarentena COM registro**, nunca é
apagado em silêncio. Este arquivo é o registro. Cada linha foi **medida** — não estimada.

## Por que existe

A Onda 2c-ii (D155/D156) desligou e removeu a **coluna do editor** (o "anexo lateral": sash,
`aside.auxiliary-bar`, `AttachArea`). Isso foi decisão registrada do dono (D151 §2): superfície
única no contêiner central.

Onze specs E2E foram escritos **para a coluna**, com seletores e medidas dela
(`.auxiliary-bar`, `.explorer-attach-area`, sash de 6 px, largura 330 px, etc.). Eles não
descrevem mais o produto — e é isso que a quarentena registra. **Não é regressão:** a
funcionalidade equivalente vive no centro e tem provas próprias (coluna "Cobertura viva").

## Medição (2026-11-06, Vite 5174, Chromium headless)

| Spec | Testes | Resultado medido | Situação |
|---|---|---|---|
| `sessao_10_custom_view_grid.spec.ts` | 2 | **2 failed** | quarentena |
| `sessao_12_explorer.spec.ts` | 30 | **não terminou em 260 s** (30 specs) | quarentena + reprovação separada |
| `sessao_13_search.spec.ts` | 14 | **10 failed / 4 passed** | quarentena parcial (ver nota) |
| `sessao_14_editor_anexo.spec.ts` | 16 | **16 failed** | quarentena |
| `sessao_14b_git_changes.spec.ts` | 9 | **1 failed** (medido antes) | quarentena |
| `sessao_14b_git_smoke.spec.ts` | 1 | **1 passed** | **NÃO quarentenar** — segue verde |
| `sessao_14c_diff_minimal.spec.ts` | 2 | **2 failed** | quarentena |
| `sessao_14d_commit_input.spec.ts` | 5 | **1 failed** (medido antes) | quarentena |
| `sessao_15_activity_bar.spec.ts` | 21 | **1 failed** | quarentena |
| `sessao_15_editor_maximize.spec.ts` | 10 | **não terminou em 200 s** | quarentena + reprovação separada |
| `sessao_15_outline_timeline.spec.ts` | 4 | **4 failed** | quarentena |

**Honestidade sobre a medição:** dois specs não terminaram no tempo que eu tinha
(`sessao_12_explorer`, `sessao_15_editor_maximize`). Eles estão listados como *não medidos até o
fim* — não como "todos falharam". Quem retomar começa por eles.

## Nota sobre `sessao_13_search` (10 failed / 4 passed)

Este é o único caso **parcial**, e não vou tratá-lo como binário. Parte dos testes de busca
passa porque a busca continua existindo no centro; os que falham dependem do layout da coluna.
Separar cada um exige uma rodada por teste, que fica registrada como pendência nomeada — não
como "quarentenado" nem como "verde".

## Cobertura viva que substitui estes specs

O que a quarentena deixa descoberto no E2E **está coberto** em outro nível, e verificado no
navegador de verdade nesta mesma rodada:

| Capacidade | Onde está provada |
|---|---|
| Abrir arquivo da árvore → Monaco com conteúdo real | `__tests__/centerFrontier.test.tsx`, `centerCorpoDoModulo.test.tsx` + **verificação no browser (2026-11-06)** |
| **Ctrl+S grava no disco** (RF15-1) | `centerSaveRouting.test.tsx` + **verificação no browser com hash do arquivo (medido: hash mudou, mtime mudou)** |
| **F5 restaura as abas** (RF15-4) | `layoutPersistence.test.ts`, `sessionLayout.test.ts` + **verificação no browser (mesmas abas, mesmo conteúdo)** |
| Aba **Changes** no centro com git real | `centerChanges.test.tsx`, `centerChangesMount.test.tsx` (D166) + **verificação no browser (repo detectado, arquivo listado, input de commit)** |
| SCM na Side Bar | `sessao_14b_git_smoke.spec.ts` — **segue verde, não foi quarentenado** |

## O que NÃO foi feito, de propósito

- **Nenhum spec foi apagado.** Eles continuam no repositório como referência de intenção e
  como base para reescrever no centro.
- **Nenhum spec foi marcado `test.skip` em massa.** Marcar sem reescrever esconde dívida
  dentro do arquivo; o registro aqui é externo e datado, o que é mais difícil de esquecer.
- **Não reescrevi os specs para o centro nesta rodada.** Isso é trabalho próprio (por spec,
  com gate), e fazê-lo junto com a correção de estado teria misturado duas causas — foi
  exatamente o erro que a D167 mostrou ser caro.

## Como rodar sem sujar o app (obrigatório)

```sh
sh platform/scripts/e2e-isolado.sh e2e/<spec>.spec.ts
```

Motivo em `D167`: rodar `playwright test` direto grava no banco REAL do usuário
(`~/.agente_window/agente_window.db`) — já criou sessão apontando para `/tmp` apagado e deixou
o produto com árvore vazia.
