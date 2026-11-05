# 05_01 — Inventário Visual do Layout (régua real)

**Fonte única:** CSS e JS compilados do runtime VS Code **1.135.0** que roda no code-server da porta 8080 (`.cache/code-server-runtime/vscode/out/vs/workbench/workbench.web.main.internal.{css,js}`), extraídos em 2026-09-28. Só **medidas e estrutura**; cores sempre por token `--vscode-*` (nunca hex fixo). Itens marcados **[confirmar no DOM]** devem ser medidos no 8080 vivo durante a 5.1 (o CSS usa variável).

> Observação: o usuário citou "VS Code 1.139"; o runtime disponível no sandbox é **1.135.0**. Diferenças entre 1.135 e 1.139 no layout são improváveis, mas se um print do Windows divergir, a régua do Windows prevalece ("não confie na doc, confie no preview real").

## 0. DESCOBERTA: perfil `agentsWindow` no runtime real
O JS compilado traz, em dezenas de configurações, um bloco `agentsWindow:{default:…, readOnly:!0}` — a "Agents Window" real **fixa** o layout. Configurações relevantes e seus valores no perfil:

| Configuração | agentsWindow | readOnly | Efeito para a FATIA-05 |
|---|---|---|---|
| `workbench.activityBar.location` | `"default"` (barra vertical na esquerda) | **sim** | Activity Bar não é movível na janela real |
| `workbench.activityBar.compact` | `false` | sim | ícones 48×48 (não compacto) |
| `workbench.activityBar.autoHide` | `false` | sim | sempre visível |
| `workbench.activityBar.iconClickBehavior` | `"toggle"` | sim | clicar no ícone ativo **fecha** a Side Bar |
| `workbench.sideBar.location` | `"left"` | **sim** | Side Bar fixa à esquerda |
| `workbench.panel.defaultLocation` | `"bottom"` | **sim** | Panel fixo embaixo |
| `workbench.panel.opensMaximized` | `"never"` | sim | |
| `workbench.statusBar.visible` | `false` | **sim** | **sem Status Bar** |
| `workbench.layoutControl.enabled` / `.type` | `true` / `"both"` | sim | controle de layout na titlebar (ícones de toggle das partes) |
| `window.commandCenter` | `false` | sim | sem Command Center |
| `workbench.editor.doubleClickTabToToggleEditorGroupSizes` | `"maximize"` | sim | |
| `workbench.editor.restoreEditors` | `false` | sim | |
| `terminal.integrated.defaultLocation` | `"view"` | sim | Terminal como view (Panel) |
| `breadcrumbs.enabled` | `true` | não | |
| `diffEditor.renderSideBySide` / `useInlineViewWhenSpaceIsLimited` / `hideUnchangedRegions.enabled` | `true` | não | coerente com o DiffPane da 4.7-c |
| `diffEditor.renderMarginRevertIcon` / `renderGutterMenu` / `renderIndicators` | `false` | não | ajustar no DiffPane quando migrar (5.3) |

**Consequência:** a sub-fatia **5.4 (Configurabilidade de Posições)** do plano do usuário **contradiz a régua real** — na janela real Activity Bar/Side Bar/Panel **não se movem**. Decisão registrada como **aberta** em `05_05 §5.4`.

## 1. Activity Bar (`.part.activitybar`)
| Item | Medida (CSS 1.135) |
|---|---|
| Largura | `var(--activity-bar-width, 48px)`; altura 100 % |
| Item de ação (`.action-label`) | 48 × `var(--activity-bar-action-height, 48px)`; ícone codicon `font-size: var(--activity-bar-icon-size, 24px)` |
| Indicador de ativo (`.active-item-indicator:before`) | à esquerda (`left:0`, `top:0`, `height:100%`), borda 2 px (`.action-item:before/:after` height 2px) — cor `--vscode-activityBar-activeBorder` |
| Badge numérico (`.badge .badge-content`) | absoluto `top:24px; right:8px`; font 9 px; min-width 8; height 16; line-height 16; padding 0 4; radius 20 — cores `--vscode-activityBarBadge-background/foreground` |
| Ordem padrão | `.composite-bar` no topo (`margin-bottom:auto`), ações globais (Accounts/Manage) no rodapé |
| Borda | `.activitybar.left.bordered:before` 1 px à direita (`--vscode-activityBar-border`) |
| Cores | fundo `--vscode-activityBar-background`; ícone inativo `--vscode-activityBar-inactiveForeground`; ativo `--vscode-activityBar-foreground` |
| Composites que existem na janela real | Explorer, Search, Source Control, Run & Debug, Extensions (+ os das extensões) — na FATIA-05 só os 3 primeiros |

