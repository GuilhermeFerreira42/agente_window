# CODIGO MOCKADO ATUAL - CUSTOM VIEW GRID

## Arquivo: src/components/CustomizationsView.tsx

Existe mas não implementa lógica de esconder outras parts.

## Arquivo: src/App.tsx

```ts
const [customizationsOpen, setCustomizationsOpen] = useState(false)

// Hoje: customizations é só mais uma tab no editor, não full-surface que substitui tudo
const openCustomizations = () => {
  openEditorTab('customizations', { title: 'AI Customizations' })
}

// Deveria ser:
const [activeCustomView, setActiveCustomView] = useState<string | null>(null)
// Quando activeCustomView !== null, esconder Sessions Part, Editor, Aux, Panel
```

## Arquivo: src/domain/customView? Não existe service

Original tem ICustomViewService que owns active contributed full-surface view. Réplica não tem.

## CSS: não esconde parts quando custom view ativo
