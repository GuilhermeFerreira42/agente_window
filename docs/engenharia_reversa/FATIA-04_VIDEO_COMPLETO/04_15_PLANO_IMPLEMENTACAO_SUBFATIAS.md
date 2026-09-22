# 04_15 — PLANO DE IMPLEMENTAÇÃO POR SUB-FATIAS (FATIA-04 / FASE 4)

> **REV 2026-09-20 (LEGO) — replanejado após raspagem confirmada.** A tabela de 2026-09-16 (ordem 4.1→4.9 original) permanece como registro histórico no final (§10).
> **Checkouts confirmados:** `code-server` **`8a7bf87a`** + `microsoft/vscode` (submódulo `lib/vscode`) **`7debcd0e`** em `/home/user/.cache/code-server/` — ver mapa arquivo:linha em `04_11`.
> **Contratos congelados:** `04_10` (REV-LEGO, 2026-09-20) — `contract.ts` do módulo + 4 adapters + garantia de fronteira do `App.tsx`.
> **Base de execução (Casa Nova):** `platform/apps/workbench-v2/` (porta 5174, Single Port). **Módulo alvo:** `platform/apps/workbench-v2/src/modules/explorer-search/` (LEGO: Explorer + Search + Editor-anexo = **um único módulo lateral**).
> **Regra de ouro:** a IA executora **não decide arquitetura** — executa este plano. Dúvida → parar e perguntar (`docs/06`).

---

## 0. Regras invioláveis (valem para TODAS as sub-fatias)

1. **Nunca** tocar nos blindados: `src/components/terminal/**` (VSCodeTerminal, TerminalGroup, SplitSash, ShellPicker, TerminalActionBar, TerminalView, TerminalInstanceTabs), `src/hooks/useTerminalTheme.ts`, `src/styles/terminal-vscode.css`, `vite-plugin-pty.ts`, `singlePort.ts`, `platform/services/pty-server/**`, e2e `sessao_11_terminal_pty_real.spec.ts` e `sessao_11_terminal_interactive_v2.spec.ts` (🔴 `docs/18` — aplicável à Casa Nova por analogia direta: terminal V2 homologado 3/3 + 6/6).
2. **Nunca** remover WebSocket PTY, listeners `resize`/`ResizeObserver`/`MutationObserver` de tema, nem o endpoint `/api/ports`.
3. `vite.config.ts` e `server.mjs` recebem **apenas montagem aditiva** do plugin/handler FS (Q7) — zero alteração no wiring PTY existente.
4. `App.tsx` importa **um único caminho** do módulo: `./modules/explorer-search/index.js` (barrel = contrato). Teste de fronteira roda em toda sub-fatia (§3, item FT).
5. O módulo **não importa** nada de `src/components/`, `src/domain/`, `src/hooks/`, `src/providers/` do shell (fronteira LEGO). `domain/*` é **referência de comportamento** apenas (`04_11` §12).
6. Todo I/O passa por `deps.fs` (`FileSystemPort`); todo comando por `deps.menus`; todo menu visual por `deps.contextMenu`. `any` proibido; `fs` direto em componente proibido.
7. **Zero cor hardcoded** nos módulos novos: apenas tokens `--vscode-*` (grep `#rrggbb`/`rgb(` no CSS do módulo = 0).
8. Recolher/ocultar qualquer superfície = `display: visible ? 'contents' : 'none'` — **nunca** desmontar (espelho da Regra 10 do `docs/18`).
9. Nada de `position: fixed` cobrindo shell/sidebars/statusbar.
10. **Q9 — Imutabilidade de UX:** o transplante não muda nada do documentado em `04_00`–`04_09`. Toda divergência visual/comportamental vs. vídeo = bug a corrigir (loop §5), nunca "variação aceita".
11. Ordem obrigatória: **4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.9** (4.8 = FUTURO, fora do ciclo atual — Q8). Cada sub-fatia só começa com a anterior validada.
12. Nenhuma sub-fatia é concluída sem as evidências do §7 (DoD) — incluindo a anti-regressão do terminal.

---

## 1. Por que esta ordem (decisão Q8 — usuário, 2026-09-20)

```mermaid
flowchart LR
  A[4.1 Congelar contratos] --> B[4.2 ExplorerNode/core]
  B --> C[4.3 Adapter FS: backend+watcher]
  C --> D[4.4 Árvore + DnD + upload/download]
  D --> E[4.5 Menu de contexto]
  C --> F[4.6 Search + área do anexo]
  D --> F
  F --> G[4.7 Editor anexo (abas de código)]
  E --> G
  G --> H[4.9 Integração + validação de isolamento]
  D --> H
  I[4.8 Browser + IA — FUTURO]:::future
  classDef future stroke-dasharray: 5 5,color:#888
```