## 2. Side Bar (`.part.sidebar.pane-composite-part`)
| Item | Medida |
|---|---|
| Largura mínima | `minimumWidth = 170` (JS) |
| Largura padrão | `Math.min(300, larguraDoWorkbench / 4)` (JS) |
| Título (`.part>.title`) | height **35 px**; `padding-left/right: 8px`; `.title-label` `line-height:35px; padding-left:12px`; `h2` **11 px** (uppercase por CSS do composite) |
| Ações do título (`.title-actions`) | `flex:1; padding-left:5px` (ou 8 px em `.composite.title`); alinhadas à direita (`justify-content:flex-end`); `.action-item { margin-right:4px }` |
| Cabeçalho de seção (`.monaco-pane-view .pane>.pane-header`) | `height: var(--pane-header-size)` (22 px por padrão, JS) **[confirmar no DOM]**; font 11 px / 700; uppercase; twisty codicon 16 |
| Sash | `--vscode-sash-size` (4 px), hover `--vscode-sash-hover-size` |
| Cores | `--vscode-sideBar-background/foreground/border`, `--vscode-sideBarTitle-foreground`, `--vscode-sideBarSectionHeader-*` (todas já existem em `theme.css`) |

## 3. Editor Group (`.part.editor .editor-group-container`)
| Item | Medida |
|---|---|
| Abas | `height: var(--editor-group-tab-height)` — padrão **35 px** (`workbench.editor.tabHeight = default`; regra "compact" 20/24 px existe mas não é o padrão) **[confirmar no DOM]** |
| Aba | `padding-left:10px`; `.tab-label a` 13 px; `.tab-actions` 28 px (botão fechar aparece no hover/ativo); `.sizing-fit` width 120 min-content |
| Aba ativa | `.tab-border-bottom-container` 1 px (`--vscode-tab-activeBorder`) / topo 1–2 px (`dirty-border-top`) |
| Ações do editor | `.editor-actions { padding:0 8px 0 4px }` |
| Breadcrumbs | `.breadcrumbs-control` 22 px (abaixo das abas) |
| Regra já homologada | as abas do **Editor Anexo** (4.7) já usam 35 px + itálico preview + ● dirty — o Editor Group central deve **reaproveitar `EditorTabs.tsx`** |

## 4. Panel (`.part.panel`)
| Item | Medida |
|---|---|
| Posição real (agentsWindow) | `bottom` (fixa) |
| Título | `.part>.title` 35 px; `composite-bar` com abas de texto (`PROBLEMS · OUTPUT · DEBUG CONSOLE · TERMINAL · PORTS`) 11 px uppercase; item ativo com borda inferior 1 px (`--vscode-panelTitle-activeBorder`) |
| Borda | `.part.panel.bottom .composite.title` border-top 1 px (`--vscode-panel-border`) |
| Altura mínima | 77 px (JS `minimumHeight`) **[confirmar]** |
| Terminal | já homologado em `workbench-v2` (**intocável**); a FATIA-05 apenas o mantém no slot |

## 5. Status Bar
`.part.statusbar` 22 px / 12 px — **mas oculta no perfil agentsWindow** (`workbench.statusBar.visible=false`, readOnly). **Fora de escopo.**

## 6. Titlebar
`.part.titlebar` 35 px (web); com `layoutControl.enabled=true, type="both"` → ícones de toggle Side Bar / Panel / Auxiliary Bar + menu de layout. Command Center **desligado**. O shell atual já tem `Titlebar.tsx` com esses toggles (verificar 1:1 na 5.1).

## 7. Sashes e animações
| Item | Valor |
|---|---|
| Sash | `--vscode-sash-size` 4 px; hover `--vscode-sash-hover-size`; drag handle ortogonal 2× |
| Animação de abrir/fechar Side Bar | **não há transição de largura no VS Code** (a grade redimensiona sincronamente); `.monaco-pane-view.animated` só anima altura/largura das **seções** internas (`transition-property: height`). A "animação suave de 200 ms" pedida na 5.7 **não existe no VS Code real** — decisão aberta em `05_05 §5.7`. |

## 8. O que já está medido em outros docs (não repetir)
Explorer/árvore/inputbox: `04_17`. Search: `04_17` + `04_18`. Source Control View e diff: `04_21 §1`. Editor Anexo (abas 35 px, breadcrumbs 22 px): `04_20`.
