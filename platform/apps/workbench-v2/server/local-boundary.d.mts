import type { IncomingMessage } from 'node:http'

export function validateLocalRequest(
  request: IncomingMessage,
  options?: { requireOrigin?: boolean },
): { ok: true } | { ok: false; reason: 'host' | 'host_port' | 'cross_site' | 'origin_required' | 'origin' | 'origin_mismatch' }

export function isLoopbackBind(host: unknown): boolean
