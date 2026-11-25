// @vitest-environment node
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { criarProvedorVisaoLocal } from '../../../../../../e2e/fixtures/provedorVisaoLocal'
import { construirCorpoVisaoOpenAI, LIMITES_LOCAIS_VISAO } from '../server/limitesVisao'
import { tratarRotasAgir, type DependenciasAgir } from '../server/rotas'

const texto = 'Qual é a cor sintética?'
const modelo = 'modelo-local-fixo'
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')

describe('provedor simulado local', () => {
  it('confere bytes, modelo e texto para o corpo isolado e rejeita divergência', async () => {
    const p = new PNG({ width: 1, height: 1 }); p.data = Buffer.from([255, 0, 0, 255])
    const bytes = PNG.sync.write(p)
    const provedor = await criarProvedorVisaoLocal({ texto, modelo, imagens: [{ mime: 'image/png', sha256: sha(bytes) }] })
    try {
      const corpo = construirCorpoVisaoOpenAI({ model: modelo, messages: [{ role: 'user', content: texto }], stream: true }, [bytes], LIMITES_LOCAIS_VISAO).corpo
      const resposta = await fetch(`${provedor.baseUrl}/chat/completions`, { method: 'POST', body: JSON.stringify(corpo) })
      expect(resposta.status).toBe(200)
      expect(await resposta.text()).toContain('Resposta ')
      const invalida = await fetch(`${provedor.baseUrl}/chat/completions`, { method: 'POST', body: JSON.stringify({ ...corpo, model: 'outro' }) })
      expect(invalida.status).toBe(400)
      expect(provedor.registros.map(r => r.valido)).toEqual([true, false])
      expect(JSON.stringify(provedor.registros)).not.toContain('base64')
    } finally { await provedor.fechar() }
  })

  it('a rota HTTP real /api/agir usa o mesmo provedor para texto e devolve SSE', async () => {
    const provedor = await criarProvedorVisaoLocal({ texto, modelo, imagens: [] })
    const alvo = { providerId: 'fixture', modelId: modelo, modelo, protocolo: 'openai-chat' as const, baseUrl: provedor.baseUrl, apiKey: null }
    const deps: DependenciasAgir = {
      obterAlvo: async () => ({ alvo }),
      resolverContexto: () => ({ ok: true, raiz: null, permissoes: [] }),
      concederPermissaoSessao: () => {}, lerModo: () => 'ask', definirModo: () => {}, lerTeto: async () => 2,
    }
    const app = createServer((req, res) => {
      void tratarRotasAgir(req, res, new URL(req.url ?? '/', 'http://127.0.0.1'), deps)
        .then(tratado => { if (!tratado) { res.statusCode = 404; res.end() } })
        .catch(() => { res.statusCode = 500; res.end() })
    })
    app.listen(0, '127.0.0.1'); await once(app, 'listening')
    try {
      const endereco = app.address()
      if (!endereco || typeof endereco === 'string') throw new Error('fixture indisponível')
      const resposta = await fetch(`http://127.0.0.1:${endereco.port}/api/agir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'sid-fixture', chatId: 'cid-fixture', fluxo: 'fluxo-fixture-local', modelSelection: { tipo: 'explicita', providerId: 'fixture', modelId: modelo }, messages: [{ role: 'user', content: texto }] }),
      })
      expect(resposta.status).toBe(200)
      const fio = await resposta.text()
      expect(fio).toContain('Resposta ')
      expect(fio).toContain('simulada.')
      expect(fio).toContain('"type":"done"')
      expect(provedor.registros).toEqual([{ caminho: '/v1/chat/completions', modelo, texto, imagens: [], valido: true }])
    } finally {
      app.closeAllConnections()
      await new Promise<void>((resolve, reject) => app.close(error => error ? reject(error) : resolve()))
      await provedor.fechar()
    }
  })
})
