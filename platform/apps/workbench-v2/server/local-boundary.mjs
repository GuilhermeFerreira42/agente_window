const LOOPBACK_NAMES = new Set(['localhost', '127.0.0.1', '[::1]'])
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function parseHost(value) {
  if (typeof value !== 'string' || value.trim() === '') return null
  try {
    const url = new URL(`http://${value}`)
    if (!LOOPBACK_NAMES.has(url.hostname.toLowerCase())) return null
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null
    return url
  } catch {
    return null
  }
}

/** Exact loopback Host + same-origin policy for the integrated local product. */
export function validateLocalRequest(request, { requireOrigin = false } = {}) {
  const host = parseHost(request.headers?.host)
  if (!host) return { ok: false, reason: 'host' }

  const localPort = request.socket?.localPort
  const effectiveHostPort = Number(host.port || (request.socket?.encrypted ? 443 : 80))
  if (typeof localPort === 'number' && localPort > 0 && effectiveHostPort !== localPort) {
    return { ok: false, reason: 'host_port' }
  }

  const fetchSiteHeader = request.headers?.['sec-fetch-site']
  const fetchSite = typeof fetchSiteHeader === 'string' ? fetchSiteHeader.toLowerCase() : null
  const originHeader = request.headers?.origin
  const method = String(request.method || 'GET').toUpperCase()
  const safeMethod = SAFE_METHODS.has(method)
  let pathname = '/'
  try {
    pathname = new URL(request.url || '/', `http://${host.host}`).pathname
  } catch {
    return { ok: false, reason: 'path' }
  }
  // APIs and filesystem/Git/PTY routes may expose private local state. A
  // browser read without Origin is accepted only when Fetch Metadata proves
  // same-origin; bare address-bar/non-browser reads remain limited to static UI.
  const sensitivePath = /^\/(?:api|fs|git|pty)(?:\/|$)/.test(pathname)
  if (fetchSite === 'cross-site') return { ok: false, reason: 'cross_site' }

  if (typeof originHeader !== 'string' || originHeader === '') {
    if (requireOrigin || !safeMethod) return { ok: false, reason: 'origin_required' }
    if (sensitivePath && fetchSite !== 'same-origin') return { ok: false, reason: 'same_origin_required' }
    return { ok: true }
  }

  let origin
  try {
    origin = new URL(originHeader)
  } catch {
    return { ok: false, reason: 'origin' }
  }
  const protocol = request.socket?.encrypted ? 'https:' : 'http:'
  const expectedOrigin = new URL(`${protocol}//${host.host}`).origin
  if (origin.protocol !== protocol || origin.origin !== expectedOrigin) {
    return { ok: false, reason: 'origin_mismatch' }
  }
  if (!safeMethod && sensitivePath) {
    if (fetchSite !== null && fetchSite !== 'same-origin') return { ok: false, reason: 'fetch_site' }
    const contentType = request.headers?.['content-type']
    if (typeof contentType !== 'string' || !/^application\/json(?:\s*;|\s*$)/i.test(contentType.trim())) {
      return { ok: false, reason: 'json_required' }
    }
  }
  return { ok: true }
}

export function isLoopbackBind(host) {
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return true
  return false
}
