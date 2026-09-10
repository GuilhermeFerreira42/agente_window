# 11 — MÓDULO: THEME & TOKEN SYSTEM

## 1. Visão Geral
O sistema de Temas e Tokens é o motor de estilização reativa do AGENTE WINDOW. Ele implementa a separação total entre a *intenção visual* (ex: "cor de fundo do editor") e o *valor concreto* (ex: "#1F1F1F"). Através de um sistema de resolução em camadas e a injeção dinâmica de variáveis CSS, o módulo permite que a interface inteira mude de aparência instantaneamente, sem a necessidade de re-renderizar os componentes do DOM.

## 2. Componentes Estruturais
A arquitetura é dividida entre a definição de dados (Plataforma) e a aplicação visual (Workbench).

### 2.1. Serviços de Orquestração
- **`IThemeService`**: Interface de plataforma que fornece acesso ao tema de cores atual e gerencia os eventos de mudança de tema.
- **`IWorkbenchThemeService`**: Extensão do serviço de tema para o Workbench, responsável por gerenciar a troca de temas de cores, ícones de arquivos e ícones de produto.
- **`Themable`**: Classe base para componentes complexos que precisam atualizar propriedades internas ou disparar redesenhos de Canvas/SVG quando o tema muda.

### 2.2. Modelos de Dados e Registros
- **`IColorTheme`**: Define a estrutura de um tema, incluindo a resolução de cores (`getColor`) e estilos de tokens de sintaxe.
- **`ColorRegistry`**: Registro global de identificadores de cores (`ColorIds`). Garante que todos os componentes usem a mesma chave para a mesma intenção visual.
- **`TokenClassificationRegistry`**: Mapeia a classificação de tokens de linguagem para estilos específicos, permitindo a padronização do realce sintático.

### 2.3. Ponte de Renderização (Browser)
- **`colorThemeCss.ts`**: O componente crítico que converte a definição do tema (TypeScript) em variáveis CSS (`--vscode-xxx`). Essas variáveis são injetadas no root do documento, permitindo que o CSS dos componentes seja reativo.

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Ciclo de Troca de Tema
- **Alteração de Tema**: **Dado** a mudança na configuração `workbench.colorTheme` $\rightarrow$ **Quando** o usuário seleciona um novo tema $\rightarrow$ **Então** o `WorkbenchThemeService` resolve os dados do novo tema $\rightarrow$ aplica as customizações do usuário $\rightarrow$ injeta as novas variáveis CSS $\rightarrow$ dispara o evento `onDidColorThemeChange`.

### 3.2. Resolução de Cores e Estilos
- **Hierarquia de Cores**: **Dado** a solicitação de uma cor via `getColor(colorId)` $\rightarrow$ **Quando** o sistema processa a requisição $\rightarrow$ **Então** ele segue a prioridade: `Customizações do Usuário` $\rightarrow$ `Definição do Tema` $\rightarrow$ `Cor Padrão do Registro`.
- **Prioridade de Tokens (Syntax Highlighting)**: **Dado** um token de código $\rightarrow$ **Quando** o sistema define sua cor $\rightarrow$ **Então** a precedência é: `Semantic Tokens (LSP)` $\rightarrow$ `Customizações do Usuário` $\rightarrow$ `TextMate Scopes` $\rightarrow$ `Tema Base`.

### 3.3. Aplicação Visual
- **Sincronização DOM**: **Dado** a injeção de variáveis CSS $\rightarrow$ **Quando** a cor de um elemento muda $\rightarrow$ **Então** a mudança é refletida instantaneamente via herança de CSS, sem disparar ciclos de re-renderização do React.

## 4. Mapa de Implementação Técnica

| Funcionalidade | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Coordenação de Temas** | `workbench/services/themes/common/workbenchThemeService.ts` | Gestão de configurações, troca de temas e notificação de mudança (l. 401). |
| **Processamento de JSON** | `workbench/services/common/colorThemeData.ts` | Conversão de arquivos de tema para modelos de dados e resolução de especificidade (l. 336-385). |
| **Validação de Tema** | `workbench/services/themes/common/themeCompatibility.ts` | Validação de compatibilidade e conversão de settings (l. 21-48). |
| **Injeção de CSS** | `workbench/services/themes/browser/colorThemeCss.ts` | Transformação de cores em `--vscode-xxx` variables. |
| **Abstração de Plataforma** | `platform/theme/common/themeService.ts` | Definição de `IThemeService` e classe `Themable`. |
| **Registro de Cores** | `platform/theme/common/colorRegistry.ts` | Definição global de chaves de cores. |
| **Sincronização OS** | `platform/theme/electron-main/themeMainServiceImpl.ts` | Auto-detecção do esquema de cores do SO (l. 184-189). |

## 5. Integrações Cross-Subsystem
O sistema de temas é consumido por todos os módulos visuais:
- **Integração com Editor (08)**: Fornece as cores para o `SyntaxHighlighter` e a renderização de linhas (line highlight).
- **Integração com Interface UI**: Todos os componentes da Sidebar, Terminal e Chat utilizam as variáveis CSS injetadas para manter a consistência visual.
- **Integração com LSP**: O sistema de Tokens Semânticos recebe dados do Language Server para aplicar cores baseadas no significado do código (ex: diferenciar uma classe de uma variável).

## 6. Critérios de Aceite
- [ ] **Troca Instantânea**: A mudança de tema deve ser refletida em toda a interface sem recarregar a página ou causar flickers.
- [ ] **Precedência de Tokens**: O realce semântico (LSP) deve sobrescrever corretamente o realce sintático (TextMate).
- [ ] **Suporte a Customizações**: Sobrescritas de cores feitas pelo usuário no `settings.json` devem ter prioridade sobre o tema base.
- [ ] **Reatividade de Componentes**: Componentes `Themable` devem atualizar seus elementos internos (como Canvas/SVG) imediatamente após a mudança de tema.
- [ ] **Consistência de Tokens**: A mesma classificação de token deve resultar na mesma cor em todos os arquivos da mesma linguagem.
