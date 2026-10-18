// ============================================================================
// Casa Agir — O LOOP (SPEC PARTE 2D §5): o modelo pede ferramenta → a casa
// aplica as regras (é mexida? o dono liberou?) → executa → devolve o
// resultado ao modelo → repete até a IA responder em texto.
// Réguas duras:
//   · TETO de 10 voltas por mensagem (nunca rodar de graça);
//   · Parar (AbortSignal) é checado ANTES de cada execução — interromper é
//     SILÊNCIO (sem evento de erro), lição da FATIA 09;
//   · mexida (criar/escrever, Q1a) SEM aprovação do dono NÃO executa — o
//     modelo recebe o "não" e segue o plano sem tocar no arquivo.
// (Os relógios de rede vivem no vizinho real — C2, como na casa Conversa.)
// ============================================================================
import type {
  EventoAgir,
  ExecutorFerramenta,
  FerramentaId,
  MensagemAgir,
  PedidoFerramenta,
  RespostaVolta,
  ResultadoFerramenta,
  VizinhoProvedor,
} from '../contract'
import { ehMexida } from './ferramentas'

/** Teto de voltas por mensagem do dono (SPEC §5). */
export const MAX_VOLTAS = 10

export type EmitirAgir = (evento: EventoAgir) => void

export interface OpcoesAgir {
  /** Fala com o provedor numa volta (C2 = HTTP real; testes = falso). */
  vizinho: VizinhoProvedor
  /** Histórico da conversa (a mensagem nova do dono já entra aqui). */
  historico: MensagemAgir[]
  /** As mãos — C1: falsas; C2: arquivos de verdade. */
  executores: Record<FerramentaId, ExecutorFerramenta>
  /** Saída do fio (C3: vira SSE; testes: lista na mão). */
  emitir: EmitirAgir
  /**
   * Gancho de aprovação (o cartão da C3): chamado SÓ para mexidas; resolve
   * `true` = dono deixou, `false` = dono negou. Ausente na C1 = executa
   * direto (não há rota ligada, impossível chegar aqui da tela).
   */
  pedirAprovacao?: (pedido: PedidoFerramenta) => Promise<boolean>
  /** Parar: o mesmo sinal da conversa (09) — interrompido = silêncio. */
  sinal?: AbortSignal
}

export type StatusAgir = 'respondeu' | 'interrompido' | 'voltas_excedidas' | 'erro'

export interface ResultadoAgir {
  status: StatusAgir
  /** Texto final da IA (vazio quando não respondeu). */
  textoFinal: string
  voltas: number
}

function foiInterrompido(sinal: AbortSignal | undefined): boolean {
  return sinal?.aborted === true
}

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error && erro.message) return erro.message
  return 'O serviço falhou no meio do loop.'
}

/**
 * Roda o loop do agente até a IA responder em texto, o dono Parar, ou o teto
 * de voltas estourar. O `historico` de entrada NUNCA é alterado.
 */
export async function rodarAgir(opcoes: OpcoesAgir): Promise<ResultadoAgir> {
  const { vizinho, executores, emitir, pedirAprovacao, sinal } = opcoes
  const mensagens: MensagemAgir[] = [...opcoes.historico]

  for (let volta = 1; volta <= MAX_VOLTAS; volta += 1) {
    if (foiInterrompido(sinal)) return { status: 'interrompido', textoFinal: '', voltas: volta - 1 }

    let resposta: RespostaVolta
    try {
      resposta = await vizinho(mensagens)
    } catch (erro) {
      emitir({ type: 'error', code: 'http', message: mensagemDeErro(erro) })
      return { status: 'erro', textoFinal: '', voltas: volta }
    }

    if (resposta.texto) emitir({ type: 'chunk', text: resposta.texto })

    if (resposta.pedidos.length === 0) {
      emitir({ type: 'done', model: resposta.modelo })
      return { status: 'respondeu', textoFinal: resposta.texto, voltas: volta }
    }

    // Eco fiel do que a IA pediu — a próxima volta reconstrói o diálogo.
    mensagens.push({ papel: 'assistente', conteudo: resposta.texto, pedidos: resposta.pedidos })

    for (const pedido of resposta.pedidos) {
      if (foiInterrompido(sinal)) return { status: 'interrompido', textoFinal: '', voltas: volta - 1 }

      emitir({ type: 'tool', pedido })

      let liberado = true
      if (ehMexida(pedido.ferramenta) && pedirAprovacao) {
        emitir({ type: 'approval', pedido })
        liberado = await pedirAprovacao(pedido)
      }

      const resultado: ResultadoFerramenta = liberado
        ? await executores[pedido.ferramenta](pedido)
        : { ok: false, resumo: 'O dono negou esta mexida — nada foi escrito.' }

      emitir({
        type: 'tool_result',
        id: pedido.id,
        ferramenta: pedido.ferramenta,
        ok: resultado.ok,
        resumo: resultado.resumo,
      })

      mensagens.push({
        papel: 'ferramenta',
        conteudo: resultado.ok ? (resultado.conteudo ?? resultado.resumo) : `NÃO EXECUTADO: ${resultado.resumo}`,
        pedidoId: pedido.id,
        ferramenta: pedido.ferramenta,
      })
    }
  }

  emitir({
    type: 'error',
    code: 'voltas',
    message: `A IA pediu ferramentas ${MAX_VOLTAS} vezes seguidas sem concluir. Ela foi parada por segurança — tente dividir o pedido em partes menores.`,
  })
  return { status: 'voltas_excedidas', textoFinal: '', voltas: MAX_VOLTAS }
}
