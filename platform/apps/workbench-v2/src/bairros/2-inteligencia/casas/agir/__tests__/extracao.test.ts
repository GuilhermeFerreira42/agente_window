// ============================================================================
// Provas dos extratores do canal NATIVO (Q4=(b), D93) — cada protocolo fala
// sua língua; a casa entende as 4 e ignora, sem estourar, o que não serve.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { extrairFerramentas } from '../server/extracao'

describe('Extratores do canal nativo (um por protocolo)', () => {
  it('openai-chat em streaming: delta.tool_calls com argumentos em TEXTO JSON', () => {
    const corpo = {
      choices: [
        {
          delta: {
            tool_calls: [
              {
                id: 'call_1',
                function: { name: 'criar', arguments: '{"caminho":"ola.txt","conteudo":"oi"}' },
              },
            ],
          },
        },
      ],
    }
    expect(extrairFerramentas('openai-chat', corpo)).toEqual([
      { id: 'call_1', ferramenta: 'criar', argumentos: { caminho: 'ola.txt', conteudo: 'oi' } },
    ])
  })

  it('openai-chat resposta inteira: message.tool_calls; JSON torto é ignorado', () => {
    const corpo = {
      choices: [
        {
          message: {
            tool_calls: [
              { id: 'call_a', function: { name: 'ler', arguments: '{"caminho":"doc.md"}' } },
              { id: 'call_b', function: { name: 'listar', arguments: '{torto' } },
            ],
          },
        },
      ],
    }
    expect(extrairFerramentas('openai-chat', corpo)).toEqual([
      { id: 'call_a', ferramenta: 'ler', argumentos: { caminho: 'doc.md' } },
    ])
  })

  it('anthropic: blocos tool_use em content[] — vários, na ordem do modelo', () => {
    const corpo = {
      content: [
        { type: 'text', text: 'Vou ler e depois criar.' },
        { type: 'tool_use', id: 'tu_1', name: 'ler', input: { caminho: 'a.md' } },
        { type: 'tool_use', id: 'tu_2', name: 'criar', input: { caminho: 'b.md', conteudo: 'x' } },
      ],
    }
    expect(extrairFerramentas('anthropic', corpo)).toEqual([
      { id: 'tu_1', ferramenta: 'ler', argumentos: { caminho: 'a.md' } },
      { id: 'tu_2', ferramenta: 'criar', argumentos: { caminho: 'b.md', conteudo: 'x' } },
    ])
  })

  it('gemini: functionCall em parts[] — sem id no protocolo, ganha id sintético', () => {
    const corpo = {
      candidates: [{ content: { parts: [{ functionCall: { name: 'buscar', args: { padrao: '*.md' } } }] } }],
    }
    expect(extrairFerramentas('gemini', corpo)).toEqual([
      { id: 'chamada_1', ferramenta: 'buscar', argumentos: { padrao: '*.md' } },
    ])
  })

  it('ollama: message.tool_calls com argumentos JÁ em objeto', () => {
    const corpo = {
      message: {
        content: '',
        tool_calls: [{ id: 'x1', function: { name: 'listar', arguments: { caminho: 'docs' } } }],
      },
    }
    expect(extrairFerramentas('ollama', corpo)).toEqual([
      { id: 'x1', ferramenta: 'listar', argumentos: { caminho: 'docs' } },
    ])
  })

  it('ferramenta desconhecida é IGNORADA — no MVP não existe terminal (D72)', () => {
    const corpo = {
      choices: [{ message: { tool_calls: [{ id: 'c1', function: { name: 'rodar_terminal', arguments: '{}' } }] } }],
    }
    expect(extrairFerramentas('openai-chat', corpo)).toEqual([])
  })

  it('corpo torto/vazio → lista vazia, nunca estoura', () => {
    expect(extrairFerramentas('openai-chat', null)).toEqual([])
    expect(extrairFerramentas('ollama', 'texto puro')).toEqual([])
    expect(extrairFerramentas('gemini', {})).toEqual([])
    expect(extrairFerramentas('anthropic', { content: 'não é lista' })).toEqual([])
  })
})
