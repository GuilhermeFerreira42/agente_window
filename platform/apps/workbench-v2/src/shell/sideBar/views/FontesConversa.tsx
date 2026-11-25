import { useEffect, useState } from 'react'
import { listarAnexos, type AnexoSeguroCliente } from '../../../services/sessions/anexosClient'
import { baixarArtefato } from '../../../services/sessions/artefatosMediaClient'
import type { ChatMessage } from '../../../types'

/** Fontes são resolvidas pelo catálogo escopado; dados de uma resposta tardia nunca mudam de dono. */
export function FontesConversa({ sessionId, chatId, mensagens }: { sessionId: string; chatId: string; mensagens: readonly ChatMessage[] }) {
  const [estado, setEstado] = useState<{ chave: string; itens: AnexoSeguroCliente[]; erro?: string }>({ chave: '', itens: [] })
  const chave = `${sessionId}:${chatId}`
  const listaIds = JSON.stringify(mensagens.flatMap(m => [
    ...(m.role === 'user' ? (m.attachments ?? []).map(a => a.artifactId).filter(Boolean) : []),
    ...(m.ferramentas ?? []).filter(f => f.ferramenta === 'anexos' && f.status === 'ok').map(f => f.id),
  ]))
  useEffect(() => {
    let ativo = true
    void listarAnexos(sessionId, chatId).then(lista => {
      if (ativo) setEstado({ chave, itens: lista.attachments })
    }).catch(() => { if (ativo) setEstado({ chave, itens: [], erro: 'Não foi possível carregar os anexos desta conversa.' }) })
    return () => { ativo = false }
  }, [sessionId, chatId, chave, listaIds])
  const itens = estado.chave === chave ? estado.itens.filter(item => item.origem === 'entrada') : []
  return <section className="fontes-conversa" aria-label="Fontes">
    <h3>Fontes</h3>
    {estado.chave === chave && estado.erro && <p role="status">{estado.erro}</p>}
    {itens.length === 0 ? <p>Nenhum anexo nesta conversa.</p> : <ul>{itens.map(item => <li key={item.artifactId}>
        <span title={item.name}>{item.name}</span>
        {item.presente ? <button type="button" aria-label={`Baixar ${item.name}`} onClick={() => { void baixarArtefato(sessionId, chatId, item.artifactId, item.name).catch(() => setEstado(prev => ({ ...prev, erro: 'Não foi possível baixar este anexo.' }))) }}>Baixar</button> : <small>Indisponível</small>}
      </li>)}</ul>}
  </section>
}
