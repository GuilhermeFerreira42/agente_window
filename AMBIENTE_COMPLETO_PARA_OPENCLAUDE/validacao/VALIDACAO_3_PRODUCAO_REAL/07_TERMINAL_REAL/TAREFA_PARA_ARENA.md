# TAREFA PARA ARENA - TERMINAL REAL

### Passo 1 - Aceitar digitação (fix [03:07] "Não consigo digitar")
Arquivo: `src/components/TerminalPanel.tsx`

**ANTES:** Sem onData handler

**DEPOIS:**
```ts
useEffect(() => {
  const instance = new Terminal({ ... })
  instance.open(terminalElement.current)

  // NOVO: aceitar digitação
  instance.onData(data => {
    // Eco local + processar comando mockado
    if (data === '\r') { // Enter
      const command = currentLine.trim()
      instance.writeln('')
      if (command === 'clear') {
        instance.clear()
        outputLines.current = []
      } else if (command.startsWith('echo ')) {
        instance.writeln(command.slice(5))
        outputLines.current.push(command.slice(5))
      } else if (command) {
        instance.writeln(`$ ${command}`)
        instance.writeln(`Comando mockado: ${command} executado em ${workspace}`)
        outputLines.current.push(`$ ${command}`, `mock: ${command}`)
      }
      instance.write('\r\n$ ')
      setCurrentLine('')
    } else if (data === '\x7f') { // Backspace
      if (currentLine.length > 0) {
        instance.write('\b \b')
        setCurrentLine(prev => prev.slice(0, -1))
      }
    } else {
      instance.write(data)
      setCurrentLine(prev => prev + data)
    }
  })

  instance.write('$ ')
}, [])

const [currentLine, setCurrentLine] = useState('')
```

### Passo 2 - Terminal por sessão (R-063)
Arquivo: `src/App.tsx`

```ts
// Terminal pertence à sessão - trocar sessão troca terminal exibido
const [terminalSnapshots, setTerminalSnapshots] = useState<Record<string, TerminalSnapshot>>({})

const handleTerminalSnapshot = (sessionId: string, snapshot: TerminalSnapshot) => {
  setTerminalSnapshots(prev => ({ ...prev, [sessionId]: snapshot }))
}

// Ao trocar sessão, TerminalPanel recebe snapshot daquela sessão
<TerminalPanel
  sessionId={activeSessionId}
  sessionLabel={activeSession.title}
  workspace={activeSession.workspace}
  snapshot={terminalSnapshots[activeSessionId]}
  onSnapshot={handleTerminalSnapshot}
  visible={terminalVisible}
  onClose={() => setTerminalVisible(false)}
/>
```

### Passo 3 - Split real (fix [02:53] "consigo dividir mas é tudo simulação")
Arquivo: `TerminalPanel.tsx`

**ANTES:**
```tsx
{split && <div className="terminal-container-split"><pre>{initialTerminalLines().join('\n')}</pre></div>}
```

**DEPOIS:**
```tsx
const splitTerminalElement = useRef<HTMLDivElement>(null)
const splitTerminal = useRef<Terminal | null>(null)

useEffect(() => {
  if (!split || !splitTerminalElement.current) return
  const instance = new Terminal({ ... })
  instance.open(splitTerminalElement.current)
  instance.writeln(`Split terminal - ${workspace} - ${shell}`)
  splitTerminal.current = instance
  return () => instance.dispose()
}, [split, workspace, shell])

// No JSX:
{split && <div className="terminal-container-split" ref={splitTerminalElement} />}
```

### Passo 4 - Shell picker, Output, Problems, Maximizar

Já existem mas garantir que funcionam:
- Shell picker troca `shell` state e recria terminal com novo shell label
- Output tab mostra OUTPUT_LINES (pode ser dinâmico depois)
- Problems tab mostra PROBLEMS com file:line clicável que abre arquivo
- Maximizar: `is-maximized` class que faz terminal ocupar tela toda
- Clear: `instance.clear()` + `outputLines.current = []`

### Critério E2E:
1. Abrir terminal, digitar "echo hello", Enter -> deve mostrar "hello" (não "Não consigo digitar")
2. Digitar "clear", Enter -> limpa terminal
3. Criar s1 e s2, digitar "echo s1" em s1, trocar pra s2, digitar "echo s2", voltar pra s1 -> deve mostrar "echo s1" ainda (snapshot por sessão)
4. Clicar Split -> 2 terminais lado a lado, ambos aceitam digitação
5. Shell picker bash/zsh/pwsh/fish troca label e recria terminal
6. Output tab mostra build logs, Problems tab mostra warnings com file clicável
7. Maximizar terminal ocupa tela toda, restaurar volta

### Arquivos:
- src/components/TerminalPanel.tsx (principal - aceitar digitação, split real, por sessão)
- src/App.tsx (terminalSnapshots por sessionId)
