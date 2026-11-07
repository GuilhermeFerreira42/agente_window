// ============================================================================
// domain/appRuntime.ts — Fatia 15, Onda 3 (D161).
//
// As perguntas de AMBIENTE e de TEMPO que o App fazia com funções locais. Todas
// são puras (ou dependem só de `window` do jeito que qualquer domínio depende),
// não tocam em estado do React e não conhecem a árvore de componentes.
//
// Saíram do App.tsx porque não são "do App": são do ambiente. Ficando lá, cada
// uma delas era mais uma coisa para ler antes de achar o estado de sessão, e
// nenhuma delas tinha teste próprio — o que muda agora, porque testar uma função
// de domínio é barato e testar através do App inteiro não é.
// ============================================================================
import type { ModoAgir } from '../bairros/2-inteligencia/casas/agir'
import { classifyViewport } from './mobileLayout'

/** Guarda de tipo do modo do compositor. Estreita `unknown` (vindo do storage)
 *  para `ModoAgir` sem `as`: um valor inválido no localStorage não vira modo. */
export function ehModoAgir(value: unknown): value is ModoAgir {
  return value === 'agent' || value === 'edit' || value === 'ask' || value === 'plan'
}

// Breakpoints do original (layoutPolicy.ts): phone ≤600px, tablet ≤1024px, e o
// single-pane só é acionado em plataformas móveis (toque). Encolher uma janela de
// desktop nunca deve virar single-pane — por isso o gate por toque/SO.
// A classificação de viewport é derivada pelo domínio `mobileLayout` (R-045/R-047).

/** Detecta plataforma de toque/móvel a partir do ambiente do browser. */
export function detectTouch(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  const touch = (nav?.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(nav?.userAgent ?? '')
  return coarse || (touch && mobileUa) || mobileUa
}

// single-pane só é acionado em plataforma móvel (toque). O domínio `mobileLayout`
// classifica o viewport; desktop (sem toque) nunca vira single-pane, mesmo
// estreito. Em plataforma móvel, phone e tablet acionam single-pane.
export function isSinglePaneWidth(width: number): boolean {
  if (!detectTouch()) return false
  const viewportClass = classifyViewport({ width, touch: true })
  return viewportClass === 'phone' || viewportClass === 'tablet'
}

/** Hora local no formato do original (hh:mm, pt-BR). Usado para carimbar mensagens. */
export function timeLabel(): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}
