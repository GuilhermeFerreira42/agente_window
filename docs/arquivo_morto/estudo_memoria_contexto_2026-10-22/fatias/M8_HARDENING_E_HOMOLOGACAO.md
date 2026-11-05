# M8 — Hardening, privacidade, desempenho e homologação (proposta; posição hipotética 20)

**Status:** rascunho não aprovado.  
**Objetivo:** provar que as capacidades aprovadas funcionam em conjunto e não regressam contratos/homologações do Condomínio.

## Escopo

- Revisar limites de tamanho, corrupção, concorrência e migração para transcript, checkpoint, índice e memória; writes atômicos e rollback sem dano à fonte.
- Isolamento por projeto/chat em todos os reads, writes, cache, busca, memória e eventos; exclusão/retention cobrem derivados.
- Threat model: segredos em tool result; prompt injection em memória/transcript; path traversal; autorização; exposição de usage/prompt; providers custom; cross-chat retrieval.
- Logs/telemetria sem API key, corpos completos ou conteúdo sensível por padrão; métricas de latência/token/custo com retenção definida.
- Benchmark de histórico grande e gravação JSONL atual; decidir se incremental/FTS é necessário por dado medido.
- Regressão de contratos e homologação em ambiente real autorizado: Conversa, Agir, approval, cancelamento, modelo/provider, 413, compactação, pesquisa e restart.

## Critérios de aceite propostos

1. Suíte typecheck/unit/build relevante aprovada; E2E de fatias executados em ordem/fixtures isoladas segundo `docs/09`.
2. Canários demonstram isolamento A/B/projeto; nenhuma resposta de busca ou memória atravessa escopo.
3. Falhas e reinícios não destroem transcript nem reaplicam side effects; ferramenta de escrita continua com aprovação atual.
4. Secrets fixture nunca aparecem nos stores/logs/UI de provenance; dados sensíveis de ferramenta seguem política aprovada.
5. Índices podem ser apagados/reconstruídos sem perda de dados; checkpoint inválido recua com explicação.
6. Benchmark documenta volume, latência e custo; qualquer migração de writer/DB tem comparação de antes/depois e plano de rollback.
7. Homologação do indicador usa uso real reportado quando disponível e exibe estimativa/indisponibilidade com honestidade; sem percentual hardcoded.
8. Documentos canônicos só são atualizados após decisão explícita e nova SPEC homologável.

## Testes propostos

Fuzz/corrupção, concorrência de save e compaction, migração/schema antigo, exclusão, secret scrub, cross-tenant/chat ACL, offline, API 413, provider sem usage, limite desconhecido, multimodal/anexos, tool result grande, rate limit e restart em cada estado. Executar suíte e fluxos reais somente após autorização de implementação.

## Decisões pendentes

Políticas de retenção/exportação e telemetry; critérios de benchmark; suportes mínimos de provider; bloqueio de release; owners para revisão de licenças; sequência oficial das fatias e documentação canônica a atualizar.