# Relatório de consolidação documental — 2026-10-23

**Projeto:** Agente Window
**Baseline Git:** `main` · `b7d51cfc698c93ee6d469d6601c8f5d701ae0763`
**Escopo desta etapa:** consolidação autorizada dos nove documentos canônicos, referências comprovadamente desatualizadas e análise estática das dependências M1–M4 com as Fatias 13–15.
**Status:** documentos atualizados; sem commit. Aguardando validação do dono antes de iniciar a confirmação D98.

## 1. Resumo executivo

Consolidei nos canônicos as decisões aprovadas no alinhamento, as condições ainda pendentes de SPEC, os limites de autorização e a análise estática pedida. Corrigi caminhos antigos da carta PERF: no workspace observado, o arquivo está em `/home/user/notas_temporarias/carta_contexto_chat_arena_bug_desempenho.md`, não em `uploads/`.

A confirmação técnica D98 permanece **autorizada em princípio, mas bloqueada até o dono validar esta consolidação**. Nesta etapa não rodei trace, teste, benchmark, protótipo, build ou qualquer validação de código. Também não alterei código, ordem ou numeração oficial de fatias, não implementei funcionalidades, não fiz merge, push ou commit.

## 2. Canônicos atualizados

Foram feitas mudanças localizadas nos nove documentos existentes, sem criar um décimo canônico:

| Canônico | Consolidação aplicada |
|---|---|
| `docs/01 - COMECE AQUI.md` | Índice de decisões atualizado até D99; estado resumido reflete D98 condicionado à validação, Central de Diagnósticos futura e planejamento M1–M4 sem implementação ou numeração oficial. |
| `docs/02 - VISAO GERAL.md` | Roadmap preserva 12 → D98 → 13–15; explicita o gate D98, o futuro sujeito a SPEC e corrige o caminho da carta PERF. |
| `docs/03 - ESTADO ATUAL.md` | Estado e próximo passo atualizados; distingue último placar registrado de testes desta tarefa; explicita pendências, gate D98 e a decisão própria de DEBT-23 na abertura da 13. |
| `docs/04 - ARQUITETURA E REGRAS DURAS.md` | Nova seção D99 com limites de autorização, princípios de privacidade, Central futura, medição honesta de contexto e requisitos a formalizar em SPECs. |
| `docs/05 - DECISOES.md` | D91 revisada conforme opção C; D98 atualizada para exigir validação documental e aprovação da SPEC antes de produção; D99 registra decisões e restrições aprovadas. |
| `docs/06 - PROXIMAS FASES E DIVIDAS.md` | D98 marcada como aguardando validação; corrigido caminho da carta; DEBT-23 requer decisão própria e não entra automaticamente na SPEC 2G; incluída análise estática M1–M4 × 13–15 sem mudar o roadmap. |
| `docs/07 - HISTORICO.md` | Entrada de 23/10 registra a consolidação, seus limites e o relatório; atualizados os caminhos históricos da carta PERF e anotado que o passo de D98 agora depende da validação. |
| `docs/08 - HOMOLOGACAO.md` | Mantém a homologação funcional com o dono e esclarece que teste real bloqueado não transfere essa responsabilidade; remete regras operacionais e credenciais ao `09`. |
| `docs/09 - TESTES E AMBIENTE.md` | Registros de placares identificados como históricos; D98 aguarda validação e passa a ter métricas de desempenho a medir; formalizada responsabilidade de testes reais e tratamento de bloqueios. |

O relatório A01–A10 já existente (`docs/arquivo_morto/RELATORIO_ALINHAMENTO_PERF_MEMORIA.md`) e o estudo M1–M8 em `docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/` foram preservados; não foram reescritos nem removidos.

## 3. Decisões aprovadas e seus limites

- **D98/PERF:** confirmação técnica somente após validação deste pacote documental. Depois, registrar medições e propor SPEC mínima com critérios quantitativos fundamentados nelas. Qualquer mudança permanente em produção aguarda aprovação explícita da SPEC. Nenhuma confirmação foi executada nesta etapa.
- **D91 — opção C:** Arena executa testes técnicos automatizados (unitários, integração, E2E, regressão e benchmarks). Testa provedores reais apenas com ambiente legítimo, acesso seguro e autorização. Nunca solicita, registra ou expõe chaves/credenciais; se não houver condições, registra o teste real como bloqueado/não executado. A homologação funcional continua com o dono.
- **Central de Diagnósticos:** capacidade permanente futura aprovada: eventos/falhas relevantes, notificações discretas apenas para problemas importantes, eventos comuns silenciosos, deduplicação/agregação e exportação sanitizada. Arquitetura, UI, armazenamento, retenção e política detalhada de privacidade dependem de SPEC própria. Nenhum envio externo é presumido.
- **M1–M4:** primeiro conjunto aprovado para planejamento — M1 medição/orçamento; M2 transcript estruturado; M3 checkpoints/compactação; M4 busca manual no histórico. Isso não autoriza implementação nem atribui números oficiais de fatia. M5–M8 ficam para planejamento posterior.
- **Contexto e privacidade:** preferir `usage` real do provedor; se indisponível, mostrar estimativa claramente identificada ou indisponibilidade. Limites por modelo/provedor devem ser configuráveis manualmente, com origem indicada; alertas em 75%/90%. Armazenamento local preferencialmente em `~/.agente_window`, isolamento entre projetos/conversas, transcript original preservado, aprovação humana para memória persistente de projeto, exportação/exclusão explícitas, proteção de credenciais/sensíveis, sem telemetria externa presumida e sem reexecução automática de ferramentas interrompidas. Retenção e limpeza detalhadas ficam para SPEC.
- **DEBT-23:** exige decisão específica do dono ao abrir a Fatia 13; não passa automaticamente à SPEC 2G.

