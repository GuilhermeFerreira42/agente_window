# 12 — DOCUMENTAÇÃO VIVA — DOC-02

## Estado atual — Início DOC-02

- `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/` é a referência visual absoluta (95KB App.tsx, layout desejado)
- `platform/apps/workbench/` atual baseado em vídeo Antigravity será descontinuado — layout diferente do desejado
- FATIA-01,02,03 concluídas no legado, terminal estabilizado com 5 bugs críticos corrigidos
- FATIA-04 4.1 foi implementada na arquitetura antiga com 68/68 testes passando, mas será refeita sobre nova fundação após DOC-02

## Decisão DOC-02
- Construir nova fundação modular `platform/apps/workbench-v2/` que replica pixel a pixel o `02_replica_final`
- Manter `platform/packages/contracts/`, `shared/`, `services/` como base
- Descartar `platform/apps/workbench/` atual e substituir por v2 idêntica ao legacy
- Após homologação, nova fundação vira base oficial para FATIA-04

## Pendências
- Fase 0 inventário visual
- Fase 1 esqueleto
- Fase 2 terminal módulo
- Fase 3 filesystem + explorer esqueleto
- Fase 4 validação final

## Próximos passos autorizados
Executar DOC-02 na ordem: 0 → 1 → 2 → 3 → 4
