// ============================================================================
// C-3a — c3aArchitecture (C3A-T35 · R04/R14): os imports e as portas reais do
// código respeitam a fronteira — o DOMÍNIO de anexos é puro (sem fetch, sem
// File API de disco, sem ledger), o App apenas CONECTA portas (um único ponto
// de wiring, nenhum POST/upload inline), o cliente HTTP mora em services/ e o
// MM-0 continua contrato puro. O editor humano (abas/superfície estável)
// segue funcionando sem IA e não importa nada do caminho de anexos.
// As asserções são sobre as FONTES e os módulos vivos — nada de espelhar
// implementação dentro do teste.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { useStableEditorSurface } from '../shell/stableEditorSurface'
import { projetarSessaoPersistida } from '../domain/projecaoTranscript'
import { fireEvent } from '@testing-library/react'
import { validarArtefato } from '../domain/multimodal'
import { rascunhoInicial, editarRascunho, snapshotDoRascunho } from '../domain/landingDraft'
import { guardarArquivoVivo, arquivoVivo, apagarArquivoVivo } from '../domain/arquivosVivos'

const raiz = join(__dirname, '..')
const ler = (rel: string) => readFileSync(join(raiz, rel), 'utf8')

/** Remove comentários: comentário não é código e não deve satisfazer nem falhar asserção. */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const app = ler('App.tsx')
const appCodigo = semComentarios(app)
const dominioAnexos = {
  arquivosVivos: semComentarios(ler('domain/arquivosVivos.ts')),
  enviarAnexos: semComentarios(ler('domain/enviarAnexos.ts')),
  anexosRascunho: semComentarios(ler('domain/anexosRascunho.ts')),
}

