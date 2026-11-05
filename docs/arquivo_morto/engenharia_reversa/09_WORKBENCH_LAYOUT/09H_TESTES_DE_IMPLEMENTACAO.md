# 09H — Testes de Implementação: Workbench Layout

## Focados
- toggle de partes altera o estado correto;
- resize muda dimensões sem valores negativos ou inválidos;
- maximize e restore recompõem o layout esperado;
- snapshot serializa e hidrata de forma determinística.

## Integração
- Terminal e Editor respondem a resize do workbench;
- sidebars preservam estado de view ativa ao ocultar e exibir;
- persistência restaura a geometria esperada após reload.

## E2E mínimo
1. abrir o workbench;
2. ocultar e exibir sidebar e painel;
3. redimensionar partes;
4. maximizar e restaurar painel;
5. recarregar e validar persistência do layout.
