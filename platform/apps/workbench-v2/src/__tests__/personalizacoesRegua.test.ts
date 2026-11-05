import { describe, expect, it } from 'vitest'
import appCss from '../styles/app.css?raw'
import editorAreaTsx from '../components/EditorArea.tsx?raw'

/**
 * RF14-6 / SPEC 2H critério (a): as medidas da entrada de Personalizações viram
 * teste, com tolerância de ±2px.
 *
 * HONESTIDADE SOBRE O ALCANCE DESTA PROVA — leia antes de citar este arquivo como
 * "o ±2px do mockup está verificado". Ele não está, e a diferença importa:
 *
 * 1. jsdom não faz layout. Não há como MEDIR pixels renderizados aqui. O que este
 *    teste faz é fixar os valores DECLARADOS no CSS — o mesmo método dos outros
 *    contratos visuais do repositório (visualStates.test.ts, themeTokens.test.ts).
 *    Isso pega regressão de valor declarado; não pega regressão de renderização.
 *
 * 2. A régua abaixo foi extraída do CSS que a aplicação JÁ TINHA quando o mock
 *    E16 colocou a entrada no menu de nova aba do editor. Ela NÃO foi derivada do
 *    mockup HTML de referência, porque o mockup coloca "AI Customization" como
 *    ÍCONE DA ACTIVITY BAR (`.codicon-ai-customization-view-icon`), que é outro
 *    elemento, com outra geometria. A divergência de COLOCAÇÃO está relatada ao
 *    dono em docs/05 (D143) e não foi resolvida nesta fatia: reconciliar isso é
 *    redesenhar o layout do Bairro 1, e a Fatia 14 é "tornar real o que já existe
 *    como mock", não reconstruir (§8 da SPEC).
 *
 * 3. Medição real em navegador continua NÃO VERIFICADA neste ambiente: os
 *    binários do Playwright não estão instalados. Registrar este teste como
 *    "E2E verde" seria falsificar aceite.
 */

function regra(seletor: string): string {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return appCss.match(new RegExp(`${escapado}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

/** Todos os valores em px de uma declaração, na ordem em que aparecem. */
function valoresPx(seletor: string, propriedade: string): number[] {
  const corpo = regra(seletor)
  if (!corpo) return []
  const declaracao = corpo.match(
    new RegExp(`(^|;|\\n)\\s*${propriedade.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+)`),
  )?.[2]
  if (!declaracao) return []
  return [...declaracao.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((achado) => Number(achado[1]))
}

function esperarPx(seletor: string, propriedade: string, regua: number[]): void {
  const onde = `${seletor} { ${propriedade} }`
  const reais = valoresPx(seletor, propriedade)
  // Se a regra sumiu ou a propriedade virou token, o teste falha dizendo isso —
  // nunca passa em silêncio por não ter achado nada.
  expect(reais, `${onde}: a declaração em px desapareceu do CSS`).toHaveLength(regua.length)
  reais.forEach((valor, indice) => {
    expect(
      Math.abs(valor - regua[indice]),
      `${onde}[${indice}] = ${valor}px; a régua é ${regua[indice]}px (tolerância ±2px)`,
    ).toBeLessThanOrEqual(2)
  })
}

describe('RF14-6 · régua declarada da entrada de Personalizações (±2px)', () => {
  it('o rótulo visível na lateral é "Personalizações", em português (critério a / RNF14-4)', () => {
    // O ícone Blocks é o mesmo do mock; só o texto mudou, e é ele que a SPEC cita.
    expect(editorAreaTsx).toMatch(/onNewCustomizations[^>]*>[\s\S]{0,120}?<span>Personalizações<\/span>/)
    expect(editorAreaTsx).not.toMatch(/<span>AI Customizations<\/span>/)
  })

  it('o botão que abre o menu mantém 30 × 35 px', () => {
    esperarPx('.editor-tab-add-menu-button', 'width', [30])
    esperarPx('.editor-tab-add-menu-button', 'height', [35])
  })

  it('o menu mantém largura mínima 150, vão 2 e respiro 4', () => {
    esperarPx('.editor-tab-add-menu', 'min-width', [150])
    esperarPx('.editor-tab-add-menu', 'gap', [2])
    esperarPx('.editor-tab-add-menu', 'padding', [4])
  })

  it('cada item do menu — entre eles Personalizações — mantém altura mínima 28', () => {
    esperarPx('.editor-tab-add-menu button', 'min-height', [28])
  })
})

describe('RF14-6 · régua declarada do painel de Personalizações (±2px)', () => {
  it('o cabeçalho mantém vão 12 e respiro 12 × 14', () => {
    esperarPx('.customizations-header', 'gap', [12])
    esperarPx('.customizations-header', 'padding', [12, 14])
  })

  it('o contador do cabeçalho mantém 18 × 18 com respiro 0 × 6 e raio 9', () => {
    esperarPx('.customizations-total', 'min-width', [18])
    esperarPx('.customizations-total', 'height', [18])
    esperarPx('.customizations-total', 'padding', [6])
    esperarPx('.customizations-total', 'border-radius', [9])
  })

  it('o cabeçalho de seção mantém vão 6 e respiro 5 × 8', () => {
    esperarPx('.customizations-section-header', 'gap', [6])
    esperarPx('.customizations-section-header', 'padding', [5, 8])
  })

  it('a linha de item mantém vão 8 e respiro 2 × 6', () => {
    esperarPx('.customizations-item', 'gap', [8])
    esperarPx('.customizations-item', 'padding', [2, 6])
  })

  it('as peças novas da versão real usam o mesmo respiro horizontal do painel (14)', () => {
    // Formulário, faixas e filtro herdam o alinhamento do cabeçalho; se um deles
    // desalinhar, a tela fica com duas margens visíveis diferentes. O terceiro
    // valor (`0`) não vem em px, então a régua lista só os dois que vêm.
    esperarPx('.customizations-form', 'margin', [10, 14])
    esperarPx('.customizations-banner', 'margin', [8, 14])
  })

  it('o botão "Nova habilidade" tem a mesma altura dos demais controles (24)', () => {
    esperarPx('.customizations-nova', 'height', [24])
  })
})
