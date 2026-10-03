# 05_03 — Arquitetura do Layout: auditoria do shell atual + alvo

## 1. Auditoria do shell atual (`platform/apps/workbench-v2/src/`, HEAD `2d1b126`) — verificado por grep em 2026-09-28
| Peça | Onde está hoje | Observação |
|---|---|---|
| Raiz | `App.tsx` (2 032 linhas) → `.agent-sessions-workbench` → `<Titlebar>` (l. 1847) → `.workbench-body` (l. 1866, `--sidebar-width`) | `App.tsx` é o shell; regra vigente: alterações só como **exceções autorizadas e mínimas** |
| Sidebar de sessões (esquerda) | `<SessionSidebar>` (l. 1867) | lista de sessões/chats — **não é** a Side Bar do VS Code; permanece |
| Região principal | `.main-region` (l. 1897) → `.main-surface` (l. 1900) | contém Chat (`<ChatPanel>` l. 1678 via função), `<EditorArea>` (l. 1766) e o Panel inferior |
| Editor central | `components/EditorArea.tsx` (672 linhas) | **intocável** (decisão vigente); recebe `searchSlot` (l. 1774) hoje |
| Painel inferior | `<TerminalPanel>` (l. 2003) + `.panel-resize-handle` (l. 1975) | Terminal **homologado, intocável** |
| Barra auxiliar direita ("Detalhes") | `components/AuxiliaryBar.tsx` (433 linhas) — `<AuxiliaryBar>` desktop (l. 2001) e mobile (l. 1951) | tem `attachSlot` (Editor Anexo, exceção da 4.7) e a coluna Files (Explorer real via módulo); classe `has-attach-slot` |
| Controle de layout | `domain/layoutController.ts` (`createLayoutController`, `managesAuxiliaryBar`) | decide desktop/mobile |
| Transição temporária Git | `shell/gitTransition.ts` (`useMockChangesTransition`, l. 81) | esconde a maquete "Changes N" da barra auxiliar; **remover na 5.3** (D2.38) |
| Módulo LEGO | `modules/explorer-search/` — `index.ts` (`mount/unmount`, `attachApiFor`), `contract.ts`, `core/**`, `server/**`, `ui/{ExplorerView.tsx, search/, attach/{…,changes/,diff/}, transfer/}` | **lógica intocável**; a FATIA-05 só monta os componentes de `ui/**` em outros hosts |
| Tokens | `styles/theme.css` (já tem `--vscode-sideBar-*`, `sideBarSectionHeader-*`, `activityBar*` a verificar) | qualquer token faltante entra como débito D2.37-like |

### Como o módulo entra no shell hoje (slots existentes)
1. `explorer` → `AuxiliaryBar` coluna Files: `module.mount(host,{sessionId})` (host = div no `AuxiliaryBar`).
2. `search` → `EditorArea` via `searchSlot` (`SearchModuleSlot`).
3. `attach` (Editor Anexo + Changes + Diff) → `AuxiliaryBar` via `attachSlot` (`AttachArea.tsx` renderiza `EditorTabs` + `CodeEditorPane`/`ChangesPane`/`DiffPane`).
4. Evento `explorer.fileOpened` é redirecionado em `App.tsx` para `attach.open(...)` (exceção 4.7).

