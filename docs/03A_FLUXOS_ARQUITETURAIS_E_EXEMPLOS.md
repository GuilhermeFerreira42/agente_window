# 03A — FLUXOS ARQUITETURAIS E EXEMPLOS

## Objetivo
Mostrar, com exemplos concretos, como a arquitetura do AGENTE WINDOW deve se comportar na prática. Este documento complementa `03_ARQUITETURA_EXECUTAVEL.md` e reduz ambiguidade na implementação.

## Árvore física alvo da raiz única
A estrutura final desejada converge para uma única raiz de instalação, com separação explícita por papel arquitetural.

```text
agente_window/
  package.json
  src/
    contracts/
      runtime/
      terminal/
      filesystem/
      chat/
      workbench/
      commands/
      theme/
    runtime/
      agent/
      pty/
      filesystem/
      tools/
    logic/
      terminal/
      chat/
      explorer/
      editor/
      workbench/
      commands/
      theme/
    workbench/
      layout/
      parts/
      containers/
    ui/
      terminal/
      chat/
      explorer/
      editor/
      shared/
    shared/
      types/
      events/
      persistence/
      utils/
  tests/
    unit/
    integration/
    e2e/
```

## Regra de posicionamento de código
| Tipo de responsabilidade | Lugar alvo |
|---|---|
| interfaces e tipos públicos | `src/contracts/` |
| bridge de SO, PTY, providers e tools | `src/runtime/` |
| estado, orquestração e regras de negócio | `src/logic/` |
| carcaça do layout e hospedagem visual | `src/workbench/` |
| componentes React e renderização | `src/ui/` |
| tipos compartilhados e helpers puros | `src/shared/` |

## Exemplo 1 — Abrir um terminal
```mermaid
sequenceDiagram
  participant U as Usuário
  participant UI as TerminalPanel
  participant WB as WorkbenchLayoutService
  participant LOG as TerminalService
  participant FS as FileSystemPort
  participant RT as TerminalRuntimePort
  U->>UI: clica em Novo Terminal
  UI->>LOG: createTerminal(sessionId,cwd,profileId)
  LOG->>FS: valida cwd e perfil
  FS-->>LOG: ok
  LOG->>RT: create(sessionId,cwd,profileId,cols,rows)
  RT-->>LOG: terminalId
  LOG->>WB: garantir painel visível
  LOG-->>UI: estado da nova instância
  RT-->>UI: terminal.output
```

### Tradução implementável
- a UI não cria PTY;
- o serviço de terminal cria a intenção;
- o runtime cria o processo real;
- o workbench apenas garante o espaço visual;
- a saída retorna por evento assíncrono.

## Exemplo 2 — Split do terminal
```mermaid
sequenceDiagram
  participant U as Usuário
  participant UI as TerminalTabs
  participant LOG as TerminalService
  participant WB as WorkbenchLayoutService
  participant RT as TerminalRuntimePort
  U->>UI: aciona Split Terminal
  UI->>LOG: splitTerminal(sourceTerminalId,direction)
  LOG->>WB: criar novo pane no grupo
  LOG->>RT: create(sessionId,cwd herdado,profileId,cols,rows)
  RT-->>LOG: terminalId
  LOG-->>UI: atualizar grupo e foco
```

### Regras críticas
- split nasce na lógica, não na UI;
- o runtime cria uma nova instância, não duplica DOM;
- o foco e o roteamento de input precisam ser atualizados juntos.

## Exemplo 3 — Enviar mensagem no chat
```mermaid
sequenceDiagram
  participant U as Usuário
  participant UI as ChatPanel
  participant LOG as ChatSessionService
  participant RT as AgentRuntimeAdapter
  participant PR as ModelProviderAdapter
  U->>UI: envia mensagem
  UI->>LOG: sendUserMessage(sessionId,text,attachments)
  LOG->>RT: startTurn(...)
  RT->>PR: send(messages,tools,model)
  PR-->>RT: chunk/thinking/toolCall
  RT-->>LOG: chat.thinking
  RT-->>LOG: chat.chunk
  LOG-->>UI: atualizar timeline
```

