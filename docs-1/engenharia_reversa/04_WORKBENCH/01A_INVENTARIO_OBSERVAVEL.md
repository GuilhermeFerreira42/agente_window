# CAMADA A — INVENTÁRIO OBSERVÁVEL (Workbench / Layout / Tabs)

## 1. Gestão de Visibilidade (Parts)
- **Alternância de Visibilidade**: O usuário pode ocultar ou exibir as seguintes áreas:
  - Barra de Atividades (Activity Bar)
  - Barra Lateral Primária (Sidebar)
  - Painel Inferior (Panel)
  - Barra de Status (Status Bar)
  - Barra Lateral Auxiliar (Auxiliary Bar)
- **Dependências de Visibilidade**: Algumas partes não podem ser ocultadas simultaneamente (ex: Editor e Painel não podem sumir ao mesmo tempo, a menos que a Barra Auxiliar esteja maximizada).

## 2. Posicionamento e Alinhamento
- **Posição da Sidebar**: A Barra Lateral pode ser movida entre a esquerda e a direita.
- **Posição do Painel**: O Painel pode ser posicionado na parte inferior, superior, esquerda ou direita.
- **Alinhamento do Painel**: Quando horizontal, o painel pode ser alinhado à esquerda, centro ou direita.
- **Barra de Atividades**: Pode ser movida para o topo ou fundo da janela.

## 3. Modos de Exibição e Foco
- **Zen Mode**: Um modo de foco total que oculta a maioria das partes e centraliza o editor.
- **Maximização de Partes**: O Painel e a Barra Auxiliar podem ser maximizados, ocupando toda a área do workbench.
- **Fullscreen**: A janela pode entrar em modo tela cheia, removendo bordas do SO.

## 4. Gestão do Editor (Tabs & Groups)
- **Grupos de Editores**: O editor central pode ser dividido em múltiplos grupos (split screen), organizados horizontal ou verticalmente.
- **Sistema de Abas**: Cada grupo de editores mantém uma lista de abas abertas.
- **Navegação entre Abas**: Suporte a troca de abas, fechamento e fixação (pinning).
- **Layout Centrado**: Opção de centralizar o editor principal na tela.

## 5. Interação Espacial e Dimensionamento
- **Redimensionamento (Resize)**: Bordas arrastáveis permitem alterar a largura da Sidebar, a altura do Painel e a proporção entre Grupos de Editores.
- **Snapping**: As partes "grudam" nas bordas da janela.
- **Modern UI (Floating Panels)**: Modo experimental onde as partes aparecem como "cards" flutuantes com margens internas e externas.

## 6. Ciclo de Vida e Estado
- **Persistência de Layout**: As posições, tamanhos e visibilidades das partes são salvos e restaurados ao reiniciar a aplicação.
- **Sincronização de Container**: O layout se ajusta automaticamente ao redimensionar a janela do navegador ou do app.
