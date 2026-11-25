// ============================================================================
// shell/DialogoConfirmacao.tsx — A CASCA única dos diálogos internos.
//
// Mesmo padrão visual do diálogo de exclusão permanente do Explorer
// (`explorer-delete-confirm`): `.monaco-dialog-modal-block` centralizado,
// `.monaco-dialog-box` de 498 px, mensagem + detalhe, botões à direita,
// ✕ no canto. Portal no body, `role="dialog"` + `aria-modal`, foco inicial no
// botão primário (o padrão SEGURO: Cancelar), Enter = botão focado,
// Esc = fuga, Tab circula dentro (trap) e o foco volta ao acionador ao fechar.
//
// Divergência deliberada e registrada: os tokens `.explorer-search-dialog`
// estão definidos em `modules/explorer-search/ui/search/search.css`, e o
// teste de fronteira do módulo (FT-01) proíbe o shell de usar caminhos
// internos dele. Por isso esta casca é uma CÓPIA de tokens em `dialogo.css` —
// mesma medida, mesmos nomes de variável do tema, sem importar o módulo.
// Unificar as duas cascas é dívida registrada no relatório da U-2.
//
// Acessibilidade: o título é o `aria-label` (o pedido nomeia o que está em
// jogo) e a mensagem fica ligada por `aria-labelledby` dentro do texto.
// ============================================================================
import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'
import { botaoInicial, type PedidoDialogo } from '../domain/dialogoConfirmacao'
import './dialogo.css'

export interface DialogoConfirmacaoProps {
  pedido: PedidoDialogo
  /** Devolve o id do botão escolhido; `null` = fuga (Esc/✕/fundo). */
  onResponder: (id: string | null) => void
}

/** Focáveis do diálogo: todos os botões existem e são visíveis sempre (não há
 *  painel oculto aqui), então só `disabled` sai do ciclo. */
const FOCO = '[data-dialogo-botao="true"]:not(:disabled), [data-dialogo-fechar="true"]:not(:disabled)'

export function DialogoConfirmacao({ pedido, onResponder }: DialogoConfirmacaoProps) {
  const caixa = useRef<HTMLDivElement>(null)
  const tituloId = `dialogo-${useId().replace(/:/g, '')}`
  const inicial = botaoInicial(pedido)

  // Foco inicial no primário + devolução ao acionador quando a casca sai.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const alvo = caixa.current?.querySelector<HTMLElement>(`[data-dialogo-botao-id="${inicial.id}"]`) ?? caixa.current
    alvo?.focus()
    return () => { if (anterior?.isConnected) anterior.focus() }
    // A montagem é única por pedido: o pedido não muda com o diálogo aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aoTecla = (evento: KeyboardEvent<HTMLDivElement>) => {
    evento.stopPropagation()
    if (evento.key === 'Escape') {
      evento.preventDefault()
      onResponder(null)
      return
    }
    if (evento.key === 'Enter') {
      const alvo = evento.target as HTMLElement
      const id = alvo.getAttribute('data-dialogo-botao-id')
      if (!id) return
      evento.preventDefault()
      onResponder(id)
      return
    }
    if (evento.key !== 'Tab') return
    const itens = Array.from(caixa.current?.querySelectorAll<HTMLElement>(FOCO) ?? [])
    if (!itens.length) return
    const atual = itens.indexOf(document.activeElement as HTMLElement)
    evento.preventDefault()
    const proximo = evento.shiftKey
      ? (atual <= 0 ? itens.length - 1 : atual - 1)
      : (atual >= itens.length - 1 ? 0 : atual + 1)
    itens[proximo]?.focus()
  }

  return createPortal(
    <div className="monaco-dialog-modal-block dimmed dialogo-app" data-testid={pedido.testId}
      onKeyDown={aoTecla} onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onResponder(null) }}>
      {/* O nome acessível é a PRÓPRIA pergunta: "Excluir a conversa “X”?" —
          o leitor de tela anuncia o que está em jogo, não um rótulo genérico. */}
      <div ref={caixa} className="monaco-dialog-box" role="dialog" aria-modal="true"
        aria-labelledby={`${tituloId}-mensagem`} aria-describedby={pedido.detalhe ? `${tituloId}-detalhe` : undefined}
        data-rotulo={pedido.rotuloAcessivel} tabIndex={-1}>
        <div className="dialog-buttons-row">
          <div className="dialog-buttons">
            {pedido.botoes.map((botao) => (
              <button key={botao.id} type="button"
                className={`monaco-button monaco-text-button dialogo-botao dialogo-botao--${botao.variacao ?? 'secundario'}`}
                data-dialogo-botao="true" data-dialogo-botao-id={botao.id}
                onClick={() => onResponder(botao.id)}>{botao.rotulo}</button>
            ))}
          </div>
        </div>
        <div className="dialog-message-row">
          {pedido.tom === 'aviso'
            ? <TriangleAlert className="dialog-icon" size={32} aria-hidden="true" />
            : <span className="dialog-icon dialog-icon--pergunta" aria-hidden="true">?</span>}
          <div className="dialog-message-container">
            <div id={`${tituloId}-mensagem`} className="dialog-message">{pedido.mensagem}</div>
            {pedido.detalhe && <div id={`${tituloId}-detalhe`} className="dialog-message-detail">{pedido.detalhe}</div>}
          </div>
        </div>
        <div className="dialog-toolbar-row">
          <div className="dialog-toolbar">
            <div className="monaco-action-bar">
              <ul className="actions-container" role="toolbar" aria-label={pedido.rotuloAcessivel}>
                <li className="action-item" role="presentation">
                  {/* Fechar é fuga (= Cancelar), mas com nome PRÓPRIO: dois
                      botões com o mesmo nome acessível são ambíguos. */}
                  <button type="button" className="action-label dialogo-fechar" data-dialogo-fechar="true"
                    aria-label={`Fechar diálogo (${pedido.cancelar})`} title={pedido.cancelar} onClick={() => onResponder(null)}>
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
