# CAMADA A — INVENTÁRIO OBSERVÁVEL (Explorer)

## 1. Elementos Visuais (UI)
- **Árvore de Arquivos (File Tree)**: Visualização hierárquica de pastas e arquivos.
- **Nós de Pasta**: Itens expansíveis/colapsáveis que contêm sub-itens.
- **Nós de Arquivo**: Itens finais que, ao serem clicados, abrem um editor.
- **Indicadores de Estado**:
  - Ícones de arquivo/pasta (baseados no tipo e tema).
  - Indicador de "Sujo" (Dirty) para arquivos com alterações não salvas.
  - Cores de destaque para arquivos em Git (estágio, modificado, etc - via Decorations).
- **Barra de Filtro/Busca**: Campo de entrada para filtrar a árvore em tempo real.
- **Área de Drop**: Zona onde arquivos podem ser arrastados para mover ou copiar.
- **Menus de Ação**:
  - Menu de contexto (botão direito) sobre arquivos/pastas.
  - Botões de ação no cabeçalho da View (Novo Arquivo, Nova Pasta, Refresh).

## 2. Ações do Usuário
- **Navegação**:
  - Expandir/Colapsar pastas (clique no "twistie" ou double-click).
  - Selecionar arquivo (single click).
  - Abrir arquivo (double click ou Enter).
- **Manipulação de Arquivos**:
  - Criar novo arquivo/pasta via menu ou botão.
  - Renomear item (F2 ou menu).
  - Deletar item (Delete ou menu).
  - Mover item (Drag and Drop).
  - Copiar/Colar itens.
- **Busca e Filtro**:
  - Digitar para filtrar a árvore.
  - Navegar entre resultados do filtro.
- **Sincronização**:
  - Forçar refresh da árvore para ler mudanças no disco.

## 3. Estados Observáveis
- **Carregando (Loading)**: Estado quando uma pasta está sendo resolvida via `IFileService`.
- **Focado**: Item atualmente selecionado via teclado ou mouse.
- **Expandido/Colapsado**: Estado de visibilidade dos filhos de uma pasta.
- **Editando**: Estado transitório quando o nome de um arquivo está sendo renomeado.
- **Filtrado**: Quando a árvore exibe apenas itens que coincidem com a busca.
- **Sincronizando**: Estado de atualização do modelo após alteração no sistema de arquivos.
