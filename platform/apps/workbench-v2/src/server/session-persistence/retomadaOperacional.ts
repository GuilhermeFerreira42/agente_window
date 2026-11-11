import type { AcaoOperacional, RevisaoOperacional } from '../../domain/retomadaOperacional'
import type { ChatMessage } from '../../types'
import type { EventoGravado } from './historicoAgir'
import type { TranscriptEntry } from './transcripts'
import { pareceCredencial } from '../../domain/memoriaProjeto'
import { createHash } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'

const MUTAVEIS = new Set(['criar', 'escrever', 'excluir', 'executar'])

export function ultimoReciboOperacional(entries: TranscriptEntry[], chatId: string): EventoGravado[] {
  const eventos = entries.filter(({ type, chatId: chat, sequence }) => type === 'agir_event' && chat === chatId && Number.isSafeInteger(sequence))
    .sort((a, b) => a.sequence! - b.sequence!)
    .flatMap(({ message }) => {
      const registro = message as EventoGravado | null
      return registro?.version === 1 && !registro.categoria && registro.runId && registro.evento ? [registro] : []
    })
  const ultimo = eventos.at(-1)
  if (!ultimo || (ultimo.evento.tipo === 'encerramento' && ultimo.evento.status === 'respondeu')) return []
  return eventos.filter((registro) => registro.runId === ultimo.runId)
}

export function revisarOperacao(
  entries: TranscriptEntry[], chatId: string, escopo: string | undefined, gitAtual: string | null, pausada = false,
): RevisaoOperacional | undefined {
  const recibo = ultimoReciboOperacional(entries, chatId)
  const inicial = recibo[0]
  if (!inicial) return
  const acoes = new Map<string, AcaoOperacional>()
  for (const { evento } of recibo) {
    if (evento.tipo === 'chamada') {
      acoes.set(evento.chamadaId, { id: evento.chamadaId, ferramenta: evento.ferramenta,
        estado: MUTAVEIS.has(evento.ferramenta) ? 'incerta' : 'pendente', aprovacao: 'nao_registrada' })
    } else if ('chamadaId' in evento) {
      const acao = acoes.get(evento.chamadaId)
      if (!acao) continue
      if (evento.tipo === 'aprovacao_solicitada') {
        acao.estado = 'pendente'
        acao.aprovacao = 'pendente'
      } else if (evento.tipo === 'aprovacao_decidida') {
        acao.estado = evento.permitido && MUTAVEIS.has(acao.ferramenta) ? 'incerta' : 'negada'
        acao.aprovacao = evento.permitido ? 'permitida' : 'negada'
      } else if (evento.tipo === 'resultado') {
        acao.estado = evento.ok ? 'concluida' : evento.efeitoIniciado ? 'incerta' : acao.aprovacao === 'negada' ? 'negada' : 'falhou'
      } else if (evento.tipo === 'referencia') acao.referencia = evento.localizador.arquivo
    }
  }
  const pasta = !escopo ? 'indisponivel' : escopo === inicial.escopo ? 'igual' : 'alterada'
  const git = !gitAtual || !inicial.git ? 'indisponivel' : gitAtual === inicial.git ? 'igual' : 'alterado'
  const mensagem = inicial.pedidoId ? entries.find(({ type, chatId: chat, uuid }) =>
    type === 'user' && chat === chatId && uuid === inicial.pedidoId)?.message as ChatMessage | undefined : undefined
  return {
    runId: inicial.runId, estado: pausada ? 'pausada' : 'interrompida', pasta, git,
    objetivo: typeof mensagem?.content === 'string' && !pareceCredencial(mensagem.content) ? mensagem.content.slice(0, 600) : undefined,
    acoes: [...acoes.values()],
    podePlanejar: !pausada && pasta === 'igual' && git !== 'alterado' && ![...acoes.values()].some((acao) => acao.estado === 'incerta'),
  }
}

export async function conferirArquivosOperacionais(revisao: RevisaoOperacional, entries: TranscriptEntry[], chatId: string, raiz: string): Promise<void> {
  const recibo = ultimoReciboOperacional(entries, chatId)
  let verificados = 0
  for (const acao of revisao.acoes) {
    if (!acao.referencia || acao.ferramenta !== 'ler') continue
    acao.arquivo = 'indisponivel'
    const referencia = recibo.find(({ evento }) => evento.tipo === 'referencia' && evento.chamadaId === acao.id)?.evento
    if (referencia?.tipo !== 'referencia' || ++verificados > 16) {
      revisao.podePlanejar = false
      continue
    }
    try {
      const arquivo = await realpath(resolve(raiz, acao.referencia))
      const rel = relative(raiz, arquivo)
      if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep)) throw new Error('Referência externa.')
      if ((await stat(arquivo)).size > 1024 * 1024) throw new Error('Referência grande.')
      const digest = createHash('sha256').update(await readFile(arquivo)).digest('hex')
      acao.arquivo = digest === referencia.localizador.digest ? 'igual' : 'alterado'
    } catch {
      acao.arquivo = 'indisponivel'
    }
    if (acao.arquivo !== 'igual') revisao.podePlanejar = false
  }
}
