// ============================================================================
// C-3a — c3aDraft (T01/T20/T21 · R01/R09): o File REAL do browser sobrevive a
// remount (abrir Provedores) e remover o chip não altera o original; P30
// mantém partes/metadados sem bytes, base64, locator ou token em
// JSONL/localStorage; legado metadata-only exibe indisponibilidade honesta
// sem criar ou buscar arquivo por nome.
// ============================================================================
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SessionLanding } from '../components/SessionLanding'
import { arquivoVivo } from '../domain/arquivosVivos'
import type { EntradaSubmitLanding } from '../hooks/useLandingSubmission'
import { ChatPanel } from '../components/ChatPanel'
import { projetarSessaoPersistida } from '../domain/projecaoTranscript'
import { rascunhoInicial, editarRascunho, snapshotDoRascunho, type RascunhoLanding } from '../domain/landingDraft'
import { fundirEstadoAnexos, type ListaAnexos } from '../services/sessions/anexosClient'
import { chipSalvoSemMensagem } from '../hooks/useFusaoAnexos'
import type { Attachment, ChatMessage, NestedChat, Session } from '../types'

const VENENO = {
  content: 'SGVsbG8gYmFzZTY0IHZlbmVub3Nv',
  base64: 'aGVsbG8=',
  locator: '/home/user/absoluto/segredo.bin',
  token: 'sk-alias-que-nunca-deve-ir-ao-disco',
}

function anexoComVeneno(): Attachment {
  return {
    id: 'anexo-1',
    name: 'relatorio.pdf',
    kind: 'local',
    artifactId: 'aaaaaaa1-0000-4000-8000-000000000001',
    uploadId: 'bbbbbbb2-0000-4000-8000-000000000002',
    modalidade: 'arquivo',
    bytes: 42,
    sha256: 'd'.repeat(64),
    estado: 'pronto',
    mode: 'copy',
    modoCopia: 'privado',
    envioModelo: 'excluido-sem-codec',
    // Campos de navegador envenenados que NUNCA podem ir para o disco:
    ...VENENO,
  } as Attachment
}

function sessaoComAnexo(): Session {
  const mensagem: ChatMessage = {
    id: 'm1', role: 'user', content: 'segue o arquivo', time: '10:00',
    attachments: [anexoComVeneno()],
  }
  const chat: NestedChat = { id: 'c1', title: 'Chat', status: 'completed', messages: [mensagem] }
  return {
    id: 's1', title: 'Sessão', workspace: 'Chat', workspacePath: null, section: 'today',
    status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null,
    chats: [chat], mainChatId: 'c1',
    // Campo extensível de navegador que não vira store paralelo:
    navegadorOnly: { rastreio: 'não persistir' },
  } as Session
}