- **4.1 primeiro (congelar contratos):** sem `contract.ts` aprovado não existe fronteira para transplantar — é a peça de encaixe LEGO.
- **4.2 antes da UI:** o core (`ExplorerModel`/`ExplorerService`/`dndPolicy`/`when`) é lógica pura testável sem DOM — o mesmo princípio `10F` (UI não nasce com estado autoritativo próprio).
- **4.3 antes de árvore/menu/search:** sem `FileSystemPort` real (backend + watcher) não há árvore, nem upload, nem search.
- **4.4 (árvore + DnD juntos):** upload do SO e DnD interno são a mesma superfície (a árvore) — o vídeo os mostra acoplados.
- **4.6 Search antes de 4.7 editor:** decisão do usuário; o anexo é introduzido em 4.6 **como área do anexo** (sash 6 px, largura persistida, recolhimento sem desmontar) hospedando a aba Search — e 4.7 acrescenta as abas de código no mesmo anexo. Assim a mecânica do anexo (A5.2/A5.3/A5.7) já é validada antes do editor.
- **4.9 por último:** eventos transversais, persistência versionada, checklist A+B completos e **prova de isolamento** (quebra do módulo não derruba o terminal).

---

## 2. Tabela resumo das sub-fatias

| # | Sub-fatia | Arquivos-criados (principais) | Contrato | Validação principal | Anti-regressão |
|---|---|---|---|---|---|
| **4.1** | Congelar contratos + esqueleto do módulo | `modules/explorer-search/{contract.ts,index.ts,core/constants.ts,__tests__/frontier.test.ts}` | `04_10` §1 | typecheck + teste de fronteira | `npm test` + 6/6 + 3/3 |
| **4.2** | ExplorerNode (core puro) | `core/explorerModel.ts`, `core/explorerService.ts`, `core/dndPolicy.ts`, `core/menus/when.ts` + testes | `IExplorerSearchApi` | unit com fs fake (100% do core) | idem |
| **4.3** | Adapter FS (backend Node + watcher) | `server/fs/{index,fsHost,watcher}.ts`, `vite-plugin-fs.ts`, `core/fs/browserFsPort.ts`, `core/watchClient.ts` | `FileSystemPort` | VAL-FS-01/02 + watcher + probe `/fs/*` | **obrigatória** (toca boot) |
| **4.4** | Árvore + DnD + upload/download + seções | `ui/{ExplorerView,ExplorerHeader,ExplorerTree,OpenEditorsSection,TimelineSection,OutlineSection,ConflictDialog}.tsx`, `ui/explorer.css`, `core/transfer/{upload,download}.ts` + `e2e/sessao_12_explorer.spec.ts` (parte 1) | `IExplorerSearchApi` + transfer | VAL-EXP-02/04/06 + A1.x + A2.x + A4.x | idem |
| **4.5** | Menu de contexto completo | `core/menus/explorerMenus.ts` + `e2e/sessao_12_explorer.spec.ts` (parte 2) | `CommandRegistry` (adapter) | VAL-EXP-08 + matriz `04_03 §2` | idem |
| **4.6** | Search na sessão + área do anexo | `core/search/{queryBuilder,model,replace,searchService}.ts`, `server/fs/searchEngine.ts`, `ui/{AttachArea,SearchPanel}.tsx`, `ui/attach.css` + `e2e/sessao_14_search.spec.ts` | `ISearchApi` | VAL-EXP-15 + A6.1–A6.3/A6.5/A6.6 + A5.2/A5.3/A5.7 | idem |
| **4.7** | Editor anexo (abas de código) | `core/editor/editorService.ts`, `ui/{EditorTabs,CodeEditorPane}.tsx` + `e2e/sessao_13_editor_anexo.spec.ts` | `IEditorAttachApi` (docs/04 §7) | VAL-EXP-11/12/13/14 + A5.1–A5.7 + A6.4 | idem |
| **4.8** | Browser + IA — **FUTURO** | — | `04_07` §3 (preservado) | — | — |
| **4.9** | Integração final + isolamento | eventos transversais + persistência versionada + `e2e/sessao_16_isolamento.spec.ts` | todos | checklist A + B completos + DoD §7 | **suíte total** |

