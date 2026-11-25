// ============================================================================
// C-3b — T29/T32: fronteira arquitetural e honestidade das provas.
//
// Asserções sobre as FONTES reais, não sobre espelhos da implementação.
// Comentários são removidos antes de conferir: comentário não é código.
// ============================================================================
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = join(__dirname, '..')
const ler = (rel: string) => readFileSync(join(raiz, rel), 'utf8')
const semComentarios = (fonte: string) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '')

const dominioApresentacao = semComentarios(ler('domain/apresentacaoMultimodal.ts'))
const dominioPolitica = semComentarios(ler('domain/politicaPreview.ts'))
const servicoMidia = semComentarios(ler('services/sessions/artefatosMediaClient.ts'))
const componenteCard = semComentarios(ler('components/ArtifactCard.tsx'))
const produtor = semComentarios(ler('server/session-persistence/attachments/produtorLocal.ts'))
const app = semComentarios(ler('App.tsx'))

describe('C-3b — C3B-T29 domínio puro e portas respeitadas', () => {
  it('C3B-T29 o domínio de apresentação não importa React, fetch, Node ou SDK', () => {
    for (const proibido of ['react', 'node:', 'fs', 'fetch(', 'electron', 'openai', 'anthropic']) {
      expect(dominioApresentacao, `domínio não deve conter "${proibido}"`).not.toContain(proibido)
      expect(dominioPolitica, `política não deve conter "${proibido}"`).not.toContain(proibido)
    }
  })

  it('C3B-T29 a política de preview não faz IO nem lê arquivo (recebe bytes e decide)', () => {
    expect(dominioPolitica).not.toContain('readFile')
    expect(dominioPolitica).not.toContain('createReadStream')
    expect(dominioPolitica).not.toContain('await')
  })

  it('C3B-T29 transporte vive em services, não no domínio nem no componente', () => {
    // A URL escopada é construída no cliente HTTP.
    expect(servicoMidia).toContain('/media')
    expect(dominioPolitica).not.toContain('/api/sessions')
    expect(dominioApresentacao).not.toContain('/api/sessions')
  })

  it('C3B-T29 o componente não constrói URL nem chama fetch (recebe url pronta)', () => {
    expect(componenteCard).not.toContain('fetch(')
    expect(componenteCard).not.toContain('/api/sessions')
  })

  it('C3B-T29 App continua só wiring: nenhuma regra de mídia nele', () => {
    for (const proibido of ['Range', 'Content-Range', 'canPlayType', 'classificarPreview', 'image/png']) {
      expect(app, `App não deve conter "${proibido}"`).not.toContain(proibido)
    }
  })

  it('C3B-T29 nenhum framework, transcoder ou serviço externo entrou no caminho', () => {
    const arquivos = [dominioApresentacao, dominioPolitica, servicoMidia, componenteCard, produtor]
    for (const fonte of arquivos) {
      expect(fonte).not.toMatch(/ffmpeg|sharp|fluent-ffmpeg|transcod/i)
      expect(fonte).not.toMatch(/from ['"]axios['"]|graphql/i)
    }
  })
})

describe('C-3b — C3B-T32 provas honestas', () => {
  it('C3B-T32 nenhuma suíte nova fica pendurada em bypass de VITEST', () => {
    const suites = [
      'c3bMensagens.test.ts',
      'c3bApresentacao.test.tsx',
      'c3bIntegracao.test.tsx',
      'c3bCompatibilidade.test.tsx',
      'c3bArquitetura.test.ts',
    ]
    for (const arquivo of suites) {
      let fonte = ''
      try { fonte = semComentarios(ler(`__tests__/${arquivo}`)) } catch { continue }
      // Um skip condicional em VITEST esconde a prova: proibido.
      expect(fonte, `${arquivo} não pode se auto-pular por ambiente`).not.toMatch(
        /describe\.skipIf\(\s*process\.env\.VITEST|it\.skipIf\(\s*process\.env\.VITEST|test\.skipIf\(/,
      )
      expect(fonte, `${arquivo} precisa de pelo menos uma asserção`).toMatch(/expect\(/)
    }
  })

  it('C3B-T32 as suítes de servidor não usam sleep nem retry para "passar"', () => {
    const servidor = [
      'server/session-persistence/attachments/media.test.ts',
      'server/session-persistence/attachments/gerados.test.ts',
      'server/session-persistence/attachments/partesPersistencia.test.ts',
    ]
    for (const rel of servidor) {
      const fonte = semComentarios(ler(rel))
      expect(fonte, `${rel} não deve usar sleep`).not.toMatch(
        /await new Promise\(\(r\) => setTimeout\(r, \d{2,}\)/,
      )
      expect(fonte, `${rel} não deve usar retry`).not.toMatch(/\.retry\(|retries:/)
    }
  })

  it('C3B-T32 fixtures de mídia têm hash registrado e gerador determinístico', () => {
    const hashes = JSON.parse(ler('__tests__/fixtures/midia/HASHES.json'))
    for (const nome of ['imagem.png', 'audio.wav', 'video.webm']) {
      expect(hashes[nome]?.sha256, `${nome} precisa de hash registrado`).toMatch(/^[0-9a-f]{64}$/)
      expect(hashes[nome].bytes).toBeGreaterThan(0)
    }
    expect(ler('__tests__/fixtures/midia/gerar-fixtures.mjs')).toContain('createHash')
    expect(ler('__tests__/fixtures/midia/verificar-fixtures.mjs')).toContain('inflateSync')
  })

  it('C3B-T32 nenhuma prova depende de contagem de tag de player', () => {
    const apresentacao = semComentarios(ler('__tests__/c3bApresentacao.test.tsx'))
    // Asserção por existência de tag é proibida; exigimos atributos/eventos.
    expect(apresentacao).toMatch(/toHaveAttribute\('preload'/)
    expect(apresentacao).toMatch(/fireEvent\.(play|error|pause)/)
    expect(apresentacao).not.toMatch(/expect\(container\.querySelector\('video'\)\)\.toBeTruthy\(\)\s*$/m)
  })

  it('C3B-T32 o contrato MM-0 existente não foi redefinido', () => {
    const contrato = semComentarios(ler('domain/multimodal/contrato.ts'))
    // Uma única definição de envelope: a C-3b importa, não duplica.
    expect((contrato.match(/interface EnvelopeMensagemMultimodal/g) ?? []).length).toBe(1)
    const apresentacao = ler('domain/apresentacaoMultimodal.ts')
    expect(apresentacao).toContain("from './multimodal/contrato'")
    expect(apresentacao).not.toMatch(/interface EnvelopeMensagemMultimodal/)
  })
})
