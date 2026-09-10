# CAMADA D — ANÁLISE DE LACUNAS (Workbench / Layout / Tabs)

## 1. Matriz de Comparação: VS Code vs. AGENTE WINDOW

Esta análise identifica a distância entre a implementação complexa do VS Code e a necessidade de modularidade e fidelidade do AGENTE WINDOW.

| Recurso | VS Code (Fonte da Verdade) | AGENTE WINDOW (Alvo) | Gap / Decisão de Design |
|---|---|---|---|
| **Motor de Grid** | `SerializableGrid` complexo com persistência binária e snapping avançado. | Grid Responsivo baseado em CSS Grid / Flexbox + State Management. | **Simplificação**: Substituir a complexidade do `SerializableGrid` por um sistema de coordenadas simples (X, Y, W, H) persistido em JSON. |
| **Posicionamento de Partes** | Suporte dinâmico para mover Painel (Panel) para qualquer borda (T, B, L, R). | Layout fixo com suporte a inversão (L $\leftrightarrow$ R) da Sidebar e Painel Bottom/Right. | **Redução de Escopo**: Manter apenas as posições mais comuns (Bottom/Right) para o MVP, removendo a movimentação livre para Top/Left. |
| **Zen Mode** | Orquestração profunda de visibilidade, alterando comportamentos de renderização globais. | Toggle de visibilidade global via classes CSS (`.zen-mode`) e estado de UI. | **Simplificação**: Implementar como um "Preset de Visibilidade" que oculta as partes não essenciais. |
| **Modern UI (Floating)** | Sistema de margens internas e "cards" flutuantes com sombras e blur. | Interface Flat com bordas definidas e separadores claros. | **Descarte (MVP)**: Remover a complexidade de painéis flutuantes; focar em layout "snapped" (estilo clássico). |
| **Split-Screen Editor** | Gestão complexa de `EditorGroups` com redistribuição automática de abas. | Suporte a Split Horizontal/Vertical simples com 2 a 4 colunas. | **Replicação Parcial**: Implementar a lógica de grupos de editores, mas sem a complexidade de redistribuição automática profunda. |
| **Persistência** | Estado serializado em arquivos de configuração proprietários. | Estado de layout salvo em `localStorage` ou DB local via JSON. | **Modernização**: Usar Zustand/Redux para estado em memória e JSON para persistência simples. |

## 2. Priorização de Implementação (MoSCoW)

### Must Have (Essencial para a Fidelidade)
- [ ] Sistema de visibilidade de partes (Toggle Sidebar, Panel, Activity Bar).
- [ ] Redimensionamento (Resize) básico de Sidebar e Painel.
- [ ] Layout de Editor com suporte a abas e split simples.
- [ ] Sincronização do Layout com o redimensionamento da janela.

### Should Have (Alta Valor Agregado)
- [ ] Zen Mode (Ocultação global de distrações).
- [ ] Inversão de lado da Sidebar (Left $\leftrightarrow$ Right).
- [ ] Persistência de layout entre sessões.

### Could Have (Desejável / V2)
- [ ] Movimentação do Painel para a lateral direita.
- [ ] Layout Centrado para o editor.

### Won't Have (Fora de Escopo do MVP)
- [ ] Painéis flutuantes (Modern UI).
- [ ] Movimentação livre de partes via Drag-and-Drop (estilo Tiling Window Manager).

## 3. Riscos Técnicos Identificados
- **Performance de Resize**: O redimensionamento frequente de componentes complexos (como o Terminal ou Mapas de Código) pode causar lag se o trigger de `layout()` for excessivo. 
  - *Mitigação*: Usar `requestAnimationFrame` e debouncing no motor de resize.
- **Z-Index e Overlays**: A sobreposição de painéis maximizados pode conflitar com modais e tooltips.
  - *Mitigação*: Definir uma hierarquia estrita de `z-index` para as camadas do Workbench.
