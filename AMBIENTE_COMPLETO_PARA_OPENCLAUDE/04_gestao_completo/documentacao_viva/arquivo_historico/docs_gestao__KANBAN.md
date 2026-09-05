# MODELO DE PLANILHA DO QUADRO KANBAN

| DATA DE INÍCIO DO SPRINT | DIAS | PROGRESSO | ATUALIZADO POR |
| --- | --- | --- | --- |
| 2026-09-04 | 10 dias | 80% (8/10 sessões de Produção Real) | OpenClaude / Antigravity |

## LISTA DE PENDÊNCIAS

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recurso | Integração MCP Externa | OpenClaude | Configurar bridge para servidores de ferramentas MCP externos | Permitir extensibilidade da janela de agentes com ferramentas externas | Média | 5 | 8h | Aguardando consolidação dos módulos core |
| Conteúdo | Documentação de Arquitetura | OpenClaude | Atualizar diagramas de topologia e fluxo de dados reativos | Alinhar documentação técnica com o padrão oficial do VS Code | Baixa | 3 | 4h | Executar após fechamento da sessão 10 |
| Pesquisa | Otimização de Performance Webview | OpenClaude | Analisar overhead de renderização de múltiplos iframes | Prevenir vazamento de memória com abertura de várias abas | Média | 5 | 6h | Investigação agendada para pós-produção |
| Tarefa | Telemetria e Logs Locais | OpenClaude | Implementar coletor estruturado de eventos de sessão | Facilitar diagnóstico de erros em tempo de execução | Baixa | 3 | 4h | Planejado como item complementar para v1.1 |
| Atualizar | Dependências Vitest e Playwright | OpenClaude | Atualizar pacotes de testes para versões LTS mais recentes | Manter compatibilidade com runners modernos e CI/CD | Baixa | 2 | 2h | Agendado para a virada do sprint |
| Atualizar | Definições de Tipos Monaco e xterm | OpenClaude | Sincronizar types do monaco-editor e xterm.js | Eliminar type casts redundantes no código de integração | Média | 3 | 4h | Em refinamento na camada de referências |
| Recurso | Suporte a Temas Customizados | OpenClaude | Exportar tokens de cor para importação de temas (.json) | Paridade visual completa com temas externos do VS Code | Baixa | 5 | 6h | Planejado após validação E2E final |
| Recurso | Exportação de Histórico de Sessões | OpenClaude | Criar exportador de sessões e chats em formato JSON e Markdown | Permitir backup e compartilhamento estruturado de chats | Média | 3 | 4h | Item de conveniência no menu lateral |
| Pesquisa | Suporte a Service Worker Offline | OpenClaude | Estudar estratégia de caching offline de assets estáticos | Garantir resiliência da réplica em ambientes isolados | Baixa | 5 | 8h | Backlog de melhorias de infraestrutura |

## A FAZER

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pesquisa | Especificação do Workspace Picker | OpenClaude | Mapear suporte nativo à File System Access API | Garantir fallback transparente para navegadores sem suporte | Alta | 5 | 6h | Sessão 08 / 02_FILESYSTEM_WORKSPACE_REAL |
| Recurso | File System Access API Real | OpenClaude | Implementar showDirectoryPicker e navegação real na árvore | Substituir sistema de arquivos mockado por FS real do usuário | Alta | 8 | 12h | Sessão 08 / 02_FILESYSTEM_WORKSPACE_REAL |
| Pesquisa | Requisitos de Viewport Mobile | OpenClaude | Revisar breakpoints e gestos touch da especificação VS Code | Ajustar drawer e overlays em viewports reduzidas | Alta | 5 | 5h | Sessão 10 / 10_MOBILE_E_PRODUCAO |
| Tarefa | Layout Responsivo Mobile | OpenClaude | Implementar toggle de sidebar via swipe e bottom-bar contextual | Garantir paridade e usabilidade em telas compactas | Alta | 8 | 10h | Sessão 10 / 10_MOBILE_E_PRODUCAO |
| Tarefa | Suite Completa de 45 Testes E2E | OpenClaude | Executar e consolidar todos os 45 testes Playwright | Validação final de entrega sem regressões funcionais | Crítica | 13 | 14h | Sessão 10 / 10_MOBILE_E_PRODUCAO |
| Tarefa | Geração de 46 Screenshots de Prova | OpenClaude | Capturar screenshots de conformidade visual em test-results | Evidência documental de conformidade 92%+ com original | Alta | 5 | 6h | Sessão 10 / 10_MOBILE_E_PRODUCAO |
| Conteúdo | Relatório de Validação 3 Final | OpenClaude | Consolidar evidências, métricas de build e conformidade | Fechamento formal do ciclo de desenvolvimento | Alta | 5 | 6h | Sessão 10 / 10_MOBILE_E_PRODUCAO |
| Recurso | Build de Produção Otimizado | OpenClaude | Validar build limpo TypeScript + Vite (0 erros) | Garantir bundle performático pronto para distribuição | Crítica | 8 | 6h | Sessão 10 / 10_MOBILE_E_PRODUCAO |
| Pesquisa | Auditoria de Acessibilidade (a11y) | OpenClaude | Verificar conformidade de navegação por teclado e leitores | Aderência aos padrões WCAG e acessibilidade VS Code | Média | 3 | 4h | Sessão 10 / 10_MOBILE_E_PRODUCAO |

