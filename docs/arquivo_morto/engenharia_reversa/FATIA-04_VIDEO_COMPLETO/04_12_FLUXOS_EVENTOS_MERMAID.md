# 04_12 — FLUXOS E EVENTOS (DIAGRAMAS MERMAID)

> Um diagrama por fluxo exigido no vídeo. Atores: **U** usuário, **EX** Explorer UI, **ES** ExplorerService, **FS** FileSystemPort, **ED** EditorService/EditorAttach, **WB** WorkbenchLayoutService, **SS** SearchService, **BS** BrowserSessionService, **RT** BrowserRuntime (Chromium/Playwright), **CS** ChatSessionService, **AG** AgentRuntimeAdapter, **CMD** CommandRegistry.

---

## 1. Expandir pasta (lazy)

```mermaid
sequenceDiagram
  participant U as Usuário
  participant EX as Explorer UI
  participant ES as ExplorerService
  participant FS as FileSystemPort
  U->>EX: clique no chevron
  EX->>CMD: executeCommand('explorer.expand')
  CMD->>ES: expand({ uri })
  ES->>ES: cache local já tem filhos?
  alt não tem
    ES->>FS: list({ uri })
    FS-->>ES: FileNode[]
  end
  ES-->>EX: children + event explorer.nodeExpanded
```

## 2. Criar arquivo / pasta (header ou menu)

```mermaid
sequenceDiagram
  participant U as Usuário
  participant EX as Explorer UI
  participant CMD as CommandRegistry
  participant ES as ExplorerService
  participant FS as FileSystemPort
  U->>EX: botão "Novo Arquivo" (header) ou item do menu
  EX->>CMD: 'explorer.newFile' (precondition: writable)
  CMD->>ES: createFile({ uri })
  ES->>FS: writeFile({ uri, content:'', atomic:true })
  FS-->>ES: ok + fs.changed(create)
  ES-->>EX: inserir nó + modo rename inline
```

## 3. Menu de contexto → Download para a máquina local

```mermaid
sequenceDiagram
  participant U as Usuário
  participant EX as Explorer UI
  participant ES as ExplorerService
  participant FS as FileSystemPort
  participant BR as Navegador (File System Access)
  U->>EX: botão direito → "Download…"
  EX->>ES: download({ uris })
  ES->>FS: stat(uri) por item
  FS-->>ES: tamanho/tipo
  alt arquivo único
    ES->>BR: showSaveFilePicker()
    BR-->>ES: FileSystemWritableFileStream
    ES->>FS: readFileStream(uri)
    FS-->>ES: chunks
    ES->>BR: escreve chunks (progresso)
  else pasta ou multi-seleção
    ES->>BR: showDirectoryPicker()
    loop cada item
      ES->>FS: readFileStream(uri)
      ES->>BR: grava preservando caminho relativo
    end
  end
  alt sem File System Access
    ES->>BR: triggerDownload(blob)  (fallback)
  end
  ES-->>U: notificação "N arquivo(s) baixado(s)"
```

## 4. Upload por drag & drop do Sistema Operacional

```mermaid
sequenceDiagram
  participant OS as Windows Explorer (SO)
  participant EX as Explorer UI (árvore)
  participant ES as ExplorerService
  participant FS as FileSystemPort
  OS->>EX: drag de arquivos/pastas (DataTransfer)
  EX->>EX: onDragOver → target destacado (list-dropBackground)
  OS->>EX: drop
  EX->>EX: dataTransfer.items → webkitGetAsEntry() (recursivo)
  EX->>ES: upload({ target, entries })
  ES->>FS: upload(...) com onProgress + token
  FS-->>EX: fs.uploadProgress (barra de progresso)
  alt colisão de nome
    FS-->>EX: pedir confirmação (Replace/Skip/Cancel)
  end
  FS-->>ES: fs.uploadFinished { filesCreated }
  ES-->>EX: atualizar ramo (sem reload da árvore inteira)
```

## 5. Abrir arquivo → editor no anexo lateral

