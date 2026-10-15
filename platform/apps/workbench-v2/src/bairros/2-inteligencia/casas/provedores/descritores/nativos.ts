// Descritores dos provedores nativos (D82) — um arquivo de DADO por provedor.
// Regra (openclaude/04): descritor é dado, não tela — nada de React aqui.
import type { Descritor } from '../contract'

export const openai: Descritor = {
  id: 'openai',
  nome: 'OpenAI',
  protocolo: 'openai-chat',
  baseUrlPadrao: 'https://api.openai.com/v1',
  urlChave: 'https://platform.openai.com/api-keys',
  variavelAmbiente: 'OPENAI_API_KEY',
  modelosLocais: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o4-mini'],
  padroes: { contexto: 128000, maxSaida: 4096, temperatura: 0.2 },
  dica: 'api.openai.com · formato OpenAI',
}

export const nvidia: Descritor = {
  id: 'nvidia',
  nome: 'NVIDIA',
  protocolo: 'openai-chat',
  baseUrlPadrao: 'https://integrate.api.nvidia.com/v1',
  urlChave: 'https://build.nvidia.com',
  variavelAmbiente: 'NVIDIA_API_KEY',
  modelosLocais: [
    'meta/llama-3.3-70b-instruct',
    'deepseek-ai/deepseek-r1',
    'qwen/qwen2.5-coder-32b-instruct',
    'openai/gpt-oss-120b',
  ],
  padroes: { contexto: 128000, maxSaida: 4096, temperatura: 0.2 },
  dica: 'NVIDIA NIM · catálogo em build.nvidia.com (formato OpenAI)',
}

export const anthropic: Descritor = {
  id: 'anthropic',
  nome: 'Anthropic',
  protocolo: 'anthropic',
  baseUrlPadrao: 'https://api.anthropic.com/v1',
  urlChave: 'https://console.anthropic.com/settings/keys',
  variavelAmbiente: 'ANTHROPIC_API_KEY',
  modelosLocais: ['claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-opus-4-1'],
  padroes: { contexto: 200000, maxSaida: 8192, temperatura: 0.2 },
  dica: 'api.anthropic.com · formato Anthropic',
}

export const gemini: Descritor = {
  id: 'gemini',
  nome: 'Google Gemini',
  protocolo: 'gemini',
  baseUrlPadrao: 'https://generativelanguage.googleapis.com/v1beta',
  urlChave: 'https://aistudio.google.com/apikey',
  variavelAmbiente: 'GEMINI_API_KEY',
  modelosLocais: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  padroes: { contexto: 1000000, maxSaida: 8192, temperatura: 0.2 },
  dica: 'generativelanguage.googleapis.com · formato Google',
}

export const ollama: Descritor = {
  id: 'ollama',
  nome: 'Ollama (local)',
  protocolo: 'ollama',
  baseUrlPadrao: 'http://localhost:11434',
  urlChave: 'https://ollama.com/download',
  modelosLocais: ['llama3.2', 'qwen2.5-coder', 'deepseek-r1'],
  padroes: { contexto: 32768, maxSaida: 4096, temperatura: 0.2 },
  chaveOpcional: true,
  dica: 'roda na sua máquina · não precisa de chave',
}

export const openrouter: Descritor = {
  id: 'openrouter',
  nome: 'OpenRouter',
  protocolo: 'openai-chat',
  baseUrlPadrao: 'https://openrouter.ai/api/v1',
  urlChave: 'https://openrouter.ai/keys',
  variavelAmbiente: 'OPENROUTER_API_KEY',
  modelosLocais: [
    'anthropic/claude-sonnet-4.5',
    'openai/gpt-4o',
    'meta-llama/llama-3.3-70b-instruct',
    'deepseek/deepseek-chat',
  ],
  padroes: { contexto: 128000, maxSaida: 4096, temperatura: 0.2 },
  dica: 'uma chave, muitos modelos · formato OpenAI',
}

export const deepseek: Descritor = {
  id: 'deepseek',
  nome: 'DeepSeek',
  protocolo: 'openai-chat',
  baseUrlPadrao: 'https://api.deepseek.com/v1',
  urlChave: 'https://platform.deepseek.com/api_keys',
  variavelAmbiente: 'DEEPSEEK_API_KEY',
  modelosLocais: ['deepseek-chat', 'deepseek-reasoner'],
  padroes: { contexto: 128000, maxSaida: 8192, temperatura: 0.2 },
  dica: 'api.deepseek.com · formato OpenAI',
}

/** O genérico (D82/D82a): 1 slot — o dono troca o serviço quando quiser. */
export const openaiCompat: Descritor = {
  id: 'openai-compat',
  nome: 'Compatível com OpenAI',
  protocolo: 'openai-chat',
  baseUrlPadrao: '',
  variavelAmbiente: undefined,
  modelosLocais: [],
  padroes: { contexto: 128000, maxSaida: 4096, temperatura: 0.2 },
  generico: true,
  dica: 'Groq, Mistral, LM Studio, xAI… qualquer serviço no formato OpenAI',
}
