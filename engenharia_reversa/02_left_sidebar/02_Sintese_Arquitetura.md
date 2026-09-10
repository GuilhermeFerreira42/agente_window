# 02E - Síntese Arquitetural e Critérios de Aceite

## 1. Padrão de Design
O subsistema da Left Sidebar implementa o padrão **Composite Part**. A sidebar não é apenas um container estático, mas uma composição de partes (`ActivitybarPart` + `PaneCompositePart`) que podem ser reconfiguradas dinamicamente.

## 2. Desacoplamento e Extensibilidade
O design é altamente desacoplado através do uso de **View Descriptors**. A `SidebarPart` não sabe quais views existem; ela apenas gerencia a "janela" onde as views são renderizadas. As extensões registram seus containers via `ViewContainerLocation.Sidebar`, e o `IViewsService` resolve a implementação real no momento da ativação.

## 3. Complexidade de Layout (Modern UI)
A transição para a Modern UI introduziu uma camada de complexidade no cálculo de dimensões (`baseWidth`, `actionGap`, `floatingHorizontalGutter`). A Activity Bar deixou de ser um elemento fixo para se tornar um componente responsivo que reage a:
- **Densidade**: Compact vs Default.
- **Posição**: Top vs Bottom vs Side.
- **Contexto**: Floating Panels enabled vs disabled.

## 4. Critérios de Aceite para a Implementação
Para que a extração deste subsistema seja considerada completa e correta, os seguintes critérios devem ser satisfeitos:
- [ ] **Inventário Completo**: Todos os componentes estruturais da Sidebar e Activity Bar identificados.
- [ ] **Mapeamento de Fluxo**: O caminho desde o clique no ícone até a renderização da view deve estar documentado.
- [ ] **Rastreabilidade de Código**: Cada componente deve estar vinculado a seu arquivo fonte correspondente no repositório `vscode-main`.
- [ ] **Análise de Configuração**: O impacto de cada setting de layout (`ACTIVITY_BAR_LOCATION`, etc.) deve estar explicitado.
- [ ] **Sintese Arquitetural**: O padrão de design (Composite Part) deve ser identificado e explicado.
