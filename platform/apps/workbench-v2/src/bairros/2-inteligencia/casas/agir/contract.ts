// ============================================================================
// Casa Agir — contrato de ferramentas de arquivo e, na FATIA 13, execução one-shot.
// O modo efetivo é registrado no servidor; Perguntar/Planejar são somente leitura.
// Agir permite criar/escrever sem confirmação repetitiva; operações destrutivas
// seguem consentimento específico, cartão ou dois opt-ins de D138. O workspace ancora caminhos relativos.
// Q4 (D93) = canal NATIVO: cada protocolo tem seu extrator de pedidos.
// ============================================================================
/**
 * Espelho de TIPO dos 4 protocolos da casa Conversa (a casa vizinha não é
 * importada — regra LEGO). A sincronia é forçada no typecheck quando a C2
 * ligar o vizinho real: protocolo ganhar/remover variante = erro aqui,
 * obrigando a revisar os extratores de `server/extracao.ts`.
 */
import type { MedicaoContexto } from '../../../../domain/usoContexto'

export type ProtocoloAgir = 'openai-chat' | 'anthropic' | 'gemini' | 'ollama'

/** Ferramentas de arquivo existentes + executar one-shot da Fatia 13. O PTY visual permanece separado e intocado. */
export type FerramentaId = 'ler' | 'listar' | 'buscar' | 'criar' | 'escrever' | 'excluir' | 'executar'

/** Nível de aprovação separado do modo de trabalho. O servidor é autoridade. */
export type NivelPermissaoAgir = 'manual' | 'allow-all'

/** IDs visuais estritos; o servidor mapeia agent/edit para a mesma política. */
export type ModoAgir = 'agent' | 'edit' | 'ask' | 'plan'

/**
 * Argumentos como CHEGAM do modelo (canal nativo): tudo `unknown` de
 * propósito — quem valida antes de executar é a casa (C2), nunca confiamos
 * no formato que o modelo devolveu.
 */
export interface ArgumentosFerramenta {
  caminho?: unknown
  padrao?: unknown
  conteudo?: unknown
  /** Comando de shell explícito; cwd é sempre resolvido no servidor. */
  comando?: unknown
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
 * "erro genérico"). Rejeições HTTP do provedor são erros recuperáveis e
 * não alteram a seleção nem bloqueiam tentativas futuras.
 */
export type CategoriaErroAgir =
  | 'configuracao' // argumento obrigatório faltando ou torto
  | 'territorio' // caminho fora da pasta de trabalho (executado na C2)
  | 'chave' // 401/403 — chave inválida ou ausente
  | 'model_disabled' // par exato foi desabilitado/removido antes da chamada
  | 'selection_unavailable' // provedor indisponível antes da chamada
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
  id?: string
  role: 'user' | 'assistant'
  content: string
}

/** A resposta do dono ao cartão (os 3 botões). */
export type DecisaoAprovacao = 'permitir' | 'negar' | 'sessao'

/**
 * Eventos do fio da casa Agir. O loop emite; a rota repassa por SSE na C3.
 * `approval` é o pedido de sim/não ao dono (o cartão da C3) — já nasce no
 * contrato porque o loop precisa saber onde parar e esperar. `previa` (FATIA 12) carrega o que o servidor viu no disco (prévia do arquivo ou confirmação resumida da pasta) para o cartão reforçado do `excluir`. `teto` (FATIA
 * 11) é a pausa honesta ao bater o limite: NÃO é erro — o dono continua
 * (mesmo fluxo, orçamento cheio) ou para por aqui. `iteracao` (pós-11) anuncia
 * cada ida ao modelo para a tela mostrar o progresso ("iteração 2 de 25").
 * Um `error` TRANSITÓRIO (tempo/endereco/http) pode trazer `retomavel` com
 * iteracoes+teto: a rota guardou o diálogo e a tela oferece continuar de onde parou.
 */
export type EventoAgir =
  | { type: 'chunk'; text: string }
  | { type: 'context_usage'; medicao: MedicaoContexto }
  | { type: 'tool'; pedido: PedidoFerramenta }
  | { type: 'tool_result'; id: string; ferramenta: FerramentaId; ok: boolean; resumo: string; efeitoIniciado?: boolean }
  | { type: 'approval'; pedido: PedidoFerramenta; previa?: string; allowSession?: boolean }
  | { type: 'tool_progress'; id: string; text: string }
  | { type: 'command_waiting'; id: string }
  | { type: 'iteracao'; iteracao: number; teto: number; model?: string }
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
  usoContexto?: Omit<MedicaoContexto, 'iteracao'>
}

