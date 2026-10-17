// Registro dos provedores (FATIA 08, D82): trava os invariantes do catálogo.
// Se alguém acrescentar um provedor "pela metade", este teste avisa na hora.
import { describe, expect, it } from 'vitest'
import { DESCRITORES, descritorPorId } from '../descritores/registro'
import type { Protocolo } from '../contract'

/** Protocolos que o servidor sabe atender (casa com server/probe.ts). */
const PROTOCOLOS_COM_ADAPTADOR: Protocolo[] = ['openai-chat', 'anthropic', 'gemini', 'ollama']

describe('Registro de provedores (D82)', () => {
  it('tem os 7 nativos + 1 genérico, com ids únicos', () => {
    expect(DESCRITORES).toHaveLength(8)
    const ids = DESCRITORES.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual([
      'openai',
      'nvidia',
      'anthropic',
      'gemini',
      'ollama',
      'openrouter',
      'deepseek',
      'openai-compat',
    ])
  })

  it('todo protocolo declarado tem adaptador no servidor', () => {
    for (const d of DESCRITORES) {
      expect(PROTOCOLOS_COM_ADAPTADOR, `${d.id} usa protocolo sem adaptador`).toContain(d.protocolo)
    }
  })

  it('nativo traz nome, URL base http(s), ajustes válidos e chave (exceto Ollama)', () => {
    for (const d of DESCRITORES.filter((x) => !x.generico)) {
      expect(d.nome.length, d.id).toBeGreaterThan(0)
      expect(d.baseUrlPadrao, d.id).toMatch(/^https?:\/\//)
      expect(d.padroes.contexto, d.id).toBeGreaterThan(0)
      expect(d.padroes.maxSaida, d.id).toBeGreaterThan(0)
      expect(d.padroes.temperatura, d.id).toBeGreaterThanOrEqual(0)
      expect(d.padroes.temperatura, d.id).toBeLessThanOrEqual(2)
      if (!d.chaveOpcional) expect(d.variavelAmbiente, d.id).toMatch(/^[A-Z0-9_]+$/)
    }
    expect(descritorPorId('ollama')?.chaveOpcional).toBe(true)
  })

  it('modelos locais não têm duplicatas (a lista é só sugestão, mas limpa)', () => {
    for (const d of DESCRITORES) {
      expect(new Set(d.modelosLocais).size, d.id).toBe(d.modelosLocais.length)
    }
  })

  it('existe EXATAMENTE 1 genérico ("Compatível com OpenAI", D82a — 1 slot)', () => {
    const genericos = DESCRITORES.filter((d) => d.generico)
    expect(genericos).toHaveLength(1)
    const g = genericos[0]
    expect(g.id).toBe('openai-compat')
    expect(g.nome).toBe('Compatível com OpenAI')
    // Genérico não chuta endereço nem variável de ambiente: o dono preenche.
    expect(g.baseUrlPadrao).toBe('')
    expect(g.variavelAmbiente).toBeUndefined()
    expect(g.protocolo).toBe('openai-chat')
  })

  it('descritorPorId responde pelos dois lados e recusa desconhecidos', () => {
    expect(descritorPorId('nvidia')?.nome).toBe('NVIDIA')
    expect(descritorPorId('openai-compat')?.generico).toBe(true)
    expect(descritorPorId('nao-existe')).toBeUndefined()
  })
})
