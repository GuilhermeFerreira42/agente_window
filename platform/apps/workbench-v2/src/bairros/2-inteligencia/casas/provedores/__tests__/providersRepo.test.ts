// Casa Provedores — testes do repositório do arquivo (FATIA 08).
// Cobrem as decisões do dono: D81 (arquivo fora do repo + 0600 + segunda tranca),
// D83 (máscara/reveal), D84 (arquivo manda; ambiente é reserva) e a migração v1→v2.
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  armazenamentoAtual,
  caminhoDoArquivo,
  lerArquivo,
  mascararChave,
  migrarV1ParaV2,
  resolverChave,
  revelarChave,
  salvarArquivo,
  estadoParaTela,
  validarEntrada,
} from '../server/providersRepo'

async function arquivoTemporario(): Promise<string> {
  const pasta = await mkdtemp(join(tmpdir(), 'provedores-'))
  return join(pasta, 'providers.json')
}

afterEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.AGENTE_WINDOW_PROVIDERS_PATH
})

describe('provedoresRepo — arquivo, máscara e precedência', () => {
  it('salva em 0600 e relê o que foi salvo', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo(
      {
        ativo: 'openai',
        provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', apiKey: 'sk-teste-123456' } },
      },
      caminho,
    )
    const modo = (await stat(caminho)).mode & 0o777
    expect(modo, 'o arquivo da chave precisa ser restrito ao dono').toBe(0o600)
    const lido = await lerArquivo(caminho)
    expect(lido.versao).toBe(2)
    expect(lido.ativo).toBe('openai')
    expect(lido.provedores.openai.apiKey).toBe('sk-teste-123456')
  })

  it('a segunda gravação faz backup .bak-<carimbo> antes de reescrever (nada se perde)', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo({ ativo: null, provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', apiKey: 'sk-1' } } }, caminho)
    await salvarArquivo({ ativo: null, provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o-mini', apiKey: 'sk-2' } } }, caminho)
    const pasta = resolve(caminho, '..')
    const backups = (await import('node:fs/promises')).readdir(pasta).then((nomes) => nomes.filter((n) => n.includes('.bak-')))
    expect((await backups).length, 'a troca de formato/valor não pode perder o arquivo anterior').toBeGreaterThan(0)
  })

  it('máscara: nunca menos de 4 pontos + os 4 últimos (D83)', () => {
    expect(mascararChave('sk-abc123456789a1b2')).toBe('••••••••••••a1b2')
    expect(mascararChave('abcde')).toBe('••••bcde')
  })

  it('estadoParaTela devolve só a máscara e a origem da chave (D83/D84)', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo(
      { ativo: null, provedores: { nvidia: { baseUrl: 'https://integrate.api.nvidia.com/v1', modelo: 'meta/llama-3.3-70b-instruct', apiKey: 'nvapi-abcdefgh1234' } } },
      caminho,
    )
    const tela = estadoParaTela(await lerArquivo(caminho))
    const nvidia = tela.provedores.find((p) => p.id === 'nvidia')!
    expect(nvidia.chaveMascarada).toBe('••••••••••••1234')
    expect(nvidia.origemChave).toBe('salva')
    expect(JSON.stringify(tela)).not.toContain('nvapi-abcdefgh1234')
    expect(nvidia.variavelAmbiente).toBe('NVIDIA_API_KEY')
  })

  it('D84: arquivo manda; ambiente só quando não há chave salva', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo({ ativo: null, provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', apiKey: 'sk-do-arquivo' } } }, caminho)
    process.env.OPENAI_API_KEY = 'sk-do-ambiente'
    const arquivo = await lerArquivo(caminho)
    expect(resolverChave('openai', arquivo)).toEqual({ chave: 'sk-do-arquivo', origem: 'salva' })
    expect(resolverChave('gemini', arquivo)).toEqual({ chave: null, origem: null })
    delete process.env.OPENAI_API_KEY
  })

  it('D84 (reserva): sem chave salva, usa a variável de ambiente e marca a origem', async () => {
    process.env.OPENAI_API_KEY = 'sk-do-ambiente'
    const arquivo = await lerArquivo(join(tmpdir(), 'nao-existe-provedores.json'))
    expect(resolverChave('openai', arquivo)).toEqual({ chave: 'sk-do-ambiente', origem: 'ambiente' })
  })

  it('PUT sem apiKey MANTÉM a chave guardada; apiKey vazia apaga (D84)', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo({ ativo: null, provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', apiKey: 'sk-guardada' } } }, caminho)
    // Sem a chave no payload: mantém (é o que a tela manda quando só troca o modelo).
    await salvarArquivo({ ativo: null, provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o-mini' } } }, caminho)
    expect((await lerArquivo(caminho)).provedores.openai.apiKey).toBe('sk-guardada')
    // Vazia: apaga de propósito.
    await salvarArquivo({ ativo: null, provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o-mini', apiKey: '' } } }, caminho)
    expect((await lerArquivo(caminho)).provedores.openai.apiKey).toBeUndefined()
  })

  it('recusa entrada inválida com mensagem em português claro', async () => {
    const caminho = await arquivoTemporario()
    const vazio = await lerArquivo(caminho)
    const casos: [unknown, RegExp][] = [
      [{ ativo: null, provedores: { 'nao-existe': { baseUrl: 'https://x.com', modelo: 'm' } } }, /Provedor desconhecido/],
      [{ ativo: null, provedores: { openai: { baseUrl: 'localhost', modelo: 'm' } } }, /http:\/\/ ou https:\/\//],
      [{ ativo: null, provedores: { 'openai-compat': { baseUrl: 'https://api.groq.com/openai/v1', modelo: 'm' } } }, /dê um nome ao serviço/],
      [{ ativo: null, provedores: { 'openai-compat': { baseUrl: '', modelo: 'm', nome: 'Groq' } } }, /informe o endereço/],
      [{ ativo: 'gemini', provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'm' } } }, /ativo inexistente/],
    ]
    for (const [entrada, esperado] of casos) {
      expect(() => validarEntrada(entrada as never, vazio), String(esperado)).toThrow(esperado)
    }
  })

  it('migra o formato antigo (v1) preservando o endereço do Ollama e quem estava ativo', () => {
    const v2 = migrarV1ParaV2({
      openai: { enabled: true },
      gemini: { enabled: false },
      ollama: { enabled: true, baseUrl: 'http://localhost:11434/' },
    })
    expect(v2.versao).toBe(2)
    expect(v2.provedores.ollama.baseUrl).toBe('http://localhost:11434')
    expect(v2.provedores.openai.baseUrl).toBe('https://api.openai.com/v1')
    expect(v2.provedores.gemini).toBeUndefined()
    expect(v2.ativo).toBe('openai')
    expect(JSON.stringify(v2)).not.toContain('apiKey')
  })

  it('ler arquivo v1 do disco devolve v2 (migração transparente)', async () => {
    const caminho = await arquivoTemporario()
    await writeFile(caminho, JSON.stringify({ ollama: { enabled: true, baseUrl: 'http://localhost:11434' } }), 'utf8')
    const lido = await lerArquivo(caminho)
    expect(lido.versao).toBe(2)
    expect(lido.provedores.ollama?.baseUrl).toBe('http://localhost:11434')
  })

  it('D83: revelar devolve a chave inteira; sem chave ou id errado, recusa', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo({ ativo: null, provedores: { openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', apiKey: 'sk-para-revelar-9999' } } }, caminho)
    expect(await revelarChave('openai', caminho)).toBe('sk-para-revelar-9999')
    await expect(revelarChave('gemini', caminho)).rejects.toThrow(/Nenhuma chave guardada/)
    await expect(revelarChave('nao-existe', caminho)).rejects.toThrow(/Provedor desconhecido/)
  })

  it('D81: o caminho real fica FORA do repositório e o .gitignore tem a segunda tranca', async () => {
    delete process.env.AGENTE_WINDOW_PROVIDERS_PATH
    const real = caminhoDoArquivo()
    const raizDoRepo = resolve(process.cwd(), '../../..')
    expect(real.startsWith(raizDoRepo), 'a chave NUNCA pode morar dentro do repositório').toBe(false)
    expect(armazenamentoAtual()).toBe('repo-home')
    const gitignore = await readFile(join(raizDoRepo, '.gitignore'), 'utf8')
    expect(gitignore, 'segunda tranca pedida pelo dono (D81)').toMatch(/^providers\.json$/m)
    expect(gitignore).toMatch(/^\.agente_window\/$/m)
    // E a fixture E2E aponta para fora do arquivo real:
    process.env.AGENTE_WINDOW_PROVIDERS_PATH = join(tmpdir(), 'fixture-provedores.json')
    expect(armazenamentoAtual()).toBe('fixture')
  })
})

describe('provedoresRepo — tranca extra do .gitignore (arquivo real)', () => {
  it('nenhum arquivo versionado se chama providers.json', async () => {
    const raizDoRepo = resolve(process.cwd(), '../../..')
    const existeNaRaiz = existsSync(join(raizDoRepo, 'providers.json'))
    expect(existeNaRaiz, 'providers.json não pode existir dentro do repo').toBe(false)
  })
})
