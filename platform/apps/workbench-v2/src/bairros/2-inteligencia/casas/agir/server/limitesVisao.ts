// MM-I: checagem local e construção do corpo openai-chat. Não comprova alvo
// nem consentimento; só usar depois da validação dessas autoridades no servidor.
// Não aceita limites desconhecidos e nunca reduz o lote silenciosamente.
import { inspecionarImagemVisao, LIMITES_IMAGEM_VISAO } from './imagemVisao'
import { partesVisaoOpenAI } from './visaoOpenAI'

export interface LimitesVisao {
  quantidade: number
  arquivoBytes: number
  conjuntoBytes: number
  largura: number
  altura: number
  pixels: number
  corpoBytes: number
}

// Salvaguardas locais provisórias, independentes da quota de armazenamento.
// A aprovação final depende do ensaio de memória/latência e da prova do alvo.
export const LIMITES_LOCAIS_VISAO: Readonly<LimitesVisao> = Object.freeze({
  quantidade: 2,
  arquivoBytes: LIMITES_IMAGEM_VISAO.bytes,
  conjuntoBytes: 6 * 1024 * 1024,
  largura: LIMITES_IMAGEM_VISAO.largura,
  altura: LIMITES_IMAGEM_VISAO.altura,
  pixels: LIMITES_IMAGEM_VISAO.pixels,
  corpoBytes: 9 * 1024 * 1024,
})

function recusar(): never { throw new Error('Imagem, alvo ou tamanho do pedido não atende aos limites confirmados. Nada foi enviado.') }

/**
 * `limites` precisa vir de uma fonte de capacidade validada para o alvo real.
 * A entrada é interna do servidor, nunca um corpo/limite imposto pelo browser.
 * Calcula o JSON exato sem os bytes base64 e verifica o espaço ANTES de
 * materializar as data URLs. Histórico não pode carregar mídias anteriores.
 */
export function construirCorpoVisaoOpenAI(corpo: Record<string, unknown>, imagens: readonly Buffer[], limites: LimitesVisao): { corpo: Record<string, unknown>; bytesCorpo: number } {
  const efetivos = {} as LimitesVisao
  for (const chave of Object.keys(LIMITES_LOCAIS_VISAO) as (keyof LimitesVisao)[]) {
    if (!limites || !Number.isSafeInteger(limites[chave]) || limites[chave] <= 0) return recusar()
    efetivos[chave] = Math.min(limites[chave], LIMITES_LOCAIS_VISAO[chave])
  }
  if (!Array.isArray(imagens) || !imagens.length || imagens.length > efetivos.quantidade || !Array.isArray(corpo.messages) || !corpo.messages.length) return recusar()
  const mensagens = corpo.messages as unknown[]
  for (const msg of mensagens) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return recusar()
    const conteudo = (msg as { content?: unknown }).content
    if (conteudo !== null && typeof conteudo !== 'string') return recusar()
  }
  const ultima = mensagens[mensagens.length - 1] as { role?: unknown; content?: unknown }
  if (ultima.role !== 'user' || typeof ultima.content !== 'string' || !ultima.content.trim()) return recusar()
  let total = 0, expansao = 0
  const verificadas = imagens.map((bytes) => {
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > efetivos.arquivoBytes) return recusar()
    total += bytes.length
    if (total > efetivos.conjuntoBytes) return recusar()
    const imagem = inspecionarImagemVisao(bytes)
    if (imagem.largura > efetivos.largura || imagem.altura > efetivos.altura || imagem.largura * imagem.altura > efetivos.pixels) return recusar()
    expansao += Math.ceil(bytes.length / 3) * 4
    return { mime: imagem.mime, bytes }
  })
  const placeholders = [{ type: 'text', text: ultima.content }, ...verificadas.map((imagem) => ({ type: 'image_url', image_url: { url: `data:${imagem.mime};base64,` } }))]
  const comPartes = (partes: unknown) => ({ ...corpo, messages: [...mensagens.slice(0, -1), { ...ultima, content: partes }] })
  const estimado = Buffer.byteLength(JSON.stringify(comPartes(placeholders)), 'utf8') + expansao
  if (estimado > efetivos.corpoBytes) return recusar()
  const resultado = comPartes(partesVisaoOpenAI(ultima.content, verificadas))
  return { corpo: resultado, bytesCorpo: estimado }
}
