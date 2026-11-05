# Proposta de sequência e correspondência das fatias

**Status:** cenário para discussão, sem alteração oficial. IDs M1–M8 são rótulos deste pacote; os números 13–20 na coluna “posição hipotética” não são números oficiais.

## 1. Ponto de partida documental

`docs/06 - PROXIMAS FASES E DIVIDAS.md` informa: FATIA 11 homologada; FATIA 12 — DELETE micro — tem SPEC fechada e aguarda ordem; FATIA 13 — Terminal-para-o-agente — vem a seguir; 14–20 cobrem Personalizações/Sessões, janela única de abas, Terminal 2.0, Refinamentos, Painéis, Worktrees e Polimento/Navegador. O anexo fala em continuar “a partir da Fatia 13”. Esta proposta preserva a Fatia 12, já decidida, e insere o estudo de memória **depois da 12 e antes da antiga 13**. Alternativa de mover a 12 para depois do estudo não é recomendada sem decisão explícita.

## 2. Sequência proposta

| Ordem proposta | Fatia hipotética | Documento | Resultado isolado | Dependências-chave |
|---:|---:|---|---|---|
| 1 | M1 (13) | `fatias/M1_MEDICAO_E_ORCAMENTO.md` | Indicador honesto, uso por request, limite/modelo efetivo e origem | Alvo provider/modelo e contratos Conversa/Agir |
| 2 | M2 (14) | `fatias/M2_TRANSCRIPT_E_EVENTOS_DE_FERRAMENTA.md` | Transcript com identidade/ordem e diálogos de ferramentas reconstruíveis | Persistência atual; política de scrub/retention |
| 3 | M3 (15) | `fatias/M3_CHECKPOINT_E_COMPACTACAO.md` | Checkpoint por chat + resumo + cauda recente, sem apagar origem | M1 e M2 |
| 4 | M4 (16) | `fatias/M4_BUSCA_MANUAL_NO_MESMO_CHAT.md` | Busca manual literal do transcript corrente com refs estáveis | M2; M3 recomendável, mas busca também percorre fonte original |
| 5 | M5 (17) | `fatias/M5_MEMORIA_DE_PROJETO.md` | Memória explícita/gerida com escopo de projeto e proveniência | M2/M3; aprovação de escopo/retenção |
| 6 | M6 (18) | `fatias/M6_RECUPERACAO_PELO_AGENTE.md` | Tool de recuperação histórica com proveniência; cross-chat não entra na primeira entrega | M4/M5, ACL, prompt-injection/policy e limite de tokens |
| 7 | M7 (19) | `fatias/M7_RECONSTRUCAO_OPERACIONAL.md` | Reconstrução de trabalho validada após interrupção, sem replay automático | M2/M3; M6 opcional |
| 8 | M8 (20) | `fatias/M8_HARDENING_E_HOMOLOGACAO.md` | Privacidade, concorrência, desempenho, regressão e homologação ponta a ponta | M1–M7 aprovadas |

**Corte mínimo sugerido:** M1–M3 entregam medição + transcript fiel + compactação; M4 fornece recuperação manual no mesmo chat. M5–M8 compõem memória gerida, recuperação pelo agente (posterior/opt-in), reconstrução de execução e hardening. Não é compromisso de implementar todas.

## 3. Mapa de correspondência hipotético

Se a decisão for manter Fatia 12 e inserir oito novas fatias antes da antiga 13:

| Número oficial atual | Nome atual em `docs/06` | Posição hipotética após inserção | Observação |
|---:|---|---:|---|
| 11 | Teto + Continuar + Config | 11 | Já homologada; não muda. |
| 12 | DELETE micro | 12 | SPEC fechada, aguarda ordem; preservar. |
| — | M1–M8 continuidade/contexto | 13–20 | Rótulos apenas hipotéticos, definidos neste pacote. |
| 13 | Terminal-para-o-agente | 21 | Specs/decisões ficam preservadas; ordem pode ser revista por dependências. |
| 14 | Barra esquerda + Personalizações + Skills | 22 | Correspondência aritmética; depende de aprovação. |
| 15 | Janela única de abas | 23 | Idem. |
| 16 | Terminal 2.0 | 24 | Idem; não confundir com terminal-para-agente. |
| 17 | Refinamentos + Casa Command Center | 25 | Idem. |
| 18 | Painéis/Drag & Drop avançado | 26 | Idem. |
| 19 | Worktree/Isolamento de Sessões | 27 | Idem. |
| 20 | Polimento + Navegador | 28 | Idem. |

A tabela só calcula um cenário de inserção; não renomeia specs antigas, decisões, commits, homologações, DEBTs, testes ou documentos canônicos. Se o dono escolher outro número de fatias, refazer o mapa, mantendo IDs históricos como alias rastreáveis.

## 4. Justificativa e dependências cruzadas

- M1 antes de compactar: sem modelo efetivo, uso e teto identificados, gatilho de compactação seria arbitrário. A atual DEBT-14 (seletor mock) é dependência de UX; o runtime já resolve o modelo do provedor ativo.
- M2 antes de M3: resumo não pode ser fiel a chamadas/resultados que não têm registro durável/identidade.
- M3 antes de recuperação: reduz contexto rotineiro e preserva fronteira para pesquisa antiga, mas busca manual sobre transcript pode funcionar sem compaction.
- M4 antes de M6: prova a navegação por fonte original e identifica limites lexicales antes de dar uma tool ao agente.
- M5 separado: memória persistente de projeto não é transcript compactado nem busca; deve ser inspecionável/editável.
- M7 não é replay: após restart, comparar workspace/Git e apresentar estado para validação humana; comandos e escritas não voltam a executar automaticamente.
- M8 não pode se tornar “polimento”: inclui gates de privacidade, isolamento, concorrência, persistência, custo/latência e suíte de regressão.

## 5. Estratégia alternativa se não houver renumeração

Manter números oficiais e abrir uma iniciativa paralela com chaves M1–M8, aprovada como trabalho entre as fatias 12 e 13, sem mudar IDs das futuras fatias. Isso evita churn documental, mas requer prioridade explícita e rastreio de dependências; pode ser a opção de menor risco se a renumeração gerar confusão. Não atualizar `docs/06` até o dono escolher.

## 6. Regras de governança sugeridas

1. A aprovação deste pacote não aprova automaticamente cada M1–M8.
2. Cada fatia futura deve receber SPEC oficial no lugar/forma exigidos pelos canônicos, após revisão e autorização; as fichas deste arquivo morto são somente rascunhos.
3. Nenhuma fatia altera terminal, banco ou contratos congelados sem ordem e critérios conforme `docs/04`–`docs/06`.
4. Uma alteração de numeração só acontece mediante decisão explícita e mapa completo; preservar identificadores históricos e homologações.
5. A busca cross-chat em M6 é extensão posterior, não requisito do corte mínimo inicial.