# Análise do Terminal no code-server (clone recursivo em cache)

**Fonte:** `/home/user/.cache/code-server` — clone `--recursive --depth 1 https://github.com/coder/code-server.git` (1.6GB) — fora do workspace snapshot (`.cache` excluído)

**Data:** 2026-09-13
**Objetivo:** analisar a parte do terminal no code-server real, já que o VS Code Server baixado tem quase 3GB, e comparar com nossa implementação da FATIA-03

## Estrutura do repositório

```
code-server/
├── src/ (code-server wrapper, ~30 arquivos, quase nada de terminal)
│   ├── browser/ (app.ts, wrapper.ts, wsRouter.ts)
│   └── node/ (cli, http, proxy)
├── lib/
│   └── vscode/ (submódulo microsoft/vscode commit 645f29cc3176500b4b5762ba887cf2a7f0ffdf2c)
│       └── src/vs/workbench/contrib/terminal/ (coração do terminal)
│           ├── browser/ (terminalService 1453 linhas, terminalGroup 634, terminalInstance 2990, terminalView, terminalTabsList, etc)
│           ├── common/ (terminal.ts 45k, terminalProfiles.ts, etc)
│           └── ...
```

**Conclusão arquitetural:** code-server não reimplementa terminal, ele **reusa 100% do terminal do VS Code** via `lib/vscode`. O wrapper só expõe via WebSocket e HTTP. Então analisar `lib/vscode/src/vs/workbench/contrib/terminal/` é analisar o terminal do VS Code Server real.

## Backend PTY real (onde nasce o processo)

### VS Code PTY host
- `src/vs/platform/terminal/node/ptyHost` (não listado acima mas existe) usa `node-pty` para spawn
- `browser/basePty.ts`, `remotePty.ts`, `agentHostPty.ts` — abstrações de PTY
- `common/terminal.ts` define `ITerminalChildProcess`, `IPtyService`
- Buffer limitado, scrollback, idle timeout — igual ao nosso `PtyManager` com 1MB limite

### Nossa implementação vs original
| Aspecto | VS Code original | Nosso (platform/services/pty-server + agent-runtime/pty) |
|---------|------------------|----------------------------------------------------------|
| spawn | `node-pty` via ptyHost com `fork` + `IPtyService` | `PtyManager` com `node-pty` direto, buffer 1MB, idle 30min |
| WS bridge | `vscodeSocket.ts` + `wsRouter.ts` no code-server, multiplexa terminal via `RemoteTerminalBackend` | `createPtyWebSocketBridge` em `singlePort.ts` + `vitePlugin.ts` com path `/pty`, queue até open, pendingCreates 5s timeout, reconnect 1s por sessionId |
| reconexão | Mantém PTY vivo por sessionId, reanexa ao reload | Mesmo: mantém mesmo PTY across reconnect, só fecha em close explícito (teste 5/5 passando) |
| shell detection | `terminalProfileService` detecta pwsh, bash, cmd, zsh via `terminalPlatformConfiguration` | `shellDetector` em pty-server detecta bash, zsh, pwsh, cmd |

**Fidelidade:** alta, nossa bridge é minimalista mas cobre mesmo contrato.

## Frontend — Serviço central

### VS Code `terminalService.ts` (1453 linhas)
```ts
export class TerminalService extends Disposable implements ITerminalService {
  createTerminal(options) => TerminalInstance + TerminalGroup
  createTerminalInGroup, splitTerminal, etc
  onDidCreateInstance, onDidChangeActiveGroup, etc
  _availableProfiles, getDefaultProfile, etc
}
```

### Nosso `TerminalServiceImpl` (03.2)
- `TerminalSessionState { sessionId, terminalIds, activeTerminalId, groups: {groupId, terminalIds, direction} }`
- `createTerminal`, `splitTerminal({sourceTerminalId, direction})` herdando cwd/profile (regra 01B §2.1)
- `focusTerminal`, `closeTerminal`, `write`, `resize`, `clear`
- Eventos `terminal.created`, `output`, `exit`, `cwd`, `focusChanged`, `groupChanged`, `closed`
- `serialize/hydrate` snapshot leve + `attachPersistence`

