# Catálogo Canônico de Prints da FATIA-04

> **Origem:** Vídeo oficial de demonstração (`Gravar_2026_09_15_21_09_30_680.mp4`, 1872x1072, 30 fps, duração 08:38).  
> **Finalidade:** Fornecer à IA executora (**Arena**) referências visuais fidedignas, quadro a quadro, de cada subsistema da **FATIA-04** (Explorer Completo, Editor Anexo Lateral, Search na Sessão, Browser Integrado com IA/HTML e Protocolo Anti-Regressão), evitando quebras arquiteturais ou adivinhações de layout.  
> **Localização dos arquivos:** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/` (espelhado em `docs/referencias_visuais/fatia_04/`).

---

## 1. Tabela Resumo dos 14 Prints

| # | Timestamp | Arquivo | Subsistema | Sub-Fatias | O que comprova visualmente |
|---|---|---|---|---|---|
| **01** | `00:10` | [`01_workbench_overview_chat_explorer.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/01_workbench_overview_chat_explorer.png) | Shell / Layout | 4.3, 4.9 | Visão geral do shell web: sessões à esquerda, chat central do agente, e sidebar direita com árvore de arquivos. |
| **02** | `01:40` | [`02_antigravity_ide_comparativo_split.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/02_antigravity_ide_comparativo_split.png) | Referência IDE | 4.3, 4.4 | IDE de referência (lado esquerdo): árvore do Explorer com seções inferiores (*Editores Abertos*, *Estrutura*, *Linha do Tempo*, *Maven*) e terminal split. |
| **03** | `02:40` | [`03_vscode_web_sash_resizing.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/03_vscode_web_sash_resizing.png) | Layout / Sash | 4.3, 4.6 | `vscode.dev`: redimensionamento da barra lateral via sash (linha azul delimitadora ativa) e cabeçalho com 4 botões de ação do explorer. |
| **04** | `05:00` | [`04_editor_anexo_abrir_menu_mais.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/04_editor_anexo_abrir_menu_mais.png) | Editor Anexo / Abas | 4.6, 4.7, 4.8 | Menu do botão `+` nas abas da sessão: opções *Alterações (Ctrl+Shift+G)*, *Navegador (Ctrl+Shift+B)*, *Pesquisar (Ctrl+Shift+F)* e empty state. |
| **05** | `04:50` | [`05_editor_anexo_pesquisar_sessao.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/05_editor_anexo_pesquisar_sessao.png) | Search Sessão | 4.7 | Aba *Pesquisar* aberta no anexo lateral da sessão com input dedicado e toggles `Aa` (case), `ab` (whole word), `.*` (regex) e detalhes. |
| **06** | `05:01` | [`06_navegador_anexo_empty_state_autocomplete.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/06_navegador_anexo_empty_state_autocomplete.png) | Browser Anexo | 4.8 | Aba *Navegador* com ícone de globo: barra de navegação (`<-`, `->`, `↺`), input de URL com autocomplete e empty state orientando vinculação ao chat. |
| **07** | `05:05` | [`07_navegador_anexo_google_renderizado.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/07_navegador_anexo_google_renderizado.png) | Browser Anexo | 4.8 | Navegador interno renderizando página real (`https://www.google.com/`) no anexo lateral, coexistindo com o Chat central sem sobreposição. |
| **08** | `05:40` | [`08_ia_percepcao_html_gemini_vscode_web.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/08_ia_percepcao_html_gemini_vscode_web.png) | IA / Browser HTML | 4.8 | IA (Gemini) respondendo a *"o que vc esta vendo"* com leitura completa do DOM/HTML da página aberta no navegador interno. |
| **09** | `06:34` | [`09_editor_anexo_recolhido_fechar_aba.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/09_editor_anexo_recolhido_fechar_aba.png) | Editor Anexo / Fechar | 4.6 | **Comportamento crítico:** ao fechar a última aba do anexo, o editor lateral se **recolhe completamente** sem destruir o estado da sessão. |
| **10** | `06:46` | [`10_explorer_arvore_pastas_expandidas.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/10_explorer_arvore_pastas_expandidas.png) | Explorer Árvore | 4.2, 4.3 | Navegação na árvore de arquivos com nós expandidos (`a`, `agente_window`, `code-server`), chevrons e seleção de item ativo. |
| **11** | `07:38` | [`11_explorer_menu_contexto_arquivo_baixar.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/11_explorer_menu_contexto_arquivo_baixar.png) | Menu Contexto | 4.4, 4.5 | Menu de contexto de **arquivo** com a opção explícita **`Baixar...`**, `Abrir ao Lado`, `Recortar`, `Copiar`, `Renomear...`, `Excluir`. |
| **12** | `07:30` | [`12_explorer_menu_contexto_pasta.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/12_explorer_menu_contexto_pasta.png) | Menu Contexto | 4.4 | Menu de contexto de **pasta** com `Novo Arquivo...`, `Nova Pasta...`, `Revelar no Explorador`, `Adicionar Pasta ao Workspace`, `Colar`. |
| **13** | `08:18` | [`13_explorer_secao_alteracoes_git.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/13_explorer_secao_alteracoes_git.png) | Explorer / Git | 4.3, 4.9 | Aba *Alterações* (Source Control) na barra lateral: exibição de *Alterações Sem Commit* e empty state *Arquivos Não Alterados*. |
| **14** | `08:34` | [`14_explorer_estrutura_arquivos_completa.png`](/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/prints/14_explorer_estrutura_arquivos_completa.png) | Explorer Final | 4.1, 4.3, 4.9 | Árvore completa e profunda de arquivos com ícones por extensão (`.bat`, `.json`, `.ts`, `.md`, `.js`), indent guides e cabeçalho `Atualizar`. |

