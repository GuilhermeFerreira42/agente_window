import type { EventoTranscriptAgir, FerramentaId, MensagemAgir, MensagemSimples } from '../../bairros/2-inteligencia/casas/agir'
import type { TranscriptEntry } from './transcripts'
import type { ChatMessage } from '../../types'

export interface EventoGravado {
  version: 1
  runId: string
  turnoId?: string
  anterior?: string
  escopo: string
  alvo?: { providerId: string; modelId: string }
  git?: string | null
  pedidoId?: string
  categoria?: 'historico' | 'retomada'
  evento: EventoTranscriptAgir
}

const ferramentas: ReadonlySet<string> = new Set<FerramentaId>(['ler', 'listar', 'buscar', 'criar', 'escrever', 'excluir', 'executar'])
const idOpaco = /^[a-f0-9]{64}$/

function projetarExecucao(eventos: EventoTranscriptAgir[]): MensagemAgir[] {
  const saida: MensagemAgir[] = []
  const chamadas = new Map<string, FerramentaId>()
  const referencias = new Map<string, string>()
  for (const evento of eventos) {
    if (evento.tipo === 'chamada' && idOpaco.test(evento.chamadaId) && ferramentas.has(evento.ferramenta)) {
      chamadas.set(evento.chamadaId, evento.ferramenta)
    }
    if (evento.tipo === 'referencia' && chamadas.has(evento.chamadaId)) {
      const arquivo = evento.localizador?.arquivo
      if (typeof arquivo === 'string' && arquivo.length <= 1000 && !/^(?:[\\/]|[A-Za-z]:)/.test(arquivo) &&
          !arquivo.split(/[\\/]/).includes('..')) referencias.set(evento.chamadaId, arquivo)
    }
    if (evento.tipo !== 'resultado' || chamadas.get(evento.chamadaId) !== evento.ferramenta || typeof evento.ok !== 'boolean') continue
    chamadas.delete(evento.chamadaId)
    const id = `call_${evento.chamadaId.slice(0, 36)}`
    const ferramenta = evento.ferramenta
    const estado = evento.ok ? 'Concluída.' : evento.efeitoIniciado ? 'Falha com possível efeito parcial.' : 'Não concluída.'
    const arquivo = referencias.get(evento.chamadaId)
    saida.push(
      { papel: 'assistente', conteudo: '', pedidos: [{ id, ferramenta, argumentos: arquivo ? { caminho: arquivo } : {} }] },
      { papel: 'ferramenta', pedidoId: id, ferramenta, conteudo: `${estado} Argumentos e conteúdo originais omitidos da projeção persistida.` },
    )
  }
  return saida
}

export function projetarHistoricoAgir(
  entradas: TranscriptEntry[], chatId: string, escopo: string, mensagens: MensagemSimples[],
): { mensagens: MensagemAgir[]; fonte: 'browser' | 'hibrido' | 'transcript' } {
  const execucoes = new Map<string, EventoGravado[]>()
  const ultimas = new Map<string, string>()
  const persistidas = new Map<string, ChatMessage>()
  for (const entrada of entradas) {
    if (entrada.chatId !== chatId || (entrada.type !== 'user' && entrada.type !== 'assistant')) continue
    const mensagem = entrada.message as ChatMessage | null
    if (mensagem && mensagem.role === entrada.type && typeof mensagem.content === 'string' &&
        !mensagem.running && !mensagem.cancelled && !mensagem.erro) persistidas.set(entrada.uuid, mensagem)
  }
  const eventos = entradas.filter((e) => e.type === 'agir_event' && e.chatId === chatId && Number.isSafeInteger(e.sequence))
    .sort((a, b) => a.sequence! - b.sequence!)
  for (const entrada of eventos) {
    const registro = entrada.message as EventoGravado | null
    if (registro?.version !== 1 || registro.escopo !== escopo || !registro.turnoId ||
        typeof registro.runId !== 'string' || !registro.evento || typeof registro.evento !== 'object') continue
    const lote = execucoes.get(registro.runId) ?? []
    lote.push(registro)
    execucoes.set(registro.runId, lote)
    if (registro.evento.tipo === 'encerramento') ultimas.set(registro.turnoId, registro.runId)
  }
  const vistas = new Set<string>()
  let usouDisco = false
  let usouBrowser = false
  const projetadas = mensagens.flatMap((mensagem, indice): MensagemAgir[] => {
    const atual = indice === mensagens.length - 1 && mensagem.role === 'user'
    const persistida = !atual && mensagem.id ? persistidas.get(mensagem.id) : undefined
    const textoPersistido = persistida?.role === mensagem.role ? persistida.content : undefined
    const visivel: MensagemAgir = {
      papel: mensagem.role === 'user' ? 'usuario' : 'assistente',
      conteudo: textoPersistido ?? mensagem.content,
    }
    const texto = visivel.conteudo.trim() ? [visivel] : []
    if (texto.length) {
      if (textoPersistido === undefined) usouBrowser = true
      else usouDisco = true
    }
    if (mensagem.role !== 'assistant' || !mensagem.id || vistas.has(mensagem.id)) return texto
    vistas.add(mensagem.id)
    let runId = ultimas.get(mensagem.id)
    const fim = runId ? execucoes.get(runId)?.at(-1)?.evento : undefined
    if (fim?.tipo !== 'encerramento' || fim.status !== 'respondeu') return texto
    const cadeia: EventoGravado[][] = []
    const visitados = new Set<string>()
    while (runId) {
      const lote = execucoes.get(runId)
      const primeiro = lote?.[0]
      if (!lote || !primeiro || primeiro.turnoId !== mensagem.id || visitados.has(runId)) return texto
      visitados.add(runId)
      cadeia.push(lote)
      runId = primeiro.anterior
    }
    const pares = cadeia.reverse().flatMap((lote) => projetarExecucao(lote.map(({ evento }) => evento)))
    if (pares.length) usouDisco = true
    return [...pares, ...texto]
  })
  return { mensagens: projetadas, fonte: usouDisco ? (usouBrowser ? 'hibrido' : 'transcript') : 'browser' }
}
