// =============================================================================
// c2_fidelidade.mjs — medição comparativa App × mockup (vscode-interface-inline)
// Roda FORA do runner de testes (não é .spec.ts): imprime tabela de diff e
// grava JSON + capturas em memoria-de-projeto/execucao-c2/.
// USO (node26 canônico + env do Chromium como no e2e-c2.sh):
//   node e2e/c2_fidelidade.mjs
// =============================================================================
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORTA = 5219
const BASE = `http://127.0.0.1:${PORTA}`
const MOCKUP = 'file:///home/user/memoria-de-projeto/C-2/C-2/parecer/vscode-interface-inline.html'
const SAIDA = '/home/user/memoria-de-projeto/execucao-c2'
const headersApi = { Origin: BASE, 'Sec-Fetch-Site': 'same-origin' }

/** Mede caixa + estilo computado de um seletor (null se ausente). */
const medir = (sel) => {
  const el = document.querySelector(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return {
    sel,
    x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
    bg: cs.backgroundColor, color: cs.color,
    fs: cs.fontSize, fw: cs.fontWeight, lh: cs.lineHeight,
    radius: cs.borderTopLeftRadius, border: cs.borderTopWidth + ' ' + cs.borderTopColor,
    pad: cs.padding, margin: cs.margin,
  }
}

async function main() {
  mkdirSync(join(SAIDA, 'screenshots'), { recursive: true })
  const raiz = mkdtempSync(join(tmpdir(), 'c2-fid-'))
  const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/tmp/chromium'
  const browser = await chromium.launch({ executablePath: exe })
  const resultado = { nosso: {}, mockup: {}, diff: [] }

  try {
    // ── 1) NOSSO APP ────────────────────────────────────────────────────────
    const proc = spawn(process.execPath, [resolve(app, '../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(PORTA), '--strictPort'], {
      cwd: app, windowsHide: true, stdio: 'ignore',
      env: { ...process.env, AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'), AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'), AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'), FS_TEST_ROOT: raiz },
    })
    for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).status === 200) break } catch { /* retry */ } await new Promise((r) => setTimeout(r, 500)) }

    const page = await browser.newPage({ viewport: { width: 1872, height: 1080 } })
    await page.goto(BASE)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench')
    await page.evaluate(() => (document.activeElement instanceof HTMLElement && document.activeElement.blur(), undefined))
    await page.waitForTimeout(500)

    resultado.nosso = await page.evaluate(({ medirSrc }) => {
      // eslint-disable-next-line no-eval
      const medir = eval(`(${medirSrc})`)
      const vars = getComputedStyle(document.documentElement)
      return {
        vars: {
          sidebar: vars.getPropertyValue('--sidebar-width').trim(),
          auxiliary: vars.getPropertyValue('--auxiliary-width').trim(),
          titlebar: vars.getPropertyValue('--titlebar-height').trim(),
          font: vars.getPropertyValue('--vscode-font-family').trim(),
        },
        workbench: medir('.agent-sessions-workbench'),
        sidebar: medir('.sessions-sidebar'),
        sidebarTitulo: medir('.sessions-sidebar-title'),
        topentry: medir('.sessions-topentry'),
        sectionHeader: medir('.session-section-header'),
        sessionRow: medir('.session-row'),
        titulo: medir('.session-landing-title'),
        faixa: medir('.session-landing-faixa'),
        contextoOpt: medir('.session-landing-contexto-option'),
        contextoAtivo: medir('.session-landing-contexto-option.is-active'),
        chip: medir('.session-landing-chip'),
        card: medir('.session-landing-input'),
        textarea: medir('.session-landing-textarea'),
        placeholder: (() => { const el = document.querySelector('.session-landing-textarea'); return el ? { ph: el.placeholder } : null })(),
        toolbar: medir('.session-landing-toolbar'),
        pill: medir('.session-landing-pill'),
        statusPill: medir('.session-landing-status-pill'),
        send: medir('.session-landing-send'),
        dica: medir('.session-landing-dica'),
        motivo: medir('.session-landing-motivo'),
        filhos: Array.from(document.querySelector('.session-landing-input')?.children ?? []).map((el) => {
          const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
          return { cls: el.className, h: Math.round(r.height), mt: cs.marginTop, mb: cs.marginBottom }
        }),
      }
    }, { medirSrc: medir.toString() })

    // menu do modelo aberto
    await page.getByTestId('landing-modelo-topo').click()
    await page.waitForSelector('.session-landing-modelo-menu')
    resultado.nosso.menu = await page.evaluate(({ medirSrc }) => {
      // eslint-disable-next-line no-eval
      const medir = eval(`(${medirSrc})`)
      return { caixa: medir('.session-landing-modelo-menu'), item: medir('.session-landing-menu-item') }
    }, { medirSrc: medir.toString() })
    await page.screenshot({ path: join(SAIDA, 'screenshots', 'fidelidade_app_menu_1872.png') })
    await page.keyboard.press('Escape')
    await page.screenshot({ path: join(SAIDA, 'screenshots', 'fidelidade_app_1872.png') })
    await page.setViewportSize({ width: 800, height: 600 })
    await page.screenshot({ path: join(SAIDA, 'screenshots', 'fidelidade_app_800x600.png') })

    // sessão legada (mesmo formato do J11) para medir a linha da lateral
    const legadaId = (await import('node:crypto')).randomUUID()
    const legada = {
      id: legadaId, title: 'linha de medição', workspace: 'medicao', workspacePath: raiz,
      section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null,
      chats: [{ id: `${legadaId}-main`, title: 'Chat principal', status: 'completed', messages: [] }],
      mainChatId: `${legadaId}-main`,
    }
    const inserida = await page.request.post(`${BASE}/api/sessions`, { headers: headersApi, data: { session: legada, creationId: legadaId } })
    if (!inserida.ok()) console.warn('POST legado:', await inserida.text())
    await page.reload()
    await page.waitForSelector('.session-row')
    resultado.nosso.linhas = await page.evaluate(({ medirSrc }) => {
      // eslint-disable-next-line no-eval
      const medir = eval(`(${medirSrc})`)
      return { topentry: medir('.sessions-topentry'), sectionHeader: medir('.session-section-header'), sessionRow: medir('.session-row'), sidebarTitulo: medir('.sessions-sidebar-title') }
    }, { medirSrc: medir.toString() })
    await page.screenshot({ path: join(SAIDA, 'screenshots', 'fidelidade_app_lateral_1872.png') })
    await page.close()

    // ── 2) MOCKUP ───────────────────────────────────────────────────────────
    const mpage = await browser.newPage({ viewport: { width: 1872, height: 1080 } })
    await mpage.goto(MOCKUP, { waitUntil: 'load', timeout: 120_000 })
    await mpage.waitForSelector('.interactive-input-part', { timeout: 60_000 })
    await mpage.waitForTimeout(1500)
    resultado.mockup = await mpage.evaluate(({ medirSrc }) => {
      // eslint-disable-next-line no-eval
      const medir = eval(`(${medirSrc})`)
      const vars = getComputedStyle(document.documentElement)
      const primeiro = (sel) => { const el = document.querySelector(sel); return el ? medir(sel) : null }
      // caixa com borda dentro da dica
      let dicaInterna = null
      const dica = document.querySelector('.new-session-getting-started-tip')
      if (dica) {
        for (const el of dica.querySelectorAll('*')) {
          const cs = getComputedStyle(el)
          if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none') { const r = el.getBoundingClientRect(); dicaInterna = { w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderTopLeftRadius }; break }
        }
      }
      return {
        vars: {
          sidebar: vars.getPropertyValue('--sidebar-width').trim(),
          font: vars.getPropertyValue('font-family').trim(),
        },
        workbench: primeiro('.agent-sessions-workbench') || primeiro('body'),
        sidebar: primeiro('.agent-sessions-container') || primeiro('[class*="sidebar"]'),
        sidebarTitulo: primeiro('.title'),
        topentry: primeiro('.session-section-new-session'),
        sectionLabel: primeiro('.session-section-label'),
        sessionRow: primeiro('.session-list-inset-row'),
        sessionRowAlturas: Array.from(document.querySelectorAll('.session-list-inset-row')).slice(0, 8).map((el) => { const r = el.getBoundingClientRect(); return { h: Math.round(r.height), y: Math.round(r.y), txt: (el.textContent || '').slice(0, 24) } }),
        titulo: primeiro('.new-session-welcome-message-title'),
        faixa: primeiro('.new-session-workspace-picker-container'),
        pill: primeiro('.sessions-workspace-category-picker'),
        contextoOpt: primeiro('.sessions-workspace-category-picker .action-label') || primeiro('.action-label'),
        card: primeiro('.chat-input-container'),
        editor: primeiro('.interactive-input-editor'),
        placeholder: primeiro('.editorPlaceholder'),
        toolbar: primeiro('.chat-input-toolbars'),
        dropdownLabel: primeiro('.sessions-chat-dropdown-label'),
        tip: primeiro('.new-session-getting-started-tip'),
        dicaInterna,
        quickInput: primeiro('.quick-input-widget') || primeiro('.quick-input-box'),
        titlebar: primeiro('.titlebar-container'),
      }
    }, { medirSrc: medir.toString() })
    await mpage.screenshot({ path: join(SAIDA, 'screenshots', 'fidelidade_mockup_1872.png') })
    await mpage.close()
  } finally {
    await browser.close()
    try { if (proc && proc.exitCode === null) proc.kill('SIGKILL') } catch { /* noop */ }
    rmSync(raiz, { recursive: true, force: true })
  }

  // ── 3) DIFF (tolerância visual) ───────────────────────────────────────────
  const pares = [
    ['sidebar.largura', resultado.nosso.sidebar?.w, resultado.mockup.sidebar?.w, 1],
    ['titulo.fonte', resultado.nosso.titulo?.fs, resultado.mockup.titulo?.fs, 0],
    ['titulo.peso', resultado.nosso.titulo?.fw, resultado.mockup.titulo?.fw, 0],
    ['titulo.mb', resultado.nosso.titulo?.margin?.split(' ')[2] ?? resultado.nosso.titulo?.margin, '40px', 1],
    ['faixa.altura', resultado.nosso.faixa?.h, resultado.mockup.faixa?.h, 2],
    ['faixa.mt', resultado.nosso.faixa?.y !== undefined && resultado.nosso.titulo ? resultado.nosso.faixa.y - (resultado.nosso.titulo.y + resultado.nosso.titulo.h) : null, 52, 3],
    ['card.largura', resultado.nosso.card?.w, resultado.mockup.card?.w, 2],
    ['card.altura', resultado.nosso.card?.h, resultado.mockup.card?.h, 2],
    ['card.bg', resultado.nosso.card?.bg, resultado.mockup.card?.bg, 0],
    ['card.raio', resultado.nosso.card?.radius, resultado.mockup.card?.radius, 1],
    ['editor.altura', resultado.nosso.textarea?.h, resultado.mockup.editor?.h, 4],
    ['toolbar.altura', resultado.nosso.toolbar?.h, resultado.mockup.toolbar?.h, 2],
    ['toolbar.mt', resultado.nosso.toolbar?.margin?.split(' ')[0], resultado.mockup.toolbar?.margin?.split(' ')[0], 1],
    ['topentry.altura', resultado.nosso.topentry?.h, resultado.mockup.topentry?.h, 1],
    ['topentry.fonte', resultado.nosso.topentry?.fs, resultado.mockup.topentry?.fs, 0],
    ['row.altura', resultado.nosso.linhas?.sessionRow?.h, Math.max(...(resultado.mockup.sessionRowAlturas ?? [{ h: 0 }]).map((r) => r.h)), 3],
    ['row.raio', resultado.nosso.linhas?.sessionRow?.radius, resultado.mockup.sessionRow?.radius, 1],
    ['menu.bg', resultado.nosso.menu?.caixa?.bg, 'rgb(32, 33, 34)', 0],
    ['menu.itemFonte', resultado.nosso.menu?.item?.fs, '13px', 0],
  ]
  for (const [nome, a, b, tol] of pares) {
    const na = typeof a === 'number' ? a : parseFloat(String(a ?? '').replace(/[^\d.]/g, ''))
    const nb = typeof b === 'number' ? b : parseFloat(String(b ?? '').replace(/[^\d.]/g, ''))
    const ok = Number.isFinite(na) && Number.isFinite(nb) ? Math.abs(na - nb) <= tol : String(a) === String(b)
    resultado.diff.push({ nome, nosso: a, mockup: b, tol, ok })
  }
  writeFileSync(join(SAIDA, 'fidelidade-medicao.json'), JSON.stringify(resultado, null, 2))
  console.log('\n=== FIDELIDADE App × mockup (1872×1080) ===')
  for (const d of resultado.diff) console.log(`${d.ok ? 'OK ' : 'DIF'} ${d.nome}: nosso=${d.nosso} mockup=${d.mockup} (tol ${d.tol})`)
  const difs = resultado.diff.filter((d) => !d.ok).length
  console.log(`\n${resultado.diff.length - difs} ok · ${difs} divergentes → ${join(SAIDA, 'fidelidade-medicao.json')}`)
  process.exit(difs === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(2) })
