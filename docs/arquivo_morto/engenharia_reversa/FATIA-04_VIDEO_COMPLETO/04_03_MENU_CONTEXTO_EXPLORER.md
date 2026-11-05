# 04_03 — MENU DE CONTEXTO DO EXPLORER (COMPLETO)

> Requisito do vídeo: **3.1** — menu de contexto ao clicar com botão direito em arquivo/pasta, incluindo **Download**.
> Evidência principal: `[E-vscode]` `src/vs/workbench/contrib/files/browser/fileActions.contribution.ts` linhas **478–680** (registros em `MenuId.ExplorerContext`).

---

## 1. Estrutura real do menu (grupos e ordem)

O menu é montado por **grupos** com `order`. No VS Code main, o menu do Explorer contém exatamente:

| Grupo | order | Item | Comando | `when` (condição real) |
|---|---|---|---|---|
| `navigation` | 4 | **New File…** | `explorer.newFile` | `ExplorerFolderContext` (+ `precondition: ExplorerResourceWritableContext`) |
| `navigation` | 6 | **New Folder…** | `explorer.newFolder` | `ExplorerFolderContext` (+ writable) |
| `navigation` | 10 | Open to the Side | `openToSideCommand` | `!ExplorerFolderContext && ResourceContextKey.HasResource` |
| `navigation` | 20 | Open With… | `OPEN_WITH_EXPLORER_COMMAND_ID` | `!folder && ExplorerResourceAvailableEditorIdsContext` |
| `3_compare` | 20/30/30 | Compare with Selected / Select for Compare / Compare Selected | `COMPARE_RESOURCE_COMMAND_ID`, `SELECT_FOR_COMPARE_COMMAND_ID`, `COMPARE_SELECTED_COMMAND_ID` | varia por seleção dupla |
| `5_cutcopypaste` | 8 | **Cut** | `CUT_FILE_ID` | `!ExplorerRootContext && ExplorerResourceWritableContext` |
| `5_cutcopypaste` | 10 | **Copy** | `COPY_FILE_ID` | `!ExplorerRootContext` |
| `5_cutcopypaste` | 20 | **Paste** | `PASTE_FILE_ID` | `ExplorerFolderContext` (+ writable + `FileCopiedContext`) |
| `5b_importexport` | 10 | **Download…** | `explorer.download` (`DOWNLOAD_COMMAND_ID`) | ver §3 |
| `5b_importexport` | 20 | **Upload…** | `explorer.upload` (`UPLOAD_COMMAND_ID`) | `IsWeb && ExplorerFolderContext && ExplorerResourceWritableContext` |
| `6_copypath` | 10 | Copy Path | `copyPathCommand` | `ResourceContextKey.IsFileSystemResource` |
| `6_copypath` | 20 | Copy Relative Path | `copyRelativePathCommand` | idem |
| `2_workspace` | 10 | Add Folder to Workspace… | `ADD_ROOT_FOLDER_COMMAND_ID` | root + workspace multi-root |
| `2_workspace` | 30 | Remove Folder from Workspace | `REMOVE_ROOT_FOLDER_COMMAND_ID` | root + folder + multi-root |
| `7_modification` | 10 | **Rename…** | `RENAME_ID` | `!ExplorerRootContext` (+ writable) |
| `7_modification` | 20 | **Move to Trash** / *alt:* **Delete Permanently** | `MOVE_FILE_TO_TRASH_ID` / alt `DELETE_FILE_ID` | `!root && ExplorerResourceMoveableToTrash` (senão usa Delete Permanently) |

> Os grupos aparecem no menu com separadores automáticos. A ordem dos grupos no VS Code é: `navigation(1)` → `2_workspace` → `3_compare` → `5_cutcopypaste` → `5b_importexport` → `6_copypath` → `7_modification` — daí os prefixos numéricos no nome do grupo.

---

## 2. Estado de habilitação por tipo de nó (matriz prática)

