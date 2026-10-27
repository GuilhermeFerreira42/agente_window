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

  it('requires Origin on upgrades and rejects cross-site fetch metadata', () => {
    expect(validateLocalRequest(request({ host: 'localhost:5174', origin: 'http://localhost:5174' }), { requireOrigin: true }).ok).toBe(true)
    expect(validateLocalRequest(request({ host: 'localhost:5174' }), { requireOrigin: true }).ok).toBe(false)
    expect(validateLocalRequest(request({ host: 'localhost:5174', 'sec-fetch-site': 'cross-site' })).ok).toBe(false)
  })
})
