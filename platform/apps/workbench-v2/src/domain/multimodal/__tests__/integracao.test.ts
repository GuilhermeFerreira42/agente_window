// ============================================================================
// MM-0 — integração: fronteira do domínio (sem IO/framework), portas dos
// donos (Provedores/Conversa/Agir reexportam o MESMO tipo), UI sem mídia
// habilitada e portabilidade dos testes novos (T01, T20, T23, T24).
// ============================================================================

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as porta from '../index'
import {
  adaptarMensagemLegada,
  avaliarCapacidadeEfetiva,
  comporCapacidadeDePool,
  mesmaIdentidadeMultimodal,
  projetarTextoLegado,
  validarArtefato,
  validarMensagemMultimodal,
} from '../index'
import type {
  EnvelopeMensagemMultimodal as EnvelopeDominio,
  IdentidadeAlvoMultimodal as IdentidadeDominio,
  ParteMensagem as ParteDominio,
  PerfilMultimodal as PerfilDominio,
} from '../index'
// — as três casas, SÓ pelas portas públicas (sem imports internos) —
import type {
  EnvelopeMensagemMultimodal as EnvelopeConversa,
  ParteMensagem as ParteConversa,
} from '../../../bairros/2-inteligencia/casas/conversa'
import type {
  ArtefatoMultimodal as ArtefatoAgir,
  ParteMensagem as ParteAgir,
} from '../../../bairros/2-inteligencia/casas/agir'
import type {
  IdentidadeAlvoMultimodal as IdentidadeProvedores,
  ParteMensagem as ParteProvedores,
  PerfilMultimodal as PerfilProvedores,
} from '../../../bairros/2-inteligencia/casas/provedores'

const SRC_ROOT = resolve(process.cwd(), 'src')
const MULTIMODAL = join(SRC_ROOT, 'domain', 'multimodal')

if (!existsSync(MULTIMODAL)) {
  throw new Error(`[mm0.integracao] Pasta não encontrada em ${MULTIMODAL}. Rode a partir de platform/apps/workbench-v2.`)
}

function arquivosDe(raiz: string, ignoraTestes: boolean): string[] {
  const saida: string[] = []
  for (const nome of readdirSync(raiz)) {
    const caminho = join(raiz, nome)
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' && ignoraTestes) continue
      saida.push(...arquivosDe(caminho, ignoraTestes))
    } else if (nome.endsWith('.ts') && !(ignoraTestes && nome.endsWith('.test.ts'))) {
      saida.push(caminho)
    }
  }
  return saida
}

function importsDe(texto: string): string[] {
  const achados: string[] = []
  const regex = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(texto))) achados.push(m[1])
  return achados
}

