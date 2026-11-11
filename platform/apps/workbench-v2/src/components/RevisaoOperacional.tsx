import { RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RevisaoOperacional as Revisao } from '../domain/retomadaOperacional'

export function RevisaoOperacional({ sessionId, chatId, interrompida, ocupada, planejar }: {
  sessionId: string; chatId: string; interrompida?: boolean; ocupada: boolean; planejar: (runId: string) => void
}) {
  const [aberta, setAberta] = useState(false)
  const [estado, setEstado] = useState<{ revisao: Revisao | null; ativa: boolean }>()
  const [erro, setErro] = useState('')
  const pedido = useRef<AbortController | null>(null)
  useEffect(() => () => pedido.current?.abort(), [])
  async function conferir() {
    pedido.current?.abort()
    const controle = new AbortController()
    pedido.current = controle
    setEstado(undefined)
    setErro('')
    setAberta(true)
    try {
      const resposta = await fetch('/api/sessions/operation-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controle.signal,
        body: JSON.stringify({ sessionId, chatId }),
      })
      const corpo = await resposta.json()
      if (controle.signal.aborted) return
      if (!resposta.ok) setErro('Não foi possível conferir a tarefa.')
      else setEstado(corpo)
    } catch {
      if (!controle.signal.aborted) setErro('Não foi possível conferir a tarefa.')
    }
  }
  const revisao = estado?.revisao
  return <div className="chat-history-search">
    <button type="button" className="toolbar-button" title={interrompida ? 'Execução interrompida: revisar tarefa' : 'Revisar retomada de tarefa'}
      aria-label={interrompida ? 'Execução interrompida: revisar tarefa' : 'Revisar retomada de tarefa'}
      aria-expanded={aberta} onClick={() => aberta ? setAberta(false) : void conferir()}><RotateCcw size={14} /></button>
    {aberta && <div className="popover chat-history-search-panel project-memory-panel" role="region" aria-label="Revisão da tarefa interrompida">
      <div className="chat-history-search-form"><strong>Revisão da tarefa</strong>
        <button type="button" className="toolbar-button" aria-label="Fechar revisão da tarefa" onClick={() => setAberta(false)}><X size={14} /></button>
      </div>
      {erro && <span role="alert">{erro}</span>}
      {!erro && !estado && <span role="status">Conferindo estado…</span>}
      {estado && !revisao && <span role="status">Nenhuma tarefa interrompida registrada.</span>}
      {revisao && <>
        <p>Execução {revisao.estado}. Aprovações anteriores expiraram.</p>
        {revisao.objetivo && <p>{revisao.objetivo}</p>}
        <p>Pasta {revisao.pasta}. Git {revisao.git}.</p>
        {revisao.acoes.map((acao) => <div key={acao.id}>
          <strong>{acao.ferramenta} · {acao.estado}</strong>
          <div>Aprovação histórica {acao.aprovacao}</div>
          {acao.referencia && <small>{acao.referencia}</small>}
          {acao.arquivo && <small>Arquivo {acao.arquivo}</small>}
        </div>)}
        {!revisao.podePlanejar && <p role="status">Inspecione a pasta e os resultados antes de iniciar uma nova tarefa.</p>}
        <button type="button" className="primary-button" disabled={!revisao.podePlanejar || estado?.ativa || ocupada}
          onClick={() => {
            if (window.confirm('Iniciar um novo planejamento, sem executar ferramentas?')) { setAberta(false); planejar(revisao.runId) }
          }}>Retomar planejamento</button>
      </>}
    </div>}
  </div>
}
