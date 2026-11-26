import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { transcreverAudioLocal } from './leitorAudio'

const exemplo = readFileSync(resolve('e2e/fixtures/frase-lanterna.wav'))
afterEach(() => vi.unstubAllEnvs())

describe('transcrição local de áudio', () => {
  it('não inicia sem configuração, com áudio inválido ou cancelamento prévio', async () => {
    vi.stubEnv('AGENTE_WINDOW_WHISPER_PYTHON', '')
    vi.stubEnv('AGENTE_WINDOW_WHISPER_MODEL', '')
    expect(await transcreverAudioLocal(exemplo)).toBeNull()
    vi.stubEnv('AGENTE_WINDOW_WHISPER_PYTHON', process.execPath)
    vi.stubEnv('AGENTE_WINDOW_WHISPER_MODEL', 'indisponível')
    expect(await transcreverAudioLocal(Buffer.from('não é wav'))).toBeNull()
    const cancelado = new AbortController(); cancelado.abort()
    expect(await transcreverAudioLocal(exemplo, cancelado.signal)).toBeNull()
  })
  it('informa indisponibilidade quando o executável não existe', async () => {
    vi.stubEnv('AGENTE_WINDOW_WHISPER_PYTHON', resolve('executavel-que-nao-existe'))
    vi.stubEnv('AGENTE_WINDOW_WHISPER_MODEL', 'indisponível')
    expect(await transcreverAudioLocal(exemplo)).toBeNull()
  })
  it.skipIf(!process.env.AGENTE_WINDOW_WHISPER_PYTHON || !process.env.AGENTE_WINDOW_WHISPER_MODEL)('transcreve uma frase real com o modelo local configurado', async () => {
    const resultado = await transcreverAudioLocal(exemplo)
    expect(resultado?.idioma).toBe('pt')
    expect(resultado?.texto.toLowerCase()).toContain('mesa')
    expect(resultado?.texto.toLowerCase()).toContain('madeira')
  }, 90_000)
  it.skipIf(!process.env.AGENTE_WINDOW_WHISPER_PYTHON || !process.env.AGENTE_WINDOW_WHISPER_MODEL)('limita concorrência e interrompe a transcrição cancelada', async () => {
    const sinal = new AbortController()
    const emCurso = transcreverAudioLocal(exemplo, sinal.signal)
    expect(await transcreverAudioLocal(exemplo)).toBeNull()
    sinal.abort()
    expect(await emCurso).toBeNull()
  })
})
