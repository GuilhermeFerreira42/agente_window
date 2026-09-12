# 05 — BACKLOG MESTRE

## Objetivo
Ordenar a construção do AGENTE WINDOW em ondas executáveis, preservando a modularidade e impedindo que a próxima IA tente implementar tudo de uma vez.

## Regra de uso
- cada onda só começa quando a anterior estiver validada;
- cada onda deve terminar com evidência objetiva de teste;
- durante desenvolvimento, priorizar typecheck, testes focados, probes e E2E;
- build completo entra apenas em marcos de integração ou release.

## Ondas de execução

| Onda | Objetivo | Dependências | Entregas mínimas | Validação de saída |
|---|---|---|---|---|
| 0 | fechar documentação canônica | engenharia reversa pronta | docs 00-10 aprovados | revisão documental completa |
| 1 | convergir a estrutura física para raiz única e contratos compartilhados | onda 0 | raiz única de instalação, pastas de contratos, bootstrap compartilhado | typecheck dos contratos e boot do app |
| 2 | estabilizar Workbench Shell | onda 1 | layout base, partes, resize, persistência de layout, command registry básico | E2E de toggles, resize, maximize/restore |
| 3 | entregar Terminal piloto real | onda 2 | PTY real, tabs, split, focus, clear, persistência por sessão | probe real + E2E do terminal |
| 4 | entregar Explorer + Filesystem | ondas 1 e 2 | árvore, open file, lazy load, watcher, operações básicas | testes de integração de I/O + E2E de navegação |
| 5 | entregar Chat + Runtime de agente | ondas 1, 2 e 3 | sessões, streaming, tool gate, snapshots, artefatos | E2E do fluxo de conversa + aprovação de tool |
| 6 | integrar Editor / Browser / Search / Changes | ondas 2 e 4 | abas, grupos, split central, views auxiliares e integração com explorer/chat | E2E de abertura de abas e navegação cruzada |
| 7 | consolidar Command Menu + Theme | ondas 2, 4, 5 e 6 | palette, context keys, tokens de tema e coerência visual | testes de comandos e regressão visual funcional |
| 8 | hardening transversal | ondas 3 a 7 | correções de fidelidade, performance, reconexão, persistência e bordas | matriz de validação global sem blockers |
| 9 | release e operação | onda 8 | build de release, deploy, smoke test, observabilidade, rollback | homologação e smoke test pós-deploy |

## Backlog priorizado por épico

### Épico A — Fundação documental e estrutural
1. Consolidar `docs/` como fonte principal.
2. Encerrar dependência operacional de `docs-1/`.
3. Definir contratos compartilhados e formato de snapshot.
4. Planejar migração para instalação única na raiz.

### Épico B — Shell do Workbench
1. Layout root.
2. Resize e persistência.
3. Registros de partes/views.
4. Command registry e context keys mínimos.

### Épico C — Terminal
1. Bridge PTY.
2. Lifecycle de instâncias.
3. Split e focus.
4. Clear / maximize / restore / close.
5. Persistência coerente por sessão.

### Épico D — Explorer + Filesystem
1. RPC/bridge de I/O.
2. árvore lazy.
3. watcher.
4. open/reveal.
5. operações de arquivo seguras.

### Épico E — Chat e Agente
1. runtime adapter.
2. session orchestration.
3. streaming.
4. tool approval gate.
5. snapshots/restore.

### Épico F — Editor e Views centrais
1. abas e grupos.
2. browser/search/changes.
3. integração com explorer e chat.
4. sincronização de contexto.

### Épico G — Tema e comandos
1. palette.
2. menus contextuais.
3. tokens CSS e temas.
4. coerência visual intermodular.

### Épico H — Release
1. build de integração.
2. testes finais.
3. deploy.
4. operação e feedback loop.

## Critério de pronto por fatia
Uma fatia só avança quando tiver:
- objetivo explícito;
- arquivos-alvo definidos;
- contrato associado;
- critério de aceite objetivo;
- validação executada;
- relato final no chat com concluído/restante/percentuais.

## O que a próxima IA não deve fazer
- pular da onda 0 para a 3 sem concluir fundação;
- misturar refatoração estrutural e feature nova na mesma fatia sem necessidade;
- tentar implementar múltiplos épicos grandes no mesmo turno;
- usar `docs-1/` como autoridade principal depois desta consolidação.
