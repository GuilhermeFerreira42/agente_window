# CAMADA C — MAPA DE CÓDIGO DE REFERÊNCIA (Workbench / Layout / Tabs)

## 1. Orquestração e Serviço de Layout
| Componente | Arquivo | Responsabilidade |
|---|---|---|
| **Layout Service** | `src/vs/workbench/services/layout/browser/layoutService.ts` | Define a interface `IWorkbenchLayoutService` e as constantes de partes (`Parts`), posições e configurações de Zen Mode. |
| **Layout Implementation** | `src/vs/workbench/browser/layout.ts` | Implementa a classe `Layout`. Gerencia a `workbenchGrid` (grade serializável), calcula dimensões de containers e coordena a visibilidade das partes. |
| **Workbench Core** | `src/vs/workbench/browser/workbench.ts` | Classe `Workbench` que estende `Layout`. Responsável pelo bootstrap do workbench, inicialização de serviços e criação física dos containers de cada parte no DOM. |

## 2. Implementação das Partes (Visual & Lógica)
| Parte | Arquivo | Responsabilidade |
|---|---|---|
| **Base Part** | `src/vs/workbench/browser/part.ts` | Classe base `Part` que define o ciclo de vida básico e a interface de container de cada área do workbench. |
| **Sidebar** | `src/vs/workbench/browser/parts/sidebar/sidebarPart.ts` | Gerencia a barra lateral primária e a navegação entre Viewlets. |
| **Panel** | `src/vs/workbench/browser/parts/panel/panelPart.ts` | Gerencia o painel inferior/lateral e a renderização de consoles/terminais. |
| **Activity Bar** | `src/vs/workbench/browser/parts/activitybar/activitybarPart.ts` | Implementa a barra de ícones de navegação global. |
| **Editor Area** | `src/vs/workbench/browser/parts/editor/editorPart.ts` | Orquestra a área central de edição, grupos de editores e a renderização de abas. |
| **Status Bar** | `src/vs/workbench/browser/parts/statusbar/statusbarPart.ts` | Renderiza a barra de status inferior com informações de contexto e indicadores. |

## 3. Mecanismos de Layout (Infraestrutura)
| Mecanismo | Arquivo | Descrição |
|---|---|---|
| **Serializable Grid** | `src/vs/base/browser/ui/grid/grid.ts` | O motor de layout subjacente que permite redimensionamento, snapping e persistência de posições de views. |
| **DOM Utilities** | `src/vs/base/browser/dom.js` | Funções de medição de área (`getClientArea`), detecção de ancestralidade e manipulação de elementos. |
| **Window Management** | `src/vs/base/browser/window.js` | Abstração da janela do navegador/Electron, gerenciando múltiplos containers e estados de fullscreen. |
