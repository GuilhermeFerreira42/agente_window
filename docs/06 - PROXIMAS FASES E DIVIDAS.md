# 06 - PROXIMAS FASES E DIVIDAS — Roadmap & Matriz de Dívidas

> **Documento Canônico de Planejamento e Débito Técnico (Padrão Spec-Driven / Stream Coding).**
> - **Regra de ouro:** Todo débito técnico e todo o roadmap do projeto vivem estritamente aqui (não criar arquivos separados como `TECHNICAL_DEBT.md` ou `ROADMAP.md`).
> - **Princípio de bloqueio:** Nenhuma fatia nova é iniciada enquanto existirem dívidas bloqueantes da fatia anterior. **Flexibilizado conscientemente pela D63/D64** para os itens de *refinamento* (foram para a FATIA 13, fora do caminho crítico do MVP).
> - **Régua de medição:** 90 % do produto é réplica fiel da **"Agents Window" do VS Code** (**D66**, 2026-10-13 — régua: code-server 8080 / VS Code real); 10 % é customizado (chassi direito com terminal + tela de Provedores estilo **Cline**).
> - **Atualizado:** 2026-10-14 — **arquitetura oficial "Condomínio" (D68/D69/D70)**: cada fatia agora tem a coluna **Casas** (função + o que muda de endereço; detalhe no `04 §2.2`); decisões **D68–D75** no `docs/05`; material novo do **OpenClaude / VS Code 1.135** (Parte 3); faxina de testes em **2 ondas** (D74). *(Reordenação e renumeração D63–D67: 13/10.)*

---

# PARTE 1 — Matriz Canônica de Dívidas Técnicas (Fatias 3, 4, 5 e 6)

