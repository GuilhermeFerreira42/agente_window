// ============================================================================
// MM-0 — testes de ARTEFATO: estado `pronto` (runtime + typecheck), estados
// em recebimento, proibição de campos de transporte/autoridade (T07–T09).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { validarArtefato } from '../artefatos'
import type { ArtefatoMultimodal } from '../contrato'

const SHA = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

function base(parcial: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    versao: 1,
    artifactId: 'art-1',
    sessionId: 'sess-1',
    chatId: 'chat-1',
    origem: 'upload',
    nome: 'foto.png',
    modalidade: 'imagem',
    papelArmazenamento: 'upload-chat',
    estado: 'pronto',
    bytes: 2048,
    sha256: SHA,
    ...parcial,
  }
}

describe('MM0-T07 — `pronto` exige bytes e sha256 (runtime e typecheck)', () => {
  it('pronto com tamanho/hash válidos passa', () => {
    const resultado = validarArtefato(base())
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.estado).toBe('pronto')
      expect(resultado.valor).toMatchObject({ bytes: 2048, sha256: SHA })
    }
  })

  it('falta de bytes ou sha256 falha no runtime', () => {
    const semBytes = validarArtefato(base({ bytes: undefined }))
    expect(semBytes.ok).toBe(false)
    if (!semBytes.ok) expect(semBytes.codigo).toBe('bytes-ausente')

    const semSha = validarArtefato(base({ sha256: undefined }))
    expect(semSha.ok).toBe(false)
    if (!semSha.ok) expect(semSha.codigo).toBe('sha256-ausente')
  })

  it('bytes negativo, fracionário, infinito ou NaN são recusados', () => {
    for (const bytes of [-1, 1.5, Number.POSITIVE_INFINITY, Number.NaN]) {
      const resultado = validarArtefato(base({ bytes }))
      expect(resultado.ok, `bytes=${String(bytes)}`).toBe(false)
      if (!resultado.ok) expect(resultado.codigo).toBe('bytes-invalido')
    }
  })

  it('sha256 fora do padrão canônico (64 hex minúsculos) é recusado', () => {
    const casos: Array<[string, string]> = [
      ['tamanho 63', SHA.slice(1)],
      ['tamanho 65', `${SHA}0`],
      ['maiúsculo', SHA.toUpperCase()],
      ['não hex', 'z'.repeat(64)],
      ['vazio', ''],
    ]
    for (const [nome, sha256] of casos) {
      const resultado = validarArtefato(base({ sha256 }))
      expect(resultado.ok, nome).toBe(false)
      if (!resultado.ok) expect(resultado.codigo).toBe('sha256-invalido')
    }
  })

  it('typecheck: `pronto` sem bytes/sha256 ou com tipo errado não compila', () => {
    const campos = {
      versao: 1,
      artifactId: 'art-tc',
      sessionId: 'sess-1',
      chatId: 'chat-1',
      origem: 'upload',
      nome: 'x.bin',
      modalidade: 'arquivo',
      papelArmazenamento: 'upload-chat',
    }
    // @ts-expect-error — artefato `pronto` sem `bytes` é erro de tipo (se
    // deixasse compilar, o tsc acusaria diretiva não usada no gate).
    const semBytes: ArtefatoMultimodal = { ...campos, estado: 'pronto', sha256: SHA }
    // @ts-expect-error — `pronto` sem `sha256` é erro de tipo.
    const semSha: ArtefatoMultimodal = { ...campos, estado: 'pronto', bytes: 10 }
    // @ts-expect-error — `bytes` como string nunca é tamanho.
    const bytesTexto: ArtefatoMultimodal = { ...campos, estado: 'pronto', bytes: '10', sha256: SHA }
    // @ts-expect-error — sha256 numérico não é hash canônico.
    const shaNumero: ArtefatoMultimodal = { ...campos, estado: 'pronto', bytes: 10, sha256: 123 }
    expect([semBytes, semSha, bytesTexto, shaNumero]).toHaveLength(4)

    // Os MESMOS payloads são recusados no runtime.
    expect(validarArtefato({ ...campos, estado: 'pronto', sha256: SHA }).ok).toBe(false)
    expect(validarArtefato({ ...campos, estado: 'pronto', bytes: 10 }).ok).toBe(false)
    expect(validarArtefato({ ...campos, estado: 'pronto', bytes: '10', sha256: SHA }).ok).toBe(false)
    expect(validarArtefato({ ...campos, estado: 'pronto', bytes: 10, sha256: 123 }).ok).toBe(false)
  })
})

