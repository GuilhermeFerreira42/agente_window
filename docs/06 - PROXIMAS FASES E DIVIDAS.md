# 06 - PROXIMAS FASES E DIVIDAS — Roadmap & Matriz de Dívidas

> **Documento Canônico de Planejamento e Débito Técnico (Padrão Spec-Driven / Stream Coding).**
> - **Regra de ouro:** Todo débito técnico e todo o roadmap do projeto vivem estritamente aqui (não criar arquivos separados como `TECHNICAL_DEBT.md` ou `ROADMAP.md`).
> - **Princípio de bloqueio:** Nenhuma fatia nova é iniciada enquanto existirem dívidas bloqueantes da fatia anterior.
> - **Régua de medição:** 90 % do produto é réplica fiel do **VS Code / Code Server original (porta 8080)**; 10 % é customizado (chassi direito com terminal + tela de Provedores estilo **Cline**).
> - **Atualizado:** 2026-10-12 — análise do vídeo do usuário (`Gravar_2026_10_11_20_00_45_554.mp4`, 4min02s, método em `docs/09 §11`): aberta a **DEBT-11** e listados os itens ainda **não fatiados** (seção logo abaixo da tabela).

---

# PARTE 1 — Matriz Canônica de Dívidas Técnicas (Fatias 3, 4, 5 e 6)

| ID | Fatia | Onde está | Como é no original (visto no vídeo) | Como está no meu | Severidade | Arquivo(s) provável(is) |
|---|---|---|---|---|---|---|
| **DEBT-01** | Fatia 3 | Terminal | Executar `clear` ou `cls` limpa o viewport do xterm sem deixar resquício ou fantasmas de texto no topo. | O texto antigo não limpa direito; sobram resíduos visuais e artefatos no topo do viewport. | **Alta** | `TerminalPanel.tsx`, `singlePort.ts` |
| **DEBT-02** | Fatia 3 | Terminal / Layout | Terminal é desacoplado e pode ser arrastado/movido para painel inferior ou lateral com transição fluida e grid intacto. | Drag & drop não é modular: arrastar quebra o grid ou cria uma sessão empilhada no topo da interface. | **Alta** | `shell/layoutController.ts`, `shell/dnd/`, `TerminalPanel.tsx` |
| **DEBT-03** | Fatia 3 | Terminal / Layout | Existe a barra/painel inferior padrão do VS Code (Terminal, Output, Debug, Ports). | Painel inferior ausente; o terminal ficou restrito apenas à barra lateral direita. | **Média** | `shell/SideBar.tsx`, `shell/index.ts` |
| **DEBT-04** | Fatia 4 / 6 | Editor / Visualizador | Todas as superfícies auxiliares (inclusive Provedores e Configurações) abrem no **visualizador novo** (Monaco/Webview moderno). | A aba de Provedores ainda abre no **visualizador legado**. Componentes antigos de visualizador não foram expurgados. | **Alta** | `AuxiliaryBar.tsx`, `EditorArea.tsx`, `components/legacy/` |
| **DEBT-05** | Fatia 6 | Workspace / Dialog | No Windows, clicar em "Open Folder" abre o diálogo nativo Explorer (`IFileOpenDialog`) de seleção de pastas. | Foi criado um seletor customizado/incompleto; no Linux falta fallback que liste direto as pastas de forma integrada. | **Alta** | `WorkspaceSwitcher.tsx`, `server/api/fs` |
| **DEBT-06** | Fatia 6 | Workspace / Sincronização | Ao selecionar "Usar esta pasta", a atualização é **atômica e imediata**: o Explorer carrega a árvore e o Terminal dá `cd` na hora. | **Não é atômico:** só atualiza após mandar mensagem ("oi") no chat. Se trocar de pasta, fica dessincronizado. | **Crítica** | `App.tsx`, `useWorkspace.ts`, `pty-server` (`/api/pty/cwd`) |
| **DEBT-07** | Fatia 6 | Workspace / Recentes | Ao abrir o seletor de pasta, exibe a lista histórica de pastas recentes abertas para troca rápida em 1 clique. | Não exibe pastas recentes; não há histórico de workspaces acessível no diálogo para seleção imediata. | **Média** | `WorkspaceSwitcher.tsx`, `workspacePersistence.ts` |
| **DEBT-08** | Fatia 5 | Layout / Activity Bar | Menu de contexto da Activity Bar permite alternar posição ("Activity Bar Position: Top / Side"). | Posição travada sem opção de mover para a barra superior ou alternar. | **Baixa** | `shell/ActivityBar.tsx`, `layoutState.ts` |
| **DEBT-09** | Fatia 6 | Provedores (Cline UX) | Página de Provedores acessível a qualquer momento pelo menu da conta, inclusive com chat vazio (Landing / Empty State). | **Só abre se o chat estiver ativo**. Na tela inicial (Empty State), o clique não faz nada. | **Alta** | `App.tsx`, `Titlebar.tsx`, `SessionLanding.tsx` |
| **DEBT-10** | Fatia 6 | Provedores (Cline UX) | Múltiplos provedores com formulários ricos (Claude, OpenAI, Gemini, Ollama), modelos e chaves individuais estilo **Cline**. | Implementação básica com cards estáticos, sem a riqueza e flexibilidade de catálogo do Cline. | **Média** | `ProvidersEditor.tsx`, `providersApi.ts` |
| **DEBT-11** | Fatia 6.1 **(a deliberar)** | Title Bar / Pesquisa | O topo mantém a **pesquisa / centro de comando** (acesso rápido: "Ir para Arquivo", "Mostrar e Executar Comandos", "Pesquisar Texto", "Abrir Chat Rápido"). A troca de pasta deve ser **integrada dentro da pesquisa**, não ocupar o lugar dela. | A faixa de caminho + botão "Usar esta pasta" ocupou o lugar da pesquisa: o caminho fica fixo no topo e **a pesquisa não existe mais**. | **Alta** | `Titlebar.tsx`, `WorkspaceSwitcher.tsx`, `shell/` |

