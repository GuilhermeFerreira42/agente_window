# 04_01 — INVENTÁRIO VISUAL DO EXPLORER

> Requisitos do vídeo cobertos: **3.1 EXPLORER COMPLETO** (visual) e **3.5 FIDELIDADE**.
> Evidências: `[E-vscode]` arquivo:linha; tokens conforme `[REF-visual]`.

---

## 1. Hierarquia visual (de fora para dentro)

```text
window
└── workbench
    ├── activity bar            (rail 48px — --activitybar-width)
    │   └── ícone Explorer (Files) — ativo recebe borda/realce
    └── primary sidebar         (largura padrão ~300px, resizable por sash)
        ├── header (título da view container)          ← "EXPLORER"
        │   ├── título em caixa alta, letter-spacing leve, cor --vscode-sideBarTitle-foreground
        │   └── toolbar de ações (5 botões + overflow "...")
        └── corpo (scroll vertical)
            ├── seção "Open Editors"      (view id workbench.explorer.openEditorsView)
            ├── seção "Timeline"          (view id timeline)
            ├── seção "Outline"           (view id outline)
            └── view do Explorer          (view id workbench.explorer.fileView)
```

### 1.1 Evidências
- `[E-vscode]` id da view do explorer: `src/vs/workbench/contrib/files/common/files.ts:34` → `export const VIEW_ID = 'workbench.explorer.fileView';`
- `[E-vscode]` id de Editores Abertos: `.../files/browser/views/openEditorsView.ts:85` → `static readonly ID = 'workbench.explorer.openEditorsView';`
- `[E-vscode]` Outline: `.../contrib/outline/browser/outline.contribution.ts:43` → `'id': 'outline'`
- `[E-vscode]` Timeline: `.../contrib/timeline/browser/timeline.contribution.ts:47` → `id: 'timeline'`
- `[E-code-server]` / `[E-vscode]` Sidebar/Activity Bar: `workbench/browser/parts/sidebar/sidebarPart.ts`, `.../activitybar/activitybarPart.ts`
- `[E-projeto]` engenharia reversa `docs/engenharia_reversa/02_LEFT_SIDEBAR/02C_mapa_codigo.md` (hierarquia de classes `AbstractPaneCompositePart ← SidebarPart`)

---

## 2. Header do Explorer — os 5 botões do vídeo

| # | VISUAL (ícone codicon) | Tooltip / aria-label | Ordem | Ação (comando real) |
|---|---|---|---|---|
| 1 | `new-file` (arquivo+) | “New File...” | 10 | `workbench.files.action.createFileFromExplorer` → `explorer.newFile` |
| 2 | `new-folder` (pasta+) | “New Folder...” | 20 | `workbench.files.action.createFolderFromExplorer` → `explorer.newFolder` |
| 3 | `refresh` | “Refresh Explorer” | 30 | `workbench.files.action.refreshFilesExplorer` |
| 4 | `collapse-all` | “Collapse Folders in Explorer” | 40 | `workbench.files.action.collapseExplorerFolders` |
| 5 | `…` (overflow) | “More Actions...” | — | overflow padrão do `MenuId.ViewTitle` |

**Evidência completa** `[E-vscode]` `src/vs/workbench/contrib/files/browser/views/explorerView.ts:1107-1210`:
- `registerAction2` id `workbench.files.action.createFileFromExplorer`, `title: "New File..."`, `icon: Codicon.newFile`, `menu: { id: MenuId.ViewTitle, group: 'navigation', when: view == VIEW_ID, order: 10 }`, `precondition: CanCreateContext`;
- id `workbench.files.action.createFolderFromExplorer`, `Codicon.newFolder`, `order: 20`;
- id `workbench.files.action.refreshFilesExplorer`, `Codicon.refresh`, `order: 30`, `precondition: ExplorerFindProviderActive.negate()`;
- id `workbench.files.action.collapseExplorerFolders`, `Codicon.collapseAll`, `order: 40`.

**Regra de contexto (`CanCreateContext`)** `[E-vscode]` mesmo arquivo, linhas ~1101-1106:
- em **pasta**: permitido se `ExplorerResourceWritableContext` (pasta gravável);
- em **arquivo**: permitido se o **pai** não é read-only (`ExplorerResourceParentReadOnlyContext.toNegated()`).

