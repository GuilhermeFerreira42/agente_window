// ============================================================================
// Casa Agir — VIZINHO REAL (conquista 2): fala HTTP de verdade com o
// provedor numa iteração do loop. Anuncia as ferramentas no idioma nativo
// (anuncio.ts), traduz o histórico (dialogo.ts), lê o fio em pedaços
// (SSE ou NDJSON — mesma receita de enquadração da casa Conversa,
// reimplementada aqui por causa da fronteira LEGO) e MONTA os pedidos de
// ferramenta que chegam FRAGMENTADOS (o openai manda os argumentos aos
// pedaços — daí o acumulador por índice). Réguas de tempo espelhadas da
// conversa: 60 s até o primeiro byte · 5 min no total. Provedor que ignorou
// o stream e respondeu corpo inteiro → o próprio extrator da casa resolve.
// ============================================================================
import type { AlvoConversa, ConfigChamadaModelo, IniciarChamadaModelo } from '../../conversa' // barrel da casa vizinha (LEGO)
import type {
  CategoriaErroAgir,
  MensagemAgir,
  ProtocoloAgir,
  OpcoesVizinho,
  PedidoFerramenta,
  RespostaIteracao,
  VizinhoProvedor,
} from '../contract'
import { anunciarFerramentas } from './anuncio'
import { traduzirHistorico } from './dialogo'
import { extrairFerramentas } from './extracao'
import { ehFerramentaConhecida } from './ferramentas'

export class ErroVizinho extends Error {
  readonly code: CategoriaErroAgir
  constructor(code: CategoriaErroAgir, message: string) {
    super(message)
    this.name = 'ErroVizinho'
    this.code = code
  }
}

export const TIMEOUT_PRIMEIRO_BYTE_MS = 60_000
/**
 * Pós-11: o relógio TOTAL virou dois. O OCIOSO (5 min sem NADA chegar)
 * mata fio emperrado; o ABSOLUTO (30 min, rede de segurança) mata fio
 * pingando para sempre. Resposta saudável e lenta NUNCA morre no meio.
 */
export const TIMEOUT_OCIOSO_MS = 300_000
export const TIMEOUT_TOTAL_MS = 1_800_000

export interface AjustesVizinho {
  primeiroByteMs?: number
  totalMs?: number
  ociosoMs?: number
}

// ── Enquadração (espelho de streaming.ts da casa Conversa) ──────────────────
export interface Framer {
  entrar(texto: string): string[]
  fechar(): string[]
}

function payloadsDeBloco(bloco: string): string[] {
  const dados = bloco.split(/\r?\n/).filter((linha) => linha.startsWith('data:'))
  if (dados.length === 0) return []
  const payload = dados.map((linha) => linha.slice(5).replace(/^ /, '')).join('\n').trim()
  return payload ? [payload] : []
}

function framerSSE(): Framer {
  let buffer = ''
  return {
    entrar(texto: string): string[] {
      buffer += texto
      const pedacos = buffer.split(/\r?\n\r?\n/)
      buffer = pedacos.pop() ?? ''
      return pedacos.flatMap(payloadsDeBloco)
    },
    fechar(): string[] {
      const resto = buffer
      buffer = ''
      if (!resto.trim()) return []
      const payloads = payloadsDeBloco(resto)
      return payloads.length > 0 ? payloads : [resto.trim()]
    },
  }
}

function framerNDJSON(): Framer {
  let buffer = ''
  return {
    entrar(texto: string): string[] {
      buffer += texto
      const linhas = buffer.split('\n')
      buffer = linhas.pop() ?? ''
      return linhas.map((l) => l.replace(/\r$/, '')).filter((l) => l.trim().length > 0)
    },
    fechar(): string[] {
      const resto = buffer
      buffer = ''
      return resto.trim() ? [resto.trim()] : []
    },
  }
}

// ── Erros honestos por status (espelho de conversar.ts, com a dica do Q4b) ──
function erroPorStatus(status: number): ErroVizinho {
  if (status === 401 || status === 403) return new ErroVizinho('chave', `Chave inválida (erro ${status}). Confira a chave em Provedores.`)
  if (status === 400) {
    return new ErroVizinho(
      'sem_canal_nativo',
      'O serviço recusou o pedido com ferramentas (erro 400). Uma causa comum: este modelo/provedor não tem o canal nativo de ferramentas — nesse caso ele conversa, mas não age (decisão Q4, D93). Confira também o nome do modelo e o endereço.',
    )
  }
  if (status === 429) return new ErroVizinho('http', 'O serviço pediu uma pausa por excesso de pedidos (erro 429). Aguarde um instante.')
  if (status === 404) return new ErroVizinho('http', 'O serviço não encontrou o endereço ou o modelo (erro 404). Confira ambos em Provedores.')
  return new ErroVizinho('http', `O serviço respondeu com o erro ${status}. Tente novamente em instantes.`)
}

