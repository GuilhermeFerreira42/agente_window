import { createHash, randomInt } from 'node:crypto'
import { PNG } from 'pngjs'
import type { AlvoConversa, IniciarChamadaModelo } from '../../conversa'
import { construirProvaVisao, provaVisaoDoSimulador, type FonteVisao } from './admissaoVisao'
import { identidadeVisao, type RevisoesVisao } from './capacidadeVisao'
import { partesVisaoOpenAI } from './visaoOpenAI'

const REVISOES: RevisoesVisao = { configuracao: 'provedores-v1', api: 'openai-chat-completions-v1' }
const TTL = 30 * 60_000
const provas = new Map<string, { ate: number; consultadaEm: string; destinoLiteLLM?: string }>()
let verificando = false

function podeVerificarVisao(alvo: AlvoConversa): boolean {
  if (alvo.protocolo !== 'openai-chat' || !alvo.configRevision || !alvo.apiKey || !alvo.baseUrl) return false
  const url = URL.parse(alvo.baseUrl)
  return Boolean(url && (url.protocol === 'https:' || url.protocol === 'http:') &&
    !url.username && !url.password && !url.search && !url.hash)
}

function chave(alvo: AlvoConversa): string | undefined {
  const identidade = podeVerificarVisao(alvo) && identidadeVisao(alvo, REVISOES)
  return identidade ? JSON.stringify(identidade) : undefined
}

export function identidadeVerificacaoVisao(alvo: AlvoConversa): string | undefined {
  const identidade = chave(alvo)
  return identidade ? createHash('sha256').update(identidade).digest('hex') : undefined
}

export const fonteDeVisao: FonteVisao = (alvo) => {
  const fixture = provaVisaoDoSimulador(alvo)
  if (fixture) return fixture
  const atual = chave(alvo)
  const prova = atual ? provas.get(atual) : undefined
  if (!prova || prova.ate <= Date.now()) return undefined
  const comprovada = construirProvaVisao(alvo, REVISOES, prova.consultadaEm)
  return comprovada && { ...comprovada, destinoLiteLLM: prova.destinoLiteLLM }
}

const DIGITOS = [
  '111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111',
]

function imagemDaProva(texto: string): Buffer {
  const escala = 12
  const png = new PNG({ width: (texto.length * 4 + 1) * escala, height: 7 * escala })
  png.data.fill(255)
  for (let posicao = 0; posicao < texto.length; posicao++) {
    const desenho = DIGITOS[Number(texto[posicao])]
    for (let i = 0; i < desenho.length; i++) {
      if (desenho[i] !== '1') continue
      for (let dy = 0; dy < escala; dy++) {
        const linha = (Math.floor(i / 3) + 1) * escala + dy
        const inicio = (linha * png.width + (i % 3 + 1 + posicao * 4) * escala) * 4
        for (let x = inicio; x < inicio + escala * 4; x += 4) png.data.fill(0, x, x + 3)
      }
    }
  }
  return PNG.sync.write(png)
}

async function receberTexto(resposta: Response): Promise<string | undefined> {
  if (!resposta.ok || !resposta.body) {
    await resposta.body?.cancel()
    return undefined
  }
  const leitor = resposta.body.getReader()
  const decodificador = new TextDecoder()
  let total = 0, bruto = ''
  for (;;) {
    const quadro = await leitor.read()
    if (quadro.done) break
    total += quadro.value.byteLength
    if (total > 64 * 1024) { await leitor.cancel(); return undefined }
    bruto += decodificador.decode(quadro.value, { stream: true })
  }
  const valor = JSON.parse(bruto + decodificador.decode()) as { choices?: Array<{ message?: { content?: unknown } }> }
  const texto = valor.choices?.[0]?.message?.content
  return typeof texto === 'string' ? texto.trim() : undefined
}

/** Solicitação explícita. A prova usa um desafio sintético gerado aqui, sem dados do usuário. */
export async function verificarVisao(alvo: AlvoConversa, iniciar: IniciarChamadaModelo): Promise<void> {
  const identidade = chave(alvo)
  const { providerId, modelId } = alvo
  if (!identidade || !providerId || !modelId || verificando || fonteDeVisao(alvo)) return
  verificando = true
  try {
    const oficial = alvo.baseUrl === 'https://api.openai.com/v1'
    const consultar = async (modelo: string) => {
      const esperado = String(randomInt(10000, 100000))
      const imagem = imagemDaProva(esperado)
      const resposta = await iniciar(providerId, modelId, config => {
        if (chave({ ...config, modelo: config.modelId }) !== identidade) throw new Error('O destino mudou antes da verificação.')
        return fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
          headers: {
            'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}`,
            ...(!oficial && { 'x-litellm-num-retries': '0' }),
          },
          body: JSON.stringify({
            model: modelo,
            ...(oficial ? { max_completion_tokens: 128 } : { max_tokens: 512, disable_fallbacks: true }),
            messages: [{
              role: 'user', content: partesVisaoOpenAI('Leia os cinco dígitos escritos na imagem. Responda só com os cinco dígitos, sem espaços.', [{ mime: 'image/png', bytes: imagem }]),
            }],
          }),
        })
      })
      if (await receberTexto(resposta) !== esperado) return undefined
      return { destino: resposta.headers.get('x-litellm-model-id') }
    }
    const inicial = await consultar(modelId)
    if (!inicial) return
    const destinoLiteLLM = oficial ? undefined : inicial.destino ?? undefined
    // A credencial do alias também precisa aceitar chamadas pelo ID interno.
    if (!oficial && (!destinoLiteLLM || destinoLiteLLM === modelId ||
      (await consultar(destinoLiteLLM))?.destino !== destinoLiteLLM)) return
    const agora = Date.now()
    for (const [id, prova] of provas) if (prova.ate <= agora) provas.delete(id)
    if (provas.size >= 32) provas.clear()
    provas.set(identidade, { ate: agora + TTL, consultadaEm: new Date(agora).toISOString(), destinoLiteLLM })
  } catch { /* Sem resposta verificável, o suporte permanece desconhecido. */ }
  finally { verificando = false }
}
