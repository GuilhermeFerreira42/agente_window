import { describe, expect, it } from 'vitest'
import { isLoopbackBind, validateLocalRequest } from '../../server/local-boundary.mjs'

function request(headers: Record<string, string> = {}, method = 'GET', localPort = 5174, url = '/') {
  return {
    method,
    url,
    headers,
    socket: { localPort, encrypted: false },
  } as never
}

describe('local product boundary', () => {
  it('accepts only explicit loopback bind values', () => {
    expect(isLoopbackBind('127.0.0.1')).toBe(true)
    expect(isLoopbackBind('localhost')).toBe(true)
    expect(isLoopbackBind('::1')).toBe(true)
    expect(isLoopbackBind('0.0.0.0')).toBe(false)
    expect(isLoopbackBind(true)).toBe(false)
  })

  it('accepts local Host with no Origin for a direct safe read', () => {
    expect(validateLocalRequest(request({ host: '127.0.0.1:5174' })).ok).toBe(true)
  })

  it('requires exact local Host, including the listener port', () => {
    expect(validateLocalRequest(request({ host: 'dev.example.test:5174' })).ok).toBe(false)
    expect(validateLocalRequest(request({ host: 'localhost:5175' })).ok).toBe(false)
    expect(validateLocalRequest(request({})).ok).toBe(false)
  })

  it('allows same-origin JSON mutations and rejects cross-origin/forged requests', () => {
    expect(validateLocalRequest(request({
      host: 'localhost:5174', origin: 'http://localhost:5174',
      'content-type': 'application/json; charset=utf-8', 'sec-fetch-site': 'same-origin',
    }, 'POST', 5174, '/api/providers')).ok).toBe(true)
    expect(validateLocalRequest(request({
      host: 'localhost:5174', origin: 'http://localhost:5174',
      'content-type': 'application/json', 'sec-fetch-site': 'same-origin',
    }, 'POST', 5174, '/api/agir/mode')).ok).toBe(true)
    expect(validateLocalRequest(request({ host: 'localhost:5174' }, 'POST', 5174, '/api/agir/mode')).ok).toBe(false)
    expect(validateLocalRequest(request({
      host: 'localhost:5174', origin: 'http://attacker.test', 'content-type': 'application/json',
    }, 'POST', 5174, '/api/providers')).ok).toBe(false)
    expect(validateLocalRequest(request({
      host: 'localhost:5174', origin: 'http://127.0.0.1:5174', 'content-type': 'application/json',
    }, 'POST', 5174, '/api/providers')).ok).toBe(false)
    expect(validateLocalRequest(request({ host: 'localhost:5174' }, 'POST', 5174, '/api/providers')).ok).toBe(false)
    expect(validateLocalRequest(request({
      host: 'localhost:5174', origin: 'http://localhost:5174', 'content-type': 'text/plain',
    }, 'POST', 5174, '/api/providers')).ok).toBe(false)
    expect(validateLocalRequest(request({
      host: 'localhost:5174', origin: 'http://localhost:5174', 'content-type': 'application/json', 'sec-fetch-site': 'same-site',
    }, 'POST', 5174, '/api/providers')).ok).toBe(false)
  })

  it('requires same-origin Fetch Metadata for sensitive reads without Origin', () => {
    expect(validateLocalRequest(request({ host: '127.0.0.1:5174' })).ok).toBe(true) // static app document
    expect(validateLocalRequest(request({ host: '127.0.0.1:5174' }, 'GET', 5174, '/api/providers')).ok).toBe(false)
    expect(validateLocalRequest(request({ host: '127.0.0.1:5174', 'sec-fetch-site': 'same-origin' }, 'GET', 5174, '/api/providers')).ok).toBe(true)
    expect(validateLocalRequest(request({ host: '127.0.0.1:5174', 'sec-fetch-site': 'same-origin' }, 'GET', 5174, '/fs/workspace')).ok).toBe(true)
    expect(validateLocalRequest(request({ host: '127.0.0.1:5174', 'sec-fetch-site': 'none' }, 'GET', 5174, '/api/providers')).ok).toBe(false)
  })

  it('C3a — only the upload content route accepts a binary octet-stream body (else json_required)', () => {
    const upload = '/api/sessions/abc/chats/def/attachments/uploads/u1/content'
    const cabecalhos = { host: 'localhost:5174', origin: 'http://localhost:5174', 'sec-fetch-site': 'same-origin' }
    // A rota de conteúdo do upload aceita o File como corpo binário…
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-stream' }, 'PUT', 5174, upload)).ok).toBe(true)
    const explorer = '/api/explorer/abc/def/fs/upload'
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-stream' }, 'POST', 5174, explorer)).ok).toBe(true)
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-stream' }, 'PUT', 5174, explorer)).ok).toBe(false)
    // As demais mutações sensíveis continuam exigindo JSON.
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-stream' }, 'POST', 5174, '/api/providers')).ok).toBe(false)
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-stream' }, 'PUT', 5174, '/api/sessions/abc')).ok).toBe(false)
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-stream' }, 'PUT', 5174, `${upload}/extra`)).ok).toBe(false)
    // Mesma origem/Host/Fetch Metadata continuam obrigatórios para o binário.
    expect(validateLocalRequest(request({ host: 'localhost:5174', origin: 'http://attacker.test', 'content-type': 'application/octet-stream' }, 'PUT', 5174, upload)).ok).toBe(false)
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-stream', 'sec-fetch-site': 'cross-site' }, 'PUT', 5174, upload)).ok).toBe(false)
    // Content-Type ambíguo (prefixo) não passa como binário.
    expect(validateLocalRequest(request({ ...cabecalhos, 'content-type': 'application/octet-streamx' }, 'PUT', 5174, upload)).ok).toBe(false)
  })

  it('requires Origin on upgrades and rejects cross-site fetch metadata', () => {
    expect(validateLocalRequest(request({ host: 'localhost:5174', origin: 'http://localhost:5174' }), { requireOrigin: true }).ok).toBe(true)
    expect(validateLocalRequest(request({ host: 'localhost:5174' }), { requireOrigin: true }).ok).toBe(false)
    expect(validateLocalRequest(request({ host: 'localhost:5174', 'sec-fetch-site': 'cross-site' })).ok).toBe(false)
  })
})
