
# TAREFA PARA ARENA - SESSÃO 05 LAYOUT TOPOLOGIA - COM PROVA E2E REAL OBRIGATÓRIA

## Regra de ouro: NÃO vale dizer "arquivo existe". Precisa screenshot Playwright + vídeo

### Passo 1 - Sessions Part flexível que absorve resize (LAYOUT.md)

**Referência original:**
- sessions/browser/media/workbench.css: .part.sessionspart { flex: 1 }
- sessions/browser/parts/editorPart.ts: priority = LayoutPriority.Normal (preserva tamanho)
- Sessions Part é único flexível, Sidebar/Editor/Aux/Panel são fixed size

**Código mockado hoje (App.tsx):**
```tsx
<PanelGroup direction="horizontal">
  <Panel defaultSize={20}><SessionSidebar /></Panel>
  <Panel defaultSize={50}><ChatPanel /></Panel>
  <Panel defaultSize={30}><EditorArea /></Panel>
</PanelGroup>
```
defaultSize fixo, não flexível, não salva por sessão

**Implementação real exigida:**

App.tsx:
```tsx
// Usar CSS Grid com variável CSS, não PanelGroup fixo
<div className="workbench-body" style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
  <div className="sidebar" style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}>
    <SessionSidebar />
  </div>
  <div className="main-region" style={{ display: 'flex', flex: 1, minWidth: 0 }}>
    <div className="sessions-part" style={{ flex: 1, minWidth: 200 }}><ChatPanel /></div>
    <div className="editor-part" style={{ width: `${editorWidth}px`, flexShrink: 0 }}><EditorArea /></div>
    <div className="auxiliary-bar" style={{ width: `${auxWidth}px`, flexShrink: 0, display: auxiliaryVisible ? 'block' : 'none' }}><AuxiliaryBar /></div>
  </div>
</div>
```

app.css:
```css
.workbench-body { display: flex; flex-direction: row; overflow: hidden; }
.sidebar { flex-shrink: 0; background: transparent; }
.sessions-part { flex: 1 1 auto; background: var(--vscode-agentsPanel-background); border: 1px solid var(--vscode-agentsPanel-border); border-radius: 8px; }
.editor-part { flex-shrink: 0; }
.auxiliary-bar { flex-shrink: 0; }
```

**Teste E2E anti-trapaça T1:**
```ts
test('sessions part flexível absorve resize', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.goto('/')
  const sidebarWidthBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.sidebar')).width)
  // Resize janela para 1000px (menos 200px)
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.waitForTimeout(200)
  const sidebarWidthAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.sidebar')).width)
  const sessionsPartWidthBefore = await page.evaluate(() => getComputedStyle(document.querySelector('.sessions-part')).width)
  const sessionsPartWidthAfter = await page.evaluate(() => getComputedStyle(document.querySelector('.sessions-part')).width)
  // Sidebar deve PRESERVAR tamanho (ex: 300px antes e depois)
  expect(sidebarWidthBefore).toBe(sidebarWidthAfter)
  // Sessions Part deve ABSORVER delta (ficar 200px menor)
  expect(parseInt(sessionsPartWidthAfter)).toBeLessThan(parseInt(sessionsPartWidthBefore))
  await page.screenshot({ path: 'test-results/t1-sessions-part-flex.png' })
})
```

### Passo 2 - partSizesBySession por sessionId persistido no localStorage

**Código mockado hoje (layoutPersistence.ts):**
```ts
export function partSizesForSession(sessionId) {
  return [50, 50] // fixo!
}
```

**Implementação real:**

layoutPersistence.ts:
```ts
export function partSizesForSession(state: LayoutState, sessionId: string): number[] {
  return state.partSizesBySession[sessionId] ?? [60, 40] // default mas salva por sessão
}

export function savePartSizesForSession(sessionId: string, sizes: number[]) {
  const current = loadLayoutState()
  current.partSizesBySession[sessionId] = sizes
  saveLayoutState(current)
}
```

App.tsx: ao redimensionar chat|editor, chamar savePartSizesForSession(activeSessionId, [chatSize, editorSize])

**Também precisa persistir sessionLayouts Map (fix da Sessão 03 B3/B4):**

Novo arquivo sessionLayoutPersistence.ts ou estender layoutPersistence.ts:
```ts
const SESSION_LAYOUTS_KEY = 'workbench.sessions.layouts.v1'

export function loadSessionLayouts(): SessionLayoutMap {
  try { return JSON.parse(localStorage.getItem(SESSION_LAYOUTS_KEY) || '{}') } catch { return {} }
}
export function saveSessionLayouts(map: SessionLayoutMap) {
  localStorage.setItem(SESSION_LAYOUTS_KEY, JSON.stringify(map))
}
```

No App.tsx, useEffect que salva sessionLayouts.current toda vez que muda + load no início.

