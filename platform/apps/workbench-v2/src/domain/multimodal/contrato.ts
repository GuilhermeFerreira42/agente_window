// ============================================================================
// Domínio Multimodal — MM-0 — CONTRATO NEUTRO v1 (direção G2 aprovada).
//
// G2: armazenar qualquer formato como bytes inertes (sem whitelist) e
// transmitir/apresentar SOMENTE com capacidade efetiva comprovada. Esta
// fatia entrega só tipos neutros, validação pura e resultados de erro
// explícitos — sem rede, storage, geração, mídia na UI ou novos payloads.
//
// Regras duras deste arquivo (SPEC MM-0 §02):
//   • sem IO, sem relógio/aleatoriedade implícitos, sem React/Node/SDK;
//   • uma definição só de cada contrato (as casas só reexportam tipo);
//   • validação real de `unknown` — nada de casts, `any`, protótipos
//     herdados ou sucesso depois de descartar campos;
//   • resultado público = código + caminho estrutural, sem ecoar payload.
// ============================================================================

/** Modalidade da parte/artefato. `arquivo` é fallback neutro, não capacidade. */
export type Modalidade = 'texto' | 'imagem' | 'audio' | 'video' | 'arquivo'

export type DirecaoMultimodal = 'entrada' | 'saida'

/**
 * Representação contratada da capacidade. Aceitar um nome no tipo NÃO
 * habilita codec — suporte é decisão de `avaliarCapacidadeEfetiva`.
 */
export type RepresentacaoMultimodal =
  | 'texto'
  | 'inline-base64'
  | 'bytes'
  | 'stream'
  | 'file-id'
  | 'uri'
  | 'job'

/** Resultado público de validação: código opaco + caminho estrutural. */
export type ResultadoValidacao<T> =
  | { ok: true; valor: T }
  | { ok: false; codigo: string; caminho?: string }

export function okValido<T>(valor: T): ResultadoValidacao<T> {
  return { ok: true, valor }
}

export function falhaValidacao<T>(codigo: string, caminho?: string): ResultadoValidacao<T> {
  return caminho === undefined ? { ok: false, codigo } : { ok: false, codigo, caminho }
}

export const MODALIDADES: readonly Modalidade[] = ['texto', 'imagem', 'audio', 'video', 'arquivo']
export const DIRECOES: readonly DirecaoMultimodal[] = ['entrada', 'saida']
export const REPRESENTACOES: readonly RepresentacaoMultimodal[] = [
  'texto',
  'inline-base64',
  'bytes',
  'stream',
  'file-id',
  'uri',
  'job',
]

// ----------------------------------------------------------------------------
// Partes e envelope de mensagem
// ----------------------------------------------------------------------------

/**
 * Parte neutra da mensagem. A ordem é a do array (sem reordenação por
 * modalidade); `partId` é opaco e único apenas DENTRO da mensagem.
 * `nao-suportada` é o fallback de leitura de conteúdo futuro — o original
 * é preservado sem reescrita (a SPEC veta regravar discos antigos aqui).
 */
export type ParteMensagem =
  | { partId: string; tipo: 'texto'; texto: string }
  | { partId: string; tipo: 'artefato'; artifactId: string; modalidade: Modalidade }
  | { partId: string; tipo: 'nao-suportada'; codigo: string; tipoOriginal?: string }

/** Envelope v1 da mensagem neutra. */
export interface EnvelopeMensagemMultimodal {
  versao: 1
  messageId: string
  partes: readonly ParteMensagem[]
}

// ----------------------------------------------------------------------------
// Artefato — metadata segura, SEM autoridade de leitura/download
// ----------------------------------------------------------------------------

export type EstadoArtefato =
  | 'recebendo'
  | 'pronto'
  | 'parcial'
  | 'falhou'
  | 'cancelado'
  | 'limpeza-pendente'

export type OrigemArtefato = 'upload' | 'modelo'

