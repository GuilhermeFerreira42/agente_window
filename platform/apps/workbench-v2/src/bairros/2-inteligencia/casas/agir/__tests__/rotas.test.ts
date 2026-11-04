// ============================================================================
// Casa Agir — provas da rota (conquista 3): pré-condições honestas, fio SSE
// com o ciclo completo do loop (chunk → tool → approval → aprovar →
// tool_result → done), a NEGAÇÃO do dono e o "Permitir na Sessão" valendo
// na segunda mexida — além do aprovar para fluxo morto.
// ============================================================================
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import type { AlvoConversa, ObterAlvo } from '../../conversa'
import { rotaPertenceAoModuloAgir, tratarRotasAgir } from '../server/rotas'
import { criarExecutoresReais, type ExecutoresDisco } from '../server/discos'

type ResFalsa = ServerResponse & {
  statusCode: number
  ended: boolean
  chunks: string[]
  cabecalhos: Record<string, string>
  corpo: () => string
}

function fakeRes(): ResFalsa {
  const cabecalhos: Record<string, string> = {}
  const chunks: string[] = []
  const res = {
    statusCode: 0,
    ended: false,
    chunks,
    cabecalhos,
    corpo: () => chunks.join(''),
    setHeader: (chave: string, valor: string) => {
      cabecalhos[chave.toLowerCase()] = String(valor)
    },
    flushHeaders: () => undefined,
    write: (dado: string) => {
      chunks.push(String(dado))
      return true
    },
    end: (dado?: string) => {
      if (dado !== undefined) chunks.push(String(dado))
      res.ended = true
    },
  }
  return res as unknown as ResFalsa
}

