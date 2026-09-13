# 05H — Testes de Implementação: Editor / Code / Browser

## Focados
- abrir recurso cria aba correta;
- reabrir recurso existente foca a aba sem duplicação indevida;
- split cria grupo novo com foco consistente;
- dirty indicator responde a alterações;
- reveal navega para a linha solicitada.

## Integração
- Explorer abre arquivo via `EditorService`;
- Chat aplica edição via contrato;
- save usa `FileSystemPort` e reflete estado limpo.

## E2E mínimo
1. abrir arquivo pelo Explorer;
2. abrir múltiplas abas;
3. dividir a área central;
4. alternar entre views Browser, Search e Changes quando existirem;
5. confirmar foco, histórico e persistência esperada.