export type PapelArmazenamento = 'upload-workspace' | 'upload-chat' | 'gerado-gerenciado'

export const ESTADOS_ARTEFATO: readonly EstadoArtefato[] = [
  'recebendo',
  'pronto',
  'parcial',
  'falhou',
  'cancelado',
  'limpeza-pendente',
]
export const ORIGENS_ARTEFATO: readonly OrigemArtefato[] = ['upload', 'modelo']
export const PAPEIS_ARMEZENAMENTO: readonly PapelArmazenamento[] = [
  'upload-workspace',
  'upload-chat',
  'gerado-gerenciado',
]

interface CamposArtefatoBase {
  versao: 1
  artifactId: string
  sessionId: string
  chatId: string
  origem: OrigemArtefato
  /** Label de apresentação — NUNCA monta caminho. */
  nome: string
  modalidade: Modalidade
  papelArmazenamento: PapelArmazenamento
  messageId?: string
  partId?: string
  runId?: string
  /** Geração, quando presente, é inteiro seguro não negativo. */
  generation?: number
  mimeDeclarado?: string
  mimeDetectado?: string
  providerId?: string
  modelId?: string
  requestId?: string
}

/**
 * DTO estrito do artefato. O tipo IMPÕE (typecheck) que `pronto` declare
 * `bytes` e `sha256`; estados em recebimento podem não tê-los. O validador
 * runtime repete a mesma regra. Nenhum campo de transporte/autoridade
 * (url, path, apiKey, headers, base64, bytes de conteúdo) existe aqui.
 */
export type ArtefatoMultimodal =
  | (CamposArtefatoBase & { estado: 'pronto'; bytes: number; sha256: string })
  | (CamposArtefatoBase & {
      estado: Exclude<EstadoArtefato, 'pronto'>
      bytes?: number
      sha256?: string
    })

// ----------------------------------------------------------------------------
// Capacidade — identidade, evidência, perfil, pedido e resultado
// ----------------------------------------------------------------------------

/** Destinos elegíveis conhecidos de um pool (IDs opacos + revisão do conjunto). */
export interface DestinosPool {
  revisao: string
  destinos: readonly string[]
}

/**
 * Identidade exata do alvo. Todos os campos vêm EXPLÍCITOS do dono da
 * configuração — nunca derivados de nome/alias/marca, sem normalização
 * de case e sem credencial na chave. `endpointIdentity` é opaco, não URL
 * assinada. MM-0 não persiste revisão nova: define/testa o contrato.
 */
export interface IdentidadeAlvoMultimodal {
  providerId: string
  modelId: string
  endpointIdentity: string
  protocolo: string
  apiRevision: string
  configRevision: string
  adapterRevision: string
  pool?: DestinosPool
}

export type EstadoEvidencia = 'suportada' | 'nao-suportada' | 'desconhecida'

export type OrigemEvidencia =
  | 'api'
  | 'documentacao'
  | 'catalogo-versionado'
  | 'declaracao-manual'
  | 'teste-do-adaptador'

export const ESTADOS_EVIDENCIA: readonly EstadoEvidencia[] = ['suportada', 'nao-suportada', 'desconhecida']
export const ORIGENS_EVIDENCIA: readonly OrigemEvidencia[] = [
  'api',
  'documentacao',
  'catalogo-versionado',
  'declaracao-manual',
  'teste-do-adaptador',
]

/**
 * Evidência de suporte/negativa sobre UMA identidade. `consultadaEm` é data
 * explícita válida; sem TTL implícito — obsolescência é decisão de
 * identidade/revisões e política recebida. Origem `declaracao-manual`
 * não é confirmação e não sobrepõe negativo verificado.
 */
export interface EvidenciaCapacidade {
  alvo: IdentidadeAlvoMultimodal
  estado: EstadoEvidencia
  origem: OrigemEvidencia
  revisao: string
  consultadaEm: string
}

