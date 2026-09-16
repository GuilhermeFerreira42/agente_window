# 02A - Inventário do Subsistema: Left Sidebar

## 1. Componentes de UI (Estruturais)
- **SidebarPart**: O componente principal que gerencia a área da barra lateral. Estende `AbstractPaneCompositePart`.
- **ActivitybarPart**: A barra estreita (rail) que contém os ícones de acesso rápido.
- **ActivityBarCompositeBar**: O container lógico que organiza os ícones (ações) da Activity Bar.
- **PaneCompositeBar**: Classe base para barras compostas que gerencia itens pinados e placeholders.
- **ViewContainers (Viewlets)**: Containers lógicos (ex: Explorer, Search, Source Control) que agrupam views relacionadas.
- **Views**: As instâncias reais de conteúdo dentro de um View Container.

## 2. Pontos de Contribuição e Extensibilidade
- **ViewContainerLocation.Sidebar**: Localização lógica onde extensões registram seus containers de visualização.
- **MenuId.SidebarTitle**: Menu de título no topo da sidebar.
- **IViewDescriptorService**: Serviço que resolve a definição de views e containers.

## 3. Configurações e Estado (Settings)
- `workbench.sidebar.activeviewletid`: ID do container de visualização ativo no momento.
- `workbench.activity.pinnedViewlets2`: Lista de containers pinados na Activity Bar.
- `workbench.activity.placeholderViewlets`: Containers que aparecem como placeholders.
- `workbench.activity.location`: Posição da Activity Bar (`top`, `bottom`, `hidden`, `default`).
- `workbench.activity.compact`: Ativa a densidade compacta da Modern UI.

## 4. Recursos Visuais (Temas)
- **Cores**: Definidas via tokens como `SIDE_BAR_BACKGROUND`, `ACTIVITY_BAR_FOREGROUND`, `ACTIVITY_BAR_ACTIVE_BORDER`.
- **Estilos**: Implementados via CSS em `sidebarpart.css` e `activitybarpart.css`.
