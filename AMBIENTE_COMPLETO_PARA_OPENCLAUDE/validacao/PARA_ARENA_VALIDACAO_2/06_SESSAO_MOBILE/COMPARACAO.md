# 06 - MOBILE (R-045 a R-049) - MOBILE.md

## Original:
- Phone layouts substituem parts e pickers por mobile subclasses mas preservam service contracts
- Auxiliary bar totalmente skipado em mobile web (R-033)
- Mobile navigation stack com pushLayer, navigateBack, topLayer
- Viewport classification: phone ≤600px, tablet ≤1024px, single-pane só em plataformas móveis (toque)
- Encolher janela desktop NUNCA vira single-pane - gate por toque/SO

## Réplica:
- mobileLayout.ts tem classifyViewport, isPhoneViewport mas App.tsx usa window.innerWidth sem checar toque
- mobileNavigationStack.ts existe
- MobileDiffView.tsx existe mas não testado

## Arquivos:
- domain/mobileLayout.ts, mobileNavigationStack.ts
- components/MobileDiffView.tsx, Titlebar.tsx (detecção toque)
- App.tsx detectTouch()
