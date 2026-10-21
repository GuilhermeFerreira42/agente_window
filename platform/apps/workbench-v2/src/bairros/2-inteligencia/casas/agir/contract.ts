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

/** As 5 ferramentas do MVP (D72) — todas de ARQUIVO; terminal-visual é FATIA 16; terminal-agente é FATIA 13 (pós-D95). */
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
  | 'chave' // 401/403 — chave inválida ou ausente
  | 'endereco' // não alcançou o serviço
  | 'tempo' // serviço lento/parado
  | 'http' // outro erro do serviço (429, 5xx, 400…)
  | 'resposta' // resposta sem nada aproveitável
  | 'iteracoes' // (legado da 10 — o teto agora é o evento `teto`, sem erro)
  | 'loop' // guardião: 3 chamadas idênticas seguidas (anti-loop, C4)
  | 'fluxo' // a execução já não espera mais (recarregou, terminou ou retomada vencida)

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
   * fiel do que ela disse, para a próxima iteração reconstruir o diálogo. */
  pedidos?: PedidoFerramenta[]
  /** Preenchidos quando papel = 'ferramenta'. */
  pedidoId?: string
  ferramenta?: FerramentaId
}

/**
 * Mensagem SIMPLES no fio da rota (o que a tela manda: o histórico visível
 * da conversa — mesma forma do `/api/chat` da casa vizinha, G5).
 */
export interface MensagemSimples {
  role: 'user' | 'assistant'
  content: string
}

/** A resposta do dono ao cartão (os 3 botões). */
export type DecisaoAprovacao = 'permitir' | 'negar' | 'sessao'

/**
 * Eventos do fio da casa Agir. O loop emite; a rota repassa por SSE na C3.
 * `approval` é o pedido de sim/não ao dono (o cartão da C3) — já nasce no
 * contrato porque o loop precisa saber onde parar e esperar. `teto` (FATIA
 * 11) é a pausa honesta ao bater o limite: NÃO é erro — o dono continua
 * (mesmo fluxo, orçamento cheio) ou para por aqui. `iteracao` (pós-11) anuncia
 * cada ida ao modelo para a tela mostrar o progresso ("iteração 2 de 25").
 * Um `error` TRANSITÓRIO (tempo/endereco/http) pode trazer `retomavel` com
 * iteracoes+teto: a rota guardou o diálogo e a tela oferece continuar de onde parou.
 */
export type EventoAgir =
  | { type: 'chunk'; text: string }
  | { type: 'tool'; pedido: PedidoFerramenta }
  | { type: 'tool_result'; id: string; ferramenta: FerramentaId; ok: boolean; resumo: string }
  | { type: 'approval'; pedido: PedidoFerramenta }
  | { type: 'iteracao'; iteracao: number; teto: number }
  | { type: 'teto'; iteracoes: number; teto: number }
  | { type: 'done'; model?: string }
  | { type: 'error'; code: CategoriaErroAgir; message: string; retomavel?: boolean; iteracoes?: number; teto?: number }

/** O que o provedor responde numa iteração (o vizinho real monta; o falso, nos testes). */
export interface RespostaIteracao {
  /** Texto "falado" pela IA nesta iteração (pode ser vazio se só pediu ferramenta). */
  texto: string
  /** Pedidos de ferramenta extraídos do canal nativo (vazio = resposta comum). */
  pedidos: PedidoFerramenta[]
  modelo?: string
}

/**
 * Quem fala com o provedor numa iteração. C2 liga isto no HTTP real de cada
 * protocolo (com o anúncio nativo das ferramentas); nos testes da C1 é falso.
 * Contrato do fio: os PEDAÇOS de texto saem AO VIVO por `opcoes.aoTexto` —
 * quem implementa o vizinho é responsável por chamá-lo; o loop não repete
 * o texto depois (fonte única). `sinal` = Parar do dono.
 */
export interface OpcoesVizinho {
  aoTexto?: (pedaco: string) => void
  sinal?: AbortSignal
}

export type VizinhoProvedor = (
  mensagens: MensagemAgir[],
  opcoes?: OpcoesVizinho,
) => Promise<RespostaIteracao>

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
