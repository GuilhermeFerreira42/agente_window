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
| **DEBT-04** | Fatia 4 / 6 | Editor / Visualizador | Todas as superfícies auxiliares (inclusive Provedores e Configurações) abrem no **visualizador novo** (Monaco/Webview moderno). | ~~A aba de Provedores ainda abre no visualizador legado~~ **REABERTO em 16/10 (dono):** o componente legado **não existe mais** (verificado ao vivo — a superfície renderiza no `EditorArea`); o que falta é o **posicionamento**: abre em divisão 50/50 com o chat, não **maximizada/centralizada**. O botão "Maximizar editor" já entrega o estado esperado — falta só o **padrão de abertura** (opções em §8.3). | **Alta** | `AuxiliaryBar.tsx`, `EditorArea.tsx`, `components/legacy/` |
| **DEBT-05** | Fatia 6 | Workspace / Dialog | No Windows, clicar em "Open Folder" abre o diálogo nativo Explorer (`IFileOpenDialog`) de seleção de pastas. | Foi criado um seletor customizado/incompleto; no Linux falta fallback que liste direto as pastas de forma integrada. | **Alta** | `WorkspaceSwitcher.tsx`, `server/api/fs` |
| **DEBT-06** | Fatia 6 | Workspace / Sincronização | Ao selecionar "Usar esta pasta", a atualização é **atômica e imediata**: o Explorer carrega a árvore e o Terminal dá `cd` na hora. | **Não é atômico:** só atualiza após mandar mensagem ("oi") no chat. Se trocar de pasta, fica dessincronizado. | **Crítica** | `App.tsx`, `useWorkspace.ts`, `pty-server` (`/api/pty/cwd`) |
| **DEBT-07** | Fatia 6 | Workspace / Recentes | Ao abrir o seletor de pasta, exibe a lista histórica de pastas recentes abertas para troca rápida em 1 clique. | Não exibe pastas recentes; não há histórico de workspaces acessível no diálogo para seleção imediata. | **Média** | `WorkspaceSwitcher.tsx`, `workspacePersistence.ts` |
| **DEBT-08** | Fatia 5 | Layout / Activity Bar | Menu de contexto da Activity Bar permite alternar posição ("Activity Bar Position: Top / Side"). | Posição travada sem opção de mover para a barra superior ou alternar. | **Baixa** | `shell/ActivityBar.tsx`, `layoutState.ts` |
| **DEBT-09** | Fatia 6 | Provedores (Cline UX) | Página de Provedores acessível a qualquer momento pelo menu da conta, inclusive com chat vazio (Landing / Empty State). | **Só abre se o chat estiver ativo**. Na tela inicial (Empty State), o clique não faz nada. | **Alta** | `App.tsx`, `Titlebar.tsx`, `SessionLanding.tsx` |
| **DEBT-10** | Fatia 6 | Provedores (Cline UX) | Múltiplos provedores com formulários ricos (Claude, OpenAI, Gemini, Ollama), modelos e chaves individuais estilo **Cline**. | Implementação básica com cards estáticos, sem a riqueza e flexibilidade de catálogo do Cline. | **Média** | Caminho atual (15/10): `components/ProvidersView.tsx` + `server/providers.ts` + lógica no `App.tsx` → destino `2-inteligencia/casas/provedores` — **entra na FATIA 08, SPEC na PARTE 2B** |
| **DEBT-12** | Fatia 4 (origem) / 11 (execução) | Editor / Abas | **Janela única de abas:** editor de código, Provedores, Browser, Branch Changes e Search na **mesma barra de abas** (conceito VS Code), podendo alternar entre eles como abas de navegador. | **Estado atual:** Provedores/Browser/Changes já são abas do **centro**; o **editor de código** vive em **outra** estrutura (coluna direita, `AttachTab`), com `search`/`diff`/`changes` **duplicados** nos dois modelos. Causa: **exceção autorizada da FATIA 04** (4.7 c4 — `App.tsx:1083-1087`). O editor do centro **não salva**; o da direita **salva**. | **Média hoje / Alta na 11** (é pré-requisito do critério "editar e salvar sem F5") | Avaliação completa em `06 §8.7`; execução = **1.º trabalho da FATIA 11** (D90) |
| **DEBT-11** | FATIA 13 **(a decidir a forma)** | Title Bar / Pesquisa | O topo mantém a **pesquisa / centro de comando** (acesso rápido: "Ir para Arquivo", "Mostrar e Executar Comandos", "Pesquisar Texto", "Abrir Chat Rápido"). A troca de pasta deve ser **integrada dentro da pesquisa**, não ocupar o lugar dela. | A faixa de caminho + botão "Usar esta pasta" ocupou o lugar da pesquisa: o caminho fica fixo no topo e **a pesquisa não existe mais**. | **Alta** | `Titlebar.tsx`, `WorkspaceSwitcher.tsx`, `shell/` |
| **DEBT-13** | FATIA a decidir **(não é da 09)** | Chat / Memória de contexto | O usuário **enxerga e controla** o enchimento do contexto da conversa: **medidor de uso** ("quanto da mesa está ocupada"), opção de **limpar / recomeçar** e política de **compactação** (resumir o passado antes de estourar) — como o **Claude Code / OpenClaude** (ver uso, compactar, limpar) e como o original (erro 413 + `compact_boundary`, registrado na raspagem). | **Não existe nada hoje:** sem contagem de tokens (G5 da §9.2), sem medidor, sem limpeza e sem compactação; a 09 envia o histórico inteiro e, se estourar, mostra erro honesto. | **Média** (não bloqueia a 09; vira dor em conversas longas) | Origem: conversa do dono em **17/10** ("não sei o quanto estou enchendo, não sei se posso limpar"). Para **discutir depois**: tratativas do **OpenClaude/Claude Code** (o dono indicou que já as tem) + `pesquisa_bruta/fatia-06-chat/ERRO_HANDLING.md` (413/`compact_boundary`). **Não implementar sem deliberação do dono.** |
| **DEBT-14** | FATIA a decidir **(sugestão do dono na validação da 09)** | Chat / Seletor de modelos | O seletor de modelos do **composador** (chip ao lado do campo de mensagem) conversa com o **provedor ativo**: a lista oferece **todos os modelos do provedor escolhido** (ex.: os do Ollama local) e o chip mostra quem de fato vai responder. | **Hoje a lista é fixa** (Auto · Claude Sonnet 4 · GPT-5 · GPT-5 mini — herança do mock) e o chip não acompanha o provedor: no vídeo de validação do dono (17/10) quem respondeu foi `gemma4:31b-cloud` (rodapé certo) com o chip escrito "Claude Sonnet 4". | **Média** | Origem: **sugestão explícita do dono no vídeo de 17/10** ("achei que o usuário ia poder selecionar todos os modelos disponíveis aqui"); amarra a **G2** da §9.2 ("modelo efetivo vem do provedor ativo"). Ligar ao catálogo já pronto da 08 (`Buscar modelos`). Só registro — implementar quando o dono decidir. |
| **DEBT-15** | FATIA a decidir **(UX da 09)** | Chat / Provedores | Escolher o provedor que responde no chat seja **difícil de esquecer**: enquanto ninguém estiver ativo, o passo "usar este provedor no chat" aparece de forma óbvia. | O interruptor é uma **bolinha discreta** no rodapé do painel de Provedores; no vídeo de 17/10 o dono esqueceu de marcá-lo e as 4 primeiras mensagens caíram no 409 honesto ("Nenhum provedor está ativo") — ele mesmo concluiu: *"esqueci que tinha a selecionar aqui"*. | **Baixa/Média** | Origem: vídeo do dono em **17/10** + análise da IA (transcrição + quadros). Só registro — qualquer mudança de UX passa por deliberação do dono. |
| **DEBT-16** | FATIA a decidir **(opção C decidida pelo dono em 19/10)** | Agir / Ferramenta de exclusão | O agente pode **excluir arquivos** (o DELETE do CRUD). Pontos a deliberar quando entrar: **lixeira ou permanente?** só arquivo ou pasta também? cartão reforçado ("sem desfazer" + prévia do que será perdido)? | **Não existe ferramenta de exclusão:** o conjunto da FATIA 10 é ler/listar/buscar + criar/escrever (SPEC 2D, D93); o agente não limpa temporários nem desfaz criações — o dono apaga na mão. | **Baixa hoje** (só vira dor se o uso real pedir; reavaliar após a homologação) | Origem: relatório CRUD do dono em **19/10** (Nemotron via LiteLLM) + ponderação com a IA (opções a/b/c) — dono escolheu **(c) decidir depois da homologação**. Ver `06 §9` (limitação) e `07` (19/10). Só registro — implementar quando o dono decidir. |
| **DEBT-17** | FATIA a decidir **(verificação do dono pendente)** | Docs / Conceito | Esclarecer o que é a **"lupa"**: hoje o `06` a define como "painel de alterações / diff rico, tema da FATIA 11" (Q3 + SPEC 2D §4), mas o dono disse em 19/10 que **lupa não é painel de alterações** ("você está confundindo"). Vale a palavra dele: corrigir o registro conforme a definição dele. | Registro possivelmente confuso em 2 pontos do `06`; a IA repetiu o registro. | **Baixa** (conceito; não bloqueia código) | Origem: conversa do dono em **19/10**. Só registro — aguardar a definição dele; depois corrigir Q3 + SPEC 2D §4. |

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

> **STATUS:** **HOMOLOGADA pelo dono em 2026-10-15** ("funcionou perfeitamente"; as 3 dívidas entregues com evidências Playwright). Restam como limitações registradas: PTYs órfãos até a FATIA 12, 5 E2E vermelhos pré-existentes (`09 §2.6`) e o sintoma original do DEBT-06 (não reproduzido no estado anterior sob as condições testadas). Substitui a SPEC da antiga "Fatia 6.1" (renumerada pela D64).
> **DECISÕES DA EXECUÇÃO (15/10):** **DEBT-06 — caminho C** (escolha expressa do dono): o terminal **renasce já na pasta nova** em vez de receber `cd` num shell vivo; a decisão fina "cd real × renascer" fica para a **FATIA 12**, contra o code-server (8080). **DEBT-09 — feito** (`a69137d`): as abas globais do editor deixaram de depender de sessão, então Provedores abre pela Conta na landing. **DEBT-04 — nada a expurgar:** busca no código não encontra resquício do visualizador legado (sem `legacy/`, `ProvidersView` é a única superfície, via `providersSurface`).
> **Limitação registrada (DEBT-06):** os PTYs das abas antigas ficam **órfãos até o idle de 30 min** ao trocar de pasta (o motor do terminal não se toca nesta fatia — `04 §1` e §4); anotado no código para a FATIA 12.
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
   - **Modo homologado em 15/10 (caminho C, escolha do dono):** o terminal **renasce na pasta nova** (mesma entrega visível: prompt no caminho novo, sem F5 e sem digitar nada); o `cd` num shell vivo fica para a FATIA 12. Provado por sonda Playwright: PID do PTY muda e `readlink /proc/<pid>/cwd` = pasta nova (`sonda_03_debt06_sessao.cjs`).
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

# PARTE 2B — SPEC: FATIA 08 — Conectar (Provedores estilo Cline)

> **STATUS: ✅ HOMOLOGADA PELO DONO EM 2026-10-17** — palavras dele: *"vamos concluir a fatia número 8. Eu já homologuei ela, já tá funcionando corretamente"*. Cobre os **10 critérios da §3** + a validação dele **com serviço real** (Ollama local e LiteLLM pelo genérico, 15/10 — `§8.1`). **Pendências que não bloqueiam:** D85 (número de tokens — decisão dele) e A4 (layout inspirado no LiteLLM — futuro). Registro da D89. A **FATIA 09 (Conversar)** passa a ser a fase ativa.
>
> **STATUS ANTERIOR (histórico):** **proposta escrita em 2026-10-15; decisões D81–D84 fechadas com o dono no mesmo dia** (chave em arquivo local + segunda tranca no `.gitignore`; olhinho para revelar; arquivo manda sobre ambiente; 7 nativos + "Compatível com OpenAI"). A **implementação começa ao sinal do dono** (a conversa de arquitetura segue em andamento).
> **REGRA DE OURO:** a **FATIA 09 (Conversar)** não inicia sem os critérios da §3 verdes e homologados. A **FATIA 07 foi homologada pelo dono em 15/10** — a base está liberada.

