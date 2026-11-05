// ============================================================================
// frontier.test.ts — TESTE DE FRONTEIRA (LEGO) da Casa Conversa.
// Mesma receita da casa Provedores (D68/D69/D76):
//   FT-01 — Fora da casa, ninguém importa abaixo do barrel (só `.../conversa`),
//           exceto a prefeitura em src/server/** para delegar as rotas.
//   FT-02 — Dentro da casa: proibido escapar para fora; outra casa SÓ pelo
//           barrel; deps externas = allowlist; node:* só em server/**.
//   FT-03 — `contract.ts` sem `any` (porta de serviço).
//   FT-04 — `as unknown as` confinado a server/rotas.ts.
//   FT-05 — A URL `/api/chat` é SEGREDO da casa: o App não pode hardcodar.
// ============================================================================
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC_ROOT = resolve(process.cwd(), 'src')
const CASA = join(SRC_ROOT, 'bairros', '2-inteligencia', 'casas', 'conversa')
const CASAS = join(SRC_ROOT, 'bairros', '2-inteligencia', 'casas')

if (!existsSync(CASA)) {
  throw new Error(`[frontier.conversa] Casa não encontrada em ${CASA}. Rode os testes a partir de platform/apps/workbench-v2.`)
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

describe('Fronteira da Casa Conversa (LEGO)', () => {
  it('FT-01: fora da casa, ninguém importa abaixo do barrel — exceto a prefeitura no server/**', () => {
    const infratores: string[] = []
    for (const arquivo of arquivosDeSrc()) {
      const rel = relative(SRC_ROOT, arquivo)
      const ehPrefeitura = rel.startsWith(`server${'/'}`)
      for (const alvo of importsDe(arquivo)) {
        const casaIdx = alvo.indexOf('2-inteligencia/casas/conversa')
        if (casaIdx === -1) continue
        const resto = alvo.slice(casaIdx + '2-inteligencia/casas/conversa'.length)
        if (resto === '' || resto === '/index') continue
        if (ehPrefeitura && resto.startsWith('/server/')) continue
        infratores.push(`${rel} → ${alvo}`)
      }
    }
    expect(infratores, 'a porta única é `.../casas/conversa` (sem `/server`, ...)').toEqual([])
  })

  it('FT-02: dentro da casa ninguém escapa; outra casa só pelo barrel; deps allowlist', () => {
    const permitidas = ['react', 'lucide-react']
    const infratores: string[] = []
    for (const arquivo of arquivosDe(CASA)) {
      for (const alvo of importsDe(arquivo)) {
        if (alvo.startsWith('.')) {
          const destino = resolve(arquivo, '..', alvo)
          if (destino.startsWith(CASA + '/')) continue // interno
          // Outra casa: permitido SOMENTE o barrel (a raiz da casa, sem subpasta).
          const outraCasa = destino.startsWith(CASAS + '/') ? destino.slice(CASAS.length + 1) : null
          if (outraCasa !== null) {
            if (outraCasa.includes('/')) infratores.push(`${relative(CASA, arquivo)} → ${alvo} (abaixo do barrel de outra casa)`)
            continue
          }
          if (!destino.startsWith(SRC_ROOT)) infratores.push(`${relative(CASA, arquivo)} → ${alvo}`)
          continue
        }
        const pacote = alvo.startsWith('node:') ? alvo : alvo.split('/')[0]
        const ehBuiltin = pacote.startsWith('node:')
        if (ehBuiltin) {
          if (!relative(CASA, arquivo).startsWith('server/')) {
            infratores.push(`${relative(CASA, arquivo)} usa ${alvo} fora de server/`)
          }
          continue
        }
        if (!permitidas.includes(pacote)) infratores.push(`${relative(CASA, arquivo)} → ${alvo}`)
      }
    }
    expect(infratores, 'deps permitidas: react, lucide-react; node:* só em server/**').toEqual([])
  })

  it('FT-03: contract.ts não tem `any` no código (comentário pode citar a regra)', () => {
    const bruto = readFileSync(join(CASA, 'contract.ts'), 'utf8')
    const semComentarios = bruto
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/[^\n]*/g, '')
    expect(/\bany\b/.test(semComentarios), 'porta de serviço não aceita `any` (04 §2.1)').toBe(false)
  })

  it('FT-04: `as unknown as` está confinado a server/rotas.ts', () => {
    const infratores: string[] = []
    for (const arquivo of arquivosDe(CASA)) {
      const rel = relative(CASA, arquivo)
      if (rel.endsWith('server/rotas.ts')) continue
      if (/as unknown as/.test(readFileSync(arquivo, 'utf8'))) infratores.push(rel)
    }
    expect(infratores).toEqual([])
  })

  it('FT-05: as URLs são segredo de casa — o App não hardcoda rota nenhuma', () => {
    const app = readFileSync(join(SRC_ROOT, 'App.tsx'), 'utf8')
    // FATIA 10 (C3): o chat fala com a casa AGIR (conversa + ação); esta casa
    // segue dona do /api/chat (conversa pura) e serve o chatAlvo à vizinha
    // via prefeitura. Nenhuma URL pode vazar para o App.
    expect(app, 'App.tsx não deve conter /api/chat (URL pertence à casa Conversa)').not.toContain('/api/chat')
    expect(app, 'App.tsx não deve conter /api/agir (URL pertence à casa Agir)').not.toContain('/api/agir')
    expect(app, 'App.tsx não deve montar o fio SSE à mão').not.toContain('text/event-stream')
    const cliente = readFileSync(join(CASA, 'ui', 'client', 'api.ts'), 'utf8')
    expect(cliente, 'o cliente da casa é dono da URL /api/chat').toContain("'/api/chat'")
  })
})
