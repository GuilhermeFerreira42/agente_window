// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { Session } from '../../../types'
import { deleteSessionRecord, upsertSessionRecord, type SessionRecord } from '../database'
import { chaveProjetoHistorico, digestChat, invalidarOrigensForaDaRaiz, listarOrigensConsultaveis, origemChat, prepararOrigens, publicarCatalogoComOrigens, textoHistoricoSeguro } from '../origensChats'
import type { TranscriptEntry } from '../transcripts'
const ids: string[] = []
const suite = process.env.AGENTE_WINDOW_TEST_HOME ? describe : describe.skip
function fixture(texto = '') {
  const id = `mc1-origin-${randomUUID()}`; ids.push(id)
  const session = { id, title: 'Investigação de plugins', workspacePath: '/synthetic/A', mainChatId: 'main', chats: [{ id: 'main', title: 'Main', messages: texto ? [{ id: 'm1', role: 'user', content: texto }] : [] }] } as Session
  const entries = (s: Session): TranscriptEntry[] => s.chats[0].messages.map(m => ({ chatId: 'main', uuid: m.id, type: m.role, timestamp: 1, message: m }))
  const record = (s: Session): SessionRecord => ({ id, slug: id, title: s.title, workspacePath: s.workspacePath, worktreePath: null, messageCount: s.chats[0].messages.length, createdAt: 1, updatedAt: 1, sessionJson: JSON.stringify(s) })
  const publish = (s: Session, anterior?: Session, antigos: TranscriptEntry[] = [], raiz = s.workspacePath) => {
    const plans = prepararOrigens(s, anterior, antigos, raiz, raiz)
    publicarCatalogoComOrigens(record(s), plans, entries(s))
    return origemChat(id, 'main')!
  }
  return { id, session, entries, record, publish }
}
suite('MC1 proveniência durável e falhas de publicação', () => {
  afterAll(() => { for (const id of ids) deleteSessionRecord(id) })
  it('registra origem no servidor, mantém epoch/digest e exclui chat atual da busca', () => {
    const f = fixture('Decidimos usar SQLite.'), first = f.publish(f.session)
    expect(first).toMatchObject({ state: 'verified', projectKey: chaveProjetoHistorico('/synthetic/A') })
    expect(first.digest).toBe(digestChat(f.entries(f.session), 'main'))
    const again = f.publish(f.session, f.session, f.entries(f.session))
    expect(again.epoch).toBe(first.epoch)
    expect(listarOrigensConsultaveis(first.projectKey!, f.session.title, { sessionId: f.id, chatId: 'main' }).rows).toEqual([])
    expect(listarOrigensConsultaveis(first.projectKey!, f.session.title, { sessionId: 'outro', chatId: 'main' }).rows.map(r => r.sessionId)).toContain(f.id)
  })
  it('não atribui origem retroativa a legado com conteúdo', () => {
    const f = fixture('Canário legado.'), antigo = f.entries(f.session)
    upsertSessionRecord(f.record(f.session))
    expect(f.publish(f.session, f.session, antigo).state).toBe('unverifiable')
  })
  it('revinculação A→B→A não reativa a história nem transfere canários', () => {
    const f = fixture('Canário de A.'); f.publish(f.session)
    invalidarOrigensForaDaRaiz(f.id, '/synthetic/B')
    expect(origemChat(f.id, 'main')?.state).toBe('unverifiable')
    f.publish(f.session, f.session, f.entries(f.session))
    expect(origemChat(f.id, 'main')?.state).toBe('unverifiable')
    expect(listarOrigensConsultaveis(chaveProjetoHistorico('/synthetic/B'), f.session.title, { sessionId: 'b', chatId: 'main' }).rows).toEqual([])
  })
  it('quarentena de empty após falha JSONL→SQLite impede promoção de A em B', () => {
    const f = fixture(); f.publish(f.session)
    const comTexto = { ...f.session, chats: [{ ...f.session.chats[0], messages: [{ id: 'm1', role: 'user' as const, time: '10:00', content: 'Conteúdo A que chegou ao JSONL.' }] }] }
    prepararOrigens(comTexto, f.session, [], '/synthetic/A') // publication fails: SQLite remains empty, JSONL has the new entries
    invalidarOrigensForaDaRaiz(f.id, '/synthetic/B')
    const nova = { ...comTexto, workspacePath: '/synthetic/B' }
    expect(f.publish(nova, comTexto, f.entries(comTexto), '/synthetic/B').state).toBe('unverifiable')
  })
  it('estado empty conhecido recebe conteúdo futuro no projeto validado', () => {
    const f = fixture(), empty = f.publish(f.session)
    expect(empty.state).toBe('empty')
    const comTexto = { ...f.session, chats: [{ ...f.session.chats[0], messages: [{ id: 'm1', role: 'user' as const, time: '10:00', content: 'Nova mensagem.' }] }] }
    expect(f.publish(comTexto, f.session).state).toBe('verified')
  })
  it('exclusão/recriação com mesmos IDs troca incarnação', () => {
    const f = fixture('Texto'), anterior = f.publish(f.session)
    deleteSessionRecord(f.id)
    expect(origemChat(f.id, 'main')).toBeUndefined()
    expect(f.publish(f.session).epoch).not.toBe(anterior.epoch)
  })
  it('filtra credenciais em títulos e distingue termos técnicos inofensivos', () => {
    for (const texto of ['senha=secreto', `nvapi-${'a'.repeat(40)}`, `AIza${'a'.repeat(32)}`, 'Bearer abcdefghijkl']) expect(textoHistoricoSeguro(texto)).toBe(false)
    expect(textoHistoricoSeguro('Como implementar tokenização e API keys sem persistir segredos')).toBe(true)
    const f = fixture('Texto'); f.session.title = `nvapi-${'b'.repeat(40)}`
    expect(f.publish(f.session).title).toBe('')
  })
})