| Item | Arquivo | Pasta | Raiz | Multi-seleção | Somente leitura |
|---|---|---|---|---|---|
| New File | ✔ (no pai) | ✔ | — | — | ✖ (bloqueado) |
| New Folder | ✔ (no pai) | ✔ | — | — | ✖ |
| Cut | ✔ | ✔ | ✖ | ✔ | ✖ |
| Copy | ✔ | ✔ | ✖ | ✔ | ✔ |
| Paste | — | ✔ | ✖ | — | ✖ |
| Download | ✔ | ✔* | ✖* | ✔ (vários) | ✔ |
| Upload | — | ✔ | ✖ | — | ✖ |
| Copy Path | ✔ | ✔ | ✔ | ✔ | ✔ |
| Rename | ✔ | ✔ | ✖ | — | ✖ |
| Delete/Move to Trash | ✔ | ✔ | ✖ | ✔ | ✖ |

`*` Download de pasta só é permitido quando o navegador suporta a File System Access API (`HasWebFileSystemAccess`); ver condição completa no §3.

---

## 3. Condição exata do item Download (evidência literal)

`[E-vscode]` `fileActions.contribution.ts:586-602`:

```ts
when: ContextKeyExpr.or(
  // native: for any remote resource
  ContextKeyExpr.and(IsWebContext.toNegated(), ResourceContextKey.Scheme.notEqualsTo(Schemas.file)),
  // web: for any files
  ContextKeyExpr.and(IsWebContext, ExplorerFolderContext.toNegated(), ExplorerRootContext.toNegated()),
  // web: for any folders if file system API support is provided
  ContextKeyExpr.and(IsWebContext, HasWebFileSystemAccess)
)
```

**Leitura para o AGENTE WINDOW (produto web):**
- arquivos: Download aparece **sempre** no web;
- pastas: Download aparece **somente** se `showDirectoryPicker`/File System Access estiver disponível (Chromium);
- raiz do workspace: nunca.

`[SPEC]` O vídeo pede Download como **diferencial**. Não é preciso inventar: o VS Code main já o implementa como `explorer.download` — nosso trabalho é expor o comando e a UI (item de menu + feedback de progresso), com o handler próprio (`04_10` §1.4).

---

## 4. Menu de contexto de “Editores Abertos” (seção do vídeo)

`[E-vscode]` `fileActions.contribution.ts:386-460` (`MenuId.OpenEditorsContext`):

| Grupo | Itens |
|---|---|
| `3_compare` | Compare with Saved, Compare with Selected, Select for Compare, Compare Selected |
| `4_close` | **Close**, **Close Others**, **Close Saved**, **Close All** |
| (framework) | Save / Save All quando há dirty |

`[SPEC]` O item **“Close All”** desta seção é o gatilho natural do **recolher do anexo lateral** descrito no vídeo (`04_05` §4): fechar a última aba da sessão colapsa o anexo.

---

## 5. Menu de contexto da aba de editor (relacionado)

`[E-vscode]` `MenuId.EditorTitleContext` / `EditorTabsBarContext` e `EmptyEditorGroupContext` incluem:
- **New Text File** (`NEW_UNTITLED_FILE_COMMAND_ID`), **Open File…** (`workbench.action.quickOpen`) — registrados no loop em `fileActions.contribution.ts:661-665`;
- Compare Selected, Close/Close Others/Close Saved/Close All;
- Split Right / Split Down (em `editorActions`).

`[SPEC]` Relevante para o anexo lateral: os mesmos itens devem existir no cabeçalho do anexo, trocando “Split” por “Fixar/Expandir anexo” quando o produto exigir.

---

## 6. Especificação visual do menu (para fidelidade)

