# 03B - Comportamento do Subsistema: Right Sidebar

## 1. Ciclo de Visibilidade
A visibilidade da Barra Lateral Secundária é controlada primariamente pelo `IWorkbenchLayoutService`. 
- **Ação de Toggle**: O comando `workbench.action.toggleAuxiliaryBar` invoca `layoutService.toggleSecondarySideBar()`.
- **Ocultação Explícita**: O comando `workbench.action.closeAuxiliaryBar` define o estado da parte `AUXILIARYBAR_PART` como oculto (`setPartHidden(true, ...)`).

## 2. Modo Maximizado (Maximized Mode)
Um comportamento distintivo da Right Sidebar é a capacidade de "tomar conta" da interface:
- **Ativação**: Quando maximizada, o `LayoutService` oculta as áreas do editor e do painel inferior.
- **Estado**: Monitorado pela Context Key `AuxiliaryBarMaximizedContext`.
- **Restauração**: O comando `workbench.action.restoreAuxiliaryBar` reverte a maximização, devolvendo o espaço ao editor.

## 3. Lógica de Auto-Ocultação (Auto-Hide)
A barra possui um mecanismo de otimização de espaço independente de outros componentes de sidebar:
- **Condição**: Quando a configuração `workbench.auxiliaryBar.autoHide` está ativa.
- **Gatilho**: A barra é ocultada automaticamente se houver apenas um (ou zero) container de visualização visível (`visibleViewContainersTracker.visibleCount <= 1`).

## 4. Interação com a Barra Lateral Primária
- **Posicionamento**: Embora seja chamada de "Right Sidebar", sua posição lógica é oposta à da Barra Lateral Primária (`SIDEBAR_PART`).
- **Espelhamento de Estilos**: Utiliza tokens de tema similares aos da Side Bar (`SIDE_BAR_BACKGROUND`, `SIDE_BAR_BORDER`), mas aplica bordas dinamicamente dependendo se a barra primária está à esquerda ou à direita para manter a consistência visual do "miolo" do editor.

## 5. Gerenciamento de Foco
O comando `workbench.action.focusAuxiliaryBar` garante que:
1. A barra seja tornada visível caso esteja oculta.
2. O foco do teclado seja movido para o `PaneComposite` ativo dentro da barra.