describe('MM0-T01 — domínio neutro: sem IO/framework e porta mínima', () => {
  const fontes = arquivosDe(MULTIMODAL, true).filter((arquivo) => !arquivo.includes(`${'__tests__'}`))

  it('nenhum arquivo do domínio importa React/Node/fs/rede/servidor ou toca ambiente', () => {
    const proibidos: Array<[string, RegExp]> = [
      ['react', /from\s+['"]react/],
      ['node builtins', /from\s+['"](node:|fs|path|http|https|crypto|os|child_?process|stream|url)['"]/],
      ['vite', /from\s+['"]vite/],
      ['fetch/rede', /\bfetch\s*\(/],
      ['XMLHttpRequest', /\bXMLHttpRequest\b/],
      ['web storage', /\b(localStorage|sessionStorage)\b/],
      ['janela/documento', /\b(window|document)\s*\./],
      ['process.env', /\bprocess\.(env|cwd|argv|platform)\b/],
      ['timers', /\b(setTimeout|setInterval|setImmediate)\s*\(/],
      ['relógio/aleatoriedade', /\b(Date\.now|Math\.random|performance\.now)\s*\(/],
      ['console', /\bconsole\.\w+\s*\(/],
    ]
    const infratores: string[] = []
    for (const arquivo of fontes) {
      const texto = readFileSync(arquivo, 'utf8')
      for (const [nome, padrao] of proibidos) {
        if (padrao.test(texto)) infratores.push(`${relative(SRC_ROOT, arquivo)} → ${nome}`)
      }
    }
    expect(infratores, 'domínio multimodal deve ser puro').toEqual([])
    expect(fontes.length).toBeGreaterThanOrEqual(5)
  })

  it('imports relativos permanecem dentro da pasta do domínio (sem escapar p/ UI/servidor)', () => {
    const infratores: string[] = []
    for (const arquivo of fontes) {
      for (const spec of importsDe(readFileSync(arquivo, 'utf8'))) {
        if (!spec.startsWith('.')) continue
        const alvo = resolve(dirname(arquivo), spec)
        const dentro = alvo === MULTIMODAL || alvo.startsWith(MULTIMODAL + '/')
        if (!dentro) infratores.push(`${relative(SRC_ROOT, arquivo)} → ${spec}`)
      }
    }
    expect(infratores).toEqual([])
  })

  it('a porta exporta exatamente a API pública mínima (7 funções, sem extras acidentais)', () => {
    const esperadas = [
      'adaptarMensagemLegada',
      'avaliarCapacidadeEfetiva',
      'comporCapacidadeDePool',
      'mesmaIdentidadeMultimodal',
      'projetarTextoLegado',
      'validarArtefato',
      'validarMensagemMultimodal',
    ]
    expect(Object.keys(porta).sort()).toEqual(esperadas)
    for (const nome of esperadas) {
      expect(typeof (porta as Record<string, unknown>)[nome], nome).toBe('function')
    }
  })

  it('carregar a porta não produz efeito colateral (import é seguro no navegador)', () => {
    // As funções respondem de forma determinística sem tocar ambiente.
    const antes = Object.keys(porta).length
    const envelope = adaptarMensagemLegada({ identidade: 'smoke', content: 'ok', indice: 0 })
    expect(envelope.ok).toBe(true)
    expect(Object.keys(porta).length).toBe(antes)
  })
})

describe('MM0-T20 — as três casas reexportam o MESMO contrato (sem cópias divergentes)', () => {
  it('ParteMensagem é o mesmo tipo nas casas Conversa, Agir, Provedores e no domínio', () => {
    const parte: ParteConversa = { partId: 'p1', tipo: 'texto', texto: 'olá mundo' }
    const parteAgir: ParteAgir = parte
    const parteProvedores: ParteProvedores = parteAgir
    const voltaConversa: ParteConversa = parteProvedores
    const parteDominio: ParteDominio = voltaConversa
    expect(parteDominio).toEqual({ partId: 'p1', tipo: 'texto', texto: 'olá mundo' })

    const artefatoParte: ParteDominio = {
      partId: 'p2',
      tipo: 'artefato',
      artifactId: 'art-1',
      modalidade: 'imagem',
    }
    const artefatoAgir: ParteAgir = artefatoParte
    expect(artefatoAgir.tipo).toBe('artefato')
  })

  it('Envelope e Perfil/Identidade atravessam casas ↔ domínio sem divergência', () => {
    const envelope: EnvelopeConversa = {
      versao: 1,
      messageId: 'm1',
      partes: [{ partId: 'p1', tipo: 'texto', texto: 'x' }],
    }
    const envelopeDominio: EnvelopeDominio = envelope
    expect(envelopeDominio.messageId).toBe('m1')

    const identidade: IdentidadeProvedores = {
      providerId: 'prov-1',
      modelId: 'modelo-x',
      endpointIdentity: 'ep-1',
      protocolo: 'openai-chat',
      apiRevision: 'r1',
      configRevision: 'c1',
      adapterRevision: 'a1',
    }
    const identidadeDominio: IdentidadeDominio = identidade
    const perfil: PerfilProvedores = { alvo: identidadeDominio, entradas: [] }
    const perfilDominio: PerfilDominio = perfil
    expect(perfilDominio.alvo.modelId).toBe('modelo-x')
    expect(mesmaIdentidadeMultimodal(identidade, identidadeDominio)).toBe(true)

    const artefatoAgir: ArtefatoAgir = {
      versao: 1,
      artifactId: 'art-9',
      sessionId: 's1',
      chatId: 'c1',
      origem: 'modelo',
      nome: 'gerado.png',
      modalidade: 'imagem',
      papelArmazenamento: 'gerado-gerenciado',
      estado: 'recebendo',
    }
    expect(validarArtefato(artefatoAgir).ok).toBe(true)
  })

  it('a fixture de integração usa as funções do domínio (atribuição/uso real)', () => {
    const adaptada = adaptarMensagemLegada({ identidade: 'fixture-1', content: 'texto da fixture', indice: 7 })
    expect(adaptada.ok).toBe(true)
    if (adaptada.ok) {
      expect(projetarTextoLegado(adaptada.valor)).toEqual({ ok: true, valor: 'texto da fixture' })
    }
    expect(validarMensagemMultimodal({ versao: 1, messageId: 'm', partes: [] }).ok).toBe(true)
    expect(mesmaIdentidadeMultimodal(
      {
        providerId: 'p', modelId: 'm', endpointIdentity: 'e', protocolo: 'o',
        apiRevision: '1', configRevision: '1', adapterRevision: '1',
      },
      {
        providerId: 'p', modelId: 'm', endpointIdentity: 'e', protocolo: 'o',
        apiRevision: '1', configRevision: '1', adapterRevision: '1',
      },
    )).toBe(true)
    expect(typeof avaliarCapacidadeEfetiva).toBe('function')
    expect(typeof comporCapacidadeDePool).toBe('function')
  })
})

describe('MM0-T23 — a UI continua textual: nada de mídia habilitada pelos tipos', () => {
  it('nenhum arquivo .tsx (telas) importa o domínio multimodal', () => {
    const infratores: string[] = []
    const visitar = (raiz: string) => {
      for (const nome of readdirSync(raiz)) {
        const caminho = join(raiz, nome)
        if (statSync(caminho).isDirectory()) {
          if (nome === '__tests__' || nome === 'node_modules') continue
          visitar(caminho)
        } else if (nome.endsWith('.tsx')) {
          const texto = readFileSync(caminho, 'utf8')
          if (texto.includes('domain/multimodal')) infratores.push(relative(SRC_ROOT, caminho))
        }
      }
    }
    visitar(SRC_ROOT)
    expect(infratores, 'tipos novos não habilitam UI de mídia').toEqual([])
  })
})

describe('MM0-T24 — testes novos portáveis (Linux/Windows, sem armadilhas)', () => {
  it('nenhum teste do domínio usa diretório temporário fixo, sinais, processo ou path bruto', () => {
    const testes = arquivosDe(join(MULTIMODAL, '__tests__'), false).filter((arquivo) =>
      arquivo.endsWith('.test.ts'),
    )
    expect(testes.length).toBe(4)
    const proibidos: Array<[string, RegExp]> = [
      ['/tmp literal', /['"`]\/tmp\//],
      ['sinais de controle de processo', /SIG\((STOP|CONT|KILL)|SIG[A-Z]{3,8}\b/],
      ['variável de plataforma', /process\.platform/],
      // construído em partes para o próprio teste não casar com seu fonte
      ['módulo de processo filho', new RegExp('child' + '_process')],
      ['Windows path bruto', /[A-Za-z]:\\\\/],
    ]
    for (const arquivo of testes) {
      const texto = readFileSync(arquivo, 'utf8')
      for (const [nome, padrao] of proibidos) {
        expect(padrao.test(texto), `${relative(SRC_ROOT, arquivo)} → ${nome}`).toBe(false)
      }
    }
  })
})