function fakeReq(corpo = '', metodo = 'POST'): IncomingMessage {
  let corpoEfetivo = corpo
  if (corpo) {
    try {
      const valor = JSON.parse(corpo) as Record<string, unknown>
      if (valor && typeof valor === 'object') {
        corpoEfetivo = JSON.stringify({ sessionId: 'sessao-1', chatId: 'chat-1', ...valor })
      }
    } catch { /* preserva payload inválido para os casos de erro */ }
  }
  const req = Readable.from([Buffer.from(corpoEfetivo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage
}

const URL_AGIR = new URL('http://localhost/api/agir')
const URL_APROVAR = new URL('http://localhost/api/agir/aprovar')
const URL_CANCEL = new URL('http://localhost/api/agir/cancel')
const URL_MODE = new URL('http://localhost/api/agir/mode')
const URL_PERMISSION = new URL('http://localhost/api/agir/permission')
const URL_COMMAND_WAIT = new URL('http://localhost/api/agir/command-wait')

const ALVO: AlvoConversa = { providerId: 'openai', modelId: 'gpt-fixture', protocolo: 'openai-chat', baseUrl: 'http://stub.test/v1', modelo: 'gpt-fixture', apiKey: 'sk-123' }
const alvoOk: ObterAlvo = async () => ({ alvo: ALVO })

/** Raiz REAL em pasta temporária: os testes que executam ferramenta provam disco de verdade. */
const raiz = await mkdtemp(path.join(tmpdir(), 'agir-rotas-'))
const grantsPorSessao = new Map<string, Set<'criar' | 'escrever' | 'executar'>>()
const modosPorConversa = new Map<string, 'agent' | 'edit' | 'ask' | 'plan'>()
const permissoesPorConversa = new Map<string, { nivel: 'manual' | 'allow-all'; raiz: string }>()
const autoPorConversa = new Map<string, string>()
const chaveModo = (sessionId: string, chatId: string): string => `${sessionId}\\0${chatId}`
const concederPermissaoSessao = vi.fn((sessionId: string, _raiz: string, ferramenta: 'criar' | 'escrever' | 'executar') => {
  const grants = grantsPorSessao.get(sessionId) ?? new Set<'criar' | 'escrever' | 'executar'>()
  grants.add(ferramenta)
  grantsPorSessao.set(sessionId, grants)
})
const DEPS = {
  lerExclusaoAutomatica: (s: string, c: string, r: string) => autoPorConversa.get(chaveModo(s,c)) === r,
  definirExclusaoAutomatica: (s: string, c: string, r: string, permitir: boolean) => { if (permitir) autoPorConversa.set(chaveModo(s,c), r); else autoPorConversa.delete(chaveModo(s,c)) },
  criarExecutores: (raizExecucao: string) => criarExecutoresReais(raizExecucao, { plataforma: 'linux' }),
  obterAlvo: alvoOk,
  resolverShell: async () => ({ profile: { id: 'sh', label: 'sh', path: '/bin/sh' }, allProfiles: [{ id: 'sh', label: 'sh', path: '/bin/sh' }] }),
  resolverContexto: (sessionId: string, chatId: string) => sessionId && chatId
    ? { ok: true as const, raiz, permissoes: [...(grantsPorSessao.get(sessionId) ?? [])] }
    : { ok: false as const, message: 'Contexto da sessão inválido.' },
  concederPermissaoSessao,
  lerModo: (sessionId: string, chatId: string) => modosPorConversa.get(chaveModo(sessionId, chatId)) ?? null,
  definirModo: (sessionId: string, chatId: string, modo: 'agent' | 'edit' | 'ask' | 'plan') => { modosPorConversa.set(chaveModo(sessionId, chatId), modo) },
  lerPermissao: (sessionId: string, chatId: string, workspace: string) => {
    const escolha = permissoesPorConversa.get(chaveModo(sessionId, chatId))
    return escolha?.raiz === workspace ? escolha.nivel : 'manual'
  },
  definirPermissao: (sessionId: string, chatId: string, workspace: string, nivel: 'manual' | 'allow-all') => { permissoesPorConversa.set(chaveModo(sessionId, chatId), { nivel, raiz: workspace }) },
  lerTeto: async () => 25,
}

afterAll(async () => {
  await rm(raiz, { recursive: true, force: true })
})

function frames(res: ResFalsa): Record<string, unknown>[] {
  return res.chunks
    .join('')
    .split('\n\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha.replace(/^data: /, '')) as Record<string, unknown>)
}

function identity(res: ResFalsa): { runId: string; generation: number } {
  return {
    runId: res.cabecalhos['x-agir-run-id'],
    generation: Number(res.cabecalhos['x-agir-generation']),
  }
}

function approvalBody(res: ResFalsa, fields: Record<string, unknown>): string {
  return JSON.stringify({ ...fields, ...identity(res) })
}

async function registrarModo(mode: 'agent' | 'edit' | 'ask' | 'plan', sessionId = 'sessao-1', chatId = 'chat-1'): Promise<void> {
  const res = fakeRes()
  await tratarRotasAgir(fakeReq(JSON.stringify({ sessionId, chatId, mode })), res, URL_MODE, DEPS)
  expect(res.statusCode).toBe(200)
}

/** Fio SSE falso do PROVEDOR: uma sequência de respostas por chamada de fetch. */
function stubProvedor(respostas: string[]): void {
  let chamada = 0
  vi.stubGlobal('fetch', vi.fn(async () => {
    const corpo = respostas[Math.min(chamada, respostas.length - 1)]
    chamada += 1
    return new Response(corpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }))
}

describe('Missão 2 — consentimento de exclusão no backend', () => {
  const instrucaoUrl = new URL('http://localhost/api/agir/instruction')
  const recibo = async (fluxo: string, text: string): Promise<string> => {
    const res = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo, text })), res, instrucaoUrl, DEPS)
    expect(res.statusCode).toBe(200)
    return (JSON.parse(res.corpo()) as { token: string }).token
  }
  const executar = (fluxo: string, token?: string, extras: Record<string, unknown> = {}) => {
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ fluxo, instructionToken: token, messages: [{ role: 'user', content: 'histórico não concede autoridade' }], ...extras })), res, URL_AGIR, DEPS)
    return { res, fio }
  }

  it('tarefa de descartáveis não autoriza criar documento canônico; pedido específico pode autorizá-lo', async () => {
    await registrarModo('agent')
    await mkdir(path.join(raiz,'docs'),{recursive:true})
    const alvo=path.join(raiz,'docs','03 - ESTADO ATUAL.md')
    const sse=`data: ${JSON.stringify({choices:[{delta:{tool_calls:[{index:0,id:'doc-task',function:{name:'criar',arguments:JSON.stringify({caminho:alvo,conteudo:'DOC-SINTÉTICO'})}}]}}]})}\n\n`
    const fluxo='missao2-nao-editar-doc',token=await recibo(fluxo,'crie descartáveis para testar a exclusão')
    stubProvedor([sse,SSE_TOOL_DEPOIS_DE_RESULTADO]);const negado=executar(fluxo,token);await negado.fio
    expect(frames(negado.res)).toContainEqual(expect.objectContaining({type:'tool_result',ok:false,resumo:expect.stringContaining('Documento canônico protegido')}))
    await expect(readFile(alvo)).rejects.toThrow()
    const f2='missao2-documento-especifico',t2=await recibo(f2,`crie "${alvo}"`)
    stubProvedor([sse,SSE_TOOL_DEPOIS_DE_RESULTADO]);const permitido=executar(f2,t2);await permitido.fio
    expect(await readFile(alvo,'utf8')).toBe('DOC-SINTÉTICO')
  })

  it('instrução específica autenticada elimina segundo cartão inclusive fora do workspace, e recibo é descartável', async () => {
    const fora = await mkdtemp(path.join(tmpdir(), 'delete-externo-autorizado-'))
    const alvo = path.join(fora, 'externo.txt'); await writeFile(alvo, 'EXTERNO')
    const fluxo = 'missao2-explicito'
    const token = await recibo(fluxo, `exclua "${alvo}"`)
    stubProvedor([SSE_EXCLUIR(alvo), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const { res, fio } = executar(fluxo, token); await fio
    expect(frames(res).some(e => e.type === 'approval')).toBe(false)
    expect(frames(res)).toContainEqual(expect.objectContaining({ type: 'tool_result', ok: true }))
    await expect(readFile(alvo)).rejects.toThrow()
    const repeticao = executar(fluxo, token); await repeticao.fio
    expect(repeticao.res.statusCode).toBe(409)
  })

  it('mesmo texto no histórico, argumentos forjados e token de outra conversa não autorizam', async () => {
    const nome = 'sem-instrucao.txt'; await writeFile(path.join(raiz,nome), 'FICA')
    const fluxo = 'missao2-sem-instrucao'
    stubProvedor([SSE_EXCLUIR(nome), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const {res,fio} = executar(fluxo,undefined,{ messages: [{role:'user',content:`exclua "${nome}"`}], automaticDeletes:true, permission:'allow-all' })
    await esperaFio(res, '"type":"approval"')
    await tratarRotasAgir(fakeReq(approvalBody(res,{fluxo,id:'x1',decisao:'negar'})),fakeRes(),URL_APROVAR,DEPS); await fio
    expect(await readFile(path.join(raiz,nome),'utf8')).toBe('FICA')
    const token = await recibo('missao2-contexto',`exclua "${nome}"`)
    const outro = executar('missao2-contexto',token,{chatId:'outra'}); await outro.fio
    expect(outro.res.statusCode).toBe(409)
  })

  it('alvo alterado depois da instrução exige novo cartão e negar preserva a versão nova', async () => {
    const nome = 'instrucao-alterada.txt', alvo=path.join(raiz,nome); await writeFile(alvo,'ANTES')
    const fluxo='missao2-alterada', token=await recibo(fluxo,`exclua "${nome}"`)
    await writeFile(alvo,'DEPOIS')
    stubProvedor([SSE_EXCLUIR(nome),SSE_TOOL_DEPOIS_DE_RESULTADO])
    const {res,fio}=executar(fluxo,token)
    await esperaFio(res,'"type":"approval"')
    const approval=frames(res).find(e=>e.type==='approval')!
    const pedido=approval.pedido as {id:string}
    expect(pedido.id).not.toBe('x1')
    await tratarRotasAgir(fakeReq(approvalBody(res,{fluxo,id:pedido.id,decisao:'negar'})),fakeRes(),URL_APROVAR,DEPS); await fio
    expect(await readFile(alvo,'utf8')).toBe('DEPOIS')
  })

  it.each([false,true])('dois opt-ins liberam tarefa atual, externo=%s, sem cartão', async externo => {
    const pasta = externo ? await mkdtemp(path.join(tmpdir(),'delete-tarefa-')) : raiz
    const alvo=path.join(pasta,externo?'externo-tarefa.txt':'interno-tarefa.txt'); await writeFile(alvo,'TAREFA')
    const fluxo='missao2-auto-'+externo
    const token=await recibo(fluxo,`limpe os resíduos da tarefa em "${pasta}"`)
    const permissao=fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({permission:'allow-all',automaticDeletes:true})),permissao,URL_PERMISSION,DEPS)
    expect(permissao.statusCode).toBe(200)
    stubProvedor([SSE_EXCLUIR(alvo),SSE_TOOL_DEPOIS_DE_RESULTADO])
    const {res,fio}=executar(fluxo,token); await fio
    expect(frames(res).some(e=>e.type==='approval')).toBe(false)
    expect(frames(res)).toContainEqual(expect.objectContaining({type:'tool_result',ok:true}))
    await expect(readFile(alvo)).rejects.toThrow()
  })

  it('automático não cobre alvo externo sem escopo literal e revogar cancela cartão pendente', async () => {
    const fora=await mkdtemp(path.join(tmpdir(),'delete-fora-escopo-')), alvo=path.join(fora,'intacto.txt'); await writeFile(alvo,'INTACTO')
    const fluxo='missao2-revogar', token=await recibo(fluxo,'organize somente a pasta de trabalho')
    await tratarRotasAgir(fakeReq(JSON.stringify({permission:'allow-all',automaticDeletes:true})),fakeRes(),URL_PERMISSION,DEPS)
    stubProvedor([SSE_EXCLUIR(alvo),SSE_TOOL_DEPOIS_DE_RESULTADO])
    const {res,fio}=executar(fluxo,token); await esperaFio(res,'"type":"approval"')
    const revogar=fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({permission:'allow-all',automaticDeletes:false})),revogar,URL_PERMISSION,DEPS); await fio
    expect(JSON.parse(revogar.corpo())).toMatchObject({automaticDeletes:false,cancelledRun:'cancelled'})
    expect(await readFile(alvo,'utf8')).toBe('INTACTO')
  })

  it.each(['ask','plan'] as const)('modo %s bloqueia exclusão mesmo com instrução e opt-ins', async mode => {
    await registrarModo(mode)
    const nome='somente-leitura-'+mode+'.txt'; await writeFile(path.join(raiz,nome),'FICA')
    const fluxo='missao2-'+mode, token=await recibo(fluxo,`exclua "${nome}"`)
    await tratarRotasAgir(fakeReq(JSON.stringify({permission:'allow-all',automaticDeletes:true})),fakeRes(),URL_PERMISSION,DEPS)
    stubProvedor([SSE_EXCLUIR(nome),SSE_TOOL_DEPOIS_DE_RESULTADO])
    const {res,fio}=executar(fluxo,token); await fio
    expect(frames(res)).toContainEqual(expect.objectContaining({type:'tool_result',ok:false}))
    expect(await readFile(path.join(raiz,nome),'utf8')).toBe('FICA')
  })

  it('observação incompleta emite erro terminal sem cartão nem execução', async () => {
    const deps={...DEPS,criarExecutores:(r:string)=>({...DEPS.criarExecutores(r),prepararExclusao:async()=>{throw new Error('Exclusão não preparada: observação incompleta')}})}
    stubProvedor([SSE_EXCLUIR('nao-mover')])
    const res=fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({fluxo:'missao2-falha-previa',messages:[{role:'user',content:'teste'}]})),res,URL_AGIR,deps)
    expect(res.ended).toBe(true)
    expect(frames(res).some(e=>e.type==='approval')).toBe(false)
    expect(frames(res)).toContainEqual(expect.objectContaining({type:'error',code:'resposta'}))
  })
})

