# REFERENCIA ORIGINAL - MOBILE E PRODUCAO

## Original: sessions/MOBILE.md

```
Phone layouts replace selected parts e pickers com mobile subclasses while preserving same service e provider contracts.

Mobile composition e navigation são specified in MOBILE.md.

Viewport classification: phone ≤600px, tablet ≤1024px, e single-pane só é acionado em plataformas móveis (toque). Encolher janela desktop NUNCA vira single-pane - gate por toque/SO.

Auxiliary bar totalmente skipado em mobile web (R-033) para evitar disruptive auto-expand em narrow viewports.

Mobile navigation stack com pushLayer, navigateBack, topLayer.
```

## Original: sessions/browser/parts/mobile/mobileLayout.ts + mobileNavigationStack.ts + mobileSessionsPart.ts

```ts
export function classifyViewport(width) {
  if (width <= 600) return 'phone'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}

export function isPhoneViewport(width, hasTouch) {
  return width <= 600 && hasTouch // toque obrigatório!
}

export class MobileNavigationStack {
  pushLayer(layer) { ... }
  navigateBack() { ... }
  get topLayer() { ... }
}
```

## Original: LAYOUT_CONTROLLER.md - Mobile

```
Skipped entirely on mobile web (isWeb && isMobile) to avoid disruptive auto-expand on narrow viewports.
```

Auxiliary bar skipado em mobile web.

## Original: Produção - build, testes, E2E

Original tem 348/348 testes unitários, mas E2E com Playwright (tecnologia Microsoft) para teste ponta-a-ponta.
Playwright é robô que clica em tudo, tira screenshots, valida fluxo.
