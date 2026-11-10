import { BookMarked, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LIMITE_CONTEUDO_MEMORIA, LIMITE_MOTIVO_MEMORIA, type MemoriaProjeto as Registro, type TipoMemoria } from '../domain/memoriaProjeto'
import type { ChatMessage } from '../types'

const rotulos: Record<TipoMemoria, string> = { decisao: 'Decisão', fato: 'Fato', preferencia: 'Preferência' }

export function MemoriaProjeto({ sessionId, chatId, messages }: {
  sessionId: string; chatId: string; messages: ChatMessage[]
}) {
  const [aberta, setAberta] = useState(false)
  const [projeto, setProjeto] = useState('')
  const [projetoId, setProjetoId] = useState('')
  const [memorias, setMemorias] = useState<Registro[]>([])
  const [edicao, setEdicao] = useState<Registro>()
  const [tipo, setTipo] = useState<TipoMemoria>('decisao')
  const [conteudo, setConteudo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [messageId, setMessageId] = useState('')
  const [ocupada, setOcupada] = useState(false)
  const [aviso, setAviso] = useState('')
  const operacao = useRef<AbortController | null>(null)
  useEffect(() => () => operacao.current?.abort(), [])

  async function requisitar(dados: object, sinal: AbortSignal) {
    const resposta = await fetch('/api/sessions/project-memory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: sinal,
      body: JSON.stringify({ sessionId, chatId, projetoId, ...dados }),
    })
    const corpo = await resposta.json() as { projeto?: string; projetoId?: string; memorias?: Registro[]; message?: string }
    if (!resposta.ok) throw new Error(corpo.message ?? 'A memória do projeto está indisponível.')
    return corpo
  }

  function limparEdicao() {
    setEdicao(undefined)
    setConteudo('')
    setMotivo('')
    setMessageId('')
  }

  async function operar(dados?: object) {
    if (operacao.current) return
    const controle = new AbortController()
    operacao.current = controle
    setOcupada(true)
    setAviso('')
    try {
      if (dados) {
        const resultado = await requisitar(dados, controle.signal)
        if (controle.signal.aborted) return
        setAviso(resultado.message ?? '')
        limparEdicao()
      }
      const resultado = await requisitar({ operacao: 'listar' }, controle.signal)
      if (controle.signal.aborted) return
      setProjeto(resultado.projeto ?? '')
      setProjetoId(resultado.projetoId ?? '')
      setMemorias(resultado.memorias ?? [])
    } catch (erro) {
      if (!controle.signal.aborted) setAviso(erro instanceof Error ? erro.message : 'A memória do projeto está indisponível.')
    } finally {
      if (operacao.current === controle) {
        operacao.current = null
        setOcupada(false)
      }
    }
  }

  function gravar(evento: FormEvent) {
    evento.preventDefault()
    if (!conteudo.trim() || !window.confirm('Guardar este texto na memória deste projeto? Confira se ele pode ser persistido.')) return
    void operar({ operacao: 'gravar', confirmado: true, id: edicao?.id, revisao: edicao?.revisao ?? 0,
      tipo, conteudo, motivo, messageId: messageId || undefined })
  }

  function exportar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, projeto, memorias }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'memoria-projeto.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return <div className="chat-history-search">
    <button type="button" className="toolbar-button" title="Memória do projeto" aria-label="Memória do projeto" aria-expanded={aberta}
      onClick={() => { setAberta(!aberta); if (!aberta) void operar() }}><BookMarked size={14} /></button>
    {aberta && <div className="popover chat-history-search-panel project-memory-panel" role="region" aria-label="Memória do projeto">
      <div className="chat-history-search-form">
        <strong>Memória do projeto</strong>
        <button className="toolbar-button" type="button" aria-label="Fechar memória do projeto" onClick={() => setAberta(false)}><X size={14} /></button>
      </div>
      <span title={projeto}>{projeto}</span>
      <form onSubmit={gravar}>
        <label>Tipo <select value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoMemoria)}>
          {Object.entries(rotulos).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select></label>
        <label>Conteúdo da memória <textarea value={conteudo} maxLength={LIMITE_CONTEUDO_MEMORIA} onChange={(evento) => setConteudo(evento.target.value)} /></label>
        <label>Mensagem de origem <select value={messageId} onChange={(evento) => setMessageId(evento.target.value)}>
          <option value="">Entrada manual neste chat</option>
          {messages.filter((item) => !item.running && !item.erro && !item.cancelled).slice(-50).map((item, indice) =>
            <option key={item.id} value={item.id}>{indice + 1} · {item.role === 'user' ? 'Você' : 'Agente'} · {item.time}</option>)}
        </select></label>
        {edicao && <label>Motivo da revisão <input value={motivo} maxLength={LIMITE_MOTIVO_MEMORIA} onChange={(evento) => setMotivo(evento.target.value)} /></label>}
        <button type="submit" className="primary-button" disabled={ocupada || !projeto || !conteudo.trim() || Boolean(edicao && !motivo.trim())}>Salvar memória</button>
        {edicao && <button type="button" onClick={limparEdicao}>Cancelar edição</button>}
      </form>
      {aviso && <span role="status">{aviso}</span>}
      {ocupada && <span role="status">Consultando memória…</span>}
      {memorias.map((registro) => <div className="project-memory-record" key={`${registro.id}:${registro.revisao}`}>
        <strong>{rotulos[registro.tipo]} · revisão {registro.revisao} · {registro.vigente ? 'Vigente' : 'Substituída'}</strong>
        <div>{registro.conteudo}</div>
        <small>{registro.origemDisponivel === false ? 'Origem indisponível' : `Origem ${registro.origem.chatId}`}{registro.origem.messageId ? ` / ${registro.origem.messageId}` : ''} · {new Date(registro.criadaEm).toLocaleDateString()}</small>
        {registro.motivo && <small>Motivo: {registro.motivo}</small>}
        {registro.vigente && <div>
          <button type="button" disabled={ocupada} onClick={() => { setEdicao(registro); setTipo(registro.tipo); setConteudo(registro.conteudo); setMotivo(''); setMessageId('') }}>Editar memória</button>
          <button type="button" disabled={ocupada} onClick={() => {
            if (window.confirm('Excluir esta memória e todas as suas revisões?')) void operar({ operacao: 'excluir', confirmado: true, id: registro.id, revisao: registro.revisao })
          }}>Excluir memória</button>
        </div>}
      </div>)}
      {memorias.length > 0 && <button type="button" onClick={exportar}>Exportar memória do projeto</button>}
    </div>}
  </div>
}
