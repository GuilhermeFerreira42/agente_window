# Arquitetura e contratos propostos — monólito modular, sem decisão de implementação

**Status:** recomendação de desenho para revisão; não cria Casa nem altera fronteiras aprovadas.  
**Regra:** toda mensagem/checkpoint/evento que atravessa portas leva `sessionId` e `chatId`; busca futura exige escopo autorizado na consulta e leitura.

## 1. Requisitos comportamentais propostos

- **RF-01 — transcript autoritativo:** preservar fonte original ordenada; compaction, busca e memória são projeções, nunca substitutos destrutivos.
- **RF-02 — contexto real:** montar e observar o pedido efetivamente enviado, incluindo instruções locais, histórico, conteúdo/anexos realmente enviados, tool schemas/chamadas/resultados e contexto recuperado.
- **RF-03 — uso/limite com proveniência:** separar uso reportado pelo provedor, estimativa local, parâmetro configurado pelo dono, default de descritor e valor desconhecido.
- **RF-04 — rodada de ferramenta íntegra:** persistir chamada, aprovação/negação, resultado, erro/cancelamento e vínculo entre eles; preservar agrupamento ao cortar contexto.
- **RF-05 — checkpoint seguro:** registrar escopo, versão, fronteira fonte, fingerprint, estado resumido e cauda recente; validar antes de projetar.
- **RF-06 — restauração sem execução espontânea:** reabrir transcript/checkpoint não deve disparar uma nova chamada ou replay de ferramentas.
- **RF-07 — fonte literal:** busca manual ou automática retorna referência a mensagem original; resumo nunca é apresentado como citação.
- **RF-08 — escopos explícitos:** inicialmente chat e projeto; memória global do usuário exige decisão própria.
- **RF-09 — continuidade operacional:** reconstituir o plano a partir do transcript/checkpoint e validar workspace/estado antes de qualquer efeito colateral; sem replay automático.
- **RNF-01 — LEGO/Condomínio:** contratos públicos e injeção por composição root; sem import interno lateral ou microserviço obrigatório.
- **RNF-02 — privacidade:** nenhum segredo em transcript/checkpoint/memória; exclusão e retenção cobrem originais e derivados.
- **RNF-03 — falha segura:** índice/checkpoint inválido não impede persistir/reabrir transcript; falha de sumarização mantém checkpoint válido anterior.
- **RNF-04 — informação honesta:** UI mostra `medido`, `estimado`, `desatualizado` ou `indisponível`; não mostra percentual fabricado.

## 2. Blocos de responsabilidade (proposta)

```text
Workbench (UI)
  ├─ exibe ContextSnapshot e origem; controla compactação/busca/memória
  └─ não estima tokens, não escolhe checkpoint, não lê direto de SQL

Conversa / Agir (runtime de cada Casa)
  ├─ compõem o payload específico do protocolo e as iterações
  ├─ expõem uma projeção normalizada + uso reportado/estimado
  └─ preservam boundaries das chamadas e respostas de ferramenta

Composição root (prefeitura / src/server)
  ├─ injeta portas públicas para provedores, persistência e contexto
  └─ não transfere lógica de domínio entre Casas por import interno

Persistência
  ├─ TranscriptRepository: mensagens/eventos originais, por chat
  ├─ CheckpointRepository: sidecar/tabela derivada, por chat
  ├─ MemoryRepository: registros com escopo/proveniência (se aprovado)
  └─ SearchIndex: índice descartável/reconstruível, nunca fonte de verdade
```

**Decisão de forma ainda aberta:** pode ser uma Casa de Contexto/Continuidade, contratos em Casas existentes ou portas separadas. Recomendação: separar por responsabilidade lógica, mas não criar diretório/Casa até confirmar a fronteira e os testes de `docs/04`.

## 3. DTO indicativo para uso de contexto

Contrato conceitual (não é implementação nem norma):

```ts
type Evidence = 'provider_reported' | 'local_estimate' | 'configured' | 'descriptor_default' | 'unknown'
type UsageState = 'measured' | 'estimated' | 'stale' | 'unavailable'
interface ContextSnapshot {
  sessionId: string
  chatId: string
  requestId: string
  iteration?: number
  providerId: string
  modelId: string                 // alvo efetivo do servidor, não o chip mock
  usageState: UsageState
  promptTokens: number | null     // ocupação do pedido, nunca soma de chamadas
  completionTokens: number | null
  contextWindowTokens: number | null
  contextWindowEvidence: Evidence
  outputReserveTokens: number | null
  inputBudgetTokens: number | null
  components?: Array<{ kind: string; tokens: number | null; evidence: Evidence }>
  capturedAt: number
}
```

- `promptTokens` do provedor é evidência mais forte **depois** do request. Antes do envio, um tokenizer compatível pode estimar o payload local e deve ser rotulado como estimativa.
- `promptTokens` mede a ocupação de uma chamada; não deve somar prompt de cada iteração e chamar isso “porcentagem da janela”. Tokens de prompt repetidos ao longo de um loop são consumo cumulativo/custo, não ocupação de uma única janela.
- `contextWindowTokens` precisa referir-se ao **modelo efetivo** e ter origem. Hoje os defaults são por provedor, não por modelo, e `contexto` não chega a `AlvoConversa`.
- Separar `inputBudget = window - reserveOutput` somente quando a semântica da janela/modelo for conhecida; não inferir contagem exata de instruções ocultas do provedor.
- `components` serve transparência/auditoria. Componentes mínimos: instruções de runtime; histórico/checkpoint; cauda recente; ferramentas/schema; respostas de ferramenta; anexos/conteúdo efetivamente enviado; memórias recuperadas.