## 1. Objetivo em 1 frase
Trocar os 3 cards estáticos de Provedores por uma **tela rica estilo Cline** — escolher provedor, preencher chave/URL, escolher ou buscar modelos, **testar conexão de verdade** e persistir tudo localmente — e, de quebra, **a Casa Provedores nasce** (`2-inteligencia/casas/provedores`, D69/D76), sendo o **1.º módulo extraído** do `App.tsx` (D68/D70).

## 2. Arquivos impactados e endereços (casa-a-casa, D69)

| Peça | Hoje | Destino |
|---|---|---|
| Tela (UI) | `src/components/ProvidersView.tsx` (61 l.) | `src/bairros/2-inteligencia/casas/provedores/ui/ProvidersView.tsx` |
| Servidor (dados) | `src/server/providers.ts` (64 l.) | `…/casas/provedores/server/providersRepo.ts` |
| Estilos | `src/styles/providers.css` | `…/casas/provedores/providers.css` |
| Registro da rota | dentro de `src/server/session-persistence/index.ts` | **fica onde está** (é a "prefeitura" do dev server) — passa só a **delegar** ao handler da casa |
| `App.tsx` (síndico) | `providersSurface={<ProvidersView/>}` + import de `./components/ProvidersView` | importa **só a porta única** `./bairros/2-inteligencia/casas/provedores` (diff ~2 linhas) |

**Nascem dentro da casa:** `contract.ts` (tipos da porta) · `index.ts` (**porta única** do cliente) · `descritores/` (**um arquivo de DADO por provedor** — openai, nvidia, anthropic, gemini, ollama, openrouter, deepseek, openai-compat + `registro.ts`; princípio "descritor primeiro" do OpenClaude) · `ui/` (formulário + campos comuns: chave, URL base, modelo) · `client/api.ts` (chamadas ao servidor) · `server/probe.ts` (adaptadores de protocolo: `openai-chat`, `anthropic`, `gemini`, `ollama`) · `README.md` (**cartão de visita da casa** — D76/D78) · `__tests__/`.
**Fronteira (LEGO):** fora da casa, só `index.ts` (cliente) e `server/` (dev server) são importáveis — **teste de fronteira novo**, no padrão do `explorer-search/__tests__/frontier.test.ts`.

## 3. Critérios de Pronto Testáveis
1. **Escolher e configurar** — lista dos **7 nativos + o genérico "Compatível com OpenAI"** (com busca); escolher um monta o formulário dele: chave, URL base (padrão já preenchido nos nativos; **em branco e obrigatória no genérico**), modelo (**lista do descritor ou digitado à mão** — padrão `ModelPickerWithManualEntry` do Cline; no genérico o manual é o caminho principal).
2. **Testar conexão (de verdade)** — botão por provedor; a chamada sai **do servidor** (o navegador não fala com o provedor — CORS/chave segura; a chave **não** viaja em URL). Sucesso = mensagem verde com nº de modelos vistos + tempo. Falha = categoria **honesta**: chave inválida (401/403), endereço inalcançável, timeout (10 s), HTTP N.
3. **Buscar modelos** — botão consulta a lista do provedor e preenche o seletor; **quando o serviço não suportar a busca (ou a chave não permitir), o app diz isso com honestidade** e o campo digitado à mão segue liberado — sempre.
4. **Persistir de verdade** — salvar → **F5** → tudo volta (provedores, modelos, avançados, provedor ativo, chaves **mascaradas**). Arquivo `~/.agente_window/providers.json` (**fora do repo**, 0600, backup `.bak` na migração) + **regra no `.gitignore` como segunda tranca**, com teste automatizado (D81). **Ver a chave (D83):** máscara por padrão; o **olhinho** revela sob clique — o servidor entrega só naquele pedido (`no-store`), nunca em log, nunca em URL. **Origem da chave (D84):** variável de ambiente só é usada **quando não há chave salva**, e a tela mostra a origem.
5. **Múltiplos provedores ao mesmo tempo** (aceite literal do roadmap) — 2+ configurados simultaneamente, cada um com sua chave/modelo; trocar de provedor na tela não perde nada.
6. **Provedor ativo** — escolha explícita de qual provedor o chat vai usar (1.º consumidor: FATIA 09); persistida.
7. **Avançados mínimos** — contexto, máx. de tokens e temperatura por provedor (persistidos; consumidos na 09), com padrões vindos do descritor.
8. **Casa de pé** — teste de fronteira verde; `App.tsx` só fala com a porta única; cartão de visita dentro da pasta; **zero regressão** nos specs existentes (A/B quando alguma falha).
9. **Sem regressão de fundo** — typecheck 0 · unit ≥ baseline **730✓/12✗/16** (as mesmas 12 pré-existentes) · E2E existente sem regressão nova · `sonda_01_debt09.cjs` (Conta→Provedores na landing) continua passando.
10. **"Conexão com sucesso" comprovada** — contra **provedor local simulado** (stub OpenAI-compatible, em pasta de validação externa) no teste automatizado, inclusive através do **genérico**; erro real (401 sem chave) também comprovado; e **roteiro do dono** com chave real (§6-d) — a **NVIDIA NIM** é a porta mais fácil (chave gratuita em `build.nvidia.com`, formato OpenAI).

## 4. Decisões — fechadas com o dono em 2026-10-15 (D81–D84)

**D81 — a chave mora em arquivo local protegido.** Arquivo `~/.agente_window/providers.json`, **fora da pasta do projeto** (o Git nem o enxerga), permissão 0600, backup `.bak-<data>` na primeira migração do formato antigo. **Segunda tranca pedida pelo dono:** regra no `.gitignore` do repositório + teste automatizado que confere (a) arquivo fora do repo, (b) regra presente, (c) nenhum segredo em arquivo versionado.

**D82 — escopo dos provedores: 7 nativos + 1 genérico "Compatível com OpenAI".** Nativos, um arquivo de descritor cada: **OpenAI · NVIDIA · Anthropic · Google Gemini · Ollama · OpenRouter · DeepSeek**. O **genérico** é a porta universal: o dono informa **base URL + chave + modelo** e usa qualquer serviço que fale o formato OpenAI (Groq, Mistral, LM Studio, xAI…). Teste de conexão e busca de modelos rodam **contra a URL informada**; quando o serviço não suportar busca, o app diz isso com honestidade e o campo manual continua liberado. Neste recorte, **1 slot genérico** (permitir vários = evolução pequena, se o dono quiser).

**D83 — chave visível sob clique ("olhinho").** Padrão é a máscara (`••••••a1b2`); o botão revela a chave completa **só quando clicado** — endpoint próprio (`POST /api/providers/reveal`) com resposta `Cache-Control: no-store`; a chave **nunca** vem no carregamento da página, **nunca** entra em log e **nunca** entra em URL. Praticidade (pedido do dono) com o mínimo de exposição.

**D84 — precedência da chave: arquivo > ambiente.** Chave **salva no app manda**; variável de ambiente (`OPENAI_API_KEY`, `NVIDIA_API_KEY`…) é usada **apenas quando não há chave salva** — e a tela mostra a **origem** ("salva no app" / "ambiente do sistema"). Sem variável nenhuma, nada muda: vale sempre o arquivo.

**D82a — o genérico é UM espaço só (opção A, escolha do dono em 15/10):** existe um único slot "Compatível com OpenAI"; o dono troca o serviço (Groov/LM Studio/xAI…) quando quiser. Múltiplos slots = evolução pequena, se um dia precisar.

**Decididas pela IA (registradas para não virar susto):** descritor é **dado, não tela**; busca de modelos por provedor (OpenAI/NVIDIA/OpenRouter/DeepSeek `GET /v1/models` · Anthropic `GET /v1/models` · Gemini `GET /v1beta/models` · Ollama `GET /api/tags`) com modelo manual sempre liberado; endpoints no servidor (`POST /api/providers/test`, `/models`, `/reveal`) com timeout de 10 s; sem *headers* customizados neste recorte; teste E2E contra **servidor de fixture** (`AGENTE_WINDOW_PROVIDERS_PATH`) — **nunca** o arquivo real do dono; o payload traz `storage: 'fixture'|'repo-home'` para a spec se auto-verificar.

## 5. O que NÃO fazer na FATIA 08
- **Nada de chamar modelo/chat/streaming** (FATIA 09), nada de Plan/Act, contexto de agente ou ferramentas (FATIA 10).
- **Não tocar em área congelada:** terminal, `explorer-search/{core,server}`, `EditorArea`, PTY, Monaco (`04 §1`).
- Não implementar catálogo genérico nem "listagem vinda do servidor" (o registro já comporta; a tela não entra).
- Não guardar chave em Git/repo/logs/URL/tela; não criar `.env`.
- Não renomear nem mover nada fora do que a tabela da §2 diz.

## 6. Plano de prova (como a fatia é validada)
- **(a) Unit novos na casa:** fronteira (LEGO) · registro (descritores válidos, ids únicos, protocolos com adaptador; inclui o genérico) · repositório (migração do formato antigo **com backup**, permissão 0600, máscara, **revelar chave** com `no-store` e id desconhecido → 404, **precedência arquivo > ambiente**, nada de chave no Git) · probe (com `fetch` mockado: ok / 401 / rede / timeout; genérico apontando para o stub).
- **(b) Playwright `provedores_fatia08.spec.ts`** contra servidor de fixture + **stub local** de provedor: configurar 2 provedores, testar conexão (sucesso e falha honesta), buscar modelos, F5 e tudo persistido, máscara visível, provedor ativo, zero erros de console.
- **(c) Evidências:** prints das telas + saída dos testes em pasta de validação **externa** ao repo.
- **(d) Roteiro do dono** (em `docs/08`): com chave real, o passo a passo "configurar → testar → reabrir" em 5 minutos.
- **(e) Testes existentes que mockam o formato antigo** (`App.test.tsx`, `fatia07_destravar.test.tsx`) são **atualizados** para o formato novo — atualização prevista, não é mudança de escopo.

## 7. Riscos e limites (registro honesto)
- **URL base livre** (inclusive `localhost`) é o objetivo (Ollama/estúdio local) e não um furo de segurança num app de uma pessoa só; fica anotado como limite consciente.
- **Sem chave real no sandbox**, o caminho de sucesso automatizado é provado contra o stub; a prova com provedor real fica no roteiro do dono.
- **Migração do arquivo antigo** é o único ponto que mexe em dado já existente do dono: faz backup `.bak-<data>` antes de reescrever.
- A tela **não** valida faturamento/limites de conta — só conexão/autenticação de chave.
- **Revelar a chave (D83)** manda o segredo do servidor para a aba **sob clique do dono**: aceitável para uso local; fica registrado que, com o app exposto na rede, quem alcança a tela pode revelar a chave (mitigado: só sob clique, `no-store`, sem log, sem URL).

## 8.3 DEBT-04 reaberto — diagnóstico fechado ao vivo (2026-10-16) e opções
**Como o dono descreveu (canônico):** Provedores, Browser e Branch Changes "ainda abrem no visualizador legado (AuxiliaryBar antiga / coluna estreita)" e deveriam abrir no "editor moderno centralizado".
**O que a verificação ao vivo mostrou (app rodando, 1600×950):**
| Passo | Medição |
|---|---|
| Conta ▸ Provedores | `section.editor-pane` (EditorArea = editor moderno) em `side-pane-editor-only` · **chat 471 px | editor 471 px** (divisão 50/50) |
| Clique em **"Maximizar editor"** (existe e está visível na barra do editor) | chat **some** · editor **942 px** no centro (`editor-maximized`) — é exatamente o layout pedido: `[lista 300][EDITOR flex][Side Bar 274][Activity Bar 48]` |
| Clique em "Restaurar editor" | volta ao 50/50 |
| Componente legado no código | **nenhum** (só sobras de *nome* em migração de banco; `legacy/` removida na tag `legacy-backup-2026-09`) |
**Conclusão:** o débito **não é de componente** (essa parte está atendida) e **sim de padrão de abertura**: hoje a superfície abre no estado dividido; deveria abrir **maximizada**. O A2 ("a tela sobe") é o **mesmo mecanismo** — com o editor maximizado o chat fica oculto e o salto deixa de existir nesse fluxo.
**CAUSA do "a tela sobe" — medida ao vivo em 16/10 (não é código legado):**
| Estado | Cadeia do elemento (medida real) |
|---|---|
| Chat sozinho | `section.session-landing` (altura 315) dentro de `div.desktop-surface-group.side-pane-closed` — **`align:center justify:center`** → centralizado (y=333) |
| Com Provedores aberto | `section.session-landing` (altura 353) dentro de **`div.` sem classe = o painel redimensionável** (`display:block`) dentro de `div.desktop-surface-group.side-pane-editor-only` — **`align:normal`** → **sem centralização → y=36 (topo)** |

