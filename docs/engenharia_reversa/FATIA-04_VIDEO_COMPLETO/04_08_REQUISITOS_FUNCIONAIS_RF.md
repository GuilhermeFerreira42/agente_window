# 04_08 — REQUISITOS FUNCIONAIS (RF) — TESTÁVEIS

> Formato: **VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO** por requisito. Todos derivam do vídeo de 8m35s e do estado vigente do repositório.

## Bloco A — Explorer

| ID | Requisito | VISUAL | COMPORTAMENTO | EVENTO | VALIDAÇÃO |
|---|---|---|---|---|---|
| RF-01 | Header com **Nova Pasta** | ícone `new-folder` | cria pasta no nó selecionado com input inline | `explorer.newFolder` → `fs.changed(create)` | `VAL-EXP-04` |
| RF-02 | Header com **Novo Arquivo** | ícone `new-file` | idem para arquivo | `explorer.newFile` → `fs.changed(create)` | `VAL-EXP-04` |
| RF-03 | Header com **Atualizar** | ícone `refresh` | relê raiz preservando expansão/seleção | `workbench.files.action.refreshFilesExplorer` | `VAL-EXP-03` |
| RF-04 | Header com **Colapsar Pastas** | ícone `collapse-all` | colapsa todos os nós | `workbench.files.action.collapseExplorerFolders` | unit + E2E |
| RF-05 | Header com **Mais Opções (…)** | overflow | abre os demais comandos do contexto de título | `MenuId.ViewTitle` overflow | E2E visual |
| RF-06 | **Árvore lazy** | chevron | só carrega filhos ao expandir; cache por nó | `explorer.nodeExpanded` | `VAL-EXP-01` |
| RF-07 | **Seleção/foco/multi-seleção** | fundo azul / inativo | clique, setas, Ctrl/Shift+clique; foco preservado ao trocar de view | `explorer.selectionChanged` | E2E |
| RF-08 | **Auto-reveal** | scroll + foco | abrir recurso no editor expande ancestrais e destaca o nó | `explorer.revealRequested` | `VAL-EXP-05` |
| RF-09 | Seção **Editores Abertos** | lista por grupo | reflete abas vivas; estado vazio “Nenhum editor aberto” | `editor.resourceOpened/Closed` | `VAL-EXP-06` |
| RF-10 | Seção **Linha do Tempo** | lista cronológica | segue a seleção; estado vazio sem provedor | `explorer.selectionChanged` | E2E |
| RF-11 | Seção **Estrutura de Código (Outline)** | árvore de símbolos | segue o editor ativo; clique navega | `editor.activeChanged` | E2E |

## Bloco B — Menu de contexto e ações de arquivo

| ID | Requisito | VISUAL | COMPORTAMENTO | EVENTO | VALIDAÇÃO |
|---|---|---|---|---|---|
| RF-12 | **Menu de contexto completo** | menu com grupos/ordem do `04_03` | itens aparecem conforme tipo de nó e permissão | `menu.open` + context keys | `VAL-EXP-08` |
| RF-13 | **Cortar / Copiar / Colar** | itens + ícones | clipboard interno; Paste habilitado só após Cut/Copy; colisão pede confirmação | `fs.move` / `fs.copy` | unit + E2E |
| RF-14 | **Renomear** | input inline | aplica/`Esc`; atualiza abas abertas | `fs.changed(rename)` → `editor.resourceRenamed` | E2E |
| RF-15 | **Excluir** | item vermelho | mover para lixeira quando disponível, senão excluir com confirmação | `fs.remove` → `fs.changed(delete)` | E2E |
| RF-16 | **Download para a máquina local** | item “Download…” no grupo `5b_importexport` | arquivo → save picker; pasta → directory picker; multi-seleção; progresso; fallback blob | `fs.download*` | `VAL-EXP-07` |
| RF-17 | **Upload por DnD do SO** | alvo com `dropBackground` | aceita arquivos **e pastas**; progresso; confirmação de sobrescrita; cancelável | `fs.upload*` | `VAL-EXP-09` |
| RF-18 | **DnD interno** | opacidade no arrastado | mover/copiar entre pastas com `Alt`; confirmação configurável | `fs.move`/`fs.copy` | `VAL-EXP-10` |

## Bloco C — Editor anexo lateral

