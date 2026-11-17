import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, MessageSquare, ShieldCheck, Wand2 } from 'lucide-react'
import type { ModoAgir, NivelPermissaoAgir } from '../bairros/2-inteligencia/casas/agir'
import { isNavigationKey, nextRovingIndex } from '../domain/keyboardNavigation'

interface Props {
  modo: ModoAgir
  permissao: NivelPermissaoAgir
  semPasta: boolean
  pending: boolean
  onModo: (modo: ModoAgir) => void
  onPermissao: (permissao: NivelPermissaoAgir) => void
}
const modos: Array<{ id: ModoAgir; label: string }> = [
  { id: 'agent', label: 'Agente' }, { id: 'edit', label: 'Editar' },
  { id: 'ask', label: 'Perguntar' }, { id: 'plan', label: 'Planejar' },
]
const motivoChat = 'Chat começa em Perguntar/manual. Para Planejar, Editar ou Agente, inicie uma conversa com pasta.'
type Menu = 'modos' | 'execucao' | 'permissoes'

/** Controles reais da landing. Um modo/permissão no rascunho, sem simular outro runtime. */
export function LandingExecutionControls({ modo, permissao, semPasta, pending, onModo, onPermissao }: Props) {
  const [open, setOpen] = useState<Menu | null>(null)
  const [anchor, setAnchor] = useState<Menu>('modos')
  const [position, setPosition] = useState({ top: 0, left: 0, width: 310 })
  const buttons = useRef<Partial<Record<Menu, HTMLButtonElement | null>>>({})
  const menu = useRef<HTMLDivElement>(null)
  const locked = pending
  const mode = semPasta ? 'ask' : modo
  const permission = semPasta ? 'manual' : permissao
  const close = useCallback((restore = true) => { setOpen(null); if (restore) buttons.current[anchor]?.focus() }, [anchor])
  const show = (value: Menu) => {
    if (locked) return
    if (open === value && anchor === value) close()
    else { setAnchor(value); setOpen(value) }
  }
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const rect = buttons.current[anchor]?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(310, window.innerWidth - 16)
      setPosition({ width, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
        top: Math.min(rect.bottom + 6, window.innerHeight - 8) })
    }
    measure()
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)[role]')?.focus()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open, anchor])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !Object.values(buttons.current).some((button) => button?.contains(target))) close(false)
    }
    document.addEventListener('pointerdown', outside, true)
    return () => document.removeEventListener('pointerdown', outside, true)
  }, [open, close])

  const chooseMode = (value: ModoAgir) => { if (!locked && (!semPasta || value === 'ask')) { onModo(value); close() } }
  const choosePermission = (value: NivelPermissaoAgir) => {
    if (locked || (semPasta && value !== 'manual')) return
    if (value === 'allow-all' && !window.confirm('ATENÇÃO — Permitir tudo: tools e comandos de terminal poderão executar sem confirmações individuais, acessar arquivos fora do workspace e modificar ou apagar dados, limitados pelos privilégios da sua conta no sistema operacional. Perguntar e Planejar continuam somente leitura; proteções do servidor e da origem local permanecem ativas. Você pode voltar a Permissões manuais a qualquer momento. Ativar?')) { close(); return }
    onPermissao(value); close()
  }
  const label = modos.find((item) => item.id === mode)?.label ?? mode
  const permissionLabel = permission === 'manual' ? 'Permissões manuais' : 'Permitir tudo'
  const executionLabel = mode === 'plan' ? 'Planejar' : 'Interativo'
  return <>
    <button ref={(element) => { buttons.current.modos = element }} type="button" className="session-landing-pill"
      aria-label={semPasta ? `Modo: Perguntar (único em Chat). ${motivoChat}` : `Modo: ${label}`}
      title={semPasta ? motivoChat : 'Escolher modo da conversa'} disabled={locked}
      aria-haspopup="menu" aria-expanded={open === 'modos'} onClick={() => show('modos')}>
      <Wand2 size={13} aria-hidden="true" />{label}<ChevronDown size={12} aria-hidden="true" />
    </button>
    <button ref={(element) => { buttons.current.execucao = element }} type="button" className="session-landing-pill"
      data-testid="landing-interativo" aria-label={`Execução: ${executionLabel}`} disabled={locked}
      title={semPasta ? motivoChat : 'Modo de execução e permissões'}
      aria-haspopup="menu" aria-expanded={anchor === 'execucao' && open !== null} onClick={() => show('execucao')}>
      <MessageSquare size={13} aria-hidden="true" />{executionLabel}<ChevronDown size={12} aria-hidden="true" />
    </button>
    <button ref={(element) => { buttons.current.permissoes = element }} type="button"
      className={`session-landing-pill${permission === 'allow-all' ? ' is-risky' : ''}`}
      aria-label={semPasta ? `Permissão: Permissões manuais (única em Chat). ${motivoChat}` : `Permissão: ${permissionLabel}`}
      title={semPasta ? motivoChat : 'Permissões da conversa'} disabled={locked}
      aria-haspopup="menu" aria-expanded={anchor === 'permissoes' && open !== null} onClick={() => show('permissoes')}>
      <ShieldCheck size={13} aria-hidden="true" />{permissionLabel}<ChevronDown size={12} aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={menu} className="session-landing-menu landing-execution-popup" role="menu"
      aria-label={open === 'modos' ? 'Modos' : open === 'execucao' ? 'Modo de execução' : 'Permissões'}
      style={{ ...position, position: 'fixed', maxHeight: Math.max(0, window.innerHeight - position.top - 8) }} onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); close(); return }
        if (!isNavigationKey(event.key)) return
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role]:not(:disabled)'))
        const next = nextRovingIndex(event.key, { count: items.length, current: items.indexOf(document.activeElement as HTMLButtonElement) })
        if (items[next]) { event.preventDefault(); items[next].focus() }
      }}>
      {open === 'modos' ? modos.map((item) => <button key={item.id} type="button" role="menuitemradio" aria-checked={mode === item.id}
        className="session-landing-menu-item" disabled={locked || (semPasta && item.id !== 'ask')} onClick={() => chooseMode(item.id)}><span><strong>{item.label}</strong>{semPasta && item.id !== 'ask' && <small>Escolha uma pasta para usar este modo</small>}</span></button>) : <>
        <button type="button" role="menuitem" className="session-landing-menu-item landing-execution-heading" disabled={locked} onClick={() => setOpen('execucao')}>
          Modo de execução <small>{executionLabel}</small>
        </button>
        {open === 'execucao' && <>
          <button type="button" role="menuitemradio" aria-checked={mode !== 'plan'} className="session-landing-menu-item" disabled={locked} onClick={() => chooseMode(mode === 'plan' ? 'agent' : mode)}>
            <span><strong>Interativo</strong><small>Colaboração passo a passo</small></span></button>
          <button type="button" role="menuitemradio" aria-checked={mode === 'plan'} className="session-landing-menu-item" disabled={locked || semPasta} onClick={() => chooseMode('plan')}>
            <span><strong>Planejar</strong><small>{semPasta ? 'Escolha uma pasta para planejar' : 'Planeja antes de executar; somente leitura'}</small></span></button>
          <button type="button" role="menuitem" className="session-landing-menu-item" disabled title="Execução Autopilot ainda não está disponível.">
            <span>Autopilot<small>Ainda não disponível</small></span></button>
        </>}
        <button type="button" role="menuitem" className="session-landing-menu-item landing-execution-heading" disabled={locked} onClick={() => setOpen('permissoes')}>
          Permissões <small>{permissionLabel}</small>
        </button>
        {open === 'permissoes' && <>
          <button type="button" role="menuitemradio" aria-checked={permission === 'manual'} className="session-landing-menu-item" disabled={locked} onClick={() => choosePermission('manual')}>
            <span><strong>Permissões manuais</strong><small>Solicita as aprovações necessárias</small></span></button>
          <button type="button" role="menuitem" className="session-landing-menu-item" disabled title="Permissões assistidas ainda não estão disponíveis.">
            <span>Permissões assistidas<small>Ainda não disponíveis</small></span></button>
          <button type="button" role="menuitemradio" aria-checked={permission === 'allow-all'} className="session-landing-menu-item" disabled={locked || semPasta} onClick={() => choosePermission('allow-all')}>
            <span><strong>Permitir tudo</strong><small>{semPasta ? 'Disponível apenas em conversa com pasta' : 'Requer confirmação a cada ativação'}</small></span></button>
          <button type="button" role="menuitem" className="session-landing-menu-item" disabled title="Sandbox de terminal ainda não está disponível.">
            <span>Sandbox de terminal<small>Ainda não disponível</small></span></button>
        </>}
      </>}
    </div>, document.body)}
  </>
}