---

## 2. Detalhamento Técnico dos Prints para a Arena

### Print 01 — `01_workbench_overview_chat_explorer.png` (00:10)
- **Subsistema:** Layout do Workbench e Coexistência de Áreas.
- **Evidência:** 
  - **Sidebar Esquerda:** Cabeçalho com título `Sessões`, botão de atalho `Novo Ctrl+N`, ícones de busca e filtro. Histórico de sessões (ex: *Greeting in Portuguese*). Seção inferior `Personalizações` com contador (*Visão geral*, *Agentes*, *Habilidades 14*, *Instruções*, *Hooks*, *Servidores MCP 1*, *Plugins*, *Ferramentas 11*).
  - **Área Central (Chat):** `New session in agente_window with Copilot`, input central com dicas de prompt, seletores `Agent`, `Auto`, permissões manuais e modo interativo.
  - **Sidebar Direita:** Abas `Alterações` e `Arquivos +`, árvore de diretórios do repositório, botão de ação superior `Atualizar` e botões de toggle das seções.
- **Aplicação na Implementação:** Garante que a Arena preserve o layout de três colunas flexíveis sem quebrar a área central de conversação.

### Print 02 — `02_antigravity_ide_comparativo_split.png` (01:40)
- **Subsistema:** Paridade com IDE VS Code Desktop / Antigravity IDE.
- **Evidência:** 
  - A barra lateral de navegação possui as seções recolhíveis padrão: `Editores Abertos` (com lista de arquivos e botão `x`), `Estrutura do Código`, `Linha do tempo` e `Maven`.
  - O terminal inferior homologado executa scripts reais em shell split (PowerShell + cmd) sem conflito visual com os editores abertos.
- **Aplicação na Implementação:** Define a ordem e os estilos das 3 seções do Explorer da Sub-Fatia 4.3 (`Editores Abertos`, `Estrutura de Código`, `Linha do Tempo`).

