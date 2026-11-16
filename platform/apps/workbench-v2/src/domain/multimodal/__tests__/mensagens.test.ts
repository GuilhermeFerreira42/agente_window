// ============================================================================
// MM-0 — testes de MENSAGENS: roundtrip legado, determinismo de IDs, ordem,
// fallback não textual e validador estrito de escrita (T02–T06, T21).
// Fixtures sintéticas, determinísticas, sem rede/IO.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { adaptarMensagemLegada, projetarTextoLegado, validarMensagemMultimodal } from '../mensagens'
import { projetarMensagemPersistida } from '../../projecaoTranscript'
import type { ChatMessage } from '../../../types'

const IDENTIDADE = 'chat-legado-0001'

function adaptar(content: string, indice = 0, identidade = IDENTIDADE) {
  const resultado = adaptarMensagemLegada({ identidade, content, indice })
  if (!resultado.ok) throw new Error(`adaptar falhou: ${resultado.codigo}`)
  return resultado.valor
}

describe('MM0-T02 — roundtrip textual byte a byte', () => {
  const CASOS: Array<[string, string]> = [
    ['simples', 'mensagem simples'],
    ['unicode e acentos', 'Mensagem com çãõé, emoji 🚀 e eslovaco Zażółć'],
    ['CRLF', 'linha1\r\nlinha2\r\nlinha3'],
    ['espaços extremos', '   \t  nas pontas   \t '],
    ['linhas vazias', '\n\ninício\n\n\nfim\n'],
    ['string vazia', ''],
    ['só espaços', '        '],
    ['astral/emoji', 'emoji 😀 em surrogates e kanji 日本語'],
    ['tabs e form feed', 'a\tb\u000cc'],
  ]

  for (const [nome, content] of CASOS) {
    it(`${nome}: adaptar → validar → projetar devolve exatamente o original`, () => {
      const envelope = adaptar(content)
      const validada = validarMensagemMultimodal(envelope)
      expect(validada.ok).toBe(true)
      const projetada = projetarTextoLegado(envelope)
      expect(projetada.ok).toBe(true)
      if (projetada.ok) expect(projetada.valor).toBe(content)
    })
  }
})

describe('MM0-T03 — determinismo, imutabilidade e não colisão de IDs', () => {
  it('duas chamadas com a mesma entrada produzem envelope idêntico', () => {
    expect(adaptar('mesmo texto', 3)).toEqual(adaptar('mesmo texto', 3))
  })

  it('a entrada congelada não é mutada', () => {
    const entrada = Object.freeze({ identidade: IDENTIDADE, content: 'rascunho fixo', indice: 2 })
    const antes = { ...entrada }
    adaptarMensagemLegada(entrada)
    expect({ ...entrada }).toEqual(antes)
    expect(Object.isFrozen(entrada)).toBe(true)
  })

  it('IDs legados são preservados verbatim — sem hash, sem normalização, sem truncamento', () => {
    const bases: Array<{ identidade: string; indice: number }> = [
      { identidade: 'a'.repeat(120), indice: 0 },
      { identidade: `${'a'.repeat(119)}b`, indice: 0 },
      { identidade: 'Chat', indice: 0 },
      { identidade: 'chat', indice: 0 },
      { identidade: 'chat ', indice: 0 },
      { identidade: ' chat', indice: 0 },
      { identidade: IDENTIDADE, indice: 0 },
      { identidade: IDENTIDADE, indice: 1 },
      { identidade: 'mm0|x|y|0', indice: 0 },
      { identidade: 'mm0|1|x|y|0', indice: 0 },
    ]
    // Cada envelope carrega exatamente o id legado de entrada (A5).
    for (const base of bases) {
      expect(adaptar('x', base.indice, base.identidade).messageId).toBe(base.identidade)
    }
    // Preservar não normaliza nem trunca: identidades distintas continuam
    // distintas ('Chat' ≠ 'chat' ≠ 'chat ' ≠ ' chat').
    const distintas = new Set(bases.map((base) => base.identidade))
    expect(distintas.size).toBe(9)
    // O par IDENTIDADE×índices é o MESMO id legado: o índice documenta a
    // posição na sequência e não reescreve nem deriva novo id.
    expect(adaptar('x', 0, IDENTIDADE).messageId).toBe(adaptar('x', 1, IDENTIDADE).messageId)
  })

  it('partId deriva do messageId e permanece único na mensagem', () => {
    const envelope = adaptar('texto')
    expect(envelope.partes).toHaveLength(1)
    expect(envelope.partes[0].partId).toBe(`${envelope.messageId}:0`)
  })
})