### Regras críticas
- o provider nunca fala com a UI;
- a sessão é o dono do histórico;
- a UI apenas projeta o estado do turno.

## Exemplo 4 — Tool pending com aprovação humana
```mermaid
sequenceDiagram
  participant RT as AgentRuntimeAdapter
  participant LOG as ChatSessionService
  participant UI as ToolGate
  participant TE as ToolExecutionAdapter
  participant U as Usuário
  RT-->>LOG: tool.pending
  LOG-->>UI: exibir tool pendente
  U->>UI: aprovar
  UI->>LOG: approveTool(sessionId,toolCallId)
  LOG->>TE: execute(...)
  TE-->>LOG: tool.result
  LOG->>RT: continuar turno com resultado
```

### Regras críticas
- tool sensível não executa sem gate;
- o gate é do fluxo, não um detalhe cosmético da UI;
- o resultado da tool volta para a mesma sessão e mesmo turno.

## Exemplo 5 — Abrir arquivo pelo Explorer
```mermaid
sequenceDiagram
  participant U as Usuário
  participant EX as ExplorerUI
  participant LOG as ExplorerService
  participant FS as FileSystemPort
  participant ED as EditorService
  U->>EX: duplo clique em arquivo
  EX->>LOG: openRequested(uri)
  LOG->>FS: readFile(uri)
  FS-->>LOG: conteúdo
  LOG->>ED: open(resource)
  ED-->>EX: foco muda no workbench
```

### Regras críticas
- Explorer não injeta conteúdo direto no editor;
- leitura de arquivo e abertura de aba são passos separados;
- `EditorService` é o dono da abertura de recursos.

## Exemplo 6 — Salvar arquivo com atomicidade
```mermaid
sequenceDiagram
  participant UI as EditorUI
  participant ED as EditorService
  participant FS as FileSystemPort
  participant RT as Runtime FS Provider
  UI->>ED: salvar
  ED->>FS: writeFile(uri,content,atomic=true)
  FS->>RT: enfileirar operação do recurso
  RT->>RT: escrever temp file + rename
  RT-->>FS: ok
  FS-->>ED: ok
  ED-->>UI: dirty=false
```

### Regras críticas
- `atomic=true` não é opcional para gravação normal;
- escrita direta por componente é proibida;
- o dirty state só limpa após confirmação de escrita.

## Exemplo 7 — Troca de tema
```mermaid
sequenceDiagram
  participant U as Usuário
  participant UI as ThemePicker
  participant TH as ThemeService
  participant WB as WorkbenchShell
  participant ED as EditorUI
  participant TP as TerminalPanel
  U->>UI: escolhe tema
  UI->>TH: applyTheme(themeId)
  TH-->>WB: theme.changed
  TH-->>ED: theme.changed
  TH-->>TP: theme.changed
```

### Regras críticas
- o tema não exige remontar a aplicação;
- todos os consumidores usam tokens, não cores fixas;
- terminal, editor e workbench precisam responder ao mesmo evento.

## Tabela de ownership por fluxo
| Fluxo | Dono principal | Serviços obrigatórios |
|---|---|---|
| abrir terminal | `TerminalService` | `TerminalRuntimePort`, `WorkbenchLayoutService`, `FileSystemPort` |
| split do terminal | `TerminalService` | `WorkbenchLayoutService`, `TerminalRuntimePort` |
| enviar mensagem | `ChatSessionService` | `AgentRuntimeAdapter` |
| aprovar tool | `ChatSessionService` | `ToolExecutionAdapter`, `AgentRuntimeAdapter` |
| abrir arquivo | `ExplorerService` + `EditorService` | `FileSystemPort` |
| salvar arquivo | `EditorService` | `FileSystemPort` |
| trocar tema | `ThemeService` | consumidores themable |

## Checklist de completude arquitetural
- [x] Há separação explícita entre Runtime, Workbench, Lógica e UI.
- [x] Há fluxos concretos de terminal, chat, explorer, filesystem e tema.
- [x] Há árvore física alvo para a raiz única.
- [x] Há definição de ownership por fluxo.
- [x] Há regras de implementação vinculadas aos fluxos.