/** Combinação: operação + direção + modalidade + representação. */
export interface ChaveCapacidade {
  operacao: string
  direcao: DirecaoMultimodal
  modalidade: Modalidade
  representacao: RepresentacaoMultimodal
}

export type MedidaId = 'max-bytes' | 'max-caracteres' | 'max-duracao'

export type UnidadeRestricao = 'bytes' | 'caracteres' | 'ms'

/**
 * Restrição com unidade e semântica explícitas (discriminada: unidade
 * incompatível com a medida não compila nem passa no validador). Zero é
 * limite real de zero — nunca vira "ilimitado" por truthiness.
 */
export type RestricaoMedida =
  | { medida: 'max-bytes'; unidade: 'bytes'; valorMaximo: number }
  | { medida: 'max-caracteres'; unidade: 'caracteres'; valorMaximo: number }
  | { medida: 'max-duracao'; unidade: 'ms'; valorMaximo: number }

export const UNIDADE_DA_RESTRICAO: Record<MedidaId, UnidadeRestricao> = {
  'max-bytes': 'bytes',
  'max-caracteres': 'caracteres',
  'max-duracao': 'ms',
}

export const MEDIDAS_IDS: readonly MedidaId[] = ['max-bytes', 'max-caracteres', 'max-duracao']

/** Evidências agregadas para uma combinação, dentro de um perfil. */
export interface EntradaPerfilMultimodal {
  chave: ChaveCapacidade
  evidencias: readonly EvidenciaCapacidade[]
  restricoes?: readonly RestricaoMedida[]
}

/**
 * Perfil agrega evidências por combinação PARA UMA identidade. O avaliador
 * recusa perfil de outro modelo/endpoint (nunca "emprestar" suporte).
 */
export interface PerfilMultimodal {
  alvo: IdentidadeAlvoMultimodal
  entradas: readonly EntradaPerfilMultimodal[]
}

/** Medida do conteúdo pedido (sem unidade solta — a unidade é da medida). */
export interface MedidaConteudo {
  medida: MedidaId
  valor: number
}

export interface PedidoCapacidade {
  operacao: string
  direcao: DirecaoMultimodal
  modalidade: Modalidade
  representacao: RepresentacaoMultimodal
  medidas?: readonly MedidaConteudo[]
}

/**
 * Declaração explícita do codec local implementado para a combinação.
 * Sem declaração para a combinação exata, suporte remoto nenhum vira
 * "disponível" (codec ausente/incompatível bloqueia).
 */
export interface DeclaracaoCodecLocal {
  chave: ChaveCapacidade
  implementado: boolean
}

export type EstadoCapacidadeEfetiva = 'disponivel' | 'indisponivel' | 'desconhecida'

/**
 * Resultado da decisão efetiva. Nunca inicia transmissão. `limitesEfetivos`
 * traz os máximos conhecidos/satisfeitos (no pool: interseção — mínimo por
 * medida, presente em TODOS os destinos; ausência permanece explícita).
 */
export interface ResultadoCapacidade {
  estado: EstadoCapacidadeEfetiva
  motivos: readonly string[]
  limitesEfetivos?: readonly RestricaoMedida[]
}

export interface EntradaAvaliacaoCapacidade {
  alvo: IdentidadeAlvoMultimodal
  pedido: PedidoCapacidade
  perfil?: PerfilMultimodal
  codec: DeclaracaoCodecLocal
}

export interface DestinoAvaliacaoPool {
  destinoId: string
  alvo: IdentidadeAlvoMultimodal
  perfil?: PerfilMultimodal
  codec: DeclaracaoCodecLocal
}

export interface EntradaComposicaoPool {
  /** Deve carregar `pool` (revisão + destinos elegíveis conhecidos). */
  alvo: IdentidadeAlvoMultimodal
  destinos: readonly DestinoAvaliacaoPool[]
  pedido: PedidoCapacidade
}

