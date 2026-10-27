// ============================================================================
// Casa Provedores — CONTRATO (a "porta" da casa).
// Bairro 2 (Inteligência) · FATIA 08 · D69.
//
// Este arquivo é a fronteira LEGO: tipos que atravessam a porta (cliente ↔
// servidor). Nada de `any` (04 §2.1). Quem está fora da casa importa SÓ
// `../provedores` (barrel) — nunca um arquivo interno (ver __tests__/frontier).
// ============================================================================

/** Como o serviço fala: define qual adaptador de conexão é usado no servidor. */
export type Protocolo = 'openai-chat' | 'anthropic' | 'gemini' | 'ollama'

/** Capability é evidência sobre o par configurado, não uma permissão de ferramenta. */
export type ToolCallingCapabilityStatus = 'declared' | 'verified' | 'unknown' | 'incompatible'
export type ToolCallingCheckReason =
  | 'roundtrip_verified'
  | 'explicit_tools_unsupported'
  | 'adapter_missing_field'
  | 'adapter_parameter_unsupported'
  | 'authentication_failure'
  | 'network_failure'
  | 'provider_error'
  | 'no_tool_call'
  | 'invalid_tool_call'
  | 'continuation_failed'
  | 'configuration_changed'

/** Registro apenas de servidor; fingerprint é derivado e nunca vai à interface. */
export interface ToolCallingAssessmentRecord {
  status: ToolCallingCapabilityStatus
  fingerprint: string
  adapterVersion: string
  checkedAt: string
  reason: ToolCallingCheckReason
}

export interface ToolCallingAssessmentView {
  status: ToolCallingCapabilityStatus
  checkedAt: string | null
  reason: ToolCallingCheckReason | null
}

/** Verbete declarativo de um provedor — é DADO, não tela (openclaude/04). */
export interface Descritor {
  id: string
  nome: string
  protocolo: Protocolo
  /** URL base padrão; vazio no genérico (o dono preenche). */
  baseUrlPadrao: string
  /** Onde o dono consegue a chave (link "pegar a chave aqui"). */
  urlChave?: string
  /** Variável de ambiente que pode suprir a chave, quando não há chave salva (D84). */
  variavelAmbiente?: string
  /** Lista de partida de modelos (só sugestão; digitar à mão sempre vale). */
  modelosLocais: readonly string[]
  /** Valores iniciais dos ajustes avançados. */
  padroes: { contexto: number; maxSaida: number; temperatura: number }
  /** Ollama local não exige chave. */
  chaveOpcional?: boolean
  /** Genérico ("Compatível com OpenAI"): pede nome e URL em branco. */
  generico?: boolean
  /** Linha curta exibida sob o nome no formulário. */
  dica?: string
}

/** O que fica SALVO por provedor em `~/.agente_window/providers.json`. */
export interface ProvedorConfig {
  /** Só no genérico (nome do serviço: "Groq", "LM Studio"...). */
  nome?: string
  baseUrl: string
  /** Modelo padrão do provedor, mantido como Auto/default compatível. */
  modelo: string
  /** Modelos explicitamente habilitados; identificadores exatos/case-sensitive. */
  modelosHabilitados?: string[]
  /** Provedor presente mas desabilitado fica indisponível sem apagar histórico/preferências. */
  habilitado?: boolean
  apiKey?: string
  contexto?: number
  maxSaida?: number
  temperatura?: number
}

export interface ArquivoProvedores {
  versao: 4
  /** Provedor que o chat vai usar (FATIA 09). */
  ativo: string | null
  provedores: Record<string, ProvedorConfig>
  /** Só escrita no backend; o PUT da tela jamais pode forjar uma verificação. */
  toolCallingAssessments: Record<string, Record<string, ToolCallingAssessmentRecord>>
}

/** Provedor como a TELA vê: a chave nunca vem inteira (D83 — só sob clique). */
export interface ProvedorNaTela {
  id: string
  nome: string
  baseUrl: string
  modelo: string
  modelosHabilitados: string[]
  habilitado: boolean
  contexto: number
  maxSaida: number
  temperatura: number
  /** Ex.: `••••••••a1b2` — ou null quando não há chave. */
  chaveMascarada: string | null
  /** De onde a chave viria: salva no app > ambiente (D84). */
  origemChave: 'salva' | 'ambiente' | null
  /** Qual variável de ambiente supriria a chave, se existir. */
  variavelAmbiente: string | null
}

export interface ItemCatalogoModelo {
  providerId: string
  modelId: string
  label: string
  protocol: Protocolo
  /** Status da evidência atual para este par e adaptador. */
  capability: ToolCallingCapabilityStatus
  assessment: ToolCallingAssessmentView
}

export interface EstadoProvedores {
  provedores: ProvedorNaTela[]
  catalogo: ItemCatalogoModelo[]
  ativo: string | null
  /** 'fixture' = arquivo de teste (E2E); 'repo-home' = arquivo real do dono. */
  storage: 'fixture' | 'repo-home'
}

/** Categorias HONESTAS de resultado do teste de conexão (nada de "erro genérico"). */
export type CategoriaTeste = 'ok' | 'chave' | 'endereco' | 'tempo' | 'http' | 'resposta'

export interface ResultadoTeste {
  ok: boolean
  categoria: CategoriaTeste
  mensagem: string
  /** Quantos modelos o serviço mostrou (quando o serviço souber listar). */
  modelos?: number
  ms: number
}

export interface ResultadoModelos {
  ok: boolean
  modelos: string[]
  mensagem?: string
}

export interface ResultadoVerificacaoToolCalling {
  providerId: string
  modelId: string
  status: ToolCallingCapabilityStatus
  checkedAt: string
  cached: boolean
  reason: ToolCallingCheckReason
}

/** Payload do PUT: apiKey ausente = mantém a guardada; '' = apaga. */
export interface SalvarProvedoresInput {
  ativo?: string | null
  provedores: Record<string, ProvedorConfig>
}