`[SPEC]` No AGENTE WINDOW, o mesmo conjunto deve existir com os mesmos tooltips/aria-labels, e o botão de “Baixar” do menu de contexto **também** aparece no overflow quando houver múltipla seleção (ver `04_04` §3).

---

## 3. Árvore de arquivos — especificação visual

| Elemento | Valor | Evidência |
|---|---|---|
| Altura da linha | **22 px** | `[E-vscode]` `explorerViewer.ts:80` → `static readonly ITEM_HEIGHT = 22;` |
| Indentação por nível | ~8–10 px (chevron + ícone + label) | `[E-vscode]` `FilesRenderer` (`explorerViewer.ts:825`) |
| Chevron de expansão | `chevron-right` / `chevron-down`; em hover vira seta “discreta” | `[E-vscode]` `FilesRenderer` render |
| Ícone de pasta | `folder` / `folder-opened`; com *compressed folders* vira `folder` + sufixo `a/b/c` | `[E-vscode]` `ExplorerCompressionDelegate` (`explorerViewer.ts:2098`) |
| Ícone de arquivo | deriva do `FileKind`/`FileIconTheme` (no nosso caso: `file`, `file-code`, `markdown`, `json`, `github-action`, etc.) | `[E-vscode]` `FilesRenderer` |
| Nome comprimido (pasta de nível único) | label composta: `pasta/ subpasta/` na mesma linha | `[E-vscode]` `isCompressedFolderName(...)` importado em `explorerView.ts:28` |
| Seleção inativa | fundo `--vscode-list-inactiveSelectionBackground` | `[REF-visual]` `explorer/21_...png` |
| Foco/seleção ativa | fundo `--vscode-list-activeSelectionBackground`, texto `--vscode-list-activeSelectionForeground` | idem |
| Hover | fundo `--vscode-list-hoverBackground` | idem |
| Erro/decoração | badge com `--vscode-list-errorForeground` / `warningForeground` | `[E-vscode]` `explorerDecorationsProvider.ts` |
| Scrollbar | 10 px, `--vscode-scrollbarSlider-*` | padrão do workbench |
| Estado vazio | mensagem central + botões contextuais | `[E-vscode]` `views/emptyView.ts` |
| Destaque de busca (find widget in-view) | match destacado na label | `[E-vscode]` `ExplorerFindProvider` (referenciado em `explorerView.ts:28,1207`) |

### 3.1 Ordenação
`[E-vscode]` `explorerService.ts:155` → `sortOrder: this.config.sortOrder` — a ordenação (por nome, tipo, modificação) é **estado do serviço**, não do renderer. `[SPEC]` No nosso contrato, isso vira `ExplorerService.setSortOrder(...)` (`04_10` §2.3).

---

## 4. Seções do Explorer (as três do vídeo)

### 4.1 Editores Abertos (Open Editors)
- **VISUAL:** seção colapsável abaixo do header; uma linha por aba aberta, agrupada por grupo de editor; máximo inicial controlado por setting `explorer.openEditors.visible`; “Close All / Close Saved / Close Others” no header da seção.
- **Evidências:** `[E-vscode]` `views/openEditorsView.ts:85` (ID), `files.contribution.ts:421-436` (settings `explorer.openEditors.visible`, `minVisible`, `sortOrder`); ações de título em `openEditorsView.ts:943,979,1001,1025`.
- **COMPORTAMENTO:** lista reflete **abas vivas**; fechar aba remove a linha; clicar foca a aba; quando vazio mostra **“Nenhum editor aberto”** (estado exigido no vídeo).
- **EVENTO:** `editor.resourceOpened` / `editor.closed` → seção recomputa.
- **VALIDAÇÃO:** abrir 3 arquivos → 3 linhas; fechar todas → estado vazio com mensagem; E2E `VAL-EXP-06`.

### 4.2 Linha do Tempo (Timeline)
- **VISUAL:** seção colapsável; lista cronológica de eventos do recurso selecionado (ex.: commits/git), com agrupamento por dia.
- **Evidência:** `[E-vscode]` `contrib/timeline/browser/timeline.contribution.ts:47`.
- **COMPORTAMENTO:** responde à seleção do Explorer (item selecionado = sujeito da timeline); quando não há provedor → estado vazio “Nenhuma linha do tempo disponível”.
- **EVENTO:** `explorer.selectionChanged` → timeline troca de sujeito; `timeline.refresh`.
- **VALIDAÇÃO:** selecionar arquivo versionado → eventos listados; selecionar arquivo sem histórico → estado vazio.

