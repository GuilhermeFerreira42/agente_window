// ============================================================================
// shell/DialogoEntrada.tsx — a MESMA casca do `DialogoConfirmacao`, com um
// CAMPO de texto. Existe para substituir `window.prompt` (nomear/mover grupo
// de sessões) sem perder o valor atual nem as sugestões.
//
// Contrato: confirmação só devolve texto não vazio (o botão fica desabilitado
// enquanto o campo estiver vazio — o dono não escolhe "nada" por acidente).
// Fuga (Esc/✕/fundo) devolve `null`, nunca string vazia.
// ============================================================================
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'
import type { PedidoEntrada } from '../domain/dialogoConfirmacao'
import './dialogo.css'

export interface DialogoEntradaProps {
  pedido: PedidoEntrada
  /** `id` escolhido e texto confirmado; `null` em fuga. */
  onResponder: (id: string | null, texto: string) => void
}

const FOCO = '[data-dialogo-botao="true"]:not(:disabled), [data-dialogo-fechar="true"]:not(:disabled), input'

export function DialogoEntrada({ pedido, onResponder }: DialogoEntradaProps) {
  const caixa = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState(pedido.entrada.valorInicial ?? '')
  const tituloId = `dialogo-entrada-${useId().replace(/:/g, '')}`
  const vazio = texto.trim().length === 0

  // Foco inicial no CAMPO (é o que o dono veio fazer), com o texto atual
  // selecionado para poder substituir de imediato; ao sair, foco volta ao
  // acionador. O `DialogoConfirmacao` foca no botão seguro porque ali a
  // escolha é binária — aqui a tarefa é digitar.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    campo.current?.focus()
    campo.current?.select()
    return () => { if (anterior?.isConnected) anterior.focus() }
  }, [])

  const responder = (id: string | null) => {
    if (id === 'confirmar') { if (vazio) return; onResponder(id, texto.trim()); return }
    onResponder(id, '')
  }

  const aoTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    evento.stopPropagation()
    if (evento.key === 'Escape') { evento.preventDefault(); onResponder(null, ''); return }
    // Enter no campo confirma; nos botões, mantém a ação do botão focado.
    if (evento.key === 'Enter' && evento.target === campo.current) { evento.preventDefault(); responder('confirmar'); return }
    if (evento.key !== 'Tab') return
    const itens = Array.from(caixa.current?.querySelectorAll<HTMLElement>(FOCO) ?? [])
    // O botão de confirmar desabilitado não entra no ciclo.
    const habilitados = itens.filter((item) => !(item instanceof HTMLButtonElement && item.disabled))
    if (!habilitados.length) return
    const atual = habilitados.indexOf(document.activeElement as HTMLElement)
    evento.preventDefault()
    const proximo = evento.shiftKey ? (atual <= 0 ? habilitados.length - 1 : atual - 1)
      : (atual >= habilitados.length - 1 ? 0 : atual + 1)
    habilitados[proximo]?.focus()
  }

  const listaId = `${tituloId}-sugestoes`

  return createPortal(
    <div className="monaco-dialog-modal-block dimmed dialogo-app" data-testid={pedido.testId}
      onKeyDown={aoTecla} onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onResponder(null, '') }}>
      <div ref={caixa} className="monaco-dialog-box" role="dialog" aria-modal="true"
        aria-labelledby={`${tituloId}-mensagem`} aria-describedby={pedido.detalhe ? `${tituloId}-detalhe` : undefined}
        data-rotulo={pedido.rotuloAcessivel} tabIndex={-1}>
        <div className="dialog-buttons-row">
          <div className="dialog-buttons">
            {pedido.botoes.map((botao) => {
              const desabilitado = botao.id === 'confirmar' && vazio
              return (
                <button key={botao.id} type="button" disabled={desabilitado}
                  className={`monaco-button monaco-text-button dialogo-botao dialogo-botao--${botao.variacao ?? 'secundario'}`}
                  data-dialogo-botao="true" data-dialogo-botao-id={botao.id}
                  onClick={() => responder(botao.id)}>{botao.rotulo}</button>
              )
            })}
          </div>
        </div>
        <div className="dialog-message-row">
          <TriangleAlert className="dialog-icon" size={32} aria-hidden="true" />
          <div className="dialog-message-container">
            <div id={`${tituloId}-mensagem`} className="dialog-message">{pedido.mensagem}</div>
            {pedido.detalhe && <div id={`${tituloId}-detalhe`} className="dialog-message-detail">{pedido.detalhe}</div>}
            <label className="dialogo-campo">
              <span>{pedido.entrada.rotulo}</span>
              <input ref={campo} value={texto} maxLength={pedido.entrada.limite}
                list={pedido.entrada.sugestoes?.length ? listaId : undefined}
                aria-describedby={pedido.entrada.ajuda ? `${tituloId}-ajuda` : undefined}
                onChange={(evento) => setTexto(evento.target.value)} />
            </label>
            {pedido.entrada.sugestoes?.length ? (
              <datalist id={listaId}>
                {pedido.entrada.sugestoes.map((sugestao) => <option key={sugestao} value={sugestao} />)}
              </datalist>
            ) : null}
            {pedido.entrada.ajuda && <div id={`${tituloId}-ajuda`} className="dialog-message-detail">{pedido.entrada.ajuda}</div>}
          </div>
        </div>
        <div className="dialog-toolbar-row">
          <div className="dialog-toolbar">
            <div className="monaco-action-bar">
              <ul className="actions-container" role="toolbar" aria-label={pedido.rotuloAcessivel}>
                <li className="action-item" role="presentation">
                  <button type="button" className="action-label dialogo-fechar" data-dialogo-fechar="true"
                    aria-label={`Fechar diálogo (${pedido.cancelar})`} title={pedido.cancelar}
                    onClick={() => onResponder(null, '')}>
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