| ID | Fatia | Onde está | Como é no original (visto no vídeo) | Como está no meu | Severidade | Arquivo(s) provável(is) |
|---|---|---|---|---|---|---|
| **DEBT-01** | Fatia 3 | Terminal | Executar `clear` ou `cls` limpa o viewport do xterm sem deixar resquício ou fantasmas de texto no topo. | O texto antigo não limpa direito; sobram resíduos visuais e artefatos no topo do viewport. | **Alta** | `TerminalPanel.tsx`, `singlePort.ts` |
| **DEBT-02** | Fatia 3 | Terminal / Layout | Terminal é desacoplado e pode ser arrastado/movido para painel inferior ou lateral com transição fluida e grid intacto. | Drag & drop não é modular: arrastar quebra o grid ou cria uma sessão empilhada no topo da interface. | **Alta** | `shell/layoutController.ts`, `shell/dnd/`, `TerminalPanel.tsx` |
| **DEBT-03** | Fatia 3 | Terminal / Layout | Existe a barra/painel inferior padrão do VS Code (Terminal, Output, Debug, Ports). | **Correção 2026-10-13:** o painel inferior **existe** no código (`components/terminal/PanelTabs.tsx`, `shell/panel/ViewsPanel.tsx`) e aparece no vídeo do usuário com as abas Problemas/Saída/Console de Depuração/Terminal/Portas. O que falta é a **verificação de realidade das abas** (o usuário questiona se "Portas" é simulação) e a paridade de comportamentos. | **Média** | `PanelTabs.tsx`, `ViewsPanel.tsx`, `App.tsx` |
| **DEBT-04** | Fatia 4 / 6 | Editor / Visualizador | Todas as superfícies auxiliares (inclusive Provedores e Configurações) abrem no **visualizador novo** (Monaco/Webview moderno). | A aba de Provedores ainda abre no **visualizador legado**. Componentes antigos de visualizador não foram expurgados. | **Alta** | `AuxiliaryBar.tsx`, `EditorArea.tsx`, `components/legacy/` |
| **DEBT-05** | Fatia 6 | Workspace / Dialog | No Windows, clicar em "Open Folder" abre o diálogo nativo Explorer (`IFileOpenDialog`) de seleção de pastas. | Foi criado um seletor customizado/incompleto; no Linux falta fallback que liste direto as pastas de forma integrada. | **Alta** | `WorkspaceSwitcher.tsx`, `server/api/fs` |
| **DEBT-06** | Fatia 6 | Workspace / Sincronização | Ao selecionar "Usar esta pasta", a atualização é **atômica e imediata**: o Explorer carrega a árvore e o Terminal dá `cd` na hora. | **Não é atômico:** só atualiza após mandar mensagem ("oi") no chat. Se trocar de pasta, fica dessincronizado. | **Crítica** | `App.tsx`, `useWorkspace.ts`, `pty-server` (`/api/pty/cwd`) |
| **DEBT-07** | Fatia 6 | Workspace / Recentes | Ao abrir o seletor de pasta, exibe a lista histórica de pastas recentes abertas para troca rápida em 1 clique. | Não exibe pastas recentes; não há histórico de workspaces acessível no diálogo para seleção imediata. | **Média** | `WorkspaceSwitcher.tsx`, `workspacePersistence.ts` |
| **DEBT-08** | Fatia 5 | Layout / Activity Bar | Menu de contexto da Activity Bar permite alternar posição ("Activity Bar Position: Top / Side"). | Posição travada sem opção de mover para a barra superior ou alternar. | **Baixa** | `shell/ActivityBar.tsx`, `layoutState.ts` |
| **DEBT-09** | Fatia 6 | Provedores (Cline UX) | Página de Provedores acessível a qualquer momento pelo menu da conta, inclusive com chat vazio (Landing / Empty State). | **Só abre se o chat estiver ativo**. Na tela inicial (Empty State), o clique não faz nada. | **Alta** | `App.tsx`, `Titlebar.tsx`, `SessionLanding.tsx` |
| **DEBT-10** | Fatia 6 | Provedores (Cline UX) | Múltiplos provedores com formulários ricos (Claude, OpenAI, Gemini, Ollama), modelos e chaves individuais estilo **Cline**. | Implementação básica com cards estáticos, sem a riqueza e flexibilidade de catálogo do Cline. | **Média** | `ProvidersEditor.tsx`, `providersApi.ts` |
| **DEBT-11** | FATIA 13 **(a decidir a forma)** | Title Bar / Pesquisa | O topo mantém a **pesquisa / centro de comando** (acesso rápido: "Ir para Arquivo", "Mostrar e Executar Comandos", "Pesquisar Texto", "Abrir Chat Rápido"). A troca de pasta deve ser **integrada dentro da pesquisa**, não ocupar o lugar dela. | A faixa de caminho + botão "Usar esta pasta" ocupou o lugar da pesquisa: o caminho fica fixo no topo e **a pesquisa não existe mais**. | **Alta** | `Titlebar.tsx`, `WorkspaceSwitcher.tsx`, `shell/` |

### Itens identificados na análise do vídeo de 2026-10-12 (ainda NÃO fatiados)
> Fonte: gravação do usuário (4min02s) analisada por transcrição + frames (método em `docs/09 §11`). Itens que **não constam em nenhuma fatia** do roadmap — aguardando deliberação do usuário. O vídeo **confirma** as dívidas já registradas (DEBT-05, DEBT-06, DEBT-07, DEBT-09, DEBT-04, DEBT-10); o terminal não aparece na gravação, então DEBT-01/02/03 ficaram sem evidência nova. **Atualização 14/10:** itens **2, 3 e 4 ganharam dono** (anotado em cada); 5 e 6 seguem em deliberação.