**Leitura:** a tela de sessão nova tem só a altura do próprio conteúdo; quem a centraliza é o **pai**. Quando o Provedores abre, o chat passa para dentro de um painel redimensionável **sem** centralização → ela cola no topo. **Não há componente legado envolvido** (verificado: sem `components/legacy/`, sem `legacy/`; a superfície de Provedores renderiza no `EditorArea`). Prints: `validacao_fatia08/landing_1_centralizada.png` e `landing_2_depois.png`.

**Vocabulário oficial dos dois modos (pedido do dono, 16/10):** **"modo anexo"** = editor dividido ao lado do chat · **"modo maximizado"** = editor toma o centro, chat oculto (`[lista 300][EDITOR flex][Side Bar 274][Activity Bar 48]`).

**Opções (decisão do dono pendente):**
| Opção | O que é | Custo/risco |
|---|---|---|
| ~~**A1 — fix da CENTRALIZAÇÃO**~~ ✅ **FEITO (17/10)** | `styles/app.css`: `.session-landing` passou de `min-height: 0` para **`min-height: 100%`** — a landing ocupa a coluna inteira em qualquer pai (bloco ou flex) e o próprio `align-items:center` a centraliza. **Medido:** desvio do centro **29 px** com Provedores aberto (antes: conteúdo colado no topo, ~305 px de desvio). Trava: `e2e/fatia08_modo_abertura.spec.ts` **T1** | Pequeno. Bateria completa rodada: tsc 0 · unit **767✓/12✗/16 skip** (as 12 pré-existentes, provadas em A/B) · E2E 08 **6/6** · contrato novo **4/4** |
| ~~**A2 — abrir em modo maximizado por padrão**~~ → **substituído pela D88** ✅ **FEITO (17/10)** | Implementada a regra do dono: com o editor **aberto** a superfície abre no modo em que ele está; com o editor **fechado**, no **último modo** deixado; **padrão de fábrica = anexo**. Travas: **T2/T3/T4** do contrato novo. Detalhe em §8.6 | Baixo — só a memória faltava (o resto já funcionava) |
| **B — regra geral na FATIA 11** | Definir o roteamento de todas as superfícies auxiliares (Provedores, Browser, Branch/Changes, Configurações) na Casa Editor, com testes | Maior, porém faz junto do trabalho de abas/editor que já está previsto |
| **C — registrar e seguir** | Nada agora; vai para a FATIA 11 sem fix imediato | Zero — o dono convive com o clique extra em "Maximizar" |
**Buraco de teste que deixou passar (lição registrada):** nenhum teste travava **onde/como** a superfície abre — a sonda do DEBT-09 e a bateria da FATIA 08 verificavam apenas que a tela **abre** e sem erros de console. A opção A inclui a trava que faltava.

## 8.7 AVALIAÇÃO DE ARQUITETURA — "janela única de abas" (pedido do dono, 2026-10-17)
**Pedido (palavras do dono):** *"Quero que os provedores e o navegador sejam abertos dentro do Monaco, seguindo o mesmo conceito de integração utilizado pelo VS Code… Atualmente, estamos separando o Monaco em duas partes: uma destinada à edição de código e outra utilizada como uma área independente… centralizar o editor de código, os provedores e o navegador em uma única janela… poder alternar entre eles por meio de abas, da mesma forma que faço em um navegador de internet."*

**Diagnóstico (leitura do código, 17/10) — o dono está certo, com uma correção de endereço:**
| | **Centro** (`components/EditorArea.tsx`) | **Coluna direita** (`AuxiliaryBar` → `modules/explorer-search/ui/attach/`) |
|---|---|---|
| Modelo de aba | `EditorTab` (`types.ts:7`): `file · browser · search · diff · customizations · providers` | `AttachTab` (`contract.ts:123`): `kind: code · search · changes · diff` + `dirty` + `preview/pinned` |
| Monaco | **sim** para `file` (`EditorArea.tsx:651`) | **sim** (`CodeEditorPane.tsx`, 277 linhas) |
| Salvar / "sujo" | **não** (0 ocorrências de save/dirty) | **sim** (salvamento atômico, `AttachArea.tsx` + `CodeEditorPane.tsx`) |
| Extras | Image Preview, ERROR EDITOR, barra de abas, menu, dividir, maximizar | breadcrumbs, outline, changes, diff |
| O que abre ali | **Provedores, Browser, Branch Changes, Search, Personalizações** | **arquivo/código** (o que o Explorer abre) |
**Correção de endereço:** Provedores e Browser **já são abas** do editor central — quem está fora dele é o **editor de código**. Ou seja: o "Monaco em duas partes" é exatamente *código à direita* × *todo o resto no centro*.
**Causa histórica (não é limite do Monaco):** foi uma **exceção autorizada da FATIA 04** (4.7 c4), comentada no próprio código (`App.tsx:1083-1087`): *"Arquivo REAL clicado na árvore abre no EDITOR ANEXO do módulo (`attach.open`, 04_05 §10), **não mais no editor central**"*. Antes disso o clique ia para o centro.
**Duplicação que explica a analogia "aba do Windows Explorer no Chrome":** `search`, `diff` e `changes` existem **nos dois modelos** — são duas estruturas de aba concorrentes.

**O que precisa ser ajustado (escopo técnico da unificação):**
1. **Modelo único de abas** — fundir `AttachTab` em `EditorTab` (uma superfície por tipo, com dono: sessão ou global) e resolver a duplicação `search`/`diff`/`changes`.
2. **Um host de editor** — a aba `file` do centro passa a renderizar o **editor capaz** (`CodeEditorPane`: salvar, dirty, preview/pinned, breadcrumbs, outline) no lugar do Monaco simples de `EditorArea.tsx:651`.
3. **Roteamento** — Explorer, resultado de busca e SCM deixam de chamar `attach.open` e passam a abrir aba no modelo único.
4. **Aposentar a coluna** — `AuxiliaryBar`/`AttachArea`/`attach.css`, o `pendingAttachOpen` e a "Regra 10 (nunca desmonta)" saem; a máquina de estados do painel simplifica de **4 estados → 2** ("tem abas / não tem").
5. **Testes** — **31 testes de unidade** no módulo + **11 specs E2E** tocam o anexo (`sessao_14_editor_anexo`, `sessao_14b/14c/14d`, `sessao_15_activity_bar/editor_maximize/outline_timeline`…). Vários ficam **obsoletos** (testam a coluna que deixa de existir) e precisam ser repontados ou postos em quarentena com registro.

**Ganho colateral (resolve dívida já aberta):** o caso *"arquivo aberto + Provedores ao mesmo tempo"* (adiado para a FATIA 11 em `§8.4`) **deixa de existir por construção** — viram abas irmãs na mesma barra.

**Riscos honestos:** é a área mais testada do app (5.7, 5.8, D2.50, R-040, R-083); mexe em layout + máquina de estados, então screenshot/E2E sentem; e o E2E completo segue inútil no sandbox (88✘ ambientais), logo a régua tem de ser **por spec**.

**Opções:**
| Opção | O que é | Custo/risco |
|---|---|---|
| **A — fatia própria agora** ("11-A: Editor Único") | Faz a unificação já, antes de 09/10 | Alto e interrompe a sequência do MVP (09 Conversar → 10 Agir) |
| **B — abrir a FATIA 11 por aqui** ⭐ | A 11 já prevê **"Casa Editor (abas do EditorArea + gestão de abas)"** e o critério "editar/salvar sem F5" — a unificação é **pré-requisito** dele | Faz 09 e 10 (fecha o MVP) e começa a 11 por este trabalho |
| **C — passo mínimo (rotear o clique para o centro)** | 1 commit: o Explorer abre arquivo como aba central | **Regressão**: o centro não salva (o anexo salva hoje) — só vale se o salvar entrar junto |
| **C+ — passo mínimo com o editor capaz** | Roteia para o centro **renderizando o `CodeEditorPane`** dentro da aba, mantendo o anexo como fallback | Entrega "tudo em abas" já, ao custo de **dois modelos convivendo** (dívida temporária declarada) |
| **D — só registrar** | Nada agora | Zero |

**Recomendação:** **B**. Se o dono quiser **ver o efeito já**, **C+** é o único passo mínimo honesto (C puro seria regressão). Decisão pendente.

## 8.6 A1 + D88 — IMPLEMENTADOS e provados (2026-10-17)
**O que mudou (2 conquistas, ambas com trava):**
| # | Mudança | Arquivo | Prova |
|---|---|---|---|
| **A1** | `.session-landing { min-height: 0 → 100% }` | `src/styles/app.css` | `e2e/fatia08_modo_abertura.spec.ts` **T1**: com Provedores aberto, a landing ocupa **>90 %** da coluna e o conteúdo fica a **<80 px** do centro (medido: **29 px**; antes o conteúdo colava no topo) |
| **D88** | `centerEditorMaximized` em `ShellVisibility` (persistido em `workbench.sessions.layout.v1`) + `useState` do App lê/grava | `src/domain/layoutPersistence.ts`, `src/App.tsx` | **T2** (aberto em maximizado → Provedores abre maximizado, chat fora de cena) · **T3** (reload preserva; com o editor fechado abre maximizado) · **T4** (quem nunca maximizou abre em anexo) |
**Por que a D88 foi barata:** o "editor aberto em maximizado → abre maximizado" **já funcionava** (o toggle não é resetado). Faltava só a **memória**. Não toquei no `layout.state.editorMaximized` (o homônimo que maximiza a **coluna anexa**, 5.7/RF-07) — ficou documentado para ninguém confundir.
**Migração:** layout antigo (sem a coluna nova) carrega com `centerEditorMaximized: false` = anexo — silencioso, sem quebrar. Teste dedicado cobre isso.
**Números (17/10):** typecheck **0** · unit **767✓ / 12✗ (pré-existentes, A/B idêntico) / 16 skip** · E2E FATIA 08 **6/6** · contrato novo **4/4** · evidências em `validacao_fatia08/a1_*.png` (externo ao repo).

## 8.4 Classificação das dívidas e medição de Browser/Branch Changes (2026-10-16, conversa — sem código)
**Pergunta do dono: "isso é dívida da fatia 7 ou não?" — resposta em camadas:**
| Item | Origem | Verificação | Situação hoje |
|---|---|---|---|
| **DEBT-04 (Provedores)** | nasceu nas **fatias 4/6** (linha canônica do `06`: "Fatia 4 / 6") | era item do escopo da **FATIA 07** ("Destravar" = DEBT-06+04+09); a conferência de 15/10 declarou "nada a expurgar" e **errou a régua** (procurou componente, não posicionamento) | **reaberto 16/10** (D87); falta só o **padrão de abertura** |
| **Browser** | **não é dívida** — é **funcionalidade da FATIA 11 (Conferir)** | expectativa antiga (specs de 17/09) em **quarentena** (D80) — expectativa morta | **medido 16/10:** abre no **editor moderno** (aba), em **modo anexo**; conteúdo real é da FATIA 11 |
| **Branch Changes** | idem acima — **FATIA 11 (SCM/Diff real)** | idem | **medido 16/10:** abre no **editor moderno** (aba), em **modo anexo**; diff real é da FATIA 11 |

**Medição ao vivo (app rodando, 1600×950, sessão ativa):** clicar em *"Abrir alterações no editor"* (Titlebar) e *"Abrir navegador no editor"* → em ambos os casos o painel cai em `section.editor-pane` (**EditorArea = editor moderno**), em `side-pane-editor-only`, com **chat 471 px | editor 471 px** (modo anexo) e a **aba** correspondente na barra do editor ("Branch Changes" / "Browser"). O próprio estado vazio do editor declara: *"Browser, Search e Branch Changes abrem aqui — não na barra auxiliar."* Prints: `validacao_fatia08/aba_branch_changes.png`, `aba_browser.png`.
**Conclusão:** para as **três** superfícies (Provedores, Browser, Branch Changes) o que resta é a **mesma decisão de POSICIONAMENTO** (modo anexo × modo maximizado) — nenhuma tem componente legado, nenhuma "nasceu" na FATIA 11.