describe('MM0-T04 — ordem das partes e unicidade de partId', () => {
  const envelopeOrdem = {
    versao: 1,
    messageId: 'msg-ordeM',
    partes: [
      { partId: 'p1', tipo: 'texto', texto: 'primeiro ' },
      { partId: 'p2', tipo: 'artefato', artifactId: 'art-9', modalidade: 'imagem' },
      { partId: 'p3', tipo: 'texto', texto: ' último' },
    ],
  } as const

  it('ordem texto → artefato → texto é preservada sem reordenação', () => {
    const validada = validarMensagemMultimodal(envelopeOrdem)
    expect(validada.ok).toBe(true)
    if (validada.ok) {
      expect(validada.valor.partes.map((parte) => parte.tipo)).toEqual(['texto', 'artefato', 'texto'])
      expect(validada.valor.partes.map((parte) => parte.partId)).toEqual(['p1', 'p2', 'p3'])
      const textos = validada.valor.partes.filter((parte) => parte.tipo === 'texto')
      expect(textos.map((parte) => (parte.tipo === 'texto' ? parte.texto : ''))).toEqual([
        'primeiro ',
        ' último',
      ])
    }
  })

  it('repetir partId na mesma mensagem é erro', () => {
    const comDuplicata = {
      versao: 1,
      messageId: 'msg-dup',
      partes: [
        { partId: 'p1', tipo: 'texto', texto: 'a' },
        { partId: 'p1', tipo: 'texto', texto: 'b' },
      ],
    }
    const validada = validarMensagemMultimodal(comDuplicata)
    expect(validada.ok).toBe(false)
    if (!validada.ok) {
      expect(validada.codigo).toBe('partId-duplicado')
      expect(validada.caminho).toBe('$.partes[1].partId')
    }
  })

  it('IDs iguais em mensagens diferentes não são confundidos', () => {
    const mensagemA = { versao: 1, messageId: 'msg-a', partes: [{ partId: 'p1', tipo: 'texto', texto: 'a' }] }
    const mensagemB = { versao: 1, messageId: 'msg-b', partes: [{ partId: 'p1', tipo: 'texto', texto: 'b' }] }
    expect(validarMensagemMultimodal(mensagemA).ok).toBe(true)
    expect(validarMensagemMultimodal(mensagemB).ok).toBe(true)
  })

  it('partId vazio é recusado', () => {
    const validada = validarMensagemMultimodal({
      versao: 1,
      messageId: 'msg-x',
      partes: [{ partId: '', tipo: 'texto', texto: 'a' }],
    })
    expect(validada.ok).toBe(false)
  })
})

describe('MM0-T05 — parte só de artefato: envelope válido, projeção com falha explícita', () => {
  const soArtefato = {
    versao: 1,
    messageId: 'msg-so-artefato',
    partes: [{ partId: 'pa1', tipo: 'artefato', artifactId: 'artefato-foto-png', modalidade: 'imagem' }],
  }

  it('o envelope neutro de só-mídia é válido', () => {
    expect(validarMensagemMultimodal(soArtefato).ok).toBe(true)
  })

  it('reduzir a texto retorna erro explícito — nunca vazio, nome de arquivo ou String(objeto)', () => {
    const projetada = projetarTextoLegado(soArtefato)
    expect(projetada.ok).toBe(false)
    if (!projetada.ok) {
      expect(projetada.codigo).toBe('parte-nao-textual')
      expect(projetada.caminho).toBe('$.partes[0]')
      expect(Object.keys(projetada).sort()).toEqual(['caminho', 'codigo', 'ok'])
      const eco = JSON.stringify(projetada)
      expect(eco).not.toContain('artefato-foto-png')
      expect(eco).not.toContain('[object')
      expect(eco).not.toContain('Object(')
    }
  })
})