### Print 03 — `03_vscode_web_sash_resizing.png` (02:40)
- **Subsistema:** Geometria e Redimensionamento via Sash.
- **Evidência:**
  - O separador (sash) entre a barra lateral e o editor destaca-se com uma linha azul de foco ativa (`--vscode-focusBorder` / `#007acc`) ao ser arrastado.
  - O cabeçalho do Explorer possui os 4 botões de ação canônicos à direita do nome da pasta raiz:
    1. `Novo Arquivo...` (ícone de folha com `+`)
    2. `Nova Pasta...` (ícone de pasta com `+`)
    3. `Atualizar` (ícone de setas circulares)
    4. `Recolher Pastas no Explorer` (ícone de recolher pastas)
- **Aplicação na Implementação:** Sub-Fatia 4.3 (Header de 4/5 alvos) e Sub-Fatia 4.6 (Sash redimensionável do anexo lateral com hover e drag state).

### Print 04 — `04_editor_anexo_abrir_menu_mais.png` (05:00)
- **Subsistema:** Menu de Ações das Abas da Sessão (`+`).
- **Evidência:**
  - O botão `+` na barra de abas do anexo do editor abre um menu contextual dropdown flutuante contendo exatamente:
    - `Alterações` (atalho `Ctrl+Shift+G`)
    - `Navegador` (atalho `Ctrl+Shift+B`)
    - `Pesquisar` (atalho `Ctrl+Shift+F`)
  - Área inferior exibe o Empty State do editor: ícone de arquivo, texto *"Selecione um arquivo na exibição Arquivos"* e botão estilizado *"Pesquisar Arquivos Ctrl+P"*.
- **Aplicação na Implementação:** Sub-Fatias 4.6, 4.7 e 4.8. A Arena deve conectar esse menu exatamente a essas 3 rotas de recursos da sessão (`EditorResource.kind = 'changes' | 'browser' | 'search'`).

### Print 05 — `05_editor_anexo_pesquisar_sessao.png` (04:50)
- **Subsistema:** Pesquisa Local à Sessão do Editor.
- **Evidência:**
  - Aba com ícone de lupa (`Q`) e título `Pesquisar`.
  - Barra de input com placeholder `Pesquisar`.
  - Toggles integrados dentro do input à direita:
    - `Aa` — Diferenciar maiúsculas de minúsculas (Match Case)
    - `ab` — Coincidir palavra inteira (Match Whole Word)
    - `.*` — Usar expressão regular (Use Regular Expression)
  - Botão `...` (Alternar detalhes da pesquisa).
- **Aplicação na Implementação:** Sub-Fatia 4.7 (`Search na Sessão`). Mostra que a pesquisa da FATIA-04 reside no anexo lateral, não em modal invasivo ou na sidebar primária.

### Print 06 — `06_navegador_anexo_empty_state_autocomplete.png` (05:01)
- **Subsistema:** Navegador Interno Embutido na Sessão.
- **Evidência:**
  - Aba com ícone de globo terráqueo e título `Navegador`.
  - Barra de navegação superior: botões `<-` (Voltar), `->` (Avançar), `↺` (Recarregar).
  - Campo de URL com dropdown de sugestões de autocompletar em tempo real:
    - Ícone de lupa `googl - Bing Pesquisa`
    - Ícone de globo `googl`
    - Ícone de engrenagem à direita para configurações de busca.
  - Tela principal do navegador vazio: Ícone de globo central, título `Navegador`, mensagem de apoio: *"Use Adicionar elemento ao Chat para referenciar elementos da interface do usuário em prompts de chat"*.
  - Ações no canto direito da barra: botão de inspecionar elemento e botão de abrir em janela externa / maximizar.
- **Aplicação na Implementação:** Sub-Fatia 4.8 (`Browser runtime + IA`). Mostra os controles necessários da barra de navegação e o autocomplete.

