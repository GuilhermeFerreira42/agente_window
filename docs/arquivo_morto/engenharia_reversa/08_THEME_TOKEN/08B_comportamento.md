# 08B - Comportamento do Subsistema de Temas e Tokens

## 1. Ciclo de Vida de Troca de Tema

### Fluxo de Alteração
1. **Trigger**: O usuário altera a configuração `workbench.colorTheme` ou o sistema detecta a mudança de esquema de cores do OS (`window.autoDetectColorScheme`).
2. **Orquestração**: O `WorkbenchThemeService.setColorTheme` é invocado.
3. **Resolução**: 
   - O serviço localiza os dados do tema (`ColorThemeData`).
   - Aplica as customizações do usuário (`workbench.colorCustomizations`).
   - Valida a compatibilidade do tema (`themeCompatibility.ts`).
4. **Notificação**: O evento `onDidColorThemeChange` é disparado para todos os ouvintes.

## 2. Resolução de Cores e Estilos

### Resolução de Cores do Workbench
Quando um componente solicita uma cor via `IColorTheme.getColor(colorId)`:
1. Verifica se há uma customização do usuário para aquele `colorId` no escopo atual.
2. Se não, verifica se o tema define explicitamente a cor.
3. Se não, retorna a cor padrão definida no `colorRegistry`.

### Resolução de Estilos de Tokens (Syntax Highlighting)
O processo de coloração de tokens segue uma hierarquia de prioridade:
1. **Semantic Tokens**: Se `semanticHighlighting` estiver ativado e o token tiver um tipo semântico, as regras de `ISemanticTokenRules` prevalecem.
2. **Customizações do Usuário**: Regras em `editor.tokenColorCustomizations` sobrescrevem o tema.
3. **TextMate Rules**: O motor de TextMate associa escopos (`scopes`) ao token; a regra com o escopo mais específico vence.
4. **Default Theme**: O estilo base definido no arquivo `.json` do tema.

## 3. Aplicação Visual (DOM)

### Injeção de Variáveis CSS
O `colorThemeCss.ts` transforma a definição do tema em um conjunto de variáveis CSS:
- Cores são mapeadas para `--vscode-XXXX`.
- Essas variáveis são injetadas em um elemento de estilo no topo do documento.
- Componentes React/HTML usam essas variáveis em seus arquivos CSS, permitindo a troca de tema instantânea sem recarregar a página.

### Componentes `Themable`
Componentes complexos que não podem depender apenas de CSS herdam de `Themable`. Eles implementam `updateStyles()` para atualizar propriedades internas ou disparar redesenhos de Canvas/SVG quando o tema muda.