**Pasta física do módulo (criada na 4.1, com aprovação explícita do usuário):**
```text
platform/apps/workbench-v2/src/modules/explorer-search/
├─ contract.ts          # fronteira única (04_10 §1)
├─ index.ts             # barrel: só re-exporta contract + factory
├─ core/
│  ├─ explorerModel.ts  # port: ExplorerModel/ExplorerItem (04_11 §11-A)
│  ├─ explorerService.ts# port: ExplorerService (expand/collapse/select/sort/reveal/operações)
│  ├─ treeState.ts      # lazy loading (port ExplorerDataSource)
│  ├─ dndPolicy.ts      # decisão DnD pura (port explorerViewer 1571–2098)
│  ├─ editor/           # 4.7: editorService (abas por sessão, dirty, save, reveal)
│  ├─ menus/            # when.ts + explorerMenus.ts (port 478–680)
│  ├─ search/           # queryBuilder/model/replace (port) + searchService (debounce)
│  ├─ transfer/         # upload.ts / download.ts (port fileImportExport)
│  ├─ fs/               # browserFsPort.ts (fetch /fs/*)
│  ├─ watchClient.ts    # WS /fs/watch → fs.changed
│  └─ constants.ts      # IDs, tokens de contexto, excludes padrão
├─ ui/
│  ├─ ExplorerView.tsx  ExplorerHeader.tsx  ExplorerTree.tsx
│  ├─ OpenEditorsSection.tsx  TimelineSection.tsx  OutlineSection.tsx
│  ├─ AttachArea.tsx  SearchPanel.tsx  EditorTabs.tsx  CodeEditorPane.tsx
│  ├─ ConflictDialog.tsx
│  └─ explorer.css  attach.css         # só tokens --vscode-*
└─ __tests__/           # frontier.test.ts + testes de core/ui
```

---

## 3. Detalhamento por sub-fatia

### 4.1 — Congelar contratos + esqueleto do módulo
- **Objetivo:** materializar o `contract.ts` aprovado (`04_10` §1) e garantir a fronteira antes de qualquer linha de lógica.
- **Cria:** `contract.ts` (exatamente o do `04_10`), `index.ts` (barrel de tipos + assinatura `createExplorerSearchModule`), `core/constants.ts` (ids, context keys, excludes padrão), `__tests__/frontier.test.ts` (regra FT: lê `App.tsx` e assevera que o único import do módulo — quando existir — é o barrel).
- **Altera:** nada (nenhum wiring ainda).
- **Intocáveis:** todo o repositório além da nova pasta.
- **DoD:** `npm run typecheck` 0 erros; `frontier.test.ts` verde; contrato byte-a-byte compatível com `04_10` (review); zero DOM/`fs`/import externo no módulo.
- **Validação anti-regressão:** `npm test` (156 suites + novo) + `npx playwright test sessao_11_terminal_pty_real` (6/6) + `npx playwright test sessao_11_terminal_interactive_v2` (3/3) — fumaça, pois nada mudou em runtime.

### 4.2 — ExplorerNode (core puro, sem DOM)
- **Objetivo:** portar o modelo e o serviço do Explorer como lógica pura.
- **Cria:** `core/explorerModel.ts` (port de `common/explorerModel.ts:26/89` — árvore, expanded, seleção, roots, `findClosest`, eventos), `core/explorerService.ts` (port de `browser/explorerService.ts:34` — `sortOrderConfiguration :153`, `findClosest :240`, `findClosestRoot :244`, `select :297`, `refresh :342` + operações create/rename/move/delete/cut/copy/paste orquestrando `deps.fs`; Q3: criar-no-pai), `core/treeState.ts` (lazy: 1 `list` por pasta expandida; re-expand não relê disco — A2.1), `core/dndPolicy.ts` (decisão pura portada de `explorerViewer.ts:1601/1812–1830/1836` — move/copy/nada, `Alt` copia, `Esc` cancela, drop externo→upload), `core/menus/when.ts` (evaluator `! && || === !==` + tests).
- **Altera:** `index.ts` (factory com core real; `mount()` ainda assina "not implemented" — App não chama).
- **Intocáveis:** `src/App.tsx`, `src/components/**`, `src/domain/**`.
- **DoD:** 100% do core com testes unit (fs fake): expand/collapse, seleção multi, reveal (ancestrais), sort (name/type/modified), cut/copy/paste (incl. colisão), create-no-pai (Q3), `when` (tabela-verdade completa), `dndPolicy` (matriz de casos). `tsc` 0 erros. Nenhum import de React/DOM/`fs` no core.
- **Anti-regressão:** idem 4.1.

