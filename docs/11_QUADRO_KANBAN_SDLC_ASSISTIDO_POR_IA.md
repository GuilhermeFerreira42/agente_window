# QUADRO KANBAN — SDLC ASSISTIDO POR IA

| STATUS USADO | SIGNIFICADO |
|---|---|
| Concluído | etapa/artefato já fechada(o) no estado atual do projeto |
| Parcial | existe base pronta, mas ainda falta detalhamento operacional ou aceite final |
| A fazer | próximo passo já identificado, mas ainda não iniciado |
| Bloqueado | depende da escolha da primeira fatia e do início da implementação |
| Planejado | fase futura já documentada, mas sem execução prática ainda |

## Cabeçalho do quadro

| DATA DE INÍCIO DO SPRINT | DIAS | PROGRESSO | ATUALIZADO POR |
|---|---|---|---|
| 2026-09-11 | Em definição | Preparação documental concluída; implementação ainda não iniciada | Arena Agent |

---

## FAIXA 1 — PREPARAÇÃO

### Coluna 1 — DESCOBERTA (P1)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1.1 | Entendimento do problema | Compreender o objetivo do produto e o contexto | Objetivo, stakeholders, restrições | Problema formulado | Humano | Documento de visão | Usuário + IA documental | P0 | — | — | Concluído | Visão do AGENTE WINDOW consolidada em `docs/02` e documentos de apoio. |
| P1.2 | Engenharia reversa / As-Is | Mapear sistema de referência, se existir | Código, docs, comportamento observável | Inventário funcional e técnico | Ambos | As-Is / Reverse Engineering Doc | Usuário + IA documental | P0 | — | — | Concluído | Engenharia reversa por 8 subsistemas consolidada em `docs/engenharia_reversa/`. |
| P1.3 | Levantamento de requisitos | Coletar requisitos funcionais e não funcionais | Problema, As-Is, entrevistas | Lista de requisitos | Ambos | Requisitos / Fonte da verdade | Usuário + IA documental | P0 | — | — | Concluído | Requisitos consolidados entre `docs/02`, `docs/04`, `docs/07` e `fonte_da_verdade/06`. |
| P1.4 | Análise de lacunas | Comparar o que existe com o que se quer | As-Is, requisitos | Gaps identificados | Humano | Gap Analysis | IA documental | P0 | — | — | Concluído | Gaps mapeados por módulo nas camadas D da engenharia reversa. |
| P1.5 | Validação inicial | Confirmar entendimento com stakeholder | Requisitos, gaps | Requisitos validados | Humano | Ata / aceite inicial | Usuário | P0 | — | — | Concluído | Entendimento consolidado em conversa; `docs/` assumido como linha principal de continuidade. |

---

### Coluna 2 — ESCOPO & ARQUITETURA (P2)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P2.1 | Definição de escopo V1 | Delimitar o que entra e o que não entra | Requisitos validados | Escopo V1 + não-escopo | Humano | Documento de escopo | Usuário + IA documental | P0 | — | — | Concluído | Formalizado em `docs/02_ESCOPO_V1_E_NAO_ESCOPO.md`. |
| P2.2 | Priorização | Ordenar o que é essencial, importante e opcional | Escopo V1 | Backlog priorizado | Humano | Matriz de priorização | Usuário + IA documental | P0 | — | — | Concluído | Prioridades P0/P1 organizadas no escopo e no backlog mestre. |
| P2.3 | Desenho arquitetural | Definir camadas, módulos e integrações | Escopo, requisitos | Arquitetura macro | Humano | Solution Architecture | IA documental | P0 | — | — | Concluído | Arquitetura executável registrada em `docs/03_ARQUITETURA_EXECUTAVEL.md`. |
| P2.4 | Definição de contratos | Estabelecer interfaces entre módulos/APIs | Arquitetura macro | Contratos técnicos | Ambos | Contract-First Spec | IA documental | P0 | — | — | Concluído | Contratos mínimos documentados em `docs/04_CONTRATOS_TECNICOS.md`. |
| P2.5 | Decisões técnicas | Registrar escolhas e justificativas | Arquitetura, contratos | ADRs | Humano | Architecture Decision Records | Usuário + IA documental | P1 | — | — | Parcial | Decisões estão consolidadas em `docs/01`, `docs/02`, `docs/03` e `docs/10`, mas sem arquivo ADR dedicado. |
| P2.6 | Aprovação arquitetural | Validar arquitetura antes da execução | Arquitetura + contratos | Arquitetura aprovada | Humano | Gate de arquitetura | Usuário | P0 | — | — | Concluído | Arquitetura já está apta para handoff e início controlado da implementação. |