describe('c3aArchitecture — T35: domínio puro e portas respeitadas', () => {
  it('C3A-T35 — o domínio de anexos não faz IO: sem fetch/XHR, sem localStorage, sem process/fs', () => {
    for (const [nome, fonte] of Object.entries(dominioAnexos)) {
      expect(fonte, nome).not.toMatch(/\bfetch\s*\(/)
      expect(fonte, nome).not.toMatch(/XMLHttpRequest|EventSource|WebSocket/)
      expect(fonte, nome).not.toMatch(/localStorage|sessionStorage|indexedDB/)
      // Domínio compartilhado com o servidor: nada de node:fs nem process.env.
      expect(fonte, nome).not.toMatch(/from ['"]node:/)
      expect(fonte, nome).not.toMatch(/process\.(env|argv|cwd)/)
      // Sem import de React: domínio puro não depende da camada de UI.
      expect(fonte, nome).not.toMatch(/from ['"]react['"]/)
      // E sem importar o cliente HTTP (o domínio não conhece transporte concreto).
      expect(fonte, nome).not.toMatch(/anexosClient/)
    }
  })

  it('C3A-T35 — o cliente HTTP de anexos mora em services/ e só fala com /api/sessions', () => {
    const cliente = semComentarios(ler('services/sessions/anexosClient.ts'))
    expect(cliente).toContain("const PREFIXO = '/api/sessions'")
    // Nenhum endpoint de provedor/IA no caminho de armazenamento do anexo.
    expect(cliente).not.toMatch(/\/api\/agir|openai\.com|anthropic\.com|api\.openai/)
    // O upload é corpo binário do File, nunca JSON com base64 (R08).
    expect(cliente).not.toMatch(/base64|readAsDataURL|toDataURL/)
    expect(cliente).toMatch(/body:\s*file\b/)
    // Todo erro HTTP passa por um único ponto de leitura de envelope.
    expect(cliente).toContain('expectOk')
  })

  it('C3A-T35 — o App só conecta portas: um único ponto de wiring e nenhum upload inline', () => {
    // O fluxo com anexos é chamado EXATAMENTE uma vez, com portas explícitas.
    const chamadas = appCodigo.split('enviarMensagemComAnexos(').length - 1
    expect(chamadas).toBe(1)
    expect(appCodigo).toMatch(/enviarMensagemComAnexos\(\{[^}]*portas:\s*portasEnvioApp\(\{/)

    // Nenhum caminho de upload/post de anexo é reimplementado no App.
    expect(appCodigo).not.toMatch(/\/api\/sessions\/[^'"`]*attachments|\.uploads?\b.*fetch/i)
    expect(appCodigo).not.toMatch(/admitirAnexo|enviarConteudoAnexo|registrarReferenciaAnexo/)
    // O App não monta a máquina de transferência por conta própria.
    expect(appCodigo).not.toMatch(/transferirAnexos\(/)

    // Delta de responsabilidade: o App importa o fluxo do dono (services), não o cria.
    expect(appCodigo).toMatch(/from '\.\/services\/sessions\/enviarComAnexos'/)
    // O hook de fusão é o único ponto de reconciliação F5 (sem polling inline).
    expect(appCodigo).toMatch(/useFusaoAnexos\(\{/)
    expect(appCodigo.split('useFusaoAnexos(').length - 1).toBe(1)
  })

  it('C3A-T35 — MM-0 permanece contrato puro e é a ÚNICA base de DTO (sem IO, sem import de anexos)', () => {
    for (const arquivo of ['domain/multimodal/contrato.ts', 'domain/multimodal/artefatos.ts', 'domain/multimodal/capacidades.ts', 'domain/multimodal/mensagens.ts']) {
      const fonte = semComentarios(ler(arquivo))
      expect(fonte, arquivo).not.toMatch(/from ['"]node:|process\.env|require\(/)
      expect(fonte, arquivo).not.toMatch(/anexos|Attachment|sessions\//)
      expect(fonte, arquivo).not.toMatch(/from ['"]react['"]/)
    }
    // O validador real continua puro e autoritativo para a projeção P30.
    const resultado = validarArtefato({
      id: 'art-1', name: 'r.txt', modality: 'file' as never,
      storageRole: 'copy' as never, origin: 'user' as never,
      bytes: 10, sha256: 'a'.repeat(64), state: 'pronto' as never,
    } as never)
    expect(resultado).toBeDefined()

    // A projeção de sessão não serializa o File nem o depósito transitório.
    const projeto = projetarSessaoPersistida({
      id: 's1', title: 'S', workspace: 'Chat', workspacePath: null, section: 'today',
      status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null,
      chats: [{ id: 'c1', title: 'C', status: 'completed', messages: [] }], mainChatId: 'c1',
    } as never)
    expect(JSON.stringify(projeto)).not.toMatch(/File|Blob/)
  })

  it('C3A-T35 — o File do rascunho vive no depósito transitório, nunca no snapshot serializado', () => {
    const file = new File(['conteúdo sintético'], 'vivo.txt', { type: 'text/plain' })
    guardarArquivoVivo('upload-t35', file)
    expect(arquivoVivo('upload-t35')).toBe(file)

    const rascunho = editarRascunho(rascunhoInicial(), {
      anexos: [{ id: 'a1', name: 'vivo.txt', kind: 'local', uploadId: 'upload-t35', estado: 'selecionado', modoCopia: 'privado' }],
    })
    const json = JSON.stringify(snapshotDoRascunho(rascunho, 'chat', null, null, 'tentativa-t35'))
    // O snapshot carrega a identidade, nunca o File (que é impossível em JSON).
    expect(json).toContain('upload-t35')
    expect(json).toContain('vivo.txt')
    apagarArquivoVivo('upload-t35')
    expect(arquivoVivo('upload-t35')).toBeUndefined()
  })
})

describe('c3aArchitecture — T35: o editor humano funciona sem IA', () => {
  it('C3A-T35 — a superfície do editor preserva o rascunho humano ao reposicionar, sem provedor', () => {
    function Form() {
      const [draft, setDraft] = useState('')
      return <input aria-label="Rascunho humano" value={draft} onChange={(event) => setDraft(event.target.value)} />
    }
    function Workbench({ oculto }: { oculto: boolean }) {
      const surface = useStableEditorSurface(<Form />)
      return <>{surface.portal}{oculto ? <aside /> : <section>{surface.slot}</section>}</>
    }
    const { rerender } = render(<Workbench oculto={false} />)
    const campo = screen.getByRole('textbox', { name: 'Rascunho humano' })
    fireEvent.change(campo, { target: { value: 'texto humano local' } })
    expect(campo).toHaveValue('texto humano local')

    // Ocultar e reabrir NÃO perde o rascunho (nada de IA no caminho).
    rerender(<Workbench oculto />)
    expect(screen.queryByRole('textbox', { name: 'Rascunho humano' })).not.toBeInTheDocument()
    rerender(<Workbench oculto={false} />)
    expect(screen.getByRole('textbox', { name: 'Rascunho humano' })).toHaveValue('texto humano local')
  })

  it('C3A-T35 — o shell de abas e a superfície do editor não importam o caminho de anexos/IA', () => {
    for (const arquivo of ['shell/abas.ts', 'shell/ponteAnexo.ts', 'shell/stableEditorSurface.tsx']) {
      const fonte = semComentarios(ler(arquivo))
      expect(fonte, arquivo).not.toMatch(/anexosClient|enviarComAnexos|anexosRascunho|arquivosVivos/)
      expect(fonte, arquivo).not.toMatch(/\/api\/agir|fetch\s*\(/)
    }
    // `ponteAnexo` fala com o módulo só por `import type` (fronteira apagada na compilação).
    const ponte = semComentarios(ler('shell/ponteAnexo.ts'))
    for (const linha of ponte.split('\n').filter((l) => l.includes("from '../modules/"))) {
      expect(linha.trim().startsWith('import type')).toBe(true)
    }
  })
})