## 2. Arquitetura alvo
```
App.tsx (shell)
 ├─ Titlebar (existente; toggles de layout)
 └─ .workbench-body
     ├─ SessionSidebar (existente)
     └─ .main-region
         ├─ <ActivityBar/>            ← NOVO  src/components/ActivityBar.tsx      (48 px; 3 ícones + badges)
         ├─ <SideBar/>                ← NOVO  src/components/SideBar.tsx          (título 35 + view ativa)
         │    └─ view ativa = componente do módulo montado via viewRegistry:
         │         explorer → módulo `explorer` (ExplorerView)          [5.1: só slot vazio/placeholder]
         │         search   → módulo `search`  (SearchPanel)            [5.2]
         │         scm      → ChangesPane (+ CommitInput)               [5.3]
         ├─ <EditorGroup/>            ← NOVO  src/components/EditorGroup.tsx      (abas 35 + Monaco/Diff)
         │    (5.1 cria o container; 5.3 faz Diff abrir nele; arquivos migram do Anexo — ver §4)
         ├─ Panel (TerminalPanel existente, intocável)
         └─ AuxiliaryBar (existente) — permanece durante a transição; Chat continua nela/centro conforme hoje
 core/viewRegistry.ts (NOVO, src/core/) — registro { id, title, icon, order, render(host), badge$ }
 core/layoutPreferences.ts (NOVO, 5.4 — se aprovado) — persistência localStorage
```

### Princípios
- **Camada 1 — Activity Bar:** só estado `activeViewId | null` + badges; sem lógica de domínio.
- **Camada 2 — Side Bar:** container; **nunca** desmonta a view ao trocar (usa `display:none`/`hidden` para preservar estado — igual ao VS Code, que mantém os composites vivos).
- **Camada 3 — Editor Group:** reaproveita `EditorService` + `EditorTabs.tsx` + `CodeEditorPane.tsx` + `DiffPane.tsx` do módulo (mesmos componentes, outro host). Aba única de sessão, preview/pin, dirty, save — já prontos.
- **Independência:** abrir arquivo/diff altera **só** o Editor Group.
- **Coexistência com o Editor Anexo (4.7):** o anexo continua funcionando até a 5.3 concluir; a partir daí vira fallback/oculto (decisão do usuário na homologação da 5.3). Nada do 4.7 é apagado durante a FATIA-05.

## 3. Onde o código pode tocar (por sub-fatia)
| Sub-fatia | Permitido | Proibido |
|---|---|---|
| 5.1 | `src/components/{ActivityBar,SideBar,EditorGroup}.tsx`, `src/core/viewRegistry.ts`, CSS próprio, **App.tsx mínimo** (montar as 3 peças) | `modules/explorer-search/**`, `EditorArea.tsx`, `TerminalPanel`, `AuxiliaryBar.tsx` (exceto se necessário para esconder duplicidade — pedir) |
| 5.2 | + `modules/explorer-search/index.ts` **aditivo** (expor `mountSearch(host)`), `contract.ts` aditivo | `core/search/**`, `server/**` |
| 5.3 | + `index.ts` aditivo (`mountChanges(host)`, `mountEditorGroup(host)`), remoção de `shell/gitTransition.ts` + hook em App.tsx, `data.ts` maquete | `core/git/**`, `server/git/**`, `core/editor/**` |
| 5.4–5.7 | `src/components/**`, `src/core/**`, CSS | qualquer `core/**`/`server/**` do módulo |

## 4. Riscos e mitigação
| Risco | Mitigação |
|---|---|
| `App.tsx` gigante e sensível (callback-ref mount/unmount durante commit React — lição 4.7) | montar as 3 peças em **um único ponto** de `App.tsx`; `reactRoot.unmount()` adiado (padrão já usado) |
| Duplicidade Explorer (barra auxiliar direita **e** Side Bar esquerda) na 5.1–5.2 | 5.1 mostra placeholder na Side Bar; migração real do Explorer só quando o usuário autorizar (não está nas 5.1–5.7 do comando — **decisão aberta**, ver `05_05 §0`) |
| Estado da view perdido ao trocar de ícone | Side Bar mantém as views montadas (hidden), spec E2E cobre "query do Search sobrevive à troca" |
| Monaco duplo (Anexo + Editor Group) e RAM ~1,9 GB | um `EditorService` por host; Editor Group só monta Monaco quando há aba |
| 8080 para prints derruba o sandbox | prints do 8080 **sem pasta aberta** (só o chassi) são leves; com pasta = evitar (D2.34) |
