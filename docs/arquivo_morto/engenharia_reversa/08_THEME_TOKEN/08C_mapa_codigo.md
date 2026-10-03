# 08C - Mapa de Código do Subsistema de Temas e Tokens

## 1. Fluxo de Dependências (Hierarquia)

`WorkbenchThemeService` (Coordenação)
  └── `IThemeService` (Abstração de Plataforma)
        └── `IColorTheme` (Modelo de Dados do Tema)
              └── `getColor()` $\rightarrow$ `ColorRegistry`
              └── `getTokenStyleMetadata()` $\rightarrow$ `TokenClassificationRegistry`

## 2. Localização de Implementações Críticas

### Camada de Plataforma (`platform/theme`)
- `common/themeService.ts`: Define as interfaces `IThemeService`, `IColorTheme` e a classe base `Themable`.
- `common/colorRegistry.ts`: Onde as chaves de cores (ex: `editor.background`) são registradas.
- `common/tokenClassificationRegistry.ts`: Mapeamento de classificações de tokens.
- `common/colors/*.ts`: Definições de cores base para diferentes áreas (editor, list, menu).

### Camada de Workbench (`workbench/services/themes`)
- `common/workbenchThemeService.ts`: Implementação principal da lógica de troca de temas e gestão de configurações.
- `common/colorThemeData.ts`: Classe que processa o JSON do tema e fornece a implementação de `IColorTheme`.
- `common/themeConfiguration.ts`: Lida com a leitura e escrita das configurações de tema no `settings.json`.
- `browser/colorThemeCss.ts`: Transforma o modelo de tema em variáveis CSS reais no browser.
- `common/colorThemeSchema.ts`: Define a validação do formato JSON dos temas.

## 3. Pontos de Extensão (Extension Points)
- `colorExtensionPoint.ts`: Permite que extensões contribuam com novos temas de cores.
- `iconExtensionPoint.ts`: Permite que extensões contribuam com temas de ícones.
- `tokenClassificationExtensionPoint.ts`: Permite a adição de novas classificações de tokens.

## 4. Fluxo de Dados de Cor
`JSON do Tema` $\rightarrow$ `ColorThemeData` $\rightarrow$ `WorkbenchThemeService` $\rightarrow$ `colorThemeCss.ts` $\rightarrow$ `CSS Variables` $\rightarrow$ `UI Elements`
