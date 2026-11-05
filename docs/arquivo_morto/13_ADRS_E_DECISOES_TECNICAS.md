# 13 — ADRS E DECISÕES TÉCNICAS

## Objetivo
Registrar, em formato explícito, as decisões arquiteturais já consolidadas no projeto AGENTE WINDOW para reduzir reabertura de discussão pela próxima IA ou por ciclos futuros de implementação.

---

## ADR-001 — `docs/` como fonte principal de continuidade
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O projeto possuía linhas documentais com finalidades diferentes, incluindo uma linha greenfield histórica e uma linha de continuidade do repositório real. |
| Decisão | A pasta `docs/` passa a ser a fonte da verdade principal do projeto atual. |
| Alternativas rejeitadas | Usar a linha greenfield como fonte principal foi rejeitado porque aumentaria o risco de reconstrução desnecessária e perda de aderência ao baseline já existente. |
| Consequências | Toda decisão nova deve nascer em `docs/`; materiais históricos só entram como apoio já absorvido. |
| Mitigação | `00_COMO_LER_ESTA_DOCUMENTACAO.md` e `01_FONTE_DA_VERDADE.md` registram a precedência. |

## ADR-002 — Arquitetura em 4 camadas
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O workbench precisava de modularidade real para não colapsar UI, runtime, regras de negócio e integração de SO em um único bloco. |
| Decisão | A solução adota quatro camadas canônicas: Runtime, Workbench, Lógica e Interface Visual. |
| Alternativas rejeitadas | Manter frontend e backend acoplados em componentes únicos foi rejeitado por dificultar troca de runtime, testes e manutenção. |
| Consequências | Todo módulo precisa declarar em que camada vive e por quais contratos cruza fronteiras. |
| Mitigação | `03_ARQUITETURA_EXECUTAVEL.md` e `03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md` formalizam a estrutura. |

## ADR-003 — Runtime, provider e tools plugáveis
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O produto deve sobreviver à troca futura de runtime do agente, provider de modelo e conjunto de skills/tools sem reescrever a carcaça inteira. |
| Decisão | Runtime, provider e tool layer passam a existir atrás de adapters/ports formais. |
| Alternativas rejeitadas | Integrar o provider direto na UI ou espalhar chamadas de tools por componentes foi rejeitado por criar acoplamento irreversível. |
| Consequências | A UI depende de serviços de sessão; a troca de provedor ocorre atrás do `AgentRuntimeAdapter` e do `ModelProviderAdapter`. |
| Mitigação | Contratos globais documentados em `04_CONTRATOS_TECNICOS.md`. |

## ADR-004 — Terminal real com PTY na V1
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O terminal é o subsistema piloto e precisa validar a espinha dorsal do workbench com interação real de SO. |
| Decisão | A V1 exige terminal real via PTY; mock terminal só é aceitável em fases transitórias de réplica, não na entrega-alvo. |
| Alternativas rejeitadas | Permanecer com terminal puramente visual foi rejeitado por não provar runtime, foco, lifecycle e persistência real. |
| Consequências | A camada Runtime precisa expor `TerminalRuntimePort` e a validação E2E do terminal passa a ser bloqueante. |
| Mitigação | Regras, testes e ordem do módulo Terminal foram documentados em `docs/engenharia_reversa/01_TERMINAL/`. |

## ADR-005 — Uma única instalação na raiz
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O baseline atual ainda está dividido entre frontend e `pty-server`, mas a operação desejada deve convergir para uma instalação única. |
| Decisão | O alvo arquitetural é uma única raiz com `npm install` único e contratos compartilhados. |
| Alternativas rejeitadas | Manter duas instalações independentes foi rejeitado por custo de manutenção, drift de dependências e onboarding pior. |
| Consequências | A primeira onda de implementação precisa atacar convergência estrutural e contratos compartilhados. |
| Mitigação | Onda 1 registrada em `05_BACKLOG_MESTRE.md` e árvore alvo em `03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md`. |

## ADR-006 — Contract-first antes da implementação
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | A principal fonte de alucinação da IA é começar por componentes visuais sem contrato e depois improvisar integração. |
| Decisão | Toda fatia deve nascer primeiro em contrato, fluxo e critério de aceite. |
| Alternativas rejeitadas | UI-first sem contratos foi rejeitado por gerar retrabalho, acoplamento e regressões. |
| Consequências | Cada subsistema passou a ter F/G/H/I na engenharia reversa e os contratos globais foram isolados em `04`. |
| Mitigação | `06_PLANO_DE_IMPLANTACAO_PARA_IA.md` impõe essa disciplina. |