### Itens identificados na análise do vídeo de 2026-10-12 (ainda NÃO fatiados)
> Fonte: gravação do usuário (4min02s) analisada por transcrição + frames (método em `docs/09 §11`). Itens que **não constam em nenhuma fatia** do roadmap — aguardando deliberação do usuário. O vídeo **confirma** as dívidas já registradas (DEBT-05, DEBT-06, DEBT-07, DEBT-09, DEBT-04, DEBT-10); o terminal não aparece na gravação, então DEBT-01/02/03 ficaram sem evidência nova.

1. **Raspar o código original (1:45–1:54):** pedido explícito de engenharia reversa do VS Code/Cline original para portar funcionalidades ao nosso (ex.: lista de recentes e nome da pasta no topo).
2. **Página "Personalizações" do original (1:54–2:33):** Visão geral, Agentes, **Habilidades (14)**, Instruções, Hooks, **Servidores MCP (1)**, Plugins (11), Ferramentas (11). Não existe no roadmap.
3. **Histórico de chats na sidebar de Sessões (1:07–1:18):** o original lista conversas antigas ("Greeting in Portuguese — 4 semanas atrás") com tempo relativo. O roadmap cobre histórico persistente **por sessão** na Fatia 10, mas não a lista de chats antigos.
4. **"Botão que abre navegador" (2:18–2:33):** botão funcional do original apontado pelo usuário; **não identificado com certeza** na gravação (candidato visto: botão de topo do Cline com tooltip "Abrir no Editor", t≈145 s). Usuário informou que mostrará qual é.
5. **Diferença de Landing (1:31–1:45):** o original exibe chips "Interativo / Manual permissions" + "Nova Árvore de Trabalho" + branch "main"; o clone exibe apenas "Interativo / Permissões manuais". Placeholder do original: "Descreva o resultado desejado".
6. **Seletor de pasta do original (t=97 s):** abas "Local / Github / Remoto", remoção de recente por "X" e item "Select…". Reforça DEBT-05/DEBT-07; as abas Github/Remoto são fidelidade a decidir.

---

