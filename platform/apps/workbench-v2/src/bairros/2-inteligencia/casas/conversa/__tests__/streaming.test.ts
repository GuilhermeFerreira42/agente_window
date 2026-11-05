// Casa Conversa — encadernador do fio (conquista 2 da FATIA 09).
// Prova que um quadro cheio é devolvido inteiro mesmo quando a rede o pedaça,
// e que os dois formatos (SSE e NDJSON) são separados direitinho.
import { describe, expect, it } from 'vitest'
import { criarFramer } from '../server/streaming'

describe('streaming — SSE (openai-chat, anthropic, gemini)', () => {
  it('separa quadros mesmo que cheguem partidos no meio', () => {
    const framer = criarFramer('openai-chat')
    expect(framer.entrar('data: {"a":1}')).toEqual([]) // sem separador ainda
    expect(framer.entrar('\n\ndata: {"b":2}\n\n')).toEqual(['{"a":1}', '{"b":2}'])
    expect(framer.fechar()).toEqual([])
  })

  it('aceita CRLF e "data:" sem espaço', () => {
    const framer = criarFramer('anthropic')
    expect(framer.entrar('data:{"a":1}\r\n\r\n')).toEqual(['{"a":1}'])
  })

  it('quadro com linha de evento devolve só o data', () => {
    const framer = criarFramer('anthropic')
    expect(framer.entrar('event: content_block_delta\ndata: {"x":1}\n\n')).toEqual(['{"x":1}'])
  })

  it('fechar entrega o resto pendente (conexão sem separador final)', () => {
    const framer = criarFramer('openai-chat')
    framer.entrar('data: {"ultimo":true}')
    expect(framer.fechar()).toEqual(['{"ultimo":true}'])
    expect(framer.fechar()).toEqual([]) // zerado depois de fechar
  })

  it('fechar tolera JSON cru (compat que ignorou o stream)', () => {
    const framer = criarFramer('openai-chat')
    framer.entrar('{"choices":[]}')
    expect(framer.fechar()).toEqual(['{"choices":[]}'])
  })

  it('vários quadros numa entrada só saem todos', () => {
    const framer = criarFramer('openai-chat')
    expect(framer.entrar('data: {"n":1}\n\ndata: {"n":2}\n\ndata: {"n":3}\n\n')).toEqual(['{"n":1}', '{"n":2}', '{"n":3}'])
  })
})

describe('streaming — NDJSON (ollama)', () => {
  it('uma linha por pedaço, mesmo dividida entre dois', () => {
    const framer = criarFramer('ollama')
    expect(framer.entrar('{"a":1}\n{"b"')).toEqual(['{"a":1}'])
    expect(framer.entrar(':2}\n')).toEqual(['{"b":2}'])
    expect(framer.fechar()).toEqual([])
  })

  it('linhas em branco e \\r não viram payload', () => {
    const framer = criarFramer('ollama')
    expect(framer.entrar('{"a":1}\r\n\n{"b":2}\n')).toEqual(['{"a":1}', '{"b":2}'])
  })

  it('fechar devolve a última linha sem \\n final', () => {
    const framer = criarFramer('ollama')
    framer.entrar('{"fim":true}')
    expect(framer.fechar()).toEqual(['{"fim":true}'])
  })
})