### 4.3 Estrutura de Código (Outline)
- **VISUAL:** seção colapsável com árvore de símbolos do arquivo ativo, agrupada por tipo (classes/funções).
- **Evidência:** `[E-vscode]` `contrib/outline/browser/outline.contribution.ts:43` + `outlinePane.ts`.
- **COMPORTAMENTO:** segue o **editor ativo**; filtrar/sortar símbolos; clicar navega para o símbolo.
- **EVENTO:** `editor.activeChanged` → outline recalcula; `editor.revealRequested` ao clicar.
- **VALIDAÇÃO:** abrir arquivo TS → símbolos listados; clicar → cursor vai ao símbolo.

---

## 5. Tokens obrigatórios (zero hardcode)

| Elemento | Token |
|---|---|
| Fundo da sidebar | `--vscode-sideBar-background` |
| Título “EXPLORER” | `--vscode-sideBarTitle-foreground` |
| Seção header | `--vscode-sideBarSectionHeader-background` / `-foreground` |
| Borda entre sidebar e centro | `--vscode-sideBar-border` (ou `panel.border` conforme tema) |
| Item de árvore ativo | `--vscode-list-activeSelectionBackground` / `-Foreground` |
| Item inativo | `--vscode-list-inactiveSelectionBackground` |
| Hover | `--vscode-list-hoverBackground` |
| Foco | `--vscode-focusBorder` |
| Drag&drop alvo | `--vscode-list-dropBackground` |
| Badge de erro/aviso | `--vscode-list-errorForeground` / `--vscode-list-warningForeground` |
| Activity bar | `--vscode-activityBar-background`, `-foreground`, `-activeBorder` |

`[REF-visual]` `docs/referencias_visuais/TAXONOMIA.md` (categoria `explorer/`) — prints 07, 21, 24 são a base visual de referência; em conflito imagem × texto, prevalece o texto.

---

## 6. Validação visual (checklist)

- [ ] Header com **exatamente** os 5 alvos (4 ícones + overflow), tooltips idênticos aos do §2.
- [ ] Linha de árvore com 22 px e ícones corretos por tipo.
- [ ] Três seções presentes com estados vazios corretos, incluindo “Nenhum editor aberto”.
- [ ] Nenhuma cor hexadecimal hardcoded nos componentes do Explorer (grep `#` no CSS do módulo → 0 ocorrências de sistema).
- [ ] Aria-labels presentes em todos os botões (`role="button"`, `aria-label`).

---

## 7. Prints do vídeo de referência 8m35s (NOVO - 2026-09-18)

Esta seção foi adicionada após análise do vídeo `Gravar_2026_09_15_21_09_30_680.mp4` enviado pelo usuário.

### Novos prints essenciais para FATIA-04 (Explorer)

| Print | Timestamp vídeo | O que prova | RF relacionado |
|---|---|---|---|
| `explorer/29_fatia04_video_explorer_header_5_botoes.png` | 01:25 | Header com 5 alvos: Novo Arquivo, Nova Pasta, Atualizar, Colapsar, ... | RF-01 a RF-05 |
| `explorer/30_fatia04_video_menu_contexto_completo_baixar.png` | 02:30 | Menu contexto completo com **Baixar arquivo** | RF-12, RF-16 |
| `explorer/31_fatia04_video_editores_abertos_nenhum_editor.png` | 03:00 | Estado vazio "Nenhum editor aberto" | RF-09 |
| `explorer/32_fatia04_video_explorer_completo_sessao.png` | 03:15 | Visão completa sessão com docs, legacy, platform, test-results | RF-11, estrutura |
| `explorer/33_fatia04_video_drag_drop_download.png` | 02:05 | Drag & Drop do SO + Download | RF-17, RF-18 |
| `explorer/40_fatia04_video_menu_contexto_baixar_detalhe.png` | 07:30 | Detalhe Baixar para máquina local | RF-16 detalhado |

**Para Arena:** Usar estes 6 prints como fonte da verdade visual do Explorer. Eles substituem a necessidade de assistir o vídeo para implementar header, menu contexto e estados vazios.

[REF-video] = `docs/referencias_visuais/fatia04_video/` - coleção bruta de 15 prints do vídeo.