describe('MM0-T08 — estados em recebimento e MIME não autorizam nada', () => {
  it('recebendo sem tamanho/hash final valida e NÃO vira `pronto`', () => {
    const resultado = validarArtefato(base({ estado: 'recebendo', bytes: undefined, sha256: undefined }))
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.estado).toBe('recebendo')
  })

  it('parcial com bytes parciais sem hash continua não concluído', () => {
    const resultado = validarArtefato(base({ estado: 'parcial', bytes: 100, sha256: undefined }))
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.estado).toBe('parcial')
      expect(resultado.valor).not.toHaveProperty('sha256')
    }
  })

  it('MIME declarado contraditório é só metadata — não autoriza executar/interpretar', () => {
    const resultado = validarArtefato(base({ mimeDeclarado: 'audio/mpeg', modalidade: 'imagem' }))
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      // O resultado é estritamente o DTO — sem campo de autorização/acesso.
      expect(Object.keys(resultado).sort()).toEqual(['ok', 'valor'])
      expect(resultado.valor).toMatchObject({ mimeDeclarado: 'audio/mpeg', modalidade: 'imagem' })
      const proibidos = ['url', 'path', 'apiKey', 'headers', 'base64', 'bytesBase64', 'download']
      for (const campo of proibidos) expect(Object.keys(resultado.valor)).not.toContain(campo)
    }
  })

  it('falhou/cancelado sem hash final permanecem não concluídos', () => {
    for (const estado of ['falhou', 'cancelado', 'limpeza-pendente'] as const) {
      const resultado = validarArtefato(base({ estado, bytes: undefined, sha256: undefined }))
      expect(resultado.ok, estado).toBe(true)
      if (resultado.ok) expect(resultado.valor.estado).toBe(estado)
    }
  })
})

describe('MM0-T09 — sem campos de transporte/autoridade no DTO persistível', () => {
  it('url/path/apiKey/headers/base64 são recusados como campo desconhecido', () => {
    const proibidos: Array<[string, unknown]> = [
      ['url', 'https://servidor.example/foto.png'],
      ['path', '/home/usuario/foto.png'],
      ['apiKey', 'SEGREDO'],
      ['headers', { authorization: 'Bearer x' }],
      ['base64', 'aGVsbG8='],
      ['bytesConteudo', 'AAECAw=='],
    ]
    for (const [campo, valor] of proibidos) {
      const resultado = validarArtefato(base({ [campo]: valor }))
      expect(resultado.ok, campo).toBe(false)
      if (!resultado.ok) {
        expect(resultado.codigo).toBe('campo-desconhecido')
        expect(resultado.caminho).toBe(`$.${campo}`)
      }
    }
  })

  it('IDs de outro chat são somente dados — o validador não declara autorização de leitura', () => {
    const outroChat = base({ sessionId: 'sessao-de-outro-chat', chatId: 'chat-de-outra-pessoa' })
    const resultado = validarArtefato(outroChat)
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(Object.keys(resultado).sort()).toEqual(['ok', 'valor'])
      expect(resultado.valor.sessionId).toBe('sessao-de-outro-chat')
      expect(resultado.valor.chatId).toBe('chat-de-outra-pessoa')
      // Nenhum campo de capacidade/autoridade nasceu do validador estrutural.
      const chaves = Object.keys(resultado.valor)
      expect(chaves.some((chave) => /autoriz|permiss|ler|download|executar/i.test(chave))).toBe(false)
    }
  })

  it('campo extra de transporte desconhecido qualquer é recusado (não persiste)', () => {
    const resultado = validarArtefato(base({ tokenCapacidade: 'abc' }))
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.codigo).toBe('campo-desconhecido')
  })

  it('generation fracionária/negativa é recusada; inteira não negativa passa', () => {
    expect(validarArtefato(base({ generation: 0 })).ok).toBe(true)
    expect(validarArtefato(base({ generation: 3 })).ok).toBe(true)
    for (const generation of [-1, 1.5, Number.NaN]) {
      const resultado = validarArtefato(base({ generation }))
      expect(resultado.ok, `generation=${String(generation)}`).toBe(false)
      if (!resultado.ok) expect(resultado.codigo).toBe('generation-invalida')
    }
  })
})

describe('MM0-REV-A4 — propriedade herdada por protótipo nunca entra no DTO', () => {
  it('campo opcional herdado (Object.create) é recusado, não incorporado', () => {
    const comPrototipo = Object.assign(Object.create({ messageId: 'vinculo-herdado' }), base())
    const resultado = validarArtefato(comPrototipo)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.codigo).toBe('entrada-invalida')
  })

  it('positivo: campo opcional PRÓPRIO e válido entra no DTO', () => {
    const resultado = validarArtefato(base({ messageId: 'msg-1', partId: 'msg-1:0', generation: 3 }))
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.messageId).toBe('msg-1')
      expect(resultado.valor.partId).toBe('msg-1:0')
      expect(resultado.valor.generation).toBe(3)
    }
  })
})