/** Entrada da adaptação de mensagem textual legada → envelope v1. */
export interface EntradaAdaptacaoLegada {
  /**
   * ID opaco EXISTENTE da mensagem legada (o `id` real da ChatMessage):
   * preservado verbatim como `messageId` do envelope — nunca substituído
   * por hash novo. Não impor UUID ao legado; só o `partId` é derivado.
   */
  identidade: string
  content: string
  /** Posição da mensagem na sequência legada (validada; não reescreve id). */
  indice: number
}

// ----------------------------------------------------------------------------
// Predicados e utilidades puras de validação (sem IO)
// ----------------------------------------------------------------------------

/**
 * Objeto de dado genuinamente plano: protótipo `Object.prototype` ou
 * `null`. Recusa instâncias de classe e `Object.create(proto)` — propriedade
 * herdada NUNCA confirma validação nem entra em montagem (SPEC 02 §1–2).
 */
export function ehObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return false
  const proto = Object.getPrototypeOf(valor)
  return proto === Object.prototype || proto === null
}

/** Acesso SOMENTE a propriedade própria — protótipo herdado nunca conta. */
export function temChavePropria(obj: Record<string, unknown>, chave: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, chave)
}

export function ehString(valor: unknown): valor is string {
  return typeof valor === 'string'
}

export function ehStringNaoVazia(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.length > 0
}

/** Primeira chave própria fora da lista permitida (rejeita extras de escrita). */
export function primeiraChaveDesconhecida(
  obj: Record<string, unknown>,
  permitidas: readonly string[],
): string | undefined {
  for (const chave of Object.keys(obj)) {
    if (!permitidas.includes(chave)) return chave
  }
  return undefined
}

/** Ausência de chave própria (diferente de valor `undefined` explícito). */
export function faltaChave(obj: Record<string, unknown>, chave: string): boolean {
  return !temChavePropria(obj, chave)
}

export function ehModalidade(valor: unknown): valor is Modalidade {
  return typeof valor === 'string' && (MODALIDADES as readonly string[]).includes(valor)
}

export function ehDirecao(valor: unknown): valor is DirecaoMultimodal {
  return typeof valor === 'string' && (DIRECOES as readonly string[]).includes(valor)
}

export function ehRepresentacao(valor: unknown): valor is RepresentacaoMultimodal {
  return typeof valor === 'string' && (REPRESENTACOES as readonly string[]).includes(valor)
}

export function ehEstadoArtefato(valor: unknown): valor is EstadoArtefato {
  return typeof valor === 'string' && (ESTADOS_ARTEFATO as readonly string[]).includes(valor)
}

export function ehOrigemArtefato(valor: unknown): valor is OrigemArtefato {
  return typeof valor === 'string' && (ORIGENS_ARTEFATO as readonly string[]).includes(valor)
}

export function ehPapelArmazenamento(valor: unknown): valor is PapelArmazenamento {
  return typeof valor === 'string' && (PAPEIS_ARMEZENAMENTO as readonly string[]).includes(valor)
}

export function ehEstadoEvidencia(valor: unknown): valor is EstadoEvidencia {
  return typeof valor === 'string' && (ESTADOS_EVIDENCIA as readonly string[]).includes(valor)
}

export function ehOrigemEvidencia(valor: unknown): valor is OrigemEvidencia {
  return typeof valor === 'string' && (ORIGENS_EVIDENCIA as readonly string[]).includes(valor)
}

export function ehMedidaId(valor: unknown): valor is MedidaId {
  return typeof valor === 'string' && (MEDIDAS_IDS as readonly string[]).includes(valor)
}

/** SHA canônico: 64 dígitos hexadecimais MINÚSCULOS. */
export function ehSha256Canonico(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[0-9a-f]{64}$/.test(valor)
}

/** Inteiro seguro não negativo (recusa NaN, infinito, fracionário, negativo). */
export function ehInteiroNaoNegativo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0
}
