// ============================================================================
// C-3b — Apresentação das partes de UMA mensagem.
//
// Este componente é o único lugar que decide "texto → parágrafo, artefato →
// ArtifactCard, desconhecido → diagnóstico". A decisão de ORDEM fica no
// domínio (`montarApresentacao`); aqui só se desenha.
//
// Compatibilidade: quando a mensagem não tem envelope, o App passa os chips
// legados e o resultado é o mesmo de antes — a C-3a continua idêntica.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CardArtefato, ItemApresentacao } from '../domain/apresentacaoMultimodal'
import { ArtifactCard } from './ArtifactCard'

export interface MessagePartsProps {
  itens: ItemApresentacao[]
  urlPara: (artifactId: string) => string | null
  aoRegistrarMidia?: (elemento: HTMLMediaElement | null) => void
  aoBaixar?: (card: CardArtefato) => void
  /** Diagnóstico de partes de versão desconhecida (não somem). */
  diagnosticoEnvelope?: string
}

export function MessageParts({
  itens, urlPara, aoRegistrarMidia, aoBaixar, diagnosticoEnvelope,
}: MessagePartsProps) {
  const [ampliado, setAmpliado] = useState<CardArtefato | null>(null)
  const gatilhoRef = useRef<HTMLElement | null>(null)

  const abrir = useCallback((card: CardArtefato) => {
    // Guarda quem abriu para devolver o foco ao fechar (T05/T27).
    gatilhoRef.current = document.activeElement as HTMLElement | null
    setAmpliado(card)
  }, [])

  const fechar = useCallback(() => {
    setAmpliado(null)
    // Devolve o foco ao elemento de origem, não ao topo da página.
    requestAnimationFrame(() => gatilhoRef.current?.focus?.())
  }, [])

  return (
    <>
      {itens.map((item) => {
        if (item.tipo === 'texto') {
          return item.texto.length > 0
            ? <p className="chat-message-texto" key={item.chave}>{item.texto}</p>
            : null
        }
        if (item.tipo === 'nao-suportada') {
          // Preserva o original e DIZ que não entendeu — não finge vazio.
          return (
            <p className="message-part-diagnostico" key={item.chave} role="note">
              Conteúdo em formato não reconhecido por esta versão
              {item.tipoOriginal ? ` (${item.tipoOriginal})` : ''}. O restante da mensagem foi preservado.
            </p>
          )
        }
        return (
          <ArtifactCard
            key={item.chave}
            card={item.card}
            url={urlPara(item.card.artifactId)}
            aoMontarMidia={aoRegistrarMidia}
            onAbrir={abrir}
            onBaixar={aoBaixar}
          />
        )
      })}
      {diagnosticoEnvelope && (
        <p className="message-part-diagnostico" role="note">
          Esta mensagem foi gravada por uma versão mais nova ({diagnosticoEnvelope}). Mostrando o que esta versão entende.
        </p>
      )}
      {ampliado && (
        <DialogoMidia card={ampliado} url={urlPara(ampliado.artifactId)} aoFechar={fechar} aoBaixar={aoBaixar} />
      )}
    </>
  )
}

/**
 * Superfície ampliada acessível: `role="dialog"` + `aria-modal`, Escape fecha,
 * foco entra no diálogo e volta ao gatilho (T05/T27).
 */
function DialogoMidia({
  card, url, aoFechar, aoBaixar,
}: {
  card: CardArtefato
  url: string | null
  aoFechar: () => void
  aoBaixar?: (card: CardArtefato) => void
}) {
  const caixaRef = useRef<HTMLDivElement | null>(null)
  const fecharRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    fecharRef.current?.focus()
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.stopPropagation()
        aoFechar()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  const tipo = card.preview.ok ? card.preview.tipo : 'arquivo'
  return (
    <div className="midia-dialogo-fundo" onPointerDown={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div
        ref={caixaRef}
        className="midia-dialogo"
        role="dialog"
        aria-modal="true"
        aria-label={`Visualização de ${card.name}`}
      >
        <header className="midia-dialogo-cabecalho">
          <span className="artifact-card-nome" title={card.name}>{card.name}</span>
          <button
            ref={fecharRef}
            type="button"
            className="artifact-card-botao"
            aria-label="Fechar visualização"
            onClick={aoFechar}
          >
            Fechar
          </button>
        </header>
        <div className="midia-dialogo-corpo">
          {url && tipo === 'imagem' && <img className="midia-dialogo-imagem" src={url} alt={card.name} />}
          {url && tipo === 'video' && (
            <video className="midia-dialogo-video" src={url} controls playsInline preload="metadata" autoPlay={false} />
          )}
          {url && tipo === 'audio' && <audio src={url} controls preload="metadata" />}
        </div>
        {aoBaixar && (
          <button type="button" className="artifact-card-botao-texto" onClick={() => aoBaixar(card)}>
            Baixar arquivo
          </button>
        )}
      </div>
    </div>
  )
}