**A2 — DECIDIDO em 17/10 (dono): abertura segue o estado do editor (D88).**
| Situação ao abrir a superfície | Regra decidida |
|---|---|
| Editor **aberto em modo anexo** | abre em **modo anexo** |
| Editor **aberto em modo maximizado** | abre em **modo maximizado** |
| Editor **fechado** | abre no **último modo** que o usuário deixou o editor (memória entre reloads) |
| Nunca usou (primeira vez) | **modo anexo** (padrão de fábrica) |
| **Arquivo aberto + Provedores ao mesmo tempo** | **FATIA 11** — decidir junto do trabalho de abas (escolha do dono) |

**ACHADO TÉCNICO decisivo (17/10, leitura do código):** existem **DOIS "maximizados" diferentes** no app, e só um é o que o dono quer:
| Estado | Onde | Persistido? | O que faz |
|---|---|---|---|
| `layout.state.editorMaximized` (`shell/layoutState.ts:33`) | usado em `App.tsx:2075` (classe no `.top-right-section`) | **SIM** (localStorage, "F5 mantém") | maximiza a **coluna anexa (AuxiliaryBar)** — recurso antigo 5.7/RF-07, ligado por eventos `editor.attachMaximized/Restored` |
| `editorMaximized` local (`App.tsx:550`, `useState(false)`) | usado em `App.tsx:2136` (ramo que renderiza só o editor) e no botão **"Maximizar editor"** (`App.tsx:1977`) | **NÃO** | é o modo que o dono chama de **maximizado**: chat some, editor toma o centro (o que foi medido: 471 → **942 px**) |
**Consequências:** (a) **o "último modo" NÃO é lembrado hoje** — o estado que importa nasce `false` a cada carga, então quem maximizou ontem abre em anexo hoje; (b) **nome igual para coisas diferentes** — implementar a D88 sem separar os dois pode maximizar a coluna errada; (c) a parte "editor já aberto em maximizado → Provedores abre maximizado" **já funciona hoje** (o toggle não é resetado ao abrir superfície), falta a memória e o A1.

**A2 como o dono formulou em 16/10 (histórico, agora decidido):** *"Abertura baseada no estado do editor — Provedores (e futuros painéis) devem abrir no modo atual do editor de código (anexo ou maximizado). O pulo do chat não deve acontecer caso esteja abrindo no modo anexo."*
- Parte **"o pulo não deve acontecer"** = **A1** (independente do modo; vale para anexo e maximizado) — **continua separado da D88**;
- Parte **"seguir o modo atual do editor"** = regra de roteamento — dois casos a decidir em palavras: **(i)** landing sem arquivo (qual é "o modo atual"? padrão hoje = anexo) e **(ii)** arquivo aberto + Provedores (hoje o arquivo fica na coluna anexa e o Provedores ocupa o centro espremido — decisão de abas, casa natural = FATIA 11).

## 8.5 Autoavaliação de maturidade — "3 níveis" (2026-10-17, a pedido do dono)
O dono enviou um vídeo de terceiro (anúncio de curso, 60 s) que descreve **3 níveis de desenvolvimento com IA**: **(1) vibe coding** (prompt → aceita tudo → torce) · **(2) configurações** (skills, rules, MCP servers) · **(3) workflow assistido** (spec antes do código, testes automatizados no loop, code review que bloqueia deploy, contexto por grafos, loop engineering, **métricas**: carga, complexidade ciclomática, estrutura de dependências, cobertura). Análise completa em `/home/user/midia_16-10/ANALISE_VIDEO_16-10.md` (fora do repo).

**Onde estamos — medido em 17/10, não estimado:**
| Pilar do nível 3 | Temos? | Evidência |
|---|---|---|
| Spec antes do código | ✅ | SPEC por fatia, critérios de aceite, plano de prova, dívidas rastreadas |
| Decisões registradas | ✅ | D1–D87 (`05`), histórico (`07`), vocabulário canônico |
| Testes no loop | 🟡 manual | tsc + Vitest + Playwright antes de cada commit — por **disciplina**, não por automação |
| Teste como trava confiável | 🟡 **furo provado** | **DEBT-04 escapou** (`09 §13.3`): o teste media "abre", não "onde/como abre" |
| CI / gate bloqueante | ❌ | **sem `.github/workflows`**, sem husky/lint-staged; D62 = sem push |
| Cobertura medida | ❌ | meta **90/90/85/90** em `vitest.config.ts`, mas **nunca medida**; em 17/10 a suíte completa **não gerou relatório** (vermelha); só subconjunto verde gerou |
| Complexidade ciclomática · estrutura de dependências · carga · contexto por grafos | ❌ | nada instalado (candidatos dependency-cruiser/eslint-plugin-boundaries só anotados) |

**Placar medido em 17/10:** unit **765✓/12✗/16 skip** e, numa 2.ª execução, **763✓/14✗/16 skip** (flaky 12→14); 21 E2E em quarentena; E2E completo inútil no sandbox (88✘ ambientais).

**Veredito: nível 2 sólido com um pé no nível 3 ("2,5")** — o *cérebro* é de nível 3 (spec, decisões, evidências, homologação); o *robô* é de nível 2 (nada é automaticamente bloqueante; a métrica principal nunca foi medida).

**Falta para fechar o 3 (proposta, sem código):** (1) `npm run ci` único = typecheck+lint+testes+cobertura, que **falha**; (2) hook de pre-commit chamando o `ci`; (3) **zerar o vermelho** (12–14✗ + 16 skip + 21 quarentena → 0); (4) cobertura visível no `ci`; (5) estrutura de dependências (dependency-cruiser ou eslint-plugin-boundaries); (6) complexidade ciclomática (regra `complexity` do ESLint); (7) E2E confiável (separar ambiente de lógica); (8) code review — hoje é revisão por IA antes do commit; GitHub Actions só quando houver push (D62 mantém sem push). **Nada disso está nas fatias 08–10** — decisão de dono: virar fatia própria ou entrar na 13/16.

## 8. Estado da implementação da FATIA 08 (2026-10-15) — **HOMOLOGADA em 17/10 (D89)**; o registro abaixo é o retrato da época da implementação
- **Código:** `bairros/2-inteligencia/casas/provedores` — `contract.ts` · `descritores/{nativos,registro}.ts` · `server/{providersRepo,probe,rotas}.ts` · `ui/{ProvidersView.tsx,client/api.ts}` · `providers.css` · `README.md`. **Legado removido:** `src/server/providers.ts` (+ teste), `src/components/ProvidersView.tsx`, `src/styles/providers.css`. `App.tsx` importa **só o barrel**; o plugin do dev server delega as rotas (`rotaPertenceAoModulo`, D71).
- **Commits (sem push):** `f87981c` · `2b371c2` · `fde5f0f`.
- **§6 (plano de prova) atendido:** (a) unit da casa **37/37** + suíte completa **765✓/12✗/16 skip** com typecheck 0; (b) Playwright `e2e/provedores_fatia08.spec.ts` **6/6** contra stub local; (c) evidências (prints + saída) em `validacao_fatia08/` — **fora do repo**; (e) mocks de `App.test.tsx` e `fatia07_destravar.test.tsx` atualizados para o formato **v2**.
- **§6(d) pendente:** roteiro do dono com **chave real** — escrito em `08` **PARTE C**.
- **Defeitos reais corrigidos durante a prova:** Salvar enviava a lista antiga; `nome` do genérico se perdia no 2.º salvamento (ambos em `fde5f0f`, com teste).
- **Critérios de pronto (§4) — status:** todos verdes na prova automatizada; a **homologação** exige o roteiro do dono (chave real) e o aceite dele.

## 8.1 Validação do dono com serviço REAL (2026-10-15/16) — evidência do vídeo dele
O dono gravou um vídeo (2min33s, 15/10 21h21) testando no computador dele e o analisamos em duas IAs independentes (transcrição + frames + segunda IA com visão de vídeo). **Resultado:**
- **Ollama local** (`http://localhost:11434`) → faixa verde **"Conexão aprovada. O serviço respondeu em 209 ms e mostrou 5 modelos."**
- **Genérico "Compatível com OpenAI" → pool LiteLLM** (`http://0.0.0.0:4000`, apelido `meu-pool`) → **"…respondeu em 158 ms e mostrou 4 modelos."**
- Chave **sempre mascarada** ("cole a chave aqui" / pontinhos) em todo o vídeo; aviso do arquivo local visível; **nenhum erro, nenhuma tela cinza**.
- Veredito do dono: "o código também foi muito bom. Porém tem essas pequenas coisas que precisa de ajuste" → **homologação não declarada ainda**.

### 8.2 Pendências abertas (D85/D86) — nada de código sem a ordem do dono
| # | Pendência | Destino provável |
|---|---|---|
| P1 | **A1/DEBT-04 — "visualizador antigo × novo"**: diagnóstico FECHADO em 16/10 (§8.3; classificação e medição de Browser/Branch em §8.4). Sem componente legado; falta o padrão de abertura maximizado. | Decisão do dono (opções em §8.3) |
| P2 | **A2 — "a tela sobe": causa CONFIRMADA no código (16/10).** O dono marcou na imagem que o que sobe é **a tela central do chat** (a landing "Nova sessão em workspace-local") — resposta **B**. Mecanismo: a centralização da landing depende do estado do painel lateral — `isChatCentered(inputs) = (resolveSidePaneState(inputs) === 'closed')` (`domain/sidePane.ts`). Sem aba aberta, os inputs são `{hasEditorTabs:false,…}` → estado **`'closed'`** → entra a classe `chat-centered` (`.desktop-surface-group.chat-centered{align-items:center}` + faixa de 950 px) e a landing fica centralizada. Ao abrir **Provedores** (aba **global**, sem dono de sessão — justamente o caso do DEBT-09), `hasEditorTabs` vira `true` → estado **`'editor-only'`** → a classe **sai** e o conteúdo ancora no topo. Regra herdada do desenho original ("Chat centers itself in the 950px band only when it is the sole surface"); a **landing** é que herda a regra e dá o salto. | Junto do P1 ou **FATIA 13** — corrigível de três formas (A pequena: manter a landing centralizada com aba global aberta · B de rumo: sai de graça se Provedores passar a abrir na superfície nova · C: deixar como está) |
| P3 | **D85 — valor de contexto/máximo de saída**: dono ainda vai decidir o número que usa; nada de teto artificial no app. | Aguardando decisão |
| P4 | **A4 — "copiar o layout do LiteLLM"** (ele citou LiteLLM na fala; a tela do fim do vídeo era um estudo Open WebUI "Models", Demo Mode). Ordem: **"vamos apenas conversar por enquanto"**. | Futuro, sem fatia definida |

---

# PARTE 3 — Roadmap Completo Spec-Driven (Fatias 07 a 16 — renumeração D64 de 2026-10-13)

Todas as fatias estruturadas sob o padrão **especificação prévia, escopo vertical e critérios rígidos de aceitação**. **Cada fatia agora tem duas tarefas: a FUNÇÃO (o que entrega) e a CASA (o que muda de endereço no `App.tsx`)** — a fila e a arquitetura andam juntas (D68/D69; condomínio no `04 §2.2`).

> **Referências raspadas (14/10, D77):** `docs/arquivo_morto/referencias/` — VS Code 1.135 · OpenClaude · Cline (Provedores) · Arquitetura limpa; **índice + 12 notas** (`00_INDICE.md`), cada uma dizendo **para qual fatia serve**. Consultar antes de redescobrir.

### FATIA 07 — Destravar (Dívidas Estruturais) — era a 6.1
- **Objetivo:** Sincronização atômica Workspace-Explorer-Terminal + Provedores na landing + eliminação do visualizador legado (só as 3 estruturais).
- **Bloqueio:** bloqueia a FATIA 08 (e todo o caminho do MVP). **SPEC completa na PARTE 2.**

