// ============================================================================
// C-3b — C3B-T33: a porta de teste NÃO existe fora da composição de teste.
//
// Dois defeitos reais foram encontrados pelas jornadas E2E e ficam travados
// aqui, para que não voltem:
//
//   1. `receberConteudo` respondia 409 `upload_already_finalized` no replay de
//      uma tentativa JÁ publicada. O cliente que perde o ACK reenvia o corpo
//      inteiro (é o que a C-3a faz); recusar obrigava a inventar um segundo
//      artefato — violação direta de R09.
//   2. A rota `conversa-de-teste` precisa estar ausente quando a composição não
//      a injeta, e o produtor precisa se recusar a existir em produção.
//
// Estes testes são de fonte e de comportamento: nada de `skip`, nada de mock
// de framework. O que se afirma é verificável por leitura do próprio código.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { produtorLocalPermitido } from '../server/session-persistence/attachments/produtorLocal'
import { idDaTentativa } from '../server/session-persistence/attachments/saidaDeTeste'

const SERVIDOR = join(process.cwd(), 'src/server/session-persistence')
const ANEXOS = join(SERVIDOR, 'attachments')

/** Fonte sem comentários: uma asserção sobre código não pode casar com prosa. */
function semComentarios(caminho: string): string {
  return readFileSync(caminho, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('C3B-T33 — a saída de teste não vaza para o produto', () => {
  it('C3B-T33 nenhuma rota de produção importa a saída de teste', () => {
    // `rotas.ts` é o router de anexos que a C-3a entrega: ele NÃO conhece a
    // saída de teste. Só o `index.ts` a recebe por injeção de composição.
    const rotas = semComentarios(join(ANEXOS, 'rotas.ts'))
    expect(rotas).not.toContain('saidaDeTeste')
    expect(rotas).not.toContain('produtorLocal')
    expect(rotas).not.toContain('conversa-de-teste')
  })

  it('C3B-T33 o server só registra a rota quando recebe a saída por opção', () => {
    const index = semComentarios(join(SERVIDOR, 'index.ts'))
    // A rota é despachada com o valor injetado, nunca com um singleton criado
    // ali dentro (que existiria em produção sem ninguém pedir).
    expect(index).toContain('tratarConversaDeTeste(request, response, url, saidaDeTeste')
    expect(index).not.toMatch(/criarProdutorLocal\s*\(/)
    expect(index).not.toMatch(/montarSaidaDeTeste\s*\(/)
  })

  it('C3B-T33 o produtor recusa existir em produção e a composição é a única porta', () => {
    expect(produtorLocalPermitido('production')).toBe(false)
    // A composição do Vite é quem decide: só com a variável ligada.
    const vite = semComentarios(join(process.cwd(), 'vite.config.ts'))
    expect(vite).toContain("process.env.C3B_SAIDA_DE_TESTE === '1'")
    expect(vite).toContain('montarSaidaDeTeste(')
  })

  it('C3B-T33 replay de tentativa publicada devolve o MESMO recibo, não conflito', () => {
    const estoque = semComentarios(join(ANEXOS, 'estoque.ts'))
    // O estado `pronto` deixa de ser erro imediato: confere o conteúdo antes.
    const trecho = estoque.slice(estoque.indexOf("if (linha.state === 'pronto')"))
    expect(trecho).toContain('conferirReplay(')
    expect(trecho).toContain('return reciboDe(linha)')
    // Corpo DIFERENTE para a mesma identidade continua sendo conflito.
    expect(trecho).toContain('upload_payload_conflict')
    // E o caminho de falha não inventa artefato: é erro, não recibo.
    expect(estoque).toContain('async function conferirReplay(')
  })

  it('C3B-T33 identidade da resposta DERIVA da tentativa (retry não duplica)', () => {
    // Mesma tentativa → mesmo id: o replay reencontra a mensagem publicada.
    expect(idDaTentativa('run-abc', 0)).toBe(idDaTentativa('run-abc', 0))
    // Tentativa ou geração diferente → outro resultado.
    expect(idDaTentativa('run-abc', 0)).not.toBe(idDaTentativa('run-abc', 1))
    expect(idDaTentativa('run-abc', 0)).not.toBe(idDaTentativa('run-xyz', 0))
    // A fonte não pode voltar a sorte­ar o id.
    const saida = semComentarios(join(ANEXOS, 'saidaDeTeste.ts'))
    expect(saida).not.toContain('randomUUID')
    expect(saida).toContain('idDaTentativa(')
  })
})
