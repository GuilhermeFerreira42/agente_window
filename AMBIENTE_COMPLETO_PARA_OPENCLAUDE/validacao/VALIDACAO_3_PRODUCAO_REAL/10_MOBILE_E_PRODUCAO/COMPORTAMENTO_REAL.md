# COMPORTAMENTO REAL - MOBILE E PRODUCAO

## Comportamento original real - Mobile
1. Phone layouts substituem parts e pickers por mobile subclasses mas preservam service contracts
2. Viewport classification: phone ≤600px, tablet ≤1024px
3. Single-pane só em plataformas móveis (toque) - encolher janela desktop NUNCA vira single-pane - gate por toque/SO
4. Auxiliary bar totalmente skipado em mobile web para evitar auto-expand disruptivo
5. Mobile navigation stack com pushLayer, navigateBack, topLayer - back dismiss custom views
6. Sidebar é drawer full-width que desliza sobre chat no phone, com transição 260ms cubic-bezier
7. Aumenta altura botões para touch (44px min-height)

## Comportamento produção
1. Build sem erros TypeScript
2. 348/348 testes unitários passando
3. 24 screenshots E2E com Playwright
4. 0 mocks - todos arquivos reais
5. Build < 2s
6. Sem console errors
7. Testes E2E: fluxo ponta-a-ponta desde interação inicial até resultado final, passando por todas camadas, usando dados mais próximos do real
