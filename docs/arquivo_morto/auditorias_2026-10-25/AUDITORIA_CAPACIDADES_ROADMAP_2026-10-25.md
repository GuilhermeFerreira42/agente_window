# Auditoria documental — Agente Window — 25/10/2026

## Escopo e limites
Análise em leitura do workspace `workspace-01a16f87-af77-7ed7-b396-842391374c3a.zip`, sobretudo `docs/01`–`docs/09` e `docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/fatias/M1–M8`. Esta auditoria verifica **cobertura documental**, não funcionalidade em execução; não foram alterados arquivos do projeto nem realizadas homologações. M5–M8 são propostas históricas e seus números hipotéticos 17–20 **não são** as Fatias numéricas 17–20.

## Conclusão
**Visão consistente, plano completo ainda não.** As 20 CAP estão definidas em `02 §1.3`, os 5 cenários em `02 §1.4`, D100 e D101 em `05`, metodologia comparativa em `09 §3.10`. O `06` apresenta Fatias 13–20 e iniciativas M1–M4, mas **não possui matriz CAP → entregáveis → fatia/iniciativa → dependência → SPEC → teste → aceite**. Capacidades como busca externa, planejamento, Git do agente, plugins/MCP completo, memória persistente e retomada operacional não possuem fatia numérica autorizada nem SPEC fechada. M5–M8 existem em `arquivo_morto` apenas como propostas não aprovadas.

## Matriz de rastreabilidade preliminar (inferência, não decisão aprovada)
| CAP | Capacidade | Cobertura documental identificada | Lacuna relevante |
|---|---|---|---|
| 01 | Projetos grandes | D98; Explorer/Search existentes | Rastrear investigação arquitetural do agente, escala e aceite CAP |
| 02 | Compreensão arquitetural | Agir + arquivos | Sem SPEC/cenários dedicados de raciocínio arquitetural |
| 03 | Documentação técnica | Agir + arquivos | Sem critérios de produção e revisão de docs |
| 04 | Arquivos completos | 10, 12; DEBT-19 | Mover/renomear e criação sem sobrescrita: contratos pendentes; UI ≠ tools |
| 05 | Terminal | 13 agente; 16 visual | Segurança/DEBT-23 depende de decisão |
| 06 | Git/versionamento | SCM, DEBT-18, 19 worktree | Agent tools Git (status/diff/stage/commit) sem SPEC e fatia fechada |
| 07 | Pesquisa externa | Browser visual 20, DEBT-20 | Pesquisa web por ferramenta do agente não foi coberta |
| 08 | Memória persistente | M5 histórica | Não oficial; SPEC e aprovação pendentes |
| 09 | Contexto inteligente | M1 + M2 + M3 | SPECs oficiais e validação em provider ainda faltam |
| 10 | Recuperação informações | M4 manual; M6 histórica | Recuperação autônoma e cross-chat ainda sem decisão |
| 11 | Planejamento | CAP apenas, Agir básico | Planner estruturado não tem fatia/SPEC |
| 12 | Autonomia controlada | 10–13 | Critérios end-to-end e retomada segura pendentes |
| 13 | Segurança/permissões | 10–13, D93, DEBT-23 | Symlinks/overwrite/atomicidade, YOLO e escopo aguardam SPEC/decisão |
| 14 | Provedores/modelos | 08–11 | Cobertura por provider/tool calling e limites verificados por matriz de compatibilidade |
| 15 | Skills/plugins/extensão | 14 skills v1 | Plugins, MCP, hooks e skills automáticas fora da SPEC 2H |
| 16 | Retomada interrompida | Continuar da 11; M7 histórica | F5/continuação ≠ reconstrução após restart; sem SPEC oficial |
| 17 | Interface integrada | 15–20 | Homologação global e comparativos por cenário ainda futuros |
| 18 | Diagnóstico/observabilidade | Central futura D99 | Sem fatia/SPEC própria |
| 19 | Testes e verificação | 13 execução comandos; 09 metodologia | Seleção inteligente, evidências por tool e auditabilidade sem SPEC específica |
| 20 | Ciclo completo | Composição de CAPs | Aceite final exige integração de capacidades acima ainda sem dono |

## Cobertura de planejamento futuro
- **13:** terminal-agente; DEBT-23 decisão própria, não incluída automaticamente em 2G.
- **14:** Personalizações/Sessões/Skills v1; **não** MCP/Plugins completos.
- **15:** abas/editor unificado; **não** SCM rico/Explorer ops/Browser real (DEBT-18/19/20).
- **16–20:** terminal visual, Command Center, painéis, worktree, polimento/navegador — nenhuma delas equivale a um plano completo das CAP-01–CAP-20.
- **M1–M4:** aprovadas **para planejar**, não implementar. Dependências M3←M1+M2; M4←M2.
- **M5–M8:** `arquivo_morto/estudo_memoria_contexto_2026-10-22/fatias/` contém rascunhos (memória de projeto; recuperação pelo agente; reconstrução operacional; hardening/homologação). **Não aprovadas nem numeradas oficialmente**. A menção nos canônicos não transfere autoridade a esses rascunhos.

## Inconsistências e pontos de atenção
1. `03` e `09` ainda registram D98 como não iniciado e sem traces/benchmarks, mas há relatório preliminar externo `D98_RELATORIO_PRELIMINAR.md` produzido posteriormente. Integrar **somente** como resultado preliminar não homologado, com ambiente/metodologia verificáveis; não declarar gate encerrado.
2. A meta de fidelidade visual/funcional de 90% à Agents Window VS Code 1.135 (D66/D71) e a D101 de paridade por cenário devem coexistir; **90%** não pode ser tratado automaticamente como métrica medida ou como comprovação das 20 CAP.
3. A linha histórica D30 sobre OpenClaude não é autorização para código de origem incerta; `04 §1.2/1.5` já introduz ressalva adequada.
4. Faltam responsáveis e destino formal para DEBT-18, DEBT-19, DEBT-20, segurança das file tools, pesquisa externa do agente, planner, Git agent, plugins/MCP completos, memória, recuperação autônoma, continuidade após restart e diagnósticos.
5. O escopo dos cinco cenários finais é descritivo, sem bateria E2E transversal CAP↔cenário↔evidência.

## Ação documental recomendada, sem alteração de escopo por inferência
1. Criar **dentro do `06`** uma matriz de rastreabilidade CAP-01–20 com cobertura atual, fase candidata (marcada como proposta), artefato exigido e lacuna de aprovação; referenciar nos `02`, `08` e `09`, sem novo 10º canônico.
2. Abrir decisão explícita sobre **se e quando formalizar M5–M8** e sobre o destino das CAP não cobertas; não renumerar unilateralmente as Fatias 16–20.
3. Delimitar o que fica fora da Fatia 14 (plugins/MCP) e da Fatia 20 (browser visual ≠ web tool), com capacidade funcional própria.
4. Definir matriz de cenários CAP↔critérios↔teste em `08/09`; benchmarks D101 continuam exigindo medições e comparação honesta.
5. Após alinhamento e aprovação documental, atualizar `03/07` com o estado real de D98 e preservar o gate antes de produção.

**Parecer:** apto para planejamento documental, **não apto a afirmar que existe um plano de entrega completo para as 20 CAP**. Não iniciar implementação das lacunas sem decisões/SPECs.
