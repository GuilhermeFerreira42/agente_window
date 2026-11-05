# 05F — Contrato de Implementação: Editor / Code / Browser

## Objetivo
Definir a implementação da área central do workbench, incluindo grupos, abas, editor e visualizadores auxiliares.

## Responsabilidade do módulo
Abrir recursos, manter grupos de editor, alternar views centrais e integrar edição e navegação com Explorer, Chat e Command System.

## Contratos mínimos
```ts
interface EditorResource {
  uri: string;
  kind: 'code' | 'browser' | 'search' | 'changes' | 'diff';
  title: string;
}

interface EditorService {
  open(resource: EditorResource): Promise<void>;
  close(uri: string): Promise<void>;
  split(direction: 'horizontal' | 'vertical'): void;
  reveal(input: { uri: string; line?: number; column?: number }): Promise<void>;
}
```

## Regras obrigatórias
- abertura de recurso deve passar por serviço central;
- grupos e tabs pertencem ao workbench e ao `EditorService`, não a widgets isolados;
- integração com filesystem deve respeitar locks e persistência;
- integração com chat para apply edits e contexto deve ocorrer por contrato, nunca por acesso direto ao DOM.

## Proibições
- manipular arquivo aberto diretamente do Explorer sem passar pelo `EditorService`;
- acoplar Browser, Search e Changes ao mesmo componente sem abstração de recurso.