// ── Corpo do pedido: idioma nativo de cada protocolo, agora COM ferramentas ─
function corpoDePedido(alvo: AlvoConversa, mensagens: MensagemAgir[]): { url: string; corpo: Record<string, unknown> } {
  const baseUrl = alvo.baseUrl.replace(/\/+$/, '')
  const anuncio = anunciarFerramentas(alvo.protocolo)
  const traduzido = traduzirHistorico(alvo.protocolo, mensagens)
  const temperatura = typeof alvo.temperatura === 'number' ? { temperature: alvo.temperatura } : {}

  if (alvo.protocolo === 'openai-chat') {
    return {
      url: `${baseUrl}/chat/completions`,
      corpo: { model: alvo.modelo, messages: traduzido, stream: true, ...temperatura, ...anuncio, tool_choice: 'auto' },
    }
  }
  if (alvo.protocolo === 'anthropic') {
    return {
      url: `${baseUrl}/messages`,
      corpo: {
        model: alvo.modelo,
        max_tokens: alvo.maxSaida && alvo.maxSaida > 0 ? alvo.maxSaida : 8192,
        messages: traduzido,
        stream: true,
        ...temperatura,
        ...anuncio,
      },
    }
  }
  if (alvo.protocolo === 'gemini') {
    return {
      url: `${baseUrl}/models/${encodeURIComponent(alvo.modelo)}:streamGenerateContent?alt=sse`,
      corpo: { contents: traduzido, generationConfig: temperatura, ...anuncio },
    }
  }
  return {
    url: `${baseUrl}/api/chat`,
    corpo: { model: alvo.modelo, messages: traduzido, stream: true, ...anuncio, ...(alvo.temperatura !== undefined ? { options: temperatura } : {}) },
  }
}

function cabecalhos(alvo: AlvoConversa): Record<string, string> {
  const c: Record<string, string> = { 'Content-Type': 'application/json' }
  if (alvo.protocolo === 'openai-chat' && alvo.apiKey) c.Authorization = `Bearer ${alvo.apiKey}`
  if (alvo.protocolo === 'anthropic') {
    c['anthropic-version'] = '2023-06-01'
    if (alvo.apiKey) c['x-api-key'] = alvo.apiKey
  }
  if (alvo.protocolo === 'gemini' && alvo.apiKey) c['x-goog-api-key'] = alvo.apiKey
  return c
}

// ── Acúmulo do fio: texto AO VIVO + pedidos de ferramenta aos pedaços ───────
interface Acumulo {
  texto: string
  modelo?: string
  pedidos: PedidoFerramenta[]
}