const PEDIDO_BASE = JSON.stringify({
  mode: 'agent', messages: [{ role: 'user', content: 'crie o ola.txt' }],
  fluxo: 'sessao-1',
  workspace: 'raiz-real',
})

const SSE_TOOL = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'criar', arguments: '{"caminho":"ola.txt","conteudo":"oi"}' } }] } }] })}\n\n`
const SSE_COMANDO = (comando: string, id = 'cmd1') => `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id, function: { name: 'executar', arguments: JSON.stringify({ comando }) } }] } }] })}\n\n`
const SSE_LER_F5 = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'read-f5', function: { name: 'ler', arguments: '{"caminho":"f5-edit.txt"}' } }] } }] })}\n\n`
const SSE_ESCREVER_F5 = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'write-f5', function: { name: 'escrever', arguments: '{"caminho":"f5-edit.txt","conteudo":"depois"}' } }] } }] })}\n\n`
const SSE_DUAS_FERRAMENTAS = `data: ${JSON.stringify({
  choices: [{
    delta: {
      tool_calls: [
        { index: 0, id: 'c1', function: { name: 'criar', arguments: '{"caminho":"um.txt","conteudo":"primeiro"}' } },
        { index: 1, id: 'c2', function: { name: 'criar', arguments: '{"caminho":"dois.txt","conteudo":"segundo"}' } },
      ],
    },
  }],
})}\n\n`
const SSE_TOOL_DEPOIS_DE_RESULTADO = `data: ${JSON.stringify({ choices: [{ delta: { content: 'Pronto, criei.' } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`

async function esperaFio(res: ResFalsa, contem: string, tentativas = 60): Promise<void> {
  for (let i = 0; i < tentativas; i += 1) {
    if (res.corpo().includes(contem)) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`o fio nunca ganhou "${contem}": ${res.corpo()}`)
}

afterEach(() => {
  autoPorConversa.clear()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  grantsPorSessao.clear()
  modosPorConversa.clear()
  permissoesPorConversa.clear()
})

describe('rotas — POST /api/agir', () => {
  it('reconhece só o caminho e o método certos', async () => {
    expect(rotaPertenceAoModuloAgir('/api/agir')).toBe(true)
    expect(rotaPertenceAoModuloAgir('/api/agir/aprovar')).toBe(true)
    expect(rotaPertenceAoModuloAgir('/api/agir/cancel')).toBe(true)
    expect(rotaPertenceAoModuloAgir('/api/agirx')).toBe(false)
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE, 'GET'), res, URL_AGIR, DEPS)).toBe(false)
    expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE), fakeRes(), new URL('http://localhost/api/outra'), DEPS)).toBe(false)
  })

  it('histórico vazio → 400 honesto; sem provedor → 409 honesto; fio NUNCA aberto', async () => {
    const vazio = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 's' })), vazio, URL_AGIR, DEPS)).toBe(true)
    expect(vazio.statusCode).toBe(400)
    expect(JSON.parse(vazio.corpo()).message).toContain('Histórico vazio')

    const semProvedor = fakeRes()
    const depsSemProvedor = { ...DEPS, obterAlvo: (async () => ({ alvo: null, erro: { code: 'sem_provedor' as const, message: 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.' } })) as ObterAlvo }
    expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE), semProvedor, URL_AGIR, depsSemProvedor)).toBe(true)
    expect(semProvedor.statusCode).toBe(409)
    expect(JSON.parse(semProvedor.corpo())).toMatchObject({ code: 'sem_provedor' })
    expect(semProvedor.corpo()).not.toContain('data: ')
  })

  it('inicia com capacidade desconhecida e aceita resposta normal sem chamadas de ferramenta', async () => {
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const pedido = JSON.parse(String(init.body)) as { tools: unknown[]; tool_choice: string }
      expect(pedido.tools).toHaveLength(7)
      expect(pedido.tool_choice).toBe('auto')
      return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Olá, posso responder diretamente.' } }] })}\n\n`, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(200)
    expect(frames(res).some((frame) => frame.type === 'done')).toBe(true)
    expect(res.corpo()).toContain('Olá, posso responder diretamente.')
    expect(res.corpo()).not.toContain('sem_canal_nativo')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('mostra a rejeição real do provedor e não tenta outro modelo', async () => {
    const alvoSpy = vi.fn(alvoOk)
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      expect(JSON.parse(String(init.body)).model).toBe('gpt-fixture')
      return new Response(JSON.stringify({ error: { message: 'tool_choice unsupported for this endpoint; token sk-123' } }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchSpy)
    const res = fakeRes()
    await tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, { ...DEPS, obterAlvo: alvoSpy })
    const erro = frames(res).find((frame) => frame.type === 'error')
    expect(erro).toMatchObject({ type: 'error', code: 'http' })
    expect(erro?.message).toContain('tool_choice unsupported for this endpoint')
    expect(erro?.message).not.toContain('sk-123')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(alvoSpy).toHaveBeenCalledTimes(1)
  })

  it('exige identidade de sessão/conversa no corpo antes de iniciar', async () => {
    const res = fakeRes()
    const corpo = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'oi' }], fluxo: 's', sessionId: '', chatId: 'chat-1' })
    expect(await tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.corpo()).message).toContain('identidade da sessão')
  })

  it('sem sessão persistida válida → 409 antes de abrir o fio (o browser não escolhe território)', async () => {
    const res = fakeRes()
    const corpo = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'oi' }], fluxo: 's', workspace: raiz })
    const deps = { ...DEPS, resolverContexto: () => ({ ok: false as const, message: 'Sessão não registrada.' }) }
    expect(await tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, deps)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).message).toContain('Sessão não registrada')
  })

  it('ciclo completo: tool → approval → NEGAR → tool_result "dono negou" → resposta em texto', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res)[0]).toMatchObject({ type: 'iteracao', model: 'openai / gpt-fixture' })
    expect(frames(res).map((e) => e.type)).toEqual(['iteracao', 'tool', 'approval'])

    const aprovar = fakeRes()
    const corpoNegar = approvalBody(res, { fluxo: 'sessao-1', id: 'c1', decisao: 'negar' })
    expect(await tratarRotasAgir(fakeReq(corpoNegar), aprovar, URL_APROVAR, DEPS)).toBe(true)
    expect(aprovar.statusCode).toBe(200)

    await fio
    const tipos = frames(res).map((e) => e.type)
    expect(tipos).toEqual(['iteracao', 'tool', 'approval', 'tool_result', 'iteracao', 'chunk', 'done'])
    const resultado = frames(res)[3] as Record<string, unknown>
    expect(resultado).toMatchObject({ type: 'tool_result', ok: false })
    expect(String(resultado.resumo)).toContain('dono negou')
    // nada foi escrito: o executor nem roda (a negação é a resposta ao modelo)
  })

  it('"Permitir na Sessão" na 1.ª mexida: a 2.ª não faz cartão (Q2a, dentro do fluxo)', async () => {
    stubProvedor([SSE_DUAS_FERRAMENTAS, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const corpoSessao = JSON.stringify({
      mode: 'agent', messages: [{ role: 'user', content: 'crie dois arquivos' }],
      fluxo: 'sessao-2',
      workspace: 'raiz-real',
    })
    const fio = tratarRotasAgir(fakeReq(corpoSessao), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).filter((e) => e.type === 'approval')).toHaveLength(1) // só a 1.ª pergunta
    const primeiro = fakeRes()
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-2', id: 'c1', decisao: 'sessao', ferramenta: 'criar' })), primeiro, URL_APROVAR, DEPS)
    await esperaFio(res, '"type":"done"')
    await fio

    const tipos = frames(res).map((e) => e.type)
    expect(tipos.filter((t) => t === 'approval')).toHaveLength(1)
    expect(tipos.filter((t) => t === 'tool_result')).toHaveLength(2)
    expect(tipos[tipos.length - 1]).toBe('done')
    expect(concederPermissaoSessao).toHaveBeenCalledWith('sessao-1', raiz, 'criar')
  })

  it('campo de permissão forjado pelo browser é ignorado; o cartão continua obrigatório', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const corpo = JSON.stringify({
      mode: 'agent', messages: [{ role: 'user', content: 'crie o ola.txt' }],
      fluxo: 'sessao-3',
      workspace: '/fora',
      permissoes: ['criar'],
    })
    const fio = tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).map((e) => e.type)).toEqual(['iteracao', 'tool', 'approval'])
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-3', id: 'c1', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    expect(concederPermissaoSessao).not.toHaveBeenCalled()
  })

  it('aprovar para fluxo morto → 409 honesto', async () => {
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fantasma', id: 'c1', decisao: 'permitir', runId: 'nao-existe', generation: 1 })), res, URL_APROVAR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).message).toContain('expirou')
  })

  it('approval de outra sessão não consome nem executa o cartão', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const estranho = fakeRes()
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-1', id: 'c1', decisao: 'permitir', sessionId: 'outra-sessao' })), estranho, URL_APROVAR, DEPS)
    expect(estranho.statusCode).toBe(409)
    expect(JSON.parse(estranho.corpo()).message).toContain('não pertence à sessão')
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-1', id: 'c1', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    expect(frames(res).some((evento) => evento.type === 'tool_result' && evento.ok === true)).toBe(false)
  })
})

