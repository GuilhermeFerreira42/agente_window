// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { ambienteMultimidia } from './ambienteMultimidia'

afterEach(() => vi.unstubAllEnvs())
it('não entrega credenciais nem ambiente arbitrário ao decodificador', () => {
  vi.stubEnv('OPENAI_API_KEY', 'segredo-ficticio')
  vi.stubEnv('AGENTE_WINDOW_VIDEO_PYTHON', 'caminho-ficticio')
  const env = ambienteMultimidia({ OMP_NUM_THREADS: '1' })
  expect(env.OPENAI_API_KEY).toBeUndefined()
  expect(env.AGENTE_WINDOW_VIDEO_PYTHON).toBeUndefined()
  expect(env.OMP_NUM_THREADS).toBe('1')
  expect(env.PATH).toBe(process.env.PATH)
})
