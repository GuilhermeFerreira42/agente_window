// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../../types'
import { deleteSessionRecord, upsertSessionRecord, type SessionRecord } from '../database'
import { confirmarAcessoHistorico, prepararAcessoHistorico } from '../acessoHistorico'
import { chaveProjetoHistorico, consentimentoHistorico, haOrigemInverificavel, invalidarOrigensForaDaRaiz, listarOrigensConsultaveis,
  origemChat, origemConsultavel, prepararOrigens, publicarCatalogoComOrigens } from '../origensChats'
import { deleteTranscript, readTranscript, writeTranscript, type TranscriptEntry } from '../transcripts'
const suite = process.env.AGENTE_WINDOW_TEST_HOME ? describe : describe.skip
const destinos: Array<{ id: string; raiz: string }> = []
const serializar = async <T>(_id: string, fn: () => Promise<T>) => fn()
async function fixture(raizExistente?: string, legacy = true) {
  const raiz = raizExistente ?? await mkdtemp(join(tmpdir(), 'mc1-consent-')), id = `consent-${randomUUID()}`
  destinos.push({ id, raiz })
  const session = { id, title: 'Nome anterior', workspacePath: raiz, mainChatId: 'main', chats: [{ id: 'main', title: 'Main', messages: [{ id: 'mensagem', role: 'user', time: '10:00', content: 'Decisão SQLite preservada.' }] }] } as Session
  const entries: TranscriptEntry[] = [{ chatId: 'main', uuid: 'mensagem', timestamp: 1, type: 'user', message: session.chats[0].messages[0] }]
  const record = (s = session): SessionRecord => ({ id, slug: id, title: s.title, workspacePath: s.workspacePath, worktreePath: null, createdAt: 1, updatedAt: 1, messageCount: 1, sessionJson: JSON.stringify({ ...s, chats: s.chats.map(c => ({ ...c, messages: [] })) }) })
  if (legacy) upsertSessionRecord(record())
  publicarCatalogoComOrigens(record(), prepararOrigens(session, legacy ? session : undefined, legacy ? entries : [], raiz), entries)
  await writeTranscript(id, id, entries)
  const prepare = () => prepararAcessoHistorico(id, 'main', serializar)
  return { id, raiz, session, entries, record, prepare }
}
afterEach(async () => {
  vi.useRealTimers()
  for (const { id } of destinos) { await deleteTranscript(id, id); deleteSessionRecord(id) }
  for (const raiz of new Set(destinos.map(d => d.raiz))) await rm(raiz, { recursive: true, force: true })
  destinos.length = 0
})
suite('MC1 consentimento explícito de um chat legado', () => {
  it('renomear preserva origem verificada/epoch/digest; título com ou sem acento é encontrado', async () => {
    const f = await fixture(undefined, false), antes = origemChat(f.id, 'main')!
    const nova = { ...f.session, title: 'memoria' }
    publicarCatalogoComOrigens(f.record(nova), prepararOrigens(nova, f.session, f.entries, f.raiz), f.entries)
    expect(origemChat(f.id, 'main')).toMatchObject({ state: 'verified', epoch: antes.epoch, digest: antes.digest, rootIdentity: antes.rootIdentity, title: 'memoria' })
    expect((await f.prepare()).status).toBe('observed')
    const resultado = listarOrigensConsultaveis(chaveProjetoHistorico(f.raiz), 'memória', { sessionId: 'requester', chatId: 'main' })
    expect(resultado.titulo).toBe(true); expect(resultado.rows.map(r => r.sessionId)).toContain(f.id)
    expect(await readTranscript(f.id, f.id)).toEqual(f.entries)
  })
  it('renomear legado não inventa origem; confirmação libera somente o alvo sem tocar transcript', async () => {
    const f = await fixture(), outro = await fixture(f.raiz), antes = origemChat(f.id, 'main')!
    const nova = { ...f.session, title: 'memoria' }
    publicarCatalogoComOrigens(f.record(nova), prepararOrigens(nova, f.session, f.entries, f.raiz), f.entries)
    expect(origemConsultavel(f.id, 'main')?.state).toBe('unverifiable')
    const preparacao = await f.prepare()
    expect(preparacao).toMatchObject({ status: 'needs_consent', title: 'memoria', project: f.raiz })
    expect(origemConsultavel(f.id, 'main')?.state).toBe('unverifiable')
    expect(await confirmarAcessoHistorico(preparacao.token!, serializar)).toEqual({ autorizado: true })
    expect(origemChat(f.id, 'main')).toMatchObject({ state: 'unverifiable', epoch: antes.epoch, digest: antes.digest })
    expect(origemConsultavel(f.id, 'main')).toMatchObject({ state: 'verified', epoch: antes.epoch, consentId: expect.any(String) })
    const consentId = origemConsultavel(f.id, 'main')!.consentId, renomeada = { ...nova, title: 'memoria atualizada' }
    publicarCatalogoComOrigens(f.record(renomeada), prepararOrigens(renomeada, nova, f.entries, f.raiz), f.entries)
    expect(origemConsultavel(f.id, 'main')).toMatchObject({ state: 'verified', epoch: antes.epoch, consentId, title: 'memoria atualizada' })
    expect(origemConsultavel(outro.id, 'main')?.state).toBe('unverifiable')
    expect(await readTranscript(f.id, f.id)).toEqual(f.entries)
    await expect(confirmarAcessoHistorico(preparacao.token!, serializar)).rejects.toThrow()
    await expect(confirmarAcessoHistorico('inventado', serializar)).rejects.toThrow()
  })
  it('revogar e conceder de novo cria outra autoridade; legado consentido não simula falta de vínculo', async () => {
    const f = await fixture(), ctx = { sessionId: 'requester', chatId: 'main' }
    expect(haOrigemInverificavel(f.raiz, ctx)).toBe(true)
    await confirmarAcessoHistorico((await f.prepare()).token!, serializar)
    const anterior = origemConsultavel(f.id, 'main')!.consentId
    expect(haOrigemInverificavel(f.raiz, ctx)).toBe(false)
    expect((await f.prepare()).status).toBe('consented')
    expect(await confirmarAcessoHistorico((await f.prepare()).token!, serializar)).toEqual({ autorizado: false })
    expect(origemConsultavel(f.id, 'main')?.state).toBe('unverifiable')
    await confirmarAcessoHistorico((await f.prepare()).token!, serializar)
    expect(origemConsultavel(f.id, 'main')!.consentId).not.toBe(anterior)
  })
  it('autorização preparada antes de grant→revogação não reautoriza por token antigo', async () => {
    const f = await fixture(), a = await f.prepare(), b = await f.prepare()
    await confirmarAcessoHistorico(a.token!, serializar)
    const revogar = await f.prepare(), revogarAntigo = await f.prepare()
    await confirmarAcessoHistorico(revogar.token!, serializar)
    await expect(confirmarAcessoHistorico(b.token!, serializar)).rejects.toThrow()
    await confirmarAcessoHistorico((await f.prepare()).token!, serializar)
    await expect(confirmarAcessoHistorico(revogarAntigo.token!, serializar)).rejects.toThrow()
    expect(origemConsultavel(f.id, 'main')?.state).toBe('verified')
  })
  it('tokens concorrentes só permitem um vencedor; receipt expirado não muda autoridade', async () => {
    const f = await fixture(), a = await f.prepare(), b = await f.prepare()
    const resultados = await Promise.allSettled([confirmarAcessoHistorico(a.token!, serializar), confirmarAcessoHistorico(b.token!, serializar)])
    expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const revogar = await f.prepare(); vi.useFakeTimers(); vi.setSystemTime(Date.now() + 6 * 60_000)
    await expect(confirmarAcessoHistorico(revogar.token!, serializar)).rejects.toThrow()
    expect(origemConsultavel(f.id, 'main')?.state).toBe('verified')
  })
  it('mudança de raiz revoga e voltar não reativa; receipt de outra raiz não confirma', async () => {
    const f = await fixture(), antes = await f.prepare(), novaRaiz = await mkdtemp(join(tmpdir(), 'mc1-consent-B-'))
    destinos.push({ id: f.id, raiz: novaRaiz })
    invalidarOrigensForaDaRaiz(f.id, novaRaiz)
    upsertSessionRecord(f.record({ ...f.session, workspacePath: novaRaiz }))
    await expect(confirmarAcessoHistorico(antes.token!, serializar)).rejects.toThrow()
    upsertSessionRecord(f.record()); await confirmarAcessoHistorico((await f.prepare()).token!, serializar)
    invalidarOrigensForaDaRaiz(f.id, novaRaiz); invalidarOrigensForaDaRaiz(f.id, f.raiz)
    expect(origemConsultavel(f.id, 'main')?.state).toBe('unverifiable')
  })
  it('arquivo alterado ou sessão recriada invalida confirmação; exclusão remove consentimentos', async () => {
    const f = await fixture(), antes = await f.prepare()
    await writeTranscript(f.id, f.id, [...f.entries, { ...f.entries[0], uuid: 'outra' }])
    await expect(confirmarAcessoHistorico(antes.token!, serializar)).rejects.toThrow()
    expect(origemConsultavel(f.id, 'main')?.state).toBe('unverifiable')
    await writeTranscript(f.id, f.id, f.entries); const receipt = await f.prepare(), oldEpoch = origemChat(f.id, 'main')!.epoch
    deleteSessionRecord(f.id)
    publicarCatalogoComOrigens(f.record(), prepararOrigens(f.session, undefined, [], f.raiz), f.entries)
    await expect(confirmarAcessoHistorico(receipt.token!, serializar)).rejects.toThrow()
    expect(consentimentoHistorico(f.id, 'main', oldEpoch)).toBeUndefined()
  })
  it('preparação não anuncia origem observada se o catálogo foi movido sem invalidar a raiz', async () => {
    const f = await fixture(undefined, false), outra = await mkdtemp(join(tmpdir(), 'mc1-consent-B-'))
    destinos.push({ id: f.id, raiz: outra })
    upsertSessionRecord(f.record({ ...f.session, workspacePath: outra }))
    await expect(f.prepare()).rejects.toThrow('não corresponde ao projeto atual')
    expect(origemChat(f.id, 'main')?.state).toBe('unverifiable')
    expect(consentimentoHistorico(f.id, 'main', origemChat(f.id, 'main')!.epoch)).toBeUndefined()
  })
})