### 4.3 — Adapter FS (backend Node + watcher + transportes)
- **Objetivo:** `FileSystemPort` real no Single Port (Q7), sem tocar no PTY.
- **Cria:** `server/fs/fsHost.ts` (I/O real: `list/readFile/readFileBinary/writeFile(atomic temp+rename + fila por uri + etag modified-since, port `fileService.ts:383/536`)/stat/createFile/createFolder/copy/move/remove; **path traversal guard** contra `workspaceRoot` — referência `diskFileSystemProviderClient.ts:79–250`), `server/fs/watcher.ts` (watch recursivo somente raiz+expandidos; coalescência 300 ms, port `watcher.ts:274/378` + `nodejsWatcher.ts:108`), `server/fs/index.ts` (handlers HTTP/WS: `GET /fs/list|read|download`, `POST /fs/write|stat|mkdir|delete|copy|rename|upload`, `WS /fs/watch`), `vite-plugin-fs.ts` (plugin dev que monta os handlers no Vite), `core/fs/browserFsPort.ts` (adapter browser: `fetch` + base64 para binário + chunked upload), `core/watchClient.ts` (WS `/fs/watch` → evento `fs.changed` do contrato).
- **Altera (aditivo, mínimo):** `vite.config.ts` (+ `fsPlugin()`), `server.mjs` (montagem do handler no preview).
- **Intocáveis:** `vite-plugin-pty.ts`, `singlePort.ts`, `platform/services/pty-server/**`, todo terminal, `src/**`.
- **DoD:** integração Node (tmp dir): **VAL-FS-01** (save atômico + persistido), **VAL-FS-02** (N escritas concorrentes na mesma uri → sem corrupção, ordem preservado), traversal (`../` → 403), binário íntegro por hash; watcher: criar/rename/remover no disco → `fs.changed` em <500 ms; probe: `curl` de cada endpoint (`/fs/list` etc.) 200; server dev sobe em 5174 com PTY intacto.
- **Anti-regressão (crítica — toca o boot):** `sessao_11_terminal_pty_real` 6/6 + `sessao_11_terminal_interactive_v2` 3/3 + `curl :5174` = 200 + WS `/pty` `opened`.

### 4.4 — Árvore + DnD + upload/download + 3 seções (UI Explorer)
- **Objetivo:** sidebar visual do vídeo — header 5 botões, árvore lazy 22 px, seções, DnD interno + upload do SO + download.
- **Cria:** `ui/ExplorerView.tsx` (root do mount: header + árvore + seções), `ui/ExplorerHeader.tsx` (5 botões: new-file, new-folder, refresh, collapse-all, overflow — tooltips/aria do `04_01`; ações → `deps.menus.execute`), `ui/ExplorerTree.tsx` (lazy 22 px; ícones lucide; estados hover/ativo/drop; input inline create/rename; DnD interno via `dndPolicy`; drop do OS via `DataTransferItem.webkitGetAsEntry()` recursivo — port `fileImportExport.ts:134/205/315`), `ui/OpenEditorsSection.tsx` (estado vazio "Nenhum editor aberto" — A2.4), `ui/TimelineSection.tsx` (reage à seleção — mínima: eventos `fs.changed`/operações), `ui/OutlineSection.tsx` (reage ao editor ativo — mínima: presentes + reagem; provider completo de símbolos = evolução futura), `ui/ConflictDialog.tsx` (Replace/Skip/Cancel — A4.3), `core/transfer/upload.ts` + `core/transfer/download.ts` (port `fileImportExport.ts` — progresso, cancelamento sem parcial, streaming, folder com estrutura relativa, File System Access API + fallback blob — A4.5–A4.7), `ui/explorer.css` (tokens: `--vscode-sideBar-background`, `--vscode-list-activeSelectionBackground`, `--vscode-list-hoverBackground`, `--vscode-focusBorder`, `--vscode-list-dropBackground`; linha 22 px), `e2e/sessao_12_explorer.spec.ts` (parte 1).
- **Altera:** `App.tsx` — **1º wiring** (cria o módulo com deps reais: `browserFsPort`, `commandRegistry` do shell, `contextMenu` host adaptado ao `ContextMenu` do shell, `workspaceRoot`; `mount` no slot da sidebar; `onEvent` → logs/estado de shell). A consumption de `explorer.fileOpened` por editor entra só na 4.7 (2º wiring aditivo).
- **Intocáveis:** terminal, `domain/*`, `EditorArea.tsx` (legado central intacto — Q1), `styles/terminal-vscode.css`.
- **DoD:** VAL-EXP-02 (abrir arquivo emite `fileOpened` + árvore reage), VAL-EXP-04 (criar arquivo/pasta), VAL-EXP-06 (estado vazio), A1.1–A1.5, A2.1–A2.6, A4.1–A4.8 (incl. upload de pasta com 20 arquivos, cancelamento sem parcial, download íntegro por hash, fallback blob), grep hardcode = 0, fronteira (FT).
- **Anti-regressão:** idem padrão (6/6 + 3/3) + teste de que a sidebar não afeta `.right-section` (Regra 6/13 do `docs/18`).

### 4.5 — Menu de contexto completo
- **Objetivo:** menu do vídeo com grupos/ordem/`when` exatos, habilitação por context keys.
- **Cria:** `core/menus/explorerMenus.ts` — tabela declarativa portada de `fileActions.contribution.ts:478–680` (mantendo grupos e ordem; **Download `569–585`** e **Upload `586–602`** inclusos; labels PT-BR do `04_01`; `when` por context key; itens fora de escopo marcados no `04_11 §11-C` **não** entram: Add/Remove Folder, Compare, Open With), registro/unregistro via `deps.menus` no mount/dispose; publicações de context key em cada `selectionChanged`/operação (`explorerResourceIsFolder`, `explorerResourceIsRoot`, `explorerResourceParentReadOnly`, `resourceCopied`, `resourceCut`, `multiSelectionActive`, `explorerViewletFocus`).
- **Altera:** `App.tsx` (dep `contextMenu` já provém do 4.4 — aqui só se valida).
- **Intocáveis:** idem + `components/ContextMenu.tsx` do shell (o módulo consome via adapter, não edita).
- **DoD:** VAL-EXP-08; **matriz de habilitação do `04_03 §2` testada item a item** (unit: cada item × contexto); teclado (setas/Enter/Esc/foco retornado à árvore), aria, zero lógica inline (o menu só executa `deps.menus.execute(id)`); A3.1–A3.5.
- **Anti-regressão:** idem padrão.

### 4.6 — Search na sessão + introdução da área do anexo
- **Objetivo:** busca local à sessão (debounce, cancel, include/exclude, replace) e a **área do anexo** (sash 6 px, largura persistida, recolhimento sem desmontar) hospedando a aba Search.
- **Cria:** `server/fs/searchEngine.ts` (walker Node + regex; excludes padrão congelados `04_10 §2.3`; `maxResults` 2000/500 → `truncated`; progresso), endpoint `POST /fs/search` (aditivo em `server/fs/index.ts`), `core/search/queryBuilder.ts` (port `queryBuilder.ts:106`), `core/search/model.ts` (port `searchTreeModel/*` — agrupamento pasta→arquivo→match + contagens), `core/search/replace.ts` (substituição via `deps.fs.writeFile(atomic)` + contagem), `core/search/searchService.ts` (**debounce 250 ms; última busca vence** — token de cancelamento; eventos `search.started/progress/finished/cancelled`), `ui/AttachArea.tsx` (sash **6 px** `col-resize`; largura em CSS var local `--attach-width` clamp 280–1200 px / 25–75%, padrão `--terminal-height` (Regra 1, `docs/18`); **recolher = `display: contents/none`, 0 unmounts**; largura+visibilidade persistidas), `ui/SearchPanel.tsx` (aba do anexo: input + toggles `Aa`/`ab`/`.*` — port `searchFindInput.ts:18`/`searchWidget.ts:115`; campos include/exclude; lista de resultados por pasta com preview; estados vazios/truncado), `ui/attach.css`, `e2e/sessao_14_search.spec.ts`.
- **Altera:** `App.tsx` (monta `AttachArea` à direita da árvore + aba Search), `server/fs/index.ts` (+`/fs/search`).
- **Intocáveis:** terminal, `vite-plugin-pty.ts`, etc.
- **DoD:** VAL-EXP-15; A6.1 (widget no anexo, não na sidebar), A6.2 (debounce + cancel — busca anterior não vaza), A6.3 (include/exclude; `node_modules` ignorado), A6.5 (vazio), A6.6 (replace atômico + contagem); **A5.2** (sash 6 px + persistência pós-reload), **A5.3** (recolher sem desmontar — teste de 0 unmounts), **A5.7** (sem `position: fixed` — CSS computado); A6.4 **parcial** (clique em resultado emite `fileOpened` com uri+linha corretos — validação visual completa na 4.7).
- **Anti-regressão:** idem padrão.

### 4.7 — Editor anexo (abas de código por sessão)
- **Objetivo:** abrir arquivos no anexo (não no centro!), abas **por sessão**, salvar atômico, reveal com linha, recolher quando a última aba fecha.
- **Cria:** `core/editor/editorService.ts` (abas por `sessionId`; dirty; `save` via `deps.fs.writeFile(atomic)`; `reveal(uri, line)`; `close`/`closeAll` → **recolhe o anexo** (`setVisible(false)` sem desmontar — espelho Regra 10); estado sobrevive ao recolhimento (scroll/cursor/undo — Monaco mantém modelo vivo)), `ui/EditorTabs.tsx` (abas com dirty dot, close X hover, menu Close Others), `ui/CodeEditorPane.tsx` (Monaco via `@monaco-editor/react` — já em dependências do pacote; tema por tokens `--vscode-*`), `e2e/sessao_13_editor_anexo.spec.ts`.
- **Altera:** `App.tsx` — **2º wiring** (aditivo): `explorer.fileOpened`/`search`-resultado → `module.attach.open({ uri, line, sessionId })`; evento `attach.closed` → layout.
- **Intocáveis:** `EditorArea.tsx`/área central do shell (Q1 — o anexo **não** ocupa o centro), terminal.
- **DoD:** A5.1 (abre no anexo à direita da árvore, **não** no centro), A5.2–A5.7 completos, A6.4 completa (resultado abre no anexo na linha correta), VAL-EXP-11/12/13/14 (incl. maximizar não cobre shell + `display:none` verificado no DOM), teste de **0 unmounts** ao recolher/reabrir (conteúdo/scroll/cursor intactos), Ctrl+S atômico + dirty limpo.
- **Anti-regressão:** idem padrão.

### 4.8 — Browser runtime + IA com acesso a HTML — **FUTURO (fora do ciclo atual)**
- **Decisão:** Q8 (usuário 2026-09-20) — mantém-se a orientação de 2026-09-18 (`04_00` §8: "Browser (4.8) fica para depois").
- **Preservado para reabertura:** contrato `BrowserPort`/`BrowserSessionService` (`04_10` §3), arquitetura screencast-CDP por sessão (`04_07` §2, Q2), mapa de tools (`04_07` §3.1 / `04_11` §9), critérios A7.1–A7.7 (`04_13`).
- **Critério de reentrada:** ciclo 4.1–4.7 + 4.9 homologado e registrado em `docs/12`/`docs/11`; nova autorização explícita do usuário.

### 4.9 — Integração final + validação de isolamento
- **Objetivo:** fechar eventos transversais, persistência versionada e provar o princípio LEGO (quebra isolada).
- **Cria:** `e2e/sessao_16_isolamento.spec.ts`; ajustes de persistência versionada (largura/visibilidade do anexo, sortOrder, seleção) reutilizando o padrão de snapshots da Casa Nova (`domain/layoutPersistence.ts` — referência, o módulo persiste **seu** estado via `PersistencePort`-like injetado); fechamento dos eventos: `fs.changed` → árvore + Open Editors + Timeline + Outline; `explorer.resourceRenamed/resourceDeleted` → abas do anexo (close/dirty coerente); `attach.closed` → layout.
- **Altera:** `App.tsx` (apenas amarração dos eventos transversais — ainda só contrato).
- **Intocáveis:** tudo do `docs/18`.
- **DoD (marco de integração — build completo permitido, RISK-03):**
  1. **Checklist A do `04_13` respondido item a item** (itens A7.x = "não testado — 4.8 FUTURO", com justificação);
  2. **Checklist B do `04_13` (14 itens anti-regressão) 100%**;
  3. `npm test` completo (156 + novas suites) verde; todas as specs novas (`sessao_12/13/14/16`) verdes; `sessao_11_terminal_pty_real` **6/6** + `sessao_11_terminal_interactive_v2` **3/3**;
  4. **Prova de isolamento (métrica LEGO):** E2E injeta falha no módulo (render quebrado do Explorer) e assevera terminal `data-pty-status="open"` + digitação/execução real intactas; teste de fronteira (FT) + grep de fronteira (nenhum import de terminal dentro do módulo; nenhum import do módulo fora de `App.tsx`);
  5. build de release (`tsc -b && vite build`) — **apenas neste marco**;
  6. registro em `docs/12` (entrada nova com evidências) e `docs/11` (status real por sub-fatia).

---

## 4. Protocolo de testes (inventário REAL da Casa Nova — verificado 2026-09-20)

### 4.1 Inventário verificado no checkout atual

| Conjunto | Quantidade real | Como rodar |
|---|---|---|
| Unit Vitest (Casa Nova) | **156** arquivos em `platform/apps/workbench-v2/src/__tests__/` (include `src/**/*.{test,spec}.{ts,tsx}` + thresholds de coverage) | `npm test` (no `platform/apps/workbench-v2/`) |
| E2E Playwright (Casa Nova) | **20** specs em `platform/apps/workbench-v2/e2e/` (baseURL `http://127.0.0.1:5174`) | `npx playwright test` |
| Anti-regressão blindada | `sessao_11_terminal_pty_real.spec.ts` (**6/6**) + `sessao_11_terminal_interactive_v2.spec.ts` (**3/3**) | `npx playwright test sessao_11_terminal_pty_real` / `…sessao_11_terminal_interactive_v2` |
| Testes do VS Code original (`lib/vscode/**/test/**`) | milhares | **NÃO RODAR** (referência apenas) |

### 4.2 Specs novos a criar (modelo: specs existentes `sessao_11*`)

| Spec | Cobre | Aceite |
|---|---|---|
| `e2e/sessao_12_explorer.spec.ts` | header 5 botões, árvore lazy 22 px, seções + vazios, criar/renomear/excluir inline, DnD/upload/download, menu de contexto + Download | A1.x, A2.x, A3.x, A4.x |
| `e2e/sessao_13_editor_anexo.spec.ts` | abre no anexo (não centro), sash 6 px + persistência, recolhe sem desmontar, reabre intacto, save atômico, maximizar não cobre shell | A5.x |
| `e2e/sessao_14_search.spec.ts` | busca na sessão, debounce/cancel, include/exclude, resultado→reveal, vazio, replace | A6.x |
| `e2e/sessao_16_isolamento.spec.ts` | fronteira + quebra isolada (terminal sobrevive à falha do módulo) | Q9/LEGO + `docs/18` |

### 4.3 Comandos do ciclo (por sub-fatia, nesta ordem)

```bash
cd /home/user/agente_window/platform/apps/workbench-v2

# 0) typecheck (sempre)
npm run typecheck                 # tsc -b --force

# 1) unit focado do subsistema alterado
npx vitest run src/modules/explorer-search/__tests__/<arquivo>.test.ts
#    (ou server/fs/__tests__/*.test.ts para o backend)

# 2) suíte unit completa (156 + novas)
npm test

# 3) E2E novo do subsistema
npx playwright test e2e/sessao_12_explorer.spec.ts   # (ou 13/14/16)

# 4) ANTI-REGRESSÃO obrigatória antes de fechar QUALQUER sub-fatia
npx playwright test sessao_11_terminal_pty_real          # 6/6
npx playwright test sessao_11_terminal_interactive_v2    # 3/3
```

### 4.4 Ambiente (obrigatório antes de qualquer validação)

1. **Setup (uma vez, não é código):** `npm install` em `platform/` (o checkout atual **não** tem `node_modules`). Dependências novas do módulo: **nenhuma** (React, Monaco, xterm já existem; Monaco entra em uso na 4.7 sem nova dependência).
2. Dev: `npm run dev` no `platform/` (sobe pty + workbench-v2 na **5174**); conferir `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5174` = **200** e WS `/pty` `opened`.
3. E2E: `npx playwright test` com o dev server no ar (baseURL 5174).
4. Memória: não rodar Vite + Playwright + build simultaneamente sem necessidade; build completo **somente** na 4.9 (RISK-03).
5. Referências de transplant (`/home/user/.cache/code-server`, 1,9 GB) estão fora do snapshot do workspace por design — re-clone documentado se o ambiente resetar.

---

## 5. Loop de validação fechado (por sub-fatia, depois dos testes automatizados)

1. Abrir `http://localhost:5174` no navegador real.
2. Executar a **ação humana** da sub-fatia (clicar botão, expandir, arrastar sash, arrastar arquivo do SO, botão direito → Baixar, abrir arquivo, buscar, `Ctrl+S`).
3. Capturar **screenshot** + **console** (zero erros).
4. Comparar com `docs/referencias_visuais/` e os prints do vídeo (`FATIA-04_VIDEO_COMPLETO/prints/`, `CATALOGO.md` 29–41) — **Q9: qualquer divergência = bug**.
5. **Loop de autocorreção (sem perguntar ao usuário):** ler console → localizar a linha exata → corrigir → retestar até bater com a referência; se travar por limite de ambiente, registrar o bloqueio com honestidade (nunca inventar sucesso).
6. Casos de borda obrigatórios: 0 arquivos (vazio), 1 arquivo, pasta vazia, multi-seleção + Download, arquivo somente-leitura, arquivo binário, nome com espaço/acentos.

## 6. Gestão de ambiente e riscos

| Risco | Mitigação |
|---|---|
| **RISK-03** — OOM de build (Monaco) | typecheck + dev + E2E por sub-fatia; build completo só na 4.9 |
| **Fronteira (LEGO)** — acoplamento UI↔terminal ou app↔módulo | teste de fronteira (FT) + E2E de isolamento (4.9) + revisão da lista de imports em cada DoD |
| **Boot do Vite modificado (4.3)** | mudança estritamente aditiva (novo plugin); anti-regressão de PTY obrigatória no DoD 4.3 |
| `node_modules`/`.cache` resets do sandbox | `npm install` documentado (§4.4.1); re-clone do code-server documentado |
| RAM do ambiente | sequência serial dos processos (§4.4.4) |
| Drift de linhas do upstream | linhas do `04_11` verificadas no checkout pinado (`7debcd0e`); ao codar, reconfirmar por busca textual |

## 7. Definição de pronto (DoD) — evidências exigidas por sub-fatia (sem exceção)

1. lista de arquivos **criados/alterados** com caminho real;
2. `npm run typecheck` (**0 erros**);
3. saída dos testes focados (nomes + contagem);
4. resultado do E2E do subsistema (spec + passou/falhou);
5. **`sessao_11_terminal_pty_real` = 6/6** e **`sessao_11_terminal_interactive_v2` = 3/3** (anti-regressão);
6. verificação visual no navegador real (screenshot descrito; console limpo);
7. pendências, riscos e itens **não testados** explicitados (ex.: A6.4 parcial na 4.6; A7.x na 4.9).

> **Regra final:** percentuais só se o usuário pedir; conclusão só com evidência; desvio arquitetural → parar e perguntar (`docs/06`).

## 8. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Como o plano garante |
|---|---|
| **VISUAL** | Q9 (§0.10) + §5 (loop de fidelidade vs. prints/vídeo) + zero-hardcode (§0.7); cada sub-fatia declara o efeito visual (4.4 header/árvore 22 px/seções; 4.6 anexo+sash 6 px; 4.7 abas de código). |
| **COMPORTAMENTO** | §3 — objetivo/regras/"intocáveis" por sub-fatia; §1 — ordem com dependências reais; `04_11 §11` — o que é copiado/adaptado/descartado. |
| **EVENTO** | `contract.ts` (`04_10` §1, produtor único) + 4.3 (`fs.changed`) + 4.6 (`search.*`) + 4.9 (fechamento transversal: `fs.changed`→árvore/outline/timeline; rename/delete→abas). |
| **VALIDAÇÃO** | §4 (protocolo + inventário real 156/20) + §5 (loop fechado) + §7 (DoD com evidência) + `04_13` (checklists A+B). |

---

## 9. Registro de revisão

| Data | Revisão | Autor |
|---|---|---|
| 2026-09-16 | Plano original em 9 sub-fatias (ordem 4.1 FS → 4.9) | Arena Agent |
| 2026-09-20 | **REV-LEGO (vigente):** nova ordem por decisão do usuário (Q8: contratos → core → adapter FS → árvore+DnD → menu → Search → editor anexo → isolamento); 4.8 Browser = FUTURO; base real da Casa Nova (`workbench-v2`, 5174, 156 unit/20 e2e); Q7 (backend FS = novo plugin, sem tocar PTY); Q9 (imutabilidade de UX); fronteira do `App.tsx` (FT) + prova de isolamento na 4.9 | Arena Agent (a) — aprovado para congelamento, aguardando assinatura do usuário |

## 10. Registro histórico — plano original 2026-09-16 (substituído, mantido para rastreabilidade)

A ordem original era: `4.1 FileSystem ampliado → 4.2 ExplorerService → 4.3 UI Explorer → 4.4 Menu → 4.5 DnD/Upload/Download → 4.6 Editor anexo → 4.7 Search → 4.8 Browser → 4.9 Integração`. Diferenças para o plano vigente: (a) DnD uniu-se à árvore (4.4); (b) Search (4.6) precede o editor anexo (4.7); (c) o congelamento de contratos virou sub-fatia própria (4.1); (d) o core puro virou sub-fatia própria (4.2); (e) 4.8 fica FUTURO. A correspondência de conteúdo por objetivo está preservada nas seções §3 e no `04_11`.
