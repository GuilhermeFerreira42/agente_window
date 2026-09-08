import test from 'node:test'
import assert from 'node:assert'
import http from 'node:http'
import { WebSocket } from 'ws'
import { detectShellProfiles, resolveShell } from '../shellDetector.js'
import { PtyManager } from '../ptyManager.js'
import { createPtyWebSocketBridge, PTY_WS_PATH } from '../singlePort.js'

test('detectShellProfiles finds at least one real shell on the host OS', async () => {
  const profiles = await detectShellProfiles()
  assert.ok(profiles.length > 0, 'Profiles should not be empty')
  assert.ok(profiles[0].id, 'Profile id should exist')
  assert.ok(profiles[0].path, 'Profile path should exist')
  assert.ok(profiles[0].label, 'Profile label should exist')
})

test('resolveShell returns the preferred shell and all profiles', async () => {
  const result = await resolveShell()
  assert.ok(result !== null)
  assert.ok(result.profile.path)
  assert.ok(result.allProfiles.length > 0)
})

test('resolveShell returns null for non-existent platform with empty shells', async () => {
  const result = await resolveShell('invalid-shell', 'aix' as any)
  assert.strictEqual(result, null)
})

test('PtyManager spawns a real OS process, writes input, and captures output', async () => {
  const ptyManager = new PtyManager()
  const sessionId = 'test-session-' + Date.now()

  let capturedData = ''
  const unsubscribeData = ptyManager.onData((sId, data) => {
    if (sId === sessionId) {
      capturedData += data
    }
  })

  const opened = await ptyManager.openSession({
    sessionId,
    cols: 80,
    rows: 24,
  })

  assert.ok(opened.pid > 0, `PID should be a valid positive integer, got ${opened.pid}`)
  assert.ok(opened.shell, 'Shell should be identified')
  assert.ok(opened.shellPath, 'Shell path should exist')

  let isAlive = false
  try {
    process.kill(opened.pid, 0)
    isAlive = true
  } catch {
    isAlive = false
  }
  assert.strictEqual(isAlive, true, `PID ${opened.pid} must be an active OS process`)

  const marker = `TEST_MARKER_${Date.now()}`
  if (process.platform === 'win32') {
    ptyManager.writeInput(sessionId, `Write-Output "${marker}"\r\n`)
  } else {
    ptyManager.writeInput(sessionId, `echo "${marker}"\n`)
  }

  const startTime = Date.now()
  while (!capturedData.includes(marker) && Date.now() - startTime < 8000) {
    await new Promise((r) => setTimeout(r, 100))
  }

  assert.ok(capturedData.includes(marker), `Output did not contain marker "${marker}". Captured: ${capturedData}`)

  unsubscribeData()
  ptyManager.closeSession(sessionId)
})

test('single-port websocket bridge keeps the same PTY across reconnect and closes only on explicit close', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
  const address = server.address() as { port: number }
  const port = address.port

  const ptyManager = new PtyManager()
  const bridge = createPtyWebSocketBridge({ ptyManager })
  const detachUpgrade = bridge.attachToServer(server)

  const ws = new WebSocket(`ws://127.0.0.1:${port}${PTY_WS_PATH}`)
  await new Promise((resolve) => ws.once('open', resolve))

  const messagesReceived: any[] = []
  ws.on('message', (data) => {
    messagesReceived.push(JSON.parse(data.toString()))
  })

  const sessionId = 'ws-test-session'
  ws.send(JSON.stringify({ type: 'open', sessionId, cols: 80, rows: 24 }))

  const startTime = Date.now()
  while (!messagesReceived.some((m) => m.type === 'opened') && Date.now() - startTime < 5000) {
    await new Promise((r) => setTimeout(r, 100))
  }

  const openedMsg = messagesReceived.find((m) => m.type === 'opened')
  assert.ok(openedMsg, 'Should receive opened message')
  assert.strictEqual(openedMsg.sessionId, sessionId)
  assert.ok(openedMsg.pid > 0)
  assert.ok(Array.isArray(openedMsg.availableProfiles))

  const marker = `WS_MARKER_${Date.now()}`
  if (process.platform === 'win32') {
    ws.send(JSON.stringify({ type: 'input', sessionId, data: `Write-Output "${marker}"\r\n` }))
  } else {
    ws.send(JSON.stringify({ type: 'input', sessionId, data: `echo "${marker}"\n` }))
  }

  while (!messagesReceived.some((m) => m.type === 'output' && m.data.includes(marker)) && Date.now() - startTime < 10000) {
    await new Promise((r) => setTimeout(r, 100))
  }

  const outputMsg = messagesReceived.find((m) => m.type === 'output' && m.data.includes(marker))
  assert.ok(outputMsg, `Should receive output with marker "${marker}"`)

  ws.close()
  await new Promise((r) => setTimeout(r, 300))
  assert.ok(ptyManager.getSession(sessionId), 'Session should remain alive after socket disconnect')

  const wsReconnect = new WebSocket(`ws://127.0.0.1:${port}${PTY_WS_PATH}`)
  await new Promise((resolve) => wsReconnect.once('open', resolve))

  const reconnectedMessages: any[] = []
  wsReconnect.on('message', (data) => {
    reconnectedMessages.push(JSON.parse(data.toString()))
  })

  wsReconnect.send(JSON.stringify({ type: 'open', sessionId, cols: 120, rows: 30 }))

  const reconnectStart = Date.now()
  while (!reconnectedMessages.some((m) => m.type === 'opened') && Date.now() - reconnectStart < 5000) {
    await new Promise((r) => setTimeout(r, 100))
  }

  const reopenedMsg = reconnectedMessages.find((m) => m.type === 'opened')
  assert.ok(reopenedMsg, 'Should receive opened message after reconnect')
  assert.strictEqual(reopenedMsg.pid, openedMsg.pid, 'PID should stay the same after reconnect')
  assert.ok(typeof reopenedMsg.scrollback === 'string', 'Reconnect should include scrollback')
  assert.ok(reopenedMsg.scrollback.includes(marker), 'Scrollback should preserve previous output')

  wsReconnect.send(JSON.stringify({ type: 'close', sessionId }))
  await new Promise((r) => setTimeout(r, 300))
  assert.strictEqual(ptyManager.getSession(sessionId), undefined, 'Session should close only after explicit close')

  wsReconnect.close()
  detachUpgrade()
  bridge.dispose()
  server.close()
})
