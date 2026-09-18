import React from 'react'
import ReactDOM from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import '@xterm/xterm/css/xterm.css'
import './styles/theme.css'
import './styles/app.css'
import './styles/terminal-vscode.css'
import './styles/xterm-vscode.css'
import App from './App'
import { TerminalSessionProvider } from './providers/TerminalSessionProvider'

// (R-090) Workers do Monaco no Vite.
// Sem MonacoEnvironment.getWorker, o Monaco tenta resolver o worker por
// FileAccess.asBrowserUri e estoura "Cannot read properties of undefined
// (reading 'toUrl')" a cada montagem do editor/diff — dezenas de erros de
// runtime no console e linguagem/IntelliSense degradados. Registrar os
// workers empacotados pelo Vite resolve na raiz.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

loader.config({ monaco })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TerminalSessionProvider>
      <App />
    </TerminalSessionProvider>
  </React.StrictMode>,
)
