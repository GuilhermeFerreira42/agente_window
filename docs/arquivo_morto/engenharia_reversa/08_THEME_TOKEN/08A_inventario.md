# 08A - Inventário do Subsistema de Temas e Tokens

## 1. Componentes Principais (Interfaces e Serviços)

### Core Services
- `IThemeService` (`platform/theme/common/themeService.ts`): Interface base para serviços de tema. Fornece acesso ao tema de cores atual (`getColorTheme`) e eventos de mudança.
- `IWorkbenchThemeService` (`workbench/services/themes/common/workbenchThemeService.ts`): Extensão do `IThemeService` para o workbench. Gerencia a troca de temas de cores, ícones de arquivo e ícones de produto.

### Theme Models
- `IColorTheme` (`platform/theme/common/themeService.ts`): Define a estrutura de um tema de cores, incluindo a resolução de cores (`getColor`) e estilos de tokens (`getTokenStyleMetadata`).
- `IWorkbenchColorTheme` (`workbench/services/themes/common/workbenchThemeService.ts`): Tema de cores específico do workbench, incluindo as regras de cores de tokens TextMate (`tokenColors`).
- `IFileIconTheme` e `IProductIconTheme`: Interfaces para temas de ícones.

### Registries (Registros)
- `colorRegistry.ts`: Gerencia a definição de identificadores de cores.
- `iconRegistry.ts`: Gerencia a definição de ícones.
- `tokenClassificationRegistry.ts`: Gerencia a classificação de tokens para realce de sintaxe.

## 2. Estruturas de Dados de Tokens

### TextMate Tokens
- `ITextMateThemingRule`: Regra de estilização baseada em escopo (`scope`).
- `ITokenColorizationSetting`: Configurações de cores (`foreground`, `background`), fonte (`fontStyle`, `fontFamily`) e tamanho.

### Semantic Tokens
- `ISemanticTokenRules`: Regras de estilização para tokens semânticos (baseadas em tipos de símbolos do compilador/linguagem).
- `ISemanticTokenColorizationSetting`: Similar ao TextMate, mas com propriedades booleanas explícitas para `bold`, `italic`, etc.

## 3. Configurações e Gatilhos (Settings)

### Chaves de Configuração (`ThemeSettings`)
- `workbench.colorTheme`: Tema de cores atual.
- `workbench.iconTheme`: Tema de ícones de arquivo.
- `workbench.productIconTheme`: Tema de ícones de produto.
- `workbench.colorCustomizations`: Sobrescritas de cores do workbench.
- `editor.tokenColorCustomizations`: Sobrescritas de cores de tokens TextMate.
- `editor.semanticTokenColorCustomizations`: Sobrescritas de cores de tokens semânticos.

## 4. Infraestrutura de Aplicação
- `colorThemeCss.ts` (`workbench/services/themes/browser/`): Responsável por converter as cores do tema em variáveis CSS (`--vscode-xxx`) aplicadas ao DOM.
- `Themable` (`platform/theme/common/themeService.ts`): Classe base para componentes que precisam reagir a mudanças de tema.
