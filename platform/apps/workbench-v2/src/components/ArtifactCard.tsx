// ============================================================================
// C-3b — Card de artefato: imagem, áudio, vídeo ou fallback honesto.
//
// Regras que este componente respeita (e que a SPEC cobra):
//   • nenhum preview sem artefato PRONTO do dono (estado vem de fora);
//   • imagem/áudio/vídeo usam o MESMO elemento nativo — nada de player próprio;
//   • `preload="metadata"` para não baixar a mídia de todo o histórico;
//   • erro de decode vira fallback com download, nunca card "vazio" silencioso;
//   • SVG/HTML/PDF nunca são renderizados ativos (a política já os exclui);
//   • troca de conversa/unmount pausa e libera (a URL vem do hook).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { Download, FileCode2, ImageOff, Maximize2, Pause, Play } from 'lucide-react'
import type { CardArtefato } from '../domain/apresentacaoMultimodal'

export interface ArtifactCardProps {
  card: CardArtefato
  /** URL do namespace escopado (null enquanto não houver como resolver). */
  url: string | null
  /** Recebe o nó de mídia para que o hook possa pausar na troca de conversa. */
  aoMontarMidia?: (elemento: HTMLMediaElement | null) => void
  onAbrir?: (card: CardArtefato) => void
  onBaixar?: (card: CardArtefato) => void
  /** Diagnóstico visível quando o artefato não pôde ser resolvido. */
  motivoIndisponivel?: string
}

function formatarBytes(bytes?: number): string {
  if (bytes === undefined || bytes < 0) return 'tamanho desconhecido'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const rotuloEstado: Record<CardArtefato['estado'], string> = {
  pronto: 'armazenado',
  ausente: 'indisponível',
  indisponivel: 'indisponível',
}

export function ArtifactCard({
  card, url, aoMontarMidia, onAbrir, onBaixar, motivoIndisponivel,
}: ArtifactCardProps) {
  const [falhou, setFalhou] = useState(false)
  const [tocando, setTocando] = useState(false)
  const midiaRef = useRef<HTMLMediaElement | null>(null)
  const preview = card.preview
  const podeRenderizar = card.estado === 'pronto' && url !== null && preview.ok && !falhou

  // Registra/limpa o nó de mídia para o hook poder pausar na troca de conversa.
  useEffect(() => {
    aoMontarMidia?.(midiaRef.current)
    return () => { aoMontarMidia?.(null) }
  }, [aoMontarMidia, podeRenderizar])

  // Sai da tela tocando? Pausa. Nunca deixa áudio/vídeo rodando escondido.
  useEffect(() => () => {
    const no = midiaRef.current
    if (no && !no.paused) no.pause()
  }, [])

  const baixar = () => onBaixar?.(card)

  const rodape = (
    <div className="artifact-card-acoes">
      <button
        type="button"
        className="artifact-card-botao"
        aria-label={`Baixar ${card.name}`}
        title="Baixar o arquivo armazenado"
        onClick={baixar}
      >
        <Download size={12} aria-hidden="true" />
      </button>
      {preview.ok && card.estado === 'pronto' && (
        <button
          type="button"
          className="artifact-card-botao"
          aria-label={`Abrir ${card.name} em tela cheia`}
          title="Abrir"
          onClick={() => onAbrir?.(card)}
        >
          <Maximize2 size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  )

  const cabecalho = (
    <div className="artifact-card-cabecalho">
      <FileCode2 size={12} aria-hidden="true" />
      <span className="artifact-card-nome" title={card.name}>{card.name}</span>
      <span className="artifact-card-meta">
        {formatarBytes(card.bytes)} · {rotuloEstado[card.estado]}
      </span>
      {rodape}
    </div>
  )

  // ── Indisponível: não existe botão falso de abrir ──────────────────────
  if (card.estado !== 'pronto') {
    return (
      <div className="artifact-card artifact-card-indisponivel" role="group" aria-label={`${card.name}, indisponível`}>
        {cabecalho}
        <p className="artifact-card-motivo">
          {motivoIndisponivel ?? 'Este arquivo não está mais disponível. O registro da conversa foi preservado.'}
        </p>
      </div>
    )
  }

  // ── Imagem ─────────────────────────────────────────────────────────────
  if (preview.ok && preview.tipo === 'imagem') {
    return (
      <div className="artifact-card" role="group" aria-label={`${card.name}, imagem`}>
        {cabecalho}
        {podeRenderizar ? (
          <img
            className="artifact-card-imagem"
            src={url}
            alt={card.name}
            loading="lazy"
            decoding="async"
            onError={() => setFalhou(true)}
          />
        ) : (
          <FallbackVisual nome={card.name} aoBaixar={baixar} />
        )}
      </div>
    )
  }

  // ── Áudio ──────────────────────────────────────────────────────────────
  if (preview.ok && preview.tipo === 'audio') {
    return (
      <div className="artifact-card" role="group" aria-label={`${card.name}, áudio`}>
        {cabecalho}
        {podeRenderizar ? (
          <div className="artifact-card-midia">
            <audio
              ref={(no) => { midiaRef.current = no }}
              src={url}
              controls
              preload="metadata"
              onPlay={() => setTocando(true)}
              onPause={() => setTocando(false)}
              onError={() => setFalhou(true)}
            />
            <span className="artifact-card-estado-midia" aria-live="polite">
              {tocando ? 'Reproduzindo' : 'Pronto para tocar'}
            </span>
          </div>
        ) : (
          <FallbackVisual nome={card.name} aoBaixar={baixar} />
        )}
      </div>
    )
  }

  // ── Vídeo ──────────────────────────────────────────────────────────────
  if (preview.ok && preview.tipo === 'video') {
    return (
      <div className="artifact-card" role="group" aria-label={`${card.name}, vídeo`}>
        {cabecalho}
        {podeRenderizar ? (
          <video
            ref={(no) => { midiaRef.current = no }}
            className="artifact-card-video"
            src={url}
            controls
            playsInline
            preload="metadata"
            onPlay={() => setTocando(true)}
            onPause={() => setTocando(false)}
            onError={() => setFalhou(true)}
          >
            <track kind="captions" />
          </video>
        ) : (
          <FallbackVisual nome={card.name} aoBaixar={baixar} />
        )}
      </div>
    )
  }

  // ── Arquivo sem preview (PDF/Office/ZIP/EXE/desconhecido) ───────────────
  return (
    <div className="artifact-card artifact-card-arquivo" role="group" aria-label={`${card.name}, arquivo sem visualização`}>
      {cabecalho}
      <p className="artifact-card-motivo">
        Formato sem visualização — use Baixar para abrir no aplicativo do sistema.
      </p>
    </div>
  )
}

/** Fallback quando o preview falha mas os bytes continuam íntegros. */
function FallbackVisual({ nome, aoBaixar }: { nome: string; aoBaixar: () => void }) {
  return (
    <div className="artifact-card-fallback" role="status">
      <ImageOff size={16} aria-hidden="true" />
      <span>Não foi possível exibir {nome} neste navegador.</span>
      <button type="button" className="artifact-card-botao-texto" onClick={aoBaixar}>
        Baixar arquivo
      </button>
    </div>
  )
}

/** Controles de play/pause expostos para leitores de tela (usado em testes). */
export function ControlesMidia({ tocando, aoAlternar }: { tocando: boolean; aoAlternar: () => void }) {
  return (
    <button type="button" className="artifact-card-botao" aria-pressed={tocando} onClick={aoAlternar}>
      {tocando ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
      {tocando ? 'Pausar' : 'Reproduzir'}
    </button>
  )
}
