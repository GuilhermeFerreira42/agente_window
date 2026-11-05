# 09F — Contrato de Implementação: Workbench Layout

## Objetivo
Definir o contrato do shell do workbench como módulo transversal responsável por hospedar as partes visuais e distribuir espaço entre elas.

## Responsabilidade do módulo
Gerenciar visibilidade, geometria, focus, grupos centrais, persistência de layout e modos globais do workbench, sem assumir a lógica interna dos subsistemas hospedados.

## Contratos mínimos
```ts
interface WorkbenchPartVisibility {
  leftSidebar: boolean;
  rightSidebar: boolean;
  panel: boolean;
  auxiliaryBar: boolean;
  statusBar: boolean;
}

interface WorkbenchLayoutSnapshot {
  version: 1;
  visibleParts: WorkbenchPartVisibility;
  dimensions: Record<string, number>;
  activeViews: Record<string, string>;
}
```

```ts
interface WorkbenchLayoutService {
  togglePart(input: { part: keyof WorkbenchPartVisibility }): void;
  resizePart(input: { part: string; pixels: number }): void;
  maximizePart(input: { part: string }): void;
  restorePart(input: { part: string }): void;
  serialize(): WorkbenchLayoutSnapshot;
  hydrate(snapshot: WorkbenchLayoutSnapshot): void;
}
```

## Regras obrigatórias
- layout é dono da geometria, não os módulos filhos;
- partes hospedadas não podem recalcular sozinhas a grade global;
- persistência de layout é versionada;
- foco global e parte ativa devem ser observáveis.

## Proibições
- componente de módulo alterar geometria global diretamente;
- armazenar snapshot sem `version`;
- perder consistência entre layout serializado e layout exibido.
