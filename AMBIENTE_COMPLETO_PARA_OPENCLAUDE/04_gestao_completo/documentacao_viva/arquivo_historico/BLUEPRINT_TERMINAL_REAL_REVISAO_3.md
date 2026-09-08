# BLUEPRINT — Terminal Real: Correção de Regressão + Servidor Único + Paridade Visual
> **Revisão 3 de `BLUEPRINT_TERMINAL_REAL.md`** (Revisão 2 permanece válida onde não for formalmente revisada aqui — ver seção 6)
> Status: **APROVADO PARA EXECUÇÃO — Fase E1 liberada; E2/E3/E4 seguem os gates abaixo**
> Data: 2026-09-07 | Projeto: `agente_window/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final`
> Origem: consolidação de dois blueprints concorrentes — `arena_BLUEPRINT_TERMINAL_VSCODE_EMBED.md` (estrutura, avaliação crítica de viabilidade, perguntas abertas) e `meta_BLUEPRINT-TERMINAL-CTRL-C-CTRL-V.md` (diffs de correção RC1–RC4, código de servidor único) — decisão e consolidação por Guilherme + orquestrador IA.

---

## 0. Sumário Executivo

Este documento substitui a discussão de "cópia integral do terminal do VS Code" por um objetivo tecnicamente honesto: **paridade visual e funcional real**, sem fingir que dá pra colar o TypeScript do workbench do VS Code num projeto React solto (ver seção 1). Cobre três frentes, em ordem de dependência:

1. **Correção da regressão diagnosticada em 2026-09-07** (RC1–RC4, `GATES_EXECUCAO.md §7`) — terminal em branco, input morto, PTY não reconecta.
2. **Servidor único / porta única** — eliminar o `pty-server` como processo separado com discovery de porta (7681–7699), que é a causa estrutural de boa parte dos problemas em sandbox e Windows.
3. **Paridade visual** — tokens de cor, CSS e ícones extraídos do VS Code real (licença MIT, com atribuição), reimplementados como componentes React sobre o `xterm.js` já usado no projeto.

---

## 1. Por que não é "Ctrl C + Ctrl V" literal

O terminal do VS Code não é um componente isolado: `terminalTabsList.ts`, `terminalGroup.ts`, `xtermTerminal.ts` dependem de `IInstantiationService`, `IConfigurationService`, `ContextKeyService`, `SplitView`, `List` — toda a infraestrutura de injeção de dependência do workbench. Copiar esses arquivos literalmente significa arrastar o VS Code inteiro para dentro do projeto, o que não roda em React e não é o objetivo do projeto (réplica funcional, não fork do VS Code).

**Decisão:** extrair a *linguagem visual real* — tokens de cor (`terminalColorRegistry.ts`), CSS estrutural (`terminal.css`, `xterm.css`) e ícones (`codicon.ttf`) — e reimplementar o chrome (abas, botões, splits) como componentes React, usando a mesma lib de terminal que o VS Code usa (`xterm.js`). O resultado observável (visual e comportamental) é indistinguível; o caminho de implementação é são.

---

## 2. Fase E1 — Fundação: Correção da Regressão (RC1–RC4)

**Gate de entrada:** nenhum — já aprovado, pode iniciar imediatamente.
**Gate de saída:** sonda `02_replica_final/probe-terminal.mjs` verde — prompt visível **antes** de qualquer input, `echo` digitado aparece no output, PTY sobrevive ao fechar/reabrir painel com o mesmo PID. Colar saída bruta em `GATES_EXECUCAO.md`.

### RC1 — Loop infinito de `setState` em `TerminalSessionProvider`
Causa: `session` é um objeto novo a cada render, então `onStateChange(sessionId, session)` dispara em loop.

```tsx
// ANTES (quebrado):
useEffect(() => { onStateChange(sessionId, session) }, [sessionId, session, onStateChange])

// DEPOIS:
const stableSession = useMemo(() => ({
  status, pid, activeProfile, availableProfiles, sendInput, sendResize, closeSession, onOutput
}), [status, pid, activeProfile, availableProfiles])
useEffect(() => { onStateChange(sessionId, stableSession) }, [sessionId, stableSession])
```

### RC2 — `TerminalPanel` preso num stub no-op (tela em branco)
Causa: o painel assina `onOutput` quando a sessão ainda é um stub e nunca re-assina quando a sessão real chega do provider.