### Print 07 — `07_navegador_anexo_google_renderizado.png` (05:05)
- **Subsistema:** Renderização Web no Navegador Embutido.
- **Evidência:**
  - A aba assume o favicon e título do site ativo (`Google`).
  - A barra de URL exibe a URL completa ativa: `https://www.google.com/`.
  - A página é renderizada interativamente no anexo lateral, enquanto a conversa com a IA permanece ativa no painel central à esquerda.
- **Aplicação na Implementação:** Sub-Fatia 4.8. Comprova que o navegador não sobrepõe nem quebra o chat da IA, funcionando lado a lado como anexo.

### Print 08 — `08_ia_percepcao_html_gemini_vscode_web.png` (05:40)
- **Subsistema:** Percepção da IA e Acesso ao HTML/DOM da Página Aberta.
- **Evidência:**
  - O usuário pergunta no chat lateral: *"o que vc esta vendo"*.
  - O painel indica: *"Compartilhando 'Bem-vindo - agente_window [GitHub] - Visual Studio Code - Git...'"*.
  - A IA responde detalhadamente:
    > *"Estou vendo a interface do Visual Studio Code para a Web aberta no navegador. Do lado esquerdo, no painel de arquivos, está o repositório chamado agente_window, que contém pastas como docs, legacy, platform e scripts, além de arquivos de configuração como package.json e tsconfig.json. No centro da tela está a página inicial de boas-vindas com opções para criar ou abrir arquivos e atalhos para aprender o básico do editor."*
- **Aplicação na Implementação:** Sub-Fatia 4.8 (Requisitos RF-20 a RF-24 do `04_08`). Prova que a IA executora precisa do contrato `BrowserSessionService.getPageSource()` ou `BrowserSessionService.getSnapshot()` para extrair o HTML e alimentar o contexto do modelo.

### Print 09 — `09_editor_anexo_recolhido_fechar_aba.png` (06:34)
- **Subsistema:** Ciclo de Vida do Anexo Lateral e Não-Destruição de Estado.
- **Evidência:**
  - Ao clicar no botão de fechar (`x`) da última aba aberta no anexo, o anexo lateral desaparece completamente da tela.
  - A área central de chat reexpande suavemente ocupando o espaço livre, com todos os inputs, histórico e estado da conversa 100% preservados.
- **Aplicação na Implementação:** Sub-Fatia 4.6 (Regra 3 do `04_15` e protocolo `docs/18`). O anexo deve usar `display: visible ? 'contents' : 'none'` (ou controle de largura `0px`), NUNCA desmontar (`unmount`) o estado React subjacente.

### Print 10 — `10_explorer_arvore_pastas_expandidas.png` (06:46)
- **Subsistema:** Árvore do Explorer, Indentação e Lazy Loading.
- **Evidência:**
  - Pastas `a`, `agente_window`, `code-server` expandidas em hierarquia.
  - Chevrons para baixo `v` indicando nó aberto, chevrons para a direita `>` indicando nós fechados.
  - Efeito hover e seleção com fundo suave (`--vscode-list-hoverBackground`).
- **Aplicação na Implementação:** Sub-Fatias 4.2 e 4.3 (ExplorerService + ExplorerTree). Altura de linha de 22px por item e indent guides visíveis.

### Print 11 — `11_explorer_menu_contexto_arquivo_baixar.png` (07:38)
- **Subsistema:** Menu de Contexto Completo para Arquivos com `Baixar...`.
- **Evidência:**
  - Clique direito sobre `tsconfig.contracts.json` exibe:
    1. `Abrir ao Lado` (Ctrl+Enter)
    2. `Abrir Com...`
    3. `Compartilhar >`
    4. `Selecionar para Comparar`
    5. `Abrir Linha do Tempo`
    6. `Recortar` (Ctrl+X)
    7. `Copiar` (Ctrl+C)
    8. **`Baixar...`** *(Download do arquivo para o disco local do usuário!)*
    9. `Copiar o Caminho` (Shift+Alt+C)
    10. `Copiar Caminho Relativo` (Ctrl+K Ctrl+Shift+C)
    11. `Renomear...` (F2)
    12. `Excluir Permanentemente` (Del)
