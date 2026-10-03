# 08F — Contrato de Implementação: Theme & Token

## Objetivo
Definir como o sistema de temas e tokens deve fornecer coerência visual sem hardcode de cor e com troca reativa de tema.

## Responsabilidade do módulo
Resolver temas, publicar tokens visuais e propagar mudanças para todos os componentes themable do workbench.

## Contratos mínimos
```ts
interface ThemeTokenMap {
  [token: string]: string;
}

interface ThemeService {
  getToken(token: string): string;
  applyTheme(themeId: string): Promise<void>;
  exportCssVariables(): ThemeTokenMap;
}
```

## Regras obrigatórias
- componentes usam tokens, não hex ou rgb fixos;
- troca de tema atualiza CSS variables no root;
- editor e workbench compartilham fonte única de tokens.

## Proibições
- cor hardcoded para elementos sistêmicos;
- componente acessar arquivo de tema diretamente sem `ThemeService`;
- duplicar mapas de token em múltiplos módulos.
