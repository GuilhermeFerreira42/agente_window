// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { zipDeTeste as zip } from './zipFixture.test-helper'
import { readFileSync } from 'node:fs'
import { listarZipSeguro, extrairZipSeguro } from './zipSeguro'


describe('ZIP privado limitado, ainda sem integração', () => {
  it('lista texto, imagem e vídeo, e extrai somente a entrada escolhida', async () => {
    const imagem = readFileSync(new URL('../../../__tests__/fixtures/midia/imagem.png', import.meta.url))
    const video = readFileSync(new URL('../../../__tests__/fixtures/midia/video.webm', import.meta.url))
    const bytes = zip([{ nome: 'nota.txt', bytes: Buffer.from('texto') }, { nome: 'imagem.png', bytes: imagem }, { nome: 'video.webm', bytes: video }])
    expect((await listarZipSeguro(bytes)).map(e => e.nome)).toEqual(['nota.txt', 'imagem.png', 'video.webm'])
    const itens = await extrairZipSeguro(bytes, [0, 2])
    expect(itens.map(e => e.nome)).toEqual(['nota.txt', 'video.webm'])
    expect(itens[0].bytes.toString()).toBe('texto')
    expect(itens[1].bytes.equals(video)).toBe(true)
  })
  it('recusa travessia, caminho absoluto, nomes duplicados, links e seleção inválida', async () => {
    for (const nome of ['../fora.txt', '/fora.txt', 'C:/fora.txt', 'a/../../fora', 'dir\\fora', 'CON.txt']) {
      await expect(listarZipSeguro(zip([{ nome, bytes: Buffer.from('x') }]))).rejects.toThrow()
    }
    await expect(listarZipSeguro(zip([{ nome: 'A.txt', bytes: Buffer.from('a') }, { nome: 'a.txt', bytes: Buffer.from('b') }]))).rejects.toThrow()
    await expect(listarZipSeguro(zip([{ nome: 'a', bytes: Buffer.from('a') }, { nome: 'a/b', bytes: Buffer.from('b') }]))).rejects.toThrow()
    await expect(listarZipSeguro(zip([{ nome: 'link', bytes: Buffer.from('destino'), modo: 0o120777 }]))).rejects.toThrow()
    await expect(extrairZipSeguro(zip([{ nome: 'a', bytes: Buffer.from('x') }]), [99])).rejects.toThrow()
  })
  it('recusa arquivo corrompido, crc falso e expansão excessiva', async () => {
    await expect(listarZipSeguro(Buffer.from('não é ZIP'))).rejects.toThrow()
    await expect(extrairZipSeguro(zip([{ nome: 'a', bytes: Buffer.from('x'), crc: 42 }]), [0])).rejects.toThrow()
    await expect(listarZipSeguro(zip([{ nome: 'grande', bytes: Buffer.alloc(5 * 1024 * 1024) }]))).rejects.toThrow()
  })
})