```tsx
const ptySession = sessions[sessionId]
useEffect(() => {
  if (!terminal.current || !ptySession) return
  const unsub = ptySession.onOutput((data) => terminal.current?.write(data))
  try {
    fitAddon.current?.fit()
    ptySession.sendResize(terminal.current.cols, terminal.current.rows) // cobre RC4 também
  } catch {}
  return unsub
}, [ptySession?.status, ptySession?.pid]) // nunca dependa do objeto inteiro
```

### RC3 — `ptyManager.openSession` mata e recria em vez de reconectar
Viola o critério do Gate 0 ("reconectar ao MESMO PTY"). Também: `usePtySession` não pode mandar `{type:'close'}` no cleanup de unmount do React — só em kill explícito do usuário.

```ts
// ptyManager.ts
async openSession({ sessionId, cols, rows, shellId }) {
  if (this.sessions.has(sessionId)) {
    const existing = this.sessions.get(sessionId)!
    return { pid: existing.ptyProcess.pid, shell: existing.profile.id, scrollback: existing.outputBuffer }
  }
  // ... spawn novo processo, como hoje
}
```

```ts
// usePtySession.ts — cleanup do useEffect
return () => { wsRef.current = null; ws.close() } // fecha só a conexão WS, NUNCA envia {type:'close'} do PTY aqui
```

### RC4 — Resize inicial nunca chega ao PTY
Coberto dentro do fix de RC2 acima (`sendResize` logo após `fit()`). Confirmar que todo caminho que chama `fit()` (mount, toggle do painel, resize de janela) também chama `sendResize` na sequência.

### Shell errado no Debian (PowerShell aparecendo fora do Windows)
```ts
// shellDetector.ts
const profiles = await detectShellProfiles()
const filtered = process.platform !== 'win32'
  ? profiles.filter(p => p.id !== 'pwsh' && p.id !== 'powershell')
  : profiles
```

---

## 3. Fase E2 — Servidor Único (Porta Única)

**Gate de entrada:** E1 fechado e registrado em `GATES_EXECUCAO.md`.
**Gate de saída:** app + WebSocket do terminal servidos na mesma origem/porta, em dev e em produção. Nenhuma chamada a `discoverPtyPort()` ou `/pty-port` remanescente no código.

**Decisão de endpoint:** `/pty` (mantém o nome já usado no protocolo JSON atual de `pty-server/src/wsHandler.ts` — não há motivo pra renomear campos/mensagens à toa). Protocolo mantido como já está documentado na Revisão 2:

```
C→S: {type:'open', sessionId, cols, rows, shellId}
C→S: {type:'input', data}
C→S: {type:'resize', cols, rows}
C→S: {type:'close'}
S→C: {type:'opened', pid, shell, shellPath, availableProfiles}
S→C: {type:'output', data}
S→C: {type:'exit', code}
```

**Decisão de rede:** `HOST` fixo em `127.0.0.1`. Sem exposição remota (`0.0.0.0`) nesta onda — corta a necessidade de token de autenticação e simplifica o escopo. Se acesso remoto vier a ser necessário, isso é uma decisão nova, com blueprint próprio de segurança.

### Dev — plugin do Vite
```ts
// vite-plugin-pty.ts
import { WebSocketServer } from 'ws'
import { PtyManager } from './pty-server/src/ptyManager'
import { setupWebSocketHandler } from './pty-server/src/wsHandler'

export function ptyPlugin() {
  const ptyManager = new PtyManager()
  const wss = new WebSocketServer({ noServer: true })
  setupWebSocketHandler(wss, ptyManager)
  return {
    name: 'pty-single-port',
    configureServer(server) {
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/pty')) {
          wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
        }
      })
    }
  }
}
```

```ts
// vite.config.ts
import { ptyPlugin } from './vite-plugin-pty'
export default defineConfig({
  plugins: [react(), ptyPlugin()],
  server: { host: '127.0.0.1', port: 5173 }
})
```

### Frontend — remover discovery
```ts
// usePtySession.ts
const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
const ws = new WebSocket(`${proto}//${location.host}/pty`)
```

### Produção — servidor único
```js
// server.mjs
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { PtyManager } from './pty-server/src/ptyManager.js'
import { setupWebSocketHandler } from './pty-server/src/wsHandler.js'