### FATIA 08 — Conectar (Provedores estilo Cline) — era a 09
- **Objetivo:** Gestão rica de múltiplos provedores de IA, inspirada no Cline.
- **Escopo:** formulários dedicados (OpenAI, Anthropic, Gemini, Ollama local, OpenRouter, DeepSeek…), seleção dinâmica de modelos, teste de conexão, persistência local segura (`~/.agente_window/providers.json`) sem expor credenciais. **Absorve a DEBT-10.** **SPEC detalhada: PARTE 2B** (escrita em 15/10; D81–D84 fechadas com o dono). **IMPLEMENTADA em 15/10** (`f87981c`/`2b371c2`/`fde5f0f`; estado e prova na PARTE 2B §8) — falta a **validação do dono com chave real** (`08` PARTE C). **Casa:** `2-inteligencia/casas/provedores` nasceu aqui (1.º módulo extraído, D68/D69).
- **Critério de aceite:** configurar múltiplos provedores, testar conexão com sucesso e persistir entre reloads.
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-06-chat/GUI_PROVEDORES_CLONE.md` + `PROVIDERS_EXEMPLO.json`; **e a nota nova:** `arquivo_morto/referencias/cline/01_tela_de_provedores.md` (campo a campo, com os caminhos do repo do Cline) + `referencias/openclaude/04_provedores_descriptor_first.md` (o esqueleto de dados por trás da tela).

### FATIA 09 — Conversar (Chat real + Streaming) — era a 10
> **STATUS (17/10): IMPLEMENTADA EM 5 COMMITS E VALIDADA NA MÁQUINA DO DONO — homologação formal pendente (`08` PARTE D).** Commits: `5968b70` (casa Conversa + rota `/api/chat`) · `9e2c703` (streaming no servidor: fio SSE + Parar + réguas) · `c0af6fe` (ligação no chat + Parar honesto) · `90f75c8` (E2E 5 provas + 3 consertos de F5/histórico) · **C5 = documentação** (esta revisão). Provas: tsc **0** · unit **813✓ / 12✗ pré-existentes / 16skip** · E2E `conversa_fatia09` **5/5 em 4 rodadas seguidas** (stub local 4599) · **validação real do dono em 2 vídeos de 17/10** (Ollama local respondendo, Markdown completo, rodapé com o modelo efetivo, provedor ativo persistindo). Pendências registradas pós-09: **DEBT-14** (seletor de modelos do composador × provedor ativo) e **DEBT-15** (bolinha do provedor ativo fácil de esquecer). **Fase ativa passou à FATIA 10 — Agir** (SPEC: `PARTE 2D`, fim deste arquivo).
> **Regra do projeto (40 %) cumprida:** ✅ **SPEC escrita em 17/10 — `PARTE 2C` no fim deste arquivo.** **5 de 5 decisões fechadas** (Q1–Q5 na §4) e **"pode começar" do dono** recebido em 17/10 — a fatia foi executada por completo.
- **Objetivo:** Ligar o chat aos provedores configurados, com streaming real.
- **Escopo:** rota de servidor que fala com o provedor + resposta em streaming + Markdown completo com blocos de código + histórico por sessão. **Substitui o mock atual de `App.tsx::handleSend`.**
- **Critério de aceite:** enviar prompt e receber resposta fluida, em streaming, do provedor escolhido.
- **O que a FATIA 08 já deixou pronto (reusar, não refazer):** provedor **ativo** persistido · chaves em arquivo local (`~/.agente_window/providers.json`, 0600) com "arquivo manda sobre ambiente" (D84) · **descritores** por provedor com `baseUrl`/modelo padrão · **sonda de conexão** por protocolo (`openai-chat`, `anthropic`, `gemini`, `ollama`) com timeout de 10 s · catálogo de modelos · ajustes avançados (contexto/máx. tokens/temperatura). A 09 **consome** isso — não recria.
- **O que precisa nascer na 09 (provável):** rota de **conversa** no servidor (a chave **não** sai do servidor; o navegador nunca fala com o provedor), **streaming** até a tela (SSE ou equivalente), renderização de **Markdown com blocos de código**, **histórico por sessão** (hoje o chat é mock e não persiste por sessão de verdade), tratamento **honesto** de erro (sem chave, 401, timeout, serviço fora).
- **Plano de prova (proposto):** durante a construção, **provedor simulado local** (o mesmo padrão da 08: stub OpenAI-compatible em porta local, com respostas em pedaços) — cobre streaming, erro e "sem chave" sem depender de terceiros. **Validação final com serviço real: no computador do dono** (Ollama local, que ele já usou na 08, é o caminho mais barato — não exige chave). **Regra de segurança registrada (D91):** **nunca** pedir/colar chave de API no chat; a chave mora no arquivo local do app e a validação com chave real é feita pelo dono, na máquina dele.
- **Decisões a fechar com o dono antes de abrir a 09:** (1) qual provedor será o "padrão de prova" (recomendo **Ollama local**); (2) se o histórico por sessão entra já nesta fatia ou fica como refinamento; (3) se o Markdown entra completo (tabelas, listas, código com cópia) ou mínimo na primeira volta.
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-08-streaming/`, `fatia-07-input/`; **nota nova:** `referencias/openclaude/01_loop_do_agente_e_ferramentas.md` (limites, guardas anti-loop).

