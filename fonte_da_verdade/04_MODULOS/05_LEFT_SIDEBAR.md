# 05 — MÓDULO: LEFT SIDEBAR

## 1. Visão Geral
A Left Sidebar é a espinha dorsal da navegação primária do Workbench. Ela é composta por dois elementos fundamentais: a **Activity Bar** (uma barra estreita de ícones, também chamada de Rail) e a **Sidebar Part** (o painel de conteúdo que exibe a viewlet ativa). Sua função é permitir que o usuário alterne rapidamente entre contextos globais (Explorador, Busca, Git, etc.) sem perder o foco da área de trabalho principal.

## 2. Componentes Estruturais
A estrutura da Sidebar é baseada no padrão de *Composite Parts*, permitindo que diferentes containers de visualização sejam injetados dinamicamente.

- **Activity Bar (Rail)**:
    - `ActivitybarPart`: Gerencia a renderização da coluna de ícones e a interação de seleção.
    - `ActivityBarCompositeBar`: Orquestra a disposição dos ícones e suporta a Modern UI (estética de card flutuante).
- **Sidebar Part (Content)**:
    - `SidebarPart`: Orquestrador do painel lateral. Controla a largura, a visibilidade e a transição entre viewlets.
    - `ViewContainer`: O container que hospeda a viewlet ativa (ex: o Explorer).
- **Serviços de Suporte**:
    - `IWorkbenchLayoutService`: Controla a posição (Left/Right) e o estado de visibilidade (oculto/visível).
    - `IViewsService`: Responsável por registrar e instanciar as views que compõem cada viewlet.
    - `VisibleViewContainersTracker`: Rastreia a atividade dos containers para gerenciar a auto-ocultação inteligente da Activity Bar.

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Navegação e Troca de Contexto
- **Troca de Viewlet**: **Dado** que a Sidebar está aberta $\rightarrow$ **Quando** o usuário clica em um ícone da Activity Bar $\rightarrow$ **Então** o `activeViewletId` é atualizado e o conteúdo da Sidebar é substituído pela view correspondente instantaneamente.
- **Alternância (Toggle)**: **Dado** que uma view está ativa $\rightarrow$ **Quando** o usuário clica no ícone da view já ativa $\rightarrow$ **Então** a Sidebar é fechada (Toggle behavior).
- **Atalho de Visibilidade**: **Dado** que o foco está no editor $\rightarrow$ **Quando** o usuário pressiona `Ctrl+B` $\rightarrow$ **Então** a Sidebar alterna sua visibilidade sem alterar a viewlet que estava ativa.

### 3.2. Dinâmica de Interface e Layout
- **Posicionamento do Rail**: **Dado** a configuração `workbench.activity.location` $\rightarrow$ **Quando** definida como `TOP` $\rightarrow$ **Então** a Activity Bar é renderizada horizontalmente no topo da Sidebar.
- **Estética Modern UI**: **Dado** a Modern UI ativa $\rightarrow$ **Quando** a Sidebar é renderizada $\rightarrow$ **Então** ela apresenta margens externas e bordas arredondadas, simulando um card flutuante sobre o fundo da aplicação.
- **Navegação via Teclado**: **Dado** o foco na Activity Bar $\rightarrow$ **Quando** o usuário utiliza as setas `Up/Down` $\rightarrow$ **Então** o foco alterna entre os ícones e dispara a troca de viewlet.

## 4. Mapa de Implementação Técnica

| Funcionalidade | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Orquestração Geral** | `src/vs/workbench/browser/parts/sidebar/sidebarPart.ts` | Gerencia largura, cores e a instância da Activity Bar. |
| **Renderização do Rail** | `src/vs/workbench/browser/parts/activitybar/activitybarPart.ts` | Lógica de ícones e suporte à Modern UI. |
| **Lógica de Visibilidade** | `src/vs/workbench/browser/parts/paneCompositePart.ts` | Gestão de estágios de visibilidade e pinagem. |
| **Geometria Global** | `src/vs/workbench/browser/layout.ts` | Controle de posição (Left/Right) e visibilidade. |
| **Auto-ocultação** | `src/vs/workbench/browser/parts/sidebar/visibleViewContainersTracker.ts` | Rastreamento de containers ativos para UI adaptativa. |
| **Navegação de Foco** | `src/vs/workbench/browser/parts/sidebar/sidebarPart.ts` | Implementação de `focusActivityBar()`. |

## 5. Integrações Cross-Subsystem
A Left Sidebar atua como o portal de entrada para quase todos os outros subsistemas:
- **Integração com Editor**: Sincroniza a abertura de arquivos no Explorer para disparar a criação de abas no Editor.
- **Integração com Temas**: Consome tokens de cores do `IThemeService` para aplicar cores semânticas aos ícones e fundos da Activity Bar.
- **Integração com Configurações**: Reage em tempo real a mudanças no `IConfigurationService` para alterar a posição do rail ou o comportamento de auto-hide.

## 6. Critérios de Aceite
- [ ] **Troca Instantânea**: A mudança de viewlet via Activity Bar ocorre sem flicker e sem re-renderização total da Sidebar.
- [ ] **Toggle Funcional**: Clique duplo no mesmo ícone deve fechar a Sidebar.
- [ ] **Fidelidade Visual**: Implementação correta das margens e bordas arredondadas da Modern UI.
- [ ] **Persistência de Estado**: A viewlet ativa deve ser mantida após o reload da aplicação via `localStorage`.
- [ ] **Acessibilidade**: Todos os ícones da Activity Bar devem possuir `aria-label` e suporte completo a navegação via Tab.
- [ ] **Performance**: A transição de visibilidade (`Ctrl+B`) deve ser fluida (60 FPS) e não impactar o desempenho do editor.
