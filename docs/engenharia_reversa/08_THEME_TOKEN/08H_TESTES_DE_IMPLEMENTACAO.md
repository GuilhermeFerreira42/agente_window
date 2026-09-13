# 08H — Testes de Implementação: Theme & Token

## Focados
- aplicar tema troca tokens exportados;
- componentes leem `var(--token)` corretamente;
- ausência de cor fixa crítica em componentes de sistema;
- mudança de tema não exige remontar todo o app.

## Integração
- editor, terminal, sidebar e chat respondem ao mesmo `theme.changed`;
- tokens inválidos geram fallback controlado.

## E2E mínimo
1. alternar tema;
2. validar atualização da UI principal;
3. validar atualização do editor, terminal e chat;
4. confirmar ausência de inconsistência visual crítica.