```mermaid
sequenceDiagram
  participant U as Usuário
  participant EX as Explorer UI
  participant ES as ExplorerService
  participant FS as FileSystemPort
  participant ED as EditorService
  participant AT as EditorAttach (UI)
  participant WB as WorkbenchLayoutService
  U->>EX: duplo clique em arquivo.ts
  EX->>ES: open(uri)
  ES->>FS: readFile(uri)
  FS-->>ES: conteúdo
  ES->>ED: open({ uri, kind:'code', surface:'attach', sessionId })
  ED->>AT: display: contents + aba ativa
  ED->>WB: resizePart({ part:'editorAttach', pixels })
  ED-->>EX: editor.resourceOpened (auto-reveal do nó)
```

## 6. Fechar a última aba → anexo recolhe (sem destruir)

```mermaid
sequenceDiagram
  participant U as Usuário
  participant AT as EditorAttach
  participant ED as EditorService
  participant WB as WorkbenchLayoutService
  U->>AT: X na última aba da sessão
  AT->>ED: close({ uri })
  ED->>ED: restam abas? não
  ED-->>AT: editor.attachCollapsed
  AT->>AT: wrapper → display: none  (NÃO desmonta: estado, scroll, undo, dirty preservados)
  ED->>WB: resizePart({ part:'editorAttach', pixels: 0 })
  Note over AT: reabrir depois → display: contents + refit (estado intacto)
```

## 7. Pesquisa dentro da sessão

```mermaid
sequenceDiagram
  participant U as Usuário
  participant SW as Search Widget (anexo)
  participant SS as SearchService
  participant FS as FileSystemPort
  participant ED as EditorService
  U->>SW: digita termo
  SW->>SW: debounce 250ms + cancela busca anterior
  SW->>SS: search({ sessionId, root, query })
  SS->>FS: varredura respeitando include/exclude
  SS-->>SW: search.progress / search.finished
  U->>SW: clique em resultado
  SW->>ED: reveal({ uri, line })
  ED-->>U: abre no anexo e rola até a linha
```

## 8. Abrir navegador pelo “+” do anexo

```mermaid
sequenceDiagram
  participant U as Usuário
  participant AT as EditorAttach (+)
  participant ED as EditorService
  participant BS as BrowserSessionService
  participant RT as BrowserRuntime (Chromium/Playwright)
  U->>AT: "+" → Navegador
  AT->>ED: open({ kind:'browser', title:'Navegador' })
  ED->>BS: open({ sessionId, url })
  BS->>RT: nova página isolada por sessão
  RT-->>BS: pageId + summary
  BS-->>ED: browser.loaded
  ED-->>U: aba do navegador ativa no anexo
```

## 9. IA: “o que você está vendo?”

```mermaid
sequenceDiagram
  participant U as Usuário
  participant CH as Chat
  participant CS as ChatSessionService
  participant AG as AgentRuntimeAdapter
  participant BS as BrowserSessionService
  participant RT as Chromium (CDP/Playwright)
  U->>CH: "o que você está vendo?"
  CH->>CS: sendUserMessage
  CS->>AG: startTurn
  AG->>BS: readPage({ sessionId, pageId })
  BS->>RT: getSummary() (DOM + estado visual)
  RT-->>BS: BrowserPageSummary
  BS-->>AG: resumo
  AG-->>CS: chat.chunk ("Vejo uma interface do VS Code Web…")
  CS-->>CH: streaming na timeline
```

## 10. IA: “clone a página”

```mermaid
sequenceDiagram
  participant U as Usuário
  participant AG as AgentRuntimeAdapter
  participant BS as BrowserSessionService
  participant RT as Chromium (CDP)
  participant FS as FileSystemPort
  U->>AG: "clone a página"
  AG->>BS: html({ sessionId, pageId })
  BS->>RT: Runtime.evaluate(document.documentElement.outerHTML)
  RT-->>BS: html
  BS-->>AG: { html, bytes }
  AG->>FS: writeFile(clone/index.html, atomic)
  AG->>BS: invoke(fn) para baixar css/js/imagens referenciados
  AG->>FS: writeFile(assets…)
  AG-->>U: artefato criado + link para abrir no anexo
```

## 11. IA: clique com aprovação humana (tool gate)