# PARTE 2 — SPEC: FATIA 6.1 — Fechamento de Dívidas Críticas

> **STATUS:** EM ANDAMENTO (FASE ATIVA ATUAL).
> **REGRA DE OURO:** A Fatia 07 não inicia enquanto os critérios testáveis abaixo não estiverem 100 % verdes e homologados pelo humano.

### 1. Objetivo em 1 frase
Zerar as 4 dívidas bloqueantes da experiência do usuário: sincronização atômica de pasta (Explorer + Terminal), remoção do visualizador legado, abertura de Provedores em qualquer estado da tela e limpeza visual de buffer do terminal.

### 2. Arquivos impactados
1. `platform/apps/workbench-v2/src/App.tsx` — orquestração atômica imediata de troca de workspace (disparo de eventos para Explorer e Terminal no mesmo ciclo).
2. `platform/apps/workbench-v2/src/components/terminal/TerminalPanel.tsx` — correção do reset/clear do buffer xterm (limpeza visual completa).
3. `platform/apps/workbench-v2/src/shell/WorkspaceSwitcher.tsx` — exibição da lista de pastas recentes e disparo imediato de troca.
4. `platform/apps/workbench-v2/src/components/ProvidersEditor.tsx` — abertura no editor moderno, desacoplada do chat.
5. `platform/apps/workbench-v2/src/components/legacy/` — exclusão e purga definitiva de qualquer resquício de visualizador legado.

### 3. Critérios de Pronto Testáveis (Roteiro do Vídeo)
1. **Teste da Troca Atômica:**
   - Clicar em "Open Folder" / Seletor de pasta.
   - Escolher uma pasta qualquer no Windows (ou via fallback no Linux).
   - **Resultado imediato (sem digitar nada no chat e sem F5):**
     - O Explorer exibe os arquivos da pasta imediatamente.
     - O Terminal executa `cd` para essa pasta e o prompt reflete o caminho na hora.
2. **Teste da Lista de Recentes:**
   - Clicar novamente no seletor de pasta; as últimas 5 pastas abertas aparecem listadas para clique direto.
3. **Teste dos Provedores na Landing:**
   - Com o Agent Window na tela inicial vazia (sem nenhuma mensagem no chat), clicar em Conta > Provedores.
   - A tela de configuração de Provedores abre imediatamente no editor novo, sem erros no console.
4. **Teste do `clear` no Terminal:**
   - Digitar comandos no terminal (`dir`, `git status`).
   - Digitar `clear` ou `cls`.
   - O terminal limpa completamente a tela, sem fantasmas de texto no topo.

### 4. O que NÃO fazer na Fatia 6.1
- **NÃO** implementar agentes autônomos, execução de LLM ou chamadas de API de IA.
- **NÃO** mexer na arquitetura do SCM/Git nem criar branches/worktrees automáticas.
- **NÃO** reescrever o motor do Monaco Editor ou do PTY Server.
- **NÃO** iniciar operações de arquivo complexas da Fatia 07.

---

# PARTE 3 — Roadmap Completo Spec-Driven (Fatias 6.1 a 14)

Todas as fatias estruturadas sob o padrão **especificação prévia, escopo vertical e critérios rígidos de aceitação**:

### FATIA 6.1 — Fechamento de Dívidas Críticas (Ativa)
- **Objetivo:** Sincronização atômica Workspace-Explorer-Terminal + Provedores na landing + Eliminação do visualizador legado + Fix do clear no Terminal.
- **Bloqueio:** Bloqueia a abertura da Fatia 07.

### FATIA 07 — Motor de Edição & Operações de Arquivo (File Ops & Monaco)
- **Objetivo:** Edição real de arquivos no editor central integrado ao Explorer.
- **Escopo:** Abertura de arquivos do Explorer no Monaco novo com abas funcionais, tabs persistentes por sessão, salvamento atômico de arquivos (`saveFile`), criação, renomeação e exclusão de arquivos/pastas pelo Explorer.
- **Critério de aceite:** Criar, editar, salvar e fechar arquivos refletindo no disco real sem F5.

