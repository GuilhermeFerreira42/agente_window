import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { quadroSelecionadoVideo } from './quadroSelecionadoVideo'

const video = readFileSync(resolve('e2e/fixtures/quadro-vermelho.mp4'))
afterEach(() => vi.unstubAllEnvs())

describe('quadro visual local de vídeo', () => {
  it('informa indisponibilidade sem decodificador, em formato inválido ou cancelado', async () => {
    vi.stubEnv('AGENTE_WINDOW_VIDEO_PYTHON', '')
    expect(await quadroSelecionadoVideo(video)).toBeNull()
    vi.stubEnv('AGENTE_WINDOW_VIDEO_PYTHON', process.execPath)
    expect(await quadroSelecionadoVideo(Buffer.from('inválido'))).toBeNull()
    const cancelado = new AbortController(); cancelado.abort()
    expect(await quadroSelecionadoVideo(video, cancelado.signal)).toBeNull()
  })
  it.skipIf(!process.env.AGENTE_WINDOW_VIDEO_PYTHON)('extrai quadro próximo à metade de MP4 MPEG-4 e preserva detalhe visual', async () => {
    // Confere independentemente o primeiro quadro: o detalhe vermelho só
    // surge depois, logo não é possível passar extraindo apenas a abertura.
    const abertura = spawnSync(process.env.AGENTE_WINDOW_VIDEO_PYTHON!, ['-I', '-c', "import av,io,sys; v=av.open(io.BytesIO(sys.stdin.buffer.read())); print(','.join(map(str,next(v.decode(video=0)).to_ndarray(format='rgb24')[60,80])))"], { input: video, encoding: 'utf8' })
    expect(abertura.status).toBe(0)
    const rgb = abertura.stdout.trim().split(',').map(Number)
    expect(rgb[2]).toBeGreaterThan(130); expect(rgb[0]).toBeLessThan(50)
    const quadro = await quadroSelecionadoVideo(video)
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
    const pendente = quadroSelecionadoVideo(video, sinal.signal)
    expect(await quadroSelecionadoVideo(video)).toBeNull()
    sinal.abort()
    expect(await pendente).toBeNull()
  })
})
