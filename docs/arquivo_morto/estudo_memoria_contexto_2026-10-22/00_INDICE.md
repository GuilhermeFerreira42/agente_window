# Estudo de continuidade, memória e contexto — índice

**Data:** 22/10/2026  
**Status:** pacote de investigação e planejamento; **não aprovado como norma**, sem autorização para implementação.  
**Escopo:** continuidade/compactação/recuperação fiel do histórico e auditoria do indicador de uso de contexto.  
**Localização:** todo este pacote fica isolado em `docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/`.

> Os documentos aqui são proposta para revisão. Prevalecem `docs/01`–`docs/09`, as decisões aprovadas e as homologações. Não alteramos canônicos, código, roadmap ou numeração oficial.

## Leitura recomendada

1. [`01_RESUMO_EXECUTIVO.md`](01_RESUMO_EXECUTIVO.md) — descobertas, recomendação e decisões a pedir.
2. [`02_ESTADO_ATUAL_E_EVIDENCIAS.md`](02_ESTADO_ATUAL_E_EVIDENCIAS.md) — inventário do Agente Window, fluxo do indicador e limitações da auditoria.
3. [`03_COMPARATIVO_REFERENCIAS.md`](03_COMPARATIVO_REFERENCIAS.md) — Open WebUI, OpenClaude, VS Code/Copilot, Cline e OpenCode.
4. [`04_ARQUITETURA_E_CONTRATOS.md`](04_ARQUITETURA_E_CONTRATOS.md) — requisitos, portas LEGO, modelo de dados e telemetria proposta.
5. [`05_LICENCAS_E_DEPENDENCIAS.md`](05_LICENCAS_E_DEPENDENCIAS.md) — proveniência, reutilização de código, dependências e limites de licença.
6. [`06_TESTES_RISCOS_RASTREABILIDADE.md`](06_TESTES_RISCOS_RASTREABILIDADE.md) — critérios, matriz RF/RNF, testes e riscos.
7. [`07_PLANO_DE_FATIAS_E_RENUMERACAO.md`](07_PLANO_DE_FATIAS_E_RENUMERACAO.md) — sequência hipotética M1–M8 e mapa de correspondência; nada renumerado oficialmente.
8. [`08_PROVAS_TECNICAS.md`](08_PROVAS_TECNICAS.md) — evidências executadas de SQLite/FTS5, JSONL, typecheck e testes; registra o bloqueio da prova de `usage` real por falta de credenciais.
9. [`fatias/`](fatias/) — propostas de especificação individual, cada uma sujeita a aprovação própria.

## Propostas individuais

| Código de planejamento | Documento | Capacidade |
|---|---|---|
| M1 | [`M1_MEDICAO_E_ORCAMENTO.md`](fatias/M1_MEDICAO_E_ORCAMENTO.md) | Uso real/estimado, limite efetivo, indicador e orçamento |
| M2 | [`M2_TRANSCRIPT_E_EVENTOS_DE_FERRAMENTA.md`](fatias/M2_TRANSCRIPT_E_EVENTOS_DE_FERRAMENTA.md) | Transcript fiel, identidade/ordem e chamadas/resultados de ferramentas |
| M3 | [`M3_CHECKPOINT_E_COMPACTACAO.md`](fatias/M3_CHECKPOINT_E_COMPACTACAO.md) | Checkpoint versionado, resumo e cauda recente sem destruir originais |
| M4 | [`M4_BUSCA_MANUAL_NO_MESMO_CHAT.md`](fatias/M4_BUSCA_MANUAL_NO_MESMO_CHAT.md) | Pesquisa manual e leitura literal do original no chat corrente |
| M5 | [`M5_MEMORIA_DE_PROJETO.md`](fatias/M5_MEMORIA_DE_PROJETO.md) | Memória persistente, escopo de projeto, proveniência e gestão |
| M6 | [`M6_RECUPERACAO_PELO_AGENTE.md`](fatias/M6_RECUPERACAO_PELO_AGENTE.md) | Recuperação pelo agente; busca cross-chat como fase posterior e opt-in |
| M7 | [`M7_RECONSTRUCAO_OPERACIONAL.md`](fatias/M7_RECONSTRUCAO_OPERACIONAL.md) | Reconstituir trabalho após interrupção sem replay automático |
| M8 | [`M8_HARDENING_E_HOMOLOGACAO.md`](fatias/M8_HARDENING_E_HOMOLOGACAO.md) | Privacidade, concorrência, desempenho e regressão integrada |

## Convenções de evidência

- **Confirmado em código:** caminho e símbolo observados no workspace/snapshot indicado.
- **Confirmado em documentação:** regra escrita nas fontes canônicas ou documentação oficial consultada.
- **Inferência:** consequência provável derivada do fluxo; ainda não provada por execução.
- **Recomendação:** proposta técnica, não decisão do dono.
- **Não verificado:** faltou checkout/HEAD, execução ou contrato necessário; não será apresentado como fato.

## Referências canônicas pertinentes

`docs/01` hierarquia e trabalho; `docs/02` escopo; `docs/03` estado; `docs/04` arquitetura e LEGO/Condomínio; `docs/05` decisões; `docs/06` fatias/dívidas; `docs/07` histórico; `docs/08` homologação; `docs/09` testes/ambiente.

## Nota de organização

O índice próprio satisfaz o pedido de manter este estudo isolado. O índice-mãe `docs/arquivo_morto/INDICE.md` e os canônicos — inclusive `docs/07` — ficaram intocados para respeitar o limite explícito desta tarefa. A entrada neste pacote é o ponto de navegação da pesquisa; eventual atualização do índice-mãe fica para autorização posterior.