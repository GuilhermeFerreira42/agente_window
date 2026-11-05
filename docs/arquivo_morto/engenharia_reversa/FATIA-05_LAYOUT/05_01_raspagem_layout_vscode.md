# 05_01 — Raspagem do layout de referência (Activity Bar + Side Bar)

Fonte única: instância de referência na porta 8080 (VS Code 1.135.0 web), viewport 1280×800, **sem pasta aberta** (Restricted Mode), medição por `getBoundingClientRect` + `getComputedStyle`. Dados brutos: `raspagem_05_01/medidas_8080.json`, `medidas_8080_direita.json`, `medidas_8080_direita_v2.json`. Prints: `raspagem_05_01/01…11`.

Observações de método:
- O tema ativo no user-data do 8080 é o **claro padrão** (`vscode-theme-defaults-themes-2026-light-json`), não o Dark Modern usado na 04_17. Toda medida geométrica independe do tema; cores não são registradas aqui (regra: sem hex, tokens no `theme.css`).
- O vídeo de referência **não está disponível** neste ambiente. Tudo que só o vídeo mostraria está marcado **"não medido — validar na homologação"**.
- No web, a Activity Bar carrega o **menubar compacto (☰) de 35 px** acima dos ícones; por isso o 1º ícone começa em y = topo + 35. O shell não tem esse menu — os ícones começam no topo (0).

## 1. Activity Bar

| Item | Medido no 8080 | Nota |
|---|---|---|
| Largura | **48 px** | `.part.activitybar` |
| Altura | 100 % da região (743 px em 800 de viewport; titlebar 35 + statusbar 22) | |
| Ícone (item) | **48 × 48 px**, codicon **24 px**, `padding: 3px` | `li.action-item > a.action-label` |
| Espaçamento entre ícones | **0** (empilhados: y 70, 118, 166, 214, 262) | |
| Indicador de ativo | `::before` do `.active-item-indicator`, **border 2 px** no lado **oposto à Side Bar** (esquerda: `border-left`, `left:0`; direita: `border-left` com `left:46px` = encosta na borda externa) | ver §4 |
| Ativo | `li.checked[aria-selected=true][aria-expanded=true]`, cor = token `activityBar.foreground` | |
| Inativo | cor = `activityBar.inactiveForeground` | |
| Hover | cor passa a `activityBar.foreground`, sem fundo | medido |
| Foco (teclado) | `outline: none`; indicador `::before` 2 px com `focusBorder` | medido |
| Borda | 1 px `activityBar.border`… no lado voltado para o editor: `border-right` quando à esquerda, **`border-left` quando à direita** | `::before` |
| Badge | `top:24px; right:8px; 9 px; altura/line-height 16 px; min-width 8 px; padding 0 4px; radius 20px` | regra CSS medida com badge injetado |
| Com 1/2/3 ícones | layout não muda (lista vertical, sem centralização) | no 8080 há 5; o shell terá 3 |
| Clique no ativo | fecha a Side Bar; `checked`/`aria-selected` caem para `false` em todos, **mas o `::before` de 2 px permanece** no último ativo | print 02 |
| Clique em outro | troca a view mantendo a largura da Side Bar (300 → 300) | print 03/04 |
| Menu de contexto | itens reais: Configure Keybinding, Hide '…', Hide Badge, Move To, Menu, (lista de views), Accounts, Activity Bar Position, Activity Bar Size, **Move Primary Side Bar Right/Left** | print 08 — fora do escopo 5.1 |

## 2. Side Bar