| ID | Requisito | VISUAL | COMPORTAMENTO | EVENTO | VALIDAÇÃO |
|---|---|---|---|---|---|
| RF-19 | Editor **não ocupa o centro** | anexo à direita da árvore, na sessão | abrir arquivo abre **no anexo** da sessão | `editor.resourceOpened` | `VAL-EXP-11` |
| RF-20 | **Resize por sash** | 6 px, `col-resize` | clamp 25–75%, persiste por sessão | `editor.attachResized` | `VAL-EXP-12` |
| RF-21 | **Recolher ao fechar a última aba** | espaço volta para a árvore | troca para `display: none` **sem desmontar** | `editor.attachCollapsed` | `VAL-EXP-13` |
| RF-22 | **Abas por sessão** | tabs com X e dirty | trocar sessão não destrói abas das outras | `editor.resourceOpened/Closed` | unit |
| RF-23 | **Salvar** | ponto de dirty some | gravação atômica | `editor.dirtyChanged` | `VAL-FS-01` |

## Bloco D — Busca e navegador na sessão

| ID | Requisito | VISUAL | COMPORTAMENTO | EVENTO | VALIDAÇÃO |
|---|---|---|---|---|---|
| RF-24 | **Pesquisa dentro da sessão** | widget no anexo (aba Search) | debounce, cancelável, escopo da sessão, incluir/excluir, substituir | `search.*` | `VAL-EXP-15` |
| RF-25 | **Botão “+” abre Navegador** | nova aba “Navegador” | abre página real dentro do anexo | `browser.loaded` | `VAL-BRW-01` |
| RF-26 | **IA lê a página** (“o que você está vendo?”) | resposta no chat | `getSummary` (DOM + visual) | `tool.result` | `VAL-BRW-02` |
| RF-27 | **IA clona a página** | artefato no workspace | `getHTML` + ativos gravados via `FileSystemPort` | `tool.result` | `VAL-BRW-03` |
| RF-28 | **IA interage** (clicar/digitar/arrastar/diálogo) | efeito na página | tools com **aprovação humana** | `tool.pending` → `tool.result` | `VAL-BRW-04` |
| RF-29 | **IA grava (filma) a página** | `.webm` como artefato | start/stop com aprovação | `browser.recording.*` | `VAL-BRW-05` |
| RF-30 | **Listar/alternar páginas** | abas do navegador | múltiplas páginas por sessão, isoladas | `browser.navigated` | unit |

## Bloco E — Fidelidade e plataforma

| ID | Requisito | VISUAL | COMPORTAMENTO | EVENTO | VALIDAÇÃO |
|---|---|---|---|---|---|
| RF-31 | **Zero cor hardcoded** | tokens `--vscode-*` | troca de tema reflete sem reload | `theme.changed` | `RNF-VAL-05` |
| RF-32 | **Aria-labels e tooltips** | iguais aos do VS Code | acessível por teclado | — | inspeção + axe |
| RF-33 | **Persistência de layout** | igual após reload | snapshot versionado (sidebar, anexo, painel) | `layout.changed` | `VAL-WB-02` |
| RF-34 | **Context keys corretas** | itens certos no menu | `when` avalia estado real | `commandRegistry.setContext` | unit |

---

## Matriz de rastreabilidade (vídeo → RF → validação)

| Trecho do vídeo | RFs | Validações |
|---|---|---|
| 3.1 Explorer (header + árvore + seções + contexto + DnD) | RF-01…RF-18 | VAL-EXP-01…VAL-EXP-10 |
| 3.2 Editor em anexo lateral | RF-19…RF-23 | VAL-EXP-11…VAL-EXP-14, VAL-FS-01 |
| 3.3 Search na sessão | RF-24 | VAL-EXP-15 |
| 3.3 Browser pelo “+” | RF-25, RF-30 | VAL-BRW-01 |
| 3.4 IA com acesso a HTML | RF-26…RF-29 | VAL-BRW-02…05 |
| 3.5 Fidelidade/tokens | RF-31…RF-34 | RNF-VAL-05 + checklist `04_13` |

---

## Fora de escopo desta fase (não é requisito do vídeo)

- Git/Source Control view (não aparece no vídeo);
- marketplace de extensões;
- multi-root workspace (apenas single-root);
- DevTools embutido do browser interno (o VS Code tem; o vídeo não pede);
- download nativo do Electron (só o caminho web é exigido).