## EM ANDAMENTO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pesquisa | Comportamento de Foco no Terminal | OpenClaude | Investigar sincronização do cursor xterm com active session | Evitar perda de input ao alternar abas e panes | Alta | 5 | 6h | Sessão 07 / 07_TERMINAL_REAL |
| Recurso | Terminal Real xterm.js & Shell PTY | OpenClaude | Integrar xterm com backend de execução e suporte a input real | Substituir terminal mockado por terminal funcional | Alta | 8 | 12h | Sessão 07 / 07_TERMINAL_REAL |
| Pesquisa | Topologia Multi-Pane e Custom Views | OpenClaude | Analisar regras de docking, split ratios e persistência | Garantir grid bidirecional consistente | Alta | 5 | 5h | Sessão 08 / 08_CUSTOM_VIEW_GRID |
| Tarefa | Grid de Custom Views com Multi-Split | OpenClaude | Criar gerenciador de multi-split com resize dinâmico | Permitir até 4 panes simultâneos na janela principal | Alta | 8 | 10h | Sessão 08 / 08_CUSTOM_VIEW_GRID |
| Tarefa | Context Menu Completo & Shortcuts | OpenClaude | Conectar menus de contexto com atalhos F2, Delete, Space, Enter | Acessibilidade completa e comandos rápidos na sidebar | Alta | 5 | 6h | Sessão 09 / 09_MENU_CONTEXTO_DRAG_DROP_TECLADO |
| Tarefa | Roving Index & Drag Reorder | OpenClaude | Garantir que canReorderSessions bloqueia sessões arquivadas | Paridade estrita com comportamento de drag do original | Alta | 5 | 5h | Sessão 09 / 09_MENU_CONTEXTO_DRAG_DROP_TECLADO |
| Conteúdo | Atualização de 04_PROGRESSO e 05_PROGRESSO | OpenClaude | Registrar evidências de transição de mock para código real | Manter rastreabilidade contínua do desenvolvimento | Média | 3 | 3h | Documentação contínua em docs/gestao/ |
| Recurso | Regras de Fechamento Transiente | OpenClaude | Refinar descarte automático de abas transientes ao navegar | Conformidade estrita com a regra R-070 | Alta | 5 | 6h | Sessão 06 / 06_SINGLE_PANE_TRANSIENTE |
| Pesquisa | Resiliência do LocalStorage State | OpenClaude | Testar limites de quota e migração de schema de sessão | Prevenir corrupção de estado ao reiniciar aplicação | Média | 3 | 4h | Refinamento contínuo de persistência |

