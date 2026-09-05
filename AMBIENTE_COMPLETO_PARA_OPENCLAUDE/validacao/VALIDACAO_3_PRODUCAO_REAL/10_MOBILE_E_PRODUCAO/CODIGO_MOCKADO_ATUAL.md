# CODIGO MOCKADO ATUAL - MOBILE E PRODUCAO

## Arquivo: src/domain/mobileLayout.ts

```ts
export function classifyViewport(width) {
  if (width <= 600) return 'phone'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}

export function isPhoneViewport(width) {
  return width <= 600 // sem checar toque! Encolher desktop vira mobile, errado
}
```

Deveria checar toque também.

## Arquivo: src/App.tsx

```ts
const [isMobile, setIsMobile] = useState(window.innerWidth <= 600)

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= 600) // sem toque, vira mobile só por resize desktop
  }
  window.addEventListener('resize', handleResize)
}, [])
```

Encolher janela desktop para 500px vira mobile - errado, deveria continuar desktop se sem toque.

## Arquivo: src/components/MobileDiffView.tsx

Existe mas não testado, não usado no fluxo principal.

## Produção

- 348 testes passando mas são unitários mockados, não E2E reais
- Build passa mas tem mocks (srcDoc, folders hardcoded, initialTerminalLines)
- Sem screenshots E2E reais
- Sem teste de fluxo ponta-a-ponta
