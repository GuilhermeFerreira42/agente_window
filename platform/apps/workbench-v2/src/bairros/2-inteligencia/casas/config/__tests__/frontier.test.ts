// ============================================================================
// frontier.test.ts — TESTE DE FRONTEIRA (LEGO) da Casa Config.
// Mesma receita das casas vizinhas (D68/D69/D76):
//   FT-01 — Fora da casa, ninguém importa abaixo do barrel (só `.../config`),
//           exceto a prefeitura em src/server/** para delegar as rotas.
//   FT-02 — Dentro da casa: proibido escapar para fora; outra casa SÓ pelo
//           barrel; deps externas = allowlist; node:* só em server/**.
//   FT-03 — `contract.ts` sem `any` (porta de serviço).
//   FT-04 — `as unknown as` não existe na casa.
//   FT-05 — A URL '/api/config' mora SÓ em server/rotas.ts (C1); o cliente
//           da C2 entra na allowlist quando nascer.
// ============================================================================
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = resolve(process.cwd(), 'src')
const CASA = join(SRC_ROOT, 'bairros', '2-inteligencia', 'casas', 'config')
const CASAS = join(SRC_ROOT, 'bairros', '2-inteligencia', 'casas')

if (!existsSync(CASA)) {
  throw new Error(`[frontier.config] Casa não encontrada em ${CASA}. Rode os testes a partir de platform/apps/workbench-v2.`)
}

const EXTENSOES = ['.ts', '.tsx']

function arquivosDe(raiz: string): string[] {
  const saida: string[] = []
  for (const nome of readdirSync(raiz)) {
    const caminho = join(raiz, nome)
    if (statSync(caminho).isDirectory()) {
      if (nome === '__tests__' || nome === 'node_modules') continue
      saida.push(...arquivosDe(caminho))
    } else if (EXTENSOES.some((ext) => nome.endsWith(ext))) {
      saida.push(caminho)
    }
  }
  return saida
}

function arquivosDeSrc(): string[] {
  return arquivosDe(SRC_ROOT).filter((caminho) => !caminho.startsWith(CASA + '/'))
}

function importsDe(arquivo: string): string[] {
  const texto = readFileSync(arquivo, 'utf8')
  const achados: string[] = []
  const regex = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(texto))) achados.push(m[1])
  return achados
}

describe('Fronteira da Casa Config (LEGO)', () => {
  it('FT-01: fora da casa, ninguém importa abaixo do barrel — exceto a prefeitura no server/**', () => {
    const infratores: string[] = []
    for (const arquivo of arquivosDeSrc()) {
      const rel = relative(SRC_ROOT, arquivo)
      const ehPrefeitura = rel.startsWith(`server${'/'}`)
      for (const alvo of importsDe(arquivo)) {
        const casaIdx = alvo.indexOf('2-inteligencia/casas/config')
        if (casaIdx === -1) continue
        const resto = alvo.slice(casaIdx + '2-inteligencia/casas/config'.length)
        if (resto === '' || resto === '/index') continue
        if (ehPrefeitura && resto.startsWith('/server/')) continue
        infratores.push(`${rel} → ${alvo}`)
      }
    }
    expect(infratores, 'a porta única é `.../casas/config` (sem `/server`, ...)').toEqual([])
  })

  it('FT-02: dentro da casa ninguém escapa; outra casa só pelo barrel; deps allowlist', () => {
    const permitidas: string[] = []
    const infratores: string[] = []
    for (const arquivo of arquivosDe(CASA)) {
      for (const alvo of importsDe(arquivo)) {
        if (alvo.startsWith('.')) {
          const destino = resolve(arquivo, '..', alvo)
          if (destino.startsWith(CASA + '/')) continue // interno
          const outraCasa = destino.startsWith(CASAS + '/') ? destino.slice(CASAS.length + 1) : null
          if (outraCasa !== null) {
            if (outraCasa.includes('/')) infratores.push(`${relative(CASA, arquivo)} → ${alvo} (abaixo do barrel de outra casa)`)
            continue
          }
          if (!destino.startsWith(SRC_ROOT)) infratores.push(`${relative(CASA, arquivo)} → ${alvo}`)
          continue
        }
        const pacote = alvo.startsWith('node:') ? alvo : alvo.split('/')[0]
        if (pacote.startsWith('node:')) {
          if (!relative(CASA, arquivo).startsWith('server/')) {
            infratores.push(`${relative(CASA, arquivo)} usa ${alvo} fora de server/`)
          }
          continue
        }
        if (!permitidas.includes(pacote)) infratores.push(`${relative(CASA, arquivo)} → ${alvo}`)
      }
    }
    expect(infratores, 'C1 não tem deps externas; node:* só em server/**').toEqual([])
  })

  it('FT-03: contract.ts não tem `any` no código (comentário pode citar a regra)', () => {
    const bruto = readFileSync(join(CASA, 'contract.ts'), 'utf8')
    const semComentarios = bruto
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/[^\n]*/g, '')
    expect(/\bany\b/.test(semComentarios), 'porta de serviço não aceita `any` (04 §2.1)').toBe(false)
  })

  it('FT-04: `as unknown as` não existe na casa (casts permitidos: `as Record…`)', () => {
    const infratores: string[] = []
    for (const arquivo of arquivosDe(CASA)) {
      if (/as unknown as/.test(readFileSync(arquivo, 'utf8'))) infratores.push(relative(CASA, arquivo))
    }
    expect(infratores).toEqual([])
  })

  it("FT-05: a URL '/api/config' mora SÓ em server/rotas.ts (o cliente nasce na C2)", () => {
    const infratores: string[] = []
    for (const arquivo of arquivosDe(CASA)) {
      const rel = relative(CASA, arquivo)
      if (rel.endsWith('server/rotas.ts')) continue
      if (readFileSync(arquivo, 'utf8').includes('/api/config')) infratores.push(rel)
    }
    expect(infratores, "'/api/config' só pode aparecer em server/rotas.ts").toEqual([])
  })
})
