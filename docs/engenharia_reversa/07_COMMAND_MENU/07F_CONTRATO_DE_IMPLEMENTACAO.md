# 07F — Contrato de Implementação: Command Menu

## Objetivo
Definir o ecossistema de comandos, menus e context keys de forma desacoplada.

## Responsabilidade do módulo
Registrar comandos, avaliar contexto, montar menus e palette e despachar handlers para a lógica correta.

## Contratos mínimos
```ts
interface CommandDefinition {
  id: string;
  title: string;
  when?: string;
  run: () => Promise<void> | void;
}

interface MenuItemDefinition {
  menuId: string;
  commandId: string;
  group?: string;
  order?: number;
  when?: string;
}
```

## Regras obrigatórias
- comandos possuem ID estável;
- menus referenciam comandos por ID;
- visibilidade e enablement dependem de context keys;
- execução passa por `CommandRegistry` ou `CommandService`.

## Proibições
- lógica inline diretamente em componente de menu;
- dependência circular entre menus e módulos de negócio;
- ações sem contexto mínimo definido quando necessário.
