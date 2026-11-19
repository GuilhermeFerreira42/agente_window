// ============================================================================
// C-3b — T27/T28/T31: teclado, foco, temas, janela pequena e ciclo de vida.
//
// O que jsdom consegue provar aqui: estrutura de foco, rótulos acessíveis,
// pausa na troca de conversa, ausência de preload indiscriminado e portabilidade
// dos comandos (sem depender de SO). O pixel e o codec são dos E2E.
// ============================================================================
import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactCard } from '../components/ArtifactCard'
import { MessageParts } from '../components/MessageParts'
import { useMidiaDaConversa } from '../hooks/useMidiaDaConversa'
import type { CardArtefato, ItemApresentacao } from '../domain/apresentacaoMultimodal'
import { classificarPreview } from '../domain/politicaPreview'

const FIXTURES = join(__dirname, 'fixtures/midia')
const fixture = (nome: string) => readFileSync(join(FIXTURES, nome))

function cardDe(nome: string, bytes: Uint8Array): CardArtefato {
  const classificacao = classificarPreview(bytes)
  return {
    artifactId: `art-${nome}`, name: nome, bytes: bytes.length,
    modalidade: classificacao.ok ? classificacao.modalidade : 'arquivo',
    estado: 'pronto', preview: classificacao,
  }
}
const urlPara = (artifactId: string) => `/media/${artifactId}`

describe('C-3b — C3B-T27 acessibilidade e layout', () => {
  it('C3B-T27 todo card tem nome acessível e ações rotuladas', () => {
    const card = cardDe('foto.png', fixture('imagem.png'))
    render(<ArtifactCard card={card} url={urlPara(card.artifactId)} onBaixar={vi.fn()} onAbrir={vi.fn()} />)
    expect(screen.getByRole('group', { name: /foto\.png, imagem/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Baixar foto\.png/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Abrir foto\.png/ })).toBeInTheDocument()
  })

  it('C3B-T27 os controles são alcançáveis por teclado na ordem do DOM', async () => {
    const user = userEvent.setup()
    const card = cardDe('foto.png', fixture('imagem.png'))
    render(<ArtifactCard card={card} url={urlPara(card.artifactId)} onBaixar={vi.fn()} onAbrir={vi.fn()} />)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Baixar foto\.png/ }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Abrir foto\.png/ }))
  })

  it('C3B-T27 o diálogo prende o foco e fecha com Escape devolvendo-o', async () => {
    const user = userEvent.setup()
    const itens: ItemApresentacao[] = [
      { tipo: 'artefato', card: cardDe('foto.png', fixture('imagem.png')), chave: 'k1' },
    ]
    render(<MessageParts itens={itens} urlPara={urlPara} />)
    const gatilho = screen.getByRole('button', { name: /Abrir foto\.png/ })
    await user.click(gatilho)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fechar visualização' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))) })
    expect(document.activeElement).toBe(gatilho)
  })

  it('C3B-T27 áudio e vídeo não têm controles sem rótulo (usa controles nativos)', () => {
    const audio = cardDe('som.wav', fixture('audio.wav'))
    const { container: c1 } = render(<ArtifactCard card={audio} url={urlPara(audio.artifactId)} />)
    expect(c1.querySelector('audio')?.hasAttribute('controls')).toBe(true)
    const video = cardDe('clipe.webm', fixture('video.webm'))
    const { container: c2 } = render(<ArtifactCard card={video} url={urlPara(video.artifactId)} />)
    expect(c2.querySelector('video')?.hasAttribute('controls')).toBe(true)
  })

  it('C3B-T27 o card usa classes de tema (não cor fixa) para claro/escuro', () => {
    // A cor vive no CSS por token; o componente não fixa cor inline.
    const fonte = readFileSync(join(__dirname, '../components/ArtifactCard.tsx'), 'utf8')
    expect(fonte).not.toMatch(/style=\{\{[^}]*color:/)
    expect(fonte).not.toMatch(/#[0-9a-fA-F]{6}/)
  })
})

