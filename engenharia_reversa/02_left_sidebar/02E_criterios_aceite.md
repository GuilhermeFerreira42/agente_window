# 02E - Critérios de Aceite: Left Sidebar

## 1. Critérios Funcionais (Executáveis)

### 1.1. Navegação e Troca de Views
- [ ] **GIVEN** que a Sidebar está aberta **WHEN** o usuário clica em um ícone da Activity Bar **THEN** o `activeViewletId` deve ser atualizado e a view correspondente deve ser renderizada instantaneamente.
- [ ] **GIVEN** que uma view está ativa **WHEN** o usuário clica no ícone da view já ativa **THEN** a Sidebar deve ser fechada (Toggle behavior).

### 1.2. Dinâmica de Layout
- [ ] **GIVEN** a configuração `workbench.activity.location` definida como `TOP` **WHEN** a aplicação é carregada **THEN** a Activity Bar deve ser renderizada horizontalmente no topo da Sidebar.
- [ ] **GIVEN** a Modern UI ativa **WHEN** a Sidebar é renderizada **THEN** ela deve apresentar margens externas e bordas arredondadas (estética de card flutuante).

### 1.3. Interação e Foco
- [ ] **GIVEN** o foco no editor **WHEN** o usuário pressiona `Ctrl+B` (ou comando similar) **THEN** a Sidebar deve alternar sua visibilidade sem perder o estado da view ativa.
- [ ] **GIVEN** a navegação via teclado **WHEN** o usuário usa `Up/Down` na Activity Bar **THEN** o foco deve alternar entre os ícones e disparar a troca de viewlet.

## 2. Critérios Técnicos (Qualidade)
- [ ] **Performance**: A troca de viewlets não deve causar re-renderização total da Sidebar, apenas do conteúdo do container ativo.
- [ ] **Persistência**: O `activeViewletId` deve ser salvo no `localStorage` para que a mesma view permaneça aberta após o reload da página.
- [ ] **Acessibilidade**: Cada ícone da Activity Bar deve possuir um `aria-label` descritivo e suporte a navegação via Tab.