---

### Coluna 3 — BACKLOG & FATIAMENTO (P3)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P3.1 | Montagem do backlog mestre | Consolidar tudo que precisa ser feito | Escopo, arquitetura, contratos | Backlog mestre | Ambos | Master Backlog | IA documental | P0 | — | — | Concluído | Ondas e épicos definidos em `docs/05_BACKLOG_MESTRE.md`. |
| P3.2 | Fatiamento em slices | Quebrar o trabalho em fatias executáveis | Backlog mestre | Fatias pequenas | Humano | Slice Plan | Usuário | P0 | — | — | Parcial | Ondas definidas, mas a primeira fatia operacional ainda precisa ser escolhida no novo chat. |
| P3.3 | Definição de critérios de pronto | Estabelecer quando uma fatia está pronta | Fatias | DoD por fatia | Humano | Definition of Done | Usuário | P0 | — | — | Parcial | Existe DoD macro; falta amarrar ao primeiro slice real. |
| P3.4 | Definição de critérios de aceite | Estabelecer como validar cada fatia | Fatias | Critérios de aceite | Humano | Acceptance Criteria | Usuário + próxima IA | P0 | — | — | Parcial | Há critérios por subsistema e matriz global, faltando selecionar o recorte da primeira fatia. |
| P3.5 | Plano de implantação para IA | Empacotar contexto e regras para a IA | Fatias, contratos, docs | Plano de handoff | Humano | AI Handoff Plan | IA documental | P0 | — | — | Concluído | Publicado em `docs/06_PLANO_DE_IMPLANTACAO_PARA_IA.md`. |
| P3.6 | Matriz de validação | Definir como cada fatia será testada | Critérios de aceite | Matriz de testes | Ambos | Validation Matrix | IA documental | P0 | — | — | Concluído | Publicada em `docs/07_MATRIZ_DE_VALIDACAO.md`. |

---

## FAIXA 2 — EXECUÇÃO

### Coluna 4 — HANDOFF PARA IA (P4.1)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P4.1 | Preparação do contexto | Empacotar docs, contratos e regras da fatia | Fatia + plano de handoff | Contexto pronto | Humano | Context Package | Usuário + próxima IA | P0 | — | — | A fazer | Próximo passo prático: abrir novo chat, mandar ler `docs/00` a `docs/07` e escolher a primeira fatia. |

---

### Coluna 5 — EM ANDAMENTO — IA (P4.2)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P4.2 | Geração de código | IA produz código da fatia | Contexto empacotado | Código gerado | IA | Código-fonte | Próxima IA executora | P0 | — | — | Bloqueado | Bloqueado até definição da primeira fatia e handoff formal. |

---

### Coluna 6 — REVISÃO HUMANA (P4.3 – P4.4)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P4.3 | Revisão humana | Humano revisa o que a IA produziu | Código gerado | Código aprovado/corrigido | Humano | Code Review | Usuário | P0 | — | — | Bloqueado | Depende da primeira entrega de código. |
| P4.4 | Ajustes e correções | Corrigir desvios, alucinações e acoplamentos | Código revisado | Código ajustado | Ambos | Patch | Usuário + próxima IA | P0 | — | — | Bloqueado | Só começa após review da primeira fatia. |
| P4.5 | Registro da fatia | Documentar o que foi feito e decidido | Código ajustado | Log de execução | Humano | Execution Log | Usuário + próxima IA | P1 | — | — | A fazer | Este item deve funcionar como documentação viva por fatia durante a implementação. |

---

