// ============================================================================
// CartaoFerramenta — o cartão da FATIA 10 no fluxo do chat.
// Estados: 'aguardando' (3 botões, Q1a/Q3a — caminho + prévia) ·
// 'executando' · 'ok' · 'negado' · 'erro' · 'expirado' (F5 no meio).
// Estilo inline de propósito: o contrato de temas cobre o CSS do app; o
// cartão é cirúrgico e não inventa token novo.
// ============================================================================
import type { FerramentaNoChat } from '../types'

const TITULOS: Record<FerramentaNoChat['ferramenta'], string> = {
  ler: 'Ler arquivo',
  listar: 'Listar pasta',
  buscar: 'Buscar arquivos',
  criar: 'Criar arquivo',
  escrever: 'Escrever arquivo',
  excluir: 'Excluir (lixeira)',
  executar: 'Executar comando',
}

const ROTULOS_STATUS: Record<FerramentaNoChat['status'], string> = {
  aguardando: 'Esperando você permitir',
  aguardando_continuacao: 'Aguardando decisão sobre o comando',
  executando: 'Executando…',
  ok: 'Feito',
  negado: 'Negado por você',
  erro: 'Não executou',
  expirado: 'Expirou (a página recarregou no meio)',
}

const COR_STATUS: Record<FerramentaNoChat['status'], string> = {
  aguardando: '#e8b86b',
  aguardando_continuacao: '#e8b86b',
  executando: '#9da5b4',
  ok: '#73c991',
  negado: '#f48771',
  erro: '#f48771',
  expirado: '#9da5b4',
}

export interface CartaoFerramentaProps {
  carta: FerramentaNoChat
  onDecidir?: (decisao: 'permitir' | 'negar' | 'sessao') => void
  onDecidirContinuacao?: (decisao: 'continuar' | 'parar') => void
}

export function CartaoFerramenta({ carta, onDecidir, onDecidirContinuacao }: CartaoFerramentaProps) {
  const cor = COR_STATUS[carta.status]
  return (
    <div
      className="chat-tool-card"
      role="group"
      aria-label={`Ferramenta: ${TITULOS[carta.ferramenta]}`}
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
        <strong style={{ fontSize: 12 }}>{TITULOS[carta.ferramenta]}</strong>
        {carta.alvo !== '' && (
          <code style={{ fontSize: 11, opacity: 0.9, wordBreak: 'break-all' }}>{carta.alvo}</code>
        )}
        <span style={{ marginLeft: 'auto', color: cor, fontWeight: 600, fontSize: 11 }}>
          {ROTULOS_STATUS[carta.status]}
        </span>
      </div>

      {carta.status === 'aguardando' && carta.ferramenta === 'excluir' && (
        <div style={{ margin: '6px 0 0', color: '#f48771', fontWeight: 600, fontSize: 11 }}>
          Sem desfazer direto — vai para a lixeira do sistema (restaurar é pela lixeira).
        </div>
      )}

      {carta.status === 'aguardando' && carta.previa && (
        <pre
          style={{
            margin: '6px 0 0',
            padding: '6px 8px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.25)',
            fontFamily: 'monospace',
            fontSize: 11,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 120,
            overflowY: 'auto',
          }}
        >
          {carta.previa}
        </pre>
      )}

      {carta.status === 'executando' && carta.progresso && (
        <pre style={{ margin: '6px 0 0', padding: '6px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.25)', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflowY: 'auto' }}>{carta.progresso}</pre>
      )}
      {carta.resumo && carta.status !== 'aguardando' && carta.status !== 'aguardando_continuacao' && (
        <div style={{ marginTop: 4, opacity: 0.85 }}>{carta.resumo}</div>
      )}

      {carta.status === 'aguardando_continuacao' && onDecidirContinuacao && (
        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 6, color: '#e8b86b' }}>O comando continua ativo. Deseja aguardar mais dois minutos?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => onDecidirContinuacao('continuar')} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: `1px solid ${cor}`, background: 'transparent', color: cor }}>Continuar aguardando</button>
            <button type="button" onClick={() => onDecidirContinuacao('parar')} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid #f48771', background: 'transparent', color: '#f48771' }}>Parar comando</button>
          </div>
        </div>
      )}

      {carta.status === 'aguardando' && onDecidir && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-label="Permitir esta mexida"
            onClick={() => onDecidir('permitir')}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${cor}`, background: 'transparent', color: cor }}
          >
            Permitir
          </button>
          <button
            type="button"
            aria-label="Negar esta mexida"
            onClick={() => onDecidir('negar')}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #f48771', background: 'transparent', color: '#f48771' }}
          >
            Negar
          </button>
          {carta.ferramenta !== 'excluir' && carta.allowSession !== false && (
            <button
              type="button"
              aria-label="Permitir nesta sessão"
              onClick={() => onDecidir('sessao')}
              style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #ffffff33', background: 'transparent', color: '#cccccc' }}
            >
              Permitir na Sessão
            </button>
          )}
        </div>
      )}
    </div>
  )
}