| Propriedade | Valor |
|---|---|
| Fundo | `--vscode-menu-background` |
| Texto | `--vscode-menu-foreground` |
| Item em hover | `--vscode-menu-selectionBackground` / `-selectionForeground` |
| Borda | `--vscode-menu-border` |
| Separadores | `--vscode-menu-separatorBackground` |
| Atalhos à direita | `--vscode-menu-foreground` com opacity |
| Ícones | codicons opcionais por item (ex.: `codicon-trash` em Delete, `codicon-download` em Download) |
| Largura mínima | 200 px; altura da linha 22–24 px |
| Abertura | botão direito no nó; também pela tecla **Menu**/`Shift+F10` no item focado |
| Fechamento | `Esc`, clique fora, scroll, troca de foco |
| Submenu | “Open With…” abre submenu à direita (navegação por ←/→) |

`[REF-visual]` `terminal/09_terminal_menu_contexto_acoes.png` usa a mesma linguagem visual — reaproveitar o componente de menu já existente no projeto (legado `components/ContextMenu.tsx` — `[E-projeto]`).

---

## 7. Context keys necessárias (contrato de estado)

`[SPEC]` para o menu funcionar por `when`, o Explorer precisa publicar (via `CommandRegistry.setContext`):

| Context key | Tipo | Semântica |
|---|---|---|
| `explorerResourceIsFolder` | boolean | nó selecionado é pasta |
| `explorerResourceIsRoot` | boolean | nó é raiz do workspace |
| `explorerResourceWritable` | boolean | nó é gravável |
| `explorerResourceParentReadOnly` | boolean | pai é somente leitura |
| `explorerResourceMoveableToTrash` | boolean | suporta lixeira |
| `resourceCopied` (FileCopied) | boolean | há item na área de transferência interna |
| `filesExplorerFocus` | boolean | foco está na árvore |
| `multiSelect` | boolean | mais de um nó selecionado |

**Evidência do padrão** `[E-vscode]`: `ExplorerFolderContext`, `ExplorerRootContext`, `ExplorerResourceWritableContext`, `ExplorerResourceParentReadOnlyContext`, `FileCopiedContext`, `ExplorerResourceMoveableToTrash`, `WorkbenchListDoubleSelection` — todos usados nos `when` do §1.

---

## 8. Validação (checklist)

- [ ] Botão direito em **arquivo**: New File/New Folder visíveis **apenas** como “no pai” (comportamento VS Code) ou ocultos — decidir e documentar (ver `04_14` dúvida D3).
- [ ] Botão direito em **pasta**: todos os itens do §1 presentes, na ordem dos grupos.
- [ ] **Download** visível em arquivo; em pasta, só quando File System Access disponível.
- [ ] **Paste** desabilitado (“precondition”) até existir um Cut/Copy.
- [ ] **Rename/Delete** ausentes/desabilitados na raiz.
- [ ] Navegação por teclado no menu (↑/↓/←/→/Enter/Esc) funcional, com `aria` correto.
- [ ] `context menu` respeita o item **focado** e o **multi-seleção** (ação aplica a todos).
- [ ] E2E: `VAL-EXP-04` (novo arquivo), `VAL-EXP-07` (download), `VAL-EXP-08` (renomear/excluir).

---

## 9. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Onde está neste documento |
|---|---|
| **VISUAL** | §6 — especificação visual completa (tokens de menu, hover/selection, separadores, ícones por item, largura mínima, submenu, navegação por teclado). |
| **COMPORTAMENTO** | §1 (grupos/ordem/`when` reais), §2 (matriz de habilitação por tipo de nó), §3 (condição literal do item Download), §4 (menu dos Editores Abertos), §5 (menu da aba de editor). |
| **EVENTO** | §7 — context keys que o Explorer publica (`explorerResourceIsFolder`, `IsRoot`, `Writable`, `ParentReadOnly`, `MoveableToTrash`, `resourceCopied`, `multiSelect`) e o disparo por comando (nunca lógica inline). |
| **VALIDAÇÃO** | §8 — checklist item a item (presença/ordem/habilitação, Download em arquivo e pasta, Paste bloqueado sem clipboard, teclado e aria) + `VAL-EXP-04/07/08`. |
