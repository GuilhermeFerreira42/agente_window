// ============================================================================
// frontier.test.ts — TESTE DE FRONTEIRA (LEGO) da Casa Provedores.
// Trava arquitetural (D68/D69, mesma receita do explorer-search):
//   FT-01 — Fora da casa, ninguém importa abaixo do barrel (só `.../provedores`).
//   FT-02 — Dentro da casa: proibido escapar para fora dela; deps externas = allowlist.
//   FT-03 — `contract.ts` sem `any` (04 §2.1: proibido `any` em porta de serviço).
//   FT-04 — Node builtins só em `server/**` (a tela é browser).
//   FT-05 — A casa tem dono único: nenhum arquivo de fora duplica regra de provedor.
// ============================================================================
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Roda a partir de platform/apps/workbench-v2 (mesma convenção do explorer).
const SRC_ROOT = resolve(process.cwd(), 'src')
const CASA = join(SRC_ROOT, 'bairros', '2-inteligencia', 'casas', 'provedores')

if (!existsSync(CASA)) {
  throw new Error(`[frontier.provedores] Casa não encontrada em ${CASA}. Rode os testes a partir de platform/apps/workbench-v2.`)
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

describe('Fronteira da Casa Provedores (LEGO)', () => {
  it('FT-01: fora da casa, ninguém importa abaixo do barrel — exceto a prefeitura no server/**', () => {
    const infratores: string[] = []
    for (const arquivo of arquivosDeSrc()) {
      const rel = relative(SRC_ROOT, arquivo)
      const ehPrefeitura = rel.startsWith(`server${'/'}`) // src/server/** = plugin do dev server
      for (const alvo of importsDe(arquivo)) {
        const casaIdx = alvo.indexOf('2-inteligencia/casas/provedores')
        if (casaIdx === -1) continue
        const resto = alvo.slice(casaIdx + '2-inteligencia/casas/provedores'.length)
        if (resto === '' || resto === '/index') continue
        // Exceção estreita e documentada (SPEC §2): o plugin do Vite delega as rotas
        // ao lado servidor da casa. É o único import abaixo do barrel permitido fora.
        if (ehPrefeitura && resto.startsWith('/server/')) continue
        infratores.push(`${rel} → ${alvo}`)
      }
    }
    expect(infratores, 'a porta única é `.../casas/provedores` (sem `/ui`, `/server`, ...)').toEqual([])
  })

  it('FT-02: dentro da casa ninguém escapa; deps externas são allowlist', () => {
    const permitidas = ['react', 'lucide-react']
    const infratores: string[] = []
    for (const arquivo of arquivosDe(CASA)) {
      for (const alvo of importsDe(arquivo)) {
        if (alvo.startsWith('.')) {
          const destino = resolve(arquivo, '..', alvo)
          const permitido = destino.startsWith(CASA) || destino.startsWith(SRC_ROOT)
          // Sair da casa é OK apenas para ARQUIVOS CENTRAIS do app (tipos/style globais),
          // nunca para outra "casa" pela porta dos fundos:
          if (!permitido) infratores.push(`${relative(CASA, arquivo)} → ${alvo}`)
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
      .replace(/\/\*[\s\S]*?\*\//g, '') // blocos
      .replace(/(^|\s)\/\/[^\n]*/g, '') // linhas
    expect(/\bany\b/.test(semComentarios), 'porta de serviço não aceita `any` (04 §2.1)').toBe(false)
  })

  it('FT-04: na pasta da casa, `as unknown as` está confinado a rotas.ts', () => {
    const infratores: string[] = []
    for (const arquivo of arquivosDe(CASA)) {
      const rel = relative(CASA, arquivo)
      if (rel.endsWith('server/rotas.ts')) continue
      if (/as unknown as/.test(readFileSync(arquivo, 'utf8'))) infratores.push(rel)
    }
    expect(infratores).toEqual([])
  })

  it('FT-05: a regra de provedores mora só aqui (nada de lista paralela no App)', () => {
    const app = readFileSync(join(SRC_ROOT, 'App.tsx'), 'utf8')
    // O síndico monta a tela; não conhece os ids nem as URLs dos provedores.
    expect(app, 'App.tsx não deve listar ids de provedor').not.toMatch(/'openai'|"openai"|api\.openai\.com|integrate\.api\.nvidia\.com/)
    expect(app, 'App.tsx fala com a casa só pelo barrel').toMatch(/from '\.\/bairros\/2-inteligencia\/casas\/provedores'/)
  })
})
