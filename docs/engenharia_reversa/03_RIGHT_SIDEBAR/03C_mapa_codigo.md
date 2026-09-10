# 03C - Mapa de Código: Right Sidebar

## 1. Estrutura de Diretórios Principal
O código do subsistema está concentrado em:
`vscode-main/src/vs/workbench/browser/parts/auxiliarybar/`

## 2. Componentes Core
| Arquivo | Classe/Responsabilidade | Descrição |
|----------|-------------------------|------------|
| `auxiliaryBarPart.ts` | `AuxiliaryBarPart` | A classe principal do componente. Gerencia o ciclo de vida, estilos, dimensões e a barra de ícones (Composite Bar). |
| `auxiliaryBarActions.ts` | `ToggleAuxiliaryBarAction` | Definição de todas as ações de UI (Toggle, Maximize, Focus) e seus atalhos de teclado. |

## 3. Serviços de Suporte (Dependências)
| Arquivo | Serviço | Papel no Subsistema |
|----------|---------|-------------------|
| `services/layout/browser/layoutService.ts` | `IWorkbenchLayoutService` | Orquestrador global de visibilidade e posicionamento de todas as partes do workbench. |
| `services/panecomposite/browser/panecomposite.ts` | `IPaneCompositePartService` | Gerencia a pilha de painéis compostos (os "containers" de views) dentro da barra. |
| `common/views.ts` | `ViewContainerLocation` | Define a constante `AuxiliaryBar` como um local válido para registro de views. |
| `common/contextkeys.ts` | `SecondarySideBarVisibleContext` | Provê a reatividade para a UI (ex: esconder botões quando a barra está fechada). |

## 4. Hierarquia de Herança
`Part` $\rightarrow$ `AbstractPaneCompositePart` $\rightarrow$ `AuxiliaryBarPart`

## 5. Pontos de Integração de CSS
- **Estilos Locais**: `src/vs/workbench/browser/parts/auxiliarybar/media/auxiliaryBarPart.css`
- **Estilos Globais**: Integração com `floatingPanels.css` quando o experimento de Modern UI está ativo.
