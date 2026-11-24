import { describe, expect, it } from 'vitest'
import type { AlvoConversa } from '../../conversa'
import type { PerfilMultimodal } from '../../../../../domain/multimodal'
import { avaliarAlvoVisao, identidadeVisao } from '../server/capacidadeVisao'
import { LIMITES_LOCAIS_VISAO } from '../server/limitesVisao'

const alvo: AlvoConversa = { providerId: 'fixture', modelId: 'modelo-fixo', modelo: 'modelo-fixo', protocolo: 'openai-chat', baseUrl: 'http://127.0.0.1:19999/v1', apiKey: 'segredo-fixture' }
const chave = { operacao: 'analisar-imagem', direcao: 'entrada', modalidade: 'imagem', representacao: 'inline-base64' } as const
const revisoes = { configuracao: 'revisao-completa-fornecida-pelo-dono', api: 'chat-completions-fixture-v1' }
function prova(atual = alvo): PerfilMultimodal {
  const id = identidadeVisao(atual, revisoes)!
  return { alvo: id, entradas: [{ chave, evidencias: [{ alvo: id, estado: 'suportada', origem: 'teste-do-adaptador', revisao: 'fixture-unica', consultadaEm: '2026-11-13T00:00:00Z' }] }] }
}
const fonte = { topologia: 'individual-comprovada' as const, perfil: prova(), limites: LIMITES_LOCAIS_VISAO }

describe('MM-I — gate isolado de capacidade e identidade', () => {
  it('só permite par exato com evidência verificada, topologia e limites completos', () => {
    expect(avaliarAlvoVisao(alvo, revisoes, fonte).estado).toBe('disponivel')
    expect(avaliarAlvoVisao(alvo, revisoes).estado).toBe('desconhecida')
    expect(avaliarAlvoVisao(alvo, { ...revisoes, configuracao: 'mudou' }, fonte).estado).toBe('desconhecida')
    expect(avaliarAlvoVisao(alvo, { ...revisoes, api: '' }, fonte).estado).toBe('desconhecida')
    expect(avaliarAlvoVisao(alvo, revisoes, { ...fonte, topologia: 'desconhecida' }).estado).toBe('desconhecida')
    expect(avaliarAlvoVisao(alvo, revisoes, { ...fonte, limites: { ...fonte.limites, pixels: NaN } }).estado).toBe('desconhecida')
    expect(avaliarAlvoVisao(alvo, revisoes, { ...fonte, limites: { ...fonte.limites, corpoBytes: 0 } }).estado).toBe('desconhecida')
  })
  it('não transfere evidência para outro endpoint, modelo, protocolo, chave ou configuração', () => {
    const mudancas: Partial<AlvoConversa>[] = [
      { baseUrl: 'http://127.0.0.1:20000/v1' }, { modelId: 'alias', modelo: 'alias' },
      { providerId: 'outro' }, { protocolo: 'anthropic' }, { apiKey: 'outra' },
      { temperatura: 0.5 }, { maxSaida: 1234 },
    ]
    for (const mudanca of mudancas) expect(avaliarAlvoVisao({ ...alvo, ...mudanca }, revisoes, fonte).estado).not.toBe('disponivel')
  })
  it('declaração manual e evidência negativa não autorizam; pool nunca é inferido pelo nome', () => {
    const manual = prova(); const evidencia = manual.entradas[0].evidencias[0]
    const perfilManual = { ...manual, entradas: [{ chave, evidencias: [{ ...evidencia, origem: 'declaracao-manual' as const }] }] }
    expect(avaliarAlvoVisao(alvo, revisoes, { ...fonte, perfil: perfilManual }).estado).toBe('desconhecida')
    const perfilNegativo = { ...manual, entradas: [{ chave, evidencias: [evidencia, { ...evidencia, estado: 'nao-suportada' as const }] }] }
    expect(avaliarAlvoVisao(alvo, revisoes, { ...fonte, perfil: perfilNegativo }).estado).toBe('indisponivel')
    expect(avaliarAlvoVisao(alvo, revisoes, { ...fonte, topologia: 'pool' }).estado).toBe('desconhecida')
  })
  it('não cria identidade para par inconsistente ou incompleto; não revela segredo no identificador', () => {
    expect(identidadeVisao({ ...alvo, modelo: 'outro' }, revisoes)).toBeNull()
    expect(identidadeVisao({ ...alvo, providerId: undefined }, revisoes)).toBeNull()
    expect(JSON.stringify(identidadeVisao(alvo, revisoes))).not.toContain('segredo-fixture')
    expect(JSON.stringify(identidadeVisao(alvo, revisoes))).not.toContain('127.0.0.1')
  })
})
