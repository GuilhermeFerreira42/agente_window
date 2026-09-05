# TAREFA PARA ARENA - MOBILE E PRODUCAO

### Passo 1 - Mobile - gate por toque
Arquivo: `src/domain/mobileLayout.ts` + `src/App.tsx` + `src/components/Titlebar.tsx`

**ANTES:**
```ts
function isPhoneViewport(width) { return width <= 600 }
```

**DEPOIS:**
```ts
function detectTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function classifyViewport(width, hasTouch) {
  if (width <= 600 && hasTouch) return 'phone'
  if (width <= 1024 && hasTouch) return 'tablet'
  return 'desktop' // encolher desktop nunca vira single-pane/phone sem toque
}

export function isPhoneViewport(width, hasTouch) {
  return width <= 600 && hasTouch
}

// Em App.tsx:
const [hasTouch] = useState(() => detectTouch())
const [viewport, setViewport] = useState(() => classifyViewport(window.innerWidth, hasTouch))

useEffect(() => {
  const handleResize = () => {
    setViewport(classifyViewport(window.innerWidth, hasTouch))
  }
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [hasTouch])

const isMobile = viewport === 'phone'
const shouldRenderAuxiliaryBar = !isMobile && auxiliaryVisible // R-033 - aux skipado em mobile web
```

### Passo 2 - Mobile navigation stack
Arquivo: `src/domain/mobileNavigationStack.ts` (já existe) + `App.tsx`

```ts
const [mobileStack, setMobileStack] = useState(() => new MobileNavigationStack())

// Ao abrir custom view no mobile:
const openCustomViewMobile = (viewId) => {
  mobileStack.pushLayer({ id: viewId, type: 'customView' })
  setActiveCustomView(viewId)
}

// Back dismiss:
const handleBack = () => {
  const top = mobileStack.topLayer
  if (top?.type === 'customView') {
    setActiveCustomView(null)
    mobileStack.navigateBack()
  }
}

// No mobile, sidebar é drawer:
<div className={`sidebar ${isMobile ? 'mobile-drawer' : ''} ${mobileDrawerOpen ? 'visible' : ''}`}>
```

CSS mobile drawer (do original sidebarPart.css):
```css
.agent-sessions-workbench.phone-layout .split-view-view:has(> .part.sidebar) {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 250;
  transform: translateX(0);
  transition: transform 260ms cubic-bezier(0.32, 0.72, 0, 1), display 260ms allow-discrete;
}
@starting-style {
  .agent-sessions-workbench.phone-layout .split-view-view.visible:has(> .part.sidebar) {
    transform: translateX(-100%);
  }
}
.agent-sessions-workbench.phone-layout .part.sidebar > .sidebar-footer .sidebar-action-button {
  min-height: 44px; /* touch */
  padding: 8px 12px;
}
```

### Passo 3 - Produção - Build e E2E

**Build:**
```bash
npm install
npm run build # deve passar sem erros TS
npm run test # 348/348 passando
```

**E2E com Playwright (tecnologia Microsoft) - robô que clica em tudo:**
```bash
npm install -D @playwright/test
npx playwright install
npx playwright test
```

**Fluxo ponta-a-ponta que robô deve fazer (24 screenshots):**
1. Abrir app - validar layout inicial sem esconder laterais (bug 00:33)
2. Escolher pasta real via showDirectoryPicker (bug 01:56) - mockar picker para teste
3. Abrir arquivo sem mandar oi (bug 01:11) - clicar em Workspace Files > arquivo -> Monaco mostra conteúdo real
4. Criar 3 sessões no mesmo workspace, validar vários chats por pasta (bug 03:13)
5. Drag & drop sessão
6. Botão direito menu contexto
7. Hide/Show editor 10x sem crash
8. Browser por sessão - abrir browser em s1 e s2, trocar, validar só da sessão ativa
9. Terminal - digitar echo hello, validar aceita digitação
10. Custom View Grid - abrir AI Customizations, validar que Editor e Aux somem
11. F5 e validar persistência de layout por sessão
12. Mobile - resize para 500px sem toque -> continua desktop, não vira mobile
13. Tirar 24 screenshots do tour completo

**Métricas produção:**
- 0 erros TypeScript
- 348/348 testes unitários passando
- 24 screenshots E2E
- 0 mocks (todos arquivos reais - remover const folders, srcDoc fixo, initialTerminalLines fixo)
- Build < 2s
- Sem console errors
- Lighthouse 90+

### Critério E2E Mobile:
1. Desktop resize para 500px sem toque -> validar que continua desktop, não vira mobile
2. Simular toque + 500px -> validar mobile layout, aux bar sumida
3. Abrir custom view no mobile, back -> validar dismiss
4. Sidebar drawer desliza sobre chat no mobile

### Arquivos:
- src/domain/mobileLayout.ts, mobileNavigationStack.ts
- src/components/MobileDiffView.tsx, Titlebar.tsx (detecção toque)
- src/App.tsx (detectTouch, viewport, shouldRenderAuxiliaryBar)
- src/styles/app.css (mobile drawer CSS)
- package.json (scripts build, test, e2e)
- playwright.config.ts (novo)