function criarAcumulo(protocolo: ProtocoloAgir, aoTexto: (pedaco: string) => void) {
  const acumulo: Acumulo = { texto: '', pedidos: [] }
  const slots = new Map<number, { id?: string; nome?: string; json: string }>()
  let slotAnthropic: { id: string; nome: string; json: string } | null = null
  let sinteticos = 0

  const crescer = (pedaco: string): void => {
    if (pedaco === '') return
    acumulo.texto += pedaco
    aoTexto(pedaco)
  }
  const sintetico = (): string => {
    sinteticos += 1
    return `chamada_${sinteticos}`
  }
  const fecharSlotOpenai = (): void => {
    for (const [indice, slot] of [...slots.entries()].sort((a, b) => a[0] - b[0])) {
      if (!ehFerramentaConhecida(slot.nome)) continue
      let argumentos: unknown = {}
      try {
        argumentos = slot.json.trim() === '' ? {} : JSON.parse(slot.json)
      } catch {
        continue // argumentos partidos e malformados: chamada ignorada (regra da extracao)
      }
      if (argumentos === null || typeof argumentos !== 'object' || Array.isArray(argumentos)) continue
      acumulo.pedidos.push({ id: slot.id ?? `chamada_${indice + 1}`, ferramenta: slot.nome, argumentos: argumentos as PedidoFerramenta['argumentos'] })
    }
  }
  const fecharSlotAnthropic = (): void => {
    if (!slotAnthropic || !ehFerramentaConhecida(slotAnthropic.nome)) {
      slotAnthropic = null
      return
    }
    let argumentos: unknown = {}
    try {
      argumentos = slotAnthropic.json.trim() === '' ? {} : JSON.parse(slotAnthropic.json)
    } catch {
      slotAnthropic = null
      return
    }
    if (argumentos === null || typeof argumentos !== 'object' || Array.isArray(argumentos)) {
      slotAnthropic = null
      return
    }
    acumulo.pedidos.push({ id: slotAnthropic.id, ferramenta: slotAnthropic.nome, argumentos: argumentos as PedidoFerramenta['argumentos'] })
    slotAnthropic = null
  }

  const comer = (payload: unknown): void => {
    const dados = payload !== null && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
    if (!dados) return
    if (protocolo === 'openai-chat') {
      if (typeof dados.model === 'string') acumulo.modelo = dados.model
      const escolhas = Array.isArray(dados.choices) ? dados.choices : []
      const delta = (escolhas[0] as { delta?: Record<string, unknown> } | undefined)?.delta
      if (!delta) return
      if (typeof delta.content === 'string') crescer(delta.content)
      const chamadas = Array.isArray(delta.tool_calls) ? delta.tool_calls : []
      for (const bruta of chamadas) {
        const chamada = bruta as { index?: unknown; id?: unknown; function?: { name?: unknown; arguments?: unknown } }
        const indice = typeof chamada.index === 'number' ? chamada.index : slots.size
        const slot = slots.get(indice) ?? { json: '' }
        if (typeof chamada.id === 'string' && chamada.id !== '') slot.id = chamada.id
        if (typeof chamada.function?.name === 'string' && chamada.function.name !== '') slot.nome = chamada.function.name
        if (typeof chamada.function?.arguments === 'string') slot.json += chamada.function.arguments
        slots.set(indice, slot)
      }
      return
    }
    if (protocolo === 'anthropic') {
      const tipo = dados.type
      if (tipo === 'message_start') {
        const modelo = (dados.message as { model?: unknown } | undefined)?.model
        if (typeof modelo === 'string') acumulo.modelo = modelo
        return
      }
      if (tipo === 'content_block_start') {
        const bloco = dados.content_block as { type?: unknown; id?: unknown; name?: unknown }
        if (bloco?.type === 'tool_use' && typeof bloco.id === 'string' && typeof bloco.name === 'string') {
          fecharSlotAnthropic() // blocos nunca se sobrepõem, mas ficar à prova de tudo
          slotAnthropic = { id: bloco.id, nome: bloco.name, json: '' }
        }
        return
      }
      if (tipo === 'content_block_delta') {
        const delta = dados.delta as { type?: unknown; text?: unknown; partial_json?: unknown }
        if (delta?.type === 'text_delta' && typeof delta.text === 'string') crescer(delta.text)
        if (delta?.type === 'input_json_delta' && typeof delta.partial_json === 'string' && slotAnthropic) {
          slotAnthropic.json += delta.partial_json
        }
        return
      }
      if (tipo === 'content_block_stop') fecharSlotAnthropic()
      return
    }
    if (protocolo === 'gemini') {
      if (typeof dados.modelVersion === 'string') acumulo.modelo = dados.modelVersion
      const candidatos = Array.isArray(dados.candidates) ? dados.candidates : []
      const partes = (candidatos[0] as { content?: { parts?: unknown[] } } | undefined)?.content?.parts
      if (!Array.isArray(partes)) return
      for (const bruta of partes) {
        const parte = bruta as { text?: unknown; functionCall?: { name?: unknown; args?: unknown } }
        if (typeof parte.text === 'string') crescer(parte.text)
        if (parte.functionCall && typeof parte.functionCall.name === 'string' && ehFerramentaConhecida(parte.functionCall.name)) {
          const argumentos = parte.functionCall.args
          acumulo.pedidos.push({
            id: sintetico(),
            ferramenta: parte.functionCall.name,
            argumentos: (argumentos !== null && typeof argumentos === 'object' && !Array.isArray(argumentos) ? argumentos : {}) as PedidoFerramenta['argumentos'],
          })
        }
      }
      return
    }
    // ollama (NDJSON)
    if (typeof dados.model === 'string') acumulo.modelo = dados.model
    const mensagem = dados.message as { content?: unknown; tool_calls?: unknown } | undefined
    if (typeof mensagem?.content === 'string') crescer(mensagem.content)
    const chamadas = Array.isArray(mensagem?.tool_calls) ? mensagem.tool_calls : []
    for (const bruta of chamadas) {
      const chamada = bruta as { id?: unknown; function?: { name?: unknown; arguments?: unknown } }
      if (!ehFerramentaConhecida(chamada.function?.name)) continue
      const argumentos = chamada.function?.arguments
      acumulo.pedidos.push({
        id: typeof chamada.id === 'string' && chamada.id !== '' ? chamada.id : sintetico(),
        ferramenta: chamada.function?.name,
        argumentos: (argumentos !== null && typeof argumentos === 'object' && !Array.isArray(argumentos) ? argumentos : {}) as PedidoFerramenta['argumentos'],
      })
    }
  }

  return {
    acumulo,
    comer,
    fechar(): void {
      fecharSlotOpenai()
      fecharSlotAnthropic()
    },
  }
}

