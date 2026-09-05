# CODIGO MOCKADO ATUAL - TERMINAL

## Arquivo: src/components/TerminalPanel.tsx

```ts
function initialTerminalLines(workspace: string): string[] {
  return [
    `Agent Sessions terminal  ${workspace}`,
    '$ git status --short',
    ' M src/browser/parts/titlebarPart.ts',
    '?? src/contrib/browserView/browser/sessionBrowserView.ts',
    '$ npm run typecheck',
    '✓ No type errors found',
  ]
}

export function TerminalPanel({ visible, sessionId, sessionLabel, workspace, snapshot, onSnapshot, onClose }) {
  const terminalElement = useRef<HTMLDivElement>(null)
  const terminal = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const outputLines = useRef<string[]>([])

  useEffect(() => {
    const instance = new Terminal({
      convertEol: true,
      cursorBlink: true,
      // ...
    })
    instance.loadAddon(fit)
    instance.open(terminalElement.current)

    const restoredLines = snapshot?.cleared ? [] : snapshot?.lines ?? initialTerminalLines(workspace)
    for (const line of restoredLines) instance.writeln(line)

    // NÃO tem onData handler! Não aceita digitação [03:07]
    // NÃO tem shell real, só troca label
    // Split é mock com <pre> estático, não segundo xterm
  }, [sessionId, snapshot, visible, workspace])
}
```

## Problemas
- `initialTerminalLines` fixo - sempre mesmas 7 linhas
- Não tem `terminal.onData` para aceitar digitação - por isso "Não consigo digitar" [03:07]
- Split: `<div className="terminal-container-split"><pre>{initialTerminalLines().join('\n')}</pre></div>` - estático, não segundo terminal
- Shell picker só troca label, não troca shell real
- Output e Problems são const hardcoded, não dinâmicos
- Snapshot funciona mas só salva linhas mockadas

## Arquivo: src/App.tsx

```ts
const [terminalVisible, setTerminalVisible] = useState(persistedLayout.shell.terminalVisible)
const [terminalsBySession, setTerminalsBySession] = useState<Record<string, TerminalSnapshot>>({})

// Trocar sessão deveria trocar terminal, mas hoje usa mesmo workspace pra todas
```