### Coluna 7 — TESTE / VERIFICAÇÃO (P5.1 – P5.4)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P5.1 | Testes unitários | Validar partes isoladas do código | Código da fatia | Resultado unitário | Ambos | Relatório unitário | Próxima IA + usuário | P0 | — | — | Planejado | Estratégia definida; testes serão escritos junto de cada fatia. |
| P5.2 | Testes de integração | Validar comunicação entre módulos | Código + contratos | Resultado de integração | Ambos | Relatório de integração | Próxima IA + usuário | P0 | — | — | Planejado | Deve priorizar fluxos entre runtime, layout, terminal, chat e filesystem. |
| P5.3 | Probes / testes exploratórios | Verificar comportamentos inesperados | Código integrado | Achados | Ambos | Probe Report | Próxima IA + usuário | P0 | — | — | Planejado | Já é uma prática desejada e deve seguir a matriz de validação. |
| P5.4 | Testes E2E | Validar o fluxo completo | Sistema integrado | Resultado E2E | Ambos | Relatório E2E | Próxima IA + usuário | P0 | — | — | Planejado | Casos mínimos do terminal já estão definidos em `docs/07`. |

---

### Coluna 8 — GATE DE APROVAÇÃO (P5.5 – P5.6 / P4.6)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P4.6 | Gate de saída da fatia | Confirmar que a fatia pode ir para teste | Código + log | Fatia liberada | Humano | Gate de implementação | Usuário | P0 | — | — | Planejado | Critério operacional já descrito; será aplicado por fatia. |
| P5.5 | Homologação com stakeholder | Confirmar aceite funcional | Resultado E2E + critérios | Aceite ou rejeição | Humano | Termo de aceite | Usuário | P1 | — | — | Planejado | Critérios consolidados em `docs/08_CRITERIOS_DE_HOMOLOGACAO.md`. |
| P5.6 | Gate de qualidade | Decidir se a fatia avança | Todos os resultados | Fatia aprovada/rejeitada | Humano | Quality Gate | Usuário | P0 | — | — | Planejado | Nenhuma fatia deve avançar sem este gate. |

---

### Coluna 9 — CONCLUÍDO / DEPLOY (P6)

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P6.1 | Preparação de release | Empacotar versão para deploy | Fatias aprovadas | Release candidate | Ambos | Release Notes | Usuário + futura IA | P1 | — | — | Planejado | Fluxo documentado em `docs/09_PLANO_DE_DEPLOY_E_OPERACAO.md`. |
| P6.2 | Deploy | Publicar em ambiente alvo | Release candidate | Sistema em produção | Ambos | Deploy Log | Usuário + futura IA | P1 | — | — | Planejado | Ainda sem execução prática nesta fase. |
| P6.3 | Monitoramento | Acompanhar métricas, logs e erros | Sistema em produção | Métricas e alertas | Ambos | Dashboard / Alertas | Usuário + futura IA | P1 | — | — | Planejado | Operação mínima já descrita em `docs/09`. |
| P6.4 | Suporte e incidentes | Tratar problemas pós-deploy | Alertas, tickets | Correções e patches | Ambos | Incident Report | Usuário + futura IA | P2 | — | — | Planejado | Governança definida em `docs/10_GOVERNANCA_E_EVOLUCAO.md`. |
| P6.5 | Manutenção corretiva/adaptativa | Corrigir bugs e adaptar a mudanças externas | Incidentes, mudanças | Patches | Ambos | Changelog | Usuário + futura IA | P2 | — | — | Planejado | Fase posterior ao primeiro release utilizável. |
| P6.6 | Manutenção evolutiva | Adicionar novas funcionalidades | Feedback, roadmap | Novo backlog | Humano | Backlog de evolução | Usuário | P2 | — | — | Planejado | Governança de evolução documentada em `docs/10`. |
| P6.7 | Feedback para o ciclo | Alimentar descoberta e requisitos | Métricas, incidentes, uso | Insumos para P1 | Ambos | Feedback Loop Report | Usuário + futura IA | P2 | — | — | Planejado | Fecha o ciclo do SDLC após uso real. |

---

## FAIXA 3 — TRANSVERSAL

### Coluna BLOQUEADO

| Sub | Nome | O que é | Entrada | Saída | Executor | Artefato | Atribuído a | Prioridade | Pontos | Horas | Status | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BLK-01 | Escolha da primeira fatia | Card travado por dependência, dúvida ou impedimento | Backlog mestre + documentação canônica | Primeira fatia definida | Humano | Context Package inicial | Usuário | P0 | — | — | Bloqueado | O único bloqueio real agora é escolher a primeira fatia e abrir o novo chat com a IA executora. |