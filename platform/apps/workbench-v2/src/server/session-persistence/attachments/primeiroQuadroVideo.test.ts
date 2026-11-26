import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { primeiroQuadroVideo } from './primeiroQuadroVideo'

const video = readFileSync(resolve('e2e/fixtures/quadro-vermelho.mp4'))
afterEach(() => vi.unstubAllEnvs())

describe('quadro visual local de vídeo', () => {
  it('informa indisponibilidade sem decodificador, em formato inválido ou cancelado', async () => {
    vi.stubEnv('AGENTE_WINDOW_VIDEO_PYTHON', '')
    expect(await primeiroQuadroVideo(video)).toBeNull()
    vi.stubEnv('AGENTE_WINDOW_VIDEO_PYTHON', process.execPath)
    expect(await primeiroQuadroVideo(Buffer.from('inválido'))).toBeNull()
    const cancelado = new AbortController(); cancelado.abort()
    expect(await primeiroQuadroVideo(video, cancelado.signal)).toBeNull()
  })
  it.skipIf(!process.env.AGENTE_WINDOW_VIDEO_PYTHON)('extrai quadro inicial de MP4 MPEG-4 e preserva detalhe visual', async () => {
    const quadro = await primeiroQuadroVideo(video)
    expect(quadro).not.toBeNull()
    const { data, info } = await sharp(quadro!).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    expect([info.width, info.height, info.channels]).toEqual([160, 120, 3])
    const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)]
    expect(pixel(80, 60)[0]).toBeGreaterThan(180)
    expect(pixel(80, 60)[2]).toBeLessThan(50)
    expect(pixel(5, 5)[2]).toBeGreaterThan(130)
  }, 30_000)
  it.skipIf(!process.env.AGENTE_WINDOW_VIDEO_PYTHON)('cancela e limita a concorrência', async () => {
    const sinal = new AbortController()
    const pendente = primeiroQuadroVideo(video, sinal.signal)
    expect(await primeiroQuadroVideo(video)).toBeNull()
    sinal.abort()
    expect(await pendente).toBeNull()
  })
})
