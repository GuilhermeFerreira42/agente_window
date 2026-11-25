// ============================================================================
// C-3b — T05 a T09: apresentação, fallback e estados honestos.
//
// jsdom não decodifica mídia de verdade (não há codec). O que estes testes
// provam aqui é a DECISÃO: qual elemento é montado, quais atributos são
// proibidos, o que acontece no erro e no estado ausente. A decodificação real
// é provada nos E2E com Chromium (C3B-E01/E02/E03).
// ============================================================================
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ArtifactCard } from '../components/ArtifactCard'
import { MessageParts } from '../components/MessageParts'
import type { CardArtefato, ItemApresentacao } from '../domain/apresentacaoMultimodal'
import { classificarPreview } from '../domain/politicaPreview'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FIXTURES = join(__dirname, 'fixtures/midia')
const fixture = (nome: string) => readFileSync(join(FIXTURES, nome))

function cardDe(nome: string, bytes: Uint8Array, estado: CardArtefato['estado'] = 'pronto'): CardArtefato {
  const classificacao = classificarPreview(bytes)
  return {
    artifactId: `art-${nome}`,
    name: nome,
    bytes: bytes.length,
    modalidade: classificacao.ok ? classificacao.modalidade : 'arquivo',
    estado,
    preview: classificacao,
  }
}

const urlPara = (artifactId: string) => `/api/sessions/s/chats/c/attachments/${artifactId}/media`

describe('C-3b — C3B-T05 imagens', () => {
  it('C3B-T05 PNG real monta <img> com nome acessível e carregamento preguiçoso', () => {
    const card = cardDe('foto.png', fixture('imagem.png'))
    render(<ArtifactCard card={card} url={urlPara(card.artifactId)} />)
    const img = screen.getByRole('img', { name: 'foto.png' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('src', urlPara(card.artifactId))
    // Nome e tamanho visíveis no card (R05).
    expect(screen.getByText('foto.png')).toBeInTheDocument()
    expect(screen.getByText(/160 B/)).toBeInTheDocument()
  })

  it('C3B-T05 Abrir/Escape/foco de retorno funcionam', async () => {
    const user = userEvent.setup()
    const card = cardDe('foto.png', fixture('imagem.png'))
    const itens: ItemApresentacao[] = [{ tipo: 'artefato', card, chave: 'k1' }]
    render(<MessageParts itens={itens} urlPara={urlPara} />)

    const abrir = screen.getByRole('button', { name: /Abrir foto\.png/ })
    await user.click(abrir)
    const dialogo = screen.getByRole('dialog', { name: /Visualização de foto\.png/ })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    // Foco entra no diálogo.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Fechar visualização' }))

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    // Foco volta ao gatilho original.
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))) })
    expect(document.activeElement).toBe(abrir)
  })

  it('C3B-T05 download é oferecido e dispara o callback do card', async () => {
    const user = userEvent.setup()
    const card = cardDe('foto.png', fixture('imagem.png'))
    const aoBaixar = vi.fn()
    render(<ArtifactCard card={card} url={urlPara(card.artifactId)} onBaixar={aoBaixar} />)
    await user.click(screen.getByRole('button', { name: /Baixar foto\.png/ }))
    expect(aoBaixar).toHaveBeenCalledWith(card)
  })

  it('C3B-T05 erro de imagem cai no fallback com download (não fica vazio)', () => {
    const card = cardDe('foto.png', fixture('imagem.png'))
    render(<ArtifactCard card={card} url={urlPara(card.artifactId)} onBaixar={vi.fn()} />)
    const img = screen.getByRole('img', { name: 'foto.png' })
    fireEvent.error(img)
    expect(screen.getByRole('status')).toHaveTextContent(/Não foi possível exibir foto\.png/)
    expect(screen.getByRole('button', { name: /Baixar arquivo/ })).toBeInTheDocument()
  })
})

describe('C-3b — C3B-T06 áudio', () => {
  it('C3B-T06 WAV real monta <audio> com controls e SEM autoplay', () => {
    const card = cardDe('som.wav', fixture('audio.wav'))
    const { container } = render(<ArtifactCard card={card} url={urlPara(card.artifactId)} />)
    const audio = container.querySelector('audio')!
    expect(audio).toBeInTheDocument()
    expect(audio).toHaveAttribute('controls')
    expect(audio).toHaveAttribute('preload', 'metadata')
    // Autoplay é proibido, inclusive implicitamente.
    expect(audio.autoplay).toBe(false)
    expect(audio).not.toHaveAttribute('autoplay')
  })

  it('C3B-T06 evento de play muda o rótulo ao vivo; erro conserva fallback', () => {
    const card = cardDe('som.wav', fixture('audio.wav'))
    const { container } = render(<ArtifactCard card={card} url={urlPara(card.artifactId)} onBaixar={vi.fn()} />)
    const audio = container.querySelector('audio')!
    fireEvent.play(audio)
    expect(screen.getByText('Reproduzindo')).toBeInTheDocument()
    fireEvent.pause(audio)
    expect(screen.getByText('Pronto para tocar')).toBeInTheDocument()
    fireEvent.error(audio)
    expect(screen.getByRole('status')).toHaveTextContent(/Não foi possível exibir som\.wav/)
  })
})

