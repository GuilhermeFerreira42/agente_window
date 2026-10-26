// ============================================================================
// Casa Agir — O LOOP (SPEC PARTE 2D §5): o modelo pede ferramenta → a casa
// aplica as regras (é mexida? o dono liberou?) → executa → devolve o
// resultado ao modelo → repete até a IA responder em texto.
// Réguas duras:
//   · TETO configurável de iterações por mensagem (FATIA 11: 1–250, default
//     25, dono = casa Config — nunca rodar de graça);
//   · Parar (AbortSignal) é checado ANTES de cada execução — interromper é
//     SILÊNCIO (sem evento de erro), lição da FATIA 09;
//   · mexida (criar/escrever, Q1a) SEM aprovação do dono NÃO executa — o
//     modelo recebe o "não" e segue o plano sem tocar no arquivo.
// (Os relógios de rede vivem no vizinho real — C2, como na casa Conversa.)
// ============================================================================
import type {
  CategoriaErroAgir,
  EventoAgir,
  ExecutorFerramenta,
  FerramentaId,
  MensagemAgir,
  PedidoFerramenta,
  RespostaIteracao,
  ResultadoFerramenta,
  VizinhoProvedor,
} from '../contract'
import { ehMexida } from './ferramentas'

/** Teto default de iterações por mensagem (FATIA 11: a casa Config é dona do
 * número — 1–250; isto é só o fallback quando ninguém mandar). */
export const TETO_PADRAO = 25

export type EmitirAgir = (evento: EventoAgir) => void

export interface OpcoesAgir {
  /** Fala com o provedor numa iteração (C2 = HTTP real; testes = falso). */
  vizinho: VizinhoProvedor
  /** Histórico da conversa (a mensagem nova do dono já entra aqui). */
  historico: MensagemAgir[]
  /** As mãos — C1: falsas; C2: arquivos de verdade. */
  executores: Record<FerramentaId, ExecutorFerramenta>
  /** Saída do fio (C3: vira SSE; testes: lista na mão). */
  emitir: EmitirAgir
  /**
   * Teto desta mensagem (FATIA 11): a rota lê da casa Config e manda aqui.
   * Ausente = TETO_PADRAO (25).
   */
  teto?: number
  /**
   * Gancho de aprovação (o cartão da C3): chamado SÓ para mexidas; resolve
   * `true` = dono deixou, `false` = dono negou. Ausente na C1 = executa
   * direto (não há rota ligada, impossível chegar aqui da tela).
   */
  pedirAprovacao?: (pedido: PedidoFerramenta) => Promise<boolean>
  /** Revalida sessão e workspace autoritativos antes de chamadas/effects. */
  validarContexto?: (pedido?: PedidoFerramenta) => boolean
  /** Parar: o mesmo sinal da conversa (09) — interrompido = silêncio. */
  sinal?: AbortSignal
}

export type StatusAgir = 'respondeu' | 'interrompido' | 'iteracoes_excedidas' | 'loop_bloqueado' | 'erro'

