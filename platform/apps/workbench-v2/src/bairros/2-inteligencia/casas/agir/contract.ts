// ============================================================================
// Casa Agir — contrato da FATIA 10 (ferramentas de arquivo + permissões).
// Regras duras (SPEC PARTE 2D): a IA SÓ PROPÕE mexidas — o dono aprova no
// cartão; nada sai da pasta de trabalho (trava de território — C2);
// Q4 (D93) = canal NATIVO: cada protocolo tem seu extrator de pedidos.
// ============================================================================
/**
 * Espelho de TIPO dos 4 protocolos da casa Conversa (a casa vizinha não é
 * importada — regra LEGO). A sincronia é forçada no typecheck quando a C2
 * ligar o vizinho real: protocolo ganhar/remover variante = erro aqui,
 * obrigando a revisar os extratores de `server/extracao.ts`.
 */
export type ProtocoloAgir = 'openai-chat' | 'anthropic' | 'gemini' | 'ollama'

/** As 5 ferramentas do MVP (D72) — todas de ARQUIVO; terminal é FATIA 12. */
export type FerramentaId = 'ler' | 'listar' | 'buscar' | 'criar' | 'escrever'

/**
 * Argumentos como CHEGAM do modelo (canal nativo): tudo `unknown` de
 * propósito — quem valida antes de executar é a casa (C2), nunca confiamos
 * no formato que o modelo devolveu.
 */
export interface ArgumentosFerramenta {
  caminho?: unknown
  padrao?: unknown
  conteudo?: unknown
}

/** Um pedido de ferramenta extraído do canal nativo do provedor. */
export interface PedidoFerramenta {
  /** Id da chamada no protocolo (tool_call.id / tool_use.id …). */
  id: string
  ferramenta: FerramentaId
  argumentos: ArgumentosFerramenta
}

/**
 * Categorias HONESTAS de falha (mesma ideia da casa Conversa — nada de
 * "erro genérico"). `sem_canal_nativo` é a consequência assumida do Q4=(b)
 * (D93): provedor/modelo sem canal de ferramentas não usa o Agir.
 */
export type CategoriaErroAgir =
  | 'sem_canal_nativo' // o serviço/modelo não suporta ferramentas (Q4b, D93)
  | 'configuracao' // argumento obrigatório faltando ou torto
  | 'territorio' // caminho fora da pasta de trabalho (executado na C2)
  | 'endereco' // não alcançou o serviço
  | 'tempo' // serviço lento/parado
  | 'http' // outro erro do serviço (429, 5xx, 400…)
  | 'resposta' // resposta sem nada aproveitável
  | 'voltas' // estourou o teto de voltas do loop

/** Um erro da casa Agir em forma de porta (mesma ideia da casa Conversa). */
export interface ErroAgir {
  code: CategoriaErroAgir
  message: string
}

/** Mensagem do histórico do loop: o dono, a IA e as ferramentas falam. */
export interface MensagemAgir {
  papel: 'usuario' | 'assistente' | 'ferramenta'
  conteudo: string
  /** Preenchido quando papel = 'assistente' e a IA pediu ferramentas — o eco
   * fiel do que ela disse, para a próxima volta reconstruir o diálogo. */
  pedidos?: PedidoFerramenta[]
  /** Preenchidos quando papel = 'ferramenta'. */
  pedidoId?: string
  ferramenta?: FerramentaId
}

/**
 * Eventos do fio da casa Agir. O loop emite; a rota repassa por SSE na C3.
 * `approval` é o pedido de sim/não ao dono (o cartão da C3) — já nasce no
 * contrato porque o loop precisa saber onde parar e esperar.
 */
export type EventoAgir =
  | { type: 'chunk'; text: string }
  | { type: 'tool'; pedido: PedidoFerramenta }
  | { type: 'tool_result'; id: string; ferramenta: FerramentaId; ok: boolean; resumo: string }
  | { type: 'approval'; pedido: PedidoFerramenta }
  | { type: 'done'; model?: string }
  | { type: 'error'; code: CategoriaErroAgir; message: string }

/** O que o provedor responde numa volta (o vizinho real monta; o falso, nos testes). */
export interface RespostaVolta {
  /** Texto "falado" pela IA nesta volta (pode ser vazio se só pediu ferramenta). */
  texto: string
  /** Pedidos de ferramenta extraídos do canal nativo (vazio = resposta comum). */
  pedidos: PedidoFerramenta[]
  modelo?: string
}

/**
 * Quem fala com o provedor numa volta. A C2 liga isto no HTTP real de cada
 * protocolo (com o anúncio nativo das ferramentas); nos testes da C1 é falso.
 */
export type VizinhoProvedor = (mensagens: MensagemAgir[]) => Promise<RespostaVolta>

/** Resultado de executar uma ferramenta. */
export interface ResultadoFerramenta {
  ok: boolean
  /** Resumo curto para a TELA (o que aconteceu, em palavras de gente). */
  resumo: string
  /** Conteúdo lido (ferramenta `ler`) — vai para o MODELO, não para a tela. */
  conteudo?: string
}

/** Quem executa um pedido. C1 = falsos (prova do esqueleto); C2 = disco real. */
export type ExecutorFerramenta = (pedido: PedidoFerramenta) => Promise<ResultadoFerramenta>