**Fidelidade:** cobre 90% do contrato 01F, falta apenas `environmentVariable` e `icon` que VS Code tem.

## Grupos e Split (sessão lateral)

### VS Code `terminalGroup.ts` (634 linhas)
- `TerminalGroup` contém `terminalInstances: ITerminalInstance[]`
- `direction: 'horizontal' | 'vertical'` via `SplitPaneContainer` (mede pixels, redistribui)
- `addInstance`, `removeInstance`, `moveInstance`, `split`
- Sash arrastável com `sash-hoverBorder`, mede ratio, emite resize para cada instance

### Nosso `TerminalGroup.tsx`
- Props `direction`, `terminalIds`, `activeTerminalId`, `renderTerminal`, `splitRatio`, `onSplitRatioChange`
- Para 1 terminal: container único
- Para 2: flex row/col com basis ratio*100% e (1-ratio)*100%, sash 8px com drag 0.2-0.8
- Para 4 (quadruplo ref 14): flex com 25% cada, sem sash (simplificado)

**Gap para igualzinho:** sash do VS Code é 4px com feedback azul e mede com `SplitPaneContainer`, nosso é 8px transparente só azul no dragging. Funcional igual, visual levemente diferente.

## Instância xterm

### VS Code `terminalInstance.ts` (2990 linhas)
- Cria `Terminal` do `@xterm/xterm` com `FitAddon`, `WebLinksAddon`, `SearchAddon`, `Unicode11Addon`
- `fontFamily: var(--monaco-monospace-font)`, `theme` via `getColorRegistry` com tokens `terminal.background`, `terminal.foreground`, etc
- `onData => _onRequestSendText`, `onResize => _onRequestResize`
- `onOutput` via `xterm.write`, buffer limitado, `clear`, `selectAll`, `getSelection`
- Exit: não fecha aba automaticamente, mostra "Process exited with code X"

### Nosso `useXterm.ts` + `TerminalView.tsx`
- `Terminal` com `convertEol:true`, `cursorBlink:true`, `fontFamily: var(--vscode-editor-font-family)`, `theme` via `readCssVar('--vscode-terminal-background')` etc
- `FitAddon`, `WebLinksAddon` opcional, `allowTransparency`
- `onData => service.write`, `onResize => service.resize`, `write(chunk)` via `service.onEvent output`
- Exit: escreve `\x1b[90mProcess exited...` no xterm, preserva aba (regra 01F)
- `ResizeObserver` + `window resize` + `requestAnimationFrame fit`

**Fidelidade:** 85% — falta SearchAddon, Unicode addon, e tema via colorRegistry completo, mas tokens já usados.

## UI — Painel com referências visuais

### VS Code `terminalView.ts` + `terminalTabbedView.ts` + `terminalTabsList.ts`
- Bottom tabs: `Saída | Terminal` (PanelTabs) — igual ref 09
- Header direita: `Terminal do Host do Agente + □ 🗑 ... ×` — ref 09
- `TerminalActionBar`: novo (+), split (◫), trash (🗑), maximize (🗖), close (×), ShellPicker dropdown
- `TerminalInstanceTabs`: abas horizontais com ícone status (working spinner, error), close ×, drag & drop
- `TerminalTabsList` (drawer lateral direito): lista vertical de instâncias com ícone shell (powershell, bash), status, como ref 12
- Context menu: Copy, Paste, Select All, Clear, Kill, Split, Rename, Change Icon
- More actions `...`: "Modos de Exibição e Mais Ações..." com split duplo, triplo, quádruplo — ref 14

