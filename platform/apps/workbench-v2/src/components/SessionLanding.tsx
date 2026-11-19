// ============================================================================
// C-2 — landing: centro conforme 08_LAYOUT (título, faixa Chat/Pasta + seletor
// REAL de LLM na posição de Copilot, card com textarea/toolbar). Host
// fino: estado do rascunho no hook de submissão; seleção de catálogo no hook
// compartilhado; nenhuma regra de negócio nova aqui. This Computer AUSENTE;
// anexos/ditado indisponíveis com motivo (sem promessa de upload/voz).
// ============================================================================

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import {
  ArrowUp,
  Bot,
  ChevronDown,
  CircleAlert,
  Mic,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { LandingExecutionControls } from './LandingExecutionControls'
import { LandingContextMenu } from './LandingContextMenu'
import { useLandingSubmission, type ControleTentativa, type SubmitLanding } from '../hooks/useLandingSubmission'
import { useCatalogoModelos } from '../hooks/useCatalogoModelos'
import { isNavigationKey, nextRovingIndex } from '../domain/keyboardNavigation'
import { MODEL_AUTO, rotuloDaSelecao, tokenDaSelecao, tokenDoPar } from '../domain/selecaoModelo'
import type { SelecaoModelo } from '../bairros/2-inteligencia/casas/conversa'
import type { RascunhoLanding } from '../domain/landingDraft'
import type { Attachment } from '../types'
import { apagarArquivoVivo, guardarArquivoVivo } from '../domain/arquivosVivos'
import { nomeSeguroArquivo } from '../domain/anexosRascunho'

interface SessionLandingProps {
  workspace: string
  /** Raiz validada vigente (fonte do App); null em Chat. */
  workspacePath?: string | null
  /** Nome de exibição (selectedWorkspace.name); só entra no snapshot em Pasta. */
  workspaceName?: string | null
  /** C-1 (SPEC C §2) — modalidade explícita; default Chat (raiz nula). */
  contexto?: 'chat' | 'workspace'
  onChangeContexto?: (contexto: 'chat' | 'workspace') => void
  /** Contrato C-2: recebe o SNAPSHOT imutável da tentativa. */
  onSubmit: SubmitLanding
  /** Rascunho controlado pelo dono (App) — sobrevive a remounts da landing. */
  rascunhoControlado?: RascunhoLanding
  onChangeRascunho?: Dispatch<SetStateAction<RascunhoLanding>>
  /** C2-RV05 — tentativa controlada pelo dono: lock/identidade sobrevivem a remount. */
  tentativaControlada?: ControleTentativa
  onPickWorkspace?: () => void
  onValidateWorkspacePath?: (path: string) => Promise<void>
  workspaceSelectionDisabledReason?: string
  workspacePickerPending?: boolean
  isFileSystemSupported?: boolean
  /** Abre a tela REAL de Provedores (retorno atualiza o catálogo). */
  onOpenProvedores?: () => void
}

const MOTIVO_VOZ = 'Ditado por voz ainda não está disponível nesta versão.'
function useCliqueFora(
  aberto: boolean,
  wrapRef: RefObject<HTMLDivElement | null>,
  fechar: () => void,
  outraRef?: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!aberto) return
    const aoFora = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node) && !outraRef?.current?.contains(event.target as Node)) fechar()
    }
    document.addEventListener('pointerdown', aoFora, true)
    return () => document.removeEventListener('pointerdown', aoFora, true)
  }, [aberto, wrapRef, fechar, outraRef])
}