## 4. Contratos de transcript e checkpoint

### Mensagem/evento original (mínimo recomendado)

`sessionId`, `chatId`, `messageId` estável, `sequence` monotônica dentro do chat, `role/kind`, `parts` tipadas, timestamp informativo, `turnId`, origem, estado e referências de anexos. Tool events levam `toolCallId`, ferramenta, argumentos/representação segura, aprovação/negação, resultado completo ou handle de conteúdo, erro/cancelamento e ordenação. Segredos devem ser removidos antes de persistir.

### Checkpoint derivado

`checkpointId`, `chatId`, `schemaVersion`, `algorithmVersion`, `generatedAt`, `coveredThroughSequence` ou IDs-fonte, hash/fingerprint do prefixo, `summary` marcado como gerado, política/limite usado, faixa recente preservada e `status` validado. Salvar atomicamente; só avançar fronteira após resposta válida e validação. Invalidação mantém o transcript e o checkpoint válido anterior.

**Regra de compactação:** só cortar em fronteira de turno concluído que não separe tool-call/result, aprovação, erro ou estado pendente. A cauda recente é reconstruída por IDs/sequence originais, não cópia solta.

## 5. Contratos de portas e fluxo

- `TranscriptReader.readRange(chatId, from, through)` e `append/commit(events)` (sem fixar agora API exata); acesso recebe chatId e respeita autorização.
- `ContextProjector.build(chatId, requestEnvelope, checkpoint?, retrievedRefs?)` devolve payload e descrição de origem; a Casa que fala com cada provider conserva a responsabilidade por serialização protocolar.
- `UsageObserver` normaliza usage recebido do protocolo e associa a `requestId`, modelo e iteração.
- `CheckpointStore` lê/grava sidecar separado; não altera `TranscriptRepository`.
- `SearchPort.search({chatId, query, filters})` devolve apenas referências/snippets; `readOriginal(messageId)` devolve fonte literal e vizinhança. Busca manual de UI e tool do agente são contratos diferentes.
- A composição root injeta essas portas a Conversa/Agir. Eventos SSE podem incluir snapshot de contexto/uso por request/iteração, sem API key ou payload sensível.

## 6. Indicador e alertas — comportamento proposto

- Antes de qualquer medição: estado **“uso ainda não medido”**, sem percentual inventado.
- Depois de uma resposta: mostrar último prompt efetivamente medido, seu modelo e timestamp; identificá-lo como último uso se o modelo/alvo mudou.
- Ao compor a próxima solicitação: substituir pelo cálculo estimado do payload que realmente será enviado **apenas se** existir tokenizador aplicável; caso contrário, não converter caracteres em tokens/percentual.
- Após cada iteração de ferramenta, atualizar com usage reportado dessa requisição (a ocupação do prompt mais recente). Somar custo/volume cumulativo é métrica diferente.
- Quando o limite é desconhecido, mostrar “limite não informado”, não `0%` nem default silencioso. Quando origem for default/configuração manual, identificá-la.
- Alertas podem usar faixas propostas (por exemplo, 75%/90%) mas os thresholds devem ser decisão de produto. A reserva de saída aparece visualmente separada da ocupação.
- Só iniciar compactação automática quando orçamento/proveniência forem suficientes; caso contrário, erro 413 deve permanecer honesto e o transcript intacto.

## 7. Pesquisa e memória — limites iniciais recomendados

- Fase de busca: primeiro lexical/metadata no mesmo chat, resultado com ID e texto original. O suporte FTS5 foi confirmado no `better-sqlite3` instalado (SQLite 3.53.2, tabela virtual e consulta `MATCH` executadas); permanece uma opção a avaliar arquiteturalmente, sem decisão de adoção. Evidência em [`08_PROVAS_TECNICAS.md`](08_PROVAS_TECNICAS.md).
- Embeddings/vector store: não obrigatório e não recomendado sem falha demonstrada de busca lexical e análise de licença/custo.
- Memória do projeto: registros explícitos, inspecionáveis e editáveis, com fonte, data, escopo, estado confirmado/provisório/superado. Não guardar preferência global sem aprovação.
- Pesquisa agentic cross-chat: fora da primeira implementação; requer aprovação, ACL por projeto/chat, limites de tokens, origem visível, defesa contra instruções antigas e testes de não vazamento.
- Recuperação não deve converter texto antigo em instrução atual: marcar como dado histórico não confiável e exigir confirmação para ações.

## 8. Integração com o indicador atual e D14

A implementação do medidor depende da fonte de modelo efetivo. O `AlvoConversa` é resolvido no servidor a partir do provedor ativo; o seletor do composador é mock e DEBT-14 está aberto em `docs/06`. Não usar o rótulo do composador como valor de runtime. É possível mostrar o alvo efetivo atual enquanto D14 não for decidido; permitir troca real de modelo exigirá resolver D14 separadamente ou coordenar sua SPEC.

## 9. Pontos que não se fixam nesta proposta

Banco/forma exata de checkpoint; tokenizer para cada protocolo; se usage local pré-request é obrigatório para todos; thresholds; formato de memória; retenção e exportação; estratégia de indexação; quais instruções de sistema entram no app versus provedor; se busca intra-chat poderá ser chamada pelo agente. Tudo exige validação e/ou decisão do dono.