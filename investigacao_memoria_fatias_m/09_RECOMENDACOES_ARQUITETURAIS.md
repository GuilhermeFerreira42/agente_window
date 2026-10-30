# 09 — Recomendações arquiteturais

**Estado:** recomendações para decisão; aguardam aprovação explícita. Nenhuma alteração de código, documentação canônica ou roadmap foi feita.

## Prioridade 0 — Integridade do estado já existente

1. Repetir/automatizar o teste de concorrência como critério de aceite: duas rodadas isoladas de 16 PUTs ao mesmo transcript falharam 2 vezes cada com `ENOENT` no rename de `<destino>.<pid>.tmp`.
2. Antes de adoção de memória/busca, definir serialização de gravação por sessão e nomes temporários exclusivos, bem como comportamento quando catálogo SQLite atualiza mas JSONL falha. Preservar dado anterior e devolver erro recuperável; não esconder falha de save.
3. Manter delete/reopen e crash test em fixture; não migrar SQLite/JSONL sem benchmark e plano de rollback.

## M1–M2 — Fonte e medição

- Distinguir transcript completo (incluindo troca de ferramentas) da projeção textual que um provider recebe e dos cards apresentados na UI.
- Gerar identidade/sequence por sessão/chat/mensagem/tool call; documentar payload sensível e redaction antes de persistir texto de arquivos.
- Substituir semanticamente o indicador sintético por estado explícito **reportado**, **estimado** ou **indisponível**. Associar a request/iteração/modelo/limite efetivo; anexos, system prompt e tool schemas não podem ser presumidos pela contagem de caracteres.
- Só usar tokenizer compatível quando modelo/protocolo conhecido e identificar estimativa; manter o último usage como histórico, não como uso atual.

## M3–M4 — Continuidade e acesso à fonte

- Manter transcript como autoridade; checkpoint sumariza e marca a faixa de mensagens abrangida, com versão/modelo/data/fingerprint e invalidação/recuo seguro.
- Garantir fronteiras completas de tool call/result, approval, erro e cancelamento; manter cauda original e never overwrite a fonte.
- Preferir busca manual literal no transcript por relevância verificável e abrir original/vizinhança. Índice é derivado reconstruível; só adotá-lo se benchmark indicar necessidade.

## M5–M6 — Memória e recuperação

- Caso de uso de memória persistente começar explícito, local e escopado ao projeto; exigir origem, data, estado (provisório/confirmado/substituído), revisão e exclusão. Sem escopo global automático no primeiro corte.
- Separar memória de projeto de transcript e instruções carregadas; texto histórico recuperado é dado não confiável, nunca instrução executável.
- Recuperação pelo agente ser opt-in/visível, com escopo/ACL e limite tokens; retornar hits com IDs e trecho literal + segunda leitura limitada da fonte. Relatar ausência honestamente.
- Embeddings não são recomendados como ponto de partida. Avaliar exato/FTS5-BM25 primeiro; só considerar semântica se corpus anotado comprovar ganho incremental em recall/qualidade dentro de limites de precisão, latência, custo e privacidade. Nenhum envio a serviço remoto sem consentimento específico.

## M7–M8 — Operação e governança

- Após restart, restaurar transcript mas marcar corrida `interrompida`/resultado desconhecido. Não retomar Map antigo nem repetir side effect. Continuar significa iniciar nova execução validada com nova autorização.
- Testar cada ponto de parada (antes/depois de aprovação, tool em voo, após efeito, antes de persistir resultado); distinguir “resultado conhecido” de “indeterminado”.
- Antes de homologar: corrida concorrente corrigida, exclusão/retention de derivados, migração/corrupção, isolamento entre sessões/projetos, prompt injection em transcript/memória, segredos em tools/logs, provider sem usage, 413 e falha de armazenamento.
- Manter dependências e superfícies dentro das fronteiras públicas/LEGO; composição na prefeitura e contracts explícitos. Reutilizar aprendizados, não importar arquitetura ou código de produto de referência sem revisão.

## Não recomendado com evidência atual

- Implementar banco vetorial, embeddings remotos ou auto-RAG antes de medir o problema de recuperação.
- Usar resumo como transcript, ou reexecutar ferramentas porque um summary diz que estavam pendentes.
- Tratar o indicador atual como “% real de contexto”.
- Declarar M1–M8 aprovadas ou alterar a ordem oficial com base neste relatório.