1. **Raspar o código original (1:45–1:54):** pedido explícito de engenharia reversa do VS Code/Cline original para portar funcionalidades ao nosso (ex.: lista de recentes e nome da pasta no topo).
2. **Página "Personalizações" do original (1:54–2:33):** Visão geral, Agentes, **Habilidades (14)**, Instruções, Hooks, **Servidores MCP (1)**, Plugins (11), Ferramentas (11). **Dono (14/10): FATIA 11 (E4) — Casa Personalizações.**
3. **Histórico de chats na sidebar de Sessões (1:07–1:18):** o original lista conversas antigas ("Greeting in Portuguese — 4 semanas atrás") com tempo relativo. O roadmap cobre histórico persistente **por sessão** na Fatia 10. **Dono (14/10): FATIA 13 — Casa Sessões.**
4. **"Botão que abre navegador" (2:18–2:33):** botão funcional do original apontado pelo usuário; **não identificado com certeza** na gravação (candidato visto: botão de topo do Cline com tooltip "Abrir no Editor", t≈145 s). Usuário informou que mostrará qual é. **Decidido (14/10): fica por último — FATIA 16 (acordo com a Meta).**
5. **Diferença de Landing (1:31–1:45):** o original exibe chips "Interativo / Manual permissions" + "Nova Árvore de Trabalho" + branch "main"; o clone exibe apenas "Interativo / Permissões manuais". Placeholder do original: "Descreva o resultado desejado".
6. **Seletor de pasta do original (t=97 s):** abas "Local / Github / Remoto", remoção de recente por "X" e item "Select…". Reforça DEBT-05/DEBT-07; as abas Github/Remoto são fidelidade a decidir.

### Itens identificados na análise do vídeo de 2026-10-13 (mapeados em 14/10 — nota abaixo da tabela)
> Fonte: gravação de 2026-10-13 (8min01s, 1880×1036, H.264/AAC) comparando o **code-server em GitHub Codespaces** (régua) com o nosso na 5174. O usuário declarou prioridade: **Provedores funcionando + "Agente Loop" para testar o MVP**; pediu classificação do que é **estrutural × refinamento**.

| # | Item apontado no vídeo | Onde | Observação |
|---|---|---|---|
| 1 | **Redimensionar as seções internas do Explorer** (Estrutura do Código / Linha do Tempo / Editores Abertos) arrastando a divisória entre elas | `shell/sideBar`, Explorer | O original permite; o nosso não. (0:23–1:32) |
| 2 | **Botões de cabeçalho das seções** (aparecem no hover): novo arquivo, nova pasta, atualizar, recolher tudo, ⋯ | Explorer | Faltam no nosso. (0:35–1:14) |
| 3 | **Menu ⋯ do Outline**: Seguir Cursor, Filtrar por Tipo, Classificar por Posição/Nome/Categoria | Outline | Não existe no código (verificado: 0 ocorrências). (1:04–1:14) |
| 4 | **Pesquisa (side bar)**: botões do cabeçalho + linha "Substituir" | Search | Faltam no nosso. (1:33–1:59) |
| 5 | **Controle do Código-Fonte**: seção inteira (Alterações + caixa de mensagem + botão de commit + seção "Gráfico") e redimensionamento | SCM | **Tem dono: FATIA 08.** (2:00–2:18) |
| 6 | **Terminal — "transplante"**: aparência moderna do original + botões + comportamentos: **Ctrl+C/Ctrl+V**, **arrastar arquivo/pasta para o terminal e ver o caminho**, **arrastar o terminal para dividir telas** | terminal (**intocável**) | O usuário pergunta se vira fatia própria. Recomendação: **Fatia Terminal 2.0** após o MVP, absorvendo DEBT-01/02/03. (2:23–4:08) |
| 7 | **Aba "Portas"**: verificar se é real ou simulação | painel inferior | Ver correção da DEBT-03 acima. (2:35–2:41) |
| 8 | **Botões**: clicar deve já focar/abrir para digitação (original), em vez de ficar "selecionado" | UI geral | Comportamento de foco. (4:12–4:49) |
| 9 | **Animação do indicador de drop** ("Drop view here") diferente do original | `shell/dnd` | Paridade fina. (5:19–6:00) |
| 10 | **Trilha de Navegação (breadcrumbs) navegável** — hoje é **puramente visual**: clicar em pasta › subpasta › arquivo deve abrir menu suspenso, e clicar no elemento mostra a estrutura interna do código (classes, métodos, funções) para pular direto, sem rolar o arquivo | topo do editor (`modules/explorer-search/ui/attach/Breadcrumbs.tsx`) | **Identificado pelo usuário em 2026-10-13** ("é a trilha de navegação"). É o débito histórico **D2.23 (4.7-c)** citado no próprio comentário do arquivo: o componente monta os segmentos e **não tem clique/dropdown** (verificado no código). (6:33) |