const app = express()
app.use(express.static('dist'))
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/pty' })
setupWebSocketHandler(wss, new PtyManager())
server.listen(process.env.PORT || 5173, '127.0.0.1', () =>
  console.log('single port 5173')
)
```

`pty-server/index.ts` (o processo standalone com discovery de porta) é aposentado após esta fase — o resto de `pty-server/` (ptyManager, wsHandler, shellDetector) vira lib importada, não processo separado.

**`node-pty` no Windows:** tentar `node-pty` nativo; se a compilação falhar, cair automaticamente para `node-pty-prebuilt-multiarch`, documentado no README. Sem pergunta em runtime ao usuário.

---

## 4. Fase E3 — Paridade Visual

**Gate de entrada:** E2 fechado.
**Gate de saída:** screenshot E2E do terminal com abas à direita, tema `#1e1e1e`, tab ativa com borda de cor do token `terminal.tab.activeBorder`, botões `+`/split/trash com hover consistente.

- Tokens de `terminalColorRegistry.ts` (background, foreground, cursor, selection, bordas, 16 ANSI) → CSS custom properties, alimentando o objeto `theme` do xterm.
- `terminal.css` e `xterm.css` extraídos seletivamente (só os blocos que não dependem de classes do workbench) para `src/styles/terminal-vscode.css` e `xterm-vscode.css`.
- Ícones: `codicon.ttf` copiado como asset (licença MIT, manter atribuição) — fidelidade 1:1 de nome de classe e tamanho, já que o objetivo declarado do projeto é réplica de alta fidelidade.
- `TerminalTabsList.tsx` novo: abas **à direita** (default do VS Code), altura 22px, rename por duplo-clique, context menu, action bar no hover (≥105px).
- Abas inferiores "Output/Problems" seguem mockadas por enquanto — Output real fica para uma onda futura, sem bloquear esta.

---

## 5. Fase E4 — Fechamento

**Gate de saída (todos obrigatórios, saída bruta colada em `GATES_EXECUCAO.md`):**
- `npm run typecheck` — 0 erros
- `npm run test` — suíte unitária completa verde
- `npx playwright test` — suíte completa verde, incluindo `sessao_11` **reforçada** com:
  - `expect(page.locator('.xterm-rows')).toContainText('$')` **antes** de qualquer input
  - mesmo PID (`window.__ptyPid` ou equivalente) antes/depois do toggle do painel
  - erro visível (nunca tela em branco) quando o servidor de PTY está fora
- `npm run build` — exit code 0
- `ARCHIVING_PROTOCOL.md` executado — `CURRENT_STATE.md`, `DECISION_LOG.md`, `BACKLOG_FUTURO.md`, `PHASE_SUMMARY.md`, `GATES_EXECUCAO.md` atualizados na mesma sessão
- `KANBAN.md`: mover "Correção de Regressão do Terminal Real (RC1–RC4)" de A FAZER → EM ANDAMENTO ao iniciar E1, → CONCLUÍDO só depois do E4 fechado

---

## 6. Relação com `BLUEPRINT_TERMINAL_REAL.md` (Revisão 2) e com `CONTRATOS_DA_ONDA 1`

Este documento **revisa formalmente** a decisão de porta/discovery da Revisão 2 (seção 7: porta dedicada 7681 + endpoint `/pty-port`), substituindo-a pela arquitetura de servidor único das seções 2 e 3 acima. Isso deve ser registrado como entrada nova no `DECISION_LOG.md`, explicando a troca.

Nenhuma das `DECISOES_IMUTAVEIS_DESTA_REVISAO` do bloco `CONTRATOS_DA_ONDA 1` (`BACKLOG_FUTURO.md`) é contradita: terminal continua pertencendo contextualmente à Agent Session, esconder/fechar painel continua não matando o PTY, o WebSocket continua vivendo no `TerminalSessionProvider` (agora só migra de porta dedicada para porta única), e N terminais por workspace sem limite artificial seguem valendo.

---

## 7. Fora de Escopo (nesta onda)

- Acesso remoto (`HOST=0.0.0.0`) e autenticação de terminal.
- "Ir para Diretório Recente" / "Executar Comando Recente" (WB-01, WB-02 — já adiados no `BACKLOG_FUTURO.md`).
- "Executar Arquivo Ativo" / "Executar Texto Selecionado" (WB-03, WB-04).
- Output real do painel inferior (segue mockado).
- Serviço de Voz (WB-05 — bloqueado, sem blueprint próprio).