### FATIA 08 — Diff Viewer & Integração SCM Real
- **Objetivo:** Visualização de alterações e controle de versão fiel ao VS Code original.
- **Escopo:** Visualizador de diff lado a lado no Monaco, stage/unstage de arquivos no Source Control, visualização de diff de commits locais sem mocks.
- **Critério de aceite:** Fazer alterações em arquivos e visualizar o diff real idêntico ao VS Code.

### FATIA 09 — Página de Provedores Fiel ao Cline & Gestão de Chaves
- **Objetivo:** Gestão rica de múltiplos provedores de IA baseada na experiência do Cline.
- **Escopo:** Formulários dedicados para OpenAI, Anthropic, Gemini, Ollama local, OpenRouter e DeepSeek. Seleção dinâmica de modelos, teste de conexão de API, persistência em arquivo local seguro sem expor credenciais no Git.
- **Critério de aceite:** Configurar múltiplos provedores, testar conexão com sucesso e persistir configurações entre reloads.

### FATIA 10 — Runtime de Chat & Streaming do Agente
- **Objetivo:** Conexão do chat com os provedores de LLM configurados com streaming rico.
- **Escopo:** Conexão com os provedores da Fatia 09, streaming real de respostas no chat, Markdown completo com blocos de código formatados, persistência de histórico por sessão.
- **Critério de aceite:** Enviar prompt no chat e receber resposta fluida em streaming do provedor escolhido.

### FATIA 11 — Tool Calling & Execução Segura (Human-in-the-Loop)
- **Objetivo:** Habilitar ferramentas para o agente agir no filesystem e terminal com segurança.
- **Escopo:** Ferramentas de leitura, escrita, busca e execução no terminal. Card de permissão na interface com opções **[Permitir]**, **[Negar]** e **[Permitir na Sessão]**. Detecção de Doom Loop na 3ª chamada repetida.
- **Critério de aceite:** O agente propõe uma ação (ex: criar arquivo ou rodar teste) e só executa após autorização do usuário.

### FATIA 12 — Drag & Drop Avançado & Painel Inferior do Terminal
- **Objetivo:** Modularidade total de janelas e painéis conforme o VS Code original.
- **Escopo:** Desacoplamento do terminal: capacidade de arrastar o terminal para o painel inferior tradicional ou manter na barra lateral. Splits horizontais e verticais de terminal funcionais sem quebrar o grid.
- **Critério de aceite:** Mover o terminal entre painel inferior e lateral direita preservando sessões abertas.

### FATIA 13 — Worktree Opcional & Isolamento de Sessões
- **Objetivo:** Execução de tarefas em ambiente isolado sem afetar a árvore principal de trabalho.
- **Escopo:** Criação opcional de sessões em git worktree temporária ("Nova Árvore de Trabalho"), isolamento de arquivos modificados e merge/descarte controlado pelo usuário.
- **Critério de aceite:** Abrir sessão isolada, modificar arquivos e descartar sem alterar a pasta principal do workspace.

### FATIA 14 — Polish Visual, Atalhos & Paridade 90 % VS Code
- **Objetivo:** Fechamento de acabamento estético, atalhos globais e paridade final de 90 % com o VS Code original.
- **Escopo:** Posicionamento dinâmico da Activity Bar (topo / lateral), Command Palette (Ctrl+Shift+P), fidelidade total de animações, temas dark/light e atalhos de teclado.
- **Critério de aceite:** Inspeção lado a lado com o VS Code Server (8080) comprovando paridade visual e funcional de 90 %.

---

# PARTE 4 — Débitos Técnicos Secundários & Históricos

### Higiene de Testes & Débitos Pré-existentes
- **P3/P4 — Testes pré-existentes:** 13 E2E mortos históricos e 9 unitários de terminal mantidos como registro histórico até autorização de limpeza.
- **P7 — Flakes de digitação:** Tratamento de latência em testes de search e explorer.
- **D2.72 — Campo `auxiliaryVisible` órfão:** Limpeza de código sem impacto visual reservada para a Fatia 14.
- **D2.1 a D2.13:** Itens de acabamento de árvore e decorators absorvidos pelo roadmap acima.