| Item | Medido no 8080 | Nota |
|---|---|---|
| Largura padrão | **300 px** em 1280 (regra `min(300, largura/4)` já documentada na 04_17) | |
| Largura mínima | arrastar abaixo do mínimo **fecha** a Side Bar (snap-to-close; observado w=0). Mínimo real 170 px vem da 04_17 | |
| Largura máxima | **1012 px** em 1280 = tudo menos Activity Bar 48 e **editor mínimo 220 px** | não há teto fixo; teto = editor.minWidth |
| Duplo clique no sash | volta para a largura padrão (352 → 300) | |
| Cabeçalho `.title` | **35 px**, `display:flex`; `h2` 11 px, peso 400, **uppercase**, line-height 35, padding-left **8 px** | |
| Ações do cabeçalho | `Views and More Actions...` (o "...") 22×22, ícone 16 px, `margin-right 4px`, gap externo 8 px | |
| Fundo | `sideBar.background`; borda 1 px `sideBar.border` no lado do editor | |
| Cabeçalhos de seção (`.pane-header`) | **22 px**, 11 px, peso 700, uppercase, `aria-expanded` | agente_window / OUTLINE / TIMELINE (colapsadas) |
| Sash | `.monaco-sash.vertical.primary-sidebar-sash`, **4 px** (`--vscode-sash-size: 4px`, hover-size 4px), `cursor: ew-resize`, `::before` fica com `focusBorder` no hover (transição 0.1 s **só de cor**, nunca de largura); posicionado **2 px para dentro do editor e 2 px para dentro da Side Bar**, centrado na fronteira | |
| Menu de contexto do título | Open Editors, Folders, Outline, Timeline, Activity Bar Position, Move Primary Side Bar Right, Hide Primary Side Bar | fora do escopo 5.1 |

## 3. Alternância e estados

| Estado | Medido | Print |
|---|---|---|
| Inicial (Explorer aberto) | AB 0–48, SB 48–348, editor 348→ | 01 |
| Side Bar fechada | `.part.sidebar` fica **w=0/h=0 mas `display:block`** (o grid a esconde; não é `display:none`); editor ocupa 48→1280; Activity Bar inalterada | 02 |
| Reabrir clicando no mesmo ícone | volta com **a mesma largura** (300) e o item volta a `checked/aria-expanded=true` | |
| Ctrl+B | mesmo comportamento fecha/abre com a mesma largura | |
| Trocar Explorer → Search → SCM | título muda (`Search`, `Source Control`), largura mantida | 03, 04 |
| Painel (terminal) aberto, Ctrl+J | painel **só sob o editor** (x = 348, largura = editor), Side Bar e Activity Bar mantêm altura total; abas do painel 35 px, 11 px uppercase | 05 |
| Painel maximizado | **medido pela auditoria externa `05_02 §7`** (Restricted Mode contornado com `security.workspace.trust.enabled: false` temporário): `x=348 y=35 w=752 h=843`, **mantém Side Bar e Activity Bar**. (Nesta sessão o comando não surtiu efeito — print 06 idêntico ao 05.) | 06 · `05_02` |
| Editor group maximizado | **não medido** — sem editor aberto o comando é no-op (print 07). Validar na homologação. | 07 |

## 4. Side Bar à **direita** (estado alvo do docs_24)

Obtido com "Move Primary Side Bar Right" (setting `workbench.sideBar.location`), depois **revertido para esquerda** para não deixar o 8080 alterado.

| Item | Medido |
|---|---|
| Ordem horizontal | [Secondary Side Bar 0–300, se aberta] · editor 300–932 · **Side Bar 932–1232** · **Activity Bar 1232–1280** |
| Classes | `.part.activitybar.right.bordered`, `.part.sidebar.right` (trocam de `left` para `right`) |
| Borda da Activity Bar | passa para `border-left: 1px` (`::before`), `border-right: 0` |
| Borda da Side Bar | passa para `border-left: 1px`, `border-right: 0` |
| Indicador de ativo | continua `border-left 2px`, mas com `left: 46px` → fica na **borda externa direita** da tirinha |
| Badge | inalterado (`top 24px; right 8px`) |
| Sash | mesma classe, 4 px, em **x = SideBar.x − 2** (centrado na fronteira editor/Side Bar) |
| Título | padding-left 8 px e gap direito 8 px inalterados |
| Painel (terminal) com Side Bar à direita | painel fica **sob o editor à esquerda** (300–932), Side Bar e Activity Bar à direita mantêm altura total | print 10 |
| Side Bar fechada à direita | Activity Bar permanece em 1232–1280; editor e painel se expandem até 1232 | print 11 |

## 5. Mapa para tokens já existentes em `theme.css`

Existem: `sideBar.*`, `focusBorder`, `icon-foreground`, `badge.*`. **Faltam**: `activityBar.background/foreground/inactiveForeground/border/activeBorder`, `activityBarBadge.*`, `sideBarSectionHeader.*` (verificar), `sash.hoverBorder`. Regra de fallback encadeado já usada na FATIA-04 se aplica.
