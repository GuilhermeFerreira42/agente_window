import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export interface ProvidersConfig {
  openai: { enabled: boolean; apiKeySource: 'environment' }
  gemini: { enabled: boolean; apiKeySource: 'environment' }
  ollama: { enabled: boolean; baseUrl: string }
}

export interface ProvidersPayload {
  config: ProvidersConfig
  environment: { openaiConfigured: boolean; geminiConfigured: boolean }
}

export const defaultProvidersConfig: ProvidersConfig = {
  openai: { enabled: false, apiKeySource: 'environment' },
  gemini: { enabled: false, apiKeySource: 'environment' },
  ollama: { enabled: false, baseUrl: 'http://localhost:11434' },
}

export function providersConfigPath(): string {
  return join(homedir(), '.agente_window', 'providers.json')
}

export function validateProvidersConfig(value: unknown): ProvidersConfig {
  if (!value || typeof value !== 'object') throw new Error('Configuração de provedores inválida')
  const input = value as Record<string, any>
  const enabled = (provider: string) => {
    if (typeof input[provider]?.enabled !== 'boolean') throw new Error(`${provider}.enabled deve ser boolean`)
    return input[provider].enabled as boolean
  }
  if (input.openai?.apiKeySource !== 'environment' || input.gemini?.apiKeySource !== 'environment') {
    throw new Error('As chaves devem vir de variáveis de ambiente')
  }
  if (typeof input.ollama?.baseUrl !== 'string') throw new Error('ollama.baseUrl é obrigatório')
  let url: URL
  try { url = new URL(input.ollama.baseUrl) } catch { throw new Error('URL do Ollama inválida') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL do Ollama deve usar http ou https')
  return {
    openai: { enabled: enabled('openai'), apiKeySource: 'environment' },
    gemini: { enabled: enabled('gemini'), apiKeySource: 'environment' },
    ollama: { enabled: enabled('ollama'), baseUrl: url.toString().replace(/\/$/, '') },
  }
}

export async function readProvidersConfig(path = providersConfigPath()): Promise<ProvidersPayload> {
  let config = defaultProvidersConfig
  try { config = validateProvidersConfig(JSON.parse(await readFile(path, 'utf8'))) }
  catch (error: any) { if (error?.code !== 'ENOENT') throw error }
  return {
    config,
    environment: { openaiConfigured: Boolean(process.env.OPENAI_API_KEY), geminiConfigured: Boolean(process.env.GEMINI_API_KEY) },
  }
}

export async function writeProvidersConfig(config: unknown, path = providersConfigPath()): Promise<ProvidersPayload> {
  const validated = validateProvidersConfig(config)
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}`
  await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temporary, path)
  return readProvidersConfig(path)
}
