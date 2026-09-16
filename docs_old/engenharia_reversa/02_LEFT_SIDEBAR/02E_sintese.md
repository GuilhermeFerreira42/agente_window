# 02E - Síntese Arquitetural: Left Sidebar

## 1. Padrão de Design
O subsistema da Left Sidebar implementa o padrão **Composite Part**. A sidebar não é apenas um container estático, mas uma composição de partes (`ActivitybarPart` + `PaneCompositePart`) que podem ser reconfiguradas dinamicamente.

## 2. Desacoplamento e Extensibilidade
O design é altamente desacoplado através do uso de **View Descriptors**. A `SidebarPart` não sabe quais views existem; ela apenas gerencia a "janela" onde as views são renderizadas. As extensões registram seus containers via `ViewContainerLocation.Sidebar`, e o `IViewsService` resolve a implementação real no momento da ativação.

## 3. Complexidade de Layout (Modern UI)
A transição para a Modern UI introduziu uma camada de complexidade no cálculo de dimensões (`baseWidth`, `actionGap`, `floatingHorizontalGutter`). A Activity Bar deixou de ser um elemento fixo para se tornar um componente responsivo que reage a:
- **Densidade**: Compact vs Default.
- **Posição**: Top vs Bottom vs Side.
- **Contexto**: Floating Panels enabled vs disabled.

## 4. Conclusão
A arquitetura prioriza a flexibilidade de layout e a extensibilidade por plugins. O fluxo de dados é unidirecional (Config/User $\rightarrow$ Layout $\rightarrow$ Render), garantindo que a interface permaneça consistente independentemente de quantas extensões contribuam para a barra lateral.