**Teste E2E anti-trapaça T2:**
```ts
test('part sizes e session layouts persistem por sessão e após F5', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  // Criar s1 com aux aberta Files
  await page.click('text=Nova sessão')
  await page.click('text=Files') // aux tab Files
  // Redimensionar chat para 70% (drag sash)
  const chatHandle = page.locator('.sessions-part + .resize-handle')
  await chatHandle.dragTo(page.locator('.editor-part'), { targetPosition: { x: -100, y: 0 } })
  // Criar s2 e fechar aux
  await page.click('text=Nova sessão')
  await page.click('button[title="Fechar barra auxiliar"]')
  // Voltar s1
  await page.click('text=s1')
  // Validar aux aberta Files e chat size 70% restaurado
  await expect(page.locator('.auxiliary-bar')).toBeVisible()
  await expect(page.locator('text=Files').first()).toBeVisible()
  const sizes = await page.evaluate(() => JSON.parse(localStorage.getItem('workbench.sessions.layout.v1') || '{}'))
  expect(sizes.partSizesBySession['s1']).toBeDefined()
  expect(sizes.partSizesBySession['s1'][0]).toBeGreaterThan(60) // chat 70%
  // F5
  await page.reload()
  // Após F5, s1 ainda deve ter aux aberta Files (persistência B3/B4)
  await expect(page.locator('.auxiliary-bar')).toBeVisible()
  await page.screenshot({ path: 'test-results/t2-part-sizes-persist.png' })
})
```

### Passo 3 - Custom View Grid mutually exclusive

**Referência original LAYOUT.md:**
"At most one high-priority surface is visible in main horizontal chain: normally Sessions Part, or Custom View Grid while custom view active. This prevents fixed side parts from absorbing general window resize."

"Custom View Grid ... Full-surface contributed views que replace session content. Titlebar and Sidebar remain, opening session dismisses custom view."

**Implementação real:**

App.tsx:
```ts
const [activeCustomView, setActiveCustomView] = useState<string | null>(null) // 'customizations' | null

// Quando custom view ativa, esconde Sessions Part, Editor, Aux, Panel
const isCustomViewActive = !!activeCustomView

{isCustomViewActive ? (
  <div className="custom-view-grid" style={{ flex: 1 }}>
    <CustomizationsView harnessId={harnessId} ... />
  </div>
) : (
  <>
    <div className="sessions-part"><ChatPanel /></div>
    <div className="editor-part"><EditorArea /></div>
    <div className="auxiliary-bar"><AuxiliaryBar /></div>
  </>
)}
// Titlebar e Sidebar sempre visíveis

// Abrir sessão dismisses custom view
const selectSession = (id) => {
  setActiveCustomView(null)
  setActiveSessionId(id)
}
```

**Teste E2E anti-trapaça T3:**
```ts
test('custom view grid esconde sessions, editor, aux - só titlebar e sidebar ficam', async ({ page }) => {
  await page.goto('/')
  await page.click('text=Customizations') // abre custom view
  await expect(page.locator('.custom-view-grid')).toBeVisible()
  await expect(page.locator('.sessions-part')).not.toBeVisible()
  await expect(page.locator('.editor-part')).not.toBeVisible()
  await expect(page.locator('.auxiliary-bar')).not.toBeVisible()
  await expect(page.locator('.titlebar')).toBeVisible()
  await expect(page.locator('.sidebar')).toBeVisible()
  await page.screenshot({ path: 'test-results/t3-custom-view-grid.png' })
  // Clicar sessão deve dismiss custom view
  await page.click('.session-row:first-child')
  await expect(page.locator('.custom-view-grid')).not.toBeVisible()
  await expect(page.locator('.sessions-part')).toBeVisible()
  await page.screenshot({ path: 'test-results/t3-custom-view-dismiss.png' })
})
```

### Passo 4 - Tab bar invariante (keepForDockedTabBar)

**Referência:** editorPart.ts layout() com keepForDockedTabBar

**Implementação:**

EditorArea.tsx:
```tsx
const sidePaneState = resolveSidePaneState({ hasEditorTabs, editorHidden, auxVisible })
const tabBarVisible = isTabBarVisible(sidePaneState)
const editorContentVisible = isEditorContentVisible(sidePaneState)

return (
  <>
    <div className="editor-tabs-bar" style={{ display: tabBarVisible ? 'flex' : 'none' }}>
      {editorTabs.map(tab => <Tab key={tab.id} ... />)}
    </div>
    <div className="editor-content" style={{ display: editorContentVisible ? 'block' : 'none' }}>
      {activeTab.type === 'browser' ? <BrowserView /> : activeTab.type === 'diff' ? <DiffView /> : <FileView />}
    </div>
  </>
)
```

**Teste E2E anti-trapaça T4:**
```ts
test('tab bar visível mesmo quando editor hidden', async ({ page }) => {
  await page.goto('/')
  // Esconder editor (Hide Editor)
  await page.click('button[title="Hide Editor"]')
  await expect(page.locator('.editor-content')).not.toBeVisible()
  await expect(page.locator('.editor-tabs-bar')).toBeVisible() // tab bar continua!
  await page.screenshot({ path: 'test-results/t4-tab-bar-keep.png' })
})
```

### Critérios de aceitação:

- 4 testes E2E passando com screenshots reais em test-results/
- partSizesForSession retorna valor diferente por sessionId, não [50,50] fixo
- sessionLayouts Map persistido em localStorage (fix B3/B4 da Sessão 03)
- Sessions Part flex:1 no CSS, absorve resize, Sidebar preserva
- Custom View Grid esconde Editor/Aux, dismiss ao abrir sessão
- Tab bar visível mesmo com editorHidden

### Arquivos para alterar:

- src/App.tsx (workbench-body, flex logic, customViewActive, savePartSizes)
- src/domain/layoutPersistence.ts (partSizesForSession por sessionId + persistir sessionLayouts)
- src/components/EditorArea.tsx (tab bar invariante)
- src/styles/app.css (flex:1 sessions-part, tokens)
- src/domain/sessionLayout.ts (se necessário para persistência)

Entregar com:
- Código alterado
- test-results/ com 4+ screenshots
- npx playwright test --grep "layout-topologia" passando