## 4. Dependências estáticas M1–M4 × Fatias 13–15

Esta análise cruza as propostas no estudo preservado com as SPECs canônicas 2G, 2H e 2I. É uma análise documental, não um teste de implementação.

| Item | Dependências relevantes | Recomendação |
|---|---|---|
| **M1 — medição/orçamento** | Uso real, alvo/modelo efetivo e contexto enviado dependem dos contratos de conversa/agente. A Fatia 13 introduz chamadas de terminal; a 14 pode introduzir skills/instruções e alterar o contexto; convém conhecer esses formatos antes de fechar o orçamento. A 15 não é dependência funcional, mas envolve wiring e composição de abas/editor. | Especificar após estabilizar 13/14; executar preferencialmente depois da 15 para diminuir retrabalho. É pré-requisito de M3. Não declarar precisão sem `usage` real. |
| **M2 — transcript estruturado** | Requer identidade, ordem e pareamento fiel entre chamadas e resultados. As ferramentas existentes, a futura ferramenta de terminal da 13 e eventuais invocações/contexto de skills da 14 devem caber no modelo de eventos. A 15 pode concorrer por alterações na composição/persistência. | Estabilizar os tipos de evento depois de 13/14; preservar a fonte original. Executar preferencialmente depois da 15. É dependência direta de M3 e M4. |
| **M3 — checkpoints/compactação** | Depende de M1 (orçamento) e M2 (fonte estruturada, IDs e resultados de ferramentas). Não depende diretamente das fatias 13–15, mas deve cobrir os eventos que elas adicionarem. | Só iniciar depois de M1 e M2; checkpoint inválido/vazio não pode substituir o válido nem destruir o transcript original. |
| **M4 — busca manual no histórico** | Depende de M2 para IDs/sequência e transcript fiel. Pode buscar a fonte original sem M3; não há dependência funcional obrigatória da 15, embora esperar a estabilização de abas/sessões reduza conflito de integração. | Depois de M2; M3 é recomendável antes por sequência do conjunto, mas não é pré-requisito técnico de M4. |

### Sequência recomendada sem reordenar fatias oficiais

1. Manter D98 no lugar já aprovado, entre as Fatias 12 e 13; só executar a confirmação após validação documental.
2. Prosseguir pela ordem oficial **Fatia 13 → Fatia 14 → Fatia 15**. Na abertura da 13, decidir DEBT-23 separadamente antes de qualquer inclusão em SPEC.
3. Após a 15, iniciar a iniciativa de contexto na sequência recomendada **M1 → M2 → M3 → M4**. M1 e M2 podem ser especificadas em paralelo; M3 só depois de ambas; M4 só depois de M2. A posição posterior à Fatia 15 é recomendação de estabilidade e redução de conflitos, não uma dependência funcional rígida.

A recomendação não insere M1–M4 entre as fatias oficiais, não altera sua numeração nem a ordem das 13–15. Os rótulos hipotéticos do estudo M1–M8 continuam sendo apenas rótulos de planejamento.

## 5. Referências e distinção de baselines

- Os canônicos que apontavam a carta PERF para `uploads/` foram atualizados para o caminho real observado em `/home/user/notas_temporarias/`. A carta continua fora do repositório.
- **Fidelidade visual/funcional:** baseline canônico continua sendo VS Code **1.135**, conforme D71.
- **Experimento de desempenho:** a referência arquitetural Code-OSS **1.138.0** citada na carta PERF (virtualização/lista grande/limite/cancelamento) é referência do experimento, não substitui o baseline 1.135. As duas versões não devem ser confundidas.
- Números de testes e benchmarks já registrados no estudo anterior não foram reproduzidos nesta consolidação; continuam identificados como resultados registrados anteriormente, não como validação independente atual.

## 6. Verificações e limites desta execução

- HEAD permaneceu `b7d51cfc698c93ee6d469d6601c8f5d701ae0763` em `main`.
- Antes de criar este relatório, `git status` mostrava os nove canônicos modificados e os artefatos não rastreados preexistentes (relatório A01–A10 e estudo M1–M8). Este é o único novo relatório Markdown desta consolidação; nenhum outro arquivo novo foi criado.
- A busca local não encontrou nos canônicos restantes a referência obsoleta `uploads/carta_contexto_chat_arena_bug_desempenho.md`.
- Não houve alteração de código, implementação, build, teste automatizado, benchmark, trace CDP, protótipo D98, acesso a provedor/credencial, renumeração, merge, push ou commit.

## 7. Próximo passo oficial

**Aguardar a validação do dono deste pacote documental.** Somente após ela executar a confirmação técnica D98 isolada e autorizada; registrar os resultados; produzir a SPEC mínima com critérios quantitativos derivados das medições; e aguardar aprovação explícita antes de qualquer alteração permanente de produção.
