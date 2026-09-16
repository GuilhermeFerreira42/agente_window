# 06 — PLANO DE IMPLANTAÇÃO PARA IA — DOC-02

## Ordem de execução obrigatória
1. Ler docs 00,01,02,03,03A,04,05,07,11,12,13,16,18 nesta ordem
2. Ler legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/src/App.tsx e styles/app.css como referência visual absoluta
3. Executar Fase 0 — Inventário Visual e documentar em docs/engenharia_reversa/REPLICA_MODULAR_LEGACY/01_INVENTARIO_VISUAL.md
4. Criar nova fundação platform/apps/workbench-v2/ com esqueleto idêntico
5. Fase 1 — Layout base
6. Fase 2 — Terminal como módulo
7. Fase 3 — FileSystem + Explorer esqueleto
8. Fase 4 — Validação final

## Regras
- Nunca começar implementando sem inventário visual
- Sempre validar lado a lado 5173 (legacy) vs 5174 (nova fundação)
- Não tocar em legacy/02_replica_final/ — somente leitura
- Descartar platform/apps/workbench/ atual (baseado em vídeo) — usar apenas platform/packages/contracts/ e platform/services/ como base
- Cada fase só começa com anterior validada (typecheck + testes)

## Entrega
Ao final, entregar repositório com:
- legacy/ intacto como referência
- platform/ reconstruído como nova fundação modular idêntica visualmente ao legacy
- docs/ DOC-02 atualizado com evidências
