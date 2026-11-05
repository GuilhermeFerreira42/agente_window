# Testes, riscos e rastreabilidade

**Status:** plano de validação futuro; nenhum teste foi executado nesta investigação.

## 1. IDs de requisitos

| ID | Requisito resumido |
|---|---|
| RF-01 | Transcript original por chat preservado, identificável e recuperável após reload/restart. |
| RF-02 | Contexto enviado inclui todos os elementos que o runtime realmente manda e mostra a origem/precisão do uso. |
| RF-03 | Limite e modelo efetivo identificados com proveniência; desconhecido permanece desconhecido. |
| RF-04 | Chamadas/resultados/aprovações/erros/cancelamentos de ferramenta fiéis, ordenados e vinculados. |
| RF-05 | Checkpoint versionado, delimitado e validado; cauda recente e fronteiras de tool round não são partidas. |
| RF-06 | Reabrir restaura conversa/checkpoint sem iniciar execução. |
| RF-07 | Busca manual devolve referência/texto literal da mensagem-fonte no escopo autorizado. |
| RF-08 | Memória tem escopo/proveniência/estado e controles de inspecionar, corrigir, excluir. |
| RF-09 | Recuperação pelo agente é explicitamente distinta da busca manual; cross-chat exige aprovação/política. |
| RF-10 | Retomada operacional verifica workspace/arquivos/Git e não repete efeito colateral automaticamente. |
| RNF-01 | Módulos seguem port/barrel, injeção e testes de fronteira LEGO/Condomínio. |
| RNF-02 | Segredos, projetos e chats permanecem isolados; retenção/exclusão cobre derivados. |
| RNF-03 | Falha de resumo/índice não perde transcript nem bloqueia chat. |
| RNF-04 | Sem dados simulados no aceite do medidor; estimativa e uso reportado nunca se confundem. |
| RNF-05 | Latência/armazenamento/contexto são medidos com fixtures grandes; persistência atual não é substituída sem benchmark. |

## 2. Matriz resumida de rastreabilidade

| Requisito | Evidência/gap atual | Proposta / fatia | Prova de aceite |
|---|---|---|---|
| RF-01 | JSONL e SQLite existem, mas IDs/ordem/checkpoint não têm contrato de evento; JSONL é reescrito inteiro. | M2/M3 | Persistir, restart, comparar IDs, conteúdo e ordem; checkpoint inválido não altera fonte. |
| RF-02/03, RNF-04 | Fórmula em `ChatInput.tsx` usa texto do draft + anexos; nenhum usage/tokenizer; alvo efetivo server-side. | M1 | Request mockado por protocolo com uso/limite conhecidos; conferir DTO e widget, sem valores de teste em aceite manual. |
| RF-04 | Loop Agir preserva ferramentas só em memória; cartões são resumo UI, próximos pedidos filtram para role/content. | M2 | E2E ferramenta ler→resultado→novo turno; confirmar payload reconstruído, pareamento e reload. |
| RF-05, RF-06 | Sem checkpoint; reabrir não inicia processo, `working` é sanado. | M3 | Duas compactações; canário coberto e cauda não duplicada; F5/restart sem chamada automática. |
| RF-07 | Nenhuma busca dedicada de transcript identificada. | M4 | Busca canário no mesmo chat dá messageId/sequence/texto literal e vizinhança; chat B não aparece. |
| RF-08 | Nenhum armazenamento de memória identificado. | M5 | Criar/editar/substituir/apagar; estado e origem visíveis; nunca cruzar projeto. |
| RF-09 | Nenhuma tool de memória/histórico identificada. | M6 (fase posterior) | Permissão e isolamento explícitos; tool recebe só textos autorizados com refs; resultados limitados e auditáveis. |
| RF-10 | `retomarPorFluxo` volátil, `working` sanado; sem validação de replay durável. | M7 | Reinício + alteração de arquivo/Git; agente propõe próximo passo, sem executar automaticamente escrita/comando. |
| RNF-01/02/03/05 | Casas modulares e session persistence existem; tests/frontiers existentes. | M8 em integração | Fronteiras, concorrência, corrupção, deleção/reindexação, segredo scrub e benchmark. |

## 3. Plano de testes por camada

### Unitários (vitest)

- Canonicalização de eventos e sequência por chat; projeção protocolo OpenAI/Anthropic/Gemini/Ollama; validação de checkpoint/fingerprint; cálculo de `%` com reserva de saída e estados unknown/stale/estimated/measured; merge de cauda em fronteira segura; fallback de compaction; indexação e ACL `chatId`.
- Fixtures de usage do provedor: contagens de prompt/completion, tokens cacheados/metadata quando presentes, streams sem usage, erro parcial, tool round com várias chamadas e resultado grande.
- A fórmula atual nunca deve entrar como fonte do valor final; uma regressão deve falhar se rascunho/anexo por contagem de itens alterar “uso real” sem payload/runtime correspondente.