const URL_CONTINUAR = new URL('http://localhost/api/agir/continuar')
const SSE_BUSCAR = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'b1', function: { name: 'buscar', arguments: '{"padrao":"*.txt"}' } }] } }] })}\n\n`

describe('FATIA 11 — teto e continuar no fio', () => {
  it('teto no fio: pausa com evento `teto` e o "continuar" retoma o mesmo fluxo', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-teto-1', workspace: 'raiz-real' })
    const res1 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)).toBe(true)
    const f1 = frames(res1)
    expect(f1.map((f) => f.type)).toEqual(['iteracao', 'tool', 'tool_result', 'teto'])
    expect(f1[3]).toEqual({ type: 'teto', iteracoes: 1, teto: 1 })

    const res2 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-teto-1' })), res2, URL_CONTINUAR, deps)).toBe(true)
    const f2 = frames(res2)
    expect(f2[f2.length - 1]).toMatchObject({ type: 'done' })
    expect(f2.some((f) => f.type === 'chunk')).toBe(true)
    expect(f2.some((f) => f.type === 'error')).toBe(false)
  })

  it('continuar sem pausa guardada = 409 honesto (nada para retomar)', async () => {
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-fantasma' })), res, URL_CONTINUAR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).code).toBe('fluxo')
  })

  it('erro transitório (500) guarda retomada: o "continuar" retoma de onde parou (pós-11)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('erro do provedor', { status: 500 })))
    const deps = { ...DEPS, lerTeto: async () => 3 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-erro-1', workspace: 'raiz-real' })
    const res1 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)).toBe(true)
    const f1 = frames(res1)
    expect(f1.map((f) => f.type)).toEqual(['iteracao', 'error'])
    expect(f1[1]).toMatchObject({ type: 'error', code: 'http', retomavel: true, iteracoes: 1, teto: 3 })
    // O continuar reabre o MESMO fluxo (agora o provedor responde bem):
    stubProvedor([SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res2 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-erro-1' })), res2, URL_CONTINUAR, deps)).toBe(true)
    const f2 = frames(res2)
    expect(f2[f2.length - 1]).toMatchObject({ type: 'done' })
    expect(f2.some((f) => f.type === 'error')).toBe(false)
  })

  it('pedido novo no mesmo fluxo descarta a retomada velha', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-teto-2', workspace: 'raiz-real' })
    const res1 = fakeRes()
    await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)
    expect(frames(res1).at(-1)).toMatchObject({ type: 'teto' })
    // Novo pedido no MESMO fluxo: conclui em texto — a retomada morre aqui.
    const res2 = fakeRes()
    await tratarRotasAgir(fakeReq(pedido), res2, URL_AGIR, deps)
    expect(frames(res2).at(-1)).toMatchObject({ type: 'done' })
    const res3 = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-teto-2' })), res3, URL_CONTINUAR, deps)
    expect(res3.statusCode).toBe(409)
  })
})

describe('Fatia 13 — permission level e comando one-shot', () => {
  const identidadeConversa = { sessionId: 'sessao-1', chatId: 'chat-1' }

  it('Continue do cartão de timeout retoma a mesma execução one-shot', async () => {
    await registrarModo('agent')
    await tratarRotasAgir(fakeReq(JSON.stringify({ sessionId: 'sessao-1', chatId: 'chat-1', permission: 'allow-all' })), fakeRes(), URL_PERMISSION, DEPS)
    const deps = { ...DEPS, timeoutComandoMs: 60 }
    stubProvedor([SSE_COMANDO("sleep 0.1; printf 'continuacao-f13'"), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ sessionId: 'sessao-1', chatId: 'chat-1', messages: [{ role: 'user', content: 'execute uma espera segura' }], fluxo: 'f13-command-continue' })), res, URL_AGIR, deps)
    await esperaFio(res, '"type":"command_waiting"')
    const evento = frames(res).find((item) => item.type === 'command_waiting')
    const continuar = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'f13-command-continue', id: evento?.id, ...identity(res), sessionId: 'sessao-1', chatId: 'chat-1', decisao: 'continuar' })), continuar, URL_COMMAND_WAIT, deps)
    expect(continuar.statusCode).toBe(200)
    await fio
    expect(frames(res).some((item) => item.type === 'tool_result' && item.ok === true)).toBe(true)
    expect(frames(res).at(-1)).toMatchObject({ type: 'done' })
  }, 10_000)

  it('valida a resposta de timeout e rejeita decisões de espera expiradas', async () => {
    const incompleta = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({})), incompleta, URL_COMMAND_WAIT, DEPS)
    expect(incompleta.statusCode).toBe(400)

    const expirada = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'f13-closed', id: 'cmd-timeout', runId: 'run-expirado', sessionId: 'sessao-1', chatId: 'chat-1', generation: 1, decisao: 'continuar' })), expirada, URL_COMMAND_WAIT, DEPS)
    expect(expirada.statusCode).toBe(409)
    expect(JSON.parse(expirada.corpo()).code).toBe('approval_expired')
  })

  it('mantém Manual como padrão seguro e grava a seleção no servidor com escopo de workspace', async () => {
    const semGravador = { ...DEPS, definirPermissao: undefined }
    const indisponivel = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'allow-all' })), indisponivel, URL_PERMISSION, semGravador)
    expect(indisponivel.statusCode).toBe(503)

    const permitirTudo = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'allow-all' })), permitirTudo, URL_PERMISSION, DEPS)
    expect(permitirTudo.statusCode).toBe(200)
    expect(JSON.parse(permitirTudo.corpo())).toMatchObject({ permission: 'allow-all' })
    expect(DEPS.lerPermissao('sessao-1', 'chat-1', raiz)).toBe('allow-all')
    expect(DEPS.lerPermissao('sessao-1', 'chat-1', '/tmp/outro-workspace')).toBe('manual')

    const voltarManual = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'manual' })), voltarManual, URL_PERMISSION, DEPS)
    expect(JSON.parse(voltarManual.corpo())).toMatchObject({ permission: 'manual' })
    expect(DEPS.lerPermissao('sessao-1', 'chat-1', raiz)).toBe('manual')
  })

  it('Permitir tudo não transforma Perguntar/Planejar em modos de execução', async () => {
    await registrarModo('ask')
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'allow-all' })), fakeRes(), URL_PERMISSION, DEPS)
    const alvo = 'f13-ask-must-stay-readonly.txt'
    stubProvedor([SSE_COMANDO(`touch ${alvo}`), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, mode: 'agent', messages: [{ role: 'user', content: 'use um comando' }], fluxo: 'f13-ask-readonly' })), res, URL_AGIR, DEPS)

    expect(frames(res).some((evento) => evento.type === 'approval')).toBe(false)
    const resultado = frames(res).find((evento) => evento.type === 'tool_result')
    expect(resultado).toMatchObject({ ok: false })
    expect(String(resultado?.resumo)).toContain('somente leitura')
    await expect(readFile(path.join(raiz, alvo), 'utf8')).rejects.toThrow()
  })

  it('em Manual, pede aprovação individual e a negação não inicia processo nem cria arquivo', async () => {
    await registrarModo('agent')
    const alvo = 'manual-command-nao-executado.txt'
    stubProvedor([SSE_COMANDO(`touch ${alvo}`), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, messages: [{ role: 'user', content: 'use um comando seguro' }], fluxo: 'f13-manual' })), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).some((evento) => evento.type === 'approval')).toBe(true)

    const negar = fakeRes()
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'f13-manual', id: 'cmd1', decisao: 'negar' })), negar, URL_APROVAR, DEPS)
    expect(negar.statusCode).toBe(200)
    await fio
    await expect(readFile(path.join(raiz, alvo), 'utf8')).rejects.toThrow()
  })

  it('Allow all suprime prompts individuais inclusive para padrão de alto risco, em fixture isolada', async () => {
    await registrarModo('agent')
    const permissao = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'allow-all' })), permissao, URL_PERMISSION, DEPS)
    const fixture = path.join(raiz, 'f13-high-risk-fixture')
    await mkdir(fixture, { recursive: true })
    await writeFile(path.join(fixture, 'keep.txt'), 'fixture segura', 'utf8')

    stubProvedor([SSE_COMANDO('rm -rf ./f13-high-risk-fixture'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, messages: [{ role: 'user', content: 'remova somente a fixture temporária de teste' }], fluxo: 'f13-high-risk-all' })), res, URL_AGIR, DEPS)
    expect(frames(res).some((evento) => evento.type === 'approval')).toBe(false)
    expect(frames(res).some((evento) => evento.type === 'tool_result' && evento.ok === true)).toBe(true)
    await expect(readFile(path.join(fixture, 'keep.txt'), 'utf8')).rejects.toThrow()
  })

  it('Manual exige aprovação individual para alto risco mesmo com grant de execução', async () => {
    await registrarModo('agent')
    grantsPorSessao.set('sessao-1', new Set(['executar']))
    const fixture = path.join(raiz, 'f13-high-risk-manual-fixture')
    await mkdir(fixture, { recursive: true })
    await writeFile(path.join(fixture, 'keep.txt'), 'não remover', 'utf8')
    stubProvedor([SSE_COMANDO('rm -rf ./f13-high-risk-manual-fixture'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, messages: [{ role: 'user', content: 'remova fixture de teste' }], fluxo: 'f13-high-risk-manual' })), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).find((evento) => evento.type === 'approval')).toMatchObject({ allowSession: false })
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'f13-high-risk-manual', id: 'cmd1', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    await expect(readFile(path.join(fixture, 'keep.txt'), 'utf8')).resolves.toBe('não remover')
  })

  it('Manual respeita grant de sessão server-side para comandos seguros posteriores', async () => {
    await registrarModo('agent')
    const primeiroAlvo = 'f13-session-grant-first.txt'
    stubProvedor([SSE_COMANDO(`touch ${primeiroAlvo}`), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const primeiro = fakeRes()
    const primeiroFio = tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, messages: [{ role: 'user', content: 'crie fixture segura' }], fluxo: 'f13-grant-first' })), primeiro, URL_AGIR, DEPS)
    await esperaFio(primeiro, '"type":"approval"')
    expect(frames(primeiro).find((evento) => evento.type === 'approval')).toMatchObject({ allowSession: true })
    await tratarRotasAgir(fakeReq(approvalBody(primeiro, { fluxo: 'f13-grant-first', id: 'cmd1', decisao: 'sessao' })), fakeRes(), URL_APROVAR, DEPS)
    await primeiroFio
    expect(concederPermissaoSessao).toHaveBeenCalledWith('sessao-1', raiz, 'executar')

    const segundoAlvo = 'f13-session-grant-second.txt'
    stubProvedor([SSE_COMANDO(`touch ${segundoAlvo}`), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const segundo = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, messages: [{ role: 'user', content: 'crie outra fixture segura' }], fluxo: 'f13-grant-second' })), segundo, URL_AGIR, DEPS)
    expect(frames(segundo).some((evento) => evento.type === 'approval')).toBe(false)
    await expect(readFile(path.join(raiz, segundoAlvo), 'utf8')).resolves.toBe('')
  })

  it('Allow all explícito omite approval individual e executa só dentro do workspace ativo', async () => {
    await registrarModo('agent')
    const permissao = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'allow-all' })), permissao, URL_PERMISSION, DEPS)
    expect(permissao.statusCode).toBe(200)

    const alvo = 'allow-all-command-fixture.txt'
    stubProvedor([SSE_COMANDO(`touch ${alvo}`), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, messages: [{ role: 'user', content: 'use um comando seguro' }], fluxo: 'f13-allow-all' })), res, URL_AGIR, DEPS)
    await fio

    expect(frames(res).some((evento) => evento.type === 'approval')).toBe(false)
    expect(frames(res).some((evento) => evento.type === 'tool_result' && evento.ok === true)).toBe(true)
    await expect(readFile(path.join(raiz, alvo), 'utf8')).resolves.toBe('')
  })

  it('revogar Allow all para Manual cancela a execução one-shot em curso', async () => {
    await registrarModo('agent')
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'allow-all' })), fakeRes(), URL_PERMISSION, DEPS)
    const alvo = 'f13-revoked-must-not-exist.txt'
    stubProvedor([SSE_COMANDO(`sleep 0.3; printf 'iniciado'; sleep 2; touch ${alvo}`), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, messages: [{ role: 'user', content: 'execute a fixture' }], fluxo: 'f13-revoke-active' })), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"tool_progress"')

    const revogar = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ ...identidadeConversa, permission: 'manual' })), revogar, URL_PERMISSION, DEPS)
    expect(revogar.statusCode).toBe(200)
    await fio
    await expect(readFile(path.join(raiz, alvo), 'utf8')).rejects.toThrow()
  })
})

const SSE_EXCLUIR = (arquivo: string, id = 'x1'): string =>
  `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id, function: { name: 'excluir', arguments: JSON.stringify({ caminho: arquivo }) } }] } }] })}\n\n`

describe('F2 — excluir pede confirmação e move para a lixeira do SO (restaurado: DEBT-24/D128)', () => {
  // REGISTRO: este teste abençoava a REGRESSÃO. Ele afirmava `previa` com
  // "exclusão não está disponível" e `tool_result` com "Exclusão bloqueada"
  // porque `discos.ts` tinha um executor stub e `lixeira.ts` tinha o corpo
  // removido (`f850fc5`). Isso contradizia o E2E `excluir_fatia12.spec.ts`,
  // que sempre afirmou exclusão REAL, e feria D79 (teste não pode passar a
  // abençoar comportamento quebrado). Com a capacidade restaurada pela
  // MICRO-FATIA DELETE, as asserções voltam ao comportamento homologado em
  // D97 — a contradição se resolve pela restauração, não por máscara.
  it('previa mostra o alvo real; permitir move para a lixeira; a origem some e o conteúdo fica restaurável', async () => {
    const xdg = await mkdtemp(path.join(tmpdir(), 'agir-f2-xdg-'))
    const anterior = process.env.XDG_DATA_HOME
    process.env.XDG_DATA_HOME = xdg
    try {
      await writeFile(path.join(raiz, 'alvo-f2.txt'), 'fixture sanitizada', 'utf8')
      stubProvedor([SSE_EXCLUIR('alvo-f2.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
      const res = fakeRes()
      const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'apague o alvo-f2.txt' }], fluxo: 'fluxo-f2', workspace: 'raiz-real' })
      const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
      await esperaFio(res, '"type":"approval"')
      const cartao = frames(res).find((e) => e.type === 'approval') as Record<string, unknown>
      // RF12-6: o cartão apresenta O ALVO — nome, tamanho e começo do conteúdo.
      expect(String(cartao.previa)).toContain(`Arquivo "${path.join(raiz, 'alvo-f2.txt')}"`)
      expect(String(cartao.previa)).toContain('fixture sanitizada')
      const aprovar = fakeRes()
      expect(await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-f2', id: 'x1', decisao: 'permitir' })), aprovar, URL_APROVAR, DEPS)).toBe(true)
      expect(aprovar.statusCode).toBe(200)
      await fio
      const resultado = frames(res).find((e) => e.type === 'tool_result') as Record<string, unknown>
      expect(resultado).toMatchObject({ ok: true })
      expect(String(resultado.resumo)).toContain('movido para a lixeira')
      expect(String(resultado.resumo)).toContain('lixeira do sistema')
      // Some da origem (o resultado é comunicado ao agente E aconteceu de fato).
      await expect(readFile(path.join(raiz, 'alvo-f2.txt'), 'utf8')).rejects.toThrow()
      // RNF12-1: foi para a LIXEIRA, inteiro, com bilhete de restauração.
      expect(await readFile(path.join(xdg, 'Trash', 'files', 'alvo-f2.txt'), 'utf8')).toBe('fixture sanitizada')
      const bilhete = await readFile(path.join(xdg, 'Trash', 'info', 'alvo-f2.txt.trashinfo'), 'utf8')
      expect(bilhete).toContain('[Trash Info]')
      expect(bilhete).toMatch(/DeletionDate=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    } finally {
      if (anterior === undefined) delete process.env.XDG_DATA_HOME
      else process.env.XDG_DATA_HOME = anterior
      await rm(xdg, { recursive: true, force: true })
    }
  })

  it('recusa do dono: nada é lido, movido ou removido (RF12-3)', async () => {
    const xdg = await mkdtemp(path.join(tmpdir(), 'agir-f2-negar-'))
    const anterior = process.env.XDG_DATA_HOME
    process.env.XDG_DATA_HOME = xdg
    try {
      await writeFile(path.join(raiz, 'alvo-f2-negado.txt'), 'fiquei', 'utf8')
      stubProvedor([SSE_EXCLUIR('alvo-f2-negado.txt', 'x1n'), SSE_TOOL_DEPOIS_DE_RESULTADO])
      const res = fakeRes()
      const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'apague o alvo-f2-negado.txt' }], fluxo: 'fluxo-f2-negar', workspace: 'raiz-real' })
      const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
      await esperaFio(res, '"type":"approval"')
      await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-f2-negar', id: 'x1n', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
      await fio
      const resultado = frames(res).find((e) => e.type === 'tool_result') as Record<string, unknown>
      expect(resultado).toMatchObject({ ok: false })
      expect(String(resultado.resumo)).toContain('dono negou')
      expect(String(resultado.resumo)).toContain('nada sumiu')
      expect(await readFile(path.join(raiz, 'alvo-f2-negado.txt'), 'utf8')).toBe('fiquei')
      await expect(readFile(path.join(xdg, 'Trash', 'files', 'alvo-f2-negado.txt'), 'utf8')).rejects.toThrow()
    } finally {
      if (anterior === undefined) delete process.env.XDG_DATA_HOME
      else process.env.XDG_DATA_HOME = anterior
      await rm(xdg, { recursive: true, force: true })
    }
  })

  it('"Permitir na Sessão" para excluir → 400 honesto, e o fio continua esperando (RF12-3)', async () => {
    await writeFile(path.join(raiz, 'alvo-12b.txt'), 'b', 'utf8')
    stubProvedor([SSE_EXCLUIR('alvo-12b.txt', 'x2'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'apague o alvo-12b.txt' }], fluxo: 'fluxo-12b', workspace: 'raiz-real' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const tentativa = fakeRes()
    expect(await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-12b', id: 'x2', decisao: 'sessao', ferramenta: 'excluir' })), tentativa, URL_APROVAR, DEPS)).toBe(true)
    expect(tentativa.statusCode).toBe(400)
    expect(JSON.parse(tentativa.corpo()).message).toContain('sempre pergunta')
    // o fio segue pendente: negar termina limpo e nada some
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-12b', id: 'x2', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    const resultado = frames(res).find((e) => e.type === 'tool_result') as Record<string, unknown>
    expect(String(resultado.resumo)).toContain('dono negou')
    expect(String(resultado.resumo)).toContain('nada sumiu')
    expect(await readFile(path.join(raiz, 'alvo-12b.txt'), 'utf8')).toBe('b')
  })

  it("permissoes:['excluir'] no pedido NÃO auto-libera — o cartão aparece igual (RF12-3)", async () => {
    await writeFile(path.join(raiz, 'alvo-12c.txt'), 'c', 'utf8')
    stubProvedor([SSE_EXCLUIR('alvo-12c.txt', 'x3'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'apague o alvo-12c.txt' }], fluxo: 'fluxo-12c', workspace: 'raiz-real', permissoes: ['excluir'] })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"') // perguntou mesmo com "sessão liberada"
    expect(frames(res).some((e) => e.type === 'approval')).toBe(true)
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-12c', id: 'x3', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    expect(await readFile(path.join(raiz, 'alvo-12c.txt'), 'utf8')).toBe('c')
  })
})

describe('F3 — cancelamento terminal e claims de geração', () => {
  it('Parar aguarda mutação já iniciada e não confirma antes da publicação', async () => {
    await registrarModo('agent')
    stubProvedor([SSE_TOOL.replace('ola.txt', 'f3-cancel-race.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    let avisarInicio!: () => void
    let liberarCommit!: () => void
    const inicio = new Promise<void>((resolve) => { avisarInicio = resolve })
    const barreiraCommit = new Promise<void>((resolve) => { liberarCommit = resolve })
    const deps = {
      ...DEPS,
      criarExecutores: (raizExecucao: string): ExecutoresDisco => {
        const base = criarExecutoresReais(raizExecucao)
        return {
          ...base,
          criar: async (pedido) => {
            avisarInicio()
            await barreiraCommit
            return base.criar(pedido)
          },
        }
      },
    }
    const res = fakeRes()
    const fluxo = 'f3-cancel-race'
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ messages: [{ role: 'user', content: 'crie arquivo' }], fluxo })), res, URL_AGIR, deps)
    await inicio

    const cancelRes = fakeRes()
    const cancelBody = JSON.stringify({ fluxo, sessionId: 'sessao-1', chatId: 'chat-1', ...identity(res) })
    const cancelRequest = tratarRotasAgir(fakeReq(cancelBody), cancelRes, URL_CANCEL, deps)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(cancelRes.ended).toBe(false)
    await expect(readFile(path.join(raiz, 'f3-cancel-race.txt'), 'utf8')).rejects.toThrow()

    liberarCommit()
    await cancelRequest
    await fio
    expect(JSON.parse(cancelRes.corpo())).toMatchObject({ status: 'cancelled_with_effects' })
    await expect(readFile(path.join(raiz, 'f3-cancel-race.txt'), 'utf8')).resolves.toBe('oi')
    expect(frames(res).some((evento) => evento.type === 'tool_result' && evento.ok === true)).toBe(true)
  })

  it('Parar durante approval invalida o cartão; approval tardio não executa', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'crie ola.txt' }], fluxo: 'f3-cancel-aproval' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const id = identity(res)
    expect(id.runId).toBeTruthy()
    expect(id.generation).toBe(1)

    const cancelRes = fakeRes()
    const cancelBody = JSON.stringify({ fluxo: 'f3-cancel-aproval', sessionId: 'sessao-1', chatId: 'chat-1', ...id })
    await tratarRotasAgir(fakeReq(cancelBody), cancelRes, URL_CANCEL, DEPS)
    expect(cancelRes.statusCode).toBe(200)
    expect(JSON.parse(cancelRes.corpo())).toMatchObject({ status: 'cancelled', ...id })
    await fio

    const atraso = fakeRes()
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'f3-cancel-aproval', id: 'c1', decisao: 'permitir' })), atraso, URL_APROVAR, DEPS)
    expect(atraso.statusCode).toBe(409)
    expect(JSON.parse(atraso.corpo()).code).toBe('approval_expired')
    expect(frames(res).some((evento) => evento.type === 'tool_result')).toBe(false)
    await expect(readFile(path.join(raiz, 'ola.txt'), 'utf8')).rejects.toThrow()

    const repetido = fakeRes()
    await tratarRotasAgir(fakeReq(cancelBody), repetido, URL_CANCEL, DEPS)
    expect(JSON.parse(repetido.corpo())).toMatchObject({ status: 'already_terminal', ...id })
  })

  it('uma aprovação é consumida uma vez; duplicata não dispara outro efeito', async () => {
    stubProvedor([SSE_TOOL.replace('ola.txt', 'f3-uma-vez.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'crie f3-uma-vez.txt' }], fluxo: 'f3-approval-once' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const body = approvalBody(res, { fluxo: 'f3-approval-once', id: 'c1', decisao: 'permitir' })
    const primeira = fakeRes()
    await tratarRotasAgir(fakeReq(body), primeira, URL_APROVAR, DEPS)
    expect(primeira.statusCode).toBe(200)
    const duplicada = fakeRes()
    await tratarRotasAgir(fakeReq(body), duplicada, URL_APROVAR, DEPS)
    expect(duplicada.statusCode).toBe(409)
    await fio
    const resultados = frames(res).filter((evento) => evento.type === 'tool_result')
    expect(resultados).toHaveLength(1)
    expect(resultados[0]).toMatchObject({ type: 'tool_result', id: 'c1', ok: true })
    await expect(readFile(path.join(raiz, 'f3-uma-vez.txt'), 'utf8')).resolves.toBe('oi')
  })

  it('duas continuations concorrentes fazem claim único', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'busque txt' }], fluxo: 'f3-continue-once' })
    const pausa = fakeRes()
    await tratarRotasAgir(fakeReq(pedido), pausa, URL_AGIR, deps)
    expect(frames(pausa).at(-1)).toMatchObject({ type: 'teto' })

    const corpo = JSON.stringify({ fluxo: 'f3-continue-once', sessionId: 'sessao-1', chatId: 'chat-1' })
    const a = fakeRes()
    const b = fakeRes()
    const resultados = await Promise.all([
      tratarRotasAgir(fakeReq(corpo), a, URL_CONTINUAR, deps),
      tratarRotasAgir(fakeReq(corpo), b, URL_CONTINUAR, deps),
    ])
    expect(resultados).toEqual([true, true])
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409])
    const negada = a.statusCode === 409 ? a : b
    expect(JSON.parse(negada.corpo()).code).toBe('already_running')
  })
})

describe('F5-A — política de modo imposta pelo servidor', () => {
  it('o campo mode do pedido de execução não escolhe o modo efetivo', async () => {
    await registrarModo('ask')
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    // Payload adulterado pede Agent; o modo separado e registrado no servidor é Perguntar.
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'crie f5-modo-spoof.txt' }], fluxo: 'f5-mode-spoof' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"tool_result"')
    const eventos = frames(res)
    expect(eventos.some((evento) => evento.type === 'approval')).toBe(false)
    expect(String((eventos.find((evento) => evento.type === 'tool_result') as Record<string, unknown>).resumo)).toContain('somente leitura')
    await fio
    await expect(readFile(path.join(raiz, 'f5-modo-spoof.txt'), 'utf8')).rejects.toThrow()
  })

  it.each(['ask', 'plan'] as const)('%s bloqueia criação/escrita mesmo com tool-call', async (mode) => {
    await registrarModo(mode)
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'crie f5-modo.txt' }], fluxo: `f5-${mode}-write` })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"tool_result"')
    const eventos = frames(res)
    expect(eventos.some((evento) => evento.type === 'approval')).toBe(false)
    expect(String((eventos.find((evento) => evento.type === 'tool_result') as Record<string, unknown>).resumo)).toContain('somente leitura')
    await fio
    await expect(readFile(path.join(raiz, 'f5-modo.txt'), 'utf8')).rejects.toThrow()
  })

  it('Continuar preserva o snapshot Planejar da execução pausada', async () => {
    await registrarModo('plan')
    stubProvedor([SSE_BUSCAR, SSE_TOOL.replace('ola.txt', 'f5-continued.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pausa = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'pesquise e depois crie' }], fluxo: 'f5-plan-continue' })
    await tratarRotasAgir(fakeReq(pedido), pausa, URL_AGIR, deps)
    expect(frames(pausa).at(-1)).toMatchObject({ type: 'teto' })

    const continuação = fakeRes()
    const body = JSON.stringify({ fluxo: 'f5-plan-continue', sessionId: 'sessao-1', chatId: 'chat-1' })
    await tratarRotasAgir(fakeReq(body), continuação, URL_CONTINUAR, deps)
    const eventos = frames(continuação)
    expect(eventos.some((evento) => evento.type === 'approval')).toBe(false)
    expect(String((eventos.find((evento) => evento.type === 'tool_result') as Record<string, unknown>).resumo)).toContain('Bloqueado pelo modo Planejar')
    await expect(readFile(path.join(raiz, 'f5-continued.txt'), 'utf8')).rejects.toThrow()
  })

  it.each(['agent', 'edit'] as const)('%s não pede confirmação repetida para criar autorizado pelo modo', async (mode) => {
    await registrarModo(mode)
    stubProvedor([SSE_TOOL.replace('ola.txt', `f5-${mode}.txt`), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'ask', messages: [{ role: 'user', content: 'crie arquivo' }], fluxo: `f5-${mode}-no-prompt` })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"done"')
    await fio
    expect(frames(res).some((evento) => evento.type === 'approval')).toBe(false)
    await expect(readFile(path.join(raiz, `f5-${mode}.txt`), 'utf8')).resolves.toBe('oi')
  })

  it.each(['agent', 'edit'] as const)('%s não pede confirmação repetida para escrever após leitura', async (mode) => {
    await registrarModo(mode)
    await writeFile(path.join(raiz, 'f5-edit.txt'), 'antes', 'utf8')
    stubProvedor([SSE_LER_F5, SSE_ESCREVER_F5, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'ask', messages: [{ role: 'user', content: 'leia e edite o arquivo' }], fluxo: `f5-${mode}-edit-no-prompt` })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"done"')
    await fio
    const eventos = frames(res)
    expect(eventos.some((evento) => evento.type === 'approval')).toBe(false)
    expect(eventos.filter((evento) => evento.type === 'tool_result' && evento.ok === true)).toHaveLength(2)
    await expect(readFile(path.join(raiz, 'f5-edit.txt'), 'utf8')).resolves.toBe('depois')
  })
})


describe('DELETE — reconfirmação e cancelamento com disco isolado', () => {
  it('exceção inesperada depois de efeito em executor iniciado mantém ACK conservador', async()=>{
    const origem=path.join(raiz,'excecao-cancelar.txt'),destino=origem+'.movido';await writeFile(origem,'PRESERVADO')
    let avisar!:()=>void,liberar!:()=>void
    const inicio=new Promise<void>(r=>{avisar=r}),barreira=new Promise<void>(r=>{liberar=r})
    const deps={...DEPS,criarExecutores:(r:string)=>({...DEPS.criarExecutores(r),excluir:async()=>{avisar();await barreira;await rename(origem,destino);throw new Error('falha inesperada depois do efeito')}})}
    stubProvedor([SSE_EXCLUIR(origem)])
    const fluxo='excecao-cancelar',res=fakeRes()
    const fio=tratarRotasAgir(fakeReq(JSON.stringify({fluxo,messages:[{role:'user',content:'teste controlado'}]})),res,URL_AGIR,deps)
    await esperaFio(res,'"type":"approval"')
    await tratarRotasAgir(fakeReq(approvalBody(res,{fluxo,id:'x1',decisao:'permitir'})),fakeRes(),URL_APROVAR,deps)
    await inicio
    const ack=fakeRes(),cancelar=tratarRotasAgir(fakeReq(approvalBody(res,{fluxo})),ack,URL_CANCEL,deps)
    liberar();await cancelar;await fio
    expect(JSON.parse(ack.corpo())).toMatchObject({status:'cancelled_with_effects'})
    expect(await readFile(destino,'utf8')).toBe('PRESERVADO')
    expect(frames(res)).toContainEqual(expect.objectContaining({type:'tool_result',ok:false,efeitoIniciado:true}))
  })
  it('trocar o alvo abre outro cartão e aprovação antiga não autoriza o substituto', async () => {
    const nome = 'reconfirmar.txt'
    const origem = path.join(raiz, nome)
    const trash = path.join(raiz, 'trash-reconfirmar')
    const deps = { ...DEPS, criarExecutores: (r: string) => criarExecutoresReais(r, { plataforma: 'linux', pastaTrash: trash }) }
    await writeFile(origem, 'VERSAO-A')
    stubProvedor([SSE_EXCLUIR(nome), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fluxo = 'delete-reconfirmar'
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ messages: [{ role: 'user', content: 'excluir' }], fluxo })), res, URL_AGIR, deps)
    await esperaFio(res, '"type":"approval"')
    expect(res.corpo()).toContain('VERSAO-A')
    await rename(origem, origem + '.original')
    await writeFile(origem, 'VERSAO-B')
    const antigo = approvalBody(res, { fluxo, id: 'x1', decisao: 'permitir' })
    await tratarRotasAgir(fakeReq(antigo), fakeRes(), URL_APROVAR, deps)
    // Esperar o segundo approval, não só o anúncio do novo cartão.
    for (let n = 0; n < 100 && frames(res).filter((e) => e.type === 'approval').length < 2; n++) await new Promise((resolve) => setTimeout(resolve, 10))
    const cartoes = frames(res).filter((e) => e.type === 'approval')
    expect(cartoes).toHaveLength(2)
    const novoPedido = cartoes[1].pedido as { id: string }
    expect(novoPedido.id).not.toBe('x1')
    expect(String(cartoes[1].previa)).toContain('VERSAO-B')
    expect(await readFile(origem, 'utf8')).toBe('VERSAO-B')
    const duplicado = fakeRes()
    await tratarRotasAgir(fakeReq(antigo), duplicado, URL_APROVAR, deps)
    expect(duplicado.statusCode).toBe(409)
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo, id: novoPedido.id, decisao: 'permitir' })), fakeRes(), URL_APROVAR, deps)
    await fio
    expect(await readFile(path.join(trash, 'files', nome), 'utf8')).toBe('VERSAO-B')
    expect(await readFile(origem + '.original', 'utf8')).toBe('VERSAO-A')
    expect(frames(res).filter((e) => e.type === 'tool_result').at(-1)).toMatchObject({ id: novoPedido.id, ok: true })
  })

  it.each(['movido', 'recusado', 'parcial'] as const)('Parar aguarda excluir em andamento e distingue %s', async (desfecho) => {
    const nome = 'cancel-delete-' + desfecho + '.txt'
    const origem = path.join(raiz, nome)
    const trash = path.join(raiz, 'trash-cancel-' + desfecho)
    await writeFile(origem, 'CONTEUDO')
    let avisar!: () => void
    let liberar!: () => void
    const inicio = new Promise<void>((resolve) => { avisar = resolve })
    const barreira = new Promise<void>((resolve) => { liberar = resolve })
    const deps = { ...DEPS, criarExecutores: (r: string) => criarExecutoresReais(r, {
      plataforma: 'linux', pastaTrash: trash,
      operacoes: {
        rename: async (a, b) => {
          avisar()
          await barreira
          if (desfecho === 'recusado') throw Object.assign(new Error('sem permissão'), { code: 'EPERM' })
          await rename(a, b)
        },
        ...(desfecho === 'parcial' ? { lstat: async () => { throw new Error('falha de conferência') } } : {}),
      },
    }) }
    stubProvedor([SSE_EXCLUIR(nome), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fluxo = 'cancel-delete-' + desfecho
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({ messages: [{ role: 'user', content: 'excluir' }], fluxo })), res, URL_AGIR, deps)
    await esperaFio(res, '"type":"approval"')
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo, id: 'x1', decisao: 'permitir' })), fakeRes(), URL_APROVAR, deps)
    await inicio
    const cancelRes = fakeRes()
    const cancel = tratarRotasAgir(fakeReq(approvalBody(res, { fluxo })), cancelRes, URL_CANCEL, deps)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(cancelRes.ended).toBe(false)
    liberar()
    await cancel
    await fio
    expect(JSON.parse(cancelRes.corpo()).status).toBe(desfecho === 'recusado' ? 'cancelled' : 'cancelled_with_effects')
    const resultado = frames(res).find((e) => e.type === 'tool_result')
    expect(resultado).toMatchObject({ ok: desfecho === 'movido' })
    if (desfecho === 'recusado') expect(await readFile(origem, 'utf8')).toBe('CONTEUDO')
    else {
      expect(await readFile(path.join(trash, 'files', nome), 'utf8')).toBe('CONTEUDO')
      await expect(readFile(origem)).rejects.toThrow()
      if (desfecho === 'parcial') expect(resultado).toMatchObject({ efeitoIniciado: true })
    }
  })
})