export interface ResultadoAgir {
  status: StatusAgir
  /** Texto final da IA (vazio quando não respondeu). */
  textoFinal: string
  iteracoes: number
  /**
   * O diálogo acumulado (FATIA 11, em `iteracoes_excedidas` — e pós-11 também
   * em `erro` TRANSITÓRIO): a rota guarda por fluxo para o "Continuar"
   * retomar o MESMO fluxo com orçamento cheio.
   */
  mensagensParaRetomar?: MensagemAgir[]
  /** O código do erro (só em `erro`) — a rota decide se é transitório. */
  codigoErro?: CategoriaErroAgir
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
 * de iterações estourar. O `historico` de entrada NUNCA é alterado.
 */
export async function rodarAgir(opcoes: OpcoesAgir): Promise<ResultadoAgir> {
  const { vizinho, executores, emitir, pedirAprovacao, sinal } = opcoes
  const teto = opcoes.teto ?? TETO_PADRAO
  const mensagens: MensagemAgir[] = [...opcoes.historico]
  /** Anti-loop (C4, desenho do PERMISSOES.md/doomLoop): assinatura = ferramenta
   * + argumentos exatos. 3 idênticas SEGUIDAS → bloqueia sem executar e sem
   * perguntar ao dono de novo. */
  const assinaturas: string[] = []

  for (let iteracao = 1; iteracao <= teto; iteracao += 1) {
    if (foiInterrompido(sinal)) return { status: 'interrompido', textoFinal: '', iteracoes: iteracao - 1 }
    if (opcoes.validarContexto && !opcoes.validarContexto()) {
      const message = 'A sessão ou a pasta de trabalho mudou; a execução foi bloqueada sem trocar de contexto.'
      emitir({ type: 'error', code: 'fluxo', message })
      return { status: 'erro', textoFinal: '', iteracoes: iteracao - 1, codigoErro: 'fluxo' }
    }
    emitir({ type: 'iteracao', iteracao, teto })

    let resposta: RespostaIteracao
    try {
      resposta = await vizinho(mensagens, {
        aoTexto: (pedaco) => emitir({ type: 'chunk', text: pedaco }),
        sinal,
      })
    } catch (erro) {
      // Parar no meio do fetch = interrupção SILENCIOSA (lição da 09) —
      // só sai erro de verdade quando a culpa é do serviço/rede.
      if (foiInterrompido(sinal)) return { status: 'interrompido', textoFinal: '', iteracoes: iteracao - 1 }
      const codigoSuspeito: unknown = erro instanceof Error && 'code' in erro ? (erro as { code?: unknown }).code : undefined
      const codigo: CategoriaErroAgir =
        typeof codigoSuspeito === 'string' && codigoSuspeito !== '' ? (codigoSuspeito as CategoriaErroAgir) : 'http'
      // Erro TRANSITÓRIO (rede/provedor instável): o diálogo acumulado vai
      // junto como retomada — a tela oferece "continuar de onde parou".
      const retomavel = codigo === 'tempo' || codigo === 'endereco' || codigo === 'http'
      emitir({
        type: 'error',
        code: codigo,
        message: mensagemDeErro(erro),
        ...(retomavel ? { retomavel: true as const, iteracoes: iteracao, teto } : {}),
      })
      return {
        status: 'erro',
        textoFinal: '',
        iteracoes: iteracao,
        codigoErro: codigo,
        ...(retomavel ? { mensagensParaRetomar: mensagens } : {}),
      }
    }

    // O texto AO VIVO já saiu pelo `aoTexto` (contrato do vizinho — fonte única).

    if (resposta.pedidos.length === 0) {
      emitir({ type: 'done', model: resposta.modelo })
      return { status: 'respondeu', textoFinal: resposta.texto, iteracoes: iteracao }
    }

    // Eco fiel do que a IA pediu — a próxima iteração reconstrói o diálogo.
    mensagens.push({ papel: 'assistente', conteudo: resposta.texto, pedidos: resposta.pedidos })

    for (const pedido of resposta.pedidos) {
      if (foiInterrompido(sinal)) return { status: 'interrompido', textoFinal: '', iteracoes: iteracao - 1 }

      emitir({ type: 'tool', pedido })

      const assinatura = `${pedido.ferramenta}:${JSON.stringify(pedido.argumentos)}`
      assinaturas.push(assinatura)
      if (assinaturas.length >= 3 && assinaturas.slice(-3).every((uma) => uma === assinatura)) {
        const motivo = 'Bloqueado: 3 chamadas idênticas seguidas — você provavelmente está em um loop. Mude os argumentos, use outra ferramenta ou peça ajuda ao dono.'
        emitir({ type: 'tool_result', id: pedido.id, ferramenta: pedido.ferramenta, ok: false, resumo: motivo })
        mensagens.push({ papel: 'ferramenta', conteudo: `NÃO EXECUTADO: ${motivo}`, pedidoId: pedido.id, ferramenta: pedido.ferramenta })
        emitir({ type: 'error', code: 'loop', message: 'A IA repetiu a mesma ação 3 vezes seguidas e foi parada por segurança. Reformule o pedido com mais detalhes ou comece uma conversa nova.' })
        return { status: 'loop_bloqueado', textoFinal: '', iteracoes: iteracao }
      }

      let liberado = true
      if (ehMexida(pedido.ferramenta) && pedirAprovacao) {
        // Quem pergunta é que anuncia o cartão (a rota emite `approval` só
        // quando vai MESMO esperar o dono — permissão de sessão não faz
        // cartão). O loop apenas pergunta e espera.
        liberado = await pedirAprovacao(pedido)
      }

      // RF12-2: a negação do `excluir` diz "nada sumiu" (o "dono negou" a
      // tela usa para pintar o cartão de negado — mantido nos dois textos).
      const textoNegacao = pedido.ferramenta === 'excluir'
        ? 'O dono negou esta exclusão — nada sumiu.'
        : 'O dono negou esta mexida — nada foi escrito.'
      if (liberado && opcoes.validarContexto && !opcoes.validarContexto(pedido)) {
        const motivo = 'A sessão ou a pasta mudou após a autorização; a ação não foi executada.'
        emitir({ type: 'tool_result', id: pedido.id, ferramenta: pedido.ferramenta, ok: false, resumo: motivo })
        emitir({ type: 'error', code: 'fluxo', message: motivo })
        return { status: 'erro', textoFinal: '', iteracoes: iteracao, codigoErro: 'fluxo' }
      }
      const resultado: ResultadoFerramenta = liberado
        ? await executores[pedido.ferramenta](pedido)
        : { ok: false, resumo: textoNegacao }

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

  // FATIA 11: o teto PAUSA (não erra) — o fio emite `teto` e a rota guarda
  // o diálogo para o "Continuar" retomar o MESMO fluxo com orçamento cheio.
  emitir({ type: 'teto', iteracoes: teto, teto })
  return { status: 'iteracoes_excedidas', textoFinal: '', iteracoes: teto, mensagensParaRetomar: mensagens }
}