### Integração/persistência

- Salvar → fechar processo → reabrir; transcript e checkpoint preservados; sem rede/execução automática.
- Dois chats/projetos com canários distintos: leitura, compaction, busca e recuperação nunca atravessam o escopo.
- Erro/timeout do sumarizador, JSONL/sidecar truncado, fingerprint divergente, índice ausente ou DB recriável: transcript continua legível e checkpoint anterior permanece válido.
- Tool call/result, aprovação, recusa, erro e cancelamento conservam associação e ordem através de restart; não repetir operações de escrita.
- Exclusão de chat/projeto remove ou invalida checkpoint, memória e índice segundo política aprovada.

### UI e E2E

- Estados: sem dado; última medição; estimativa do próximo request; modelo trocado; limite informado/configurado/default/desconhecido; alerta; erro 413; compactação em andamento/falha.
- Nenhum percentual aparece como “medido” se for estimativa; acessibilidade anuncia unidade, origem e timestamp.
- Reabrir chat não envia request; busca manual navega para o texto original; recuperação via agente mostra fonte.
- Testar com provedor real autorizado apenas em homologação; testes de suite usam fixture determinística. A métrica de aceite não usa percentuais fictícios.

## 4. Comandos e testes do projeto a considerar (não executados)

Manifesto `platform/package.json` / `platform/apps/workbench-v2/package.json`:

- `npm run typecheck --workspace=agents-window-replica-v2`
- `npm run test --workspace=agents-window-replica-v2`
- `npm run test:all` (frontend + PTY, quando apropriado)
- `npm run build --workspace=agents-window-replica-v2`
- `npm run lint --workspace=agents-window-replica-v2`
- E2E/Playwright: localizar/specs da fatia antes de alterar a ordem; `docs/09` e `docs/06` registram testes frágeis e quais são a régua. Não tratar suíte global como verde sem execução.

Testes atuais próximos a ampliar: `src/__tests__/ChatInput.test.tsx`, `ChatPanel.test.tsx`, `chatStreamingFatia09.test.tsx`; contratos da Casa Conversa e Casa Agir; `src/server/session-persistence/*.test.ts`; testes de fronteira de cada Casa.

## 5. Riscos e mitigação

| Risco | Severidade | Mitigação/prova |
|---|---|---|
| Indicador afirma precisão inexistente | Alta | Substituir fonte; rótulo de evidência e teste de regressão M1. |
| Limite genérico/default incorreto para modelo selecionado | Alta | Alvo server-side + origem; limite desconhecido é estado suportado. |
| Tool result omitido após novo turno | Alta | Transcript estruturado em M2 antes da compactação. |
| Resumo apaga ou distorce história | Alta | Fonte imutável, fingerprint, fronteira e rollback; verificar texto literal. |
| Compactação parte tool round ou tarefa pendente | Alta | Fronteira por turno/evento completo; teste com múltiplas tools e aprovação. |
| Pesquisa cross-chat vaza conteúdo | Alta | Cross-chat fora da primeira entrega; ACL obrigatória, partição na consulta e canários. |
| Instrução antiga vira comando presente (prompt injection histórica) | Alta | Rotular fonte como histórica/dado; nunca executar sem aprovação atual. |
| Reinício repete ação externa | Alta | Reconstrução observacional, sem replay automático; aprovação nova. |
| Cópia indevida de código | Alta | Licenças verificadas; OpenClaude/WebUI bloqueados para cópia até revisão. |
| FTS5 indisponível/índice pesado | Média | Verificar build SQLite, medir, índice derivado reconstruível; fallback sem busca. |
| Persistência atual lenta por regravação JSONL | Média | Benchmark progressivo; só migrar quando mensurado. |
| Custo/latência de resumo | Média | Threshold e botão manual sob controle; telemetria e fallback seguro. |
| Fatias renumeradas quebram histórico | Alta | Mapa de correspondência; preservar canônicos e homologações até decisão formal. |

## 6. Critério de encerramento documental

O pacote está pronto para revisão técnica, mas não substitui: autorização de arquitetura, análise jurídica final, execução de testes/benchmarks, aprovação de escopo, decisão de produto sobre fonte do limite/thresholds, atualização futura de docs canônicos e SPEC oficial por fatia.