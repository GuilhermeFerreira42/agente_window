// Transcrição opcional, local e limitada de WAV PCM. Não envia conteúdo pela rede.
// A disponibilidade exige configuração explícita do operador; o modelo permanece
// fora do repositório. O chamador deve obter consentimento antes de chamar.
import { spawn } from 'node:child_process'
import { ambienteMultimidia } from './ambienteMultimidia'

const MAX_BYTES = 2 * 1024 * 1024
const MAX_TEXTO = 16_000
let ativo = false
const programa = String.raw`
import io, json, os, sys, wave
try:
    import numpy as np
    from faster_whisper import WhisperModel
    dados = sys.stdin.buffer.read(2097153)
    if len(dados) > 2097152:
        raise ValueError('tamanho')
    with wave.open(io.BytesIO(dados), 'rb') as audio:
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or audio.getframerate() != 16000 or audio.getcomptype() != 'NONE' or audio.getnframes() > 960000:
            raise ValueError('formato')
        frames = audio.readframes(audio.getnframes())
    if len(frames) % 2 or not frames:
        raise ValueError('dados')
    amostras = np.frombuffer(frames, dtype='<i2').astype(np.float32) / 32768.0
    modelo = WhisperModel(os.environ['AGENTE_WINDOW_WHISPER_MODEL'], device='cpu', compute_type='int8', cpu_threads=2, local_files_only=True)
    # Sem fallback de amostragem aleatória: a mesma fonte deve produzir uma
    # transcrição reproduzível; isso não elimina erros do modelo.
    segmentos, info = modelo.transcribe(amostras, language='pt', beam_size=3, vad_filter=False, temperature=0.0)
    texto = ' '.join(segmento.text.strip() for segmento in segmentos).strip()
    if not texto or len(texto) > 16000:
        raise ValueError('texto')
    print(json.dumps({'texto': texto, 'idioma': info.language}, ensure_ascii=True), flush=True)
except Exception:
    sys.exit(1)
`

/** Apenas WAV mono, PCM 16-bit, 16 kHz e até 60 s; null é indisponível/cancelado. */
export async function transcreverAudioLocal(bytes: Buffer, sinal?: AbortSignal): Promise<{ texto: string; idioma: string } | null> {
  const python = process.env.AGENTE_WINDOW_WHISPER_PYTHON
  const modelo = process.env.AGENTE_WINDOW_WHISPER_MODEL
  if (!python || !modelo || ativo || sinal?.aborted || bytes.length > MAX_BYTES || bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') return null
  ativo = true
  try {
    return await new Promise(resolve => {
      let finalizado = false, saida = '', tamanho = 0
      const filho = spawn(python, ['-I', '-c', programa], { stdio: ['pipe', 'pipe', 'ignore'], env: ambienteMultimidia({ AGENTE_WINDOW_WHISPER_MODEL: modelo, HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1', OMP_NUM_THREADS: '2' }), windowsHide: true })
      const finalizar = (valor: { texto: string; idioma: string } | null) => {
        if (finalizado) return
        finalizado = true; clearTimeout(relogio); sinal?.removeEventListener('abort', cancelar)
        if (filho.exitCode === null) filho.kill()
        resolve(valor)
      }
      const cancelar = () => finalizar(null)
      const relogio = setTimeout(cancelar, 90_000)
      sinal?.addEventListener('abort', cancelar, { once: true })
      if (sinal?.aborted) cancelar()
      filho.on('error', () => { if (!filho.pid) ativo = false; cancelar() })
      filho.stdin.on('error', () => undefined)
      filho.stdout.on('data', (parte: Buffer) => {
        tamanho += parte.length
        if (tamanho > 64 * 1024) return cancelar()
        saida += parte.toString('utf8')
      })
      filho.on('close', codigo => {
        ativo = false
        if (codigo !== 0) return finalizar(null)
        try {
          const r = JSON.parse(saida) as { texto?: unknown; idioma?: unknown }
          finalizar(typeof r.texto === 'string' && r.texto.length > 0 && r.texto.length <= MAX_TEXTO && typeof r.idioma === 'string' && /^[a-z]{2,3}$/u.test(r.idioma) ? { texto: r.texto, idioma: r.idioma } : null)
        } catch { finalizar(null) }
      })
      filho.stdin.end(bytes)
    })
  } catch { ativo = false; return null }
}
