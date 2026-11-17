// ============================================================================
// C-2 — landing: centro conforme 08_LAYOUT (título, faixa Chat/Pasta + seletor
// REAL de LLM na posição de Copilot, card com textarea/toolbar, dica). Host
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
  FolderGit2,
  MessageSquare,
  Mic,
  Plus,
  RefreshCw,
  ShieldCheck,
  Wand2,
} from 'lucide-react'
import { useLandingSubmission, type SubmitLanding } from '../hooks/useLandingSubmission'
import { useCatalogoModelos } from '../hooks/useCatalogoModelos'
import { MODEL_AUTO, rotuloDaSelecao, tokenDaSelecao, tokenDoPar } from '../domain/selecaoModelo'
import type { SelecaoModelo } from '../bairros/2-inteligencia/casas/conversa'
import type { ModoAgir, NivelPermissaoAgir } from '../bairros/2-inteligencia/casas/agir'
import type { RascunhoLanding } from '../domain/landingDraft'

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
  onPickWorkspace?: () => void
  onValidateWorkspacePath?: (path: string) => Promise<void>
  onListWorkspaceDirectories?: (path: string) => Promise<Array<{ name: string; path: string }>>
  workspaceSelectionDisabledReason?: string
  workspacePickerPending?: boolean
  isFileSystemSupported?: boolean
  /** Abre a tela REAL de Provedores (retorno atualiza o catálogo). */
  onOpenProvedores?: () => void
}

const MOTIVO_ANEXOS = 'Anexos ainda não estão disponíveis nesta versão.'
const MOTIVO_VOZ = 'Ditado por voz ainda não está disponível nesta versão.'
const MOTIVO_CHAT_MODO = 'Conversa Chat começa em Perguntar/manual. Para Planejar, Editar ou Agente, inicie uma conversa com pasta.'
const MOTIVO_CHAT_PERMISSAO = 'Conversa Chat não tem pasta: "Permitir tudo" exige uma conversa workspace.'

const MODOS: Array<{ id: ModoAgir; label: string }> = [
  { id: 'agent', label: 'Agente' },
  { id: 'edit', label: 'Editar' },
  { id: 'ask', label: 'Perguntar' },
  { id: 'plan', label: 'Planejar' },
]

const ROTULOS_PERMISSAO: Record<NivelPermissaoAgir, string> = {
  manual: 'Permissões manuais',
  'allow-all': 'Permitir tudo',
}

