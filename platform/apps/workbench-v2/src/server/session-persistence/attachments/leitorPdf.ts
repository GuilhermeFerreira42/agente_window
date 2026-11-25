// Extração local limitada em worker descartável; nunca renderiza nem executa JS do PDF.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'

const MAX_PDF = 8 * 1024 * 1024
const MAX_ATIVOS = 2
let ativos = 0

const programa = `
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const pdfjs = await import(workerData.moduleUrl);
  const task = pdfjs.getDocument({ data: new Uint8Array(workerData.bytes), isEvalSupported: false,
    useSystemFonts: false, disableFontFace: true, stopAtErrors: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 20) throw new Error('limite de páginas');
    const paginas = []; let tamanho = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const conteudo = await page.getTextContent();
      const texto = conteudo.items.map(item => typeof item.str === 'string' ? item.str + (item.hasEOL ? '\\n' : ' ') : '').join('').trim();
      tamanho += texto.length;
      if (tamanho > 16000) throw new Error('limite de texto');
      paginas.push(texto); page.cleanup();
    }
    parentPort.postMessage({ texto: paginas.join('\\n\\n').trim(), paginas: pdf.numPages });
  } finally { await task.destroy(); }
})().catch(() => parentPort.postMessage({ erro: true }));
`

export async function extrairTextoPdf(bytes: Buffer, sinal?: AbortSignal): Promise<{ texto: string; paginas: number } | null> {
  if (bytes.length > MAX_PDF || !bytes.subarray(0, 5).equals(Buffer.from('%PDF-')) || ativos >= MAX_ATIVOS || sinal?.aborted) return null
  let moduleUrl: string
  try { moduleUrl = pathToFileURL(createRequire(import.meta.url).resolve('pdfjs-dist/legacy/build/pdf.mjs')).href } catch { return null }
  ativos += 1
  let worker: Worker | undefined
  try {
    worker = new Worker(programa, { eval: true, workerData: { bytes, moduleUrl }, resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16 }, stdout: true, stderr: true })
    worker.stdout?.resume(); worker.stderr?.resume()
    const resultado = await new Promise<{ texto: string; paginas: number } | null>(resolve => {
      let finalizado = false
      const fim = (valor: { texto: string; paginas: number } | null) => {
        if (finalizado) return
        finalizado = true; clearTimeout(relogio); sinal?.removeEventListener('abort', cancelar); resolve(valor)
      }
      const cancelar = () => fim(null)
      const relogio = setTimeout(cancelar, 8_000)
      sinal?.addEventListener('abort', cancelar, { once: true })
      if (sinal?.aborted) return cancelar()
      worker!.once('error', cancelar)
      worker!.once('exit', cancelar)
      worker!.once('message', (valor: unknown) => {
        if (!valor || typeof valor !== 'object') return fim(null)
        const r = valor as { texto?: unknown; paginas?: unknown }
        fim(typeof r.texto === 'string' && r.texto.length <= 16_000 && Number.isSafeInteger(r.paginas) && typeof r.paginas === 'number' && r.paginas <= 20 ? { texto: r.texto, paginas: r.paginas } : null)
      })
    })
    return resultado
  } catch { return null } finally { if (worker) await worker.terminate().catch(() => undefined); ativos -= 1 }
}
