// ============================================================================
// U-1 — MOLDURA NEUTRA DO MODAL DE CONFIGURAÇÕES (shell).
//
// Esta é a única moldura. Ela NÃO importa Casa nenhuma: recebe o menu, a rota
// e o conteúdo por composição (barrels). As Casas continuam donas de
// validação, endpoints, segredos e persistência; aqui só existe navegação,
// foco e layout (R10).
//
// Comportamento herdado da moldura de Personalizações (D182/D183), que a spec
// manda reaproveitar: portal para o body, `.app-frame` inert (as superfícies
// externas seguem MONTADAS — chat, editor, terminal), trap de Tab no diálogo,
// Escape e devolução de foco ao acionador.
//
// O que mudou, por decisão desta fatia:
//   · nasce EXPANDIDO e permite restaurar (R01);
//   · o menu passa a ser do modal (antes cada tela tinha a própria coluna);
//   · painéis são montados de forma preguiçosa por visita e OCULTADOS (não
//     desmontados) ao trocar de categoria, saindo da navegação e do foco (R02).
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, Minimize, X } from 'lucide-react'
import {
  MENU_CONFIGURACOES,
  MODO_INICIAL,
  alternarModo,
  categoriaImplementada,
  labelDaCategoria,
  type CategoriaConfiguracoes,
  type ModoModal,
  type RotaConfiguracoes,
  type SubsecaoPersonalizacoes,
} from '../domain/configuracoesUnificadas'
import './configuracoesUnificadas.css'

export interface ItemPainel {
  /** Conteúdo do painel. Montado na primeira visita e preservado depois. */
  conteudo: React.ReactNode
  /** `false` para painéis que ainda não têm tela (explicam o limite). */
  montavel: boolean
}

export interface ConfiguracoesUnificadasProps {
  rota: RotaConfiguracoes
  onNavegar: (rota: RotaConfiguracoes) => void
  onFechar: () => void
  /**
   * Conteúdo por categoria. A moldura NÃO cria painéis: quem os fornece é a
   * composição (o App), que recebe cada Casa pelo seu barrel.
   */
  paineis: Partial<Record<CategoriaConfiguracoes, ItemPainel>>
  /** Subseções de Personalizações, para a navegação comum (R02). */
  subsecoes?: readonly { id: SubsecaoPersonalizacoes; label: string }[]
  /** Título da subseção ativa, exposto no cabeçalho do conteúdo. */
  tituloSubsecao?: string
  /** Mensagem de confirmação de descarte quando há rascunho (R07). */
  confirmacaoAberta?: boolean
  onContinuarEditando?: () => void
  onDescartarRascunhos?: () => void
  /** Save em curso: fechar aguarda o resultado em vez de descartar (R07). */
  salvando?: boolean
  /** R08 — acionador capturado na abertura; o foco volta para ele no fechamento. */
  focoDeRetorno?: () => HTMLElement | null
}

const CHAVE_FOCO = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'

