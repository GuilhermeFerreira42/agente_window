import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'

export function dimensoesPNG(bytes: Buffer): { width: number; height: number } {
  const { width, height } = PNG.sync.read(bytes, { checkCRC: true })
  return { width, height }
}

export function dimensoesJPEG(bytes: Buffer, maxPixels: number): { width: number; height: number } {
  const { width, height } = jpeg.decode(bytes, {
    useTArray: true, tolerantDecoding: false, maxResolutionInMP: maxPixels / 1_000_000, maxMemoryUsageInMB: 64,
  })
  return { width, height }
}

export function codificarPNG(width: number, height: number, pintar: (pixels: Buffer) => void): Buffer {
  const png = new PNG({ width, height })
  pintar(png.data)
  return PNG.sync.write(png)
}
