// ============================================================================
// CartaoContinuar — o cartão "continuar?" da FATIA 11 no fluxo do chat.
// Estados: 'aguardando' (2 botões — Continuar concede +1 orçamento cheio e
// retoma o MESMO fluxo; Parar morre limpo) · 'continuado' · 'parado' ·
// 'expirado' (servidor reiniciou ou a execução terminou — 409 'fluxo').
// Estilo inline de propósito: segue o CartaoFerramenta (10), sem token novo.
// ============================================================================
import type { ContinuarNoChat } from '../types'

const ROTULOS_STATUS: Record<ContinuarNoChat['status'], string> = {
  aguardando: 'Pausado no limite — quer continuar?',
  continuado: 'Continuado',
  parado: 'Parado por você',
  expirado: 'Expirou (a execução já terminou)',
}

const COR_STATUS: Record<ContinuarNoChat['status'], string> = {
  aguardando: '#e8b86b',
  continuado: '#73c991',
  parado: '#9da5b4',
  expirado: '#9da5b4',
}

export interface CartaoContinuarProps {
  carta: ContinuarNoChat
  /** Presente só quando o cartão está 'aguardando' — os 2 botões. */
  onDecidir?: (decisao: 'continuar' | 'parar') => void
}

export function CartaoContinuar({ carta, onDecidir }: CartaoContinuarProps) {
  const cor = COR_STATUS[carta.status]
  return (
    <div
      className="chat-continue-card"
      role="group"
      aria-label="Limite de voltas do agente"
      style={{
        margin: '6px 0',
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${cor}55`,
        background: 'rgba(255,255,255,0.03)',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 12 }}>{carta.titulo ?? 'Limite de voltas'}</strong>
        <span style={{ fontSize: 11, opacity: 0.9 }}>
          {carta.motivo ?? `A IA usou ${carta.voltas} de ${carta.teto} voltas sem concluir.`}
        </span>
        <span style={{ marginLeft: 'auto', color: cor, fontWeight: 600, fontSize: 11 }}>
          {carta.status === 'aguardando' && carta.titulo !== undefined ? 'Esperando você decidir' : ROTULOS_STATUS[carta.status]}
        </span>
      </div>

      {carta.status === 'aguardando' && onDecidir && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-label={`Continuar com mais ${carta.teto} voltas`}
            onClick={() => onDecidir('continuar')}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${cor}`, background: 'transparent', color: cor }}
          >
            Continuar (+{carta.teto})
          </button>
          <button
            type="button"
            aria-label="Parar por aqui"
            onClick={() => onDecidir('parar')}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #ffffff33', background: 'transparent', color: '#cccccc' }}
          >
            Parar
          </button>
        </div>
      )}
    </div>
  )
}