export function SessionLanding({
  workspace,
  workspacePath = null,
  workspaceName = null,
  contexto = 'chat',
  onChangeContexto,
  onSubmit,
  onPickWorkspace,
  onValidateWorkspacePath,
  workspaceSelectionDisabledReason,
  workspacePickerPending = false,
  isFileSystemSupported = true,
  onOpenProvedores,
  rascunhoControlado,
  onChangeRascunho,
  tentativaControlada,
}: SessionLandingProps) {
  const { rascunho, setText, setSelecaoModelo, setModo, setPermissao, setAnexos, pending: submitPending, submit: enviar } =
    useLandingSubmission(onSubmit, {
      contexto,
      workspacePath: contexto === 'chat' ? null : workspacePath,
      workspaceName: contexto === 'chat' ? null : (workspaceName ?? workspace),
    }, rascunhoControlado && onChangeRascunho ? { rascunho: rascunhoControlado, setRascunho: onChangeRascunho } : undefined,
    tentativaControlada)

  // — seletor REAL de LLM (posição do Copilot no frame) —
  const { itens: catalogo, erro: catalogoErro, atualizar: atualizarCatalogo } = useCatalogoModelos()
  const [modeloAberto, setModeloAberto] = useState(false)
  const [modeloAncora, setModeloAncora] = useState<'topo' | 'resumo'>('topo')
  const [catalogoCarregado, setCatalogoCarregado] = useState(false)
  const modeloResumoWrapRef = useRef<HTMLDivElement>(null)
  const modeloWrapRef = useRef<HTMLDivElement>(null)
  const modeloBotaoRef = useRef<HTMLButtonElement>(null)
  const modeloMenuRef = useRef<HTMLDivElement>(null)
  const primeiroItemRef = useRef<HTMLButtonElement>(null)
  const tokenSelecionado = tokenDaSelecao(rascunho.selecaoModelo)
  const itemSelecionado = catalogo.find(
    (item) => tokenDoPar(item.providerId, item.modelId) === tokenSelecionado,
  )
  const selecionadoIndisponivel =
    rascunho.selecaoModelo.tipo === 'explicita' &&
    catalogoCarregado &&
    catalogoErro === null &&
    !itemSelecionado
  // Rótulo exibido: LABEL do catálogo quando o par existe (ex.: "GPT-5");
  // sem item (Auto ou par removido), o token/rotulo canônico — honesto.
  const rotuloModelo = itemSelecionado?.label ?? rotuloDaSelecao(rascunho.selecaoModelo)

  const abrirModelo = (ancora: 'topo' | 'resumo' = 'topo') => {
    atualizarCatalogo()
    setCatalogoCarregado(true)
    setModeloAncora(ancora)
    setModeloAberto(true)
    window.setTimeout(() => primeiroItemRef.current?.focus(), 0)
  }
  const modeloResumoRef = useRef<HTMLButtonElement>(null)
  const fecharModelo = (devolverFoco = true) => {
    setModeloAberto(false)
    // C2-RV06 — devolver o foco ao acionador da âncora ABERTA (topo ou resumo).
    if (devolverFoco) (modeloAncora === 'resumo' ? modeloResumoRef : modeloBotaoRef).current?.focus()
  }
  useCliqueFora(modeloAberto, modeloWrapRef, () => fecharModelo(false), modeloResumoWrapRef)

  const escolherModelo = (selecao: SelecaoModelo) => {
    if (submitPending) return
    setSelecaoModelo({ ...selecao })
    fecharModelo()
  }

  const semPasta = contexto === 'chat'

  // — C-3a: seletor real de arquivos da landing —
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [arrastando, setArrastando] = useState(false)

  const adicionarArquivos = (files: FileList | File[]) => {
    const atuais = [...(rascunho.anexos ?? [])]
    for (const file of Array.from(files)) {
      const uploadId = crypto.randomUUID()
      const anexo: Attachment = {
        id: `local:${file.name}:${file.size}:${file.lastModified}`,
        name: nomeSeguroArquivo(file.name),
        kind: 'local',
        uploadId,
        estado: 'selecionado',
      }
      if (atuais.some((item) => item.id === anexo.id)) continue
      guardarArquivoVivo(uploadId, file)
      atuais.push(anexo)
    }
    setAnexos(atuais)
  }

  const removerAnexo = (id: string) => {
    const alvo = (rascunho.anexos ?? []).find((item) => item.id === id)
    if (alvo?.uploadId) apagarArquivoVivo(alvo.uploadId)
    setAnexos((rascunho.anexos ?? []).filter((item) => item.id !== id))
  }

  // — textarea: cresce com o conteúdo até 200px (e à área útil), depois rola —
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const alvo = textareaRef.current
    if (!alvo) return
    const ajustar = () => {
      alvo.style.height = 'auto'
      const contentHeight = alvo.scrollHeight
      const areaUtil = Math.max(50, window.innerHeight - 360)
      const teto = Math.min(200, areaUtil)
      alvo.style.height = `${Math.min(teto, Math.max(50, contentHeight))}px`
      alvo.style.overflowY = contentHeight > teto ? 'auto' : 'hidden'
    }
    ajustar()
    let width = alvo.getBoundingClientRect().width
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      const next = alvo.getBoundingClientRect().width
      if (next !== width) { width = next; ajustar() }
    })
    observer?.observe(alvo)
    window.addEventListener('resize', ajustar)
    return () => { observer?.disconnect(); window.removeEventListener('resize', ajustar) }
  }, [rascunho.texto])

  // C2-RV06 — navegação de menu com o MESMO helper do roving de lista:
  // Escape fecha; setas/Home/End movem o foco entre os itens do menu atual.
  const navegarNoMenu = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') return
    if (!isNavigationKey(event.key)) return
    const itens = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"],[role="menuitem"]'))
    const focado = itens.findIndex((item) => item === document.activeElement)
    const proximo = nextRovingIndex(event.key, { count: itens.length, current: focado })
    if (proximo >= 0 && itens[proximo]) {
      event.preventDefault()
      itens[proximo]!.focus()
    }
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    void enviar()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    // IME/composição (keyCode 229) nunca envia prematuramente.
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    event.preventDefault()
    void enviar()
  }

  const enviarDisponivel = (Boolean(rascunho.texto.trim()) || Boolean(rascunho.anexos?.length)) && !submitPending && !selecionadoIndisponivel

  // Menu do seletor: renderizado SOMENTE na âncora clicada (topo ou resumo).
  const menuModelos = modeloAberto ? (
                <div className="session-landing-menu session-landing-modelo-menu" role="menu" aria-label="Modelos disponíveis" ref={modeloMenuRef} onKeyDown={(event) => {
                  if (event.key === 'Escape') { event.preventDefault(); fecharModelo(); return }
                  navegarNoMenu(event)
                }}>
                  {catalogoErro && (
                    <div className="session-landing-menu-erro" role="alert">
                      <CircleAlert size={13} aria-hidden="true" />{catalogoErro}
                      <button type="button" onClick={() => { atualizarCatalogo(); setCatalogoCarregado(true) }}>
                        <RefreshCw size={12} aria-hidden="true" />Tentar novamente
                      </button>
                    </div>
                  )}
                  <button
                    ref={primeiroItemRef}
                    type="button"
                    role="menuitemradio"
                    aria-checked={rascunho.selecaoModelo.tipo === 'auto'}
                    className="session-landing-menu-item"
                    disabled={submitPending}
                    onClick={() => escolherModelo({ tipo: 'auto' })}
                  >
                    <Bot size={13} aria-hidden="true" />
                    <span><strong>{MODEL_AUTO}</strong><small>Resolve o padrão configurado no início de cada execução</small></span>
                  </button>
                  {catalogo.map((item) => {
                    const token = tokenDoPar(item.providerId, item.modelId)
                    return (
                      <button
                        key={token}
                        type="button"
                        role="menuitemradio"
                        aria-checked={tokenSelecionado === token}
                        className="session-landing-menu-item"
                        disabled={submitPending}
                        onClick={() => escolherModelo({ tipo: 'explicita', providerId: item.providerId, modelId: item.modelId })}
                      >
                        <span><strong>{item.label}</strong><small>{item.providerId} · {item.protocol}</small></span>
                      </button>
                    )
                  })}
                  {!catalogoErro && catalogo.length === 0 && (
                    <p className="session-landing-menu-vazio" role="status">Nenhum modelo configurado. Abra Provedores para adicionar.</p>
                  )}
                  {onOpenProvedores && (
                    <button type="button" className="session-landing-menu-acoes" role="menuitem" disabled={submitPending} onClick={() => { fecharModelo(false); onOpenProvedores() }}>
                      Abrir Provedores
                    </button>
                  )}
                </div>
  ) : null

  return (
    <section className="session-landing" aria-label="Nova sessão">
      <div className="session-landing-center">
        <h1 className="session-landing-title">O que vamos construir?</h1>

        {/* faixa superior: Chat/Pasta + contexto local + seletor de LLM */}
        <div className="session-landing-faixa" role="group" aria-label="Contexto e modelo">
          <LandingContextMenu contexto={contexto} workspace={workspace} workspacePath={workspacePath}
            onChangeContexto={onChangeContexto} onPickWorkspace={onPickWorkspace}
            onValidateWorkspacePath={onValidateWorkspacePath} disabled={submitPending}
            disabledReason={workspaceSelectionDisabledReason} pickerPending={workspacePickerPending}
            nativeAvailable={isFileSystemSupported} />

          {/* seletor REAL de LLM na posição de Copilot (C2-R01/R04) */}
          <div className="session-landing-modelo-wrap" ref={modeloWrapRef}>
            <button
              ref={modeloBotaoRef}
              type="button"
              className="session-landing-chip is-clickable session-landing-modelo-topo"
              aria-haspopup="menu"
              aria-expanded={modeloAberto}
              aria-label={`Modelo: ${rotuloModelo}. Escolher modelo`}
              data-testid="landing-modelo-topo"
              disabled={submitPending}
              onClick={() => (modeloAberto && modeloAncora === 'topo' ? fecharModelo() : abrirModelo('topo'))}
            >
              <Bot size={14} aria-hidden="true" />
              {selecionadoIndisponivel ? `Indisponível — ${rotuloModelo}` : rotuloModelo}
              <ChevronDown size={13} aria-hidden="true" />
            </button>
            {modeloAncora === 'topo' && menuModelos}
          </div>
        </div>

        {/* card do composer */}
        <form
          className={`session-landing-input${arrastando ? ' is-drop-target' : ''}`}
          onSubmit={submit}
          aria-busy={submitPending}
          onDragOver={(event) => {
            if (Array.from(event.dataTransfer.types).includes('Files')) {
              event.preventDefault()
              setArrastando(true)
            }
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(event) => {
            setArrastando(false)
            const files = Array.from(event.dataTransfer.files ?? [])
            if (files.length > 0 && !submitPending) {
              event.preventDefault()
              adicionarArquivos(files)
            }
          }}
        >
          <textarea
            ref={textareaRef}
            className="session-landing-textarea"
            placeholder="O que você está tentando fazer?"
            aria-label="Mensagem para a nova sessão"
            value={rascunho.texto}
            readOnly={submitPending}
            rows={1}
            /* cols mínimo: a min-content do textarea (cols padrão=20) estourava a
               coluna em 800x600 (08 §viewport "sem corte"); o CSS fixa a largura. */
            cols={1}
            autoFocus
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          {(rascunho.anexos?.length ?? 0) > 0 && (
            <div className="attachments-row session-landing-anexos" role="list" aria-label="Arquivos anexados">
              {/* C-3a — a MESMA escolha da conversa, antes do primeiro envio.
                  Só existe com Pasta selecionada (Chat sem pasta não copia);
                  padrão desmarcado = armazenamento privado. A escolha vive no
                  anexo (`modoCopia`), então sobrevive a F5 e à retentativa, e
                  o primeiro envio já a respeita (`enviarAnexos`). */}
              {(rascunho.anexos ?? []).some((anexo) => anexo.kind === 'local') && Boolean(workspacePath) && contexto !== 'chat' && (
                <label className="attachment-modocopia" title="R03 — cópia na pasta do projeto só por escolha explícita">
                  <input
                    type="checkbox"
                    aria-label="Salvar cópia na pasta do projeto"
                    checked={(rascunho.anexos ?? []).filter((a) => a.kind === 'local').length > 0
                      && (rascunho.anexos ?? []).filter((a) => a.kind === 'local').every((a) => a.modoCopia === 'projeto')}
                    disabled={submitPending}
                    onChange={(event) => {
                      const marcado = event.target.checked
                      setAnexos((rascunho.anexos ?? []).map((anexo) => anexo.kind === 'local'
                        ? { ...anexo, modoCopia: marcado ? 'projeto' : 'privado' } : anexo))
                    }}
                  />
                  Salvar cópia na pasta do projeto
                </label>
              )}
              {(rascunho.anexos ?? []).map((anexo) => (
                <span
                  className="attachment-chip"
                  key={anexo.id}
                  role="group"
                  aria-label={`${anexo.name}, arquivo local${anexo.estado === 'transferindo' ? ' · transferindo' : anexo.estado === 'pronto' ? ' · salvo' : anexo.estado === 'falhou' ? ' · falhou' : ' · selecionado'} — armazenado; não enviado ao modelo`}
                  title={`${anexo.name} · local · armazenado; não enviado ao modelo`}
                >
                  <span className="attachment-chip-name">{anexo.name}</span>
                  <span className="attachment-chip-kind" aria-hidden="true">local</span>
                  <button
                    className="attachment-remove"
                    type="button"
                    aria-label={`Remover ${anexo.name}`}
                    onClick={() => removerAnexo(anexo.id)}
                  ><span aria-hidden="true">×</span></button>
                </span>
              ))}
            </div>
          )}
          <div className="session-landing-toolbar">
            <div className="session-landing-toolbar-left">
              <button
                type="button"
                className="session-landing-icon-button"
                aria-label="Adicionar contexto"
                title="Anexar arquivo"
                disabled={submitPending}
                data-testid="landing-anexos"
                onClick={() => fileInputRef.current?.click()}
              ><Plus size={15} /></button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                aria-label="Selecionar arquivos para anexar"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  if (files.length > 0) adicionarArquivos(files)
                  event.target.value = ''
                }}
              />

              <LandingExecutionControls modo={rascunho.modo} permissao={rascunho.permissao}
                semPasta={semPasta} pending={submitPending} onModo={setModo} onPermissao={setPermissao} />
            </div>

            <div className="session-landing-toolbar-right">
              {/* resumo/atalho inferior: espelha a MESMA seleção do topo */}
              <div className="session-landing-menu-wrap session-landing-modelo-resumo-wrap" ref={modeloResumoWrapRef}>
                <button
                  ref={modeloResumoRef}
                  type="button"
                  className="session-landing-pill session-landing-modelo-resumo"
                  aria-haspopup="menu"
                  aria-expanded={modeloAberto}
                  aria-label={`Resumo do modelo: ${rotuloModelo}`}
                  data-testid="landing-modelo-resumo"
                  disabled={submitPending}
                  onClick={() => (modeloAberto && modeloAncora === 'resumo' ? fecharModelo() : abrirModelo('resumo'))}
                ><Bot size={13} aria-hidden="true" />{rotuloModelo}<ChevronDown size={12} aria-hidden="true" /></button>
                {modeloAncora === 'resumo' && menuModelos}
              </div>
              <button
                type="button"
                className="session-landing-icon-button"
                aria-label="Ditar por voz"
                title={MOTIVO_VOZ}
                aria-disabled="true"
                disabled
                data-testid="landing-voz-indisponivel"
              ><Mic size={15} /></button>
              <button
                type="submit"
                className="session-landing-send"
                aria-label="Enviar mensagem"
                title="Enviar"
                disabled={!enviarDisponivel}
              ><ArrowUp size={15} /></button>
            </div>
          </div>
        </form>

        {selecionadoIndisponivel && (
          <p className="session-landing-aviso" role="alert" data-testid="landing-modelo-indisponivel">
            <CircleAlert size={13} aria-hidden="true" />
            O modelo selecionado não está mais disponível. Escolha outro modelo ou abra Provedores.
            {onOpenProvedores && <button type="button" onClick={onOpenProvedores}>Abrir Provedores</button>}
          </p>
        )}

        {submitPending && <p role="status">Criando conversa. Sua mensagem está preservada.</p>}

        {contexto === 'chat' && (
          <p className="session-landing-motivo" data-testid="landing-motivo-chat">
            Chat começa em <strong>Perguntar</strong> com permissões manuais; workspace com pasta libera os demais modos.
          </p>
        )}
      </div>
    </section>
  )
}
