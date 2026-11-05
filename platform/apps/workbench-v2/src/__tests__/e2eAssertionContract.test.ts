import { describe, expect, it } from 'vitest'

/**
 * Trava anti-trapaça da suíte E2E.
 *
 * Antes desta trava, 10 dos 48 testes Playwright do projeto não tinham um
 * único `expect`: só `console.log` + screenshot. Teste sem assert passa
 * sempre — inclusive com a tela em branco — e foi assim que relatórios de
 * "48/48 passando" conviveram com bugs visíveis no vídeo do usuário.
 *
 * Este teste unitário lê os arquivos .spec.ts e reprova o build se algum
 * bloco `test(...)` não contiver ao menos uma asserção.
 *
 * Evolução 15/10 (D74 onda 1 — FAXINA, FATIA 07): testes mortos passam a ser
 * postos em quarentena com `test.skip(...)` e 2 linhas de comentário acima,
 * citando o registro em docs/09 §2.4. Quarentena não é trapaça: o teste
 * continua declarado e com o corpo preservado. Para não abrir porta a "sumir
 * com a spec", a regra da spec não-vazia aceita o skip e, em troca, passou a
 * exigir: spec com 100 % dos testes em quarentena precisa citar `docs/09`.
 */
// Lê as specs pelo próprio Vite (nada de node:fs) para o arquivo continuar
// dentro do tsconfig da app, sem depender de @types/node.
const SPEC_SOURCES = import.meta.glob('../../e2e/*.spec.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

/** Divide o arquivo em blocos por `test(` (cru, mas suficiente e estável). */
function testBlocks(source: string): { title: string; body: string }[] {
  const blocks: { title: string; body: string }[] = []
  const regex = /\n\s{2}test\(\s*'([^']+)'/g
  let match: RegExpExecArray | null
  const starts: { index: number; title: string }[] = []
  while ((match = regex.exec(source))) starts.push({ index: match.index, title: match[1] })
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].index : source.length
    blocks.push({ title: starts[i].title, body: source.slice(starts[i].index, end) })
  }
  return blocks
}

/** Blocos `test.skip(...)`: testes declarados, porém postos em quarentena (ver docs/09 §2.4). */
function skippedBlocks(source: string): { title: string }[] {
  const titles: { title: string }[] = []
  const regex = /\n\s{2}test\.skip\(\s*'([^']+)'/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(source))) titles.push({ title: match[1] })
  return titles
}

describe('Contrato da suíte E2E', () => {
  const entries = Object.entries(SPEC_SOURCES)

  it('existem specs E2E para auditar', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  it('todo teste E2E tem pelo menos uma asserção', () => {
    const semAssert: string[] = []
    for (const [file, source] of entries) {
      for (const block of testBlocks(source)) {
        if (!/expect\(/.test(block.body)) semAssert.push(`${file} → ${block.title}`)
      }
    }
    expect(semAssert, 'testes E2E sem assert passam sempre e mascaram bugs').toEqual([])
  })

  it('cada spec declara ao menos um teste (ativo ou em quarentena)', () => {
    const vazias = entries
      .filter(([, source]) => testBlocks(source).length + skippedBlocks(source).length === 0)
      .map(([file]) => file)
    expect(vazias).toEqual([])
  })

  it('quarentena nunca é silenciosa: spec 100 % pulada cita o registro (docs/09)', () => {
    const mudas = entries
      .filter(
        ([, source]) =>
          testBlocks(source).length === 0 &&
          skippedBlocks(source).length > 0 &&
          !/docs\/09/.test(source),
      )
      .map(([file]) => file)
    expect(mudas, 'pular a spec inteira sem apontar o registro é apagar o teste por omissão').toEqual([])
  })

  it('nenhuma spec hardcoda host/porta fora do helpers', () => {
    const infratores = entries.filter(([, source]) => /localhost:\d+/.test(source)).map(([file]) => file)
    expect(infratores, 'a URL base vem de e2e/helpers.ts (evita ERR_CONNECTION_REFUSED silencioso)').toEqual([])
  })

  it('nenhuma spec usa console.log como substituto de asserção', () => {
    const ruidosas = entries.filter(([, source]) => /console\.log\(/.test(source)).map(([file]) => file)
    expect(ruidosas, 'log não é prova; use expect').toEqual([])
  })
})
