// ============================================================================
// __tests__/appRuntime.test.ts — Fatia 15, Onda 3 (D161).
//
// Estas funções moravam dentro do App.tsx e NÃO tinham teste próprio: para
// exercitá-las era preciso renderizar o App inteiro. Extraídas para o domínio,
// o teste custa milissegundos — que é o motivo real de extrair regra do síndico,
// mais do que a contagem de linhas.
// ============================================================================
import { describe, expect, it, vi, afterEach } from 'vitest'
import { detectTouch, ehModoAgir, isSinglePaneWidth, timeLabel } from '../domain/appRuntime'
import {
  COMPOSER_HISTORY_MAX_ENTRIES,
  cloneComposerHistoryEntry,
  sameComposerHistoryEntry,
} from '../domain/composerHistory'
import type { ComposerHistoryEntry } from '../types'

const entrada = (over: Partial<ComposerHistoryEntry> = {}): ComposerHistoryEntry => ({
  text: 'oi',
  model: 'gpt',
  mode: 'agent',
  attachments: [],
  ...over,
} as ComposerHistoryEntry)

describe('ehModoAgir — guarda de tipo do modo', () => {
  it('1. aceita exatamente os quatro modos', () => {
    for (const modo of ['agent', 'edit', 'ask', 'plan']) expect(ehModoAgir(modo)).toBe(true)
  })

  it('2. recusa qualquer outra coisa, inclusive o que o storage pode devolver', () => {
    for (const ruim of ['Agent', '', null, undefined, 0, {}, [], 'chat']) {
      expect(ehModoAgir(ruim), `aceitou ${JSON.stringify(ruim)}`).toBe(false)
    }
  })
})

describe('detectTouch / isSinglePaneWidth — o gate de plataforma', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('3. desktop SEM toque nunca vira single-pane, mesmo estreito', () => {
    // Este é o contrato que o comentário do original declara: encolher a janela
    // do desktop não pode virar layout de celular.
    vi.spyOn(window, 'matchMedia').mockImplementation(((q: string) => ({
      matches: false, media: q, onchange: null,
      addListener: () => undefined, removeListener: () => undefined,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as never)
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 0, configurable: true })
    Object.defineProperty(window.navigator, 'userAgent', { value: 'Mozilla/5.0 (Windows NT 10.0)', configurable: true })

    expect(detectTouch()).toBe(false)
    expect(isSinglePaneWidth(375)).toBe(false)   // largura de celular, plataforma desktop
    expect(isSinglePaneWidth(1400)).toBe(false)
  })

  it('4. com toque e largura de celular, single-pane LIGA', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(((q: string) => ({
      matches: true, media: q, onchange: null,
      addListener: () => undefined, removeListener: () => undefined,
      addEventListener: () => undefined, removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as never)
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 5, configurable: true })
    Object.defineProperty(window.navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone)', configurable: true })

    expect(detectTouch()).toBe(true)
    expect(isSinglePaneWidth(390)).toBe(true)
  })
})

describe('timeLabel — carimbo de hora', () => {
  it('5. devolve hh:mm com dois dígitos', () => {
    const s = timeLabel()
    expect(s).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('sameComposerHistoryEntry — a regra que estava duplicada', () => {
  it('6. entrada igual é reconhecida (evita repetir no histórico)', () => {
    expect(sameComposerHistoryEntry(entrada(), entrada())).toBe(true)
  })

  it('7. qualquer diferença de texto/modelo/modo quebra a igualdade', () => {
    expect(sameComposerHistoryEntry(entrada(), entrada({ text: 'outro' }))).toBe(false)
    expect(sameComposerHistoryEntry(entrada(), entrada({ model: 'outro' }))).toBe(false)
    expect(sameComposerHistoryEntry(entrada(), entrada({ mode: 'ask' as never }))).toBe(false)
  })

  it('8. anexos: compara id, nome E kind — não só o nome', () => {
    const a = entrada({ attachments: [{ id: '1', name: 'x.ts', kind: 'local' }] as never })
    const igual = entrada({ attachments: [{ id: '1', name: 'x.ts', kind: 'local' }] as never })
    const outroId = entrada({ attachments: [{ id: '2', name: 'x.ts', kind: 'local' }] as never })
    const outroKind = entrada({ attachments: [{ id: '1', name: 'x.ts', kind: 'workspace' }] as never })
    const maisUm = entrada({ attachments: [
      { id: '1', name: 'x.ts', kind: 'local' }, { id: '2', name: 'y.ts', kind: 'local' },
    ] as never })

    expect(sameComposerHistoryEntry(a, igual)).toBe(true)
    expect(sameComposerHistoryEntry(a, outroId)).toBe(false)
    expect(sameComposerHistoryEntry(a, outroKind)).toBe(false)
    expect(sameComposerHistoryEntry(a, maisUm)).toBe(false)
  })

  it('9. sem entrada anterior não há igualdade (primeira do histórico)', () => {
    expect(sameComposerHistoryEntry(undefined, entrada())).toBe(false)
  })

  it('10. o clone é DEFENSIVO: mexer no original não altera a cópia', () => {
    const original = entrada({ attachments: [{ id: '1', name: 'x.ts', kind: 'local' }] as never })
    const copia = cloneComposerHistoryEntry(original)
    expect(copia).not.toBe(original)
    expect(copia.attachments).not.toBe(original.attachments)
    expect(copia.attachments[0]).not.toBe(original.attachments[0])
    original.attachments[0].name = 'MUTADO'
    expect(copia.attachments[0].name).toBe('x.ts')
  })

  it('11. o limite do histórico é 40 (uma constante, não duas)', () => {
    expect(COMPOSER_HISTORY_MAX_ENTRIES).toBe(40)
  })
})
