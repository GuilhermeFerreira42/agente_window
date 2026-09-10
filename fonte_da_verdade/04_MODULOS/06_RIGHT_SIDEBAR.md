# 06 — MÓDULO: RIGHT SIDEBAR (AUXILIARY BAR)

## 1. Visão Geral
A Right Sidebar (ou Auxiliary Bar) é um container lateral opcional projetado para hospedar visualizações (views) que complementam a área de edição sem obstruir a Barra Lateral Primária (Left Sidebar). Diferente da barra esquerda, que é essencial para a navegação no projeto, a barra direita é focada em ferramentas de apoio, documentação auxiliar e painéis de metadados, permitindo que o usuário mantenha múltiplas fontes de informação visíveis simultaneamente.

## 2. Componentes Estruturais
O subsistema segue a arquitetura de *Composite Parts* do Workbench, garantindo que a barra secundária seja tratada como uma entidade independente no layout global.

- **Estrutura Core**:
    - `AuxiliaryBarPart`: Classe principal que estende `AbstractPaneCompositePart`. Gerencia o ciclo de vida, as dimensões da barra e a renderização do corpo.
    - `IPaneCompositeBar`: Gerencia a trilha de ícones e abas (Composite Bar) localizada no topo ou na lateral da barra, permitindo a alternância entre diferentes painéis.
- **Gestão de Conteúdo**:
    - `ViewContainerLocation.AuxiliaryBar`: Identificador global utilizado pelo `IViewsService` para registrar quais views devem ser renderizadas especificamente nesta barra.
    - `IPaneCompositePartService`: Gerencia a pilha de painéis compostos dentro da barra, controlando qual painel está no topo.
- **Controle de Estado**:
    - `SecondarySideBarVisibleContext`: Context Key que provê reatividade para a UI (ex: ocultar botões de controle quando a barra está fechada).
    - `AuxiliaryBarMaximizedContext`: Context Key que sinaliza o estado de maximização, disparando a ocultação de outras partes do Workbench.

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Controle de Visibilidade
- **Expansão**: **Dado** que a Right Sidebar está oculta $\rightarrow$ **Quando** o usuário dispara `Ctrl+Alt+B` ou clica no botão de layout $\rightarrow$ **Então** a barra expande lateralmente à direita, reduzindo proporcionalmente a largura do editor.
- **Colapso**: **Dado** que a Right Sidebar está visível $\rightarrow$ **Quando** o usuário dispara o comando de toggle $\rightarrow$ **Então** a barra desliza para fora da tela e o editor recupera o espaço horizontal total.

### 3.2. Gestão de Layout (Maximização)
- **Modo Maximizado**: **Dado** a Right Sidebar visível $\rightarrow$ **Quando** o usuário aciona `workbench.action.maximizeAuxiliaryBar` $\rightarrow$ **Então** o Editor e o Painel Inferior são ocultados e a barra assume 100% da largura da janela.
- **Restauração**: **Dado** a Right Sidebar maximizada $\rightarrow$ **Quando** o usuário aciona a restauração $\rightarrow$ **Então** o layout retorna ao estado anterior (Editor + Sidebar).

### 3.3. Hospedagem de Views
- **Renderização Dinâmica**: **Dado** uma view registrada para a localização `AuxiliaryBar` $\rightarrow$ **Quando** a barra é renderizada $\rightarrow$ **Então** o ícone da view aparece na Composite Bar e, ao clicar, seu conteúdo é injetado no corpo da barra.

## 4. Mapa de Implementação Técnica

| Funcionalidade | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Core do Componente** | `src/vs/workbench/browser/parts/auxiliarybar/auxiliaryBarPart.ts` | Ciclo de vida, estilos, dimensões e Composite Bar. |
| **Ações de UI** | `src/vs/workbench/browser/parts/auxiliarybar/auxiliaryBarActions.ts` | Implementação de Toggle, Maximize e Focus. |
| **Estado de Contexto** | `src/vs/workbench/browser/parts/auxiliarybar/common/contextkeys.ts` | Definição de `AuxiliaryBarMaximizedContext`. |
| **Auto-ocultação** | `src/vs/workbench/browser/parts/auxiliarybar/visibleViewContainersTracker.ts` | Rastreio de visibilidade para UI adaptativa. |
| **Orquestração Layout** | `src/vs/services/layout/browser/layoutService.ts` | Gestão de visibilidade global e posicionamento. |
| **Estilos CSS** | `src/vs/workbench/browser/parts/auxiliarybar/media/auxiliaryBarPart.css` | Definições visuais da barra e integração com Modern UI. |

## 5. Integrações Cross-Subsystem
A Right Sidebar é fortemente dependente do serviço de layout global:
- **Exclusão Mútua**: O modo maximizado da Right Sidebar comunica-se com o `IWorkbenchLayoutService` para forçar a ocultação do Editor e do Painel Inferior.
- **Registro de Views**: Integra-se ao `IViewsService` para descobrir quais extensões ou módulos do sistema solicitaram espaço na barra secundária.
- **Sincronização de Tema**: Utiliza tokens de cor do `IThemeService` para garantir que as bordas e fundos da barra coincidam com o tema ativo.

## 6. Critérios de Aceite
- [ ] **Transição Suave**: A animação de expansão/colapso da barra deve ser fluida e não exceder 200ms.
- [ ] **Maximização Total**: No modo maximizado, nenhum elemento do editor ou painel inferior deve permanecer visível.
- [ ] **Persistência de Visibilidade**: O estado (aberto/fechado) da Right Sidebar deve ser salvo no `localStorage` para persistir após refresh.
- [ ] **Z-Index Correto**: A barra deve renderizar acima do editor, mas abaixo de modais globais e pop-ups de notificação.
- [ ] **Hospedagem Dinâmica**: Qualquer view registrada para a `AuxiliaryBar` deve ser renderizada automaticamente sem necessidade de hardcoding no componente.