## ADR-007 — Implementação por fatias pequenas com humano no loop
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O projeto é médio/grande e a IA não deve receber o sistema inteiro como uma tarefa única. |
| Decisão | A construção será incremental, por fatias pequenas, com parada obrigatória após validação e revisão humana. |
| Alternativas rejeitadas | Execução "de ponta a ponta" em um único chat foi rejeitada por risco de desvio, consumo de contexto e perda de controle. |
| Consequências | O backlog foi organizado em ondas; a próxima IA deve parar ao final de cada fatia. |
| Mitigação | `05_BACKLOG_MESTRE.md`, `06_PLANO_DE_IMPLANTACAO_PARA_IA.md` e `11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md`. |

## ADR-008 — Validação prioritária sem build completo a cada passo
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O usuário explicitou preferência por typecheck, testes focados, probe e E2E, sem build obrigatório em todas as etapas. |
| Decisão | A ordem padrão de validação será: typecheck, testes focados, probe, E2E; build completo só em integração ou release. |
| Alternativas rejeitadas | Rodar build completo em toda fatia foi rejeitado por custo e lentidão desnecessários em iterações pequenas. |
| Consequências | Os documentos de validação e homologação foram escritos com esse pipeline. |
| Mitigação | `07_MATRIZ_DE_VALIDACAO.md` e `08_CRITERIOS_DE_HOMOLOGACAO.md`. |

## ADR-009 — Documentação viva + Kanban sem substituir a fonte canônica
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O projeto vai atravessar múltiplos chats e possivelmente múltiplas IAs executoras. |
| Decisão | Haverá documentação viva e Kanban, mas ambos são operacionais; não substituem escopo, arquitetura nem contratos canônicos. |
| Alternativas rejeitadas | Usar somente conversa ou somente documentação viva foi rejeitado por perda de rastreabilidade e deriva arquitetural. |
| Consequências | `12_DOCUMENTACAO_VIVA.md` e `11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md` passam a acompanhar execução. |
| Mitigação | Toda mudança de direção continua exigindo atualização dos docs centrais quando impactar arquitetura/escopo/contrato. |

## ADR-010 — VS Code como referência comportamental, não como autorização para copiar acoplamentos
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-12 |
| Contexto | O projeto busca fidelidade ao VS Code, mas o objetivo não é reproduzir cegamente toda a estrutura interna do upstream. |
| Decisão | O VS Code é a referência de comportamento e de padrões, mas a implementação deve obedecer à modularidade alvo do AGENTE WINDOW. |
| Alternativas rejeitadas | Copiar diretamente acoplamentos ou estrutura física do VS Code foi rejeitado por incompatibilidade com o alvo modular do projeto. |
| Consequências | A engenharia reversa serve como evidência e não como licença para ignorar a arquitetura aprovada. |
| Mitigação | `03_ARQUITETURA_EXECUTAVEL.md`, `03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md` e pacotes F/G/H/I por módulo. |

## ADR-011 — `platform/` como container da nova arquitetura híbrida
| Campo | Valor |
|---|---|
| Status | ACEITA |
| Data | 2026-09-13 |
| Contexto | A estrutura transitória em `src/` na raiz já separava responsabilidades conceitualmente, mas ainda deixava a nova arquitetura exposta na raiz e com fronteiras físicas menos fortes do que o desejado para manutenção por múltiplas IAs. |
| Decisão | A materialização física aprovada da nova arquitetura passa a viver dentro de `platform/`, com macro-organização híbrida: `apps/`, `packages/` e `services/`. A aplicação visual principal viverá em `platform/apps/workbench/src/`; contratos, shared, runtime de agente, provider e tools viverão em `platform/packages/`; serviços operacionais como PTY viverão em `platform/services/`. |
| Alternativas rejeitadas | Deixar a nova arquitetura diretamente na raiz do repositório foi rejeitado por poluir a raiz e reduzir clareza operacional. Manter tudo em um único `platform/src/` foi rejeitado como estado final por não reforçar estruturalmente a separação entre interface, runtime/backend e camada de IA. |
| Consequências | A próxima reorganização estrutural deve convergir a árvore transitória atual para o container `platform/`. A leitura da documentação precisa distinguir claramente estado transitório atual e árvore alvo aprovada. |
| Mitigação | `03_ARQUITETURA_EXECUTAVEL.md`, `03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md` e `12_DOCUMENTACAO_VIVA.md` registram a decisão; `16_INICIAR_POR_AQUI_IA_EXECUTORA.md` deve orientar a próxima IA a não reabrir essa discussão. |
