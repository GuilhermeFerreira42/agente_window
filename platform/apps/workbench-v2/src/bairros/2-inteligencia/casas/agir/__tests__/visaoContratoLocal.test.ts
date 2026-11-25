// Prova apenas o contrato do serializador com servidor controlado; não prova
// que a interface usa este caminho nem capacidade de um provedor externo.
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { inspecionarImagemVisao } from '../server/imagemVisao'
import { partesVisaoOpenAI } from '../server/visaoOpenAI'

describe('MM-I — contrato local do formato de visão', () => {
  it('recebe os mesmos bytes e retorna texto em streaming SSE', async () => {
    const imagem = new PNG({ width: 2, height: 1 })
    imagem.data = Buffer.from([255, 0, 0, 255, 0, 0, 255, 255])
    const original = PNG.sync.write(imagem)
    const metadados = inspecionarImagemVisao(original)
    let recebido: { modelo: string; texto: string; digest: string } | undefined
    const server = createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on('data', chunk => chunks.push(Buffer.from(chunk)))
      req.on('end', () => {
        try {
          const corpo = JSON.parse(Buffer.concat(chunks).toString())
          const partes = corpo.messages[0].content
          const uri = String(partes[1].image_url.url)
          if (req.url !== '/chat/completions' || !uri.startsWith('data:image/png;base64,')) throw new Error('contrato incorreto')
          const bytes = Buffer.from(uri.slice('data:image/png;base64,'.length), 'base64')
          recebido = { modelo: corpo.model, texto: partes[0].text, digest: createHash('sha256').update(bytes).digest('hex') }
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.write('data: {"choices":[{"delta":{"content":"Vermelho"}}]}\n\n')
          res.end('data: [DONE]\n\n')
        } catch { res.writeHead(400); res.end() }
      })
    })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const endereco = server.address()
      if (!endereco || typeof endereco === 'string') throw new Error('fixture indisponível')
      const resposta = await fetch(`http://127.0.0.1:${endereco.port}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'modelo-fixture', stream: true, messages: [{ role: 'user', content: partesVisaoOpenAI('Que cores?', [{ mime: metadados.mime, bytes: original }]) }] }),
      })
      expect(resposta.status).toBe(200)
      expect(await resposta.text()).toContain('Vermelho')
      expect(recebido).toEqual({ modelo: 'modelo-fixture', texto: 'Que cores?', digest: createHash('sha256').update(original).digest('hex') })
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
})