describe('c3aDraft — T20: P30 mantém partes/metadados sem bytes/base64/locator/token', () => {
  it('C3A-T20 — projeção JSONL preserva identidade do anexo e nunca grava conteúdo, locator ou token', () => {
    const projetada = projetarSessaoPersistida(sessaoComAnexo())
    const json = JSON.stringify(projetada)

    // Metadados e partes necessários ao F5 continuam presentes:
    expect(json).toContain('relatorio.pdf')
    expect(json).toContain('aaaaaaa1-0000-4000-8000-000000000001')
    expect(json).toContain('d'.repeat(64))
    expect(json).toContain('"modoCopia":"privado"')
    expect(json).toContain('"estado":"pronto"')

    // Veneno descartado (nada de bytes, base64, locator físico ou token):
    expect(json).not.toContain(VENENO.content)
    expect(json).not.toContain(VENENO.base64)
    expect(json).not.toContain(VENENO.locator)
    expect(json).not.toContain(VENENO.token)
    expect(json).not.toContain('sk-')

    // Store paralelo de navegador não persiste:
    expect(json).not.toContain('rastreio')
    expect((projetada as unknown as Record<string, unknown>).navegadorOnly).toBeUndefined()

    // Roundtrip do disco restaura as partes para a sessão viva.
    const restaurada = JSON.parse(json) as Session
    const anexo = restaurada.chats[0].messages[0].attachments![0]
    expect(anexo).toMatchObject({
      name: 'relatorio.pdf',
      artifactId: 'aaaaaaa1-0000-4000-8000-000000000001',
      estado: 'pronto',
      bytes: 42,
      modoCopia: 'privado',
    })
    expect(anexo).not.toHaveProperty('token')
  })

  it('C3A-T20 — rascunho da landing com anexos serializa só metadados (os Files vivem fora do snapshot)', () => {
    // Anexo construído pelo produto (ChatInput/arquivosVivos): só metadados.
    const anexoDoRascunho: Attachment = {
      id: 'anexo-1', name: 'relatorio.pdf', kind: 'local',
      uploadId: 'bbbbbbb2-0000-4000-8000-000000000002',
      estado: 'selecionado', modoCopia: 'privado',
    }
    let rascunho: RascunhoLanding = rascunhoInicial()
    rascunho = editarRascunho(rascunho, { anexos: [anexoDoRascunho] })
    const snapshot = snapshotDoRascunho(rascunho, 'chat', null, null, 'tentativa-t20')
    const json = JSON.stringify(snapshot)

    expect(snapshot.anexos?.[0]).toMatchObject({
      id: 'anexo-1', name: 'relatorio.pdf', uploadId: 'bbbbbbb2-0000-4000-8000-000000000002', estado: 'selecionado',
    })
    // Nenhum campo de File/blob/base64/locator/token existe no contrato do rascunho.
    const permitidas = new Set(['id', 'name', 'kind', 'artifactId', 'uploadId', 'modalidade', 'bytes',
      'sha256', 'estado', 'mode', 'modoCopia', 'envioModelo', 'referencia', 'legado'])
    for (const chave of Object.keys(snapshot.anexos![0])) expect(permitidas.has(chave)).toBe(true)
    expect(json).not.toContain('content')
    expect(json).not.toContain('base64')
    expect(json).not.toContain('locator')
    expect(json).not.toContain('token')
    expect(json).not.toContain('/home/')
  })

  it('C3A-T20 — F5/fusão mantém as partes do anexo com a verdade do ledger, sem reescrever o resto', () => {
    const anexo: Attachment = {
      id: 'anexo-1', name: 'relatorio.pdf', kind: 'local',
      artifactId: 'aaaaaaa1-0000-4000-8000-000000000001',
      estado: 'transferindo', bytes: 42, sha256: 'd'.repeat(64), modoCopia: 'privado',
    }
    const mensagens = [{ attachments: [anexo] }]
    const lista: ListaAnexos = {
      attachments: [{
        artifactId: 'aaaaaaa1-0000-4000-8000-000000000001',
        name: 'relatorio.pdf', bytes: 42, sha256: 'd'.repeat(64),
        mode: 'copy', estado: 'pronto', presente: true,
      }],
      uploads: [],
    }
    const fundidas = fundirEstadoAnexos(mensagens, lista).mensagens
    expect(fundidas[0].attachments![0]).toMatchObject({
      id: 'anexo-1', estado: 'pronto', bytes: 42, sha256: 'd'.repeat(64), modoCopia: 'privado',
      artifactId: 'aaaaaaa1-0000-4000-8000-000000000001',
    })
    const json = JSON.stringify(fundidas)
    expect(json).not.toContain(VENENO.token)
  })
})

describe('reconciliação de originais indisponíveis', () => {
  it('catálogo vazio invalida download antigo sem inventar estado para rascunho', () => {
    const mensagens = [{ attachments: [
      { id: 'antigo', name: 'a.txt', kind: 'local' as const, artifactId: 'a', estado: 'pronto' as const },
      { id: 'em-curso', name: 'b.txt', kind: 'local' as const, artifactId: 'b', estado: 'transferindo' as const },
    ] }]
    const fundida = fundirEstadoAnexos(mensagens, { attachments: [], uploads: [] }).mensagens[0].attachments!
    expect(fundida[0].estado).toBe('falhou')
    expect(fundida[1].estado).toBe('transferindo')
  })

  it('identifica transferência pelo uploadId distinto do artifactId', () => {
    const mensagens = [{ attachments: [{ id: 'x', name: 'x.txt', kind: 'local' as const, artifactId: 'a', uploadId: 'u', estado: 'pronto' as const }] }]
    const fundida = fundirEstadoAnexos(mensagens, { attachments: [], uploads: [
      { uploadId: 'u', artifactId: 'a', name: 'x.txt', mode: 'copy', state: 'recebendo', errorCode: null },
    ] }).mensagens[0].attachments!
    expect(fundida[0].estado).toBe('transferindo')
  })
})

