# 02B - Comportamento do Subsistema: Left Sidebar

## 1. Fluxo de Interação Principal
1. **Seleção de Ícone**: O usuário clica em um ícone na `ActivitybarPart`.
2. **Troca de Contexto**: O `ActivityBarCompositeBar` notifica a mudança de estado.
3. **Atualização da Sidebar**: O `SidebarPart` altera o `activeViewletId` para o container correspondente ao ícone clicado.
4. **Renderização de Views**: O container de visualização (View Container) torna-se ativo, disparando a renderização de suas views internas.

## 2. Dinâmicas de Layout
- **Posicionamento**: A Activity Bar pode ser movida para o topo ou fundo via `LayoutSettings.ACTIVITY_BAR_LOCATION`, alterando a orientação da `CompositeBar` (Vertical $\rightarrow$ Horizontal).
- **Auto-Hide**: O sistema utiliza o `VisibleViewContainersTracker` para ocultar a Activity Bar automaticamente quando apenas um container está visível, otimizando o espaço.
- **Modern UI (Floating Panels)**: Quando habilitado, a Activity Bar torna-se um "card flutuante" com margens externas e bordas arredondadas, separando-se visualmente da borda da janela.

## 3. Estados de Foco e Navegação
- **Navegação por Teclado**: Suporte a `Up/Down` e `Left/Right` para navegar entre ícones da Activity Bar e alternar o foco entre a barra e o conteúdo da sidebar.
- **Sincronização de Foco**: Ao focar a Activity Bar, o sistema verifica a visibilidade da Sidebar e ajusta o foco para o item ativo.