/** Texto de corpo INTEIRO (provedor que ignorou o stream) — espelho do extrairTexto. */
function textoDeCorpoInteiro(protocolo: ProtocoloAgir, dados: Record<string, unknown>): string {
  if (protocolo === 'openai-chat') {
    const escolhas = Array.isArray(dados.choices) ? dados.choices : []
    const primeira = escolhas[0] as { message?: { content?: unknown } } | undefined
    return typeof primeira?.message?.content === 'string' ? primeira.message.content : ''
  }
  if (protocolo === 'anthropic') {
    const blocos = Array.isArray(dados.content) ? dados.content : []
    return blocos.map((b) => String((b as { text?: unknown }).text ?? '')).filter(Boolean).join('')
  }
  if (protocolo === 'gemini') {
    const candidatos = Array.isArray(dados.candidates) ? dados.candidates : []
    return candidatos
      .map((c) => {
        const partes = (c as { content?: { parts?: unknown[] } }).content?.parts
        return Array.isArray(partes) ? partes.map((p) => String((p as { text?: unknown }).text ?? '')).join('') : ''
      })
      .filter(Boolean)
      .join('')
  }
  const mensagem = dados.message as { content?: unknown } | undefined
  return typeof mensagem?.content === 'string' ? mensagem.content : ''
}

/** O fio do NOSSO servidor é sempre SSE — o cliente do browser usa este. */
export function criarFramerSSE(): Framer {
  return framerSSE()
}

/**
 * Fábrica do vizinho real de um protocolo/alvo. O loop chama o resultado
 * uma vez por iteração do agente.
 */
