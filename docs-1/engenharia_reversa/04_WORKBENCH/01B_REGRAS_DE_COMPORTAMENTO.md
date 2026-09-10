# CAMADA B — REGRAS DE COMPORTAMENTO (Workbench / Layout / Tabs)

## 1. Regras de Layout e Visibilidade (EARS)

### Visibilidade de Partes
- **Ubiquitous**: O sistema deve manter um `workbenchGrid` (Grade de Trabalho) para gerenciar a distribuição espacial de todas as partes (`Parts`).
- **Event-driven**: Quando o usuário alternar a visibilidade de uma parte (ex: Sidebar), o sistema deve atualizar o estado `HIDDEN` daquela parte e disparar o método `layout()` para redistribuir o espaço disponível.
- **State-driven**: Enquanto a `Sidebar` estiver oculta, o sistema deve aplicar a classe CSS `nosidebar` ao container principal.
- **Event-driven**: Quando o Editor for ocultado, o sistema deve, por padrão, exibir o Painel (Panel), a menos que a Barra Auxiliar esteja maximizada.

### Posicionamento e Alinhamento
- **Ubiquitous**: O sistema deve permitir a movimentação do Painel entre as posições `TOP`, `BOTTOM`, `LEFT` e `RIGHT`.
- **Event-driven**: Quando a posição da Sidebar for alterada, o sistema deve inverter as classes de posicionamento (`left` $\leftrightarrow$ `right`) e reordenar as views no `workbenchGrid`.
- **State-driven**: Enquanto o Painel estiver em posição horizontal, o sistema deve permitir a alteração de seu alinhamento entre `left`, `center` e `right`.

### Modos Especiais (Zen & Modern UI)
- **State-driven**: Enquanto o `Zen Mode` estiver ativo, o sistema deve ocultar a Activity Bar, Sidebar, Painel e Status Bar, e forçar o modo tela cheia.
- **State-driven**: Enquanto o `Modern UI` estiver habilitado, o sistema deve aplicar margens de "cards flutuantes" (`FLOATING_PANEL_MARGIN`) às partes.
- **Optional**: Onde o `Center Layout` for habilitado, o sistema deve restringir a largura do grupo de editores principal para centralizá-lo na tela.

### Dimensionamento e Foco
- **Event-driven**: Quando o usuário arrastar a borda de uma parte, o sistema deve invocar `resizePart()` para atualizar as dimensões da view no grid.
- **Event-driven**: Quando o usuário alternar o estado de maximização da Barra Auxiliar, o sistema deve ocultar o Editor e o Painel para dar foco total à barra.
- **Ubiquitous**: O sistema deve calcular o `maximumEditorDimensions` subtraindo a soma das larguras/alturas das partes visíveis da dimensão total do container.

## 2. Regras de Gestão de Abas e Grupos (Editor)

- **Ubiquitous**: O sistema deve organizar editores em `EditorGroups`.
- **Event-driven**: Quando um novo editor é aberto em uma coluna específica, o sistema deve criar ou mover o editor para o grupo correspondente.
- **Event-driven**: Quando um grupo de editores é fechado, o sistema deve redistribuir as abas restantes entre os grupos sobreviventes.
- **State-driven**: Enquanto um grupo de editores estiver maximizado, as outras colunas de editores devem ser ocultadas.