describe('anexos órfãos', () => {
  it('não apresenta um original ausente como salvo', () => {
    const registro = { artifactId: 'a', name: 'a.txt', bytes: 1, sha256: 'a'.repeat(64), mode: 'copy' as const }
    expect(chipSalvoSemMensagem({ ...registro, presente: false }).attachments?.[0].estado).toBe('falhou')
    expect(chipSalvoSemMensagem({ ...registro, presente: true }).attachments?.[0].estado).toBe('pronto')
  })
})

describe('c3aDraft — T21: legado metadata-only honesto', () => {
  const legado: Attachment = { id: 'antigo-1', name: 'documento-antigo.docx', kind: 'local' }

  it('C3A-T21 — fusão nunca casa legado por nome nem inventa artefato para o item antigo', () => {
    const mensagens = [{ attachments: [legado] }]
    const lista: ListaAnexos = {
      // Servidor tem UM artefato com o MESMO nome de arquivo (armadilha do retarget por nome):
      attachments: [{
        artifactId: 'ccccccc3-0000-4000-8000-000000000003',
        name: 'documento-antigo.docx', bytes: 9, sha256: 'e'.repeat(64),
        mode: 'copy', estado: 'pronto', presente: true,
      }],
      uploads: [],
    }
    const fundidas = fundirEstadoAnexos(mensagens, lista).mensagens
    // Legado permanece EXATAMENTE {id,name,kind}: sem artefato, sem estado,
    // sem busca por nome — nenhuma identidade é emprestada.
    expect(fundidas[0].attachments![0]).toEqual({ id: 'antigo-1', name: 'documento-antigo.docx', kind: 'local' })
    expect(fundidas[0].attachments![0].artifactId).toBeUndefined()
    expect(fundidas[0].attachments![0].estado).toBeUndefined()
  })

  it('C3A-T21 — chip legado não promete disponibilidade nem oferece download falso; falha exibe indisponível', () => {
    const chat: NestedChat = {
      id: 'c-legado', title: 'Legado', status: 'completed',
      messages: [
        { id: 'm1', role: 'user', content: 'mensagem com anexo antigo', time: '09:00', attachments: [legado] },
        { id: 'm2', role: 'user', content: 'mensagem com anexo quebrado', time: '09:01', attachments: [
          { id: 'quebrado-1', name: 'sumiu.pdf', kind: 'local', artifactId: 'ddddddd4-0000-4000-8000-000000000004', estado: 'falhou' },
        ] },
        { id: 'm3', role: 'user', content: '', time: '09:02',
          attachments: [{ id: 'quebrado-2', name: 'sumiu.png', kind: 'local', artifactId: 'ddddddd4-0000-4000-8000-000000000005', estado: 'falhou', modalidade: 'imagem' }],
          multimodal: { versao: 1, messageId: 'm3', partes: [{ partId: 'p1', tipo: 'artefato', artifactId: 'ddddddd4-0000-4000-8000-000000000005', modalidade: 'imagem' }] },
        },
      ],
    }
    const session: Session = {
      id: 's-legado', title: 'Sessão legado', workspace: 'Chat', workspacePath: null,
      section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0,
      branch: null, chats: [chat], mainChatId: chat.id,
    }
    render(
      <ChatPanel
        session={session}
        activeChatId={chat.id}
        model="m"
        mode="agent"
        onSelectChat={() => {}}
        onChangeModel={() => {}}
        onChangeMode={() => {}}
        onSend={() => {}}
        onStop={() => {}}
        onApprove={() => {}}
        onCopy={() => {}}
        onCopyAll={() => {}}
        onCopyFinalResponse={() => {}}
        onRegenerate={() => {}}
        onFeedback={() => {}}
        onReport={() => {}}
        onDecidirFerramenta={() => {}}
        onDecidirContinuar={() => {}}
        onOpenBrowser={() => {}}
        onOpenDiff={() => {}}
      />,
    )

    // Legado: nome honesto, sem botão de download e sem alegação "salvo".
    const chipLegado = screen.getByLabelText(/documento-antigo\.docx/)
    expect(chipLegado.getAttribute('aria-label')).toContain('original indisponível')
    expect(chipLegado.getAttribute('aria-label')).not.toContain(' · salvo')
    expect(screen.queryByLabelText('Baixar documento-antigo.docx')).toBeNull()

    // Artefato ausente no servidor: indisponibilidade honesta no chip.
    expect(screen.getByLabelText(/sumiu\.pdf/).getAttribute('aria-label')).toContain(' · indisponível (original)')
    expect(screen.queryByLabelText('Baixar sumiu.pdf')).toBeNull()
    // Também no envelope multimodal: falhou jamais vira um card pronto.
    expect(screen.getByRole('group', { name: 'sumiu.png, indisponível' })).toHaveTextContent('O original deste arquivo não está disponível')
    expect(screen.queryByLabelText('Baixar sumiu.png')).toBeNull()
    expect(screen.queryByRole('img', { name: 'sumiu.png' })).toBeNull()
  })
})

