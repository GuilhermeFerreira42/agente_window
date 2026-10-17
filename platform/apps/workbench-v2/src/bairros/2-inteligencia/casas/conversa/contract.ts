// ============================================================================
// Casa Conversa — contrato da FATIA 09 (chat real + streaming).
// Regras duras (SPEC §3): a chave NUNCA sai do servidor; o navegador fala
// SÓ com `/api/chat`; a resposta vem por eventos — nunca texto falso.
// ============================================================================
/** * Mesmos 4 protocolos da casa Provedores — espelho de TIPO (a casa vizinha não * é importada: o grafo do vite.config não pode alcançar arquivos .tsx). * A sincronia é FORÇADA no typecheck: `chatAlvo.ts` atribui * `descritor.protocolo` num `AlvoConversa` — provedor ganhar protocolo novo = * erro de tipo aqui, obrigando a atualizar este espelho. */export type ProtocoloConversa = 'openai-chat' | 'anthropic' | 'gemini' | 'ollama'

/** Categorias HONESTAS de falha (nada de "erro genérico"). */
export type CategoriaErro =
  | 'sem_provedor' // ninguém escolhido em Provedores
  | 'configuracao' // endereço ou modelo faltando no cadastro
  | 'chave' // 401/403, ou chave obrigatória ausente
  | 'endereco' // não alcançou o serviço (fora do ar / offline)
  | 'tempo' // timeout (C1: resposta inteira; C2: primeiro byte × total)
  | 'limite' // 413 — histórico grande demais para o modelo
  | 'http' // outro status de erro do serviço (429, 5xx, 400...)
  | 'resposta' // 2xx sem texto aproveitável (nada de inventar)

export interface ErroConversa {
  code: CategoriaErro
  message: string
}

export interface MensagemChat {
  role: 'user' | 'assistant'
  content: string
}

/** O que a tela manda: o histórico da conversa atual (decisão G5). */
export interface PedidoChat {
  messages: MensagemChat[]
}

/**
 * O alvo efetivo da conversa — montado pela prefeitura (únicos que podem
 * juntar a casa Provedores — dados/chave — com esta casa).
 */
export interface AlvoConversa {
  protocolo: ProtocoloConversa
  baseUrl: string
  modelo: string
  apiKey: string | null
  temperatura?: number
  maxSaida?: number
}

/** Resultado da montagem do alvo (pré-condição antes do SSE abrir). */
export interface AlvoOuErro {
  alvo: AlvoConversa | null
  erro?: ErroConversa
}

export type ObterAlvo = () => Promise<AlvoOuErro>

/**
 * Eventos do fio de conversa (SSE `data: {...}`).
 * Hoje: chunk · done · error. A FATIA 10 soma os eventos de ferramenta.
 */
export type EventoChat =
  | { type: 'chunk'; text: string }
  | { type: 'done' }
  | { type: 'error'; code: CategoriaErro; message: string }