### FATIA 10 — Agir (Tools + Permissões) — era a 11 — **FECHA O MVP**
> **STATUS (18/10): FASE ATIVA — SPEC `PARTE 2D` FECHADA: decisões Q1–Q4 respondidas pelo dono (D93) e execução autorizada ("começe a 10"). Execução em 5 commits (C1–C5), começando pela casa Agir.**
- **Objetivo:** o agente age no **sistema de arquivos** com autorização do usuário — **recorte fechado (D72): só arquivos; terminal na FATIA 12**.
- **Escopo:** ferramentas ligadas ao servidor existente (`/fs/*` + **`fsHost`** — escrita atômica **já pronta**, conferida no código em 18/10: `writeFileAtomic`, temp+rename) + card **[Permitir] / [Negar] / [Permitir na Sessão]** + trava anti-loop (3 chamadas idênticas). Detalhe completo: **PARTE 2D**, fim deste arquivo.
- **Critério de aceite:** o agente propõe uma ação (ex.: criar arquivo) e **só executa após autorização** — é o teste final do MVP.
- **Q6 RESPONDIDA (D72, 14/10):** no MVP o agente mexe **só em arquivos** (ler, criar, escrever, listar, buscar); **rodar comandos no terminal é bloqueado** — mais poderoso e mais perigoso (ex.: `rm -rf`), exige protocolo de permissão mais maduro e entra na **FATIA 12**.
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-06-chat/PERMISSOES.md` (card de 3 botões + resposta `allow/deny` + guardião `doomLoop` de 3 chamadas) e `fatia-09-tools/` (worktree/painel de alterações — **fora do escopo da 10**, são tema das fatias 11/15). *(A nota externa `referencias/openclaude/03_sessoes_e_permissoes.md` não sobreviveu à faxina de 17/10 — a referência válida hoje é o PERMISSOES.md, dentro do repo.)*

### FATIA 11 — Conferir (File Ops + SCM/Diff) — eram as 07 + 08
> **ABERTURA DECIDIDA (D90, 17/10):** a fatia **começa por DEBT-12 — "janela única de abas"** (avaliação completa em `§8.7`): fundir os **dois modelos de aba** (`EditorTab` × `AttachTab`), trazer o **editor que salva** para a aba central, rotear Explorer/Busca/SCM para a barra única e **aposentar a coluna da direita** (`AuxiliaryBar`/`AttachArea` + `pendingAttachOpen` + Regra 10; máquina de estados do painel **4 → 2**). É **pré-requisito** do critério de aceite abaixo ("editar e salvar sem F5"). Ganho colateral: o caso "arquivo aberto + Provedores ao mesmo tempo" (`§8.4`) **deixa de existir por construção**. Repontar **31 testes de unidade + 11 specs E2E** que tocam o anexo; os obsoletos vão para quarentena **com registro** (nunca apagar em silêncio).
> **Pendência do dono (D86/A1) — RESOLVIDA em 17/10:** a definição de "o novo" foi fechada (`D87`, `§8.3/§8.6`) — não havia componente legado; o padrão de abertura foi corrigido (A1) e a regra do modo ficou na `D88`. O que resta desta família já está na `D90`. 
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
- **Referência raspada (14/10):** `referencias/vs-code-1.135/04_terminal_e_pty.md` (pty host, batimento, capacidades, menu de contexto, terminal-como-aba; e o achado do agente usando terminal na 1.135 — a fronteira da D72).

### FATIA 13 — Refinamentos + Casas Sessões & Command Center
> **Pendência do dono (D86/A2):** tela de Provedores "gruda no topo" × tela de novo chat centralizada — refinamento visual apontado no vídeo de 15/10. — absorve DEBT-05/07/11 + D2.23
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
- **Entrega (D78):** a padronização final do código + o pacote de documentação de entrega **não** entram aqui — viram a **etapa ENCERRAMENTO**, logo depois desta fatia (ver PARTE 4).

---

# PARTE 4 — Débitos Técnicos Secundários & Históricos

### Higiene de Testes — faxina em 2 ondas (D74, 2026-10-14)
- **Onda 1 — skip: ✅ EXECUTADA (2026-10-15, FATIA 07, commit `9985b9e`).** Os **13 E2E mortos históricos** estão em `test.skip` com 2 linhas de comentário apontando o registro (`09 §2.4`) e o conserto na FATIA 12. Skips da suíte E2E: **6 → 19**. O contrato anti-trapaça (`e2eAssertionContract.test.ts`) passou a contar `skip` como declaração e, em troca, exige que spec 100 % pulada cite `docs/09` (**D79**).
- **Onda 2 — conserto:** as **9 falhas de unit do terminal** (P4) são consertadas na **FATIA 12**, junto do transplante.
- **Baseline atualizado (2026-10-15, HEAD `9985b9e`):** typecheck 0 · `vitest run` → **730 pass / 12 falhas / 16 skip** (12 = 9 P4 do terminal + `iconLabels` + `themeTokens` + `visualStates`; todas pré-existentes, provadas com `git stash`). Baseline histórico anterior: 722/9/16 em `f2ff5a3`.
- **Falhas E2E pré-existentes FORA da lista §2.4 (triagem 15/10):** 7 testes — `sessao_01` T2/T3, `sessao_08` T1, `sessao_09` T5, `sessao_10` T1, `sessao_05_single_pane` T2/T6 — conferidos no A/B em `e02e486` (falham igual nos dois estados). **Destino (D80, 15/10):** os **2 investigados** (`sessao_10` T1 e `sessao_05` T2 — expectativa morta da coluna "Detalhes") entram em **quarentena com nota** (skips 19 → **21**); os **5 restantes seguem vermelhos** e registrados em `09 §2.6` até a fatia da área (12/13).
- **P7 — Flakes de digitação:** latência em testes de search/explorer — tratar na fatia que mexer nesses testes (a partir da 11/13).
- **D2.72 — Campo `auxiliaryVisible` órfão:** limpeza de código sem impacto visual reservada para a **FATIA 14 (Painéis)**.
- **D2.1 a D2.13:** itens de acabamento de árvore e decorators — absorvidos pelo roadmap acima; revisar quando a fatia correspondente abrir.

### Nota de fronteira (D70)
- As dívidas **DEBT-ROBUST-01..04** (migração MVP → **Condomínio Robusto**) **não pertencem a este roadmap** — vivem no `04 §2.2` (gatilhos e custos) e no `05` (D70). Só migram **com gatilho + ordem expressa do dono**, nunca no meio de uma fatia.

### ENCERRAMENTO — Padronização & Entrega (após a FATIA 16 — D78)
> **Não é fatia numerada** (a numeração segue 07–16); é a **etapa de entrega**, feita quando o dono mandar, depois do polimento.
- **Padronização do código (o "pente-fino"):** revisar nomes, comentários e o uso da língua de alto nível em todo o código (D76) — o objetivo é o projeto **se explicar sozinho** para qualquer pessoa/IA que pegue o código sem ler documento.
- **Pacote de documentação de entrega (alvo enxuto ~6 arquivos):** README da raiz · `AGENTS.md` atualizado · **cartões de visita por casa** (revisados) · glossário curto dentro do repo · decisões destiladas (versão enxuta do `05`).
- **Destino dos canônicos da obra:** viram `arquivo_morto` — são a **planta da construção**, não o manual do prédio.
- **Candidatos registrados na raspagem (D77):** fiscal automático de fronteiras (dependency-cruiser/ts-arch — receita em `referencias/arquitetura-limpa/02…`); avaliar junto com o gatilho do Robusto.
- **Kit de testes:** bateria final verde (typecheck 0; suítes de terminal já consertadas na FATIA 12; E2E mortos já em `skip` desde a FATIA 07).
---

# PARTE 2C — SPEC: FATIA 09 — Conversar (Chat real + Streaming)

> **STATUS:** escrita em **2026-10-17**, a pedido do dono ("pode começar" = começar pela SPEC). **Nenhuma linha de código escrita.** Aguarda **aprovação do dono** e a resposta às **3 decisões** da §4.
> **Origem:** a FATIA 08 foi **homologada em 17/10** (D89) — a base está liberada. Regra do projeto: **40 % especificando antes de codar**; e a fatia só abre depois do aval.

## 1. Objetivo em 1 frase
Trocar a **resposta simulada** do chat (o `setTimeout` de 1 s em `App.tsx::handleSend`, que devolve texto fixo) por uma **conversa real** com o **provedor ativo** configurado na FATIA 08, com a resposta **aparecendo aos poucos** (streaming), Markdown já renderizado e erro honesto quando não der.

## 2. O que já existe (o terreno medido em 17/10 — para NÃO refazer)

| Peça | Onde | Estado |
|---|---|---|
| Bolha da mensagem + Markdown | `components/ChatPanel.tsx:193` — usa **`react-markdown` + `remark-gfm`**, já instalados, com blocos de código e botão de copiar | **pronto** |
| Carona do "digitando" | `ChatMessage.running?: boolean` (`types.ts:19`) — já existe e a bolha já sabe exibir | **pronto** |
| Botão **Parar** | `App.tsx:1657 handleStop` — hoje limpa os timers simulados da sessão | **existe**, precisa passar a **abortar o pedido real** |
| Provedor **ativo** + chave + URL + modelo | Casa Provedores (FATIA 08), arquivo local `~/.agente_window/providers.json` (0600), D84 | **pronto** |
| Descritores por provedor (URL padrão, modelos) | `casas/provedores/descritores/` | **pronto** |
| Sonda de conexão por protocolo (openai-chat / anthropic / gemini / ollama), timeout 10 s | `casas/provedores/server/probe.ts` | **pronto — reusar os adaptadores** |
| Histórico: as mensagens já são gravadas em `.jsonl` por sessão | `server/session-persistence/transcripts.ts` + `index.ts:39-78` | **pronto** (verificar na prova que sobrevive ao F5) |
| **Rota de conversa** | — | **NÃO EXISTE** (`/api/chat*` não aparece no código) |
| Chamada real ao provedor com streaming | — | **NÃO EXISTE** |

## 3. Critérios de Pronto Testáveis
1. **Conversa de verdade** — enviar um prompt e receber resposta **do provedor ativo**; nenhuma resposta fixa de `setTimeout` sobrevive no fluxo (o mock sai do caminho, não fica de reserva silenciosa).
2. **Streaming visível** — o texto **aparece aos poucos** na bolha (primeiro pedaço em < 2 s num provedor local; a bolha cresce), com o indicador de "trabalhando" ligado enquanto não termina.
3. **Fim do pedido** — ao terminar, a bolha perde o `running`, o horário é gravado e o status da sessão volta a "concluída".
4. **Parar funciona de verdade** — clicar **Parar** interrompe o pedido **no servidor** (o provedor deixa de ser consumido) e a bolha fica marcada como cancelada, preservando o texto que já chegou.
5. **Markdown** — a resposta renderiza **negrito, listas, tabelas e blocos de código** com o botão de copiar (o componente já existe; a prova é ponta a ponta).
6. **Erros honestos, sem inventar resposta** — quatro casos, com mensagem clara e **sem texto falso** na bolha: (a) **nenhum provedor configurado**; (b) **chave ausente/ inválida** (401/403); (c) **endereço inalcançável / serviço fora**; (d) **timeout** (limite a definir — proposta: 60 s sem primeiro byte; 10 s é curto demais para modelo local).
7. **A chave nunca sai do servidor** — o navegador **não** fala com o provedor; a chave **não** aparece em URL, log ou no corpo de resposta; teste automatizado confere que nenhuma resposta da API contém o valor da chave.
8. **Histórico por sessão** — a conversa continua lá depois de **F5** e ao **trocar de sessão** (mensagens não vazam para outra sessão); o `.jsonl` da sessão contém os pares.
9. **Trocas de provedor** — trocar o provedor ativo na tela de Provedores muda **quem responde** na conversa seguinte, sem reiniciar o app.
10. **Sem regressão** — typecheck **0** · unit ≥ baseline **767✓/12✗/16** (as mesmas 12 pré-existentes) · E2E FATIA 08 **6/6** · contrato de abertura **4/4** · nenhum teste apagado ou silenciado.

## 4. Decisões a fechar com o dono (5 — Q4/Q5 nasceram do diagnóstico da §9)

| # | Pergunta | Opções | Minha recomendação |
|---|---|---|---|
| **Q1** | **Qual provedor é o "padrão de prova"?** | (a) **Ollama local** (`http://localhost:11434`) · (b) provedor simulado só · (c) um serviço pago | **(a) Ollama local** — roda na máquina do dono, **não exige chave** (D91), e foi o que ele já validou na 08. O simulado fica para a bateria automatizada **→ RESPONDIDO (17/10): Ollama OU LiteLLM + Nemotron (porta personalizada, compatível com OpenAI) — os dois suportados; o dono escolhe no dia da validação.** |
| **Q2** | **Histórico entra já nesta fatia?** | (a) entra (é critério) · (b) fica para refinamento | **(a) entra** — o `.jsonl` já existe; o custo é **verificar**, não construir. Sem isso a conversa "some no F5" e a fatia não parece pronta **→ RESPONDIDO (17/10): sim — histórico e prova de F5 ficam como parte da fatia.** |
| **Q3** | **Markdown mínimo ou completo?** | (a) completo (tabelas, listas, código com cópia) · (b) mínimo | **(a) completo** — **já está pronto** no `ChatPanel`; não faz sentido degradar o que existe **→ RESPONDIDO (17/10): confirmado — formatação completa.** |
| **Q4** | **Anexos: o conteúdo do arquivo entra na 09?** | (a) só o **nome** (como hoje, com aviso de que não é lido) · (b) ler e enviar o **conteúdo** de arquivos pequenos · (c) adiar | **(a) na 09** — anexar arquivo e o modelo não ler é aceitável **se estiver escrito**; ler arquivo é uma **capacidade de agente** e pertence à FATIA 10 (Agir), junto com as ferramentas. Fazer (b) agora inflaria a 09 e misturaria duas fatias **→ RESPONDIDO (17/10): letra (a), depois da pesquisa da §9.5 — jeito do original: anexo = referência de caminho, SEM pasta uploads, conteúdo do arquivo lido só na FATIA 10; na 09 vai com aviso honesto.** |
| **Q5** | **Segunda conversa (nested chat): criar de verdade na 09?** | (a) sim, fluxo real de novo chat · (b) adiar; o **+** fica **fora** até existir | **(b)** — o **modelo já suporta** `chats[]` e a restauração já reagrupa por `chatId`; o que falta é **UI e fluxo**, que não muda o critério de aceite desta fatia. Construir agora desviaria o foco de "conversa real" **→ RESPONDIDO (17/10): letra (b) — adiar para a FATIA 13 e esconder o "+" falso da 09; receita do original anotada em §9.5 (nunca ter botão "limpar conversa").** |

**Decisões tomadas pela IA (registradas para não virar susto):** a **casa nova** será `bairros/2-inteligencia/casas/conversa` (2.º módulo extraído, D69/D76 — com cartão de visita e teste de fronteira); a rota de conversa segue o **mesmo padrão** da casa Provedores (`rotaPertenceAoModulo` + registro no dev server "prefeitura"); o transporte do streaming será **HTTP com envio em pedaços (SSE)** por reaproveitar a porta única 5174 e não exigir infraestrutura nova — se a prova mostrar problema, cai-se para WebSocket (o `ws` já é dependência do projeto).

## 5. O que NÃO fazer na FATIA 09
- **Nada de ferramentas/arquivos/terminal** (isso é a FATIA 10 — Agir): o agente **não age**, só conversa.
- **Nada de segunda conversa (Q5b):** o botão `+` (`chat-group-tab-add`, `ChatPanel.tsx:294`) fica **oculto** até a FATIA 13, e **nunca** haverá botão "limpar conversa" (o original não tem — `RESET_SESSAO.md`).
- **Nada de cartão de permissão** (FATIA 10).
- **Nada de mexer na tela de Provedores** além de consumi-la (ela está homologada — mudança ali exigiria reabrir a 08).
- **Nada de "modo anexo/maximizado"** nem de unificação de abas (DEBT-12 é da FATIA 11).
- **Nada de chave no navegador** — nem em teste, nem em log, nem em exemplo.
- **Não "consertar"** as 12 falhas pré-existentes (decisão já tomada: FATIA 12) nem apagar teste nenhum.

## 6. Plano de prova (§6)
- **(a) Provedor simulado com streaming** — extensão do stub da 08 (`validacao_fatia08/stub_provider.cjs`, porta 4599, **fora do repo**) com um endpoint que **emite pedaços com atraso**, um que **falha no meio**, um que **não responde** (para timeout) e um que **recusa a chave** (401).
- **(b) Unit** — adaptadores de streaming por protocolo (pedaço → acumulado → fim), cancelamento, timeout, formatação de erro; fronteira da casa.
- **(c) E2E** — `e2e/conversa_fatia09.spec.ts`: enviar → ver a bolha **crescendo** → terminar → recarregar e conferir o histórico; **Parar** para no meio; erro honesto nos 4 casos; trocar de provedor muda quem responde.
- **(d) Validação do dono (Windows 5174)** — roteiro curto no `08` (PARTE D): abrir o app → escolher o provedor → conversar → parar no meio → recarregar. **Com Ollama local**, sem chave; e, se quiser, com um serviço real dele.

## 7. Riscos honestos
| Risco | Mitigação |
|---|---|
| Streaming por SSE em dev server próprio (não é framework) exige cuidado com buffer/flush | Prova isolada primeiro com o stub; se travar, WebSocket (já instalado) |
| "Parar" no meio do streaming deixa o provedor consumindo | Abortar a conexão no servidor e fechar o corpo da resposta; teste dedicado |
| Chave vazar por log/erro | Teste que varre as respostas da API; erro do provedor é **traduzido**, nunca repassado cru |
| Provedor local lento (primeiro token demora) | Timeout de **primeiro byte** separado do timeout total; mensagem honesta ("o serviço está demorando") |
| O `handleSend` é chamado por vários fluxos (landing, worktree, menus) | Trocar o **miolo** (a geração da resposta), mantendo a assinatura — nenhum chamador muda |

## 8. Entrega esperada
1 commit por conquista (≥ 4): **(1)** casa + rota + protocolo; **(2)** streaming no servidor; **(3)** ligação no chat + Parar; **(4)** erros honestos + histórico; **(5)** documentação e evidências. Cada um com typecheck 0 + bateria focada + A/B quando alguma falha.

**STATUS DA ENTREGA (17/10) — 5 de 5 concluídos:** **(1)** `5968b70` ✓ · **(2)** `9e2c703` ✓ · **(3)** `c0af6fe` ✓ · **(4)** `90f75c8` ✓ · **(5)** documentação (esta revisão). Os 10 critérios da §3 estão cobertos pela bateria E2E `e2e/conversa_fatia09.spec.ts` (T1 streaming+Markdown+rodapé · T2 Parar · T3 F5+isolamento · T4 erros a/b/c + varredura de chave · T5 troca de provedor); o caso (d) timeout de 60 s é unitário (C2) por limite de tempo do E2E — registrado honestamente no próprio spec. Evidências **fora do repo**: `~/validacao_fatia09/` (`c3_*` prova ao vivo da C3 + `f09_T1..T5` prints da spec) e as **análises dos 2 vídeos do dono** (`~/video_analysis`, `~/video_analysis2` — transcrição + quadros, método `09 §11`).

