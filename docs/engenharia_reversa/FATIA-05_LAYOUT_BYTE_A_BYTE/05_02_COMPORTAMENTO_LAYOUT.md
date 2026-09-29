# 05_02 — Comportamento do Layout (VS Code real, perfil agentsWindow)

Fonte: comportamento observado no code-server 8080 + `workbench.web.main.internal.js` (1.135). Sem vídeo, sem pessoas.

## 1. Modelo mental
```
Titlebar (35)                                              [toggles de layout]
┌─48─┬──── Side Bar (170–300+) ────┬──────── Editor Group ────────┐
│ AB │ TÍTULO (35, 11px UPPER) ⋯   │ [aba][aba][aba]      (35)    │
│ 📁 │ ▾ SEÇÃO (22)                │ breadcrumbs (22)             │
│ 🔍 │   conteúdo da view          │ conteúdo (Monaco / Diff)     │
│ ⑂  │                             │                              │
│    │                             ├──── Panel (bottom) ──────────┤
│    │                             │ PROBLEMS OUTPUT TERMINAL (35)│
│ ⚙  │                             │ terminal…                    │
└────┴─────────────────────────────┴──────────────────────────────┘
(sem Status Bar no perfil agentsWindow)
```

## 2. Activity Bar
- Um **composite ativo** por vez; clique em outro ícone troca a view da Side Bar **sem** perder o estado da view anterior (Search mantém query/resultados; Source Control mantém mensagem de commit).
- `iconClickBehavior = toggle`: clicar no ícone **já ativo** fecha a Side Bar; clicar de novo reabre com o mesmo composite.
- Badges: Source Control mostra **contagem de recursos alterados** (`git.countBadge = all`); Search **não tem badge** por padrão (o pedido do usuário "badge 12 matches" **não existe** no VS Code real — a contagem aparece **no texto dentro da view**: "N results in M files"). Explorer mostra badge de arquivos sujos não salvos (`explorer.decorations.badges`) — opcional.
- Foco: `Ctrl+B` alterna Side Bar; `Ctrl+Shift+E` Explorer; `Ctrl+Shift+F` Search; `Ctrl+Shift+G` Source Control; `Ctrl+J` Panel; `Ctrl+`` Terminal.
- Menu de contexto do ícone: "Hide 'X'", "Reset Location", posição — **no agentsWindow as opções de posição estão bloqueadas** (readOnly).

## 3. Side Bar
- Título = nome do composite em maiúsculas (11 px) + ações do composite (Explorer: New File/New Folder/Refresh/Collapse; Search: Refresh/Clear/New Search Editor/Expand-Collapse/Toggle Details; Source Control: View as Tree/List, Refresh, ⋯).
- Conteúdo = `pane-view` com seções colapsáveis (Explorer: OPEN EDITORS · pasta · OUTLINE · TIMELINE; Source Control: input + Changes/Staged; Search: sem seções).
- **Independência do editor:** abrir um arquivo (Explorer) ou um diff (Source Control) **não altera** a Side Bar. Isso é o critério nº 1 da FATIA-05.
- Redimensionável pelo sash (min 170); fechada = largura 0 (Activity Bar continua).

## 4. Editor Group
- Recebe **tudo que "abre"**: arquivos (`explorer.fileOpened`), diffs (`git.openChange`), Settings, Search Editor…
- Preview (itálico, aba reutilizada) vs. fixado (duplo clique / editar) — igual ao Editor Anexo 4.7.
- Diff abre como aba `a.txt (Working Tree)` / `(Index)` com ícone do arquivo; fechar o diff não afeta a lista.
- Um único grupo é o alvo da FATIA-05 (split de grupos = fora de escopo).

## 5. Panel
- Abas de texto; Terminal homologado do workbench-v2 continua sendo o conteúdo da aba TERMINAL. `Ctrl+J` alterna. Maximizar (chevron) existe.
- Timeline e Outline **não ficam no Panel** no VS Code real: são **seções da Side Bar do Explorer** (OUTLINE, TIMELINE) — o plano do usuário (5.6) as coloca no Panel; registrado como decisão aberta em `05_05 §5.6`.

## 6. Drag & Drop de views (real)
- É possível arrastar uma **view** (ex.: TIMELINE) pelo seu cabeçalho para: outro lugar da mesma Side Bar (reordenar), a Activity Bar (vira composite próprio), o Panel ou a Auxiliary Bar. Composites inteiros também se arrastam entre Activity Bar ↔ Panel.
- Persistência em `workbench.views.state`/`workbench.panel.pinnedPanels` (storage). Na FATIA-05: `localStorage` com chave versionada.

## 7. Estado do shell atual (workbench-v2) — o que muda de comportamento
| Hoje | Alvo |
|---|---|
| Explorer/Search/Changes na **barra auxiliar direita** ("Detalhes"), Search em aba do anexo, Changes em aba do anexo | Explorer/Search/Source Control na **Side Bar esquerda**, escolhidos pela Activity Bar |
| Abrir arquivo monta o **Editor Anexo** dentro da barra auxiliar e esconde Search/Changes | Abrir arquivo/diff vai para o **Editor Group central**; Side Bar não muda |
| Transição Temporária (`gitTransition.ts`) esconde a maquete "Changes N" | maquete removida (D2.38) na 5.3 |
| Terminal no painel inferior (homologado) | idem — intocável |
