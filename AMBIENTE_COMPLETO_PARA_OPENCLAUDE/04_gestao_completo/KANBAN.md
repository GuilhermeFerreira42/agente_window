# MODELO DE PLANILHA DO QUADRO KANBAN

| DATA DE INÍCIO DO SPRINT | DIAS | PROGRESSO | ATUALIZADO POR |
| --- | --- | --- | --- |
| 2026-09-04 | 12 dias | 100% — 10/10 módulos Val.3 · 370 unit + 62 E2E verdes · Build de produção 100% verde | OpenClaude / Antigravity |

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
| Pesquisa | Auditoria de Acessibilidade (a11y) | OpenClaude | Auditoria completa de teclado/leitor de tela com ferramenta dedicada | Aderência aos padrões WCAG e acessibilidade VS Code | Média | 3 | 4h | Parcial: nome acessível das linhas e alvos de 44px corrigidos |

## EM ANDAMENTO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pesquisa | Resiliência do LocalStorage State | OpenClaude | Testar limites de quota e migração de schema de sessão | Prevenir corrupção de estado ao reiniciar aplicação | Média | 3 | 4h | Refinamento contínuo de persistência |

## TESTE/VERIFICAÇÃO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Conteúdo | Auditoria de Critérios de Aceite Sessão 04 | OpenClaude | Confrontar implementação de SessionSidebar.tsx com spec | Confirmar remoção de filtros fake e uso da spec oficial | Alta | 3 | 3h | Concluído com êxito |
| Pesquisa | Performance de Renderização da Sidebar | OpenClaude | Medir FPS durante reorder e expansão de chats aninhados | Assegurar fluidez de interface a 60 FPS | Média | 3 | 3h | Sem travamentos ou janks detectados |