## 9. Diagnóstico do chat — o que existe, o que foi testado e o que falta (2026-10-17, antes de codar a 09)

### 9.1 O que existe HOJE (medido no código)
| Peça | Onde | O que realmente faz | Evidência |
|---|---|---|---|
| Modelo de dados | `types.ts` | `Session` → `chats[]` (`NestedChat`: id, título, status, mensagens) + `mainChatId`; `ChatMessage` tem `running`, `cancelled`, `vote`, `reported`, `attachments`, `model`, `mode` | tipos + invariantes (`sessionState.ts:188`) |
| Lista de mensagens | `components/ChatPanel.tsx:193` | Markdown real (`react-markdown` + `remark-gfm`), bloco de código com **copiar**, ações de feedback/regenerar | `ChatPanel.test.tsx` **3 testes** |
| Composer | `components/ChatInput.tsx` | texto, **Enter/Shift+Enter**, histórico de entradas, rascunho por chat, anexos por picker (workspace/local), modo e modelo | `ChatInput.test.tsx` **13 testes** |
| Envio | `App.tsx:1578 handleSend` | **SIMULADO**: adiciona a mensagem e, após **1 s**, escreve uma resposta fixa (varia se a palavra "build" aparece) | nenhum teste contra provedor |
| Parar | `App.tsx:1657 handleStop` | limpa os temporizadores do mock e marca como cancelado | idem |
| Persistência | `server/session-persistence/` | metadados no SQLite + **mensagens em `.jsonl` por sessão** (`slug/sessionId.jsonl`, com `chatId` em cada linha); restauração **reagrupa por chat**; mensagens `running` **não** são gravadas (decisão explícita, evita bolha vazia eterna) | **sem teste** do round-trip de transcrição |
| Provedores (08) | `casas/provedores/server/probe.ts` | **testar conexão** e **listar modelos** em 4 protocolos (`openai-chat`, `anthropic`, `gemini`, `ollama`), timeout 10 s, chave só no servidor | 37 unit + E2E 6/6 |
| Conversa real com provedor | — | **NÃO EXISTE** (nenhuma rota `/api/chat*`) | — |

### 9.2 Lacunas encontradas no diagnóstico (novas, não estavam na SPEC)
| # | Lacuna | Consequência | Encaminhamento |
|---|---|---|---|
| **G1** | **Anexos só vão pelo nome**: `"Arquivos anexados: a, b"` vai no texto; o **conteúdo do arquivo nunca é lido nem enviado** | Pedir "analise este arquivo" hoje **não funciona** com provedor real | Decisão do dono (Q4) |
| **G2** | **Lista de modelos fixa no composer** (`ChatInput.tsx:43`: Auto, Claude Sonnet 4, GPT-5, GPT-5 mini) e **não ligada** ao catálogo do provedor ativo da 08 | Escolher "GPT-5" com Ollama ativo daria erro | **Decidido pela IA:** na 09 o modelo efetivo passa a vir do **provedor ativo** (catálogo da 08); o texto livre continua |
| **G3** | **"Novo chat" é simulado**: o botão **+** apenas envia a mensagem *"Inicie um novo chat contextual…"* | Não existe fluxo real de segunda conversa | Decisão do dono (Q5) |
| **G4** | **Não há teste** provando que a conversa volta igual após F5 nem que **sessão A não vê mensagens de B** | É a base do "isolamento"; hoje só há invariantes do modelo | **Decidido pela IA:** entra como critério de prova da 09 (não é decisão de produto) |
| **G5** | **Sem contagem de contexto/tokens**: o histórico inteiro seria enviado a cada turno | Em conversa longa o provedor devolve **413/estouro de contexto** | **Decidido pela IA:** MVP envia o histórico do chat atual; estouro vira **erro honesto** com orientação (compactação fica para depois, referência OpenClaude `compact_boundary`) — detalhamento e tratativa viram a **DEBT-13** |

### 9.3 A raspagem do VS Code é suficiente? (resposta à pergunta do dono)
**O que já foi raspado e é diretamente útil à 09:**
- `arquivo_morto/engenharia_reversa/04_CENTER_CHAT/` — **9 documentos** (inventário, comportamento, **mapa de código**, gap analysis, conclusão, **contrato de implementação**, **fluxos e eventos**, testes, ordem). O `04F` já define o contrato do módulo: `ChatTurnInput{sessionId,text,attachments,mode,providerId}` e `ChatEvent{thinking|chunk|toolPending|toolResult|completed|failed}` com a **regra dura**: *"UI não fala com provider diretamente"* e *"sessão é a unidade de isolamento de histórico, rascunho e anexos"*. O `04G` traz o fluxo em diagrama (UI → serviço → runtime → eventos).
- `arquivo_morto/pesquisa_bruta/fatia-06-chat/` — botões, **ERRO_HANDLING com os cenários da 09** (401/403 → abrir Provedores; Ollama offline `ECONNREFUSED`; **429** rate-limit; **413** estouro de contexto; `compact_boundary`), persistência (OpenClaude/OpenCode), permissões, picker de sessão.
- `pesquisa_bruta/fatia-08-streaming/` — ciclo do streaming, estados de "pensando", interrupção e **"Keep Going"**.
- `pesquisa_bruta/fatia-07-input/` — comportamento e medidas do composer.
**O que NÃO está raspado (e não precisa vir do VS Code):** o **formato de fio de cada provedor** (SSE da OpenAI/Anthropic, streaming do Gemini, NDJSON do Ollama). Isso é **API pública de cada provedor**, não arquitetura do VS Code — o VS Code fala com modelos pelo host de extensões, que é outro caminho. O `probe.ts` da 08 **já tem** o mapa de URL/cabeçalho por protocolo, que é o andaime exato para a chamada de conversa.
**Veredito:** **não é preciso raspar o VS Code de novo para a FATIA 09.** A lacuna real é de **protocolo de provedor**, e ela se resolve com a documentação pública de cada um + o **stub** que vai emitir pedaços no teste. Se aparecer dúvida fina de comportamento (ex.: como o original trata interrupção), o `04G`/`04F` já respondem.
**Onde uma nova consulta ainda valeria:** só na **FATIA 10 (Agir)** — ferramentas, permissões e o ciclo de aprovação têm detalhe que a raspagem atual cobre só em parte (`PERMISSOES.md`).

### 9.4 Decisões novas a fechar (além de Q1–Q3)
Duas perguntas nasceram deste diagnóstico e estão na **tabela canônica da §4** (para não haver duas fontes de verdade):
- **Q4 — anexos:** só o **nome** na 09 (recomendado, com aviso de que o arquivo ainda não é lido) × ler o **conteúdo** agora × adiar para a 10.
- **Q5 — segunda conversa:** criar o fluxo real agora × **adiar** e deixar o **+** fora até existir (recomendado).

### 9.5 Pesquisa de referência para Q4/Q5 (17/10, a pedido do dono — "ver como funciona no original/OpenClaude")

**Q4 — anexo de arquivo: como tratam os referências**
| Referência | Como funciona | Evidência |
|---|---|---|
| **Projeto original (VS Code / Copilot)** | **Não existe pasta de uploads.** Anexo é **referência de contexto**: arquivo do workspace entra pelo caminho (`#arquivo`, menção, seletor/context picker), e as **ferramentas do agente leem do disco**; arquivo fora do workspace exige aba aberta ou permissão; anexar uma **pasta** manda **só a árvore de nomes** (nunca o conteúdo) | Raspagem `engenharia_reversa/04_CENTER_CHAT/04C`/`04F` (`ChatInputPart.getAttachedContext()`, `attachments: string[]`, "sessão isola anexos") + issue microsoft/vscode **#301432** (folder = só estrutura) e **#293386** (fora do workspace = permissão) + doc oficial `code.visualstudio.com/docs/chat/copilot-chat-context` |
| **OpenClaude** | Mesma filosofia de agente de código (primo do Claude Code — usa até `~/.claude` como caminho legado): **lê direto do disco**, histórico em `.jsonl` por sessão; **nenhuma pasta uploads** na raspagem | `pesquisa_bruta/fatia-06-chat/PERSISTENCIA_OPENCLAUDE.md` |
| **Claude Code** | **Não sobe arquivo nenhum**: lê do disco por caminho (`@arquivo`), `--add-dir`, Shift+arrastar; anexos da UI caem em `%TEMP%` e existe **feature pedindo exatamente uma pasta estável** (há quem parea com a ideia do dono) | issue anthropics/claude-code **#54062** + docs de uso |
| **Quem JÁ tem "pasta uploads"** | O **Ambiente da Arena** (o dono usa aqui) e a **plataforma cloud da Anthropic** (`/mnt/session/uploads` montado no sandbox da sessão, cópias somente-leitura) | Conversa + `platform.claude.com/docs/en/managed-agents/files` |

**Q5 — nova conversa: como fazem os referências** (`RESET_SESSAO.md` + `SESSION_PICKER.md` — fonte: código do OpenClaude + vídeos)
- **Não existe botão "limpar conversa"** em nenhum dos dois; o ciclo é só **Nova Conversa** + **Retomar**.
- **Dois botões "+":** (1) **global** no topo = sala/worktree nova (pasta `untitled-<timestamp>`, empty state 768px); (2) **dentro do projeto** = sessão nova na mesma pasta, `<sessionId>.jsonl` novo, **histórico antigo permanece no disco**.
- Fluxo: `new_session` → `stopSession` → `session_cleared` (limpa só a tela) → **id novo alocado no primeiro envio**; retomar = lista/modal (Session Picker: needs-input / recentes / outras) — esse seletor é **terreno da FATIA 13**.
- Exclusão só pela **lixeira** ao lado da conversa — nunca "limpar".

**No nosso projeto hoje:** o "+" é o `chat-group-tab-add` em `ChatPanel.tsx:294`, na faixa de abas de chats do painel central — e a faixa **só aparece quando já existem 2+ conversas**; o botão hoje é falso (envia frase pronta).

**Leitura para as decisões:**
- **Q4:** a proposta do dono (pasta `uploads` criada dentro da pasta ativa) **não é o modelo do original** (que referencia e deixa o agente ler na FATIA 10) — é o modelo de produto de chat (Arena/nuvem Anthropic), e tem um ganho: o arquivo **nasce dentro do workspace**, então a FATIA 10 já o enxerga para agir. Pesa contra: escrever na pasta do usuário sem pedir e crescer a 09.
- **Q5:** a receita do "+" de verdade está mapeada (acima); adiar mantém o foco da 09 e o seletor de conversas cai naturalmente na FATIA 13.

---

# PARTE 2D — SPEC: FATIA 10 — Agir (Ferramentas de Arquivo + Permissões)

> Escrita em **2026-10-18**, no dia em que o dono homologou a FATIA 09 (D92) e mandou começar ("começe a 10"). Padrão das fatias: SPEC → decisões fechadas com o dono → 5 commits por conquistas. **Decisões Q1–Q4 FECHADAS com o dono ainda em 18/10 (registro D93, `docs/05`) — execução autorizada.**

## 1. Objetivo (uma frase)
Fechar o MVP: a IA deixa de ser só conversa e passa a **ler, listar, buscar, criar e escrever arquivos dentro da pasta de trabalho** — e **nenhuma mexida acontece sem o cartão de aprovação do dono**: **[Permitir] [Negar] [Permitir na Sessão]**.