**Atualização 14/10 (donos):** item **5 → FATIA 11** (Conferir — era a "08" na numeração antiga) · **6 e 7 → FATIA 12** (Terminal 2.0) · **9 → FATIA 14** (Painéis) · **10 → FATIA 13** (Refinamentos). Itens **1–4 e 8** = refinamento (dono a fechar quando a FATIA 13 abrir).

**Prioridade declarada pelo usuário (2026-10-13):** "quero avançar logo para as próximas fatias, para a gente já colocar os Provedores e já fazer funcionar e colocar o Agente Loop para a gente já testar" — **DECIDIDO (D63 + D64 + D65, `docs/05`)**: ordem **MVP-first** com a numeração nova → **(1) FATIA 07 — Destravar** (DEBT-06 + DEBT-04 + DEBT-09) → **(2) FATIA 08 — Conectar** (Provedores) → **(3) FATIA 09 — Conversar** (chat real + streaming) → **(4) FATIA 10 — Agir** (tools + permissões) = **MVP ponta a ponta**. Refinamentos fora do caminho crítico → **FATIA 13 — Refinamentos** (antiga proposta "6.2"). Dependência dura: a FATIA 08 não inicia sem os critérios da FATIA 07 verdes.

---

# PARTE 2 — SPEC: FATIA 07 — Destravar (Dívidas Estruturais)

> **STATUS:** APROVADA (aguardando ordem de início). Substitui a SPEC da antiga "Fatia 6.1" (renumerada pela D64).
> **REGRA DE OURO:** A **FATIA 08 não inicia** enquanto os critérios testáveis abaixo não estiverem verdes e homologados pelo humano.
> **Mudança de escopo (D63/D64):** só as 3 dívidas estruturais ficaram aqui. Saíram para fatias próprias: `clear` do terminal (**DEBT-01** → FATIA 12), lista de recentes (**DEBT-07** → FATIA 13) e picker nativo (**DEBT-05** → FATIA 13).

### 1. Objetivo em 1 frase
Zerar as 3 dívidas estruturais que travam o caminho do MVP: troca de pasta atômica (Explorer + Terminal), purga total do visualizador legado e abertura dos Provedores em qualquer estado da tela.

### 2. Arquivos impactados
1. `platform/apps/workbench-v2/src/App.tsx` — orquestração atômica imediata de troca de workspace (disparo para Explorer e Terminal no mesmo ciclo).
2. `platform/apps/workbench-v2/src/components/ProvidersEditor.tsx` / `ProvidersView.tsx` — abertura no editor moderno, desacoplada do chat, inclusive na Landing.
3. `platform/apps/workbench-v2/src/components/AuxiliaryBar.tsx` + `EditorArea.tsx` — conferir que nenhuma superfície auxiliar monta o visualizador antigo (DEBT-04).
4. `platform/apps/workbench-v2/src/components/legacy/` — purga definitiva de qualquer resquício de visualizador legado.

**Casas (D69):** **nenhuma** casa nasce ou muda de endereço nesta fatia — ela é limpeza + destravamento (nada de pasta vazia).

### 3. Critérios de Pronto Testáveis
1. **Troca Atômica (DEBT-06):**
   - Clicar em "Open Folder" / seletor de pasta; escolher uma pasta (Windows; fallback Linux).
   - **Resultado imediato (sem digitar nada no chat e sem F5):** o Explorer exibe os arquivos na hora **e** o Terminal executa `cd` com o prompt refletindo o caminho.
2. **Provedores em qualquer estado (DEBT-09):**
   - Com a tela inicial vazia (Landing, sem chat), clicar em Conta > Provedores.
   - A tela abre imediatamente no editor novo, sem erros no console.
