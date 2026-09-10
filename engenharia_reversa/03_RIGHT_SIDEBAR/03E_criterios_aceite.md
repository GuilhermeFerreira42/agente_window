# 03E - Critérios de Aceite: Right Sidebar (Auxiliary Bar)

## 1. Critérios Funcionais (Executáveis)

### 1.1. Controle de Visibilidade
- [ ] **GIVEN** que a Right Sidebar está oculta **WHEN** o usuário dispara `Ctrl+Alt+B` ou clica no botão de layout **THEN** a barra deve expandir lateralmente à direita sem empurrar o conteúdo para fora da tela (reduzindo a largura do editor).
- [ ] **GIVEN** que a Right Sidebar está visível **WHEN** o usuário dispara o comando de toggle **THEN** a barra deve deslizar para fora da tela e o editor deve recuperar o espaço horizontal.

### 1.2. Gestão de Layout (Maximização)
- [ ] **GIVEN** a Right Sidebar visível **WHEN** o usuário aciona `workbench.action.maximizeAuxiliaryBar` **THEN** o Editor e o Painel Inferior devem ser ocultados e a barra deve ocupar 100% da largura da janela.
- [ ] **GIVEN** a Right Sidebar maximizada **WHEN** o usuário aciona a restauração **THEN** o layout deve retornar ao estado anterior (Editor + Sidebar).

### 1.3. Hospedagem de Views
- [ ] **GIVEN** uma view registrada para `AuxiliaryBar` **WHEN** a barra é renderizada **THEN** o ícone da view deve aparecer na Composite Bar superior e, ao clicar, o conteúdo da view deve ser renderizado no corpo da barra.

## 2. Critérios Técnicos (Qualidade)
- [ ] **Performance**: O tempo de transição de visibilidade (animação) não deve exceder 200ms.
- [ ] **Estado**: A visibilidade da barra deve ser persistida no `localStorage` ou `IndexedDB` para sobreviver ao refresh da página.
- [ ] **Z-Index**: A barra deve estar posicionada acima de qualquer elemento de overlay do editor, mas abaixo de modais globais.
