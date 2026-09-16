# 03F — Contrato de Implementação: Right Sidebar

## Objetivo
Definir a barra lateral secundária como host de views auxiliares independente da Left Sidebar.

## Responsabilidade do módulo
Hospedar visualizações auxiliares, preservar visibilidade independente e reagir ao layout global sem depender semanticamente da sidebar primária.

## Contratos mínimos
```ts
interface AuxiliaryViewDescriptor {
  id: string;
  title: string;
  location: 'rightSidebar';
  canMaximize?: boolean;
}

interface RightSidebarService {
  registerAuxiliaryView(descriptor: AuxiliaryViewDescriptor): () => void;
  activateAuxiliaryView(id: string): void;
  setVisible(visible: boolean): void;
}
```

## Regras do módulo
- visibilidade independente da Left Sidebar;
- integração obrigatória com `WorkbenchLayoutService`;
- views resolvidas por registro, não por import direto da barra.

## Proibições
- acoplar existência da right sidebar a um único recurso;
- misturar lógica de maximização com lógica de conteúdo da view;
- hardcodar tema fora do `ThemeService`.