## TESTE/VERIFICAÇÃO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pesquisa | Análise de Cobertura E2E Sessões 04 e 05 | OpenClaude | Auditar assertions Playwright contra specs originais | Garantir ausência de falsos positivos nos testes | Alta | 5 | 4h | Em verificação nos suites E2E |
| Recurso | Agrupamento Hoje/Fixadas/Workspaces | OpenClaude | Validar execução de Playwright sessao_02_sessions_list | Comprovar capping 3 e 3 chats aninhados por sessão | Alta | 8 | 6h | 5/5 testes E2E aprovados |
| Pesquisa | Layout Sync e Docked Controller | OpenClaude | Testar sincronização bidirecional de abas e panes | Validar CannotClose em abas gerenciadas pelo controller | Alta | 5 | 5h | Em validação com layout reativo |
| Tarefa | Typecheck Rigoroso (0 Erros) | OpenClaude | Executar `npm run typecheck` em todo o workspace | Garantir integridade de tipagem estrita no TypeScript | Crítica | 5 | 3h | 0 erros verificados no projeto |
| Tarefa | Execução de Testes Unitários Vitest | OpenClaude | Rodar suite unitária de 348 testes no Vitest | Prevenir regressões nas funções de domínio e lógica | Alta | 8 | 4h | 348/348 testes passando |
| Tarefa | Captura de Screenshots E2E | OpenClaude | Gravar evidências em test-results/ para sessões 04 e 05 | Provar agrupamento e topologia reais em execução | Alta | 5 | 4h | Screenshots gerados |
| Conteúdo | Auditoria de Critérios de Aceite Sessão 04 | OpenClaude | Confrontar implementação de SessionSidebar.tsx com spec | Confirmar remoção de filtros fake e uso da spec oficial | Alta | 3 | 3h | Concluído com êxito |
| Recurso | Persistência de newSessionViewState | OpenClaude | Validar isolamento de layout para sessões não-criadas | Evitar vazamento de estado inicial entre novas abas | Alta | 5 | 4h | Validado via testes automatizados |
| Pesquisa | Performance de Renderização da Sidebar | OpenClaude | Medir FPS durante reorder e expansão de chats aninhados | Assegurar fluidez de interface a 60 FPS | Média | 3 | 3h | Sem travamentos ou janks detectados |

## CONCLUÍDO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pesquisa | Auditoria Estática de Paridade (Validação 1) | OpenClaude | Comparar código original vs réplica linha a linha | Mapeamento completo de gaps e requisitos funcionais | Crítica | 13 | 16h | Checklist 100% mapeado em docs |
| Recurso | Implementação das 32 Ondas de Manutenção | OpenClaude | Desenvolver componentes core, CSS e lifecycles | Construir base funcional e arquitetural da aplicação | Crítica | 21 | 40h | 32/32 ondas concluídas e integradas |
| Pesquisa | Resolução de Bugs de Runtime Críticos | OpenClaude | Diagnosticar e corrigir tela preta e blank screens | Estabilizar ciclo de vida de componentes React | Alta | 8 | 12h | 5 bugs críticos de runtime sanados |
| Tarefa | Implementação de Sessions Core (Sessão 01) | OpenClaude | Criar persistência, ciclo de vida e estado de sessões | Gestão completa de ciclo de vida de chats e sessões | Alta | 8 | 10h | E2E 5/5 validado |
| Tarefa | Sessions List & Agrupamento Real (Sessão 04) | OpenClaude | Implementar buildSessionsList, 3 chats, capping 3 | Paridade estrita com agrupamento original do VS Code | Alta | 8 | 12h | E2E 5/5 validado |
| Tarefa | Topologia de Layout & Single Pane (Sessão 05) | OpenClaude | Implementar autorun, docked controller e layout sync | Controle preciso de topologia de panes e abas | Alta | 13 | 16h | E2E 5/5 validado |
| Conteúdo | Documentação de Gestão e Contexto Geral | OpenClaude | Criar CONTEXTO_GERAL.md, STATUS_ATUAL.md e KANBAN.md | Visibilidade executiva e técnica clara do projeto | Alta | 5 | 6h | Estrutura consolidada em docs/gestao |
| Recurso | Browser Real Integrado (Sessão 01/07) | OpenClaude | Implementar webview contextual com navegação | Execução de preview web interativo no app | Alta | 13 | 14h | E2E 5/5 validado |
| Pesquisa | Layout Controller & Memória de Sessão (Sessão 03) | OpenClaude | Criar capture/restore de layout por ID de sessão | Restaurar layout exato ao alternar abas de chat | Alta | 8 | 10h | E2E 5/5 validado |