- **Aplicação na Implementação:** Sub-Fatia 4.4 (`ExplorerContextMenu`) e Sub-Fatia 4.5 (`Transferência/Download`). Prova visual incontestável da existência da ação `Baixar...` no menu de contexto de arquivo.

### Print 12 — `12_explorer_menu_contexto_pasta.png` (07:30)
- **Subsistema:** Menu de Contexto Completo para Diretórios.
- **Evidência:**
  - Clique direito sobre pasta exibe:
    1. `Novo Arquivo...`
    2. `Nova Pasta...`
    3. `Revelar no Explorador de Arquivos` (Shift+Alt+R)
    4. `Abrir na Visualização de Imagens`
    5. `Abrir no Terminal Integrado`
    6. `Compartilhar >`
    7. `Adicionar Pasta ao Workspace...`
    8. `Abrir Configurações de Pasta`
    9. `Remover Pasta do Workspace`
    10. `Localizar na Pasta...`
    11. `Adicionar Pasta ao Chat`
    12. `Colar` (Ctrl+V)
    13. `Copiar o Caminho` (Shift+Alt+C)
    14. `Copiar Caminho Relativo` (Ctrl+K Ctrl+Shift+C)
- **Aplicação na Implementação:** Sub-Fatia 4.4. Regras de contexto (`explorerResourceIsFolder === true`) para habilitar ações de criação e colar na pasta selecionada.

### Print 13 — `13_explorer_secao_alteracoes_git.png` (08:18)
- **Subsistema:** Aba Alternativa de Alterações (Source Control).
- **Evidência:**
  - Cabeçalho exibe abas `Alterações` e `Arquivos +`.
  - Na aba `Alterações`, cabeçalho retrátil `Alterações Sem Commit v` e empty state centralizado: *"Arquivos Não Alterados - Os arquivos alterados e outros artefatos da sessão aparecerão aqui."*.
- **Aplicação na Implementação:** Sub-Fatia 4.3. Mostra que o painel lateral acomoda múltiplas visualizações além da árvore de arquivos pura.

### Print 14 — `14_explorer_estrutura_arquivos_completa.png` (08:34)
- **Subsistema:** Renderização Visual Final da Árvore de Arquivos.
- **Evidência:**
  - Diretório profundo expandido (`legacy\AMBIENTE_COMPLETO_PARA_OPENCLAUDE\02_replica_final`).
  - Ícones específicos por tipo de arquivo:
    - `{}` para arquivos JSON (`package.json`, `tsconfig.json`)
    - `TS` azul para arquivos TypeScript (`playwright.config.ts`, `vite.config.ts`)
    - `JS` amarelo para JavaScript (`server.mjs`, `postcss.config.cjs`)
    - `ℹ` para Markdown (`README.md`)
    - `<>` para HTML (`index.html`)
    - Ícone de engrenagem para `.bat` (`-atualiza_git_1.0.bat`)
  - Botão `Atualizar` e ícones de alternância de painéis na barra superior.
- **Aplicação na Implementação:** Sub-Fatias 4.1, 4.3 e 4.9. Garante que o mapeamento de ícones e fontes tipográficas siga o padrão oficial do VS Code.

---

## 3. Instruções Cruciais para a IA Executora (Arena)

1. **Consulta Obrigatória:** Antes de codificar qualquer sub-fatia (4.1 a 4.9), consulte o print correspondente listado na tabela acima.
2. **Respeito aos Contratos Blindados:** Nenhuma alteração da FATIA-04 pode modificar arquivos blindados do terminal (`VSCodeTerminal.tsx`, `PlatformTerminalBridge.tsx`, etc., conforme `docs/18`).
3. **Não Reinvente:** Copie a hierarquia de componentes e nomes de classes CSS já definidos nos documentos diretores (`04_01` a `04_15`), pois eles foram validados contra estas imagens reais.