/** Espião do DONO: o estado REAL do rascunho controlado pela landing. */
const ESPIAO: { atual: RascunhoLanding | null } = { atual: null }
const anexosDoRascunho = () => ESPIAO.atual?.anexos ?? []

/** Dono REAL do rascunho (mesmo hook do App) + landing controlada. */
function DonoDaLanding({ onSubmit }: { onSubmit: (entrada: EntradaSubmitLanding) => boolean | void | Promise<boolean | void> }) {
  const [rascunho, setRascunho] = useState<RascunhoLanding>(rascunhoInicial)
  const [montado, setMontado] = useState(true)
  ESPIAO.atual = rascunho
  return (
    <>
      <button onClick={() => setMontado((valor) => !valor)}>fixture remontar</button>
      {montado && (
        <SessionLanding workspace="Nenhuma pasta aberta" onSubmit={onSubmit}
          rascunhoControlado={rascunho} onChangeRascunho={setRascunho} />
      )}
    </>
  )
}

/** jsdom pode não expor File.text (o navegador alvo expõe): leitura via FileReader. */
function lerTexto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result ?? ''))
    leitor.onerror = () => reject(leitor.error)
    leitor.readAsText(file)
  })
}

describe('c3aDraft — T01: o File real sobrevive a remount e remover chip não altera o original', () => {
  it('C3A-T01 — abrir/fechar Provedores (remount da landing) preserva o File e a seleção; o chip volta do dono', async () => {
    const user = userEvent.setup()
    const { container } = render(<DonoDaLanding onSubmit={() => true} />)

    const entrada = container.querySelector('input[type="file"]')
    if (!(entrada instanceof HTMLInputElement)) throw new Error('file input ausente')
    const original = new File(['bytes originais'], 'relatorio.pdf', { type: 'application/pdf' })
    await user.upload(entrada, original)

    expect(await screen.findByRole('group', { name: /relatorio\.pdf/ })).toBeInTheDocument()
    const uploadId = anexosDoRascunho()[0]?.uploadId
    expect(uploadId).toBeTruthy()
    // O File REAL está no depósito transitório (mesma instância, mesmos bytes).
    expect(arquivoVivo(uploadId!)).toBe(original)

    // Remount (abrir Provedores): a landing desmonta e volta com o MESMO dono.
    await user.click(screen.getByRole('button', { name: 'fixture remontar' }))
    expect(screen.queryByRole('group', { name: /relatorio\.pdf/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'fixture remontar' }))

    // O chip volta com a mesma identidade e o File continua vivo, intacto.
    const chip = await screen.findByRole('group', { name: /relatorio\.pdf/ })
    expect(chip).toBeInTheDocument()
    expect(anexosDoRascunho()[0]?.uploadId).toBe(uploadId)
    expect(arquivoVivo(uploadId!)).toBe(original)
    expect(await lerTexto(original)).toBe('bytes originais')
  })

  it('C3A-T01 — remover o chip descarta SÓ o rascunho; o arquivo original do browser não é alterado', async () => {
    const user = userEvent.setup()
    const { container } = render(<DonoDaLanding onSubmit={() => true} />)
    const entrada = container.querySelector('input[type="file"]')
    if (!(entrada instanceof HTMLInputElement)) throw new Error('file input ausente')
    const original = new File(['conteúdo preservado'], 'contexto.md', { type: 'text/markdown' })
    await user.upload(entrada, original)

    const uploadId = anexosDoRascunho()[0]?.uploadId
    expect(arquivoVivo(uploadId!)).toBe(original)

    await user.click(screen.getByRole('button', { name: 'Remover contexto.md' }))
    expect(screen.queryByRole('group', { name: /contexto\.md/ })).not.toBeInTheDocument()
    expect(anexosDoRascunho()).toEqual([])
    // O File em si (fonte) segue legível — remover do rascunho não é apagar o original.
    expect(await lerTexto(original)).toBe('conteúdo preservado')
    expect(original.name).toBe('contexto.md')
  })
})

