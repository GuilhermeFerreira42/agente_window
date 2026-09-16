# 15 — HANDOFF PROMPT PARA NOVA IA

## Objetivo
Fornecer um prompt pronto para iniciar um novo chat com uma IA executora, sem obrigá-la a redescobrir o projeto.

## Prompt sugerido
```text
Você vai atuar como IA executora do projeto AGENTE WINDOW.

Leia obrigatoriamente, nesta ordem:
1. docs/00_COMO_LER_ESTA_DOCUMENTACAO.md
2. docs/01_FONTE_DA_VERDADE.md
3. docs/02_ESCOPO_V1_E_NAO_ESCOPO.md
4. docs/03_ARQUITETURA_EXECUTAVEL.md
5. docs/03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md
6. docs/04_CONTRATOS_TECNICOS.md
7. docs/05_BACKLOG_MESTRE.md
8. docs/06_PLANO_DE_IMPLANTACAO_PARA_IA.md
9. docs/07_MATRIZ_DE_VALIDACAO.md
10. docs/11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md
11. docs/12_DOCUMENTACAO_VIVA.md
12. docs/13_ADRS_E_DECISOES_TECNICAS.md
13. docs/14_PRIMEIRA_FATIA_RECOMENDADA.md
14. docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md
15. docs/16_INICIAR_POR_AQUI_IA_EXECUTORA.md
16. docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md

Se a frente autorizada for a FATIA-04 (é a vigente), leia TAMBÉM, antes de implementar:
17. docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_00_INDICE_E_RESUMO_VIDEO.md
18. docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_15_PLANO_IMPLEMENTACAO_SUBFATIAS.md
19. docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_13_CRITERIOS_ACEITE_VALIDACAO.md
20. docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_07_BROWSER_SESSAO_EDITOR_IA_HTML.md
21. docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_14_GAPS_ENTRE_DOC_ATUAL_E_VIDEO.md (§4 — decisões Q1–Q6)

Depois disso:
1. Resuma seu entendimento do projeto em poucas linhas.
2. Confirme qual é a próxima frente autorizada no estado vigente do repositório.
3. Liste os arquivos que pretende alterar.
4. Diga quais validações vai rodar.
5. Aguarde confirmação do usuário antes de implementar.

Regras invioláveis:
- Não redefina a arquitetura.
- Não use docs históricos como autoridade acima de docs/.
- Não implemente múltiplos subsistemas grandes no mesmo passo.
- Não pule contratos para ganhar velocidade.
- Não avance para a próxima fatia sem validar a atual.
- Não faça build completo como padrão; priorize typecheck, testes focados, probe e E2E conforme a fatia.
- Ao final, pare e reporte: o que foi feito, o que faltou, quais testes rodaram e quais riscos permaneceram.

Referência obrigatória de estado vigente:
- seguir `docs/16_INICIAR_POR_AQUI_IA_EXECUTORA.md`
- usar `docs/12_DOCUMENTACAO_VIVA.md` para distinguir estado atual, decisões congeladas e transição histórica
- tratar `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md` apenas como registro histórico da abertura da execução
- para a frente vigente (FATIA-04): seguir o plano `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_15_PLANO_IMPLEMENTACAO_SUBFATIAS.md`, executar na ordem 4.1→4.9 e validar pelo `04_13` (checklist A + B) sem quebrar nada blindado pelo `docs/18`

Se encontrar conflito ou lacuna documental, pare e pergunte antes de improvisar.
```

## Versão curta
```text
Leia docs/00 a docs/07, 11, 12, 13, 14, 15, 16 e 18. Resuma o entendimento. Confirme a próxima frente autorizada no estado atual do repositório.

Se a frente for a FATIA-04 (é a vigente), leia ANTES de implementar:
docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_00 (índice), 04_15 (plano em 9 sub-fatias 4.1→4.9), 04_13 (aceite A+B), 04_07 (browser com acesso da IA ao HTML) e 04_14 §4 (decisões Q1–Q6 fechadas).

Liste arquivos-alvo. Aguarde confirmação do usuário. Depois implemente apenas essa sub-fatia, na ordem 4.1→4.9. Valide com typecheck + testes focados + E2E + checklist do 04_13 e rode a anti-regressão sessao_11_terminal_pty_real (6/6). Pare e reporte. Não redefina arquitetura nem pule contratos.
```

## Uso recomendado
- usar este prompt ao abrir o próximo chat;
- colar junto com a instrução da próxima frente autorizada;
- atualizar `12_DOCUMENTACAO_VIVA.md` após cada execução relevante.
