# 09 — PLANO DE DEPLOY E OPERAÇÃO — DOC-02

## Desenvolvimento
- legacy roda em 5173: cd legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final && npm run dev
- nova fundação roda em 5174: cd platform/apps/workbench-v2 && npm run dev
- pty-server: cd platform/services/pty-server && npm run dev
- code-server: porta 8080

## Validação
- Abrir 5173 e 5174 lado a lado, comparar
- Rodar npx tsc --noEmit
- Rodar npm test em platform

## Entrega
Após homologação, arquivar platform/apps/workbench/ antigo e renomear workbench-v2 para workbench. legacy/02_replica_final vira legacy-reference/ somente leitura.
