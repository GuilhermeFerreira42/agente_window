# 10H — Testes de Implementação: Explorer Coordinator

## Focados
- expandir pasta chama `FileSystemPort.list` apenas quando necessário;
- abrir arquivo delega a `EditorService.open`;
- auto-reveal localiza o item correspondente ao recurso ativo;
- refresh não perde seleção desnecessariamente.

## Integração
- watcher do filesystem atualiza a árvore;
- abertura via explorer reflete no editor ativo;
- context menu respeita item selecionado e contexto.

## E2E mínimo
1. abrir Explorer;
2. expandir pastas;
3. abrir um arquivo;
4. trocar o arquivo ativo e validar auto-reveal;
5. provocar refresh e confirmar atualização da árvore.
