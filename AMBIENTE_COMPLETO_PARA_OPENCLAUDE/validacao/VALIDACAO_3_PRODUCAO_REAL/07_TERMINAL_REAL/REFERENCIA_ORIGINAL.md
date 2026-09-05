# REFERENCIA ORIGINAL - TERMINAL

## Original: sessions/browser/parts/panelPart.ts + terminal contrib

Original tem:
- Terminal pertence a uma sessão (sessionLabel)
- Output, Problems, Terminal tabs no bottom panel
- Shells: bash, zsh, pwsh, fish
- Split terminal
- Snapshot preserva linhas ao trocar sessão
- Maximizar/restaurar terminal
- Clear, new terminal, shell picker

```ts
// Original: TerminalPanel pertence à sessão
interface TerminalPanelProps {
  visible: boolean
  sessionId: string
  sessionLabel?: string // nome da sessão ativa (ex: "session-1") - rótulo da aba Terminal segue a sessão
  workspace: string
  snapshot?: TerminalSnapshot // preserva buffer visível enquanto active session changes
  onSnapshot?: (sessionId, snapshot) => void
  onClose: () => void
}

interface TerminalSnapshot {
  lines: string[]
  cleared: boolean
}

// Output mock para aba Output (canal build/typecheck)
const OUTPUT_LINES = [
  '[info] Iniciando tarefa: npm run build',
  '[info] vite v5 building for production...',
  '[info] ✓ built in 15.56s',
]

// Problems mock
const PROBLEMS = [
  { severity: 'warning', file: 'src/App.tsx', line: 480, message: 'Bloco maior que 500 kB' },
]
```

## Original: LAYOUT_CONTROLLER.md - Panel visibility per session

```
B1 — Panel visibility é lembrado por sessão e defaults to hidden. Toggling panel updates that session's remembered state.
```

Terminal panel visibility é por sessão, não global.