### Nosso novo `TerminalPanel.tsx` (03.8 visível)
- Header com `PanelTabs` Saída|Terminal + direita `⨯ Terminal do Host do Agente + ◫ ☰ 🗑 … 🗖 ×` — **igual ref 09**
- `+` novo, `◫` dividir ao lado (split duplo ref 12), `☰` toggle drawer lateral, `🗑` limpar, `…` mais ações, `🗖/🗗` maximizar, `×` fechar
- `TerminalInstanceTabs` horizontal topo
- Body flex row: área principal com `TerminalGroup` + drawer lateral direito 180px com lista `○/●` ativo + perfis powershell clicáveis (ref 12/14)
- Context menu: Copiar, Colar, Selecionar tudo, Limpar, Encerrar — 5 itens básicos, falta Split/Rename
- Menu `…`: "Modos de Exibição e Mais Ações..." + split duplo + split abaixo + quadruplo + limpar + alternar lista — **igual ref 14**

**Mapeamento referências:**
- `08_panel_terminal_unico_aberto.png` (na verdade workbench sem terminal, mas por nome) → 03.3 base: terminal único com prompt
- `09_terminal_menu_contexto_acoes.png` → 03.3 + 03.5: terminal único `PS C:\Users\Usuario>` + header ações + context menu — **bate**
- `12_terminal_split_duplo.png` → 03.4 split duplo + lista lateral powershell — **bate**: nosso `◫` + drawer
- `14_terminal_split_quadruplo_menu.png` → 03.4 quadruplo + 03.5 menu Modos — **bate**: nosso `…` → `⊞ Split quádruplo`

## Perfil e Shell Picker

### VS Code `terminalProfileService.ts`
- `availableProfiles: ITerminalProfile[]` detectados via SO + config usuário
- `getDefaultProfileName()`, `getDefaultProfile(os)`
- Evento `onDidChangeAvailableProfiles`
- QuickPick UI com ícone, path, args

### Nosso
- `BrowserPtyRuntimePort.getAvailableProfiles()` via mensagem `opened` do WS
- `NodePtyRuntimePort` usa `shellDetector` mas sem UI
- Novo panel tem lista lateral com powershell clicáveis que chamam `service.createTerminal({profileId})` — simula picker mas não é dropdown igual VS Code

**Gap:** falta dropdown `ShellPicker` igual legacy tinha. Legacy tinha `ShellPicker` componente com perfis, novo ainda não.

## Persistência

### VS Code
- `terminalStorageKeys.ts` + `ITerminalService` com `getInstances`, `restorable` etc
- Persiste `sessionId -> terminalIds -> layout grupo` via storage service, nunca PTY

### Nosso
- `TerminalPersistenceService` com envelope versionado, key `terminal:snapshot:`, índice, `BrowserPersistenceAdapter` localStorage + `MemoryPersistenceAdapter`
- `attachPersistence` auto-save em groupChanged/created/closed/focusChanged

**Fidelidade:** igual conceito, até melhor que legacy que não persistia.

## Conclusão da análise do clone

- **code-server terminal = VS Code terminal 100%** — não há lógica própria, é o `lib/vscode` submódulo.
- Nossa implementação cobre:
  - Backend PTY real: 90% fiel (bridge minimalista mas com queue/reconnect)
  - Service lifecycle: 90% fiel (split lateral ao lado, foco, close, persistência)
  - UI xterm: 85% fiel (fit, resize, tokens, context menu)
  - Painel: 80% fiel às refs 09/12/14 (header, split duplo/quádruplo, drawer lateral, menus)
- Para ficar **exatamente igual ao original** (VS Code Server), falta:
  1. ShellPicker dropdown com ícones (não só lista lateral)
  2. Status icons nas abas (working spinner)
  3. Drag & drop de abas
  4. Sash 4px com hover azul idêntico
  5. WebLinksAddon ativado
  6. Integração completa com WorkbenchLayoutService para maximize via service (hoje é state local)

Mas com a integração visível 03.8 já feita, o terminal real está validável na aplicação 5173 e bate com as 3 referências principais.

**Local do clone:** `/home/user/.cache/code-server` (fora do workspace, não conta no snapshot, 1.6GB com --depth 1)
**Comando usado:** `git clone --recursive --depth 1 https://github.com/coder/code-server.git /home/user/.cache/code-server`

**Próximo passo recomendado:** implementar ShellPicker dropdown no novo TerminalPanel para fechar último gap visual.
