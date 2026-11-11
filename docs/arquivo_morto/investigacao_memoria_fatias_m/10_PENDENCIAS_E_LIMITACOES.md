# 10 — Pendências e limitações

**Atualizado:** 2026-10-30 (America/Sao_Paulo).  
**Investigação M1–M8:** continua em andamento e sem implementação de memória. **Task 01 de persistência:** correção localizada implementada; detalhes, testes e limites em `CORRECAO_PERSISTENCIA.md`.

## Estado atual

- Baseline Agente Window `971a59f5d2a5118e8526d2829ba26039a344b796`. Após Task 01 há alterações localizadas em persistência e testes; documentação canônica, roadmap e dados/bancos reais não foram alterados.
- OpenCode v2.2.4 auditado em `45898d0f8569225eb1ddb4ee13f8581b34dff311`; VS Code/Copilot em `c8a3f819b4a13366d5846a02288ab53b4d89ac50`.
- Suite relevante executada só em cópia de `git archive` com `HOME` e workspaces descartáveis: 17 arquivos, 139 passed, 4 skipped; `typecheck` passou. Build isolado foi morto (exit 137) durante transformação Vite por limite de recursos, sem repetir.
- Prova A–H executada parcialmente em fixtures; não houve provider/LLM real, logs telemétricos reais ou experiência com dados do usuário.
- Corrida baseline do JSONL confirmada no HEAD; Task 01 implementou correção localizada. Retestes: 2 rodadas × 16 PUTs, todos HTTP 200 e snapshot final íntegro; reabertura via processo Node novo restaurou IDs, conteúdo e ordem. Ver `CORRECAO_PERSISTENCIA.md`.
- Regressão pós-correção em cópia isolada: 19 arquivos passaram, 145 passed/4 skipped; typecheck e lint focado passaram. Build Vite limitado por memória (768 MB OOM/134; 1024 MB killed/137); provider real, Windows e browser pagehide não foram testados.
- Snapshots/ZIPs de referência em `/tmp/aw_mem_audit_refs/` e cópia de teste `/tmp/aw_m1m8_isolated/` foram removidos após registrar evidências. Permanecem somente os documentos nesta pasta investigativa.

## Limites de evidência

1. Docs oficiais descrevem disponibilidade e configuração; não confirmam implementação de serviços cloud privados nem comportamento observado. Copilot Memory do GitHub e backend Chronicle não são verificáveis via este snapshot.
2. Código estático não é teste operacional. Testes de VS Code/OpenCode foram localizados/lidos, mas não executados. Suites do Agente Window usaram mocks/fixtures.
3. Teste do transcript exercitou Vite API e reload de processo; não automatizou F5 real, browser `pagehide/keepalive` ou corte abrupto de energia.
4. O teste de tools executou `rodarAgir` com vizinho falso e executores reais de disco em workspace temporário; cards foram persistidos no mesmo harness, não por uma sessão de provider real end-to-end.
5. Isolamento A/B foi comprovado para fixtures com `slug` distintos e request da UI selecionada. Não é auditoria de segurança formal para entradas arbitrárias/ambientes concorrentes.
6. Não houve benchmark de volume, latência, custo, tokens, precisão/recall, crash/corrupção/falha de disco ou comparação de embeddings.
7. `npm ci` em cópia isolada reportou 10 advisories; sem `npm audit fix`. Isso não é auditoria de vulnerabilidade do aplicativo.

## Pendências técnicas

- Para homologação final da Task 01, considerar validação no Windows real e avaliação operacional do ciclo de encerramento do navegador/pagehide; não executados nesta rodada. O comportamento multiprocesso e power-loss não foi homologado.
- `typecheck` e lint focado passaram na cópia isolada. Build Vite foi tentado com limites explícitos de heap (768 MB: OOM/134; 1024 MB: Killed/137 durante transformação). Provider real não é necessário para persistência e não foi usado.
- Avaliar manualmente retenção/exclusão do transcript, checkpoint e índice depois de uma política de memória ser aprovada.
- Construir corpus anotado antes de escolher busca lexical/FTS/embeddings; declarar dados, perguntas, fontes corretas, métricas e custo.
- Revalidar docs/releases de referência quando forem usadas para decisão de implementação; snapshots fixados são de 30/10/2026.

## Aprovação

Todas as recomendações M1–M8 em `08_ANALISE_FATIAS_M1_M8.md` e `09_RECOMENDACOES_ARQUITETURAIS.md` permanecem propostas. Nenhuma autorização de implementação foi dada.
