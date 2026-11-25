import { describe, expect, it } from 'vitest'
import { pediuSomenteAguardar } from './aguardarInstrucoes'

describe('pedido exclusivo de espera', () => {
  it.each(['Aguarde instruções.', 'Por favor, aguarde novas instruções!', 'Espere mais instruções, por favor.'])('reconhece %s', texto => {
    expect(pediuSomenteAguardar(texto)).toBe(true)
  })
  it.each(['Não aguarde instruções, leia o arquivo', 'Aguarde instruções e leia o ZIP', 'Leia o arquivo', ''])('não altera tarefa mista %s', texto => {
    expect(pediuSomenteAguardar(texto)).toBe(false)
  })
})