function useCliqueFora(
  aberto: boolean,
  wrapRef: RefObject<HTMLDivElement | null>,
  fechar: () => void,
) {
  useEffect(() => {
    if (!aberto) return
    const aoFora = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) fechar()
    }
    document.addEventListener('pointerdown', aoFora, true)
    return () => document.removeEventListener('pointerdown', aoFora, true)
  }, [aberto, wrapRef, fechar])
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
  onListWorkspaceDirectories,
  workspaceSelectionDisabledReason,
  workspacePickerPending = false,
  isFileSystemSupported = true,
  onOpenProvedores,
  rascunhoControlado,
  onChangeRascunho,
}: SessionLandingProps) {
  const { rascunho, setText, setSelecaoModelo, setModo, setPermissao, pending: submitPending, submit: enviar } =
    useLandingSubmission(onSubmit, {
      contexto,
      workspacePath: contexto === 'chat' ? null : workspacePath,
      workspaceName: contexto === 'chat' ? null : (workspaceName ?? workspace),
    }, rascunhoControlado && onChangeRascunho ? { rascunho: rascunhoControlado, setRascunho: onChangeRascunho } : undefined)

  // — workspace manual (C-1, preservado) —
  const [manualPathOpen, setManualPathOpen] = useState(!isFileSystemSupported)
  const [manualPath, setManualPath] = useState('')
  const [manualPathError, setManualPathError] = useState('')
  const [manualPathPending, setManualPathPending] = useState(false)
  const [directoryOptions, setDirectoryOptions] = useState<Array<{ name: string; path: string }>>([])
  const [directoryListPending, setDirectoryListPending] = useState(false)
  useEffect(() => { if (!isFileSystemSupported) setManualPathOpen(true) }, [isFileSystemSupported])
  useEffect(() => {
    if (!manualPathOpen || !onListWorkspaceDirectories || !manualPath.trim()) { setDirectoryOptions([]); return }
    const path = manualPath.endsWith('/') || manualPath.endsWith('\\') ? manualPath : manualPath.replace(/[\\/][^\\/]*$/, '') || '/'
    const timer = window.setTimeout(() => {
      setDirectoryListPending(true)
      void onListWorkspaceDirectories(path)
        .then(setDirectoryOptions)
        .catch(() => setDirectoryOptions([]))
        .finally(() => setDirectoryListPending(false))
    }, 120)
    return () => window.clearTimeout(timer)
  }, [manualPath, manualPathOpen, onListWorkspaceDirectories])

  const chooseDirectory = (path: string) => {
    const separator = path.includes('\\') && !path.includes('/') ? '\\' : '/'
    setManualPath(path.endsWith(separator) ? path : `${path}${separator}`)
  }

  const validateManualPath = async () => {
    if (!manualPath.trim() || !onValidateWorkspacePath) return
    setManualPathPending(true); setManualPathError('')
    try { await onValidateWorkspacePath(manualPath.trim()); setManualPathOpen(false) }
    catch (error) { setManualPathError(error instanceof Error ? error.message : 'Pasta inválida') }
    finally { setManualPathPending(false) }
  }

  // — seletor REAL de LLM (posição do Copilot no frame) —
  const { itens: catalogo, erro: catalogoErro, atualizar: atualizarCatalogo } = useCatalogoModelos()
  const [modeloAberto, setModeloAberto] = useState(false)
  const [modeloAncora, setModeloAncora] = useState<'topo' | 'resumo'>('topo')
  const [catalogoCarregado, setCatalogoCarregado] = useState(false)
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
  const fecharModelo = (devolverFoco = true) => {
    setModeloAberto(false)
    if (devolverFoco) modeloBotaoRef.current?.focus()
  }
  useCliqueFora(modeloAberto, modeloWrapRef, () => fecharModelo(false))

  const escolherModelo = (selecao: SelecaoModelo) => {
    setSelecaoModelo({ ...selecao })
    fecharModelo()
  }

  // — menus de modo/permissão —
  const [modoAberto, setModoAberto] = useState(false)
  const modoWrapRef = useRef<HTMLDivElement>(null)
  const modoBotaoRef = useRef<HTMLButtonElement>(null)
  useCliqueFora(modoAberto, modoWrapRef, () => { setModoAberto(false); modoBotaoRef.current?.focus() })
  const [permissaoAberta, setPermissaoAberta] = useState(false)
  const permissaoWrapRef = useRef<HTMLDivElement>(null)
  const permissaoBotaoRef = useRef<HTMLButtonElement>(null)
  useCliqueFora(permissaoAberta, permissaoWrapRef, () => { setPermissaoAberta(false); permissaoBotaoRef.current?.focus() })

  const semPasta = contexto === 'chat'
  const modoEfetivo = semPasta ? 'ask' : rascunho.modo
  const permissaoEfetiva: NivelPermissaoAgir = semPasta ? 'manual' : rascunho.permissao

  const escolherModo = (id: ModoAgir) => {
    if (semPasta) return
    setModo(id)
    setModoAberto(false)
    modoBotaoRef.current?.focus()
  }
  const escolherPermissao = (id: NivelPermissaoAgir) => {
    if (semPasta) return
    if (id === 'allow-all') {
      const aceitou = window.confirm('ATENÇÃO — Permitir tudo: tools e comandos de terminal poderão executar sem confirmações individuais, acessar arquivos fora do workspace e modificar ou apagar dados, limitados pelos privilégios da sua conta no sistema operacional. Perguntar e Planejar continuam somente leitura; proteções do servidor e da origem local permanecem ativas. Você pode voltar a Permissões manuais a qualquer momento. Ativar?')
      if (!aceitou) { setPermissaoAberta(false); permissaoBotaoRef.current?.focus(); return }
    }
    setPermissao(id)
    setPermissaoAberta(false)
    permissaoBotaoRef.current?.focus()
  }

  // — textarea: cresce com o conteúdo até 200px (e à área útil), depois rola —
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const alvo = textareaRef.current
    if (!alvo) return
    alvo.style.height = 'auto'
    const contentHeight = alvo.scrollHeight
    const areaUtil = Math.max(50, window.innerHeight - 360)
    const teto = Math.min(200, areaUtil)
    const nextHeight = Math.min(teto, Math.max(50, contentHeight))
    alvo.style.height = `${nextHeight}px`
    alvo.style.overflowY = contentHeight > teto ? 'auto' : 'hidden'
  }, [rascunho.texto])

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

  const enviarDisponivel = Boolean(rascunho.texto.trim()) && !submitPending && !selecionadoIndisponivel

  // Menu do seletor: renderizado SOMENTE na âncora clicada (topo ou resumo).
  const menuModelos = modeloAberto ? (
                <div className="session-landing-menu session-landing-modelo-menu" role="menu" aria-label="Modelos disponíveis" ref={modeloMenuRef} onKeyDown={(event) => {
                  if (event.key === 'Escape') { event.preventDefault(); fecharModelo() }
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
                    <button type="button" className="session-landing-menu-acoes" role="menuitem" onClick={() => { fecharModelo(false); onOpenProvedores() }}>
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
          {onChangeContexto && (
            <div className="session-landing-contexto" role="group" aria-label="Modalidade da conversa">
              <button
                type="button"
                className={`session-landing-contexto-option${contexto === 'chat' ? ' is-active' : ''}`}
                aria-pressed={contexto === 'chat'}
                data-testid="contexto-chat"
                onClick={() => onChangeContexto('chat')}
              >Chat</button>
              <button
                type="button"
                className={`session-landing-contexto-option${contexto === 'workspace' ? ' is-active' : ''}`}
                aria-pressed={contexto === 'workspace'}
                data-testid="contexto-workspace"
                onClick={() => onChangeContexto('workspace')}
              >Pasta</button>
            </div>
          )}

          {/* chips de estado (C-1 preservado): Chat sem pasta / pasta escolhida */}
          {contexto === 'chat' && (
            <span className="session-landing-chip" data-testid="landing-chat-chip" title="Conversa sem pasta: sem worktree, sem arquivos locais e sem Git."><MessageSquare size={14} aria-hidden="true" />Chat sem pasta</span>
          )}
          {contexto === 'workspace' && (onPickWorkspace || workspaceSelectionDisabledReason) ? (
            <button
              className="session-landing-chip is-clickable"
              type="button"
              title={workspaceSelectionDisabledReason ?? (isFileSystemSupported ? 'Escolher pasta real do disco' : 'File System API não suportada')}
              aria-label={workspaceSelectionDisabledReason ? `Workspace atual: ${workspace}. ${workspaceSelectionDisabledReason}` : `Workspace atual: ${workspace}. Clique para escolher pasta real`}
              onClick={onPickWorkspace}
              disabled={Boolean(workspaceSelectionDisabledReason) || workspacePickerPending}
              aria-busy={workspacePickerPending}
            >
              <FolderGit2 size={14} aria-hidden="true" />{workspace}<ChevronDown size={13} aria-hidden="true" />
            </button>
          ) : contexto === 'workspace' ? (
            <span className="session-landing-chip" data-testid="landing-workspace-chip"><FolderGit2 size={14} aria-hidden="true" />{workspace}</span>
          ) : null}

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
              onClick={() => (modeloAberto && modeloAncora === 'topo' ? fecharModelo() : abrirModelo('topo'))}
            >
              <Bot size={14} aria-hidden="true" />
              {selecionadoIndisponivel ? `Indisponível — ${rotuloModelo}` : rotuloModelo}
              <ChevronDown size={13} aria-hidden="true" />
            </button>
            {modeloAncora === 'topo' && menuModelos}
          </div>
        </div>

        {contexto === 'workspace' && (workspaceSelectionDisabledReason || onPickWorkspace || onValidateWorkspacePath) && (
          <div className="session-landing-workspace-choice">
            <p className="session-landing-workspace-hint">
              {workspaceSelectionDisabledReason ?? (isFileSystemSupported ? <>Clique em <strong>{workspace}</strong> para escolher pasta real do disco</> : <>O seletor nativo não está disponível neste sistema.</>)}
              {onValidateWorkspacePath && <button type="button" className="session-landing-manual-toggle" onClick={() => setManualPathOpen((value) => !value)}>Digitar caminho</button>}
            </p>
            {manualPathOpen && onValidateWorkspacePath && <div className="session-landing-manual-path">
              <div className="session-landing-path-combobox">
                <input role="combobox" aria-expanded={directoryOptions.length > 0} aria-controls="workspace-directory-options" aria-autocomplete="list" value={manualPath} onChange={(event) => { setManualPath(event.target.value); setManualPathError('') }} placeholder="/caminho/da/pasta" aria-label="Caminho manual do workspace" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void validateManualPath() } }} />
                {(directoryOptions.length > 0 || directoryListPending) && <div id="workspace-directory-options" className="session-landing-directory-options" role="listbox" aria-label="Pastas disponíveis">
                  {directoryListPending && <div className="session-landing-directory-loading">Listando pastas…</div>}
                  {!directoryListPending && directoryOptions.map((directory) => <button type="button" role="option" aria-selected="false" key={directory.path} onClick={() => chooseDirectory(directory.path)}><FolderGit2 size={13} /><span>{directory.name}</span><small>{directory.path}</small></button>)}
                </div>}
              </div>
              <button type="button" onClick={() => void validateManualPath()} disabled={manualPathPending || !manualPath.trim()}>{manualPathPending ? 'Validando…' : 'Usar pasta'}</button>
              {manualPathError && <span role="alert">{manualPathError}</span>}
            </div>}
          </div>
        )}

        {/* card do composer */}
        <form className="session-landing-input" onSubmit={submit} aria-busy={submitPending}>
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
          <div className="session-landing-toolbar">
            <div className="session-landing-toolbar-left">
              <button
                type="button"
                className="session-landing-icon-button"
                aria-label="Adicionar contexto"
                title={MOTIVO_ANEXOS}
                aria-disabled="true"
                disabled
                data-testid="landing-anexos-indisponivel"
              ><Plus size={15} /></button>

              {/* modo (esquerda) — mesmo estado do resumo inferior */}
              <div className="session-landing-menu-wrap" ref={modoWrapRef}>
                <button
                  ref={modoBotaoRef}
                  type="button"
                  className="session-landing-pill"
                  aria-haspopup="menu"
                  aria-expanded={modoAberto}
                  aria-label={semPasta
                    ? `Modo: Perguntar (único em Chat). ${MOTIVO_CHAT_MODO}`
                    : `Modo: ${MODOS.find((item) => item.id === modoEfetivo)?.label ?? modoEfetivo}`}
                  title={semPasta ? MOTIVO_CHAT_MODO : 'Modo da conversa'}
                  disabled={semPasta}
                  onClick={() => setModoAberto((value) => !value)}
                ><Wand2 size={13} aria-hidden="true" />{MODOS.find((item) => item.id === modoEfetivo)?.label ?? modoEfetivo}<ChevronDown size={12} aria-hidden="true" /></button>
                {modoAberto && !semPasta && (
                  <div className="session-landing-menu" role="menu" aria-label="Modos" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setModoAberto(false); modoBotaoRef.current?.focus() } }}>
                    {MODOS.map((item) => (
                      <button key={item.id} type="button" role="menuitemradio" aria-checked={rascunho.modo === item.id} className="session-landing-menu-item" onClick={() => escolherModo(item.id)}>
                        <span><strong>{item.label}</strong></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="session-landing-status-pill" data-testid="landing-interativo" title="Estado do composer">Interativo</span>

              {/* permissão */}
              <div className="session-landing-menu-wrap" ref={permissaoWrapRef}>
                <button
                  ref={permissaoBotaoRef}
                  type="button"
                  className={`session-landing-pill${permissaoEfetiva === 'allow-all' ? ' is-risky' : ''}`}
                  aria-haspopup="menu"
                  aria-expanded={permissaoAberta}
                  aria-label={semPasta
                    ? `Permissão: Permissões manuais (única em Chat). ${MOTIVO_CHAT_PERMISSAO}`
                    : `Permissão: ${ROTULOS_PERMISSAO[permissaoEfetiva]}`}
                  title={semPasta ? MOTIVO_CHAT_PERMISSAO : 'Permissões da conversa'}
                  disabled={semPasta}
                  onClick={() => setPermissaoAberta((value) => !value)}
                ><ShieldCheck size={13} aria-hidden="true" />{ROTULOS_PERMISSAO[permissaoEfetiva]}<ChevronDown size={12} aria-hidden="true" /></button>
                {permissaoAberta && !semPasta && (
                  <div className="session-landing-menu" role="menu" aria-label="Permissões" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); setPermissaoAberta(false); permissaoBotaoRef.current?.focus() } }}>
                    {(['manual', 'allow-all'] as const).map((id) => (
                      <button key={id} type="button" role="menuitemradio" aria-checked={rascunho.permissao === id} className="session-landing-menu-item" onClick={() => escolherPermissao(id)}>
                        <span><strong>{ROTULOS_PERMISSAO[id]}</strong>{id === 'allow-all' && <small>Requer confirmação a cada ativação</small>}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="session-landing-toolbar-right">
              {/* resumo/atalho inferior: espelha a MESMA seleção do topo */}
              <div className="session-landing-menu-wrap session-landing-modelo-resumo-wrap">
                <button
                  type="button"
                  className="session-landing-pill session-landing-modelo-resumo"
                  aria-haspopup="menu"
                  aria-expanded={modeloAberto}
                  aria-label={`Resumo do modelo: ${rotuloModelo}`}
                  data-testid="landing-modelo-resumo"
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

        <div className="session-landing-dica" data-testid="landing-dica">
          <strong>Dica:</strong> quer começar outra tarefa? Inicie uma nova conversa para trabalhar nela em seguida.
        </div>

        {contexto === 'chat' && (
          <p className="session-landing-motivo" data-testid="landing-motivo-chat">
            Chat começa em <strong>Perguntar</strong> com permissões manuais; workspace com pasta libera os demais modos.
          </p>
        )}
      </div>
    </section>
  )
}