describe('C-3b — C3B-T07 vídeo', () => {
  it('C3B-T07 WebM real monta <video> com playsInline/controls e preload de metadata', () => {
    const card = cardDe('clipe.webm', fixture('video.webm'))
    const { container } = render(<ArtifactCard card={card} url={urlPara(card.artifactId)} />)
    const video = container.querySelector('video')!
    expect(video).toBeInTheDocument()
    expect(video).toHaveAttribute('controls')
    expect(video).toHaveAttribute('playsinline')
    expect(video).toHaveAttribute('preload', 'metadata')
    expect(video.autoplay).toBe(false)
  })

  it('C3B-T07 vídeo não é baixado inteiro ao montar (src direto, sem blob)', () => {
    const card = cardDe('clipe.webm', fixture('video.webm'))
    const { container } = render(<ArtifactCard card={card} url={urlPara(card.artifactId)} />)
    const video = container.querySelector('video')!
    expect(video.getAttribute('src')).toBe(urlPara(card.artifactId))
    expect(video.getAttribute('src')).not.toContain('blob:')
  })
})

describe('C-3b — C3B-T08 formatos não exibíveis', () => {
  it('C3B-T08 MIME falsificado (.png com HTML) NÃO vira <img>', () => {
    const card = cardDe('falso.png', fixture('falso.png'))
    const { container } = render(<ArtifactCard card={card} url={urlPara(card.artifactId)} onBaixar={vi.fn()} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('group', { name: /arquivo sem visualização/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Baixar falso\.png/ })).toBeInTheDocument()
  })

  it('C3B-T08 SVG e HTML nunca são renderizados ativos', () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    const card = cardDe('icone.svg', svg)
    const { container } = render(<ArtifactCard card={card} url={urlPara(card.artifactId)} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('object')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('embed')).toBeNull()
    expect(container.innerHTML).not.toContain('alert(1)')
    expect(screen.getByText(/Formato sem visualização/)).toBeInTheDocument()
  })

  it('C3B-T08 executável também é arquivo com download, sem preview', () => {
    const card = cardDe('app.exe', fixture('nao-exibivel.bin'))
    const { container } = render(<ArtifactCard card={card} url={urlPara(card.artifactId)} onBaixar={vi.fn()} />)
    expect(container.querySelector('img, video, audio')).toBeNull()
    expect(screen.getByRole('button', { name: /Baixar app\.exe/ })).toBeInTheDocument()
  })
})

describe('C-3b — C3B-T09 estados honestos', () => {
  it('C3B-T09 artefato ausente informa e NÃO oferece abrir', () => {
    const card = cardDe('sumiu.png', fixture('imagem.png'), 'ausente')
    render(<ArtifactCard card={card} url={null} motivoIndisponivel="Arquivo removido do disco." />)
    expect(screen.getByText('Arquivo removido do disco.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Abrir/ })).toBeNull()
    // O registro não prova a presença dos bytes: nenhum download falso.
    expect(screen.queryByRole('button', { name: /Baixar sumiu\.png/ })).toBeNull()
  })

  it('C3B-T09 legado sem bytes não ganha botão falso', () => {
    const card: CardArtefato = {
      artifactId: 'legado-1', name: 'antigo.pdf', bytes: undefined,
      modalidade: 'arquivo', estado: 'indisponivel',
      preview: { ok: false, motivo: 'bytes_insuficientes' },
    }
    render(<ArtifactCard card={card} url={null} />)
    expect(screen.getByText(/tamanho desconhecido/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Abrir/ })).toBeNull()
  })

  it('C3B-T09 uma parte com problema não esvazia a conversa', () => {
    const itens: ItemApresentacao[] = [
      { tipo: 'texto', texto: 'mensagem antes', chave: 't1' },
      { tipo: 'artefato', card: cardDe('ok.png', fixture('imagem.png')), chave: 'a1' },
      { tipo: 'nao-suportada', codigo: 'formato_futuro', tipoOriginal: 'holograma', chave: 'n1' },
      { tipo: 'texto', texto: 'mensagem depois', chave: 't2' },
    ]
    render(<MessageParts itens={itens} urlPara={urlPara} />)
    expect(screen.getByText('mensagem antes')).toBeInTheDocument()
    expect(screen.getByText('mensagem depois')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'ok.png' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(/formato não reconhecido/)
  })
})