## CONCLUÍDO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Recurso | Build de Produção Otimizado (Resolução OOM) | OpenClaude / Antigravity | Configurar code-splitting com `manualChunks` no `vite.config.ts` | Eliminar pico de memória do V8 isolando `@xterm/xterm` e `monaco-editor` em chunks dedicados | Crítica | 8 | 2h | `npm run build` passa com exit code 0 em ~1min! Ver GATES_EXECUCAO.md §4 |
| Tarefa | Layout Responsivo Mobile (gesto de swipe) | OpenClaude / Antigravity | Implementar detecção de swipe touch (`onTouchStart`/`onTouchEnd`) no layout | Permitir abrir a sidebar deslizando da borda esquerda e fechar deslizando para esquerda | Alta | 5 | 3h | Entregue em `App.tsx` com tolerância de threshold e limites de viewport |
| Pesquisa | Comportamento de Foco no Terminal | OpenClaude / Antigravity | Auto-foco do cursor xterm na alternância de abas/visibilidade e blur com `Escape` | Garantir usabilidade consistente sem perda de input ao navegar | Alta | 5 | 2h | Implementado em `TerminalPanel.tsx` com `term.focus()` no lifecycle e keydown Escape |
| Conteúdo | Consolidação da Documentação Viva | OpenClaude | Mesclar os relatórios soltos nos 5 documentos vivos e arquivá-los em documentacao_viva/arquivo_historico/ | Relatórios fora da documentação viva nunca voltavam e geraram divergência real de status | Crítica | 8 | 5h | 11 arquivos arquivados; 3 KANBANs concorrentes reduzidos a 1 |
| Tarefa | Reexecução Auditada dos Gates | OpenClaude | Rodar typecheck, test, playwright e build do zero e registrar a saída bruta | Nenhum número de documento vivo pode vir de relatório antigo | Crítica | 5 | 2h | GATES_EXECUCAO.md: 0 / 368 / 56 / exit 134 (OOM) |
| Recurso | Regra de Governança Documental no CLAUDE.md | OpenClaude | Proibir relatório solto e tornar o ARCHIVING_PROTOCOL obrigatório ao fim de qualquer tarefa | Impedir que a fonte dupla de verdade volte a se formar | Alta | 3 | 2h | Invariante nº 8 do CLAUDE.md |
| Recurso | Grid Não-Proporcional (Sessions Part flexível) | OpenClaude | Reconverter o split em % a cada resize para o Editor preservar pixels e o chat absorver o delta | LAYOUT.md: Sidebar/Editor/Aux preservam tamanho; Sessions Part é a superfície flexível | Alta | 5 | 4h | E2E sessao_05 T6: editor Δ≤12px e chat absorve 231 de 240px |
| Pesquisa | Especificação do Workspace Picker | OpenClaude | Mapear suporte nativo à File System Access API e definir fallback | Garantir fallback transparente para navegadores sem suporte | Alta | 5 | 6h | `isFileSystemAccessSupported()` + mensagem honesta; E2E sessao_08 T1 |
| Recurso | File System Access API Real | OpenClaude | Implementar showDirectoryPicker, árvore real e persistência do handle | Substituir sistema de arquivos mockado por FS real do usuário | Alta | 8 | 12h | E2E sessao_08 T3/T4 instrumenta a chamada nativa |
| Pesquisa | Requisitos de Viewport Mobile | OpenClaude | Revisar breakpoints e o gate por toque (`pointer:coarse` + maxTouchPoints) | Ajustar drawer e overlays em viewports reduzidas | Alta | 5 | 5h | E2E sessao_06: com toque entra em single-pane, sem toque não |
| Tarefa | Suite Completa de Testes E2E | OpenClaude | Executar e consolidar a suíte Playwright inteira com asserções reais | Validação final de entrega sem regressões funcionais | Crítica | 13 | 14h | 56/56 em 5,4 min (11 specs, 197 expects) |
| Tarefa | Geração de Screenshots de Prova | OpenClaude | Capturar screenshots de conformidade visual em test-results | Evidência documental de conformidade com o original | Alta | 5 | 6h | 58 PNGs na execução de 2026-09-05 |
| Conteúdo | Relatório de Validação 3 Final | OpenClaude | Consolidar evidências, métricas e gaps remanescentes em relatório | Fechamento formal do ciclo de desenvolvimento | Alta | 5 | 6h | RELATORIO_FASE_06 + RELATORIO_FASE_07 entregues |
| Tarefa | Context Menu Completo & Shortcuts | OpenClaude | Conectar menus de contexto com atalhos F2, Delete, Space, Enter | Acessibilidade completa e comandos rápidos na sidebar | Alta | 5 | 6h | E2E sessao_09 T1/T2/T3 provam rename e delete reais |
| Tarefa | Roving Index & Drag Reorder | OpenClaude | Garantir foco por setas e bloqueio de reorder em arquivadas | Paridade estrita com comportamento de drag do original | Alta | 5 | 5h | E2E sessao_09 T4/T5 + unitários de dragAndDrop |
| Recurso | Regras de Fechamento Transiente | OpenClaude | Refinar descarte automático de abas transientes ao navegar | Conformidade estrita com a regra R-070 | Alta | 5 | 6h | E2E sessao_05 T2 (browser esconde e devolve o detail) |
| Conteúdo | Atualização da Documentação Viva | OpenClaude | Registrar evidências de transição de mock para código real | Manter rastreabilidade contínua do desenvolvimento | Média | 3 | 3h | CURRENT_STATE, DECISION_LOG, PHASE_SUMMARY e BACKLOG com números reais |
| Recurso | Agrupamento Hoje/Fixadas/Workspaces | OpenClaude | Validar via Playwright o agrupamento, o capping 3 e os chats aninhados | Comprovar capping 3 e chats aninhados por sessão | Alta | 8 | 6h | sessao_02 reescrita: 5/5 com asserts reais (antes tinha 0) |
| Pesquisa | Layout Sync e Docked Controller | OpenClaude | Testar sincronização bidirecional de abas e panes | Validar CannotClose em abas gerenciadas pelo controller | Alta | 5 | 5h | E2E sessao_05 T3 + unitários dockedAuxiliaryController |
| Tarefa | Captura de Screenshots E2E | OpenClaude | Gravar evidências em test-results/ em toda a suíte | Provar agrupamento e topologia reais em execução | Alta | 5 | 4h | 58 PNGs na execução de 2026-09-05 |
| Recurso | Persistência de newSessionViewState | OpenClaude | Validar isolamento de layout para sessões não-criadas | Evitar vazamento de estado inicial entre novas abas | Alta | 5 | 4h | E2E validacao3 T4 ([00:33] com browser transiente) |
| Pesquisa | Topologia de Custom Views (ICustomViewService) | OpenClaude | Criar `src/domain/customView.ts` com desired vs effective visibility, dismiss e persistência | O original retém a visibilidade desejada separada da efetiva para restaurar as parts | Alta | 5 | 5h | 15/15 testes unitários; Sessão 08 / 08_CUSTOM_VIEW_GRID |
| Tarefa | Custom View Grid full-surface (AI Customizations) | OpenClaude | Tornar AI Customizations uma superfície full-surface que cobre Sessions Part, Editor, Aux e Panel | Antes era só mais uma aba do editor: `.custom-view-grid` existia apenas no CSS | Alta | 8 | 10h | E2E 6/6 (inclui dismiss por sessão, F5 e back no phone) |
| Pesquisa | Auditoria Anti-Trapaça da Suíte E2E | OpenClaude | Auditar os 48 testes Playwright contra o DOM real da aplicação | 10 testes não tinham nenhum `expect` e passariam com a tela em branco | Crítica | 5 | 4h | Auditoria fechada: 34 asserts → 160 asserts |
| Tarefa | Typecheck Rigoroso (0 Erros) | OpenClaude | Trocar `tsc --noEmit` (no-op) por `tsc -b --force` em `npm run typecheck` | O gate antigo não checava nada: `tsconfig.json` da raiz tem `"files": []` | Crítica | 5 | 3h | 0 erros com o gate real; revelou `onToggleFolder` inexistente |

