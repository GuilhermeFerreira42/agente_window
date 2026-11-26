// Um quadro selecionado próximo ao meio de MP4, preparado após confirmação.
// O decodificador é opcional e isolado em subprocesso; o vídeo não sai do app.
import { spawn } from 'node:child_process'
import { ambienteMultimidia } from './ambienteMultimidia'

const MAX_VIDEO = 12 * 1024 * 1024
const MAX_QUADRO = 4 * 1024 * 1024
let ativo = false
const programa = String.raw`
import io, sys
try:
    import av
    dados = sys.stdin.buffer.read(12582913)
    if len(dados) > 12582912:
        raise ValueError('tamanho')
    with av.open(io.BytesIO(dados), mode='r', format='mov', options={'protocol_whitelist': 'pipe'}) as video:
        if video.duration is None or video.duration <= 0 or video.duration > 60000000 or len(video.streams.video) != 1:
            raise ValueError('duração ou streams')
        stream = video.streams.video[0]
        codec = stream.codec_context
        if codec.name != 'mpeg4' or not 0 < codec.width <= 1024 or not 0 < codec.height <= 1024 or codec.width * codec.height > 1048576:
            raise ValueError('codec ou dimensões')
        codec.thread_count = 1
        # Seleciona o primeiro quadro decodificado a partir da metade. Não
        # interpreta intervalos não amostrados nem usa timestamps do cliente.
        quadro = None
        inicio = None
        anterior = None
        for numero, candidato in enumerate(video.decode(stream)):
            if numero >= 5000 or candidato.time is None:
                raise ValueError('limite ou tempo')
            tempo = float(candidato.time)
            if inicio is None:
                inicio = tempo
            if anterior is not None and tempo < anterior:
                raise ValueError('tempo não monotônico')
            anterior = tempo
            if tempo - inicio >= video.duration / 2000000:
                quadro = candidato
                break
        if quadro is None or quadro.width != codec.width or quadro.height != codec.height:
            raise ValueError('quadro ou dimensões')
        encoder = av.CodecContext.create('png', 'w')
        encoder.width = quadro.width
        encoder.height = quadro.height
        encoder.pix_fmt = 'rgb24'
        encoder.thread_count = 1
        encoder.open()
        png = b''.join(bytes(p) for p in encoder.encode(quadro.reformat(format='rgb24')))
        png += b''.join(bytes(p) for p in encoder.encode(None))
        if not png or len(png) > 4194304:
            raise ValueError('quadro')
        sys.stdout.buffer.write(png)
except Exception:
    sys.exit(1)
`

/** Retorna um PNG efêmero ou null. O processo não recebe caminhos de usuário. */
export async function quadroSelecionadoVideo(bytes: Buffer, sinal?: AbortSignal): Promise<Buffer | null> {
  const python = process.env.AGENTE_WINDOW_VIDEO_PYTHON
  if (!python || ativo || sinal?.aborted || bytes.length > MAX_VIDEO || bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp') return null
  ativo = true
  try {
    return await new Promise(resolve => {
      let finalizado = false, tamanho = 0
      const partes: Buffer[] = []
      const filho = spawn(python, ['-I', '-c', programa], { stdio: ['pipe', 'pipe', 'ignore'], env: ambienteMultimidia({ OMP_NUM_THREADS: '1' }), windowsHide: true })
      const finalizar = (valor: Buffer | null) => {
        if (finalizado) return
        finalizado = true; clearTimeout(relogio); sinal?.removeEventListener('abort', cancelar)
        if (filho.exitCode === null) filho.kill()
        resolve(valor)
      }
      const cancelar = () => finalizar(null)
      const relogio = setTimeout(cancelar, 15_000)
      sinal?.addEventListener('abort', cancelar, { once: true })
      if (sinal?.aborted) cancelar()
      filho.on('error', () => { if (!filho.pid) ativo = false; cancelar() })
      filho.stdin.on('error', () => undefined)
      filho.stdout.on('data', (parte: Buffer) => {
        tamanho += parte.length
        if (tamanho > MAX_QUADRO) return cancelar()
        partes.push(parte)
      })
      filho.on('close', codigo => {
        ativo = false
        if (codigo !== 0) return finalizar(null)
        const png = Buffer.concat(partes)
        finalizar(png.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? png : null)
      })
      filho.stdin.end(bytes)
    })
  } catch { ativo = false; return null }
}