/**
 * Instrução de PRODUTO (D141 / E-1, opção (b)): o que o produto manda o modelo
 * fazer, distinto do que o usuário disse. Viaja em campo próprio, FORA do array
 * de mensagens — nunca como `papel:'usuario'`, e nunca entra no transcript.
 *
 * O nome NÃO é `InstrucaoAgir` de propósito: esta casa já tem `InstrucaoHumana`
 * (`server/rotas.ts`), que é o conceito oposto em segurança — recibos opacos de
 * uma ação humana que "nunca são extraídos de messages nem enviados ao
 * provedor". Esta aqui É enviada ao provedor. Dois tipos de nome quase igual e
 * regra de segurança oposta é acidente anunciado; o campo também se chama
 * `instrucoesDeProduto`, e não `instrucoes`, porque `rotas.ts` já tem um
 * `const instrucoes` que guarda os recibos humanos.
 *
 * `MensagemAgir.papel` não ganha `'system'` de propósito: isso obrigaria os
 * quatro protocolos a traduzir um papel novo e poluiria o registro fiel da
 * conversa. Cada protocolo recebe a instrução pelo próprio mecanismo nativo
 * (ver `server/dialogo.ts` → `aplicarInstrucoes`).
 */
export interface InstrucaoDeProduto {
  /** De onde veio — para auditoria e para um anúncio honesto ao modelo. */
  origem: 'skill'
  /** Identificador estável do item (`<escopo>:<nome>` na casa Personalizações). */
  id: string
  /** Nome de invocação (`/nome`). */
  nome: string
  /** Corpo da instrução: o conteúdo do SKILL.md depois do frontmatter. */
  corpo: string
}

/**
 * Quem fala com o provedor numa iteração. C2 liga isto no HTTP real de cada
 * protocolo (com o anúncio nativo das ferramentas); nos testes da C1 é falso.
 * Contrato do fio: os PEDAÇOS de texto saem AO VIVO por `opcoes.aoTexto` —
 * quem implementa o vizinho é responsável por chamá-lo; o loop não repete
 * o texto depois (fonte única). `sinal` = Parar do dono.
 *
 * `instrucoes` e `ferramentasPermitidas` são ADITIVOS e opcionais (D141):
 * ausentes, o comportamento é idêntico ao anterior.
 */
export interface OpcoesVizinho {
  aoTexto?: (pedaco: string) => void
  sinal?: AbortSignal
  /** Instruções de produto compostas pelo SERVIDOR (DP-06). */
  instrucoesDeProduto?: readonly InstrucaoDeProduto[]
  /**
   * Ferramentas que o anúncio ao modelo pode incluir (RF14-4). `undefined` =
   * catálogo inteiro, que é o comportamento histórico.
   */
  ferramentasPermitidas?: readonly string[]
}

export type VizinhoProvedor = (
  mensagens: MensagemAgir[],
  opcoes?: OpcoesVizinho,
) => Promise<RespostaIteracao>

/** Resultado de executar uma ferramenta. */
export interface ResultadoFerramenta {
  /** Exceção inesperada: parar sem repetir ferramenta com efeitos incertos. */
  erroTerminal?: boolean
  ok: boolean
  /** Resumo curto para a TELA (o que aconteceu, em palavras de gente). */
  resumo: string
  /** Conteúdo lido (ferramenta `ler`) — vai para o MODELO, não para a tela. */
  conteudo?: string
  /** Metadado interno da rota para ACK de cancelamento com efeitos possíveis. */
  efeitoIniciado?: boolean
  /** Conflito observado antes de mover: repetir o cartão, nunca autoautorizar. */
  requerNovaAprovacao?: boolean
}

/** Sinais e canais opcionais de execução; ferramentas antigas os ignoram. */
export interface ContextoExecucaoFerramenta {
  sinal?: AbortSignal
  aoProgresso?: (texto: string) => void
  aoLocalizador?: (localizador: LocalizadorFerramenta) => void
  /** Pergunta se deve continuar aguardando após cada janela de timeout. */
  aguardarContinuacao?: () => Promise<boolean>
}

export interface LocalizadorFerramenta {
  arquivo: string
  digest: string
  intervalo?: { inicioByte: number; fimByteExclusivo: number }
}

/** Quem executa um pedido. O loop e a rota continuam sendo donos de cancelamento e grants. */
export type ExecutorFerramenta = (pedido: PedidoFerramenta, contexto?: ContextoExecucaoFerramenta) => Promise<ResultadoFerramenta>