```mermaid
sequenceDiagram
  participant RT as AgentRuntimeAdapter
  participant CS as ChatSessionService
  participant UI as Tool Gate (chat)
  participant TE as ToolExecutionAdapter
  participant BS as BrowserSessionService
  participant U as Usuário
  RT-->>CS: tool.pending { toolCallId, toolName:'clickElement', input:{selector} }
  CS-->>UI: exibir "A IA quer clicar em #submit — aprovar?"
  U->>UI: aprovar
  UI->>CS: approveTool(sessionId, toolCallId)
  CS->>TE: execute(...)
  TE->>BS: click({ sessionId, pageId, target })
  BS-->>TE: ok
  TE-->>CS: tool.result
  CS->>RT: continuar turno com o resultado
```

## 12. IA: gravar (filmar) a página

```mermaid
sequenceDiagram
  participant U as Usuário
  participant AG as AgentRuntimeAdapter (tool recordPage)
  participant CS as ChatSessionService
  participant BS as BrowserSessionService
  participant RT as Chromium (recordVideo)
  participant FS as FileSystemPort
  U->>AG: "grave 10s desta página"
  AG-->>CS: tool.pending (requiresApproval)
  CS-->>U: pedir aprovação
  U->>CS: aprovar
  CS->>BS: record({ action:'start' })
  BS->>RT: inicia gravação (.webm)
  BS-->>CS: browser.recording.started
  Note over RT: …10 segundos…
  CS->>BS: record({ action:'stop' })
  BS->>FS: move vídeo para workspace
  FS-->>BS: videoUri
  BS-->>CS: browser.recording.stopped { videoUri }
  CS-->>U: artefato de vídeo no anexo/aba
```

## 13. Ciclo de vida do tema (afeta Explorer/Editor/Search/Browser)

```mermaid
sequenceDiagram
  participant U as Usuário
  participant TH as ThemeService
  participant WB as WorkbenchShell
  participant EX as Explorer UI
  participant ED as EditorAttach
  participant BS as Browser UI
  U->>TH: escolhe tema claro/escuro
  TH-->>WB: theme.changed
  TH-->>EX: theme.changed (tokens --vscode-*)
  TH-->>ED: theme.changed
  TH-->>BS: theme.changed
  Note over EX,BS: nenhum hardcode; terminal blindado usa useTerminalTheme (docs/18 Regra 9)
```

---

## Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Diagrama | VISUAL esperado | COMPORTAMENTO | EVENTO | VALIDAÇÃO |
|---|---|---|---|---|
| 1 Expandir pasta | filhos indentados, chevron aberto | lazy + cache | `explorer.nodeExpanded` | VAL-EXP-01 |
| 2 Criar arquivo/pasta | input inline na linha | create + rename inline | `fs.changed(create)` | VAL-EXP-04 |
| 3 Download | progresso + notificação | save/directory picker, fallback blob | `fs.download*` | VAL-EXP-07 |
| 4 Upload por DnD | alvo destacado + barra de progresso | webkitGetAsEntry recursivo | `fs.upload*` | VAL-EXP-09 |
| 5 Abrir arquivo | anexo aparece à direita | delegação ao EditorService | `editor.resourceOpened` | VAL-EXP-11 |
| 6 Fechar última aba | anexo recolhe (espaço volta) | `display:none` sem desmontar | `editor.attachCollapsed` | VAL-EXP-13 |
| 7 Search | widget no anexo | debounce + cancelamento | `search.*` | VAL-EXP-15 |
| 8 Abrir browser | aba Navegador | runtime por sessão | `browser.loaded` | VAL-BRW-01 |
| 9 “O que você está vendo?” | resposta no chat | `readPage` → getSummary | `tool.result` | VAL-BRW-02 |
| 10 Clonar página | artefato no workspace | getHTML + assets | `tool.result` | VAL-BRW-03 |
| 11 Clique com gate | prompt de aprovação | aprovação humana antes de executar | `tool.pending` → `tool.result` | VAL-BRW-04 |
| 12 Gravar (filmar) | `.webm` como artefato | start/stop com aprovação | `browser.recording.*` | VAL-BRW-05 |
| 13 Tema | todas as áreas mudam sem reload | tokens | `theme.changed` | RNF-VAL-05 |
