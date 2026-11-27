import { SEGUNDOS_DITADO, TAXA_DITADO } from '../domain/ditado'

export async function prepararWavDitado(gravacao: Blob): Promise<ArrayBuffer> {
  const contexto = new OfflineAudioContext(1, 1, TAXA_DITADO)
  const audio = await contexto.decodeAudioData(await gravacao.arrayBuffer())
  const amostras = Math.min(audio.length, SEGUNDOS_DITADO * TAXA_DITADO)
  if (!amostras) throw new Error('Gravação vazia.')
  const pcm = new ArrayBuffer(44 + amostras * 2)
  const wav = new DataView(pcm)
  wav.setUint32(0, 0x52494646) // RIFF
  wav.setUint32(4, pcm.byteLength - 8, true)
  wav.setUint32(8, 0x57415645) // WAVE
  wav.setUint32(12, 0x666d7420) // fmt
  wav.setUint32(16, 16, true)
  wav.setUint16(20, 1, true)
  wav.setUint16(22, 1, true)
  wav.setUint32(24, TAXA_DITADO, true)
  wav.setUint32(28, TAXA_DITADO * 2, true)
  wav.setUint16(32, 2, true)
  wav.setUint16(34, 16, true)
  wav.setUint32(36, 0x64617461) // data
  wav.setUint32(40, amostras * 2, true)

  const canais = Array.from({ length: audio.numberOfChannels }, (_, canal) => audio.getChannelData(canal))
  for (let i = 0; i < amostras; i++) {
    const media = canais.reduce((soma, canal) => soma + canal[i], 0) / canais.length
    const amostra = Math.max(-1, Math.min(1, media))
    wav.setInt16(44 + i * 2, amostra < 0 ? amostra * 32768 : amostra * 32767, true)
  }
  return pcm
}
