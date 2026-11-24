// Provedor controlado EXCLUSIVO para testes: escuta somente loopback numa porta
// efêmera. Não integra o produto e não prova visão de nenhum serviço real.
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'

export interface ImagemEsperada {
  mime: 'image/png' | 'image/jpeg'
  sha256: string
}
export interface PedidoEsperado {
  modelo: string
  texto: string
  imagens: readonly ImagemEsperada[]
}
export interface RegistroProvedorLocal {
  caminho: string
  modelo: string
  texto: string
  imagens: ImagemEsperada[]
  valido: boolean
}

/** A captura retém somente texto sintético e hashes, nunca base64 ou bytes. */
export async function criarProvedorVisaoLocal(esperado: PedidoEsperado): Promise<{
  baseUrl: string
  registros: RegistroProvedorLocal[]
  requisicoes: Array<{ metodo: string; caminho: string }>
  fechar: () => Promise<void>
}> {
  const registros: RegistroProvedorLocal[] = []
  const requisicoes: Array<{ metodo: string; caminho: string }> = []
  const servidor: Server = createServer((req, res) => {
    requisicoes.push({ metodo: req.method ?? '', caminho: req.url ?? '' })
    // Descoberta de contexto não é uma chamada de análise e esta fixture não
    // declara capacidade nela; os testes contabilizam apenas chat/completions.
    if (req.method === 'GET') { res.writeHead(404); res.end(); return }
    const chunks: Buffer[] = []
    let tamanho = 0, grande = false
    req.on('data', (pedaco: Buffer) => {
      tamanho += pedaco.length
      if (tamanho > 10 * 1024 * 1024) grande = true
      if (!grande) chunks.push(Buffer.from(pedaco))
    })
    req.on('end', () => {
      const registro: RegistroProvedorLocal = { caminho: req.url ?? '', modelo: '', texto: '', imagens: [], valido: false }
      try {
        if (grande || req.method !== 'POST' || req.url !== '/v1/chat/completions') throw new Error('rota')
        const corpo = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { model?: unknown; stream?: unknown; messages?: unknown }
        if (typeof corpo.model !== 'string' || corpo.stream !== true || !Array.isArray(corpo.messages)) throw new Error('pedido')
        registro.modelo = corpo.model
        const mensagens = corpo.messages as Array<{ role?: unknown; content?: unknown }>
        const atual = [...mensagens].reverse().find((m) => m.role === 'user')
        if (!atual || mensagens.some((m) => m !== atual && Array.isArray(m.content))) throw new Error('histórico')
        if (typeof atual.content === 'string') registro.texto = atual.content
        else if (Array.isArray(atual.content)) {
          const partes = atual.content as Array<{ type?: unknown; text?: unknown; image_url?: { url?: unknown } }>
          if (partes[0]?.type !== 'text' || typeof partes[0].text !== 'string') throw new Error('texto')
          registro.texto = partes[0].text
          for (const parte of partes.slice(1)) {
            if (parte.type !== 'image_url' || typeof parte.image_url?.url !== 'string') throw new Error('imagem')
            const correspondencia = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(parte.image_url.url)
            if (!correspondencia) throw new Error('data URL')
            const bytes = Buffer.from(correspondencia[2], 'base64')
            if (bytes.toString('base64') !== correspondencia[2]) throw new Error('base64')
            registro.imagens.push({ mime: correspondencia[1] as ImagemEsperada['mime'], sha256: createHash('sha256').update(bytes).digest('hex') })
          }
        } else throw new Error('conteúdo')
        registro.valido = registro.modelo === esperado.modelo && registro.texto === esperado.texto &&
          JSON.stringify(registro.imagens) === JSON.stringify(esperado.imagens)
      } catch { /* a resposta de erro não expõe corpo nem dados binários */ }
      registros.push(registro)
      if (!registro.valido) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end('{"error":{"message":"fixture mismatch"}}'); return }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' })
      res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'Resposta ' } }] })}\n\n`)
      setImmediate(() => {
        if (res.destroyed) return
        res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'simulada.' }, finish_reason: 'stop' }] })}\n\n`)
        res.end('data: [DONE]\n\n')
      })
    })
  })
  servidor.listen(0, '127.0.0.1')
  await once(servidor, 'listening')
  const endereco = servidor.address()
  if (!endereco || typeof endereco === 'string') throw new Error('Porta local indisponível.')
  return {
    baseUrl: `http://127.0.0.1:${endereco.port}/v1`, registros, requisicoes,
    fechar: () => new Promise<void>((resolve, reject) => {
      servidor.closeAllConnections()
      servidor.close((erro) => erro ? reject(erro) : resolve())
    }),
  }
}