| Recurso | Terminal Real xterm.js & Shell PTY (Sessão 11) | OpenClaude | Integrar xterm ao PTY real (node-pty + WebSocket) e validar montagem sem crash | Substituir terminal mockado por terminal funcional (PID real, split, troca de shell, erro honesto) | Alta | 8 | 15h | Sessão 11 CONCLUÍDO (2026-09-05): E2E 5/5 verde; crash `.platform` NÃO se reproduziu — era ambiente (node_modules/pty-server/libs Chromium). `e2e/sessao_11_terminal_pty_real.spec.ts` 5/5 + spec de diagnóstico verde, 0 erros. Ver GATES_EXECUCAO.md §2 |
| Tarefa | Execução de Testes Unitários Vitest | OpenClaude | Rodar a suíte unitária completa no Vitest | Prevenir regressões nas funções de domínio e lógica | Alta | 8 | 4h | 368/368 em 43 arquivos (execução 2026-09-05, ver GATES_EXECUCAO.md) |
| Recurso | Reescrita dos 49 Testes E2E com Asserções Reais | OpenClaude | Reescrever as 10 specs com asserts de estado, geometria (`boundingBox`), `localStorage` e erros de console | Teste sem assert mascarou bugs visíveis no vídeo do usuário | Crítica | 13 | 10h | 49/49 passando em 4,6 min; 51 screenshots em test-results/ |
| Tarefa | Trava Permanente Anti-Trapaça | OpenClaude | Criar `e2eAssertionContract.test.ts` que reprova spec sem `expect`, porta hardcoded ou `console.log` | Impedir que a régua afrouxe de novo em sessões futuras | Alta | 5 | 3h | 5/5 no Vitest; roda junto com `npm run test` |
| Tarefa | Cenário do Vídeo [00:33] com Browser Transiente | OpenClaude | Criar teste que cria chat novo com a aba Browser ativa e confere que a aux transiente não vira preferência | Buraco nº 2 apontado pelo pacote VALIDACAO_3_SESSAO_05_TOPOLOGIA | Crítica | 5 | 4h | Passa: o estado transiente não contamina a preferência do usuário |
| Recurso | Correção de 6 Bugs Reais Achados pela Régua | OpenClaude | Corrigir workers do Monaco, DiffEditor, `onToggleFolder`, gate de tipos, a11y da linha de sessão e alvo de toque de 44px | Bugs que a suíte antiga não conseguia detectar | Crítica | 8 | 8h | 98 erros de runtime do console zerados |
| Tarefa | Lint Zerado no Projeto | OpenClaude | Eliminar os 12 erros de ESLint (tipos `any`, código morto, catches vazios) | Manter o lint utilizável como sinal de qualidade | Média | 3 | 3h | 0 erros / 2 warnings (exhaustive-deps intencionais) |
| Pesquisa | Auditoria Estática de Paridade (Validação 1) | OpenClaude | Comparar código original vs réplica linha a linha | Mapeamento completo de gaps e requisitos funcionais | Crítica | 13 | 16h | Checklist 100% mapeado em docs |
| Recurso | Implementação das 32 Ondas de Manutenção | OpenClaude | Desenvolver componentes core, CSS e lifecycles | Construir base funcional e arquitetural da aplicação | Crítica | 21 | 40h | 32/32 ondas concluídas e integradas |
| Pesquisa | Resolução de Bugs de Runtime Críticos | OpenClaude | Diagnosticar e corrigir tela preta e blank screens | Estabilizar ciclo de vida de componentes React | Alta | 8 | 12h | 5 bugs críticos de runtime sanados |
| Tarefa | Implementação de Sessions Core (Sessão 01) | OpenClaude | Criar persistência, ciclo de vida e estado de sessões | Gestão completa de ciclo de vida de chats e sessões | Alta | 8 | 10h | E2E 5/5 validado |
| Tarefa | Sessions List & Agrupamento Real (Sessão 04) | OpenClaude | Implementar buildSessionsList, 3 chats, capping 3 | Paridade estrita com agrupamento original do VS Code | Alta | 8 | 12h | E2E 5/5 validado |
| Tarefa | Topologia de Layout & Single Pane (Sessão 05) | OpenClaude | Implementar autorun, docked controller e layout sync | Controle preciso de topologia de panes e abas | Alta | 13 | 16h | E2E 5/5 validado |
| Conteúdo | Documentação de Gestão e Contexto Geral | OpenClaude | Criar CONTEXTO_GERAL.md, STATUS_ATUAL.md e KANBAN.md | Visibilidade executiva e técnica clara do projeto | Alta | 5 | 6h | Estrutura consolidada em 04_gestao |
| Recurso | Browser Real Integrado (Sessão 01/07) | OpenClaude | Implementar webview contextual com navegação | Execução de preview web interativo no app | Alta | 13 | 14h | E2E 5/5 validado |
| Pesquisa | Layout Controller & Memória de Sessão (Sessão 03) | OpenClaude | Criar capture/restore de layout por ID de sessão | Restaurar layout exato ao alternar abas de chat | Alta | 8 | 10h | E2E 5/5 validado |