3. **Visualizador legado (DEBT-04):**
   - Nenhuma tela auxiliar (inclusive Provedores e Configurações) abre no visualizador antigo; busca no código não encontra resquício.

### 4. O que NÃO fazer na FATIA 07
- **NÃO** implementar chamadas de IA, ferramentas ou permissões (conteúdo das Fatias 08–10).
- **NÃO** mexer no motor do Monaco/PTY nem no terminal homologado (contratos congelados do `04`).
- **NÃO** antecipar refinamentos (recentes, `clear`, picker nativo) — têm fatia própria (12/13) e **a Pesquisa volta ao lugar na FATIA 13 (D73)**.
- **NÃO** mover nenhuma área congelada (D69) — Terminal, `explorer-search/{core,server}` e `EditorArea` (até 5.7) ficam onde estão.

---

# PARTE 3 — Roadmap Completo Spec-Driven (Fatias 07 a 16 — renumeração D64 de 2026-10-13)

Todas as fatias estruturadas sob o padrão **especificação prévia, escopo vertical e critérios rígidos de aceitação**. **Cada fatia agora tem duas tarefas: a FUNÇÃO (o que entrega) e a CASA (o que muda de endereço no `App.tsx`)** — a fila e a arquitetura andam juntas (D68/D69; condomínio no `04 §2.2`).

### FATIA 07 — Destravar (Dívidas Estruturais) — era a 6.1
- **Objetivo:** Sincronização atômica Workspace-Explorer-Terminal + Provedores na landing + eliminação do visualizador legado (só as 3 estruturais).
- **Bloqueio:** bloqueia a FATIA 08 (e todo o caminho do MVP). **SPEC completa na PARTE 2.**

### FATIA 08 — Conectar (Provedores estilo Cline) — era a 09
- **Objetivo:** Gestão rica de múltiplos provedores de IA, inspirada no Cline.
- **Escopo:** formulários dedicados (OpenAI, Anthropic, Gemini, Ollama local, OpenRouter, DeepSeek…), seleção dinâmica de modelos, teste de conexão, persistência local segura (`~/.agente_window/providers.json`) sem expor credenciais. **Absorve a DEBT-10.**
- **Critério de aceite:** configurar múltiplos provedores, testar conexão com sucesso e persistir entre reloads.
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-06-chat/GUI_PROVEDORES_CLONE.md` + `PROVIDERS_EXEMPLO.json`.

### FATIA 09 — Conversar (Chat real + Streaming) — era a 10
- **Objetivo:** Ligar o chat aos provedores configurados, com streaming real.
- **Escopo:** rota de servidor que fala com o provedor + resposta em streaming + Markdown completo com blocos de código + histórico por sessão. **Substitui o mock atual de `App.tsx::handleSend`.**
- **Critério de aceite:** enviar prompt e receber resposta fluida, em streaming, do provedor escolhido.
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-08-streaming/`, `fatia-07-input/`.

