# 03A - Inventário do Subsistema: Right Sidebar (Auxiliary Bar)

## 1. Identificação do Componente
- **Nome Interno**: `AuxiliaryBarPart` / `AUXILIARYBAR_PART`
- **Nome Público**: Secondary Side Bar (Barra Lateral Secundária)
- **Função**: Container lateral opcional para visualizações (views) que complementam a área de edição sem obstruir a Barra Lateral Primária.

## 2. Componentes de Interface (UI)
- **Parte Principal**: `AuxiliaryBarPart` (estende `AbstractPaneCompositePart`).
- **Barra de Composites**: `IPaneCompositeBar` (gerencia a trilha de ícones/abas no topo ou lateral).
- **Containers de View**: `ViewContainerLocation.AuxiliaryBar`.

## 3. Configurações (Settings)
| Chave de Configuração | Descrição | Valor Padrão |
|----------------------|-------------|---------------|
| `workbench.auxiliarybar.activepanelid` | ID do painel ativo na barra secundária | N/A |
| `workbench.auxiliarybar.pinnedPanels` | Lista de painéis fixados | `[]` |
| `workbench.secondarySideBar.showLabels` | Exibe rótulos de texto junto aos ícones | `true` |
| `workbench.activityBar.location` | Afeta a posição da barra de atividade vinculada | `default` |

## 4. Comandos e Ações (Commands)
| Comando | ID do Comando | Função |
|----------|---------------|---------|
| Toggle Visibility | `workbench.action.toggleAuxiliaryBar` | Alterna a visibilidade da barra secundária |
| Close Bar | `workbench.action.closeAuxiliaryBar` | Fecha a barra secundária |
| Focus Bar | `workbench.action.focusAuxiliaryBar` | Move o foco para a barra secundária |
| Maximize | `workbench.action.maximizeAuxiliaryBar` | Maximiza a barra, ocultando editor e painel |
| Restore | `workbench.action.restoreAuxiliaryBar` | Restaura o layout após maximização |
| Toggle Max | `workbench.action.toggleMaximizedAuxiliaryBar` | Alterna entre estado normal e maximizado |

## 5. Context Keys (Estado)
- `SecondarySideBarVisibleContext`: Indica se a barra está visível.
- `AuxiliaryBarMaximizedContext`: Indica se a barra está no modo maximizado.
- `ActiveAuxiliaryContext`: Vinculado ao painel ativo na barra.
