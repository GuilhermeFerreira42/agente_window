# 06H — Testes de Implementação: Filesystem I/O

## Focados
- leitura de diretório retorna nós tipados;
- escrita atômica não deixa arquivo corrompido em falha simulada;
- lock serializa escritas simultâneas no mesmo recurso;
- rename e remove geram eventos corretos.

## Integração
- Explorer reflete alterações externas;
- Editor salva e limpa dirty state;
- Terminal rejeita CWD inválido.

## E2E mínimo
1. listar diretório raiz;
2. abrir arquivo no editor;
3. salvar alteração;
4. observar evento externo de mudança;
5. validar atualização sem reload manual.