describe('MM0-T06 — validador de escrita: versão futura, tipo desconhecido e campo extra', () => {
  it('versão futura é recusada', () => {
    const validada = validarMensagemMultimodal({ versao: 2, messageId: 'm1', partes: [] })
    expect(validada.ok).toBe(false)
    if (!validada.ok) expect(validada.codigo).toBe('versao-invalida')
  })

  it('parte com tipo desconhecido é recusada (não vira tool/instrução nem é executada)', () => {
    const validada = validarMensagemMultimodal({
      versao: 1,
      messageId: 'm2',
      partes: [{ partId: 'p1', tipo: 'video-3d', dados: 'qualquer coisa' }],
    })
    expect(validada.ok).toBe(false)
    if (!validada.ok) expect(validada.codigo).toBe('tipo-parte-desconhecido')
  })

  it('payload com tipo de tool é recusado como parte desconhecida', () => {
    const validada = validarMensagemMultimodal({
      versao: 1,
      messageId: 'm3',
      partes: [{ partId: 'p1', tipo: 'tool', nome: 'executar', args: { cmd: 'rm -rf' } }],
    })
    expect(validada.ok).toBe(false)
    if (!validada.ok) expect(validada.codigo).toBe('tipo-parte-desconhecido')
  })

  it('campo extra no topo do payload retorna diagnóstico com caminho', () => {
    const validada = validarMensagemMultimodal({
      versao: 1,
      messageId: 'm4',
      partes: [],
      injeção: 'segredo',
    })
    expect(validada.ok).toBe(false)
    if (!validada.ok) {
      expect(validada.codigo).toBe('campo-desconhecido')
      expect(validada.caminho).toBe('$.injeção')
    }
  })

  it('campo extra dentro de uma parte retorna diagnóstico com caminho estrutural', () => {
    const validada = validarMensagemMultimodal({
      versao: 1,
      messageId: 'm5',
      partes: [{ partId: 'p1', tipo: 'texto', texto: 'a', extra: 1 }],
    })
    expect(validada.ok).toBe(false)
    if (!validada.ok) {
      expect(validada.codigo).toBe('campo-desconhecido')
      expect(validada.caminho).toBe('$.partes[0].extra')
    }
  })

  it('a falha nunca ecoa o payload privado', () => {
    const validada = validarMensagemMultimodal({
      versao: 1,
      messageId: 'm6',
      partes: [],
      apiKey: 'CHAVE-SECRETA-XYZ',
    })
    expect(validada.ok).toBe(false)
    expect(JSON.stringify(validada)).not.toContain('CHAVE-SECRETA-XYZ')
  })

  it('entrada que não é objeto plano é recusada (sem casts nem protótipos herdados)', () => {
    expect(validarMensagemMultimodal(null).ok).toBe(false)
    expect(validarMensagemMultimodal('texto').ok).toBe(false)
    expect(validarMensagemMultimodal([1, 2]).ok).toBe(false)
    const comPrototipo = Object.create({ versao: 1, messageId: 'herdado', partes: [] })
    expect(validarMensagemMultimodal(comPrototipo).ok).toBe(false)
  })
})

describe('MM0-T21 — a adaptação volta pela projeção atual sem alterar a mensagem', () => {
  it('ChatMessage legada: roundtrip de content e projeção de persistência preservam anexos/flags', () => {
    const mensagem: ChatMessage = Object.freeze({
      id: 'msg-legada-1',
      role: 'user' as const,
      content: 'Instrução com CRLF\r\nsegunda linha 😀',
      time: '2026-11-16T10:00:00.000Z',
      model: 'modelo-sintetico',
      mode: 'ask',
      running: false,
      cancelled: false,
      attachments: [{ id: 'att-1', name: 'nota.txt', kind: 'local' as const }],
    })
    const antes = JSON.parse(JSON.stringify(mensagem)) as ChatMessage

    const envelope = adaptar(mensagem.content, 0, mensagem.id)
    // A5: o ID opaco real da ChatMessage é preservado no envelope.
    expect(envelope.messageId).toBe(mensagem.id)
    const projetada = projetarTextoLegado(envelope)
    expect(projetada.ok).toBe(true)
    if (projetada.ok) expect(projetada.valor).toBe(mensagem.content)

    const persistida = projetarMensagemPersistida(mensagem)
    expect(persistida.content).toBe(mensagem.content)
    expect(persistida.attachments).toEqual([{ id: 'att-1', name: 'nota.txt', kind: 'local' }])
    expect(persistida.running).toBe(false)
    expect(persistida.cancelled).toBe(false)
    expect(persistida.id).toBe('msg-legada-1')

    // A visão de adaptação não reescreve o objeto original.
    expect(mensagem).toEqual(antes)
  })

  it('projeção de sessão não é afetada pela adaptação de mensagens', () => {
    const mensagem: ChatMessage = {
      id: 'msg-2',
      role: 'assistant',
      content: 'resposta com    espaços   internos',
      time: '2026-11-16T10:00:01.000Z',
    }
    const envelope = adaptar(mensagem.content, 1, 'sessao-x')
    const antes = JSON.stringify(envelope)
    projetarTextoLegado(envelope)
    expect(JSON.stringify(envelope)).toBe(antes)
  })
})