## 2. Terreno conferido no código (18/10)
- **D72** — escopo fixo: ferramentas de **arquivo**; **terminal bloqueado** (FATIA 12).
- **Casa Conversa (09)** — fio SSE `chunk/done/error` + Parar no servidor; o contrato já reserva a frase: *"a FATIA 10 soma os eventos de ferramenta"* (`contract.ts`).
- **Servidor de arquivos** — leitura/listagem nas rotas `/api/fs/*` e o **`fsHost`** (`modules/explorer-search/server/fs/fsHost.ts`) com **escrita atômica já pronta** (`writeFileAtomic`: grava num temporário e troca num passo — ou grava tudo, ou não grava nada), além de `mkdir`/`rename`/`copy`/`delete`. A C2 **liga** essas mãos às ferramentas do agente + trava de território; a FATIA 11 reaproveita a mesma peça para o **editor salvar**.
- **Pasta ativa** — resolvida no servidor (`/api/workspaces/*`); é o território que nenhuma ferramenta pode ultrapassar.
- **Referência de produto (dentro do repo):** `docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/PERMISSOES.md` — desenho do OpenClaude: card no fluxo do chat **[Permitir] [Não] [Sempre na Sessão]**; negar devolve *"User denied permission"* à IA; **guardião anti-loop** (`doomLoop.ts`): hash de `ferramenta + argumentos`, contador por sessão, **bloqueio na 3ª chamada idêntica consecutiva** com mensagem ao modelo. *(A nota externa `referencias/openclaude/03_sessoes_e_permissoes.md` não sobreviveu à faxina — vale o PERMISSOES.md.)*
- **Regra de segurança (VS Code agent mode, pesquisa de 17/10):** ferramentas embutidas só tocam arquivos **dentro do workspace**.

## 3. Decisões Q1–Q4 — FECHADAS COM O DONO (18/10; registro D93)

| # | Pergunta | Opções | Recomendação da IA |
|---|---|---|---|
| **Q1** | **O que a IA faz SEM perguntar?** | (a) **só olhar** de graça (ler/listar/buscar dentro da pasta) — criar/escrever **sempre** passam pelo cartão · (b) perguntar por **tudo**, até ler · (c) nada pergunta | **(a)** — é o jeito do VS Code e do OpenClaude (PERMISSOES.md: leitura `allow`, escrita `ask`); controle de verdade sem um clique por cada olhada **→ RESPONDIDO (18/10): (a)** |
| **Q2** | **O "Permitir na Sessão" vale até quando?** | (a) até a **conversa acabar** — conversa nova pergunta de novo; **F5 mantém** (a sessão sobrevive ao F5 desde a 09) · (b) **para sempre** por tipo de mexida | **(a)** — simples e previsível; (b) cresce escopo e risco nesta fatia **→ RESPONDIDO (18/10): (a)** |
| **Q3** | **Quanto o cartão mostra da mexida?** | (a) **caminho + prévia** do conteúdo a gravar · (b) comparação **antes × depois** lado a lado · (c) só o caminho | **(a)** no MVP — a "lupa" rica de diff é o tema da **FATIA 11**; (c) é aprovar no escuro **→ RESPONDIDO (18/10): (a)** (o dono pediu explicação alto-nível antes de decidir; explicado o caso "arquivo novo não tem antes") |
| **Q4** | **Como a IA "levanta a mão" pedindo ferramenta?** | (a) **idioma único combinado** — um formato de pedido que todos os provedores usam igual · (b) **jeito nativo de cada serviço** (4 implementações: OpenAI/Anthropic/Gemini/Ollama) | **(a)** — um idioma só, uma suíte de provas, funciona igual no Ollama local, na nuvem e no stub (D91); pedido torto = aviso **honesto** + nova chance, nunca texto inventado **→ RESPONDIDO (18/10): (b), ESCOLHA DO DONO** — perguntou como o VS Code/Claude Code fazem (nativo) e escolheu seguir esse desenho, **contra a recomendação da IA**, com a consequência aceita e registrada na §8 |

## 4. O que NÃO fazer na FATIA 10
- **Nada de terminal/comandos** (FATIA 12 — D72): a IA não executa nada; só lê e escreve arquivo.
- **Nada de worktree/branch de sessão** (FATIA 15): a IA mexe direto na pasta ativa, sempre com aprovação.
- **Nada de painel de alterações / Accept All / Discard** (FATIA 11 — a "lupa"): a auditoria rica vem com o diff.
- **Nada de sair da pasta:** caminho com `..` ou absoluto de fora do workspace = **recusa honesta**, sem executar.
- **Nada das dívidas:** DEBT-12 (abas → 11) · DEBT-13 (memória) · DEBT-14/15 (seletor/bolinha) · "+" segunda conversa (13).

## 5. Desenho (alto nível)
- **Eventos novos no fio** (contrato da casa Conversa estendido): `tool` (a IA quer usar uma ferramenta: nome + argumentos) · `approval` (o servidor pede o sim/não — só quando a ferramenta mexe) · `tool_result` (o que a ferramenta devolveu, enxuto) — ao lado dos `chunk/done/error` de hoje.
- **O loop mora no servidor**, numa **casa Agir** vizinha da casa Conversa (mesmo padrão de contrato + porta própria): modelo pede ferramenta → servidor aplica as regras (território? permissão? anti-loop?) → executa → devolve o resultado ao modelo → repete até a IA responder em texto. **Teto de 10 voltas** por mensagem, para nunca rodar de graça.
- **Q4 = canal NATIVO:** cada protocolo tem seu **extrator de pedidos de ferramenta** (openai-chat · anthropic · gemini · ollama — 4 implementações, à imagem do `extrairTexto` da 09) e seu jeito de anunciar as ferramentas no pedido. Modelo/provedor **sem** canal nativo de ferramentas → **aviso honesto** e a conversa segue sem agir (§8).
- **Cartão de permissão no chat** (PERMISSOES.md): card dentro da linha do tempo, com o que vai ser feito + os 3 botões; **Negar** devolve à IA o "dono negou" e ela segue o plano sem escrever; **Permitir na Sessão** guarda a permissão **na sessão** (persistida — sobrevive ao F5, como a conversa).
- **Anti-loop 3×:** mesma ferramenta + mesmos argumentos 3 vezes seguidas = bloqueio com mensagem honesta ao modelo e aviso na tela.
- **Parar continua valendo:** mata o loop no meio — inclusive entre o pedido de ferramenta e a retomada (sem `working` órfão, lição da 09).
- **Escrita sempre atômica:** todo criar/escrever passa pelo `writeFileAtomic` do `fsHost`.

## 6. Critérios de aceite (a régua do dono)
1. Conversa normal (sem ferramenta) continua idêntica à 09 — nada quebra.
2. "Crie o arquivo `ola.txt`…" → cartão aparece → **sem aprovar, NADA é escrito** (prova automatizada).
3. Aprovado → arquivo existe na pasta ativa com o conteúdo exato.
4. Negado → a IA responde sabendo do "não", sem escrever nada.
5. Permitir na Sessão → as próximas escritas desta conversa não perguntam; conversa nova pergunta de novo (conforme Q2).
6. F5 no meio (cartão aberto ou depois de aprovado): conversa, cartão e permissões da sessão sobrevivem.
7. Tentativa de sair da pasta → recusa honesta, nada executado.
8. 3 pedidos idênticos seguidos → bloqueio honesto (anti-loop).
9. Parar no meio do loop → tudo morre limpo, status honesto na tela.
10. tsc **0** + unit verde (baseline 813✓/12✗) + E2E novo da fatia verde, tudo com **stub** (D91 — sem chave do dono); homologação = roteiro do dono (nova PARTE no `08`).

## 7. Commits planejados (5 conquistas)
1. **C1 — a casa Agir nasce:** contrato (eventos `tool/approval/tool_result`) + loop no servidor com **ferramentas falsas** (o esqueleto provado: o modelo "pede", o servidor responde simulado) + testes.
2. **C2 — ferramentas de arquivo de verdade:** ler/listar/buscar (livres) + criar/escrever via `writeFileAtomic` + trava de território; testes de fronteira (fora da pasta, nome inválido).
3. **C3 — o cartão na tela:** card de permissão no chat + resposta do dono (3 botões) retomando o loop + cartões de ferramenta no histórico; Parar no loop.
4. **C4 — memória e travas finas:** permissões da sessão persistidas (sobrevivem ao F5), anti-loop 3×, teto de voltas, F5 com cartão pendente.
5. **C5 — E2E da fatia + docs de fechamento** (padrão C5 da 09).

## 8. Limitações honestas
- **Consequência aceita do Q4=(b):** modelo/provedor **sem canal nativo de ferramentas** (comum em modelos locais) **não usa o Agir** — o app detecta e mostra aviso honesto; a conversa normal segue funcionando. Se o `gemma` (Ollama) do dono tiver ou não o canal **só se confirma na prática**, na homologação dele. O **stub** da prova fala os 4 formatos nativos (D91).
- A prova automatizada usa **stub** (D91); serviço real é roteiro do dono.
- O seletor de modelos do composador segue com a lista fixa (**DEBT-14**); a conversa da 10 usa o **provedor ativo do chat**, como na 09.

## 9. STATUS DA ENTREGA (19/10) — IMPLEMENTADA (C1–C5) · HOMOLOGAÇÃO PENDENTE (é do dono)

Os 5 commits do §7, cada um provado antes de commitado (regra do dono: *"não considerar concluída apenas porque o código foi implementado"*):

| Commit | Conquista | Prova registrada |
|---|---|---|
| `547729e` | C1 — a casa Agir nasce (contrato + loop no servidor + extratores nativos ×4, Q4b) | 21 testes da casa |
| `8b93c05` | C2 — mãos de arquivo de verdade (território, escrita atômica, anúncio, diálogo, vizinho) | 49/49 |
| `c1b6518` | C3 — o cartão na tela (rota SSE + cartão de permissão no chat) | casa 56/56 · E2E 09 **5/5** sobre o fio novo · fumaça HTTP real (400 histórico · 409 sem pasta · 409 fluxo morto · SSE com chunks) |
| `1c4945d` | C4 — memória e travas finas (anti-loop 3× + F5 sana cartões) | +4 testes; agir+services **60/60** |
| C5 | E2E da própria fatia + 2 consertos de sessão + docs (esta atualização) | E2E `agir_fatia10` **5/5** |

**Placar de fechamento:** tsc **0** · unit **872✓ / 12✗ (todas pré-existentes: TerminalPanel×9, iconLabels, themeTokens, visualStates) / 16skip** — o flaky "regenerar" do `App.test` segue intermitente sob carga (provado pré-existente via stash no C1; hoje: 3/3 no estado limpo, 4/4 isolado com as mudanças, arquivo inteiro 46✓ logo depois de falhar) · E2E **`agir_fatia10` 5/5** + regressão das fatias **08+09+10 = 15/15** · contrato anti-trapaça **6/6**.

**Os 10 critérios do §6, critério a critério:** 1 = T1 do E2E · 2 = T2 (prova do disco **antes** do Permitir) · 3 = T2 (conteúdo exato no disco) · 4 = T3 · 5 = T4 ("Permitir na Sessão" + F5) · 6 = T4 (F5) e C4 (cartão `aguardando`→`expirado`) · 7 = T5 · 8 = teste do guardião (3 idênticas → 2 execuções, `loop_bloqueado`) · 9 = Parar herdado da 09 (abort no servidor, provado em `rotas.test`) · 10 = este placar, tudo com **stub** (D91 — sem chave do dono).

**Dois consertos que a prova da própria fatia exigiu (memória de sessão):**
1. **Fluxo único por troca** — o "fluxo" do agir passou a ser `sessão:chat:resposta` (antes era só o id da sessão): as aprovações do fluxo ficam isoladas por troca; a permissão "na sessão" (Q2a) continua atravessando trocas pelo armário do cliente.
2. **Trocar a pasta numa sessão recém-criada** — a sessão nova só vai ao servidor em bloco no `pagehide`; trocar a pasta **antes disso** morria no 404 silencioso e o agente seguia na pasta antiga — **o cenário exato do teste manual do dono em 18/10**. Conserto: persistir a sessão antes de trocar (`handleChangeActiveWorkspace`).

**Limitação nova registrada honestamente:** cada envio é **um fluxo novo**; o resultado das ferramentas entra no histórico como texto (o modelo lê o que aconteceu nas trocas anteriores), mas não há "estado de ferramenta vivo" entre mensagens. E a suíte E2E **completa** segue não sendo régua no sandbox (`09 §13.1`) — a régua é por fatia. **Sem ferramenta de exclusão (por desenho, confirmado 19/10):** o conjunto da FATIA 10 é ler/listar/buscar + criar/escrever (SPEC 2D §7-C2, fechada no D93) — o código tem exatamente essas 5; o relatório CRUD do dono confirmou CREATE/READ/UPDATE e a ausência do DELETE, que fica registrado como **fora do escopo do MVP** (destino **decidido em 19/10: opção C** — decidir depois da homologação; registrado como **DEBT-16**).
