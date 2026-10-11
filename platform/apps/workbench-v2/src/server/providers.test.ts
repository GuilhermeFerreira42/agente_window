import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { readProvidersConfig, validateProvidersConfig, writeProvidersConfig } from './providers'

afterEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.GEMINI_API_KEY
})

describe('providers.json', () => {
  it('grava somente configuração sem chaves em texto puro', async () => {
    const path = join(await mkdtemp(join(tmpdir(), 'providers-')), 'providers.json')
    process.env.OPENAI_API_KEY = 'segredo-que-nao-pode-ser-gravado'
    const payload = await writeProvidersConfig({
      openai: { enabled: true, apiKeySource: 'environment', apiKey: 'ignorar' },
      gemini: { enabled: false, apiKeySource: 'environment' },
      ollama: { enabled: true, baseUrl: 'http://localhost:11434/' },
    }, path)
    const raw = await readFile(path, 'utf8')
    expect(raw).not.toContain('segredo')
    expect(raw).not.toContain('apiKey"')
    expect(payload.config.ollama.baseUrl).toBe('http://localhost:11434')
    expect(payload.environment.openaiConfigured).toBe(true)
    expect((await readProvidersConfig(path)).config.openai.enabled).toBe(true)
  })

  it('recusa fonte de chave e URL inválidas', () => {
    expect(() => validateProvidersConfig({ openai: { enabled: true, apiKeySource: 'file' }, gemini: { enabled: false, apiKeySource: 'environment' }, ollama: { enabled: true, baseUrl: 'localhost' } })).toThrow(/variáveis de ambiente/)
    expect(() => validateProvidersConfig({ openai: { enabled: true, apiKeySource: 'environment' }, gemini: { enabled: false, apiKeySource: 'environment' }, ollama: { enabled: true, baseUrl: 'localhost' } })).toThrow(/URL do Ollama inválida/)
  })
})
