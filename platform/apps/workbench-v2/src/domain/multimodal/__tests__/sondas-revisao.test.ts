// ============================================================================
// MM-0 — Sondas INDEPENDENTES do parecer técnico de 16/11/2026 (revisão
// Windows da recebida em 47c9a77). Reproduções literais dos achados
// MM0-A1..A5 (+A2/A3): cada `it` falhava contra a implementação anterior
// e precisa passar após as correções. Origem: revisor (sondas.test.ts);
// aqui apenas com o import relativo do repositório.
// ============================================================================

import { expect, it } from 'vitest'
import {
  adaptarMensagemLegada,
  avaliarCapacidadeEfetiva,
  comporCapacidadeDePool,
  validarArtefato,
} from '../index'
import type {
  ChaveCapacidade,
  IdentidadeAlvoMultimodal,
  PerfilMultimodal,
  RestricaoMedida,
} from '../index'

const alvo: IdentidadeAlvoMultimodal = {
  providerId: 'fixture',
  modelId: 'fixture',
  endpointIdentity: 'e1',
  protocolo: 'openai-chat',
  apiRevision: '1',
  configRevision: '1',
  adapterRevision: '1',
}
const chave: ChaveCapacidade = {
  operacao: 'gerar-imagem',
  direcao: 'saida',
  modalidade: 'imagem',
  representacao: 'bytes',
}
const codec = { chave, implementado: true }
const limite: RestricaoMedida = { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 10 }
function perfil(a: IdentidadeAlvoMultimodal = alvo, restricoes: RestricaoMedida[] = []): PerfilMultimodal {
  return {
    alvo: a,
    entradas: [
      {
        chave,
        restricoes,
        evidencias: [
          { alvo: a, estado: 'suportada', origem: 'api', revisao: '1', consultadaEm: '2026-11-16T12:00:00Z' },
        ],
      },
    ],
  }
}

it('MM0-A1: limite aplicável sem medida necessária não habilita saída', () => {
  const r = avaliarCapacidadeEfetiva({ alvo, pedido: chave, perfil: perfil(alvo, [limite]), codec })
  expect(r.estado).not.toBe('disponivel')
})

it('MM0-A1: pool não perde restrição conhecida somente em um destino', () => {
  const a = { ...alvo, endpointIdentity: 'a' }
  const b = { ...alvo, endpointIdentity: 'b' }
  const p = { ...alvo, pool: { revisao: '1', destinos: ['a', 'b'] } }
  const r = comporCapacidadeDePool({
    alvo: p,
    pedido: chave,
    destinos: [
      { destinoId: 'a', alvo: a, perfil: perfil(a, [limite]), codec },
      { destinoId: 'b', alvo: b, perfil: perfil(b), codec },
    ],
  })
  expect(r.estado !== 'disponivel' || r.limitesEfetivos?.some((x) => x.medida === 'max-bytes' && x.valorMaximo <= 10)).toBe(
    true,
  )
})

it('MM0-A3: avaliador público não habilita pool vazio por evidência agregada', () => {
  const p = { ...alvo, pool: { revisao: '1', destinos: [] as string[] } }
  const r = avaliarCapacidadeEfetiva({ alvo: p, pedido: chave, perfil: perfil(p), codec })
  expect(r.estado).not.toBe('disponivel')
})

it('MM0-A4: propriedades herdadas não confirmam identidade de capacidade', () => {
  const herdado = Object.create(alvo) as IdentidadeAlvoMultimodal
  const r = avaliarCapacidadeEfetiva({ alvo: herdado, pedido: chave, perfil: perfil(herdado), codec })
  expect(r.estado).not.toBe('disponivel')
})

it('MM0-A4: metadata opcional herdada não entra no DTO de artefato', () => {
  const entrada = Object.assign(Object.create({ messageId: 'vinculo-herdado' }), {
    versao: 1,
    artifactId: 'a',
    sessionId: 's',
    chatId: 'c',
    origem: 'upload',
    nome: 'f',
    modalidade: 'arquivo',
    papelArmazenamento: 'upload-chat',
    estado: 'recebendo',
  })
  const r = validarArtefato(entrada)
  expect(!r.ok || r.valor.messageId === undefined).toBe(true)
})

it('MM0-A5: adaptação preserva a identidade opaca da mensagem legada', () => {
  const r = adaptarMensagemLegada({ identidade: 'mensagem-legada-real', content: 'texto', indice: 0 })
  expect(r.ok && r.valor.messageId).toBe('mensagem-legada-real')
})

it('MM0-A2: entrada duplicada da mesma combinação não oculta evidência negativa atual', () => {
  const p = perfil()
  const positiva = p.entradas[0]
  const negativa = {
    ...positiva,
    evidencias: positiva.evidencias.map((e) => ({ ...e, estado: 'nao-suportada' as const })),
  }
  const r = avaliarCapacidadeEfetiva({
    alvo,
    pedido: chave,
    perfil: { alvo, entradas: [positiva, negativa] },
    codec,
  })
  expect(r.estado).not.toBe('disponivel')
})