describe('C-3b — C3B-T28 ciclo de vida na troca de conversa', () => {
  it('C3B-T28 trocar de conversa pausa os players registrados', () => {
    const { result, rerender } = renderHook(
      ({ sid, cid }) => useMidiaDaConversa(sid, cid),
      { initialProps: { sid: 's1', cid: 'c1' } },
    )
    const pausar = vi.fn()
    const elemento = { paused: false, pause: pausar } as unknown as HTMLMediaElement
    act(() => { result.current.registrar(elemento) })

    rerender({ sid: 's2', cid: 'c2' })
    expect(pausar).toHaveBeenCalled()
  })

  it('C3B-T28 desmontar pausa (nada toca escondido)', () => {
    const { result, unmount } = renderHook(() => useMidiaDaConversa('s1', 'c1'))
    const pausar = vi.fn()
    act(() => { result.current.registrar({ paused: false, pause: pausar } as unknown as HTMLMediaElement) })
    unmount()
    expect(pausar).toHaveBeenCalled()
  })

  it('C3B-T28 player já pausado não recebe pause redundante', () => {
    const { result } = renderHook(() => useMidiaDaConversa('s1', 'c1'))
    const pausar = vi.fn()
    act(() => { result.current.registrar({ paused: true, pause: pausar } as unknown as HTMLMediaElement) })
    act(() => { result.current.pausarTudo() })
    expect(pausar).not.toHaveBeenCalled()
  })

  it('C3B-T28 histórico grande não baixa toda a mídia ao montar', () => {
    // Cada card usa `preload="metadata"`; nada de `auto` nem fetch antecipado.
    const itens: ItemApresentacao[] = Array.from({ length: 20 }, (_, i) => ({
      tipo: 'artefato' as const,
      card: cardDe(`v${i}.webm`, fixture('video.webm')),
      chave: `k${i}`,
    }))
    const { container } = render(<MessageParts itens={itens} urlPara={urlPara} />)
    const videos = Array.from(container.querySelectorAll('video'))
    expect(videos).toHaveLength(20)
    for (const video of videos) expect(video.getAttribute('preload')).toBe('metadata')
    // E nenhum pedido de bytes completos foi disparado.
    expect(container.querySelectorAll('[src^="blob:"]')).toHaveLength(0)
  })

  it('C3B-T28 a URL é escopada por sessão e chat (não há caminho global)', () => {
    const { result } = renderHook(() => useMidiaDaConversa('sess-1', 'chat-1'))
    const url = result.current.urlPara('art-1')
    expect(url).toBe('/api/sessions/sess-1/chats/chat-1/attachments/art-1/media')
    expect(url).not.toContain('..')
  })
})

describe('C-3b — C3B-T31 portabilidade dos comandos', () => {
  it('C3B-T31 os wrappers .sh e .ps1 do pacote existem e chamam o MESMO runner', () => {
    const pacote = '/home/user/memoria-de-projeto/C-3b/C-3b'
    const sh = readFileSync(join(pacote, 'VALIDAR_C3B.sh'), 'utf8')
    const ps1 = readFileSync(join(pacote, 'VALIDAR_C3B.ps1'), 'utf8')
    // Ambos delegam ao runner Node — não são suítes diferentes.
    expect(sh).toContain('VALIDAR_C3B.mjs')
    expect(ps1).toContain('VALIDAR_C3B.mjs')
  })

  it('C3B-T31 o gerador de fixtures não depende de ffmpeg nem de SO específico', () => {
    // Comentário não é código: o cabeçalho do gerador CITA ffmpeg para dizer
    // que ele não é usado. A asserção olha só o código sem comentários.
    const bruto = readFileSync(join(FIXTURES, 'gerar-fixtures.mjs'), 'utf8')
    const gerador = bruto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(gerador).not.toMatch(/ffmpeg|execSync\(['"]which/)
    // Usa APIs de Node portáveis.
    expect(gerador).toContain('node:zlib')
    expect(gerador).toContain('node:crypto')
  })

  it('C3B-T31 o verificador de fixtures roda sem navegador (portátil)', () => {
    const verificador = readFileSync(join(FIXTURES, 'verificar-fixtures.mjs'), 'utf8')
    expect(verificador).not.toContain('playwright')
    expect(verificador).not.toContain('chromium')
  })

  it('C3B-T31 as fixtures binárias estão presentes para quem clonar (não ficam só no /tmp)', () => {
    for (const nome of ['imagem.png', 'audio.wav', 'video.webm', 'falso.png', 'nao-exibivel.bin']) {
      expect(existsSync(join(FIXTURES, nome)), `${nome} precisa estar versionada`).toBe(true)
      expect(fixture(nome).length).toBeGreaterThan(0)
    }
  })
})