### FATIA 10 — Agir (Tools + Permissões) — era a 11 — **FECHA O MVP**
- **Objetivo:** o agente age no sistema de arquivos (e, conforme recorte a decidir, no terminal) com autorização do usuário.
- **Escopo:** ferramentas ligadas ao servidor existente (`/fs/*` — escrita atômica já pronta) + card **[Permitir] / [Negar] / [Permitir na Sessão]** + trava anti-loop (3 chamadas idênticas).
- **Critério de aceite:** o agente propõe uma ação (ex.: criar arquivo) e **só executa após autorização** — é o teste final do MVP.
- **Em aberto (Q6):** no MVP o agente mexe **só em arquivos** ou também **roda comandos no terminal**?
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-06-chat/PERMISSOES.md`, `fatia-09-tools/`.

### FATIA 11 — Conferir (File Ops + SCM/Diff) — eram as 07 + 08
- **Objetivo:** edição real de arquivos no editor + visualização das alterações (a "lupa" para auditar o agente).
- **Escopo:** abas funcionais e persistentes por sessão, salvamento atômico (`saveFile`), criação/renomeação/exclusão pelo Explorer; diff lado a lado via SCM (a barra lateral existente — **não** ressuscitar o diff antigo) e stage/unstage real.
- **Critério de aceite:** criar/editar/salvar refletindo no disco **sem digitar nada no chat e sem F5** — o arquivo salvo aparece correto e o SCM mostra o diff lado a lado (com stage/unstage real).
- **Casas (D69):** nascem a **Casa Editor** (`1-workbench/casas/editor` — abas de `EditorArea.tsx` + gestão de abas hoje no `App.tsx`) e a **Casa Personalizações** (`1-workbench/casas/personalizacoes` — página com Visão geral, Agentes, Habilidades (14), Instruções, Hooks, Servidores MCP (1), Plugins (11), Ferramentas (11) — item 2 do vídeo de 12/10). ⚠️ O `EditorArea` em si segue **endereço congelado** — só se move com ordem expressa.
- **Em aberto (E4):** a página Personalizações pode nascer dentro desta fatia **ou** virar fatia própria — decidir quando a fatia abrir.
- **Referência no código:** o diff real **já existe** — `shell/sideBar/views/ScmView.tsx` + `ui/attach/changes/ChangesPane.tsx` → `core/git/gitService.ts` (getDiff). **Não** ressuscitar o diff antigo do Windows.

### FATIA 12 — Terminal 2.0 (Transplante) — absorve DEBT-01 + DEBT-02 + DEBT-03
- **Objetivo:** o "transplante" do terminal apontado no vídeo de 13/10 — aparência e comportamentos do original, terminais dívidas antigas.
- **Escopo:** DEBT-01 (`clear` limpa o viewport sem resíduos) · DEBT-02 (arrastar o terminal para painel inferior ou lateral **sem quebrar o grid nem empilhar sessão**) · DEBT-03 (verificação de realidade das abas do painel inferior — Problemas/Saída/Depuração/Terminal/**Portas** — e paridade de comportamento) · comportamentos do vídeo: **Ctrl+C/Ctrl+V**, **arrastar arquivo/pasta para o terminal e ver o caminho**, **arrastar o terminal para dividir telas** · conserto das **9 falhas de teste unitário do terminal** (onda 2 da faxina, D74).
- **Casa (D69):** o Terminal — área de **endereço congelado** — é a **única área protegida que muda de endereço, e só nesta fatia**: `components/terminal` + `services/pty-server` → `1-workbench/casas/terminal` (**com ordem expressa do dono**).
- **Critério de aceite:** mover o terminal entre painel inferior e lateral preservando as sessões abertas; `clear` sem artefatos; suíte do terminal **verde** (0 falhas — fim do P4).
- **Em aberto:** a aba "Portas" é real ou simulação? (verificar contra o code-server 8080.)

### FATIA 13 — Refinamentos + Casas Sessões & Command Center — absorve DEBT-05/07/11 + D2.23
- **Objetivo:** fechar o que ficou fora do caminho crítico do MVP + extrair as duas casas da barra lateral/topo.
- **Escopo:** DEBT-05 (picker nativo no Windows + fallback Linux) · DEBT-07 (pastas recentes no seletor) · **DEBT-11/E9 (a Pesquisa volta ao lugar — a troca de pasta fica *dentro* dela, como seletor, D73)** · D2.23 (Trilha de Navegação/breadcrumbs **navegável**: menus suspensos + estrutura interna do código) · lacunas do mockup na sidebar de Sessões (29/29, busca, Novo Grupo Ctrl+N, indicador de voz, +1 workspace) e **histórico de chats antigos** (item 3 do vídeo de 12/10).
- **Casas (D69):** nascem **Sessões** (`1-workbench/casas/sessoes` — `SessionSidebar.tsx` 604 l. + lógica no `App.tsx`) e **Command Center** (`1-workbench/casas/command-center` — `WorkspaceSwitcher` + centro da Titlebar; **o Titlebar fica corredor**, sem estado, D70).
- **Critério de aceite:** os 4 débitos com o comportamento do original; as duas casas com porta única (`index.ts`) + teste de fronteira verde.
- **Referência:** mockup `arquivo_morto/pesquisa_bruta/personalizacoes/vscode_agents_mockup_interativo (1).html` — barra lateral esquerda fiel (Sessões 29/29 + Personalizações 16).

### FATIA 14 — Painéis (Drag & Drop Avançado)
- **Objetivo:** modularidade total de janelas e painéis conforme o original (parte geral — o que não é terminal).
- **Escopo:** splits horizontais e verticais de painéis funcionais sem quebrar o grid; animação fiel do indicador de drop ("Drop view here", item 9 do vídeo 13/10); limpeza do campo órfão `auxiliaryVisible` (D2.72 — reservada para cá).
- **Casas (D69):** sem casa nova — é layout (`shell/`, corredor); extrair conforme necessidade.
- **Critério de aceite:** arranjar painéis como no VS Code (mover, dividir, fechar) sem quebrar o grid; paridade da animação.

### FATIA 15 — Worktree & Isolamento de Sessões
- **Objetivo:** execução de tarefas em ambiente isolado sem afetar a árvore principal de trabalho.
- **Escopo:** criar sessão em `git worktree` temporária ("Nova Árvore de Trabalho" — o chip do original visto no item 5 do vídeo de 12/10), isolamento dos arquivos modificados e merge/descarte controlado pelo usuário.
- **Casas (D69):** sem casa nova — extensão da Casa **Sessões** (13) + Agent Host; extrair conforme necessidade.
- **Critério de aceite:** abrir sessão isolada, modificar arquivos e descartar sem alterar a pasta principal do workspace.

### FATIA 16 — Polimento + Navegador (POR ÚLTIMO)
- **Objetivo:** acabamento estético, atalhos globais e paridade final de 90 % com o original — **o navegador entra aqui, por último** (acordo com a Meta, 14/10).
- **Escopo:** posição da Activity Bar (topo/lateral — DEBT-08, Baixa) · Command Palette (Ctrl+Shift+P) · fidelidade de animações · temas dark/light · atalhos · **botão que abre navegador** (apontado pelo dono no vídeo de 12/10, ~2:18 — "é outro, mostro depois") + **Casa Navegador** (`1-workbench/casas/navegador`, extraída do `BrowserPreview` de `EditorArea.tsx`; padrão do `simple-browser` do VS Code).
- **Critério de aceite:** inspeção lado a lado com o code-server (8080) comprovando paridade visual e funcional de 90 %; o botão do navegador funcionando.

---

# PARTE 4 — Débitos Técnicos Secundários & Históricos

### Higiene de Testes — faxina em 2 ondas (D74, 2026-10-14)
- **Onda 1 — skip:** os **13 E2E mortos históricos** são marcados como `skip` na **FATIA 07** (registro preservado — **não apagar**).
- **Onda 2 — conserto:** as **9 falhas de unit do terminal** (P4) são consertadas na **FATIA 12**, junto do transplante.
- **Baseline de referência:** typecheck 0 · 722 pass · 9 falhas (P4, terminal) · 16 skip.
- **P7 — Flakes de digitação:** latência em testes de search/explorer — tratar na fatia que mexer nesses testes (a partir da 11/13).
- **D2.72 — Campo `auxiliaryVisible` órfão:** limpeza de código sem impacto visual reservada para a **FATIA 14 (Painéis)**.
- **D2.1 a D2.13:** itens de acabamento de árvore e decorators — absorvidos pelo roadmap acima; revisar quando a fatia correspondente abrir.

### Nota de fronteira (D70)
- As dívidas **DEBT-ROBUST-01..04** (migração MVP → **Condomínio Robusto**) **não pertencem a este roadmap** — vivem no `04 §2.2` (gatilhos e custos) e no `05` (D70). Só migram **com gatilho + ordem expressa do dono**, nunca no meio de uma fatia.