export function ConfiguracoesUnificadas({
  rota, onNavegar, onFechar, paineis, subsecoes, tituloSubsecao,
  confirmacaoAberta = false, onContinuarEditando, onDescartarRascunhos, salvando = false,
  focoDeRetorno,
}: ConfiguracoesUnificadasProps) {
  const [modo, setModo] = useState<ModoModal>(MODO_INICIAL)
  const dialog = useRef<HTMLElement>(null)
  const nav = useRef<HTMLElement>(null)
  const fechar = useRef(onFechar)
  fechar.current = onFechar
  // Instâncias já visitadas: preservadas até o modal fechar (R02/R07).
  const [visitadas, setVisitadas] = useState<ReadonlySet<CategoriaConfiguracoes>>(
    () => new Set<CategoriaConfiguracoes>([rota.categoria]),
  )

  useEffect(() => {
    setVisitadas((atual) => (atual.has(rota.categoria) ? atual : new Set([...atual, rota.categoria])))
  }, [rota.categoria])

  // Inert + devolução de foco: as superfícies externas ficam MONTADAS (o chat,
  // o editor e o terminal não param) mas não recebem teclado por trás.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    // R08 — devolver o foco ao ACIONADOR. Quando a entrada é um item de menu
    // (Conta → Provedores, "+" → Personalizações), o item deixa de existir
    // assim que o menu fecha; o acionador real é o botão que abriu o menu.
    const acionador = focoDeRetorno?.() ?? anterior?.closest<HTMLElement>('[aria-haspopup]') ?? anterior
    const app = document.querySelector<HTMLElement>('.app-frame')
    const eraInert = app?.inert ?? false
    if (app) app.inert = true
    dialog.current?.focus()
    return () => {
      if (app) app.inert = eraInert
      if (acionador?.isConnected) acionador.focus()
    }
    // O acionador é lido uma única vez, na montagem: o modal não remonta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aoTecla = (event: React.KeyboardEvent): void => {
    event.stopPropagation()
    if (confirmacaoAberta) return
    if (event.key === 'Escape') {
      event.preventDefault()
      fechar.current()
      return
    }
    if (event.key === 'Tab') {
      // Trap só no que está VISÍVEL: painel oculto não recebe foco (R08).
      const itens = Array.from(dialog.current?.querySelectorAll<HTMLElement>(CHAVE_FOCO) ?? [])
        .filter((item) => item.getClientRects().length > 0 && !item.closest('[hidden]'))
      if (!itens.length) return
      const indice = itens.indexOf(document.activeElement as HTMLElement)
      const proximo = indice < 0
        ? (event.shiftKey ? itens.length - 1 : 0)
        : (indice + (event.shiftKey ? -1 : 1) + itens.length) % itens.length
      event.preventDefault()
      itens[proximo]?.focus()
    }
  }

  const setas = (event: React.KeyboardEvent): void => {
    const teclas = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!teclas.includes(event.key)) return
    const itens = Array.from(nav.current?.querySelectorAll<HTMLButtonElement>('button[data-categoria]') ?? [])
    const atual = itens.indexOf(document.activeElement as HTMLButtonElement)
    if (atual < 0) return
    event.preventDefault()
    const total = itens.length
    const destino = event.key === 'Home' ? 0
      : event.key === 'End' ? total - 1
        : (atual + ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') ? -1 : 1) + total) % total
    itens[destino]?.focus()
  }

  const navegar = (categoria: CategoriaConfiguracoes): void => {
    onNavegar(categoria === 'personalizacoes' ? { categoria, subsecao: 'visao' } : { categoria })
  }

  const aberta = rota.categoria
  const painelAtivo = paineis[aberta]
  const subsecoesEfetivas = aberta === 'personalizacoes' ? subsecoes ?? [] : []

  return createPortal(
    <div
      className="config-unificadas-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault()
          dialog.current?.focus()
        }
      }}
      onKeyDown={aoTecla}
    >
      <section
        ref={dialog}
        className={`config-unificadas${modo === 'expandido' ? ' is-expandido' : ' is-restaurado'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        tabIndex={-1}
        data-modo={modo}
      >
        <header className="config-unificadas-title">
          <h1>Configurações</h1>
          <div className="config-unificadas-title-acoes">
            <button
              type="button"
              aria-label={modo === 'expandido' ? 'Restaurar configurações' : 'Maximizar configurações'}
              aria-pressed={modo === 'expandido'}
              onClick={() => setModo(alternarModo)}
            >
              {modo === 'expandido' ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
            <button type="button" aria-label="Fechar configurações" onClick={onFechar}>
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="config-unificadas-corpo">
          <nav
            ref={nav}
            className="config-unificadas-nav"
            aria-label="Categorias de configurações"
            onKeyDown={setas}
          >
            {MENU_CONFIGURACOES.map((grupo) => (
              <div key={grupo.id} className="config-unificadas-grupo" role="group" aria-label={grupo.label}>
                <span className="config-unificadas-grupo-titulo" aria-hidden="true">{grupo.label}</span>
                {grupo.entradas.map((entrada) => {
                  const ativa = entrada.id === aberta
                  return (
                    <button
                      key={entrada.id}
                      type="button"
                      data-categoria={entrada.id}
                      aria-current={ativa ? 'page' : undefined}
                      className={ativa ? 'is-ativa' : undefined}
                      onClick={() => navegar(entrada.id)}
                    >
                      <span className="config-unificadas-item-label">{entrada.label}</span>
                      {!entrada.implementada && <span className="config-unificadas-item-futuro" aria-hidden="true">·</span>}
                    </button>
                  )
                })}
                {/* Subseções de Personalizações: mesma navegação, sem segunda
                    coluna (R02). Só aparecem quando a categoria está aberta. */}
                {grupo.entradas.some((entrada) => entrada.id === 'personalizacoes') && aberta === 'personalizacoes' && (
                  <div className="config-unificadas-subnav" role="group" aria-label="Seções de Personalizações">
                    {subsecoesEfetivas.map((subsecao) => (
                      <button
                        key={subsecao.id}
                        type="button"
                        data-subsecao={subsecao.id}
                        aria-current={rota.subsecao === subsecao.id ? 'page' : undefined}
                        onClick={() => onNavegar({ categoria: 'personalizacoes', subsecao: subsecao.id })}
                      >
                        {subsecao.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="config-unificadas-conteudo" role="region" aria-label={tituloSubsecao ?? labelDaCategoria(aberta)}>
            <h2 className="config-unificadas-titulo-conteudo">{tituloSubsecao ?? labelDaCategoria(aberta)}</h2>
            {/* Painéis visitados ficam MONTADOS; só o ativo é visível.
                `hidden` tira do foco, dos atalhos e do leitor de tela (R02). */}
            {[...visitadas].map((categoria) => {
              const painel = paineis[categoria]
              if (!painel || !painel.montavel) return null
              return (
                <div
                  key={categoria}
                  data-painel={categoria}
                  hidden={categoria !== aberta}
                  aria-hidden={categoria !== aberta ? true : undefined}
                >
                  {painel.conteudo}
                </div>
              )
            })}
            {/* Categoria sem implementação: explica o limite, sem ação falsa. */}
            {!categoriaImplementada(aberta) && (
              <div className="config-unificadas-indisponivel" role="status" data-categoria-futura={aberta}>
                <p>Esta funcionalidade ainda não está disponível nesta versão.</p>
              </div>
            )}
            {/* Painel implementado mas que ainda não montou por falha própria:
                a moldura nunca inventa sucesso no lugar dele. */}
            {categoriaImplementada(aberta) && painelAtivo && !painelAtivo.montavel && (
              <div className="config-unificadas-indisponivel" role="status">
                <p>Este painel não pôde ser carregado.</p>
              </div>
            )}
          </div>
        </div>

        {confirmacaoAberta && (
          <div className="config-unificadas-confirmacao" role="alertdialog" aria-label="Descartar rascunhos" aria-modal="true">
            <p>Há alterações não salvas nesta janela. Elas serão descartadas.</p>
            <p className="config-unificadas-confirmacao-nota">
              O que já foi confirmado pelo servidor permanece.
            </p>
            <div className="config-unificadas-confirmacao-acoes">
              <button type="button" onClick={onContinuarEditando} data-acao="continuar">Continuar editando</button>
              <button
                type="button"
                onClick={onDescartarRascunhos}
                disabled={salvando}
                data-acao="descartar"
              >
                {salvando ? 'Aguardando salvamento…' : 'Descartar rascunhos'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}