export function criarVizinhoReal(alvo: AlvoConversa, ajustes: AjustesVizinho = {}, iniciarModelo?: IniciarChamadaModelo): VizinhoProvedor {
  const primeiroByteMs = ajustes.primeiroByteMs ?? TIMEOUT_PRIMEIRO_BYTE_MS
  const totalMs = ajustes.totalMs ?? TIMEOUT_TOTAL_MS
  const ociosoMs = ajustes.ociosoMs ?? TIMEOUT_OCIOSO_MS

  return async (mensagens, opcoes?: OpcoesVizinho): Promise<RespostaIteracao> => {
    const controlador = new AbortController()
    let byteViu = false
    let motivoTempo: 'primeiro' | 'total' | 'ocioso' | null = null
    const aoParar = (): void => controlador.abort()
    opcoes?.sinal?.addEventListener('abort', aoParar, { once: true })
    const timerPrimeiro = setTimeout(() => {
      if (!byteViu && motivoTempo === null) {
        motivoTempo = 'primeiro'
        controlador.abort()
      }
    }, primeiroByteMs)
    const timerTotal = setTimeout(() => {
      if (motivoTempo === null) {
        motivoTempo = 'total'
        controlador.abort()
      }
    }, totalMs)
    // O relógio ocioso REARMA a cada pedaço que chega: só dispara quando o
    // serviço emudece de verdade no meio da resposta.
    let timerOcioso: ReturnType<typeof setTimeout> | undefined
    const rearmarOcioso = (): void => {
      if (timerOcioso !== undefined) clearTimeout(timerOcioso)
      timerOcioso = setTimeout(() => {
        if (motivoTempo === null) {
          motivoTempo = 'ocioso'
          controlador.abort()
        }
      }, ociosoMs)
    }

    const aoTexto = (pedaco: string): void => opcoes?.aoTexto?.(pedaco)
    const comedor = criarAcumulo(alvo.protocolo, aoTexto)
    const framer = alvo.protocolo === 'ollama' ? framerNDJSON() : framerSSE()
    let bruto = ''

    try {
      const iniciarFetch = (config?: ConfigChamadaModelo): Promise<Response> => {
        const alvoAtual: AlvoConversa = config ? {
          ...alvo,
          providerId: config.providerId,
          modelId: config.modelId,
          protocolo: config.protocolo,
          baseUrl: config.baseUrl,
          modelo: config.modelId,
          apiKey: config.apiKey,
          temperatura: config.temperatura,
          maxSaida: config.maxSaida,
        } : alvo
        const { url, corpo } = corpoDePedido(alvoAtual, mensagens)
        return fetch(url, {
          method: 'POST',
          headers: cabecalhos(alvoAtual),
          body: JSON.stringify(corpo),
          signal: controlador.signal,
        })
      }
      let resposta: Response
      if (iniciarModelo) {
        if (!alvo.providerId || !alvo.modelId) throw Object.assign(new Error('O alvo desta execução não tem identidade exata de provedor/modelo.'), { code: 'selection_unavailable' })
        resposta = await iniciarModelo(alvo.providerId, alvo.modelId, (config) => iniciarFetch(config))
      } else {
        resposta = await iniciarFetch()
      }
      if (!resposta.ok) throw erroPorStatus(resposta.status)
      if (resposta.body === null) throw new ErroVizinho('resposta', 'O serviço respondeu sem corpo.')
      byteViu = true
      rearmarOcioso()

      const leitor = resposta.body.getReader()
      const decodificador = new TextDecoder()
      for (;;) {
        const { done, value } = await leitor.read()
        if (done) break
        rearmarOcioso()
        const pedaco = decodificador.decode(value, { stream: true })
        bruto += pedaco
        for (const payload of framer.entrar(pedaco)) {
          try {
            comedor.comer(JSON.parse(payload))
          } catch {
            // payload não-JSON (ex.: [DONE] do openai): ignorado
          }
        }
      }
      for (const payload of framer.fechar()) {
        try {
          comedor.comer(JSON.parse(payload))
        } catch {
          // idem
        }
      }
      comedor.fechar()

      // Provedor que ignorou o stream e respondeu corpo INTEIRO:
      if (comedor.acumulo.texto === '' && comedor.acumulo.pedidos.length === 0) {
        try {
          const inteiro = JSON.parse(bruto) as Record<string, unknown>
          if (inteiro !== null && typeof inteiro === 'object') {
            const texto = textoDeCorpoInteiro(alvo.protocolo, inteiro)
            if (texto !== '') aoTexto(texto)
            comedor.acumulo.texto += texto
            comedor.acumulo.pedidos.push(...extrairFerramentas(alvo.protocolo, inteiro))
          }
        } catch {
          // corpo não era JSON aproveitável — segue com o que há (honesto)
        }
      }

      return {
        texto: comedor.acumulo.texto,
        pedidos: comedor.acumulo.pedidos,
        ...(comedor.acumulo.modelo !== undefined ? { modelo: comedor.acumulo.modelo } : {}),
      }
    } catch (erro) {
      if (opcoes?.sinal?.aborted) throw erro // Parar do dono: o loop distingue e fica em silêncio
      if (motivoTempo === 'primeiro') {
        throw new ErroVizinho('tempo', `O serviço não respondeu em ${Math.round(primeiroByteMs / 1000)} segundos. Ele pode estar fora do ar ou muito lento.`)
      }
      if (motivoTempo === 'ocioso') {
        throw new ErroVizinho('tempo', `O serviço parou no meio da resposta (nada chegou em ${Math.round(ociosoMs / 1000)} segundos).`)
      }
      if (motivoTempo === 'total') {
        const limite = totalMs >= 60_000 ? `${Math.round(totalMs / 60_000)} minutos` : `${Math.round(totalMs / 1000)} segundos`
        throw new ErroVizinho('tempo', `A resposta não terminou em ${limite}.`)
      }
      if (erro instanceof ErroVizinho) throw erro
      const code = (erro as { code?: string })?.code
      if (code === 'model_disabled' || code === 'selection_unavailable' || code === 'credential_unavailable') {
        throw new ErroVizinho(code === 'credential_unavailable' ? 'chave' : code, (erro as Error).message)
      }
      throw new ErroVizinho('endereco', 'Não deu para alcançar o serviço. Verifique se ele está ligado (no caso do Ollama, se está rodando na sua máquina).')
    } finally {
      clearTimeout(timerPrimeiro)
      clearTimeout(timerTotal)
      if (timerOcioso !== undefined) clearTimeout(timerOcioso)
      opcoes?.sinal?.removeEventListener('abort', aoParar)
    }
  }
}
