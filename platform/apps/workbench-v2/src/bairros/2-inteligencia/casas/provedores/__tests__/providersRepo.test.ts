// Casa Provedores — testes do repositório do arquivo (FATIA 08).
// Cobrem as decisões do dono: D81 (arquivo fora do repo + 0600 POSIX/ACL normal do SO no Windows + segunda tranca),
// D83 (máscara/reveal), D84 (arquivo manda; ambiente é reserva), migração v1/v2/v3→v4 e gate exato de início.
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  armazenamentoAtual,
  caminhoDoArquivo,
  lerArquivo,
  mascararChave,
  migrarV1ParaV4,
  iniciarChamadaModelo,
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
  it('ignora avaliações canary legadas em v4 e não as grava de novo', async () => {
    const caminho = await arquivoTemporario()
    await writeFile(caminho, JSON.stringify({
      versao: 4,
      ativo: 'openai',
      provedores: { openai: { baseUrl: 'https://fixture.invalid/v1', modelo: 'fixture', modelosHabilitados: ['fixture'], habilitado: false, contexto: 16384, maxSaida: 4096, temperatura: 0.7, apiKey: 'fixture-not-a-real-key' } },
      toolCallingAssessments: { openai: { fixture: { status: 'verified', fingerprint: 'f'.repeat(64) } } },
    }), 'utf8')

    const lido = await lerArquivo(caminho)
    expect(lido.versao).toBe(4)
    expect(lido.ativo).toBe('openai')
    expect(lido.provedores.openai).toMatchObject({
      baseUrl: 'https://fixture.invalid/v1', modelo: 'fixture', modelosHabilitados: ['fixture'],
      habilitado: false, contexto: 16384, maxSaida: 4096, temperatura: 0.7, apiKey: 'fixture-not-a-real-key',
    })
    expect(lido).not.toHaveProperty('toolCallingAssessments')
    await salvarArquivo({
      ativo: lido.ativo,
      provedores: lido.provedores,
    }, caminho)
    expect(JSON.parse(await readFile(caminho, 'utf8'))).not.toHaveProperty('toolCallingAssessments')
  })

  it('exibe erro real de arquivo corrompido sem repetir seu conteúdo', async () => {
    const caminho = await arquivoTemporario()
    const conteudoInvalido = 'JSON fixture inválido: fixture-not-a-real-key'
    await writeFile(caminho, conteudoInvalido, 'utf8')
    const erro = await lerArquivo(caminho).catch((motivo: unknown) => motivo)
    expect(erro).toBeInstanceOf(Error)
    expect((erro as Error).message).toContain('arquivo de provedores está corrompido')
    expect((erro as Error).message).not.toContain('fixture-not-a-real-key')
  })

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
    if (process.platform !== 'win32') {
      expect(modo, 'POSIX: o arquivo da chave precisa ser restrito ao dono').toBe(0o600)
    }
    const lido = await lerArquivo(caminho)
    expect(lido.versao).toBe(4)
    expect(lido.ativo).toBe('openai')
    expect(lido.provedores.openai.apiKey).toBe('sk-teste-123456')
  })

  it.skipIf(process.platform !== 'win32')('Windows: lê e preserva configuração v4 usando as permissões normais da conta', async () => {
    const caminho = await arquivoTemporario()
    const pasta = resolve(caminho, '..')
    const registro = {
      versao: 4,
      ativo: 'openai',
      provedores: { openai: {
        baseUrl: 'https://fixture.invalid/v1', modelo: 'existing-model',
        modelosHabilitados: ['existing-model'], habilitado: true,
        apiKey: 'fixture-not-a-real-key', contexto: 16384,
      } },
    }
    try {
      const conteudoOriginal = `${JSON.stringify(registro, null, 2)}\n`
      await writeFile(caminho, conteudoOriginal, 'utf8')
      const antes = await readFile(caminho, 'utf8')
      const lido = await lerArquivo(caminho)
      expect(lido.provedores.openai.apiKey).toBe('fixture-not-a-real-key')
      expect(lido.provedores.openai.modelo).toBe('existing-model')
      expect(await readFile(caminho, 'utf8')).toBe(antes)

      await salvarArquivo({
        ativo: lido.ativo,
        provedores: {
          ...lido.provedores,
          openai: { ...lido.provedores.openai, modelo: 'updated-fixture-model' },
        },
      }, caminho)
      const salvo = await lerArquivo(caminho)
      expect(salvo.provedores.openai.apiKey).toBe('fixture-not-a-real-key')
      expect(salvo.provedores.openai.modelo).toBe('updated-fixture-model')
      expect((await (await import('node:fs/promises')).readdir(pasta)).some((nome) => nome.startsWith('providers.json.bak-'))).toBe(true)
    } finally {
      await rm(pasta, { recursive: true, force: true })
    }
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
    const migrado = migrarV1ParaV4({
      openai: { enabled: true },
      gemini: { enabled: false },
      ollama: { enabled: true, baseUrl: 'http://localhost:11434/' },
    })
    expect(migrado.versao).toBe(4)
    expect(migrado.provedores.ollama.baseUrl).toBe('http://localhost:11434')
    expect(migrado.provedores.openai.baseUrl).toBe('https://api.openai.com/v1')
    expect(migrado.provedores.gemini).toBeUndefined()
    expect(migrado.ativo).toBe('openai')
    expect(JSON.stringify(migrado)).not.toContain('apiKey')
  })

  it('ler arquivo v1 do disco devolve v4; Ollama sem modelo fica sem modelos habilitados', async () => {
    const caminho = await arquivoTemporario()
    await writeFile(caminho, JSON.stringify({ ollama: { enabled: true, baseUrl: 'http://localhost:11434' } }), 'utf8')
    const lido = await lerArquivo(caminho)
    expect(lido.versao).toBe(4)
    expect(lido.provedores.ollama?.baseUrl).toBe('http://localhost:11434')
    expect(lido.provedores.ollama?.modelo).toBe('')
    expect(lido.provedores.ollama?.modelosHabilitados).toEqual([])
    expect(lido.provedores.ollama?.habilitado).toBe(true)
  })

  it('migra v2 habilitando só o modelo padrão antigo, sem inventar um catálogo', async () => {
    const caminho = await arquivoTemporario()
    await writeFile(caminho, JSON.stringify({ versao: 2, ativo: 'openai', provedores: {
      openai: { baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', apiKey: 'sk-migrada' },
      ollama: { baseUrl: 'http://localhost:11434', modelo: '' },
    } }), 'utf8')
    const lido = await lerArquivo(caminho)
    expect(lido.versao).toBe(4)
    expect(lido.provedores.openai.modelosHabilitados).toEqual(['gpt-4o'])
    expect(lido.provedores.openai.habilitado).toBe(true)
    expect(lido.provedores.ollama.modelosHabilitados).toEqual([])
  })

  it('lineariza remoção com início da chamada: chamada já iniciada termina, a próxima é bloqueada', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo({ ativo: 'openai', provedores: { openai: {
      baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', modelosHabilitados: ['gpt-4o'], apiKey: 'sk-fixture',
    } } }, caminho)

    let sinalizarInicio!: () => void
    let concluir!: (valor: string) => void
    const iniciou = new Promise<void>((resolve) => { sinalizarInicio = resolve })
    const jaIniciada = iniciarChamadaModelo('openai', 'gpt-4o', (config) => {
      expect(config.modelId).toBe('gpt-4o')
      expect(config.apiKey).toBe('sk-fixture')
      sinalizarInicio()
      return new Promise<string>((resolve) => { concluir = resolve })
    }, caminho)
    await iniciou

    await salvarArquivo({ ativo: null, provedores: {} }, caminho)
    concluir('resposta que já estava em voo')
    await expect(jaIniciada).resolves.toBe('resposta que já estava em voo')
    await expect(iniciarChamadaModelo('openai', 'gpt-4o', async () => 'não deve iniciar', caminho))
      .rejects.toMatchObject({ code: 'selection_unavailable' })
  })

  it('bloqueia modelo desabilitado e provedor desabilitado antes do fetch', async () => {
    const caminho = await arquivoTemporario()
    await salvarArquivo({ ativo: 'openai', provedores: { openai: {
      baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', modelosHabilitados: [], apiKey: 'sk-fixture',
    } } }, caminho)
    await expect(iniciarChamadaModelo('openai', 'gpt-4o', async () => 'não', caminho))
      .rejects.toMatchObject({ code: 'model_disabled' })

    await salvarArquivo({ ativo: 'openai', provedores: { openai: {
      baseUrl: 'https://api.openai.com/v1', modelo: 'gpt-4o', modelosHabilitados: ['gpt-4o'], habilitado: false,
    } } }, caminho)
    await expect(iniciarChamadaModelo('openai', 'gpt-4o', async () => 'não', caminho))
      .rejects.toMatchObject({ code: 'selection_unavailable' })
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
