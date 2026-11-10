import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LIMITE_CONSULTA_TRANSCRIPT, type BuscaTranscriptResult } from '../domain/buscaTranscript'

export function BuscaHistorico({ sessionId, chatId, abrir }: {
  sessionId: string; chatId: string; abrir: (id: string) => boolean
}) {
  const [aberta, setAberta] = useState(false)
  const [query, setQuery] = useState('')
  const [resultado, setResultado] = useState<BuscaTranscriptResult>()
  const [erro, setErro] = useState<string>()
  const [ocupada, setOcupada] = useState(false)
  const pedido = useRef<AbortController | null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  useEffect(() => () => pedido.current?.abort(), [])
  useEffect(() => { if (aberta) campo.current?.focus() }, [aberta])

  function fechar() {
    pedido.current?.abort()
    pedido.current = null
    setOcupada(false)
    setAberta(false)
    botao.current?.focus()
  }

  async function buscar(evento: FormEvent) {
    evento.preventDefault()
    const texto = query.trim()
    if (!texto) return
    pedido.current?.abort()
    const controle = new AbortController()
    pedido.current = controle
    setOcupada(true)
    setErro(undefined)
    setResultado(undefined)
    try {
      const resposta = await fetch('/api/sessions/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controle.signal,
        body: JSON.stringify({ sessionId, chatId, query: texto }),
      })
      const corpo = await resposta.json() as BuscaTranscriptResult & { message?: string }
      if (controle.signal.aborted) return
      if (!resposta.ok) setErro(corpo.message ?? 'A busca no histórico falhou.')
      else setResultado(corpo)
    } catch {
      if (!controle.signal.aborted) setErro('Não foi possível consultar o histórico.')
    } finally {
      if (pedido.current === controle) {
        pedido.current = null
        setOcupada(false)
      }
    }
  }

  return <div className="chat-history-search" onKeyDown={(event) => { if (event.key === 'Escape' && aberta) { event.stopPropagation(); fechar() } }}>
    <button ref={botao} className="toolbar-button" type="button" title="Buscar no histórico" aria-label="Buscar no histórico"
      aria-expanded={aberta} onClick={() => aberta ? fechar() : setAberta(true)}><Search size={14} /></button>
    {aberta && <div className="popover chat-history-search-panel" role="region" aria-label="Busca no histórico do chat">
      <form className="chat-history-search-form" onSubmit={(event) => void buscar(event)}>
        <input ref={campo} className="popover-search" type="search" aria-label="Termo no histórico" value={query}
          maxLength={LIMITE_CONSULTA_TRANSCRIPT} onChange={(event) => setQuery(event.target.value)} />
        <button className="toolbar-button" type="submit" aria-label="Pesquisar mensagens" disabled={!query.trim() || ocupada}><Search size={14} /></button>
        <button className="toolbar-button" type="button" aria-label="Fechar busca no histórico" onClick={fechar}><X size={14} /></button>
      </form>
      {erro && <span role="alert">{erro}</span>}
      {ocupada && <span role="status">Buscando…</span>}
      {resultado && <span role="status">{resultado.hits.length} resultado(s){resultado.parcial ? ' · busca parcial' : ''}</span>}
      {resultado?.hits.map((hit) => <button className="popover-option chat-history-hit" type="button" key={hit.messageId}
        onClick={() => {
          if (abrir(hit.messageId)) setAberta(false)
          else setErro('Esta mensagem não está mais na lista atual. Atualize o chat.')
        }}>
        <span>{hit.papel === 'user' ? 'Você' : 'Agente'} · mensagem {hit.sequence}</span>
        <span>{hit.trecho}</span>
      </button>)}
    </div>}
  </div>
}
