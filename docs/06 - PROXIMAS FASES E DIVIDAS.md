# 06 - PROXIMAS FASES E DIVIDAS — Roadmap & Matriz de Dívidas

> **Documento Canônico de Planejamento e Débito Técnico (Padrão Spec-Driven / Stream Coding).**
> - **Regra de ouro:** Todo débito técnico e todo o roadmap do projeto vivem estritamente aqui (não criar arquivos separados como `TECHNICAL_DEBT.md` ou `ROADMAP.md`).
> - **Princípio de bloqueio:** Nenhuma fatia nova é iniciada enquanto existirem dívidas bloqueantes da fatia anterior. **Flexibilizado conscientemente pela D63/D64** para os itens de *refinamento* (foram para a FATIA 17 (pós-D95; era 13), fora do caminho crítico do MVP).
> - **Régua de medição:** 90 % do produto é réplica fiel da **"Agents Window" do VS Code** (**D66**, 2026-10-13 — régua: code-server 8080 / VS Code real); 10 % é customizado (chassi direito com terminal + tela de Provedores estilo **Cline**).
> - **Atualizado:** 2026-10-26 — D101 continua como método comparativo; D103–D115 orientam o pacote documental. Gate D98 segue aberto (relatório preliminar de 25/10 não conclui o gate), Fatias 13–20 preservadas, M1→M2→M3→M4 em sequência e M5–M8 só planejamento. F1–F5 têm SPECs candidatas para revisão; F6–F8 seguem avaliação. Nenhuma correção, SPEC definitiva ou homologação foi feita nesta atualização.

> **Nota de vigência — D91 revisada pela D99 (2026-10-23):** Arena responde pelos testes técnicos automatizados e deve também realizar testes técnicos com provedores reais quando houver acesso legítimo, ambiente seguro e autorização. Se não for possível, registrar explicitamente como bloqueado/não executado. Stubs servem para testes controlados, mas **não comprovam funcionamento com provedores reais**. A homologação funcional do aplicativo permanece com o usuário. Menções abaixo a “validação real pelo dono” preservam o plano/histórico anterior à D99 e não substituem esta regra vigente.
>
> **Nota de vigência — D101/D109 (2026-10-26):** buscar paridade funcional e desempenho equivalente ou superior depende de avaliação reproduzível por cenário. Sequência preservada: **Gate D98 → Fatia 13 → Fatia 14 → Fatia 15 → planejamento M1 → M2 → M3 → M4**, e M5–M8 somente em planejamento. A especificação paralela M1/M2 sugerida em D102 foi revogada por D109. Fatias 16–20 e homologações históricas 07–12 permanecem intactas; não houve novo trabalho D98 nesta rodada e a Fatia 13 não foi aberta.

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
| **DEBT-12** | Fatia 4 (origem) / 15 (execução, pós-D95) | Editor / Abas | **Janela única de abas:** editor de código, Provedores, Browser, Branch Changes e Search na **mesma barra de abas** (conceito VS Code), podendo alternar entre eles como abas de navegador. | **Estado atual:** Provedores/Browser/Changes já são abas do **centro**; o **editor de código** vive em **outra** estrutura (coluna direita, `AttachTab`), com `search`/`diff`/`changes` **duplicados** nos dois modelos. Causa: **exceção autorizada da FATIA 04** (4.7 c4 — `App.tsx:1083-1087`). O editor do centro **não salva**; o da direita **salva**. | **Média hoje / Alta na 15** (é pré-requisito do critério "editar e salvar sem F5") | Avaliação completa em `06 §8.7`; execução = **1.º trabalho da FATIA 15** (D90, pós-D95) |
| **DEBT-11** | FATIA 17 **(a decidir a forma; pós-D95)** | Title Bar / Pesquisa | O topo mantém a **pesquisa / centro de comando** (acesso rápido: "Ir para Arquivo", "Mostrar e Executar Comandos", "Pesquisar Texto", "Abrir Chat Rápido"). A troca de pasta deve ser **integrada dentro da pesquisa**, não ocupar o lugar dela. | A faixa de caminho + botão "Usar esta pasta" ocupou o lugar da pesquisa: o caminho fica fixo no topo e **a pesquisa não existe mais**. | **Alta** | `Titlebar.tsx`, `WorkspaceSwitcher.tsx`, `shell/` |
| **DEBT-13** | FATIA a decidir **(não é da 09)** | Chat / Memória de contexto | O usuário **enxerga e controla** o enchimento do contexto da conversa: **medidor de uso** ("quanto da mesa está ocupada"), opção de **limpar / recomeçar** e política de **compactação** (resumir o passado antes de estourar) — como o **Claude Code / OpenClaude** (ver uso, compactar, limpar) e como o original (erro 413 + `compact_boundary`, registrado na raspagem). | **Não existe nada hoje:** sem contagem de tokens (G5 da §9.2), sem medidor, sem limpeza e sem compactação; a 09 envia o histórico inteiro e, se estourar, mostra erro honesto. | **Média** (não bloqueia a 09; vira dor em conversas longas) | Origem: conversa do dono em **17/10** ("não sei o quanto estou enchendo, não sei se posso limpar"). Para **discutir depois**: tratativas do **OpenClaude/Claude Code** (o dono indicou que já as tem) + `pesquisa_bruta/fatia-06-chat/ERRO_HANDLING.md` (413/`compact_boundary`). **Não implementar sem deliberação do dono.** |
| **DEBT-14** | FATIA a decidir **(sugestão do dono na validação da 09)** | Chat / Seletor de modelos | O seletor de modelos do **composador** (chip ao lado do campo de mensagem) conversa com o **provedor ativo**: a lista oferece **todos os modelos do provedor escolhido** (ex.: os do Ollama local) e o chip mostra quem de fato vai responder. | **Hoje a lista é fixa** (Auto · Claude Sonnet 4 · GPT-5 · GPT-5 mini — herança do mock) e o chip não acompanha o provedor: no vídeo de validação do dono (17/10) quem respondeu foi `gemma4:31b-cloud` (rodapé certo) com o chip escrito "Claude Sonnet 4". | **Média** | Origem: **sugestão explícita do dono no vídeo de 17/10** ("achei que o usuário ia poder selecionar todos os modelos disponíveis aqui"); amarra a **G2** da §9.2 ("modelo efetivo vem do provedor ativo"). Ligar ao catálogo já pronto da 08 (`Buscar modelos`). Só registro — implementar quando o dono decidir. |
| **DEBT-15** | FATIA a decidir **(UX da 09)** | Chat / Provedores | Escolher o provedor que responde no chat seja **difícil de esquecer**: enquanto ninguém estiver ativo, o passo "usar este provedor no chat" aparece de forma óbvia. | O interruptor é uma **bolinha discreta** no rodapé do painel de Provedores; no vídeo de 17/10 o dono esqueceu de marcá-lo e as 4 primeiras mensagens caíram no 409 honesto ("Nenhum provedor está ativo") — ele mesmo concluiu: *"esqueci que tinha a selecionar aqui"*. | **Baixa/Média** | Origem: vídeo do dono em **17/10** + análise da IA (transcrição + quadros). Só registro — qualquer mudança de UX passa por deliberação do dono. |
| **DEBT-16** | Micro-fatia própria **(desenho decidido pelo dono em 19/10)** | Agir / Ferramenta de exclusão | O agente pode **excluir arquivos E pastas** (o DELETE do CRUD) — **para a lixeira** (recuperável, padrão das referências), com **cartão reforçado** ("sem desfazer direto" + caminho + o que vai) que **sempre pergunta**. | **Não existe ferramenta de exclusão:** o conjunto da FATIA 10 é ler/listar/buscar + criar/escrever (SPEC 2D, D93). | **Alta** (dono pediu decisão imediata; virou escopo) | Origem: relatório CRUD 19/10 → ponderação (opção C) → **reversão pelo dono (CRUD completo)** → pesquisa das referências + 4 perguntas, respondidas **1-lixeira, 2-pasta-também, 3-cartão-sim, 4-micro-fatia**. Falta: SPEC + posição na ordem das próximas fatias. |
| **DEBT-17** | FATIA a decidir **(verificação do dono pendente)** | Docs / Conceito | Esclarecer o que é a **"lupa"**: hoje o `06` a define como "painel de alterações / diff rico, tema da FATIA 11" (Q3 + SPEC 2D §4), mas o dono disse em 19/10 que **lupa não é painel de alterações** ("você está confundindo"). Vale a palavra dele: corrigir o registro conforme a definição dele. | Registro possivelmente confuso em 2 pontos do `06`; a IA repetiu o registro. | **Baixa** (conceito; não bloqueia código) | Origem: conversa do dono em **19/10**. Só registro — aguardar a definição dele; depois corrigir Q3 + SPEC 2D §4. |
| **DEBT-18** | FATIA a decidir **(revisão do dono após 11–15)** | SCM / Conferir | Diff lado a lado (antes × depois) + stage/unstage real na aba Branch Changes, como o Source Control do VS Code. | A aba Changes abre (modo anexo), mas sem diff rico nem stage/unstage de verdade. Era do escopo antigo "Conferir"; SPEC 2I fechada = só abas. | **Média** (não bloqueia 11–15) | Origem: alinhamento pós-D95 20/10. Candidatas: micro-fatia pós-15 ou reabrir a 15. Revisar com o dono após 11–15. |
| **DEBT-19** | FATIA a decidir **(revisão do dono após 11–15)** | Explorer / Arquivos | Botão direito na árvore cria/renomeia/exclui arquivo e pasta (VS Code). | O usuário não tem file ops pelo Explorer (o *agente* tem via tools da 10/12). Era do "Conferir"; fora da SPEC 2I. | **Média** (não bloqueia 11–15) | Origem: alinhamento pós-D95 20/10. Candidatas: 15 (reabre SPEC) / 17 / micro-fatia com a 18. Revisar com o dono após 11–15. |
| **DEBT-20** | FATIA a decidir **(revisão do dono após 11–15)** | Browser / Prévia | A aba Browser mostra a página de verdade (padrão `simple-browser` do VS Code). | A aba Browser abre (modo anexo), mas o conteúdo não é real (placeholder). Era do "Conferir"; fora da SPEC 2I. | **Baixa/Média** (não bloqueia 11–15) | Origem: alinhamento pós-D95 20/10. Candidata natural: FATIA 20 (Casa Navegador). Revisar com o dono após 11–15. |
| **DEBT-21** | FATIA a decidir **(higiene E2E; dados limpos 20/10)** | Testes / Isolamento E2E | Cada spec E2E roda isolada: hoje 08/09 dividem o armazém persistente de sessões (`~/.agente_window/projects/*.jsonl`, sem fixture por bateria) — a T4 da 09 semeia bolhas "Chave inválida (erro 401)" que quebram a T4 da 08 (assert de texto na página inteira), e sobras AGIR/TETO com pasta apagada quebram a 09 (clica a 1.ª linha). | 08-T4 quebra conforme ordem/histórico; contorno = ordem canônica 08→09→10→11 + limpeza manual (24 bolhas neutralizadas 20/10). | **Baixa** (só a bateria; app intacto) | Origem: C3 da FATIA 11 (20/10). Candidatas: escopo do assert da 08-T4 em `.providers-view` / fixture de sessões por bateria / sessão própria na 09 (padrão 10/11). Não bloqueia 11–15. |
| **DEBT-22** | FATIA a decidir **(perfumaria; verificação do dono — 5 itens do vídeo3 21/10)** | Chat / Agente-ao-vivo | (1) Teste dos 250: teto 250 → msg nova → progresso diz "de 250". (2) Auto-abrir arquivo (modo anexo, ao vivo, cria+edita — 2b/3b): sempre ligado (a) / interruptor default on (b) / default off (c). (3) Multi-arquivos: todas as abas (a) / só o atual (b) / só o último (c). (4) Fatia do auto-abrir: micro pós-11 (a) / 15 (b) / pós-12–15 (c). (5) Colapsar msgs longas: 15 (a) / 20 (b). | Nada implementado (só conversa + pesquisa 21/10): VS Code transmite ao vivo e revela; Cursor abria e removeu ("nuisance"); Antigravity tem `autoOpenFiles` default off. **Vetado pelo dono 21/10: Ctrl+Z p/ ações do agente** (só o desfazer normal do editor). | **Baixa** (perfumaria; não bloqueia 11–15 nem a homologação da 11) | Origem: vídeo3 21/10 + respostas 1a/2b/3b/4-sim/5b/7a/8a; dono mandou anotar tudo p/ verificar depois. Não implementar sem deliberação. |

| **DEBT-23** | **FATIA 13 (desenho junto do terminal; SPEC 2G fechada NÃO cobre — escopo novo por ordem do dono 21/10)** | Agente / Permissões | IA acessa qualquer nível de qualquer pasta (opt-in) · ajuste lixeira × permanente na Config · modo YOLO (sem cartão). Padrão de fábrica = seguro de hoje (só a pasta + só lixeira + sempre pergunta). | Nada implementado (só conversa + pesquisa 21/10): Claude Code = pasta + opt-in por caminho (`/add-dir`, regras), excluir = `rm` permanente, YOLO = `bypassPermissions`; Cline = toggles projeto × todos os arquivos, YOLO = tudo auto-aprovado com aviso "perigoso" (recomendam container). | **Média/Alta** (poder destrutivo irreversível fora de git; exige desenho de segurança próprio) | Origem: pedido do dono 21/10 (Q1=(a) dívida · Q2=(a) na 13 · Q3=(a) padrão seguro · Q4=(a) no YOLO excluir-permanente sem cartão). **Reabre 2 decisões fechadas** (só com ordem expressa na abertura da 13): território = pasta ativa (D72/SPEC 2D) e "nada de apagar permanente" (SPEC 2F §6). Não implementar sem SPEC. |

**Atualização D115 de DEBT-14 (sem apagar seu registro histórico):** a divergência passa a ser tratada como **F5-B — catálogo/seleção efetiva**. A intenção aprovada não é mais apenas “refletir o provedor ativo”: o seletor deve consumir a fonte administrativa Provedores e encaminhar um par inequívoco provedor+modelo; `ativo` não pode sobrescrever uma escolha explícita. O destino documental é esta atividade transversal ligada à DEBT-14, sem fatia nova ou mudança de ordem. Desenho de lista habilitada, comportamento de “Auto” e estado de execução estão na SPEC candidata F5-B; ainda aguardam revisão.


### Itens identificados na análise do vídeo de 2026-10-12 (ainda NÃO fatiados)
> Fonte: gravação do usuário (4min02s) analisada por transcrição + frames (método em `docs/09 §11`). Itens que **não constam em nenhuma fatia** do roadmap — aguardando deliberação do usuário. O vídeo **confirma** as dívidas já registradas (DEBT-05, DEBT-06, DEBT-07, DEBT-09, DEBT-04, DEBT-10); o terminal não aparece na gravação, então DEBT-01/02/03 ficaram sem evidência nova. **Atualização 14/10:** itens **2, 3 e 4 ganharam dono** (anotado em cada); 5 e 6 seguem em deliberação.

1. **Raspar o código original (1:45–1:54):** pedido explícito de engenharia reversa do VS Code/Cline original para portar funcionalidades ao nosso (ex.: lista de recentes e nome da pasta no topo).
2. **Página "Personalizações" do original (1:54–2:33):** Visão geral, Agentes, **Habilidades (14)**, Instruções, Hooks, **Servidores MCP (1)**, Plugins (11), Ferramentas (11). **Dono (14/10): FATIA 14 — Casa Personalizações (pós-D95; era 11).**
3. **Histórico de chats na sidebar de Sessões (1:07–1:18):** o original lista conversas antigas ("Greeting in Portuguese — 4 semanas atrás") com tempo relativo. O roadmap cobre histórico persistente **por sessão** na Fatia 10. **Dono (14/10): FATIA 14 — Casa Sessões (pós-D95; era 13).**
4. **"Botão que abre navegador" (2:18–2:33):** botão funcional do original apontado pelo usuário; **não identificado com certeza** na gravação (candidato visto: botão de topo do Cline com tooltip "Abrir no Editor", t≈145 s). Usuário informou que mostrará qual é. **Decidido (14/10): fica por último — FATIA 20 (pós-D95; acordo com a Meta).**
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

**Atualização 14/10 (donos):** item **5 → FATIA 15** (Conferir) · **6 e 7 → FATIA 16** (Terminal 2.0) · **9 → FATIA 18** (Painéis) · **10 → FATIA 17** (Refinamentos). Itens **1–4 e 8** = refinamento (dono a fechar quando a FATIA 17 abrir (números pós-D95)).

**Prioridade declarada pelo usuário (2026-10-13):** "quero avançar logo para as próximas fatias, para a gente já colocar os Provedores e já fazer funcionar e colocar o Agente Loop para a gente já testar" — **DECIDIDO (D63 + D64 + D65, `docs/05`)**: ordem **MVP-first** com a numeração nova → **(1) FATIA 07 — Destravar** (DEBT-06 + DEBT-04 + DEBT-09) → **(2) FATIA 08 — Conectar** (Provedores) → **(3) FATIA 09 — Conversar** (chat real + streaming) → **(4) FATIA 10 — Agir** (tools + permissões) = **MVP ponta a ponta**. Refinamentos fora do caminho crítico → **FATIA 17 — Refinamentos** (pós-D95) (antiga proposta "6.2"). Dependência dura: a FATIA 08 não inicia sem os critérios da FATIA 07 verdes.

---

# PARTE 2 — SPEC: FATIA 07 — Destravar (Dívidas Estruturais)

> **STATUS:** **HOMOLOGADA pelo dono em 2026-10-15** ("funcionou perfeitamente"; as 3 dívidas entregues com evidências Playwright). Restam como limitações registradas: PTYs órfãos até a FATIA 12 (pré-D95 = 16), 5 E2E vermelhos pré-existentes (`09 §2.6`) e o sintoma original do DEBT-06 (não reproduzido no estado anterior sob as condições testadas). Substitui a SPEC da antiga "Fatia 6.1" (renumerada pela D64).
> **DECISÕES DA EXECUÇÃO (15/10):** **DEBT-06 — caminho C** (escolha expressa do dono): o terminal **renasce já na pasta nova** em vez de receber `cd` num shell vivo; a decisão fina "cd real × renascer" fica para a **FATIA 12** (pré-D95 = 16), contra o code-server (8080). **DEBT-09 — feito** (`a69137d`): as abas globais do editor deixaram de depender de sessão, então Provedores abre pela Conta na landing. **DEBT-04 — nada a expurgar:** busca no código não encontra resquício do visualizador legado (sem `legacy/`, `ProvidersView` é a única superfície, via `providersSurface`).
> **Limitação registrada (DEBT-06):** os PTYs das abas antigas ficam **órfãos até o idle de 30 min** ao trocar de pasta (o motor do terminal não se toca nesta fatia — `04 §1` e §4); anotado no código para a FATIA 16 (pós-D95).
> **REGRA DE OURO:** A **FATIA 08 não inicia** enquanto os critérios testáveis abaixo não estiverem verdes e homologados pelo humano.
> **Mudança de escopo (D63/D64):** só as 3 dívidas estruturais ficaram aqui. Saíram para fatias próprias: `clear` do terminal (**DEBT-01** → FATIA 16), lista de recentes (**DEBT-07** → FATIA 17) e picker nativo (**DEBT-05** → FATIA 17). (Números pós-D95.)

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
   - **Modo homologado em 15/10 (caminho C, escolha do dono):** o terminal **renasce na pasta nova** (mesma entrega visível: prompt no caminho novo, sem F5 e sem digitar nada); o `cd` num shell vivo fica para a FATIA 12 (pré-D95 = 16). Provado por sonda Playwright: PID do PTY muda e `readlink /proc/<pid>/cwd` = pasta nova (`sonda_03_debt06_sessao.cjs`).
2. **Provedores em qualquer estado (DEBT-09):**
   - Com a tela inicial vazia (Landing, sem chat), clicar em Conta > Provedores.
   - A tela abre imediatamente no editor novo, sem erros no console.
3. **Visualizador legado (DEBT-04):**
   - Nenhuma tela auxiliar (inclusive Provedores e Configurações) abre no visualizador antigo; busca no código não encontra resquício.

### 4. O que NÃO fazer na FATIA 07
- **NÃO** implementar chamadas de IA, ferramentas ou permissões (conteúdo das Fatias 08–10).
- **NÃO** mexer no motor do Monaco/PTY nem no terminal homologado (contratos congelados do `04`).
- **NÃO** antecipar refinamentos (recentes, `clear`, picker nativo) — têm fatia própria (16/17, pós-D95) e **a Pesquisa volta ao lugar na FATIA 17 (D73, pós-D95)**.
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
| **B — regra geral na FATIA 15 (pós-D95)** | Definir o roteamento de todas as superfícies auxiliares (Provedores, Browser, Branch/Changes, Configurações) na Casa Editor, com testes | Maior, porém faz junto do trabalho de abas/editor que já está previsto |
| **C — registrar e seguir** | Nada agora; vai para a FATIA 15 sem fix imediato (pós-D95) | Zero — o dono convive com o clique extra em "Maximizar" |
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

**Ganho colateral (resolve dívida já aberta):** o caso *"arquivo aberto + Provedores ao mesmo tempo"* (adiado para a FATIA 15 em (pós-D95) `§8.4`) **deixa de existir por construção** — viram abas irmãs na mesma barra.

**Riscos honestos:** é a área mais testada do app (5.7, 5.8, D2.50, R-040, R-083); mexe em layout + máquina de estados, então screenshot/E2E sentem; e o E2E completo segue inútil no sandbox (88✘ ambientais), logo a régua tem de ser **por spec**.

**Opções:**
| Opção | O que é | Custo/risco |
|---|---|---|
| **A — fatia própria agora** ("11-A: Editor Único") | Faz a unificação já, antes de 09/10 | Alto e interrompe a sequência do MVP (09 Conversar → 10 Agir) |
| **B — abrir a FATIA 15 por aqui (pós-D95)** ⭐ | A 15 já prevê **"Casa Editor (abas do EditorArea + gestão de abas)"** e o critério "editar/salvar sem F5" — a unificação é **pré-requisito** dele | Faz 09 e 10 (fecha o MVP) e começa a 15 por este trabalho (MVP fechado em D94) |
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
| **Browser** | **não é dívida** — conteúdo real **DEBT-20** (era FATIA 15-Conferir; SPEC 2I = só abas; revisão após 11–15) | expectativa antiga (specs de 17/09) em **quarentena** (D80) — expectativa morta | **medido 16/10:** abre no **editor moderno** (aba), em **modo anexo**; conteúdo real: DEBT-20 (revisão após 11–15) |
| **Branch Changes** | idem acima — diff real **DEBT-18** (era FATIA 15-Conferir; SPEC 2I = só abas; revisão após 11–15) | idem | **medido 16/10:** abre no **editor moderno** (aba), em **modo anexo**; diff real: DEBT-18 (revisão após 11–15) |

**Medição ao vivo (app rodando, 1600×950, sessão ativa):** clicar em *"Abrir alterações no editor"* (Titlebar) e *"Abrir navegador no editor"* → em ambos os casos o painel cai em `section.editor-pane` (**EditorArea = editor moderno**), em `side-pane-editor-only`, com **chat 471 px | editor 471 px** (modo anexo) e a **aba** correspondente na barra do editor ("Branch Changes" / "Browser"). O próprio estado vazio do editor declara: *"Browser, Search e Branch Changes abrem aqui — não na barra auxiliar."* Prints: `validacao_fatia08/aba_branch_changes.png`, `aba_browser.png`.
**Conclusão:** para as **três** superfícies (Provedores, Browser, Branch Changes) o que resta é a **mesma decisão de POSICIONAMENTO** (modo anexo × modo maximizado) — nenhuma tem componente legado, nenhuma "nasceu" na FATIA 15 (pós-D95).

**A2 — DECIDIDO em 17/10 (dono): abertura segue o estado do editor (D88).**
| Situação ao abrir a superfície | Regra decidida |
|---|---|
| Editor **aberto em modo anexo** | abre em **modo anexo** |
| Editor **aberto em modo maximizado** | abre em **modo maximizado** |
| Editor **fechado** | abre no **último modo** que o usuário deixou o editor (memória entre reloads) |
| Nunca usou (primeira vez) | **modo anexo** (padrão de fábrica) |
| **Arquivo aberto + Provedores ao mesmo tempo** | **FATIA 15** — decidir (pós-D95) junto do trabalho de abas (escolha do dono) |

**ACHADO TÉCNICO decisivo (17/10, leitura do código):** existem **DOIS "maximizados" diferentes** no app, e só um é o que o dono quer:
| Estado | Onde | Persistido? | O que faz |
|---|---|---|---|
| `layout.state.editorMaximized` (`shell/layoutState.ts:33`) | usado em `App.tsx:2075` (classe no `.top-right-section`) | **SIM** (localStorage, "F5 mantém") | maximiza a **coluna anexa (AuxiliaryBar)** — recurso antigo 5.7/RF-07, ligado por eventos `editor.attachMaximized/Restored` |
| `editorMaximized` local (`App.tsx:550`, `useState(false)`) | usado em `App.tsx:2136` (ramo que renderiza só o editor) e no botão **"Maximizar editor"** (`App.tsx:1977`) | **NÃO** | é o modo que o dono chama de **maximizado**: chat some, editor toma o centro (o que foi medido: 471 → **942 px**) |
**Consequências:** (a) **o "último modo" NÃO é lembrado hoje** — o estado que importa nasce `false` a cada carga, então quem maximizou ontem abre em anexo hoje; (b) **nome igual para coisas diferentes** — implementar a D88 sem separar os dois pode maximizar a coluna errada; (c) a parte "editor já aberto em maximizado → Provedores abre maximizado" **já funciona hoje** (o toggle não é resetado ao abrir superfície), falta a memória e o A1.

**A2 como o dono formulou em 16/10 (histórico, agora decidido):** *"Abertura baseada no estado do editor — Provedores (e futuros painéis) devem abrir no modo atual do editor de código (anexo ou maximizado). O pulo do chat não deve acontecer caso esteja abrindo no modo anexo."*
- Parte **"o pulo não deve acontecer"** = **A1** (independente do modo; vale para anexo e maximizado) — **continua separado da D88**;
- Parte **"seguir o modo atual do editor"** = regra de roteamento — dois casos a decidir em palavras: **(i)** landing sem arquivo (qual é "o modo atual"? padrão hoje = anexo) e **(ii)** arquivo aberto + Provedores (hoje o arquivo fica na coluna anexa e o Provedores ocupa o centro espremido — decisão de abas, casa natural = FATIA 15 (pós-D95)).

## 8.5 Autoavaliação de maturidade — "3 níveis" (2026-10-17, a pedido do dono)
O dono enviou um vídeo de terceiro (anúncio de curso, 60 s) que descreve **3 níveis de desenvolvimento com IA**: **(1) vibe coding** (prompt → aceita tudo → torce) · **(2) configurações** (skills, rules, MCP servers) · **(3) workflow assistido** (spec antes do código, testes automatizados no loop, code review que bloqueia deploy, contexto por grafos, loop engineering, **métricas**: carga, complexidade ciclomática, estrutura de dependências, cobertura). Análise completa em `/home/user/uploads/midia_16-10/ANALISE_VIDEO_16-10.md` (fora do repo).

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
| P2 | **A2 — "a tela sobe": causa CONFIRMADA no código (16/10).** O dono marcou na imagem que o que sobe é **a tela central do chat** (a landing "Nova sessão em workspace-local") — resposta **B**. Mecanismo: a centralização da landing depende do estado do painel lateral — `isChatCentered(inputs) = (resolveSidePaneState(inputs) === 'closed')` (`domain/sidePane.ts`). Sem aba aberta, os inputs são `{hasEditorTabs:false,…}` → estado **`'closed'`** → entra a classe `chat-centered` (`.desktop-surface-group.chat-centered{align-items:center}` + faixa de 950 px) e a landing fica centralizada. Ao abrir **Provedores** (aba **global**, sem dono de sessão — justamente o caso do DEBT-09), `hasEditorTabs` vira `true` → estado **`'editor-only'`** → a classe **sai** e o conteúdo ancora no topo. Regra herdada do desenho original ("Chat centers itself in the 950px band only when it is the sole surface"); a **landing** é que herda a regra e dá o salto. | Junto do P1 ou **FATIA 13** (pré-D95 = 17) — corrigível de três formas (A pequena: manter a landing centralizada com aba global aberta · B de rumo: sai de graça se Provedores passar a abrir na superfície nova · C: deixar como está) |
| P3 | **D85 — valor de contexto/máximo de saída**: dono ainda vai decidir o número que usa; nada de teto artificial no app. | Aguardando decisão |
| P4 | **A4 — "copiar o layout do LiteLLM"** (ele citou LiteLLM na fala; a tela do fim do vídeo era um estudo Open WebUI "Models", Demo Mode). Ordem: **"vamos apenas conversar por enquanto"**. | Futuro, sem fatia definida |

---

# PARTE 3 — Roadmap Completo Spec-Driven (Fatias 07 a 20 — renumeração D95 de 2026-10-19 (antes D64))

Todas as fatias estruturadas sob o padrão **especificação prévia, escopo vertical e critérios rígidos de aceitação**. **Cada fatia agora tem duas tarefas: a FUNÇÃO (o que entrega) e a CASA (o que muda de endereço no `App.tsx`)** — a fila e a arquitetura andam juntas (D68/D69; condomínio no `04 §2.2`).

> **Referências raspadas (14/10, D77):** `docs/arquivo_morto/referencias/` — VS Code 1.135 · OpenClaude · Cline (Provedores) · Arquitetura limpa; **índice + 12 notas** (`00_INDICE.md`), cada uma dizendo **para qual fatia serve**. Consultar antes de redescobrir.

### FATIA 07 — Destravar (Dívidas Estruturais) — era a 6.1
- **Objetivo:** Sincronização atômica Workspace-Explorer-Terminal + Provedores na landing + eliminação do visualizador legado (só as 3 estruturais).
- **Bloqueio:** bloqueia a FATIA 08 (e todo o caminho do MVP). **SPEC completa na PARTE 2.**

### FATIA 08 — Conectar (Provedores estilo Cline) — era a 09
- **Objetivo:** Gestão rica de múltiplos provedores de IA, inspirada no Cline.
- **Escopo:** formulários dedicados (OpenAI, Anthropic, Gemini, Ollama local, OpenRouter, DeepSeek…), seleção dinâmica de modelos, teste de conexão, persistência local segura (`~/.agente_window/providers.json`) sem expor credenciais. **Absorve a DEBT-10.** **SPEC detalhada: PARTE 2B** (escrita em 15/10; D81–D84 fechadas com o dono). **IMPLEMENTADA em 15/10** (`f87981c`/`2b371c2`/`fde5f0f`; estado e prova na PARTE 2B §8) — HOMOLOGADA pelo dono em 17/10 (D89). **Casa:** `2-inteligencia/casas/provedores` nasceu aqui (1.º módulo extraído, D68/D69).
- **Critério de aceite:** configurar múltiplos provedores, testar conexão com sucesso e persistir entre reloads.
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-06-chat/GUI_PROVEDORES_CLONE.md` + `PROVIDERS_EXEMPLO.json`; **e a nota nova:** `arquivo_morto/referencias/cline/01_tela_de_provedores.md` (campo a campo, com os caminhos do repo do Cline) + `referencias/openclaude/04_provedores_descriptor_first.md` (o esqueleto de dados por trás da tela).

### FATIA 09 — Conversar (Chat real + Streaming) — era a 10
> **STATUS (17/10): IMPLEMENTADA EM 5 COMMITS E VALIDADA NA MÁQUINA DO DONO — HOMOLOGADA pelo dono em 18/10 (D92).** Commits: `5968b70` (casa Conversa + rota `/api/chat`) · `9e2c703` (streaming no servidor: fio SSE + Parar + réguas) · `c0af6fe` (ligação no chat + Parar honesto) · `90f75c8` (E2E 5 provas + 3 consertos de F5/histórico) · **C5 = documentação** (esta revisão). Provas: tsc **0** · unit **813✓ / 12✗ pré-existentes / 16skip** · E2E `conversa_fatia09` **5/5 em 4 rodadas seguidas** (stub local 4599) · **validação real do dono em 2 vídeos de 17/10** (Ollama local respondendo, Markdown completo, rodapé com o modelo efetivo, provedor ativo persistindo). Pendências registradas pós-09: **DEBT-14** (seletor de modelos do composador × provedor ativo) e **DEBT-15** (bolinha do provedor ativo fácil de esquecer). **Fase ativa passou à FATIA 10 — Agir** (SPEC: `PARTE 2D`, fim deste arquivo).
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
> **STATUS (19/10): IMPLEMENTADA em 5 commits + MVP HOMOLOGADO (D94).** C1–C5: `547729e`/`8b93c05`/`c1b6518`/`1c4945d`/C5-docs. Provas: tsc 0 · unit 872✓/12✗ pré/16skip · E2E agir 5/5 (stub) · fatias 08+09+10 15/15. SPEC: PARTE 2D; detalhe: `07`.
- **Objetivo:** o agente age no **sistema de arquivos** com autorização do usuário — **recorte fechado (D72): só arquivos; terminal-visual na FATIA 16 + terminal-para-o-agente na FATIA 13 (pós-D95)**.
- **Escopo:** ferramentas ligadas ao servidor existente (`/fs/*` + **`fsHost`** — escrita atômica **já pronta**, conferida no código em 18/10: `writeFileAtomic`, temp+rename) + card **[Permitir] / [Negar] / [Permitir na Sessão]** + trava anti-loop (3 chamadas idênticas). Detalhe completo: **PARTE 2D**, fim deste arquivo.
- **Critério de aceite:** o agente propõe uma ação (ex.: criar arquivo) e **só executa após autorização** — é o teste final do MVP.
- **Q6 RESPONDIDA (D72, 14/10):** no MVP o agente mexe **só em arquivos** (ler, criar, escrever, listar, buscar); **rodar comandos no terminal é bloqueado** — mais poderoso e mais perigoso (ex.: `rm -rf`), exige protocolo de permissão mais maduro e entra em duas: **terminal-para-o-agente na FATIA 13** e reforma visual na **FATIA 16** (pós-D95).
- **Referência raspada:** `arquivo_morto/pesquisa_bruta/fatia-06-chat/PERMISSOES.md` (card de 3 botões + resposta `allow/deny` + guardião `doomLoop` de 3 chamadas) e `fatia-09-tools/` (worktree/painel de alterações — **fora do escopo da 10**, são tema das fatias 15/19 (era 11/15 pré-D95)). *(A nota externa `referencias/openclaude/03_sessoes_e_permissoes.md` não sobreviveu à faxina de 17/10 — a referência válida hoje é o PERMISSOES.md, dentro do repo.)*

### FATIA 11 — Teto + "Continuar?" + Config v1 (nova, D95)
> **STATUS (21/10): ✅ HOMOLOGADA (D96).** Teto 1–250 + Continuar/Parar + Config + auto-scroll + pós-11 C1–C7. Provas: tsc 0 · unit 906✓/12✗ pré · régua 18/18 · trava C7 3/3.
- **Objetivo:** desbloquear tarefa real: teto configurável, cartão "continuar?" ao bater, aba Configurações, auto-scroll.
- **Escopo:** Config (teto + auto-scroll); loop lê teto; fim de teto = cartão **[Continuar]**/**[Parar]**; anti-loop 3× fixo.
- **Critério de aceite:** teto=2 para com "continuar?"; Continuar retoma e conclui; recarregar persiste; tsc 0 + testes verdes.

### FATIA 12 — DELETE micro (nova, D95 — DEBT-16 decidido)
> **STATUS (21/10): ✅ HOMOLOGADA (D97).** Tool `excluir` + lixeira por SO + cartão reforçado + RF12-3 + C4 (switch PowerShell) + C5 (território canônico). Provas: tsc 0 · unit 935✓/12✗ pré/16skip · E2E 5/5 · régua 23/23. Registro honesto: retest Windows real dos C4+C5 não confirmado (declaração, padrão D94).
- **Objetivo:** CRUD completo: excluir arquivo+pasta para a lixeira, sempre com cartão reforçado.
- **Escopo:** tool `excluir`; cartão reforçado ("sem desfazer direto" + caminho + contagem); território = pasta ativa; "Permitir na Sessão" NÃO cobre excluir.
- **Critério de aceite:** sem aprovar nada some; aprovado vai p/ lixeira e restaura pelo SO; `../fora` recusa.

### MICRO-FATIA PERF — Desempenho SCM/Explorer em pastas gigantes (nova, D98 — entre a 12 e a 13, sem renumerar)
> **STATUS (D99, 23/10): confirmação autorizada em princípio, mas BLOQUEADA até o dono validar esta consolidação documental.** Travamento com Git + pasta gigante (vscode-main, 23k arquivos): causa ainda é hipótese a confirmar, não diagnóstico independente. Escopo autorizado: SCM + Explorer juntos; investigação com trace CDP e fixture/protótipo isolado. Miolo `core`/`server` só poderá ser avaliado dentro do escopo fechado, sem alteração permanente antes de SPEC e aprovação. Carta-base fora do repo: `/home/user/notas_temporarias/carta_contexto_chat_arena_bug_desempenho.md`.
- **Objetivo:** medir abertura e uso de pastas grandes sem travamento: SCM utilizável + Explorer expansível, com gargalos separados por causa.
- **Próximo passo:** aguardar validação do pacote documental; então executar confirmação técnica isolada, registrar medições, derivar critérios quantitativos para SPEC mínima e aguardar aprovação. Nenhum teste/trace/protótipo D98 foi executado nesta etapa.
- **Métricas a apurar para a SPEC:** tempo até interface utilizável; tarefas longas; elementos efetivamente renderizados; desempenho com grandes volumes; gargalos de Git e filesystem. Quantitativos só após medição; homologação funcional do dono.
- **Não é:** implementação agora, reforma geral do Explorer/SCM, feature adicional ou reabertura da 15. Não renumera fatias.

### FATIA 13 — Terminal-para-o-agente (nova, D95)
> **STATUS (20/10): SPEC FECHADA — PARTE 2G (Q&A 100%).** Ferramenta `executar` · shell do app · 2min + "continuar aguardando?" · cauda 20KB · sessão p/ comuns · negação dura. **Risco declarado: sem sandbox real.** **DEBT-23 (21/10, D97; reafirmada em D99):** acesso total + lixeira/permanente + YOLO. Na abertura da FATIA 13, exigir decisão específica do dono sobre escopo e segurança antes de incluí-la em qualquer SPEC; a SPEC 2G fechada não a cobre. Nota anterior em `registro_alinhamento/`.
- **Objetivo:** o agente executa comandos (instalar, compilar, testar) — um cartão por comando.
- **Escopo:** one-shot com cwd = pasta ativa; cartão tipo-comando; Parar mata o processo; nada de terminal visual (é a 16).
- **Critério de aceite:** `echo` aprovado roda; `rm -rf` com sessão pergunta igual; 2min pergunta; saída gigante = 20KB + "cortada".

### FATIA 14 — Barra esquerda + Personalizações + Skills (nova, D95)
> **STATUS (20/10): SPEC FECHADA — PARTE 2H (Q&A 100%).** v1 = Visão geral+Habilidades+Ferramentas · `SKILL.md` · só manual · usuário+projeto · Command Center na 17 · v2-auto=(a) após a 14. Régua: mockup HTML do VS Code.
- **Objetivo:** terminar a lateral esquerda como casa das Personalizações, com Habilidades funcionais.
- **Escopo:** seção Personalizações (medidas do mockup); skills criar/listar/ligar/invocar; Ferramentas liga/desliga.
- **Casas (D69):** nascem **Sessões** e **Personalizações**.
- **Critério de aceite:** lateral fiel ±2px; `/nome` invoca; desligada some do anúncio; F5 persiste.

### FATIA 15 — Janela única de abas (DEBT-12) — era a 11 (pós-D95)
> **ABERTURA DECIDIDA (D90, 17/10):** a fatia **começa por DEBT-12 — "janela única de abas"** (avaliação completa em `§8.7`): fundir os **dois modelos de aba** (`EditorTab` × `AttachTab`), trazer o **editor que salva** para a aba central, rotear Explorer/Busca/SCM para a barra única e **aposentar a coluna da direita** (`AuxiliaryBar`/`AttachArea` + `pendingAttachOpen` + Regra 10; máquina de estados do painel **4 → 2**). É **pré-requisito** do critério de aceite abaixo ("editar e salvar sem F5"). Ganho colateral: o caso "arquivo aberto + Provedores ao mesmo tempo" (`§8.4`) **deixa de existir por construção**. Repontar **31 testes de unidade + 11 specs E2E** que tocam o anexo; os obsoletos vão para quarentena **com registro** (nunca apagar em silêncio).
> **Pendência do dono (D86/A1) — RESOLVIDA em 17/10:** a definição de "o novo" foi fechada (`D87`, `§8.3/§8.6`) — não havia componente legado; o padrão de abertura foi corrigido (A1) e a regra do modo ficou na `D88`. O que resta desta família já está na `D90`. 
- **Objetivo:** fundir os dois modelos de aba numa barra única estilo VS Code; aposentar a coluna direita. (SPEC FECHADA: PARTE 2I — Q&A 100% 20/10.)
- **Escopo:** `EditorTab` × `AttachTab` fundidos; editor que salva na aba central; Explorer/Busca/SCM roteados para a barra única; aposentadoria de `AuxiliaryBar`/`AttachArea` + `pendingAttachOpen` + Regra 10; máquina de estados do painel 4→2; F5 restaura abas e modos.
- **Critério de aceite:** editar+salvar **sem F5** (critério-mãe); arquivo + Provedores como abas irmãs alternando sem perder estado; F5 restaura; 31 unit + 11 E2E repontados (obsoleto → quarentena com registro).
- **Casas (D69):** nasce a **Casa Editor** (`1-workbench/casas/editor` — abas de `EditorArea.tsx` + gestão de abas hoje no `App.tsx`). (A Casa Personalizações nasce na FATIA 14 — D95; E4 encerrado.) ⚠️ O `EditorArea` em si segue **endereço congelado** — só se move com ordem expressa.
- **Fora da 15 (alinhado à SPEC 2I fechada):** stage/unstage real no SCM (**DEBT-18**), file ops pelo Explorer (**DEBT-19**) e conteúdo real do Browser (**DEBT-20**) (escopo antigo "Conferir") ficam como dívidas — **revisão do dono após 11–15**; a "lupa" = DEBT-17 (aguarda definição dele).
- **Referência no código:** o diff real **já existe** — `shell/sideBar/views/ScmView.tsx` + `ui/attach/changes/ChangesPane.tsx` → `core/git/gitService.ts` (getDiff). **Não** ressuscitar o diff antigo do Windows.

### FATIA 16 — Terminal 2.0 (Transplante visual) — absorve DEBT-01 + DEBT-02 + DEBT-03 (era a 12; terminal-para-o-agente é a nova 13)
- **Objetivo:** o "transplante" do terminal apontado no vídeo de 13/10 — aparência e comportamentos do original, terminais dívidas antigas.
- **Escopo:** DEBT-01 (`clear` limpa o viewport sem resíduos) · DEBT-02 (arrastar o terminal para painel inferior ou lateral **sem quebrar o grid nem empilhar sessão**) · DEBT-03 (verificação de realidade das abas do painel inferior — Problemas/Saída/Depuração/Terminal/**Portas** — e paridade de comportamento) · comportamentos do vídeo: **Ctrl+C/Ctrl+V**, **arrastar arquivo/pasta para o terminal e ver o caminho**, **arrastar o terminal para dividir telas** · conserto das **9 falhas de teste unitário do terminal** (onda 2 da faxina, D74).
- **Casa (D69):** o Terminal — área de **endereço congelado** — é a **única área protegida que muda de endereço, e só nesta fatia**: `components/terminal` + `services/pty-server` → `1-workbench/casas/terminal` (**com ordem expressa do dono**).
- **Critério de aceite:** mover o terminal entre painel inferior e lateral preservando as sessões abertas; `clear` sem artefatos; suíte do terminal **verde** (0 falhas — fim do P4).
- **Em aberto:** a aba "Portas" é real ou simulação? (verificar contra o code-server 8080.)
- **Referência raspada (14/10):** `referencias/vs-code-1.135/04_terminal_e_pty.md` (pty host, batimento, capacidades, menu de contexto, terminal-como-aba; e o achado do agente usando terminal na 1.135 — a fronteira da D72).

### FATIA 17 — Refinamentos + Casa Command Center (era a 13; Casa Sessões foi para a 14)
> **Pendência do dono (D86/A2):** tela de Provedores "gruda no topo" × tela de novo chat centralizada — refinamento visual apontado no vídeo de 15/10. — absorve DEBT-05/07/11 + D2.23
- **Objetivo:** fechar o que ficou fora do caminho crítico do MVP + extrair as duas casas da barra lateral/topo.
- **Escopo:** DEBT-05 (picker nativo no Windows + fallback Linux) · DEBT-07 (pastas recentes no seletor) · **DEBT-11/E9 (a Pesquisa volta ao lugar — a troca de pasta fica *dentro* dela, como seletor, D73)** · D2.23 (Trilha de Navegação/breadcrumbs **navegável**: menus suspensos + estrutura interna do código) · lacunas do mockup na sidebar de Sessões (→ FATIA 14, pós-D95) (29/29, busca, Novo Grupo Ctrl+N, indicador de voz, +1 workspace) e **histórico de chats antigos** (item 3 do vídeo de 12/10).
- **Casas (D69):** nasce a **Command Center** (`1-workbench/casas/command-center` — `WorkspaceSwitcher` + centro da Titlebar; **o Titlebar fica corredor**, sem estado, D70). (A Casa Sessões nasce na FATIA 14 — D95.)
- **Critério de aceite:** os 4 débitos com o comportamento do original; a casa com porta única (`index.ts`) + teste de fronteira verde.
- **Referência:** mockup `arquivo_morto/pesquisa_bruta/personalizacoes/vscode_agents_mockup_interativo (1).html` — barra lateral esquerda fiel (Sessões 29/29 + Personalizações 16).

### FATIA 18 — Painéis (Drag & Drop Avançado) (era a 14)
- **Objetivo:** modularidade total de janelas e painéis conforme o original (parte geral — o que não é terminal).
- **Escopo:** splits horizontais e verticais de painéis funcionais sem quebrar o grid; animação fiel do indicador de drop ("Drop view here", item 9 do vídeo 13/10); limpeza do campo órfão `auxiliaryVisible` (D2.72 — reservada para cá).
- **Casas (D69):** sem casa nova — é layout (`shell/`, corredor); extrair conforme necessidade.
- **Critério de aceite:** arranjar painéis como no VS Code (mover, dividir, fechar) sem quebrar o grid; paridade da animação.

### FATIA 19 — Worktree & Isolamento de Sessões (era a 15)
- **Objetivo:** execução de tarefas em ambiente isolado sem afetar a árvore principal de trabalho.
- **Escopo:** criar sessão em `git worktree` temporária ("Nova Árvore de Trabalho" — o chip do original visto no item 5 do vídeo de 12/10), isolamento dos arquivos modificados e merge/descarte controlado pelo usuário.
- **Casas (D69):** sem casa nova — extensão da Casa **Sessões** (14, pós-D95) + Agent Host; extrair conforme necessidade.
- **Critério de aceite:** abrir sessão isolada, modificar arquivos e descartar sem alterar a pasta principal do workspace.

### FATIA 20 — Polimento + Navegador (POR ÚLTIMO) (era a 16)
- **Objetivo:** acabamento estético, atalhos globais e paridade final de 90 % com o original — **o navegador entra aqui, por último** (acordo com a Meta, 14/10).
- **Escopo:** posição da Activity Bar (topo/lateral — DEBT-08, Baixa) · Command Palette (Ctrl+Shift+P) · fidelidade de animações · temas dark/light · atalhos · **botão que abre navegador** (apontado pelo dono no vídeo de 12/10, ~2:18 — "é outro, mostro depois") + **Casa Navegador** (`1-workbench/casas/navegador`, extraída do `BrowserPreview` de `EditorArea.tsx`; padrão do `simple-browser` do VS Code).
- **Critério de aceite:** inspeção lado a lado com o code-server (8080) comprovando paridade visual e funcional de 90 %; o botão do navegador funcionando.
- **Entrega (D78):** a padronização final do código + o pacote de documentação de entrega **não** entram aqui — viram a **etapa ENCERRAMENTO**, logo depois desta fatia (ver PARTE 4).

---

## Iniciativa de contexto M1–M4 — análise estática de dependências (D99, 2026-10-23; não é roadmap numerado)

**Decisão vigente:** M1–M4 são o primeiro conjunto aprovado para planejamento; não há autorização para implementação, inserção entre fatias oficiais ou renumeração. M5–M8 estão formalizadas apenas para planejamento pela D102, com contrato e SPEC ainda pendentes. A análise abaixo cruza as propostas do estudo `docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/` com as Fatias 13–15 já especificadas; é documental/estática, sem testes de código nesta etapa.

| Iniciativa | Dependências e sobreposições com Fatias 13–15 | Consequência para sequência |
|---|---|---|
| **M1 — medição/orçamento** | Requer alvo/modelo efetivo e uso real/estimado (`usage`), limites e contexto enviado. A Fatia 13 acrescenta chamadas de terminal ao contexto do agente; a 14 pode acrescentar skills/instruções; logo contratos de prompt/ferramentas ainda mudam antes delas. A 15 muda a composição de abas/editor e pode competir por wiring central, embora não seja dependência funcional do medidor. | Planejar após contratos de 13/14 estabilizados; executar depois de 15 para reduzir retrabalho de integração. Continua pré-requisito de M3. Não assumir precisão sem `usage`; estimativa identificada ou indisponível, alertas 75%/90%. |
| **M2 — transcript estruturado** | Precisa identidade, ordem e pareamento fiel de chamadas/resultados. Fatia 13 cria novo tipo de tool call; a 14 pode introduzir invocação/contexto de skills; a 15 mexe em composição de sessão/editor e pode elevar conflito de wiring/persistência. | Fechar cobertura de eventos após 13/14; planejar schema preservando extensibilidade e transcript original. Implementação recomendada após 15 para evitar migrações concorrentes; pré-requisito direto de M3 e M4. |
| **M3 — checkpoints/compactação** | Depende de M1 (orçamento confiável) e M2 (fonte estruturada, IDs, chamadas/resultados); não depende diretamente das Fatias 13–15, mas qualquer tipo de evento novo nelas deve estar contemplado em M2. | Somente após M1 + M2; preservar transcript original e nunca gravar checkpoint vazio/inválido como válido. |
| **M4 — busca manual no histórico** | Depende de M2 para IDs/sequence e fonte fiel; busca pode ler transcript original sem M3. UI tende a tocar ChatPanel/sessões, mas não há dependência funcional obrigatória da 15; executar após a 15 reduz concorrência com alterações de abas e composição. | Após M2; recomendação de menor risco é depois de M3, embora M3 não seja pré-requisito técnico. |

**Sequência recomendada, sem alterar ordem ou numeração oficial:** Gate D98 permanece aberto; qualquer continuação depende da avaliação/decisão do dono e do protocolo próprio, sem início automático após esta atualização → Fatia 13 (com decisão própria de DEBT-23 na abertura) → Fatia 14 → Fatia 15, mantendo a ordem canônica; então abrir as SPECs da iniciativa na ordem **M1 → M2 → M3 → M4**. M3 depende de M1+M2; M4 depende de M2. A recomendação anterior de especificar M1/M2 em paralelo foi revogada por D109. Investigações preparatórias podem ser paralelas, mas não alteram essa ordem nem autorizam execução. A recomendação de executar memória depois da 15 é por estabilidade de contratos e menor risco de retrabalho/conflitos, não por dependência funcional dura. O estudo preservado pode conter posições hipotéticas M1–M8: elas não são oficiais nem substituem esta decisão.

---

## Alinhamento de planejamento D102 — decisões D1–D6 (26/10/2026)

**Autoridade e limite:** D102 aprovou M5–M8 apenas para planejamento e ICs como propostas. As decisões posteriores D103–D112 corrigem as fronteiras e incorporam D1–D10 desta etapa; D113–D115, registradas adiante, são as decisões vigentes sobre confiança local, modos e seleção de modelo. Este alinhamento não fecha SPEC, não homologa CAP, não inicia D98, não muda código e não autoriza implementação. As constatações F1–F8 são estáticas e ficam na matriz de riscos abaixo.

### Iniciativas M — status após D102

| Iniciativa | Responsabilidade primária planejada | Dependência/condição | Estado |
|---|---|---|---|
| M1 | Medição/orçamento de contexto | Contexto real do provedor, limites e métricas | D99: planejamento aprovado |
| M2 | Transcript estruturado de ferramentas/modelo | IDs, ordem, persistência original, compatibilidade | D99: planejamento aprovado |
| M3 | Checkpoint/compactação reconstruível | **M1 + M2**, sem apagar fonte | D99: planejamento aprovado |
| M4 | Busca **manual** no histórico original | **M2**, limites e controle por sessão | D99: planejamento aprovado |
| M5 | Memória durável **do projeto** | Definir isolamento, consentimento, edição, expurgo, retenção, relação M2/M4 | **D102: formalizada apenas para planejamento** |
| M6 | Recuperação de memória/histórico **pelo agente** | M5 e fonte/proveniência; M2/M4 quando pertinente; limites e permissões | **D102: formalizada apenas para planejamento** |
| M7 | Retomada operacional segura após interrupção/reinício | Estado durável de execução, M2/M3, rechecagem de efeitos, idempotência e aprovações | **D102: formalizada apenas para planejamento** |
| M8 | Hardening, privacidade e homologação de memória/continuidade | Propriedades definidas em M5–M7; segurança transversal desde o início | **D102: formalizada apenas para planejamento** |

M5–M8 mantêm os nomes/estudos prévios no `arquivo_morto` como **material histórico de apoio**: não importar a numeração hipotética daquele estudo para Fatias 13–20. A lista de dependências acima é **hipótese de planejamento para crítica da Arena**, não bloqueio técnico demonstrado nem cronograma definitivo. M8 não adia testes de segurança necessários já nas etapas anteriores.

### Iniciativas complementares e atividades transversais — após D110

| ID rastreável | Responsabilidade delimitada | CAP | Dependência/decisão | Estado documental |
|---|---|---|---|---|
| **IC-01** | Exploração **read-only do workspace** e compreensão arquitetural: localizar arquivos/relações e citar fontes. Não inclui recuperação de memória/histórico. | 01–02 | Reusar Explorer/Search sem presumir que a UI já seja tool. D98 continua restrito a SCM/Explorer. | Proposta; destino e SPEC pendentes |
| **IC-02-FS** | Ferramentas do agente para operações faltantes (mover/renomear) e semântica segura de arquivos; não é responsável pelo hardening transversal. | 04 | D103–D107; F1–F4; depender de SPEC e gates de segurança. | Proposta; destino e SPEC pendentes |
| **IC-02-DOC** | Produção/atualização de documentação técnica com evidências e coerência com decisões; não é uma ferramenta de filesystem por si só. | 03 | Pode consumir resultados de IC-01 e usar IC-02-FS só quando autorizado. | Proposta separada; destino e SPEC pendentes |
| **IC-03** | Ferramentas Git do agente, distintas do SCM visual e do worktree da Fatia 19. | 06 | Operações autorizadas, efeitos destrutivos e testes isolados. | Proposta; destino e SPEC pendentes |
| **IC-04** | Pesquisa externa pelo agente, distinta do Browser visual e sem confundir fontes externas não confiáveis com instruções. | 07 | D105 local-only; rede, proveniência, privacidade e custo exigem nova decisão/SPEC. | Proposta; destino e SPEC pendentes |
| **IC-05** | Planner estruturado: plano, dependências, estados e replanejamento; não executa por si só. | 11–12 | D108; um único Agent Loop; plano não autoriza mutação. | Proposta; destino e SPEC pendentes |
| **IC-06** | Plugins/MCP além de skills v1 da Fatia 14. | 15 | Contratos de extensão, confiança, permissões, instalação/remoção; Fatia 14 não é autorização para MCP. | Proposta; destino e SPEC pendentes |
| **IC-07 (absorvida)** | Não cria nova Central de Diagnósticos. Referencia a capacidade futura já aprovada em D99/`04 §1.4`, com SPEC própria pendente. Correlação/privacidade são questões dessa SPEC. | 18 | Não duplicar D99, não abrir nova fatia por rastreabilidade. | Reclassificada: vínculo documental, não nova iniciativa de produto |
| **IC-08 (estreitada)** | Capacidade do agente de selecionar/executar verificações e relatar resultado. **Não** contém a matriz geral de compatibilidade nem o uso/contexto dos provedores. | 19 | Terminal-agente da 13 quando aplicável; D112; resultados verificáveis. | Proposta de produto estreita; destino/SPEC pendentes |
| **IC-09 (transversal)** | Aceitação transversal dos cinco cenários CAP/D100 e integração da cobertura, segundo D101. Não é funcionalidade do agente. | 01–20 | Critérios prévios, evidência comparável e aceite humano em `08`; sem reabrir Fatias 07–12. | Reclassificada como governança transversal; sem fatia/SPEC de produto |

**Atividades transversais, não ICs de produto:** (a) contenção, autorização, privacidade e testes negativos F1–F8 — D103–D111, em todas as SPECs pertinentes; (b) matriz de provedores/compatibilidade e telemetria de contexto — D112/`09 §3.10` e M1, sem duplicar IC-08; (c) Central de Diagnósticos — D99, sem duplicar IC-07; (d) critérios de cobertura/homologação — D101/`08`, sem converter IC-09 em feature. IDs antigos permanecem citáveis para rastreabilidade; nada aqui cria Fatia 21 ou altera escopos 13–20.
### Matriz de riscos e pendências F1–F8 (auditoria independente D102)

**Status epistemológico:** F1–F8 são achados de inspeção estática da auditoria Arena; não foram reproduzidos em runtime nesta rodada nem corrigidos pelo registro documental. Prioridade original preservada. “Critério futuro” é preliminar, não SPEC.

| ID | Prioridade | Constatação/limite atual | Decisão e vínculo | Critério preliminar para validação futura |
|---|---|---|---|---|
| **F1 — workspace/autorização API** | **Alta**, risco condicionado à exposição de rede | Handler aceita `workspace` e `permissoes` do cliente; valida caminho existente, sem vínculo servidor-sessão identificado. Vite declara `0.0.0.0` e `allowedHosts: true`. Estático, sem exploração reproduzida. | D103–D105; bloqueia ampliação de autonomia. Restrição de rede local e autorização de operação são controles distintos. | Cliente adulterado não troca workspace nem eleva permissão; sessão e projeto validados pelo servidor; acesso de rede externo ao computador local negado. |
| **F2 — symlinks/caminhos externos** | **Alta** | Trava lexical `resolve` não comprova identidade física do alvo; symlink/junction pode escapar. Sem teste de symlink/junction no inventário auditado. Estático. | D106/D111; IC-02-FS; transversal. | Casos positivos/negativos com symlink, junction, raiz e destino externo em POSIX/Windows; recusa sem leitura/escrita fora do escopo. |
| **F3 — cancelamento/aprovação** | **Alta** | Espera pendente de aprovação não tem invalidação ligada ao abort observada; UI pode manter cartão pendente. Não há teste-fonte da corrida. Não reproduzido. | D107/D111; IC-05/M7 quando a retomada for pertinente. | Parar torna aprovação atrasada ineficaz; cancelamento, duas respostas e continuação concorrente não executam efeitos; estado terminal claro. |
| **F4 — colisão/atomicidade** | **Alta** | `criar` não recusa arquivo regular existente; fallback após falha de rename escreve direto no destino. Estático. | D106/D111; IC-02-FS; nunca declarar funcionalidade corrigida por documentação. | Colisão preserva bytes; gravação condicionada à versão/identidade observada; interrupção, rename failure e concorrência não deixam arquivo parcial/substituição silenciosa. |
| **F5 — modos/modelo** | **Média/alta** | Modo e chip de modelo são armazenados na UI, mas não enviados como política efetiva ao servidor/alvo; fluxo de envio comum. | D108/D114/D115; DEBT-14; CAP-09/11/12/14. | Separado em F5-A (enforcement server-side) e F5-B (catálogo/fonte/seleção exata); Ask/Plan sem efeitos, Agir só usa tool autorizado, nenhum fallback. |
| **F6 — contexto/anexos** | **Média** | Medidor é fórmula heurística; anexos levam metadados/nome, não bytes. | M1 e contrato futuro de anexos; CAP-09/10; D112. | `usage` real quando disponível; estimativa rotulada ou indisponível; anexo declara se é referência ou conteúdo e nunca finge leitura. |
| **F7 — retomada** | **Média** | Retomada/aprovação em mapas voláteis; reinício perde estado operacional; concorrência de continuar não demonstrada. | M7, D107; CAP-16. | Reinício real, claim único, reconciliação de efeitos e autorizações expiradas; retomar sem replay automático de efeitos perigosos. |
| **F8 — limites/segredos** | **Média/baixa** | Busca por nome pode percorrer árvore extensa; leitura sem limite observado; chave armazenada em JSON sem criptografia com `0600`; proteção da rota de revelação não foi auditada integralmente. | M1/M8, D103/D105/D112; CAP-01/09/13/14. | Limites configurados e informados; arquivos grandes/cancelamento; segredos não chegam a logs/contexto por padrão; testes de exposição da chave e da rota, sem credenciais reais. |

**Bloqueio:** F1–F4 devem ser tratados no planejamento antes de ampliar autonomia ou adicionar ferramentas com novos efeitos. Nenhum dos oito achados muda status para corrigido, testado ou homologado nesta atualização.

### Dependências e sequência de aprovação

**Gate D98 (aberto; medições sintéticas preliminares não fecham gate) → Fatia 13 (SPEC 2G + deliberação DEBT-23) → Fatia 14 (SPEC 2H) → Fatia 15 (SPEC 2I) → Fatias 16–20 nos escopos existentes.** M1–M4 têm ordenação de **planejamento** posterior à estabilização 13–15, não são fatias numeradas; M5–M8 e ICs não foram encaixadas em execução. A Arena deve examinar dependências reais e propor uma ordem que evite lacunas sem reordenar unilateralmente a sequência oficial. Nenhum período ou marco fictício é assumido.

**Decisão D102-D4 (anterior, ainda vigente nos limites aprovados):** permissões mínimas por padrão, negação de acesso fora da área autorizada, sem modo YOLO automático, sem expansão implícita de direitos por tool/skill/MCP/comando, revisões específicas para escrita/colisão/exclusão/Git/rede, e cancelamento/recuperação comprovados. Não é mudança retroativa de comportamento: regras existentes D93/D97 prevalecem; diferenças e dívidas viram SPEC e decisão futura. **Não aprovar nesta etapa** acesso externo, exclusão permanente, autoaprovação nem substituição automática de arquivo.

**Decisão D102-D5 (anterior, complementada por D112):** comparar primeiro *código e mecanismos observáveis*, depois *especificações públicas/versionadas* e por fim *testes equivalentes reproduzíveis*. Um mecanismo presente no código não é um teste aprovado; marketing não é contrato; execução sintética não é desempenho do app real. Usar `09 §3.10` para protocolos, versões, mesmo provedor/modelo quando possível, dados brutos, custo, estabilidade e classificações por dimensão. Se faltar referência ou paridade ambiental, declarar **inconclusivo/não comparável**, nunca preencher métricas imaginárias.

**Gate documental D112, atualizado após D113–D115:** planejamento revisado → decisões do dono registradas (D103–D115) → correções documentais incorporadas → revisão independente do pacote → conversão/aprovação explícita de SPEC definitiva por escopo → só então considerar implementação. As SPECs candidatas F1–F4/F5-A/F5-B aqui reunidas não fecham esse gate nem autorizam execução; a revisão deve confrontar contratos/código e distinguir evidência estática de teste.

### Pendências e decisões adicionais ainda necessárias

- Definir em SPEC futura identidade estável do projeto, invalidação de permissões e transições de sessão/workspace; a decisão D104 não escolhe tecnologia de armazenamento.
- D113 fecha a fronteira local simples; antes de implementação, F1 ainda precisa especificar perfis de runtime e allowlist Host/Origin entre Vite/app, proxy/Arena, code-server de medição e serviços, sem mudar bind/auth operacional nesta etapa.
- Deliberar DEBT-23 na abertura da Fatia 13; manter a SPEC 2G existente sem ampliação automática.
- Revisar independentemente e decidir as SPECs candidatas F1–F4/F5-A/F5-B; F6–F8 permanecem avaliações a detalhar, seguindo D103–D115 e sem declarar reprodução/homologação antes dos testes.
- Fixar destinos e prioridades de IC-01, IC-02-FS/DOC, IC-03–06 e IC-08, sempre sem renumerar as Fatias 13–20. IC-07 e IC-09 foram reclassificadas como vínculos/atividades transversais, não feature.
- Produzir baseline D98 somente após os gates e autorizações que já regem esse trabalho; esta rodada não iniciou D98.
- Revisar este planejamento e validar as correções aprovadas antes de autorizar qualquer SPEC definitiva.


## Auditoria técnica F1–F8 — SPECs candidatas F1–F5 e avaliação F6–F8 (26/10/2026)

> **Estado e autoridade:** F1–F4 e F5-A/F5-B são **SPECs candidatas aguardando revisão independente e aprovação**, não SPECs definitivas nem autorização de implementação. D103–D115 são decisões/restrições aprovadas para orientar o desenho, não prova de que o código já as cumpra. Esta rodada foi inspeção estática; nenhum teste, serviço, trace, benchmark, provedor real ou homologação foi executado. Código de produção, configurações operacionais e roadmap não foram alterados. F6–F8 permanecem avaliações, sem SPEC nesta rodada.
>
> **Vocabulário de evidência:** “confirmado estaticamente” significa que a lógica/payload está visível no baseline; não significa execução ou exploração reproduzida. “Risco” descreve consequência plausível ainda não reproduzida. “Não observado” significa que a cobertura consultada não permite afirmar presença/ausência além do trecho examinado.

### Fontes examinadas e limites da evidência

- `platform/apps/workbench-v2/src/server/session-persistence/index.ts`: middleware single-port, rotas de sessão/workspace, dispatch das casas e validação da pasta usada por Agir.
- `src/server/session-persistence/workspaces.ts`: `validateWorkspace`/`validateWorkspacePath` usam `realpath` e validam diretório; isso valida o caminho escolhido, mas não vincula por si só a requisição de Agir a uma sessão autorizada.
- `src/bairros/2-inteligencia/casas/agir/server/{rotas,agir,territorio,discos}.ts` e testes `agir/__tests__/{rotas,territorio,discos}.test.ts`: corpo da rota, estados em memória, aprovação, cancelamento, guarda lexical e operações reais.
- `src/modules/explorer-search/server/{vite-plugin-fs.ts,fs/fsHost.ts}`: raiz global do plugin, rotas filesystem/Git e mecanismo público atual do módulo. O `FsHost` tem fila serial por URI e gravação temp+rename, mas a guarda de `toFsPath` é lexical e não implementa o versionamento pedido por D106.
- `vite.config.ts`: `server.host` e `preview.host` = `0.0.0.0`; `allowedHosts: true`. É configuração estática, não prova de reachability/exploração. A rota de workspace do plugin Explorer (`POST /fs/workspace`) troca a raiz do plugin após `realpath`, sem vínculo de sessão visível nesse handler.
- `src/components/ChatInput.tsx`, `src/components/ChatPanel.tsx`, `src/App.tsx`, `src/types.ts`, `agir/ui/client/api.ts`, `agir/server/rotas.ts` e `session-persistence/chatAlvo.ts`: modos/modelo/anexos, payloads, estado por chat e alvo realmente resolvido. Inspecionados também `provedores/contract.ts`, `providersRepo.ts`, `ProvidersView.tsx`, cliente/API e `probe.ts` para comparar catálogo administrativo, descoberta temporária e persistência.
- `vite.config.ts`, `package.json`, `server.mjs`, `vite-plugin-pty.ts`, `platform/services/pty-server/src/{index.ts,vitePlugin.ts}` e leitura estática de `/home/user/restore-code-server.sh`: perfis e binds. O script externo code-server é régua/ambiente, não é produto nem autoridade de segurança; nenhuma execução ou leitura de credencial ocorreu.
- `provedores/server/{rotas.ts,providersRepo.ts}`: `POST /api/providers/reveal` devolve a chave com `Cache-Control: no-store`; gravação tenta `mode: 0o600`, sem criptografia. O escopo da proteção HTTP completa não foi demonstrado.
- Referências internas: `docs/04 §1.5` (snapshots fixados e limites de licença/proveniência); notas arquivadas `referencias/openclaude/03_sessoes_e_permissoes.md` e `referencias/openclaude/01_loop_do_agente_e_ferramentas.md`. Elas sustentam apenas lições conceituais (permissão com dono de sessão; separar loop/limites), não equivalência com o código atual nem autorização de cópia. O comparativo já arquivado em `04 §1.5` cita separação resolução/autorização no snapshot OpenCode, testes de symlink/canonicalização no DeepSeek Harness e escrita atômica/cancelável no Qwen Code; nesta rodada isso serviu para conferir categorias de teste e perguntas de desenho, não para alegar comportamento upstream atual nem equivalência. OpenClaude permanece apenas referência conceitual, conforme proveniência/licença registrada. Nenhum código externo foi copiado. `FsHost` é referência interna útil, mas sua implementação privada não deve ser importada por Agir: respeitar D68/D69 e as fronteiras congeladas do Explorer/Search.

### SPEC CANDIDATA F1 — autoridade da API, vínculo sessão/workspace e acesso local (D103–D105/D113)

**Evidência estática.** `/api/agir` recebe `workspace`, `fluxo` e `permissoes` no corpo; `validarPedido` valida forma/tipo, e `pastaDeTrabalhoAgir` canoniza/exige diretório, mas não consulta o registro persistido para comprovar que aquele workspace pertence à sessão/fluxo. `permissoesPorFluxo` aceita a lista filtrada enviada pelo browser; o cliente persiste “Permitir na Sessão” localmente e a reenvia. `obterAlvoDeConversa()` escolhe provedor/modelo/chave da configuração local ativa, não de uma identidade autenticada da chamada. As rotas de sessão, workspace, provider/reveal, `/fs/*`, Git e PTY também precisam ser incluídas no inventário de superfície; uma guarda apenas em `/api/agir` seria incompleta. O middleware central `sessionPersistencePlugin` é ponto natural de política comum, mantendo a autorização de domínio em cada casa/serviço. A configuração Vite atual não impõe local-only.

**Comportamento atual × esperado.** Atual: os campos do cliente são aceitos como seletor de workspace/fluxo/permissão após validação sintática/canônica, sem prova de vínculo identificada. Esperado por D103/D104: o servidor resolve uma identidade de sessão ativa e um identificador canônico do workspace/projeto, consulta grants que ele próprio registrou e invalida/revalida grants quando muda sessão, pasta ou identidade; replay/manipulação de payload não concede acesso. Esperado por D105: listener e todas as APIs do produto acessíveis somente por interfaces loopback do computador instalado; host/origin não aceitos são recusados. Restrição de rede não substitui autorização por ferramenta.

**Decisão preservada.** Monolito Modular, Single Port, casas e contratos existentes; sem novo microserviço, sem credenciais do provedor no cliente, sem modo YOLO, sem mudança retroativa em D93/D97. O grant de escrita continua exigindo a decisão humana prevista em D93; “Permitir na Sessão” continua limitado às ferramentas já aceitas e fica preso ao mesmo par sessão + projeto, sem atravessar projeto. A chave revelada segue fora de logs/URLs e com `no-store`, mas essa resposta também precisa da barreira local/sessão.

**Proposta e recomendação.** Colocar uma checagem de origem/acesso local compartilhada antes do dispatch das rotas na prefeitura; deixar cada casa consultar uma resolução de contexto emitida/guardada pelo servidor (sessão existente, workspace canônico e grants), sem aceitar `workspace` ou `permissoes` como autoridade. Reaproveitar DB/persistência de sessões e validação de workspace atuais; não criar outra store de sessões se a atual puder ser estendida pela porta pública. Troca de pasta deve invalidar grants não aplicáveis e rever a raiz ativa do Explorer/FS. Gravar grant no servidor somente depois da aprovação efetiva, não quando o browser declara que já foi concedido.

**Decisão do dono incorporada (D113).** Alternativa A foi aprovada: produto exclusivamente local; Host/Origin rigorosos, CSRF quando aplicável, contexto de sessão/workspace/grants validado pelo servidor; processos da mesma conta do SO pertencem ao perímetro confiável. Não acrescentar login, autenticação remota, token capability por processo ou isolamento adicional complexo. LAN fica para evolução futura. A regra não elimina autorização individual de ferramentas.

**Perfis e limites estáticos relevantes à solução.** A configuração atual de Vite e os scripts `dev`/`preview:vite` vinculam `0.0.0.0` e `allowedHosts: true`, usados pela régua/preview e potencialmente pelo acesso de homologação. O Playwright aponta para `127.0.0.1:5174`. O `server.mjs` de build usa `HOST || 0.0.0.0`/4173 e serve estáticos + FS/PTY; não contém as rotas de sessão, Provedores, Conversa ou Agir do plugin Vite, portanto não deve ser tratado como runtime de produto completo. O plugin PTY do Vite acopla WebSocket ao listener single-port; o serviço PTY standalone usa `PTY_HOST || 127.0.0.1`. O script externo do code-server usa `0.0.0.0:8080 --auth none` quando iniciado; é régua/ambiente independente e deve permanecer intocado. Não há evidência de que qualquer desses processos estivesse rodando nesta inspeção.

**Solução candidata.** Definir o perfil “produto local” com listener apenas em loopback e Host exato; aplicar verificação central antes de despachar rotas mutáveis e verificar Origin/Sec-Fetch-Site nas requisições de navegador, com token CSRF somente quando o desenho do runtime/proxy exigir. No WebSocket PTY validar Host/Origin no handshake sem quebrar protocolo, sessões PTY ou congelamento/homologação do terminal. Perfil de desenvolvimento/proxy para Arena e homologação deve ser explícito, restrito à origem de proxy documentada e nunca contado como prova do perfil local-only. Não impor um bind global por substituição simples: preservar `5174`, caminho E2E `127.0.0.1`, code-server 8080 e provas Windows existentes. Antes de código, resolver qual launcher é o runtime suportado do produto e como ele seleciona perfil; se não houver configuração clara, essa lacuna bloqueia aceite local-only, não autoriza mudança operacional implícita.

**Alternativas consideradas.** (A) Loopback + Host/Origin estritos + CSRF aplicável + contexto server-side — aprovada por D113 e recomendada. (B) capability por processo, login, autenticação remota ou isolamento de processos da mesma conta — explicitamente fora do escopo aprovado, custo/complexidade desnecessários nesta versão. (C) manter `0.0.0.0` e confiar só em firewall/proxy/allowlist de Host — não prova local-only e é insuficiente como perfil do produto. O ambiente de preview não pode ser usado como substituto silencioso do perfil local.

**Componentes afetados se aprovado.** `vite.config.ts`/bootstrap do Vite; middleware da prefeitura em `session-persistence/index.ts`; contrato público da Casa Agir e rotas em `agir/server/rotas.ts`; contexto do workspace em `workspaces.ts`; dispatch dos handlers `/fs`, `/git`, `/pty`, `/api/providers` e `/api/sessions`; cliente de sessão/aprovação, sem colocar segredo em `localStorage`. Configuração de `/home/user/restore-code-server.sh` não é produto e permanece intocada; não confundir code-server de medição com Vite/APIs do app.

**Falhas e respostas.** Sem contexto/grant, sessão inexistente ou vínculo divergente: negar antes de abrir SSE ou tocar disco, `401/403` ou `409` tipado, sem ecoar chave/path sensível. Host/origin externo: negar sem executar handler. Troca de workspace durante fluxo: expirar o fluxo/grants daquele contexto e exigir nova submissão. Grant antigo, adulterado ou de outro projeto: negar, nunca “corrigir” usando o valor do cliente.

**Testes planejados (não executados).** Unitários: montagem/expiração do contexto; grants por `(sessão, projeto canônico, ferramenta)`; invalidação em troca de sessão, workspace ou identidade; request com `permissoes` falsificadas; sessão inexistente; host/origin/CSRF aceito e negado. Integração: chamadas a `/api/agir`, `/api/providers/reveal`, `/api/sessions`, `/fs/workspace`, `/fs/*`, `/git/*` e `/pty/*` com/sem contexto, comprovando que o middleware cobre a superfície sem duplicar regra de domínio. E2E: duas sessões em pastas diferentes; adulterar workspace/permissões e aprovar fora de contexto; F5 preserva apenas grants no mesmo escopo conforme D93/D104; troca de pasta invalida; app responde em loopback e recusa Host/Origin externo. Teste de reachability a partir de outra máquina só em ambiente autorizado e isolado; não é parte desta rodada.

**Windows e segurança.** Em Windows 10/11, validar loopback IPv4/IPv6 sem bind wildcard, Host/Origin com `localhost`/`127.0.0.1` e portas reais, handshake WebSocket, isolamento entre browser e serviços locais; registrar o que depende de Firewall/ACL sem tratá-los como substituto do bind. Não alterar code-server 8080, PTY congelado ou o caminho homologado 5174. Requisições sem Origin só podem ser aceitas por contrato interno explícito, não por fallback aberto.

**Aceite mensurável proposto.** 100% dos casos negativos da matriz de autorização recusados antes de qualquer side effect; zero request não autorizado recebe conteúdo de workspace, chave ou evento de ferramenta; todos os endpoints sensíveis passam pelo controle central e pelas checagens de domínio; loopback permitido e interfaces não-loopback ausentes do listener do produto; troca de contexto invalida todos os grants incompatíveis. Não se fixa meta de latência sem medição D101. Regressão: conversas normais e fluxo D93/D97 no mesmo workspace seguem operáveis e aprováveis; não reabrir homologações 07–12.

**Dependências.** D103–D105/D113, session-persistence atual, validação de workspaces e porta pública das casas que recebem contexto; decisão explícita do launcher/perfis antes do aceite. F1 precede enforcement F5-A/B e qualquer exposição de endpoints sensíveis.

**Rollback/limites.** Se integração bloquear qualquer fluxo homologado, reverter somente a mudança de autorização aprovada e manter serviço fechado às interfaces não locais; não desabilitar a checagem de rede como contorno. Fora de escopo: login multiusuário, acesso LAN/Internet, CORS amplo, proxy/túnel, segredo do provedor no browser, mudança operacional do ambiente e autenticação de code-server.

### SPEC CANDIDATA F2 — contenção física de caminho, links e reparse points (D106/D111)

**Evidência estática.** `verificarTerritorio()` usa `path.resolve` e compara prefixo por segmento (com tratamento de caixa/prefixo Windows); não consulta `realpath`/`lstat` do alvo. Os testes `territorio.test.ts` cobrem escapes lexicais e simulação `path.win32`, não symlink/junction. Os executores chamam `stat/readFile/writeFile/rename` depois da guarda; operações podem seguir links simbólicos. `FsHost.toFsPath()` também é lexical. Não há prova de exploração reproduzida nem teste de link encontrado na suíte examinada.

**Comportamento atual × esperado.** Atual: `..` lexical que sai é recusado, caminhos físicos que continuam dentro da raiz são aceitos; identidade física do alvo não é provada. Esperado: toda ferramenta (ler, listar, buscar, criar, escrever, excluir e prévia de exclusão) permanece dentro da raiz canônica; link que resolva para fora nunca revela, cria, altera ou move conteúdo externo. Componente inexistente deve ser validado pelo ancestral existente real; root/sessão que mudou invalida o contexto. No Windows considerar junctions, symlinks, reparse points, UNC e caixa; POSIX considerar symlink e troca concorrente de componente.

**Proposta e razão.** Elevar a verificação para o executor de filesystem da Casa Agir, depois de resolver a raiz real e imediatamente antes da operação; inspecionar cada componente existente sem seguir links, canonizar destino/ancestral e recusar se o alvo físico sair da raiz. Para componentes ainda inexistentes, validar o primeiro ancestral existente e criar um componente por vez, revalidando. Recomendo recusar links/reparse points no caminho de mutação ou leitura quando não for possível provar confinamento; não definir “excluir link” como “excluir destino”. Para corridas de troca de link entre checagem e uso, a SPEC definitiva deve demonstrar mecanismo resistente à janela TOCTOU em cada SO suportado ou falhar fechado na operação afetada — `realpath` único não pode ser descrito como prova suficiente.

**Alternativas consideradas.** (A) Comparação lexical atual — já cobre `..`, mas não prova alvo físico; insuficiente. (B) `realpath` apenas no caminho final — útil para resolução, mas deixa TOCTOU e destinos inexistentes; insuficiente isoladamente. (C) resolver cada componente sem seguir links, usar primitives de filesystem seguras por plataforma e falhar fechado em casos não comprováveis — recomendada. (D) tratar symlink como exclusão do destino — rejeitada; `excluir` não pode escapar da raiz nem mudar semântica D97.

**Limite arquitetural.** Manter a lógica na Casa Agir (`territorio.ts`/serviço local de disco) ou usar contrato público existente se houver capacidade suficiente; não importar `src/modules/explorer-search/server/fs/fsHost.ts` por caminho privado, não alterar seus diretórios congelados sem decisão expressa, não abrir um serviço/processo novo. Reutilizar a lição temp+rename/serialização do FsHost só onde compatível, sem confundir isso com contenção física.

**Falhas e respostas.** Symlink/junction/reparse point escapando, caminho ambíguo, corrida detectada, acesso negado ou SO sem verificação segura: recusa tipada antes do efeito; nenhum fallback a path lexical, destino externo, cópia ou exclusão permanente. `excluir` mantém semântica D97 (lixeira do SO, aprovação uma a uma); link fora do escopo não pode mover o alvo externo.

**Testes planejados (não executados).** Unitários com diretórios temporários POSIX: link interno, link externo, link quebrado, link em cada segmento, raiz linkada, nome com espaço/Unicode; simulação de troca de destino. Windows real/fixture: junction e symlink quando privilégios permitirem, reparse point, unidade/UNC, caixa e prefixo `\\?\`; ausência de privilégio deve ser “não testado”, não aprovação. Integração para ler/listar/buscar/criar/escrever/excluir/prévia através de cada link; conferir conteúdo externo antes/depois por hash. E2E isolado em fixture descartável (porta de fixture prevista em `09`), sem usar repo real/5174; corrida guiada entre validação e operação.

**Aceite mensurável proposto.** 100% dos casos de link cujo destino canônico é externo são negados, em todas as operações; 100% dos casos positivos sem link/links comprovadamente internos mantêm o comportamento; hash e existência de cada sentinela externa permanecem idênticos; toda corrida detectada falha sem leitura/escrita externa. Caso de plataforma onde não se consiga criar link privilegiado fica explicitamente não testado e bloqueia alegação Windows/POSIX correspondente. Não há meta de desempenho sem medida.

**Windows e segurança.** Em Windows, a matriz distingue symlink de junction/reparse point, volumes, UNC, prefixos `\?\`, caixa e privilégios necessários; ausência de privilégio é “não testado”, nunca aprovação. Não enfraquecer contenção para passar em SO sem primitive segura; em Linux/POSIX testar links e componentes substituídos concorrentemente. A raiz e grants devem vir de F1, não do payload.

**Dependências.** D103/D104/D106/D111, Casa Agir e contexto canônico F1; D97 para lixeira e operações de exclusão. F2 precisa de primitive segura por SO antes de liberar ferramenta afetada; não depende de D98, M1 ou IC-08.

**Regressão/rollback/fora de escopo.** Preservar os casos já homologados de absoluto dentro, `..` escapando, caixa/prefixo Windows e lixeira D97; nenhum teste deve usar workspace real. Reverter apenas a alteração da Casa Agir, deixando a operação de risco desabilitada se a guarda falhar. Não é sandbox do sistema operacional, não confina terminal, não altera Explorer/Search/PTY e não autoriza novos tipos de path ou operações.

### SPEC CANDIDATA F3 — cancelamento como invalidação terminal de aprovação (D107)

**Evidência estática.** A rota registra `req.on('close')` depois de consumir o corpo e usa esse evento para abortar; não há listener explícito de fechamento da resposta nem race entre `AbortSignal` e a Promise que espera a aprovação. `rodarAgir()` aguarda `pedirAprovacao()` e, quando ela resolve, chama o executor sem uma nova checagem do sinal entre a aprovação e o efeito. A rota `/api/agir/aprovar` resolve pelo par texto `(fluxo,id)` enquanto o resolver estiver no mapa. Testes cobrem negar/aprovar e fluxo morto, mas não corrida de cancelamento, resposta atrasada/duplicada, duas continuações ou mutação depois do abort. Isso é lacuna estática; não foi reproduzida.

**Comportamento atual × esperado.** Atual: execução do modelo recebe `AbortSignal`, mas a espera de aprovação não demonstra invalidação atômica; `finally` limpa os mapas quando o loop consegue terminar. Esperado por D107: cancelar é transição terminal no servidor, invalida todos os approvals da execução, resolve esperas como negadas/expiradas e faz qualquer resposta posterior ser ineficaz; uma continuação só parte de estado válido e autorização revalidada.

**Proposta e razão.** Manter um único registro de execução por `runId` dentro da Casa Agir, com estados explícitos (`running`, `awaiting-approval`, `cancelled`, `completed`, `paused`), ID de geração e operações atômicas de claim/consumo. No cancelamento/disconnect confirmado, marcar terminal primeiro, invalidar e retirar cartões pendentes, liquidar as Promises como `false`, impedir novas emissões e conferir estado novamente imediatamente antes de cada executor/commit. Aprovação consome uma única vez e deve corresponder à geração, ferramenta e pedido exatos. `continuar` faz claim único da pausa, revalida sessão/workspace/grants e recusa se já houver execução/claim. Distinguir resposta HTTP completada de desconexão do cliente; testar sem assumir que `IncomingMessage.close` sozinho representa Parar.

**Alternativas consideradas.** (A) depender apenas de `AbortSignal` no provedor ou de remoção visual do cartão — não invalida atomicamente approval aguardado nem impede executor depois da corrida; insuficiente. (B) máquina de estados/claim de uso único no servidor, sem persistência/replay após restart — recomendada para D107 nesta etapa. (C) fila durável/reconciliação de efeitos pós-crash — fora do escopo; depende de M7 após M1→M2→M3→M4 e exige SPEC própria.

**Semântica de uma operação já iniciada.** Se cancelamento ocorrer antes do ponto de commit, não executar; se o commit atômico já começou, concluir ou falhar atomicamente e devolver estado honesto, sem fingir que foi desfeito. Operação em andamento não pode virar parcial. Após cancelamento não há replay automático nem grant implícito.

**Falhas e respostas.** Approval atrasado/duplicado, geração antiga ou fluxo terminal: `409 approval_expired` (ou código tipado equivalente), sem chamar executor. Cancelamento durante cartão: cartão cliente passa a expirado/cancelado; o servidor limpa a espera. Continuação simultânea: apenas uma vence o claim; demais recebem `409 already_running`. Desconexão ambígua: negar/expirar por segurança, não presumir aprovação.

**Testes planejados (não executados).** Unit: cancelamento antes do pedido, enquanto aguarda approval, simultâneo à aprovação e depois da decisão; approval tardio/duplicado; duas decisões concorrentes; duas continuações; verificar contagem de chamadas do executor igual a zero quando cancelado antes do commit. Integração HTTP/SSE real com cliente que fecha a resposta, `AbortController`, timeout de conexão e resposta tardia; medir transição do estado e confirmar que não há evento/escrita pós-cancelamento. E2E fixture: Parar durante cartão de `criar`, `escrever` e `excluir`; enviar approval antigo e conferir bytes/hash/lixeira; validar aviso de expirado e que uma nova mensagem não herda a autorização.

**Aceite mensurável proposto.** Em 100% dos cenários de cancelamento antes do commit, executor não é chamado; em 100% dos approvals cancelados/duplicados/expirados, não há side effect; entre N respostas simultâneas a um pedido, exatamente uma pode ser consumida; entre N continuations da mesma pausa, no máximo uma inicia. Nenhum evento de sucesso é emitido após estado terminal; demais estados são reportados sem perda de precisão.

**Dependências.** D107, F1 (contexto/escopo), interfaces de execução e approval existentes da Casa Agir, D93/D97; integração com F2/F4 nos pontos imediatamente antes do efeito. Recuperação durável permanece M7 pós-M1→M2→M3→M4.

**Regressão/rollback/fora de escopo.** Preservar Parar silencioso do chat 09, cartão/negação/sessão de D93 e exclusão para lixeira de D97; aprovação não é removida do uso normal. Reverter a máquina de estado apenas com bloqueio de ferramentas mutáveis enquanto o defeito persistir. Não implementar retomada após reinício (M7), fila persistente, replay, undo ou nova ferramenta nesta proposta.

### SPEC CANDIDATA F4 — criar exclusivo, escrever condicional e gravação segura (D106)

**Evidência estática.** Em `agir/server/discos.ts`, `criar` faz `stat`; se o destino já for arquivo regular, não recusa e segue para `gravarAtomico`, cujo `rename` pode substituir o destino. `escrever` só verifica `stat().isFile()` e regrava sem token de versão nem fila por caminho. `gravarAtomico` tenta `rename`, mas, se ele falha, cai para `writeFile(destino, ...)`, que não é atômico e pode truncar/substituir. Não há teste de colisão, mutação concorrente ou falha de rename em `discos.test.ts`. O `FsHost` interno tem fila por URI e temp+rename, porém não oferece compare-and-swap nem recusa symlink e não é chamado por Agir; não é solução drop-in.

**Comportamento atual × esperado.** Atual: `criar` pode sobrescrever destino regular; `escrever` aceita qualquer arquivo existente sem saber se mudou desde a observação; fallback de rename pode escrever direto. Esperado por D106: `criar` somente materializa destino inexistente; conflito preserva bytes existentes. `escrever` exige arquivo existente e o mesmo estado/versão observado na proposta/aprovação; conflito detectado não substitui, não mescla automaticamente e devolve resultado explícito ao loop. Falha de atomicidade nunca recua para escrita destrutiva parcial.

**Proposta e razão.** Manter as ferramentas e seus contratos na Casa Agir; criar deve usar operação exclusiva/no-replace compatível com o SO e escrita temporária na mesma pasta; escrever deve capturar no servidor um token opaco de versão (identidade/hash do conteúdo + metadados necessários) na hora de preparar o pedido/cartão, associá-lo à aprovação exata e revalidá-lo dentro de fila serial por arquivo imediatamente antes do commit. A fila evita colisões entre operações do próprio app; qualquer mudança desde a aprovação retorna conflito e pede releitura/revisão, sem retry cego. Remover fallback de escrita direta; limpeza de temporário deve ocorrer em falha. Se o filesystem/SO não permitir commit atômico/no-replace comprovável, falhar fechado. Usar a escrita temp+rename e serialização do FsHost como referência conceitual, sem quebrar fronteira D69.

**Alternativas consideradas.** (A) `stat` seguido de `rename`/`writeFile` direto — corrida e sobrescrita permanecem; rejeitada. (B) copiar interior privado do `FsHost` — viola fronteira D69, e a implementação não entrega CAS nem contenção física; rejeitada. (C) criação no-replace + write condicional com versão, commit atômico suportado em cada SO e falha fechada — recomendada. (D) fallback destrutivo quando rename falha — explicitamente rejeitado.

**Limite de concorrência.** D37 (“último salva” entre sessões) descreve o fluxo normal de workspace; esta proposta aplica compare-and-swap às tools Agir `criar/escrever`, não altera automaticamente o editor humano nem o contrato geral `/fs/write`. A política para conflito causado por editor externo/outro processo deve ser validada em integração; uma fila do próprio servidor sozinha não prova exclusão mútua contra outro processo. A SPEC definitiva deve demonstrar a proteção de ponta a ponta no SO ou restringir/falhar operações em que a janela de corrida não possa ser fechada; não alegar CAS universal baseado só em hash lido antes do rename.

**Aprovação e conteúdo.** Aprovação continua vinculada ao pedido exato (sessão/workspace/ferramenta/caminho/conteúdo e versão observada). Se o usuário/modelo alterar o conteúdo ou o arquivo mudar, trata-se de novo pedido/aprovação. Para `criar`, tentativa em destino existente retorna `file_exists`; para `escrever`, versão diferente retorna `version_conflict`. Nenhuma decisão D93 de aprovação é ampliada.

**Falhas e respostas.** Destino já existe, tipo incompatível, versão alterada, perda de permissão, disco cheio, rename/link/replace falho, processo cancelado antes do commit ou erro ao limpar temp: erro estruturado; bytes originais preservados; temporário removido quando possível e eventual resíduo identificado sem revelar dados. Sem fallback a `writeFile(destino)` direto, substituição silenciosa, merge automático ou retry com nova versão.

**Testes planejados (não executados).** Unit: criar inexistente; criar colisão com conteúdo sentinela; concorrência de duas criações (uma vence, outra `file_exists`); escrever válido; stale token; duas escritas com mesmo token (uma vence, a outra conflito); recusa de diretório/symlink; rename/replace falhando; disco cheio simulado; cancelamento antes/depois do commit; cleanup temp. Integração em diretório temporário: duas sessões/tabs no mesmo arquivo, editor muda após o cartão, processo concorrente muda antes do commit, comparar hashes/mtime e confirmar preservação; injetar falha de rename em POSIX/Windows. E2E fixture: cartão de `criar`/`escrever`, colisão deliberada antes da aprovação, editar externamente enquanto cartão espera, garantir cartão de conflito/releitura e regressão de negação/aprovação; nunca apontar specs que escrevem para 5174/repo real.

**Aceite mensurável proposto.** 100% das colisões de `criar` mantêm conteúdo original byte a byte; em corrida de dois `criar` no mesmo caminho exatamente um cria e o outro falha sem tocar nos bytes do vencedor; 100% das escritas com versão obsoleta falham sem alterar o estado concorrente; falha de commit não produz arquivo parcialmente escrito nem substituição direta; sucesso grava integralmente o conteúdo aprovado e não deixa temp após caminho de sucesso. Resultados POSIX e Windows são reportados separadamente; sem teste Windows real, marcar Windows “não testado”.

**Dependências.** D106, D103/D104, F1 (raiz/grant), F2 (contenção física), D93 e D97; manter a fronteira Casa Agir e confirmar primitivas atômicas/no-replace em cada SO suportado antes de permitir gravação.

**Regressão/rollback/fora de escopo.** Preservar `escrever` como atualização integral de arquivo existente quando versão coincide, cartões/aprovações D93 e lixeira D97; não alterar por implicação a gravação do editor, D37, FsHost congelado ou `/fs/write`. Se teste de falha não comprovar segurança, desabilitar escrita da tool antes de restaurar modo antigo. Fora de escopo: diff interativo/merge, undo do agente, mover/renomear, novo sandbox, permissão permanente, delete permanente ou mudança de comportamento aprovada anteriormente sem nova decisão.

### SPEC CANDIDATA F5-A — enforcement dos modos no servidor (D108, D114)

**Estado:** candidata, baseada em inspeção estática; depende de revisão independente e aprovação específica antes de qualquer implementação/teste de aceitação. Não muda a homologação histórica da FATIA 10.

**Problema e evidência estática.** `ChatInput.tsx` oferece `agent`, `edit`, `ask`, `plan`; `App.tsx` mantém `modeByChat` em estado React e anota `mode` na mensagem local. O cliente `agir/ui/client/api.ts` envia mensagens, fluxo, workspace e permissões, mas não serializa o modo. A rota Agir valida mensagens/contexto e executa o mesmo loop que registra/executa ferramentas. `modeByChat` não é estado durável de `NestedChat`; transcript persiste as mensagens já enviadas, não necessariamente a escolha corrente do compositor. `/api/chat` também não aceita uma política de modo. Nenhum ataque ou tentativa de escrita em Ask/Plan foi reproduzido: conclusão exclusivamente estática.

**Decisões vinculantes.** D108 + D114: preservar quatro controles; `agent`/`edit` → Agir; `ask` → Perguntar; `plan` → Planejar. Perguntar é somente leitura. Planejar pode investigar e preparar plano, mas não escreve nem causa efeitos equivalentes. Agir/Edit podem diferir em texto/UX, nunca nas permissões. O servidor valida e impõe a política independentemente do modelo; campos da interface são pedidos, não prova. Conservar D93/D97: somente as ferramentas e aprovações já autorizadas; `excluir` sempre pede aprovação individual e nunca entra em “Permitir na Sessão”.

**Arquivos/contratos prováveis (aditivos, sujeitos à fronteira LEGO).** UI/wiring: `components/ChatInput.tsx`, `ChatPanel.tsx`, `App.tsx`, `types.ts` e persistência de `NestedChat`/`Session`. Transporte: `bairros/2-inteligencia/casas/agir/contract.ts`, cliente `agir/ui/client/api.ts`, `agir/server/rotas.ts` e orquestração `agir/server/agir.ts`; avaliar a Casa Conversa apenas se o contrato de execução sem ferramenta exigir, sem duplicar loops. `session-persistence/index.ts` continua prefeitura de dispatch; autorização de domínio permanece na Casa Agir. `App.tsx` só wiring; não mover Terminal nem importar interior privado de outra casa.

**Solução candidata.** Representar o modo como enum estrito no contrato enviado em cada turno e vinculá-lo ao chat/sessão persistido em `NestedChat`/payload de sessão existente, com compatibilidade explícita para conversas antigas. A UI envia o modo selecionado junto da intenção, mas o servidor traduz o enum para política interna antes de chamar o modelo ou qualquer executor. Uma única política server-side limita a superfície de ferramentas: Perguntar e Planejar apenas ferramentas comprovadamente read-only (`ler/listar/buscar` quando a tarefa pedir inspeção), sem `criar/escrever/excluir`, aprovação de mutação, terminal, rede ou efeitos indiretos; Agir aplica os grants e cartões existentes. `edit` não recebe mais permissões que `agent`. Pedido ausente/desconhecido é recusado com erro tipado e sem fallback para Agir. Mudança de modo durante corrida aplica-se somente ao próximo turno; a corrida já iniciada usa snapshot imutável. O modo efetivo e o solicitado são registrados no transcript/resultado sem tornar transcript autoridade de autorização.

**Alternativas consideradas.** (A) esconder botões no cliente — rejeitada, não é enforcement. (B) prompt do modelo/“peça para não escrever” — rejeitada, modelo não é barreira. (C) quatro policies distintas com toolsets independentes — rejeitada por duplicação e risco de divergência; preferir três políticas efetivas e mapear os quatro IDs. (D) um loop único com autorização central por modo — recomendada, reaproveita Agir e grants.

**Casos excepcionais e resposta.** Modo ausente/ilegível: 400 `invalid_mode`, antes de SSE/modelo. Chamada de mutação em Ask/Plan, inclusive por payload/tool-call adulterado: negar antes do executor e retornar violação de política, sem prompt de aprovação que permita contorná-la. Modo trocado enquanto execução/approval está pendente: pedido atual mantém modo/snapshot; nova operação tem de passar novamente pela política. Serviço/modelo incapaz de tool calling: erro de incompatibilidade quando a tarefa exige ferramenta; não degradar silenciosamente para outro modelo ou para Agir. Contexto expirado/trocado: negar conforme F1, não reaproveitar grant. Cancelamento e approval atrasado seguem F3/D107.

**Windows e segurança.** Testar as mesmas políticas em Windows 10/11 e POSIX com workspace fixture: caminhos com caixa diferente, espaços, Unicode, drive/UNC, PowerShell/CMD não podem ampliar ferramentas. Este SPEC não implementa sandbox, não autoriza o terminal-para-agente e não altera o Terminal congelado. Nenhum modo confiável por prompt; checagem imediatamente antes do executor e revalidação de workspace/grant conforme F1–F4.

**Testes planejados (não executados).** Unit: parsing enum; tabela `agent/edit→Agir`, `ask→Perguntar`, `plan→Planejar`; compatibilidade de sessão antiga; allow/deny por tool; modo ausente/desconhecido; prova `edit` = `agent` em permissões; negação antes de executor. Integração: requests reais ao handler Agir com stub de modelo/tool; cada modo tenta leitura e escrita; adulterar modo, mensagem e tool-call; confirmar contador de chamadas mutáveis = 0 em Ask/Plan; approvals D93, cancelamento F3, stale workspace F1. E2E em fixture isolada: os quatro controles persistem ao alternar chats/F5, Ask/Plan não alteram sentinelas, Agir continua mostrando aprovação, Edit não burla consentimento, alteração durante execução só afeta o turno seguinte. Matriz Windows/Linux; E2E nunca repo-backed 5174.

**Aceite mensurável.** Para 100% da matriz enum×tool×resultado, modo efetivo no servidor corresponde a D114; em Ask/Plan, **zero** chamadas a executor mutável ou efeito indireto, antes/depois de F5 e com payload malicioso; em `agent` e `edit`, mesmos grants/approvals e mesmos limites; zero requests de modo ausente/desconhecido chegam ao provedor ou executor; mensagens históricas permanecem legíveis. Não declarar sucesso por teste de UI isolado. Critérios quantitativos de desempenho aguardam medição D101, não se inventam aqui.

**Regressão e rollback.** Regressão preserva fluxo de conversa normal, streaming/Parar, aprovações, “Permitir na Sessão” dentro do escopo, teto/Continuar, anexos como atualmente comunicados e homologações 07–12. Se enforcement não puder ser comprovado, fail closed: desabilitar execução de tools em Ask/Plan e impedir envio de modo inválido; não voltar a tratar modo da UI como segurança. Reverter apenas a mudança da Casa Agir/contratos/UI aprovada, nunca o estado do usuário nem uma regra de segurança por fallback silencioso.

**Dependências e fora de escopo.** F1 (sessão/workspace/Host-Origin), D108/D114 e D93/D97; interface de F5-B para identificar alvo; F2–F4 nas verificações de filesystem. Não depende de IC-08 (testes executados pelo agente), M1 usage/contexto, Central de Diagnósticos, D98 ou mudança de ordem. Fora: novo modo, planner estruturado, permissões novas, auto-approval, terminal tool, testes/IC-08, contexto/compactação M1–M4, refazer UI, login remoto ou implementação nesta etapa.

### SPEC CANDIDATA F5-B — catálogo de modelos e seleção efetiva (D115, DEBT-14)

**Estado:** candidata; D115 está aprovado, mas este desenho de persistência, “Auto”, capacidades e corridas de configuração aguarda revisão independente. Não implementar, migrar o arquivo real do usuário ou chamar provedor nesta etapa.

**Problema e evidência estática.** `ChatInput.tsx` contém uma lista fixa (`Auto`, `Claude Sonnet 4`, `GPT-5`, `GPT-5 mini`). `App.tsx` guarda `modelByChat` em estado React volátil, aplica defaults fixos e registra string de modelo/modo nas mensagens; `agir/ui/client/api.ts` não transmite seleção de modelo. `session-persistence/chatAlvo.ts` ignora o seletor e resolve `ArquivoProvedores.ativo` + `provedores[id].modelo` + chave/configuração do backend. O SSE/`done` apresenta o alvo do servidor; portanto o valor visível pode diferir do que foi enviado. Na Casa Provedores, `providers.json` v2 persiste **um único `modelo` por provedor**; `POST /api/providers/models` usa `listarModelos`, mas `ProvidersView.tsx` guarda a resposta apenas em `useState` local para a sessão da tela; escolher um item salva o campo único `modelo`. `DESCRITORES.modelosLocais` são sugestões, não catálogo autoritativo. `GET /api/providers` devolve estado redigido, mas não uma lista comum para o chat. Nenhuma chamada ou divergência foi reproduzida durante esta etapa; são fatos lidos no código.

**Decisões vinculantes.** D115: identidade explícita é `(providerId, modelId)`; usar exatamente esse alvo se configurado/habilitado/utilizável; sem fallback ou troca silenciosa; indisponibilidade, remoção, desabilitação e incompatibilidade têm estados distintos; chaves permanecem no servidor. A Casa Provedores existente é a fonte administrativa autoritativa. Reutilizar contrato, repositório, `/api/providers`, busca de modelos e UI existente; não criar outro catálogo/serviço nem refazer o seletor. D93 Q4 permanece: Agir exige canal nativo de tool calling; compatibilidade não é presumida pelo nome do modelo.

**Arquivos/contratos prováveis.** `provedores/contract.ts`, `server/providersRepo.ts`, `server/rotas.ts`, `server/probe.ts`, `ui/ProvidersView.tsx`, `ui/client/api.ts`, `descritores/*` e `index.ts` (só via porta pública); `session-persistence/chatAlvo.ts` e middleware da prefeitura; `conversa/contract.ts` + `conversa/server/{rotas,requisicao}.ts` e/ou `agir/contract.ts` + `agir/server/{rotas,agir,vizinho}.ts` para transporte/execução; `components/ChatInput.tsx`, `ChatPanel.tsx`, `App.tsx`, `types.ts`, `session-persistence/{index.ts,transcripts.ts}` para state persistence. Deltas devem preservar fronteiras D68/D69 e testes de casa.

**Solução candidata e integração da fonte.** Estender a Casa Provedores existente, não criar infraestrutura paralela. Recomendação de contrato v3 no mesmo `providers.json`: manter `ativo` como provedor/modelo padrão para novas conversas e compatibilidade, sem deixar que ele sobrescreva escolha explícita; manter `modelo` como default por provedor e acrescentar `habilitado` por provedor e `modelosHabilitados` (IDs opacos, case-sensitive). Assim, só pares de provedores configurados/habilitados e modelos explicitamente habilitados entram no catálogo. Migration v2: provedores já configurados permanecem habilitados; seu `modelo` não vazio vira o único modelo habilitado/default inicial. `GET /api/providers` projeta catálogo sanitizado `{providerId, modelId, label, protocol/capability status}` sem chave, originado apenas em configuração salva. `POST /api/providers/models` continua descobrindo candidatos no servidor; a UI atual de Provedores permite habilitar itens descobertos e adicionar modelos manualmente no mesmo formulário. Falha de descoberta não apaga modelos configurados; lista descoberta não habilita automaticamente modelos sem ação explícita.

Na migração v2→v3, backup do arquivo antes da alteração; preservar cada config. Recomendação compatível: provedor já configurado mantém habilitação conforme sua configuração antiga; `modelo` não vazio é migrado como o único modelo habilitado/default inicial; modelos descobertos mas nunca salvos continuam candidatos, não entram por inferência. Entrada manual é suportada. Não mexer em credenciais na UI do chat.

A seleção do chat é objeto tipado `{providerId, modelId}` associado ao chat em `Session/NestedChat` (fonte persistida existente) e no payload de cada turno. A UI hidrata esse estado após F5 e usa o mesmo `EstadoProvedores` sanitizado do painel de configuração. No envio, a prefeitura recebe somente IDs e contexto; o backend relê o `providers.json`, valida existência/habilitação e compatibilidade, resolve protocolo/base URL/chave (D84) exclusivamente no servidor e cria snapshot imutável do alvo para aquele run. O adaptador envia literalmente `modelId` ao gateway; nenhuma rota aceita base URL, chave ou descritor arbitrário do browser. A configuração pode ser atualizada sem reiniciar porque salvar na tela Provedores atualiza a projeção compartilhada já usada pelo app; reabrir/retomar conversa, obter foco e cada novo envio revalidam a revisão atual no GET do mesmo endpoint. A fonte administrativa pode expor uma revisão/ETag para invalidar cache. Se outro processo alterar o arquivo sem reiniciar o app, a próxima atualização/revalidação detecta a mudança; seleção removida/desabilitada é bloqueada antes de qualquer chamada ao provedor.

**Alternativas de catálogo.** (A) exibir só o campo `modelo` hoje persistido — preserva schema, mas não satisfaz “todos os modelos habilitados” nem a descoberta; insuficiente se múltiplos modelos por provedor forem requisito. (B) consultar a rede em toda abertura do chat — indisponível offline, não cobre gateways sem catálogo/manual e não representa habilitação administrativa; rejeitada como fonte autoritativa. (C) salvar lista explícita de modelos habilitados no contrato/arquivo da Casa Provedores e reutilizar o GET existente — recomendada; migra o modelo v2 já salvo e mantém discovery como preenchimento de candidatos. (D) novo serviço/registry independente — rejeitado por duplicação e divergência.

**`Auto` e defaults (recomendação, ainda a aprovar).** “Auto” não deve ser enviado como model ID nem autorizar seleção dinâmica escondida. Preservar a affordance como “Padrão configurado”: no momento da escolha resolve o `ativo` + modelo default habilitado e grava o par concreto; o chip passa a mostrar provedor/modelo real. Se não houver default válido, orientar a escolher/configurar; sem fallback. Conversas existentes com string legacy podem ser migradas somente se o servidor resolver correspondência única; nome ambíguo fica “modelo antigo/indisponível” e exige seleção explícita.

**Capacidades e diferenças entre provedores/gateways.** O par identifica também o adaptador/protocolo via configuração salva; manter suporte heterogêneo (OpenAI-compatible, Anthropic, Gemini, Ollama, genérico/gateways) na Casa Provedores existente. Catálogo pode informar `supported/unsupported/unknown` para uso de tools, mas `unknown` não é suporte. Descoberta de `/models` não prova que cada modelo aceite tool calling; gateways podem ocultar restrições ou reescrever aliases. Para Agir/Plan/Ask que necessitem ferramentas, seleção incompatível/indeterminada não faz fallback: retorna erro específico antes de executar tool. Se o upstream reportar modelo real diferente do solicitado, registrar/mostrar a divergência; não afirmar que o solicitado respondeu. Se não reportar, declarar honestamente que o ID enviado foi o escolhido e que roteamento interno do gateway não é verificável pelo app. A matriz ampla de compatibilidade D101 permanece atividade transversal, não IC-08.

**Estado concorrente e exceções.** Catálogo vazio: seletor em estado vazio com acesso à configuração; envio bloqueado antes de abrir SSE, sem escolher “Auto” ocultamente. Provedor removido/desabilitado ou modelo removido/desabilitado: remove do próximo catálogo; seleção persistida da conversa fica marcada indisponível e exige escolha explícita, sem substituição. Provedor temporariamente fora do ar, timeout, 401/403 ou falha de descoberta: manter entrada configurada; mostrar erro operacional separado e não remover/alternar. Seleção stale entre UI e envio: servidor responde `selection_unavailable`/`selection_changed` com refresh e exige ação do usuário quando o par não existe mais. Durante execução, snapshot mantém provider/model/baseURL/chave/config version resolvidos no começo; alteração administrativa afeta novas chamadas, não troca alvo no meio de stream/tool loop. Recomendação é permitir o run já iniciado terminar ou ser cancelado pelo botão existente; a UI deve identificar essa semântica. O dono pode decidir se desabilitar deve também cancelar in-flight; implementação não presumirá revogação instantânea.

**Windows e segurança.** Testar leitura/escrita/migração em `%USERPROFILE%\.agente_window\providers.json` (incluindo backup, atomicidade, permissões/ACL e paths Unicode), além de POSIX. Não presumir `0600` POSIX equivalente à ACL Windows; usar a proteção já existente e declarar limites, sem inventar criptografia. Nenhuma chave em resposta de catálogo, transcript, payload do browser, logs, URL, fixtures versionadas ou relatório; D83 reveal só sob seu endpoint autorizado. Host/Origin/CSRF e contexto da sessão seguem F1; somente provedores configurados podem causar egress.

**Testes planejados (não executados).** Unit: contrato/catalog projection sem segredo; unicidade por par apesar de labels iguais; parsing case-sensitive; provider/model enabled/disabled/removal; v2→v3 backup, round-trip, inválidos/duplicados; fonte de chave D84; estado `unknown` tool capability; erro separado (sem config, removido, desabilitado, unavailable, timeout/auth, incompatível); nenhum fallback; atualização de catálogo/cache. Integração: carregar GET do painel e chat da mesma fonte; adicionar/editar/habilitar/desabilitar/remover modelo/provedor sem restart; POST normal e Agir usam exatamente IDs; outbound request verifica `providerId`, `modelId`, protocolo e credencial server-side; atualizar configuração durante run não altera snapshot, nova submissão usa novo estado; desativar modelo da conversa aberta bloqueia próxima submissão e mantém histórico; providers/gateways com diferentes adaptadores e tool channel. E2E com `AGENTE_WINDOW_PROVIDERS_PATH` fixture e stubs locais por protocolo: múltiplos provedores com rótulos/nome de modelo repetidos; buscar e habilitar, manual, F5, alternar chats, sem modelos, remoção/desativação, indisponibilidade distinta, execução em curso e tentativa de fallback; inspecionar requests/SSE/logs para garantir zero chave e alvo exato. Executar Windows real em fixture; provedores reais somente com ambiente legítimo, acesso seguro e autorização (D91/D99), sem registrar chave. Nenhum teste foi executado nesta rodada.

**Aceite mensurável.** (1) Todo item selecionável é um único par habilitado existente na fonte Provedores; nomes/labels repetidos de fornecedores distintos não colidem. (2) Em 100% das chamadas de fixture, `providerId` seleciona adaptador/credencial e `modelId` enviado é byte-a-byte o escolhido; nenhum fallback ou tentativa de outro modelo ocorre. (3) Remover/desabilitar impede nova execução em 100% dos casos; conversa aberta exibe estado indisponível e não substitui seleção. (4) Indisponibilidade não remove entrada nem troca alvo; erro tipado e associado à identidade correta. (5) Alteração no provedor não reinicia app; catálogo do chat atualiza na navegação/refresh contratual e novo envio usa estado atual. (6) Nenhuma chave aparece em catálogo, payload do browser, transcript/logs/artefatos; os testes confirmam a redação de segredos. (7) A migração preserva arquivo original/backup e config; Windows é reportado separado. Se o gateway não retorna a identidade realmente executada, aceite limita a afirmar correspondência do campo `model` enviado e registra explicitamente a limitação, não “modelo real verificado”.

**Regressão/rollback.** Preservar tela Provedores/FATIA 08 homologada, D82a (um slot genérico), D83/D84, teste de conexão, modelo manual, troca de provider, conversa/streaming/Parar e histórico; sem reabrir homologações 07–12. Migração somente após backup, com leitura v2 e v3 até confirmação; em erro, manter backup e bloquear alterações, não descartar dados nem converter silenciosamente. Reverter por casa/commit documentalmente rastreável, mantendo seleção anterior marcada inválida em vez de trocar de alvo. Não testar contra arquivo real do usuário.

**Dependências e fora de escopo.** D115, DEBT-14, Casa Provedores 08, Casa Conversa 09, contratos de F1/F5-A, D84, D93 Q4, D101/D112. M1 pode consumir identidade e `usage` mais tarde, mas conserva posição e não é dependência para integrar seleção; M2–M4 seguem sua ordem. Central de Diagnósticos D99 não é implementada aqui; IC-08 não contém catálogo/compatibilidade. Fora: M1 token counting/context usage, matriz completa de equivalência, novo provider/gateway, múltiplos slots genéricos, fallback automático, autenticação remota, implementação agora, novos endpoints/infrastructure se `GET /api/providers` bastar, nova fatia/iniciativa.

**Destino de planejamento sem alterar o roadmap.** F5-B é a formalização/solução candidata da **DEBT-14**, transversal entre as casas já existentes Provedores e Conversa/Agir. Não cabe na Fatia 14 (Personalizações) nem na IC-08; não criar M9, IC ou Fatia. A trilha e eventual prioridade de implementação ficam em DEBT-14 nesta auditoria, sujeitas a revisão do dono. A sequência oficial continua Gate D98 → Fatias 13–20 e, em seu lugar aprovado, M1 → M2 → M3 → M4; esta anotação não insere, antecipa ou reordena entrega.

### Avaliação F5–F8 — evidência confirmada, risco e dependência

| ID | Evidência estática confirmada nesta revisão | O que permanece risco/hipótese ou não demonstrado | Proposta de tratamento e dependência |
|---|---|---|---|
| **F5 — modos/modelo** | `ChatInput.tsx` expõe quatro modos e lista fixa; `App.tsx` mantém seleções locais e as anota nas mensagens, mas cliente Agir não envia mode/model. Rota Agir executa loop/ferramentas; `chatAlvo.ts` escolhe provedor/modelo ativo. `providers.json` v2 guarda um `modelo` por provedor; descoberta da tela é estado local e não catálogo compartilhado. | Divergência estática de contratos; nenhuma escrita em Ask/Plan ou troca de alvo foi reproduzida. D114/D115 fecharam as decisões de produto. | Formalizar separadamente F5-A (modo server-side, sem mutação em Ask/Plan; mapeamento aprovado) e F5-B (fonte Provedores, par provider/model exato, sem fallback, estado/persistência). DEBT-14 é rastreador de F5-B. Ver critérios, erros, alternativas e testes completos nas SPECs candidatas acima. |
| **F6 — contexto/anexos** | O medidor de `ChatInput.tsx` é fórmula `18 + texto.length/9 + 4 por anexo` (cap visual 92), não `usage` do provedor nem histórico completo. `App.handleSend` converte anexos em texto “Arquivos anexados: nomes”; `ChatInput`/`ChatPanel` explicitam que só o nome segue e conteúdo não é lido. O payload observado não inclui bytes do arquivo. | Não foi medido limite real, truncamento do provedor, tokenização por modelo ou resultado de anexo; alegar que anexos são lidos seria falso, mas também não há evidência aqui de truncamento real. | Não bloqueia D98 nem F1–F4. Manter comunicação honesta “estimativa visual” e “somente nome”; não ampliar para leitura de conteúdo sem contrato próprio, permissão/limite e F2. M1 permanece após a sequência aprovada e deve preferir `usage`; sem ele, estimativa rotulada ou indisponível, valores limites sem chute (D85/D112). Se usar arquivo no contexto, testes de arquivo vazio/pequeno/grande, erro/cancelamento, bytes realmente enviados e proteção de segredos; nenhum teste real de provedor nesta tarefa.
| **F7 — retomada/concorrência** | `retomarPorFluxo`, `permissoesPorFluxo` e `pendentesPorFluxo` são `Map` em memória; reinício perde retomadas. `/api/agir/continuar` lê a pausa sem claim/delete atômico antes de executar, e o estado por fluxo pode ser sobrescrito se duas requisições executarem o mesmo fluxo. A persistência de sessão sana status `working`, não reconstrói operação do Agir. | Não foi feito restart, concorrência HTTP ou prova de execução duplicada. É risco estático; não afirmar ocorrência nem recuperação segura. | Para operação cancelada/approval pendente, seguir a solução candidata F3: expirar a operação, nunca fazer replay. Recuperação durável após crash/restart e reconciliação de side effects continuam M7, depois de M1→M2→M3→M4; não bloquear D98 nem adicionar persistência/replay à Fatia 13 por inferência. Testes futuros de restart/claim/idempotência somente quando M7 tiver contrato próprio; até lá, após restart mostrar fluxo expirado e exigir pedido novo sem refazer efeito.
| **F8 — limites e segredos** | `buscar` limita resultados a 200, mas percorre recursivamente até encontrar 200; `ler` usa `readFile` integral sem teto de bytes no executor observado. `providersRepo` salva JSON em texto claro fora do projeto, tenta modo `0600` no arquivo temporário, e `POST /api/providers/reveal` devolve chave com `no-store`; proteção/autorização HTTP integral não está demonstrada. | Nenhum volume foi medido; não se reproduziu esgotamento, vazamento ou falha de permissão. `0600` no POSIX não equivale a uma prova de ACL forte no Windows; também não é criptografia. Não foi usado/impresso segredo real. | Proteção da rota reveal é parte imediata do controle F1/D105 antes de qualquer exposição do app; nunca guardar segredo em log, contexto, URL ou resposta fora do fluxo autorizado. Limites de leitura/varredura e cancelamento devem ser desenhados após medição (M1) e decisão de limite; não inventar números contrariando D85/D112. Testar arquivo grande/árvore densa, cancelamento e uso de memória em fixture; verificar ACL Windows/POSIX sem chave real, logs/redaction e acesso à rota sem sessão/origin. M8 é planejamento, não justificativa para adiar controles já conhecidos.

### Revisão cruzada, dependências e sequência proposta (sem alteração do roadmap)

1. **D93/D94 — Agir homologado historicamente.** As propostas não reabrem nem reclassificam essa homologação; delimitam correções futuras sob D103–D108. Regressão obrigatória conserva conversa normal, ferramentas, aprovações/negações, `Permitir na Sessão` dentro do escopo, anti-loop, teto/continuar e fluxo de anexos conforme texto atual.
2. **D97 — excluir para lixeira.** F2 e F3 também cobrem prévia e exclusão; preservar aprovação por operação, `Permitir na Sessão` nunca cobrindo `excluir`, negar sem efeito e mover para lixeira (nunca permanente). F4 limita-se a `criar/escrever`; não muda semântica da lixeira.
3. **D37 — concorrência entre sessões.** Não converter implicitamente a política do editor “último salva” em outra; a detecção condicional desta proposta começa nas tools Agir, com análise explícita de edição humana/outro processo. Se não houver mecanismo seguro no SO, falhar fechado/revisar escopo antes de alegar D106 cumprida.
4. **Fatia 13 §2G / DEBT-23.** O risco já aceito em §2G — shell não é sandbox e comando pode sair do cwd — continua expresso. F1–F4 não transformam cwd em confinamento de sistema operacional, não autorizam terminal, nem resolvem lixeira permanente/YOLO. DEBT-23 requer decisão própria e a SPEC 2G não é ampliada silenciosamente.
5. **Arquitetura D68/D69.** Preferir mudanças dentro das casas/portas existentes e middleware da prefeitura; um único processo/Monolito Modular/Single Port; não mover `core/server` congelado, não adicionar microserviços, não importar interior privado de outra casa e não aumentar `App.tsx` além do wiring mínimo.
6. **M1–M8, ICs, CAP e D101/D112.** F6 e os limites quantitativos de F8 podem ser medidos/documentados via M1 no seu lugar na ordem; F7 durável é M7, após dependências M1–M4 conforme registro. D110 permanece intacta: IC-01 não vira memória; IC-02-FS segue separada de IC-02-DOC; IC-07 continua vínculo à Central de Diagnósticos D99; IC-08 não absorve matriz de provedores; IC-09 segue governança D101; nenhuma recebe fatia nova. Isso não posterga F1–F4 ou autenticação da rota de segredo: M8 não é gate substituto. D101/D112 exigem evidências comparáveis; referências externas servem para perguntas/casos de teste, não para declarar equivalência nem copiar código; consultar `04 §1.5` para snapshots/licenças.
7. **D98:** esta auditoria não inicia nem conclui o Gate. A confirmação de desempenho SCM/Explorer permanece sujeita à validação documental do dono e ao protocolo/autorizações de `09 §3.8`. F1–F4 não são pré-requisito técnico para trace de desempenho isolado em fixture, mas qualquer servidor de teste deve obedecer D105: loopback/ambiente isolado, sem credenciais e sem expor API; usar a porta/fixture e salvaguardas já prescritas em `09`, nunca rodar fixture-mutating em 5174/repo real. Nenhum serviço é iniciado aqui.
8. **Antes de Fatia 13 ou ferramenta com novos efeitos:** D113–D115 fecharam as escolhas de produto local, mapeamento dos modos e autoridade/identidade do modelo. A próxima etapa é revisão independente destas SPECs candidatas; somente após aprovação específica podem ser convertidas em SPECs definitivas e implementadas/testadas pelos gates D112. F1–F4 e enforcement F5-A são requisitos transversais antes de ampliar efeitos; DEBT-23 continua decisão própria da Fatia 13. F5-B fica registrada na DEBT-14, sem alterar a ordem oficial. O Gate D98 permanece como primeira etapa numerada, não é concluído por este pacote; não se cria fatia nem se reordena a sequência.
9. **Testes e rollback geral.** Todo plano acima é futuro e precisa de aprovação por escopo, fixtures descartáveis, cobertura unit/integration/E2E e aceite humano `08`; testes não rodam contra workspace real/5174. Regressão deve verificar funcionalidades homologadas que intersectam cada mudança; rollback por casa/commit, sem stash, reset, alteração operacional, push ou mudança destrutiva.
10. **Operações expressamente proibidas nesta proposta.** Implementar ou homologar; habilitar rede/LAN; iniciar Vite/code-server/PTY/stubs; ler/expor credenciais reais; adicionar login, plugin, MCP, tool, terminal ou capacidade nova sem decisão; escrever/apagar fora de fixture; alterar D37/D93/D97, Fatias 13–20, numeração, M1–M8, Gate D98, referência congelada ou qualquer código/configuração operacional.

**Decisões do dono já fechadas:** D113 (Alternativa A local simples), D114 (quatro modos preservados e mapeados) e D115 (modelo exato, fonte Provedores). **Pontos de desenho ainda sujeitos a revisão antes de SPEC definitiva:** (i) runtime/perfil de lançamento que delimitará a allowlist Host/Origin sem confundir produto local, Vite/Arena, code-server e homologação; (ii) forma final de persistir múltiplos modelos habilitados/migração v2→v3; (iii) semântica visual de `Auto` recomendada como alias que resolve/snapshot para um par concreto; (iv) se desabilitar/remover provedor/modelo cancela também execução já iniciada ou apenas novas submissões (recomendação: snapshot imutável e cancelamento explícito). Até revisão, não assumir esses detalhes como aprovação de produção. Todos os itens continuam candidatos, não implementação autorizada.

## Matriz de rastreabilidade da visão V1.0 — CAP-01 a CAP-20 (D100; revisada com D103–D115)

**Fonte do comportamento pretendido:** `02 §1.3`; cenários: `02 §1.4`. A coluna “histórico” registra apenas homologação histórica no escopo da fatia original; não é validação da CAP inteira nesta revisão. **Código** = inspeção estática do baseline `45fa940`; **teste-fonte** = testes vistos, não executados; **checagens desta rodada** = apenas integridade documental/Git descrita no relatório final, sem teste funcional, trace ou benchmark; **relato histórico** = evidência antiga não reproduzida. Critérios abaixo são **preliminares**, não SPEC nem aceites aprovados.

| CAP | Comportamento pretendido | Código observado; UI ≠ tool | Homologação histórica (escopo limitado) | Lacuna; destino/dependência | Decisões/riscos | Evidência existente | Critério preliminar de validação futura | SPEC futura |
|---|---|---|---|---|---|---|---|---|
| **01 Exploração de projetos grandes** | Investigar repositórios extensos e localizar arquivos/relações relevantes com evidências. | Explorer/Search visual; tool Agir `buscar` procura nomes de arquivo, não conteúdo/arquitetura. | F04/Explorer e D98 relatos não homologam a CAP completa; D98 aberto. | IC-01 (workspace read-only); Gate D98 tem escopo SCM/Explorer próprio. | F8; D105 restringe rede do produto. | Código e testes-fonte; D98 sintético é relato, não resultado reproduzido. | Fixture grande; precisão/recall de caminhos e relações; cancelamento, latência e fonte de cada conclusão. | Sim, após Gate D98/planejamento; não criar agora. |
| **02 Compreensão arquitetural** | Explicar módulos, dependências, fluxos e limites com base na fonte. | O agente pode ler arquivos; não há mapa arquitetural rastreável identificado como capacidade do agente. | Fatia 10/12 aprovadas somente em seus próprios escopos. | IC-01; não inclui memória ou busca de conversa (M4/M6). | F1/F2, F6; D103/D104. | Código-fonte e testes-fonte; sem avaliação de qualidade nesta rodada. | Mapa cotejado com arquivos e relações; amostra de afirmações verificáveis e não encontradas. | Sim, separada da SPEC de file tools. |
| **03 Documentação técnica** | Criar/atualizar documentação coerente com requisitos, decisões e evidências. | `criar`/`escrever` existem como tools de arquivo, não como garantia de documentação fundamentada. | Fatias 10/12 não homologaram qualidade documental desta CAP. | IC-02-DOC; pode consumir IC-01 e usar IC-02-FS com autorização. | F1/F4/F6; D103/D106. | Só presença de ferramentas no código; sem teste de produto executado. | Revisão de rastreabilidade afirmação→fonte, consistência com decisões e preservação do conteúdo anterior. | Sim; critérios não são SPEC definitiva. |
| **04 Ferramentas completas de arquivos** | Explorar e, quando autorizado, criar, ler, editar, mover ou excluir dentro do escopo. | `ler/listar/buscar/criar/escrever/excluir`; não encontrei mover/renomear no Agir. `criar` pode substituir arquivo existente; contenção é lexical. | Fatias 10 e 12 historicamente homologadas para seus contratos originais; não provam D104/D106. | IC-02-FS; reusar casas atuais; M8 é transversal, não destino único. | F1–F4; D103/D104/D106/D107/D111 bloqueiam ampliação. | Testes-fonte de permissões/disco/território; não executados agora. | Não modificar em colisão; conflito de versão; falhas parciais; symlink/junction; Windows/POSIX; aprovação/cancelamento. | Sim, por operações e contratos existentes. |
| **05 Terminal e comandos** | Executar comandos e inspecionar resultados de forma controlada. | Terminal visual/PTY é para usuário; não confundir com `executar` futuro do agente. | Terminal humano homologado historicamente; não há homologação de terminal do agente. | Fatia 13 (SPEC 2G), DEBT-23 ainda exige decisão própria; Fatia 16 é terminal visual. | D103/D105/D107/D108/D111; F1–F3. | SPEC 2G é compromisso documental; sem implementação ou teste nesta tarefa. | Comando aprovado/negado, cwd e acesso local, timeout/cancelamento, saída e efeitos observáveis. | Atualizar somente após decisão DEBT-23 e gate; não agora. |
| **06 Git e versionamento** | Consultar e apoiar operações de versionamento autorizadas. | SCM/Git visual e serviços humanos existem; não encontrei tools Git anunciadas ao agente. | Homologações visuais anteriores não equivalem a Git do agente. | IC-03; separado de DEBT-18/SCM UI e Fatia 19/worktree. | F1/F3; operações destrutivas sob D103/D107/D111. | Código visual; sem execução de Git pelo agente. | Estado/diff auditável em fixture; aprovações por efeito; não tocar repo real em testes. | Sim, se destino for aprovado. |
| **07 Pesquisa externa** | Consultar fontes externas, distinguir evidência de inferência e citar fontes. | Browser integrado é visual; não encontrei web-search tool do agente. | Nenhuma homologação de pesquisa externa do agente identificada. | IC-04; não é Browser/Fatia 20. | D105 local-only; rede externa do agente requer delimitação; dados não confiáveis. | Código/UI e documentos; sem teste externo. | Fonte acessível, atribuição, erro, conteúdo não confiável e limites de rede/custo. | Sim, após decisão de rede/escopo. |
| **08 Memória persistente** | Reutilizar informações entre sessões sem confundir memória com estado atual. | SQLite/JSONL de sessão existe; não demonstra memória durável de projeto consentida. | Homologação da persistência de sessões não homologa memória de projeto. | M5 somente planejamento; identidade de projeto/isolamento precisam de decisão. | D104; F7/F8; M8 não adia privacidade. | Código e relatos históricos; nenhuma prova de memória da CAP. | Consentimento, proveniência, isolamento, revisão/expurgo e não contaminação entre pastas de mesmo nome. | Sim, depois de M5 e validação. |
| **09 Gestão inteligente de contexto** | Selecionar contexto considerando limites e prioridades. | Histórico visível é enviado; indicador é heurístico; anexos enviam nome/tipo, não bytes. | Não há homologação de orçamento/contexto real por provedor. | M1→M2→M3, nesta ordem; contratos de anexos precisam de fronteira própria. | F5/F6/F8; D108/D109/D112. | Fórmula UI e payload observados; sem usage/teste de provedor nesta tarefa. | `usage` real ou estado estimado/indisponível rotulado; comparação por provedor; anexo mostra o que foi realmente fornecido. | Sim, após M1/M2; não agora. |
| **10 Recuperação inteligente** | Recuperar informação de documentos, histórico e materiais com distinções claras. | `buscar` localiza nomes; não procura transcripts nem memória do agente. | Nenhuma homologação de recuperação histórica pelo agente. | M4 (busca manual) após M2; M6 é recuperação pelo agente e não é a mesma iniciativa. | D104; F6/F8; M4→M6 em planejamento. | Código de `buscar` e contratos de sessão; sem ensaio de recall. | Resultados com fonte/ID, escopo da conversa/projeto e exclusão de dados não autorizados. | Sim, em escopos separados. |
| **11 Planejamento de tarefas** | Decompor objetivo em etapas, dependências, riscos e critérios. | Modo “Planejar” na UI não cria planner estruturado nem restrição de backend. | Nenhuma homologação de planner. | IC-05; distinto do loop Agir. | D108; F5; plano não autoriza mutação. | UI/código estáticos; sem avaliação. | Plano rastreável, confirmação humana e nenhuma escrita/ação com efeito em Plan. | Sim, após fronteiras do modo. |
| **12 Execução autônoma controlada** | Executar sequências apenas no escopo permitido, pedindo aprovação quando necessário. | Loop multi-iteração, cartões, teto e continuar; proteções têm lacunas F1/F3/F7. | Fatias 10–12 historicamente homologadas em escopos próprios; não testadas nesta rodada. | Agir existe; retomada durable M7 apenas planejamento; novas ferramentas bloqueadas por F1–F4. | D103–D111; F1–F4/F7. | Testes-fonte; nenhuma execução atual. | Negação, aprovação, parada, falha/restart, efeito único e escopo de workspace. | Sim para cada ampliação, não para reabrir homologações. |
| **13 Segurança e permissões** | Autorizações não ultrapassam área/permissão concedida e ações relevantes são explicáveis. | Caminho lexical; servidor recebe workspace/permissões do cliente; approvals voláteis. | Fatias 10/12 homologadas historicamente não demonstram os novos contratos D103–D107. | Hardening transversal; F1–F4 prioritários; F8 também exige verificação. | D103–D107/D111; M8 não é adiamento. | Leitura estática; testes-fonte não cobrem todas as bordas citadas. | Cliente adulterado, outra pasta, symlinks, concorrência e ação cancelada devem falhar com segurança. | Sim, antes de novas ferramentas/autonomia. |
| **14 Múltiplos provedores/modelos** | Usar provedores distintos e comunicar capacidades/limites sem prometer paridade. | Quatro protocolos nativos de tool calling; servidor usa provedor ativo; seletor UI não escolhe alvo real. | Fatias 08–10 historicamente homologadas em seus escopos; nenhum provedor real chamado nesta auditoria. | M1 cuida usage/contexto; matriz de compatibilidade é atividade D101, não IC-08. | F5/F6/F8; D103/D108/D112. | Código e relatos históricos; teste de compatibilidade não executado agora. | Matriz por protocolo/modelo, respostas de erro, tool-calling e origem das métricas, com condição comparável. | Sim, após decisão do modelo/alvo. |
| **15 Skills/plugins/extensibilidade** | Ampliar capacidades de forma compatível e controlada. | Fatia 14 tem SPEC de skills v1; runtime não está implementado neste baseline; MCP/plugins além disso não observados. | Nenhuma homologação da capacidade final. | IC-06 além da 14; instalar não pode ampliar permissões implicitamente. | D103/D104/D108; F1–F4 e M8. | SPEC 2H é documento, não código; sem testes. | Ativar/desativar, proveniência, escopo, permissões, remoção e estado inválido. | Sim para cada extensão. |
| **16 Continuidade interrompida** | Restaurar estado e verificar projeto real antes de retomar, sem replay perigoso. | Retomada do Agir em memória; reinício não preserva mapa operacional; transcript converte `working`. | Fatia 11 Continuar não comprova retomada após reinício. | M7 só planejamento; manter M1→M4 antes da família posterior conforme roadmap. | D104/D107; F3/F7. | Código; sem restart test. | Reinício em fases diferentes, conciliação de efeitos e aprovação expirada sem duplicação. | Sim, depois de definição de M7. |
| **17 Interface integrada** | Acompanhar conversa, compreensão e trabalho num workbench integrado. | Workbench/Editor/SCM/terminal humano existem; não provam o ciclo integral do agente. | Fatias visuais 07–12 historicamente homologadas em escopo individual. | Fatias 15–20 mantêm escopo; IC-09 não é feature. | D110/D112; regressões de sessão/layout. | Código e aceites históricos; cenário integral não executado. | Cenários de navegação e estado integrados sem misturar UI humana com tool do agente. | SPECs por fatia existente; sem SPEC nova nesta tarefa. |
| **18 Diagnóstico/observabilidade** | Eventos relevantes rastreáveis e problemas compreensíveis. | SSE/cartões transitórios; Central permanente não identificada como implementada. | Nenhuma homologação da Central. | Capacidade futura aprovada em D99; IC-07 absorvida, SPEC própria pendente. | D103/D105; F8/segredos. | Código de eventos e decisão D99; sem teste de observabilidade. | Correlação de sessão/turno/tool com redação de segredos e exportação sanitizada. | SPEC própria de D99, não IC duplicada. |
| **19 Verificação técnica/testes** | Ajudar a selecionar/executar verificações e relatar resultados com honestidade. | Suítes existem para humanos/CI; não encontrei test runner escolhido/executado pelo agente. | Testes de fatias históricas não homologam essa capacidade do agente. | IC-08 estreitada a capacidade do agente; Fatia 13 é pré-condição para comandos, quando aplicável. | D103/D107/D112; F1/F3/F8. | Inventário de testes-fonte; nenhum teste executado nesta tarefa. | Executado/não executado/falhou, comando, saída, ambiente, fixture, critérios e limites. | Sim, se o destino de produto for aprovado. |
| **20 Ciclo completo** | Assistir o ciclo de qualquer projeto com integração confiável. | É objetivo de visão; nenhum único fluxo end-to-end atual comprova CAP 01–19. | Nenhuma homologação transversal da CAP-20. | IC-09 reclassificada como governança D101/aceite transversal; Fatias 13–20 não alteradas. | D112; todas as pendências aplicáveis; D98 aberto. | Documentação e código parcial; sem comparação/aceite nesta rodada. | Cinco cenários D100, cada um com SPEC/testes/evidências/aceite, sem extrapolação de paridade. | Gate transversal futura; não criar SPEC agora. |

### Dependências e destinos — sem alteração unilateral de roadmap

- **Sequência numérica preservada:** D98 (gate isolado) → 13 (terminal do agente, SPEC 2G e DEBT-23 a decidir) → 14 (skills/personalização, SPEC 2H) → 15 (abas, SPEC 2I) → 16 (terminal 2.0 visual) → 17 (refinamentos/Command Center) → 18 (painéis) → 19 (worktrees/sessões) → 20 (polimento/navegador). A ordem de planejamento M1–M4 após 15 é orientação vigente e **não** numeração de fatias; qualquer agenda de execução depende de SPEC/aprovação. O D98 não implementa CAP-01 integralmente.
- **Sequência formal de planejamento: M1 → M2 → M3 → M4** (D109). M3 depende de M1+M2 e M4 de M2; dependência técnica não altera a ordem aprovada de abertura. Investigações preparatórias podem ser paralelas, mas as SPECs não. M1–M4 seguem apenas planejamento; não há autorização de implementação.
- **M5–M8** constam no estudo arquivado e, pela **D102**, estão agora **formalizadas exclusivamente para planejamento**, não aprovadas para execução. Seus contratos e destinos continuam sujeitos à auditoria Arena e a decisões futuras. A numeração hipotética de fatias nesse estudo não substitui as fatias oficiais 13–20 nem constitui compromisso de adoção.
- **Lacunas sem destino formal de implementação:** IC-01, IC-02-FS/DOC, IC-03–06 e IC-08 permanecem propostas sem destino aprovado; incluem tools Git/web, planner, plugins/MCP completos, ferramentas mover/renomear e testes do agente. IC-07 é vínculo absorvido à Central de Diagnósticos D99 (SPEC pendente); IC-09 é aceite transversal D101, sem feature/fatia. A matriz de provedores/compatibilidade é atividade D101, não IC-08. Nenhuma classificação amplia escopo automaticamente.
- **DEBT-18/19/20** continuam separadas dos respectivos recursos completos do agente: SCM rico, Explorer UI e Browser visual, por si só, não entregam Git-agent, file-tools ou web-tool.
- **Gate de aprovação antes de agir:** para cada CAP ainda parcial, dono valida destino e prioridades → SPEC descreve contrato, segurança, dependências, teste e *não fazer* → aprovação explícita → código/testes → homologação do dono. Os cinco cenários D100 e a política D101 orientam aceites, mas não autorizam novas fatias.

### Matriz mínima cenário final → cobertura exigida (proposta de planejamento)

| Cenário de `02 §1.4` | CAP essenciais a verificar (candidatas, não cobertura aprovada) | Bloqueio documental identificado |
|---|---|---|
| 1. Compreensão de projetos grandes | 01, 02, 09, 10, 13, 14 | Bench de escala + protocolo de compreensão/recuperação |
| 2. Desenvolvimento de funcionalidades | 03, 04, 05, 06, 11, 12, 13, 19 | Ferramentas Git, planner, testes e segurança |
| 3. Continuidade de tarefas | 08, 09, 10, 13, 16 | Decisão M5/M6/M7, checkpoint e idempotência |
| 4. Extensibilidade | 13, 14, 15, 18 | Integrações além de skills v1; compatibilidade/diagnóstico |
| 5. Projetos complexos colaborativos | 02, 03, 08, 09, 10, 11, 12, 16, 17, 20 | Fluxo transversal de longa duração e aceite da V1 |

**Uso:** esta matriz orienta a elaboração *futura* de SPECs e do roteiro do `08`, com protocolo técnico no `09`. Não é uma prova de cobertura executada nem libera mudanças de código.


# PARTE 4 — Débitos Técnicos Secundários & Históricos

### Higiene de Testes — faxina em 2 ondas (D74, 2026-10-14)
- **Onda 1 — skip: ✅ EXECUTADA (2026-10-15, FATIA 07, commit `9985b9e`).** Os **13 E2E mortos históricos** estão em `test.skip` com 2 linhas de comentário apontando o registro (`09 §2.4`) e o conserto na FATIA 16 (pós-D95). Skips da suíte E2E: **6 → 19**. O contrato anti-trapaça (`e2eAssertionContract.test.ts`) passou a contar `skip` como declaração e, em troca, exige que spec 100 % pulada cite `docs/09` (**D79**).
- **Onda 2 — conserto:** as **9 falhas de unit do terminal** (P4) são consertadas na **FATIA 16**, junto do transplante (pós-D95).
- **Baseline atualizado (2026-10-15, HEAD `9985b9e`):** typecheck 0 · `vitest run` → **730 pass / 12 falhas / 16 skip** (12 = 9 P4 do terminal + `iconLabels` + `themeTokens` + `visualStates`; todas pré-existentes, provadas com `git stash`). Baseline histórico anterior: 722/9/16 em `f2ff5a3`.
- **Falhas E2E pré-existentes FORA da lista §2.4 (triagem 15/10):** 7 testes — `sessao_01` T2/T3, `sessao_08` T1, `sessao_09` T5, `sessao_10` T1, `sessao_05_single_pane` T2/T6 — conferidos no A/B em `e02e486` (falham igual nos dois estados). **Destino (D80, 15/10):** os **2 investigados** (`sessao_10` T1 e `sessao_05` T2 — expectativa morta da coluna "Detalhes") entram em **quarentena com nota** (skips 19 → **21**); os **5 restantes seguem vermelhos** e registrados em `09 §2.6` até a fatia da área (12/13 — pré-D95 = 16/17).
- **P7 — Flakes de digitação:** latência em testes de search/explorer — tratar na fatia que mexer nesses testes (a partir da 15/17 — era 11/13 pré-D95).
- **D2.72 — Campo `auxiliaryVisible` órfão:** limpeza de código sem impacto visual reservada para a **FATIA 18 (Painéis)** (pós-D95).
- **D2.1 a D2.13:** itens de acabamento de árvore e decorators — absorvidos pelo roadmap acima; revisar quando a fatia correspondente abrir.

### Nota de fronteira (D70)
- As dívidas **DEBT-ROBUST-01..04** (migração MVP → **Condomínio Robusto**) **não pertencem a este roadmap** — vivem no `04 §2.2` (gatilhos e custos) e no `05` (D70). Só migram **com gatilho + ordem expressa do dono**, nunca no meio de uma fatia.

### ENCERRAMENTO — Padronização & Entrega (após a FATIA 20 — D78, pós-D95)
> **Não é fatia numerada** (a numeração segue 07–20); é a **etapa de entrega**, feita quando o dono mandar, depois do polimento.
- **Padronização do código (o "pente-fino"):** revisar nomes, comentários e o uso da língua de alto nível em todo o código (D76) — o objetivo é o projeto **se explicar sozinho** para qualquer pessoa/IA que pegue o código sem ler documento.
- **Pacote de documentação de entrega (alvo enxuto ~6 arquivos):** README da raiz · `AGENTS.md` atualizado · **cartões de visita por casa** (revisados) · glossário curto dentro do repo · decisões destiladas (versão enxuta do `05`).
- **Destino dos canônicos da obra:** viram `arquivo_morto` — são a **planta da construção**, não o manual do prédio.
- **Candidatos registrados na raspagem (D77):** fiscal automático de fronteiras (dependency-cruiser/ts-arch — receita em `referencias/arquitetura-limpa/02…`); avaliar junto com o gatilho do Robusto.
- **Kit de testes:** bateria final verde (typecheck 0; suítes de terminal já consertadas na FATIA 16 (pós-D95); E2E mortos já em `skip` desde a FATIA 07).
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
| **Q5** | **Segunda conversa (nested chat): criar de verdade na 09?** | (a) sim, fluxo real de novo chat · (b) adiar; o **+** fica **fora** até existir | **(b)** — o **modelo já suporta** `chats[]` e a restauração já reagrupa por `chatId`; o que falta é **UI e fluxo**, que não muda o critério de aceite desta fatia. Construir agora desviaria o foco de "conversa real" **→ RESPONDIDO (17/10): letra (b) — adiar para a FATIA 13 (pré-D95 = 17) e esconder o "+" falso da 09; receita do original anotada em §9.5 (nunca ter botão "limpar conversa").** |

**Decisões tomadas pela IA (registradas para não virar susto):** a **casa nova** será `bairros/2-inteligencia/casas/conversa` (2.º módulo extraído, D69/D76 — com cartão de visita e teste de fronteira); a rota de conversa segue o **mesmo padrão** da casa Provedores (`rotaPertenceAoModulo` + registro no dev server "prefeitura"); o transporte do streaming será **HTTP com envio em pedaços (SSE)** por reaproveitar a porta única 5174 e não exigir infraestrutura nova — se a prova mostrar problema, cai-se para WebSocket (o `ws` já é dependência do projeto).

## 5. O que NÃO fazer na FATIA 09
- **Nada de ferramentas/arquivos/terminal** (isso é a FATIA 10 — Agir): o agente **não age**, só conversa.
- **Nada de segunda conversa (Q5b):** o botão `+` (`chat-group-tab-add`, `ChatPanel.tsx:294`) fica **oculto** até a FATIA 17 (pós-D95), e **nunca** haverá botão "limpar conversa" (o original não tem — `RESET_SESSAO.md`).
- **Nada de cartão de permissão** (FATIA 10).
- **Nada de mexer na tela de Provedores** além de consumi-la (ela está homologada — mudança ali exigiria reabrir a 08).
- **Nada de "modo anexo/maximizado"** nem de unificação de abas (DEBT-12 é da FATIA 15, pós-D95).
- **Nada de chave no navegador** — nem em teste, nem em log, nem em exemplo.
- **Não "consertar"** as 12 falhas pré-existentes (decisão já tomada: FATIA 16 (pós-D95)) nem apagar teste nenhum.

## 6. Plano de prova (§6)
- **(a) Provedor simulado com streaming** — extensão do stub da 08 (`uploads/stub_provider.cjs`, porta 4599, **fora do repo**) com um endpoint que **emite pedaços com atraso**, um que **falha no meio**, um que **não responde** (para timeout) e um que **recusa a chave** (401).
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
- Fluxo: `new_session` → `stopSession` → `session_cleared` (limpa só a tela) → **id novo alocado no primeiro envio**; retomar = lista/modal (Session Picker: needs-input / recentes / outras) — esse seletor é **terreno da FATIA 17** (pós-D95).
- Exclusão só pela **lixeira** ao lado da conversa — nunca "limpar".

**No nosso projeto hoje:** o "+" é o `chat-group-tab-add` em `ChatPanel.tsx:294`, na faixa de abas de chats do painel central — e a faixa **só aparece quando já existem 2+ conversas**; o botão hoje é falso (envia frase pronta).

**Leitura para as decisões:**
- **Q4:** a proposta do dono (pasta `uploads` criada dentro da pasta ativa) **não é o modelo do original** (que referencia e deixa o agente ler na FATIA 10) — é o modelo de produto de chat (Arena/nuvem Anthropic), e tem um ganho: o arquivo **nasce dentro do workspace**, então a FATIA 10 já o enxerga para agir. Pesa contra: escrever na pasta do usuário sem pedir e crescer a 09.
- **Q5:** a receita do "+" de verdade está mapeada (acima); adiar mantém o foco da 09 e o seletor de conversas cai naturalmente na FATIA 17 (pós-D95).

---

# PARTE 2D — SPEC: FATIA 10 — Agir (Ferramentas de Arquivo + Permissões)

> Escrita em **2026-10-18**, no dia em que o dono homologou a FATIA 09 (D92) e mandou começar ("começe a 10"). Padrão das fatias: SPEC → decisões fechadas com o dono → 5 commits por conquistas. **Decisões Q1–Q4 FECHADAS com o dono ainda em 18/10 (registro D93, `docs/05`) — execução autorizada.**

## 1. Objetivo (uma frase)
Fechar o MVP: a IA deixa de ser só conversa e passa a **ler, listar, buscar, criar e escrever arquivos dentro da pasta de trabalho** — e **nenhuma mexida acontece sem o cartão de aprovação do dono**: **[Permitir] [Negar] [Permitir na Sessão]**.

## 2. Terreno conferido no código (18/10)
- **D72** — escopo fixo: ferramentas de **arquivo**; **terminal-visual na FATIA 16; terminal-para-o-agente na FATIA 13** (pós-D95).
- **Casa Conversa (09)** — fio SSE `chunk/done/error` + Parar no servidor; o contrato já reserva a frase: *"a FATIA 10 soma os eventos de ferramenta"* (`contract.ts`).
- **Servidor de arquivos** — leitura/listagem nas rotas `/api/fs/*` e o **`fsHost`** (`modules/explorer-search/server/fs/fsHost.ts`) com **escrita atômica já pronta** (`writeFileAtomic`: grava num temporário e troca num passo — ou grava tudo, ou não grava nada), além de `mkdir`/`rename`/`copy`/`delete`. A C2 **liga** essas mãos às ferramentas do agente + trava de território; a FATIA 15 reaproveita a mesma peça para o **editor salvar** (pós-D95).
- **Pasta ativa** — resolvida no servidor (`/api/workspaces/*`); é o território que nenhuma ferramenta pode ultrapassar.
- **Referência de produto (dentro do repo):** `docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/PERMISSOES.md` — desenho do OpenClaude: card no fluxo do chat **[Permitir] [Não] [Sempre na Sessão]**; negar devolve *"User denied permission"* à IA; **guardião anti-loop** (`doomLoop.ts`): hash de `ferramenta + argumentos`, contador por sessão, **bloqueio na 3ª chamada idêntica consecutiva** com mensagem ao modelo. *(A nota externa `referencias/openclaude/03_sessoes_e_permissoes.md` não sobreviveu à faxina — vale o PERMISSOES.md.)*
- **Regra de segurança (VS Code agent mode, pesquisa de 17/10):** ferramentas embutidas só tocam arquivos **dentro do workspace**.

## 3. Decisões Q1–Q4 — FECHADAS COM O DONO (18/10; registro D93)

| # | Pergunta | Opções | Recomendação da IA |
|---|---|---|---|
| **Q1** | **O que a IA faz SEM perguntar?** | (a) **só olhar** de graça (ler/listar/buscar dentro da pasta) — criar/escrever **sempre** passam pelo cartão · (b) perguntar por **tudo**, até ler · (c) nada pergunta | **(a)** — é o jeito do VS Code e do OpenClaude (PERMISSOES.md: leitura `allow`, escrita `ask`); controle de verdade sem um clique por cada olhada **→ RESPONDIDO (18/10): (a)** |
| **Q2** | **O "Permitir na Sessão" vale até quando?** | (a) até a **conversa acabar** — conversa nova pergunta de novo; **F5 mantém** (a sessão sobrevive ao F5 desde a 09) · (b) **para sempre** por tipo de mexida | **(a)** — simples e previsível; (b) cresce escopo e risco nesta fatia **→ RESPONDIDO (18/10): (a)** |
| **Q3** | **Quanto o cartão mostra da mexida?** | (a) **caminho + prévia** do conteúdo a gravar · (b) comparação **antes × depois** lado a lado · (c) só o caminho | **(a)** no MVP — a "lupa" rica de diff é o tema da **FATIA 15** (número pós-D95; definição sob revisão — DEBT-17); (c) é aprovar no escuro **→ RESPONDIDO (18/10): (a)** (o dono pediu explicação alto-nível antes de decidir; explicado o caso "arquivo novo não tem antes") |
| **Q4** | **Como a IA "levanta a mão" pedindo ferramenta?** | (a) **idioma único combinado** — um formato de pedido que todos os provedores usam igual · (b) **jeito nativo de cada serviço** (4 implementações: OpenAI/Anthropic/Gemini/Ollama) | **(a)** — um idioma só, uma suíte de provas, funciona igual no Ollama local, na nuvem e no stub (D91); pedido torto = aviso **honesto** + nova chance, nunca texto inventado **→ RESPONDIDO (18/10): (b), ESCOLHA DO DONO** — perguntou como o VS Code/Claude Code fazem (nativo) e escolheu seguir esse desenho, **contra a recomendação da IA**, com a consequência aceita e registrada na §8 |

## 4. O que NÃO fazer na FATIA 10
- **Nada de terminal/comandos** (visual na 16; para-o-agente na 13 — pós-D95): a IA não executa nada; só lê e escreve arquivo.
- **Nada de worktree/branch de sessão** (FATIA 19, pós-D95): a IA mexe direto na pasta ativa, sempre com aprovação.
- **Nada de painel de alterações / Accept All / Discard** (FATIA 15 — "lupa" sob revisão (DEBT-17)): a auditoria rica vem com o diff.
- **Nada de sair da pasta:** caminho com `..` ou absoluto de fora do workspace = **recusa honesta**, sem executar.
- **Nada das dívidas:** DEBT-12 (abas → 15, pós-D95) · DEBT-13 (memória) · DEBT-14/15 (seletor/bolinha) · "+" segunda conversa (17, pós-D95).

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

**Limitação nova registrada honestamente:** cada envio é **um fluxo novo**; o resultado das ferramentas entra no histórico como texto (o modelo lê o que aconteceu nas trocas anteriores), mas não há "estado de ferramenta vivo" entre mensagens. E a suíte E2E **completa** segue não sendo régua no sandbox (`09 §13.1`) — a régua é por fatia. **Sem ferramenta de exclusão (por desenho, confirmado 19/10):** o conjunto da FATIA 10 é ler/listar/buscar + criar/escrever (SPEC 2D §7-C2, fechada no D93) — o código tem exatamente essas 5; o relatório CRUD do dono confirmou CREATE/READ/UPDATE e a ausência do DELETE, que fica registrado como **fora do escopo do MVP** (evoluiu em 19/10: dono declarou necessidade do CRUD completo e **fechou o desenho** — lixeira, arquivo+pasta, cartão reforçado, micro-fatia própria; ver **DEBT-16**).


---

# §0 — Mapa pós-MVP (D95) + matriz das SPECs 11–15 — FECHADO, Q&A 100% (20/10)

> **Status:** rascunho escrito pela IA em 19/10. **Implementação proibida** até o Q&A de cada SPEC com o dono + autorização expressa. Barra: qualquer programador ou IA implementa sem interpretação subjetiva.

**Mapa (D95):** novas 11 (teto/Config) · 12 (DELETE) · 13 (terminal-agente) · 14 (barra/skills) → velha 11 virou **15** (abas/DEBT-12) · 12→**16** (Terminal 2.0 visual) · 13→**17** (refinamentos) · 14→**18** (painéis) · 15→**19** (worktree) · 16→**20** (polimento+navegador).

**Matriz de dependências (lê-se: linha depende de coluna):**

| SPEC | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|
| 11 teto/Config | — | não | não | não | não |
| 12 DELETE | não¹ | — | não | não | não |
| 13 terminal-agente | sim² | não | — | não | não |
| 14 barra/skills | não | não | não | — | não |
| 15 abas (DEBT-12) | não | não | não | pref³ | — |

¹ A 12 independe da 11 (ferramenta nova, teto atual vale). ² A 13 usa a aba Config se existir (teto) — senão usa o padrão 25; e estende o cartão que a 12 reforçou. ³ A 15 prefere a 14 pronta (mesma região de código, lados opostos) para não fundir UI em conflito — não é bloqueio duro.

**Pontos de toque compartilhados:** casa Agir — loop (11), ferramentas (12, 13), anúncio de tools (12, 13); cartão de permissão — reforço (12), tipo comando (13); `App.tsx`/`shell/` — 14 (esquerda) e 15 (direita/centro). **RNF global:** nenhuma fatia aumenta o `App.tsx` — UI nova nasce em componentes/casas (D69); fiação mínima no síndico.

**Riscos cruzados:** R-X1 testes E2E antigos de terminal seguem frágeis no sandbox (régua = specs das fatias, `09 §13.1`) · R-X2 cada SPEC mexe no cartão — regressão obrigatória do cartão da 10 em 12 e 13 · R-X3 escopo da 14 é o maior — o bound da v1 (§2H-6) é inegociável.

## PARTE 2E — SPEC da FATIA 11: Teto 25 + "Continuar?" + Config v1 — FECHADA (Q&A 100% em 20/10)

**1. Objetivo:** desbloquear tarefa real (o teto 10 parou o dono em 19/10): teto configurável padrão 25 (igual ao original), pergunta "continuar?" ao bater em vez de morrer, aba Configurações (casa das preferências) e auto-scroll do chat.

**2. Entregáveis:** (a) aba Configurações com 2 itens na v1 — teto de voltas (número) + auto-scroll (liga/desliga); (b) loop do Agir lê o teto (padrão 25); (c) fim de teto vira cartão-mensagem com botão **[Continuar]** (+N voltas) e **[Parar]**; (d) anti-loop 3× segue fixo e sempre ligado (decisão 19/10); (e) auto-scroll só quando o usuário já está no fim (não puxa leitura).

**3. Requisitos funcionais:** RF11-1 teto vale por mensagem, 1–250, padrão 25 (Q11-2 DECIDIDO 20/10: 250) · RF11-2 salvar aplica na próxima mensagem (nunca no meio de um loop) · RF11-3 "Continuar" concede +1 orçamento cheio e retoma o MESMO fluxo (Q11-5) · RF11-4 sem Config salva = 25 + auto-scroll padrão (Q11-3) · RF11-5 número inválido = erro honesto no campo, nada salva · RF11-6 auto-scroll só dispara se o viewport estiver a ≤120px do fim.

**4. Requisitos não-funcionais:** RNF11-1 settings em `~/.agente_window/settings.json`, sem segredos, só números/bools (Q11-4) · RNF11-2 texto de custo ao lado do teto ("valores altos = mais chamadas = mais gasto/tempo") · RNF11-3 Config na aba central ao lado de Provedores (Q11-1 DECIDIDO 20/10), mesmo padrão visual · RNF11-4 App.tsx não cresce (RNF global).

**5. Dependências:** de — casa Agir (loop/teto), chat (viewport), padrão da aba Provedores. Para — 13 usa o teto; nenhuma fatia bloqueada.

**6. Limites (NÃO fazer):** nada de anti-loop configurável (fixo) · nada de "aprovar tudo" · nada de teto por ferramenta · nada de limite em R$ (ideia futura) · nada de outras preferências na v1 · nada de modo GOAL (futuro — dono 20/10).

**7. Critérios de aceite:** 1. teto=2 → tarefa para no 2 com cartão "continuar?". 2. Continuar → retoma e conclui. 3. Parar → morre limpo. 4. Recarregar → config persiste. 5. Auto-scroll: no fim desce; lendo acima não puxa. 6. tsc 0 + unit verdes + E2E novos verdes (stub) + roteiro do dono no `08`.

**8. Testes:** unit — validação (faixa, inválido), padrão sem arquivo, roundtrip de persistência, regra dos 120px; E2E (stub 4610) — T1 teto 2 + continuar retoma, T2 negar/parar, T3 F5 persiste, T4 anti-loop intacto (regressão 10); homologação = roteiro do dono.

**9. Riscos:** R11-1 teto alto + nuvem = gasto (mitiga: texto de custo + máximo) · R11-2 "continuar" em loop real (mitiga: anti-loop intacto + cada continuar é decisão humana).

**10. Perguntas abertas:** Q11-1 posição da aba (rec: central, ao lado de Provedores)? → DECIDIDO (20/10): sim, central ao lado de Provedores. · Q11-2 máximo 250 (rec era 200)? → DECIDIDO (20/10): 250 + GOAL fica para DEPOIS (fora da 11; pesquisa 20/10: é MODO, /goal Claude/Codex) · Q11-3 auto-scroll padrão LIGADO (rec: sim, só-no-fim)? → DECIDIDO (19/10): LIGADO. · Q11-4 arquivo `settings.json` (rec: sim)? → DECIDIDO (19/10): sim. · Q11-5 Continuar = +1 orçamento cheio (rec: sim)? → DECIDIDO (19/10): cheio.

## PARTE 2F — SPEC da FATIA 12: DELETE micro (lixeira, arquivo+pasta, cartão) — FECHADA (Q&A 100% em 20/10)

**1. Objetivo:** CRUD completo: o agente exclui arquivos E pastas para a lixeira, sempre com cartão reforçado (decisão do dono 19/10: 1-lixeira, 2-pasta-também, 3-cartão-sim, 4-micro-fatia; DEBT-16).

**2. Entregáveis:** (a) ferramenta `excluir` (Q12-1 confirma o nome) — arquivo ou pasta → lixeira do SO, com contagem de itens; (b) cartão reforçado: "sem desfazer direto" + caminho + o quê vai (prévia p/ arquivo; contagem p/ pasta — Q12-2); (c) território = pasta ativa (igual às outras); (d) anúncio da tool nos 4 canais nativos (Q4b); (e) restaurar = pela lixeira do SO (fora do app).

**3. Requisitos funcionais:** RF12-1 SEMPRE pergunta (Q1a; sem caminho automático) · RF12-2 negar = nada some; o "dono negou" volta à IA · RF12-3 "Permitir na Sessão" NÃO vale para `excluir` (exclusão sempre pergunta, uma a uma) · RF12-4 fora da pasta = recusa honesta, mesmo aprovando · RF12-5 falha da lixeira = erro honesto, nada some pela metade · RF12-6 pasta mostra contagem antes de ir.

**4. Requisitos não-funcionais:** RNF12-1 Windows = Lixeira real; Linux = XDG Trash (`~/.local/share/Trash`); sem lixeira = erro honesto (nunca apagar permanente escondido) · RNF12-2 App.tsx não cresce · RNF12-3 nomes inválidos/`..` = recusa (padrão 10).

**5. Dependências:** de — casa Agir (tools, território, cartão, anúncio), teto da 11 (se existir). Para — 13 estende o cartão; Ferramentas da 14 lista a tool.

**6. Limites (NÃO fazer):** nada de apagar permanente · nada de "esvaziar lixeira" no app (Q12-3; é do SO) · nada de excluir fora da pasta nem por padrão · nada de auto-aprovar exclusão.

**7. Critérios de aceite:** 1. cartão reforçado aparece com contagem. 2. Sem aprovar, nada some (o disco é a régua). 3. Aprovado → some da pasta, aparece na lixeira, restaurável pelo SO. 4. Negado → nada some, IA sabe. 5. Sessão-permitida de escrita NÃO cobre excluir (pergunta igual). 6. `../fora` = recusa. 7. tsc 0 + unit + E2E verdes (stub) + roteiro do dono.

**8. Testes:** unit — mover p/ lixeira (mock), território, nomes inválidos, contagem de pasta, falha = nada some; E2E (stub 4610) — T1 aprovar some+restaura-conferível, T2 negar, T3 sessão-não-cobre, T4 fora-da-pasta, T5 regressão do cartão da 10 (criar/escrever intactos); homologação = roteiro do dono (Windows: Lixeira real).

**9. Riscos:** R12-1 API de lixeira difere por SO (mitiga: camada fina por SO + erro honesto) · R12-2 pasta gigante (mitiga: contagem no cartão + sem desfazer-direto avisado) · R12-3 sandbox sem lixeira (mitiga: XDG no Linux; Windows valida o dono).

**10. Perguntas abertas:** Q12-1 nome `excluir` (rec: sim)? → DECIDIDO (19/10): `excluir`. · Q12-2 pasta mostra contagem sempre + tamanho se barato (rec: sim)? → DECIDIDO (20/10): sim. · Q12-3 "esvaziar lixeira" fica de fora para sempre (rec: sim, é do SO)? → DECIDIDO (19/10): sim, fora.

## PARTE 2G — SPEC da FATIA 13: Terminal-para-o-agente (poderes + segurança) — FECHADA (Q&A 100% em 20/10)

**1. Objetivo:** o agente executa comandos de terminal (a classe de poder da Arena: instalar, compilar, testar, inspecionar) — cada comando com cartão, lista de negação dura e limites honestos. Fatia própria, separada da reforma visual (16) — decisão 19/10.

**2. Entregáveis:** (a) ferramenta `executar` (Q13-1 confirma o nome): comando + cwd=pasta ativa, one-shot, com timeout e teto de saída; (b) cartão tipo-comando (comando + cwd + [Permitir][Negar][Permitir na Sessão]); (c) lista de negação: padrões destrutivos SEMPRE perguntam um a um, mesmo com sessão permitida (Q13-6: `rm -rf`, `del /s`, `format`, `mkfs`, `git clean -fdx`, `DROP`, …); (d) anúncio nos 4 canais; (e) Parar mata o comando junto.

**3. Requisitos funcionais:** RF13-1 cwd sempre = pasta ativa da sessão · RF13-2 timeout 2min (Q13-3 DECIDIDO 20/10: op b) → ao bater, pergunta "continuar aguardando?" em vez de matar · RF13-3 saída limitada a 20 KB de cauda (Q13-4 DECIDIDO 20/10: (a)); resto descartado com aviso "cortada" · RF13-4 negar = nada executa; "dono negou" volta à IA · RF13-5 sessão-permitida vale para comandos comuns, NUNCA para a lista de negação (Q13-5 DECIDIDO 20/10: sim, como na SPEC) · RF13-6 shell = padrão do terminal do app por SO (Q13-2 DECIDIDO 20/10: sim, mesmo do app = padrão da indústria).

**4. Requisitos não-funcionais:** RNF13-1 execução one-shot isolada (não no PTY interativo do usuário) · RNF13-2 sem segredos em log · RNF13-3 App.tsx não cresce · RNF13-4 honestidade: comando vazio/inexistente = erro claro, nunca silêncio.

**5. Dependências:** de — casa Agir (loop, teto da 11), cartão (estendido na 12), pty-server SOMENTE como referência de shell padrão (não executa aqui). Para — Ferramentas da 14 lista a tool.

**6. Limites (NÃO fazer):** nada de shell interativo para o agente (só one-shot) · nada de executar fora da pasta por padrão · nada de auto-aprovar lista de negação · nada de segredos/`.env` (regra da casa) · nada de mexer no terminal visual (é a 16 — área congelada).

**7. Critérios de aceite:** 1. `echo oi` aprovado → saída no chat. 2. Negado → nada executa. 3. `rm -rf x` com sessão permitida → pergunta igual (negação dura). 4. Comando de 3min → aos 2min pergunta "continuar aguardando?" (mata só se o dono mandar parar). 5. Saída gigante → 20 KB + "cortada". 6. Parar no meio → processo morre. 7. tsc 0 + unit + E2E verdes (stub) + roteiro do dono.

**8. Testes:** unit — timeout, teto de saída, negação (padrões), cwd, negar-nada-executa; E2E (stub 4610) — T1 aprovar-executa, T2 negar, T3 negação-com-sessão, T4 timeout simulado (comando curto no teste + teto baixo de teste), T5 regressão cartão da 10/12; homologação = roteiro do dono (Windows real).

**9. Riscos:** R13-1 **shell foge do território** (`cd /`, caminhos absolutos no comando) — NÃO há sandbox real; mitigação honesta: cartão mostra o comando (o humano julga) + negação + cwd fixo + aviso na SPEC. Risco aceito e declarado, não resolvido. R13-2 comando trava saída (mitiga: timeout + Parar) · R13-3 diferença cmd/pwsh/sh (mitiga: shell padrão do app + testes por SO no que der).

**10. Perguntas abertas:** Q13-1 nome `executar` (rec: sim)? → DECIDIDO (19/10): `executar`. · Q13-2 shell = padrão do app por SO (rec: sim)? → DECIDIDO (20/10): sim, mesmo do app. · Q13-3 timeout (rec revisto: op b, 2min+perguntar)? → DECIDIDO (20/10): (b). · Q13-4 saída 20 KB de cauda (rec: sim)? → DECIDIDO (20/10): (a). · Q13-5 sessão-permitida p/ comuns (rec: sim)? → DECIDIDO (20/10): sim, como na SPEC. · Q13-6 lista inicial de negação acima (rec: sim)? → DECIDIDO (19/10): sim.

## PARTE 2H — SPEC da FATIA 14: Barra esquerda + Personalizações + Skills — FECHADA (Q&A 100% em 20/10)

**1. Objetivo:** terminar a barra lateral esquerda como casa das Personalizações (prioridade declarada do dono): entrada "Personalizações" + visão central, com **Habilidades (skills)** funcionais e **Ferramentas** (liga/desliga) na v1. Régua: mockup extraído do VS Code (`arquivo_morto/pesquisa_bruta/personalizacoes/*.html`, 3,1 MB).

**2. Entregáveis:** (a) seção "Personalizações" na lateral esquerda (medidas extraídas do mockup — 1.ª tarefa); (b) visão central com v1 = **Visão geral + Habilidades + Ferramentas** (Q14-1); (c) skills: criar/listar/ligar/desligar/invocar manualmente, formato **SKILL.md-compatível** (Q14-2: pasta + `SKILL.md` + frontmatter nome/descrição); (d) Ferramentas lista as tools reais (as 5 + `excluir` + `executar`) com liga/desliga por grupo; (e) Casas Sessões + Personalizações nascem (D69); Command Center vai com a Pesquisa na 17 (Q14-5 confirma).

**3. Requisitos funcionais:** RF14-1 skill desligada = invisível para o agente · RF14-2 invocar = `/nome` ou clique (manual na v1 — Q14-3 DECIDIDO 20/10; automático é v2 (a) logo após a 14 + Instruções — DECIDIDO 20/10) · RF14-3 frontmatter inválido = skill marcada "com erro" + motivo, nunca quebra a lista · RF14-4 ferramenta desligada = some do anúncio ao modelo · RF14-5 storage: usuário (`~/.agente_window/skills/`) + projeto (`<pasta>/.agente/skills/`) (Q14-4) · RF14-6 medidas da lateral extraídas do mockup viram teste (pixel ±2, padrão da casa).

**4. Requisitos não-funcionais:** RNF14-1 reconstruir nos componentes React (não colar o HTML) · RNF14-2 skill malformada nunca derruba o chat · RNF14-3 App.tsx não cresce (casas novas!) · RNF14-4 PT-BR na UI (padrão `01`).

**5. Dependências:** de — Bairro 1 (sidebar), casa Agir (injetar skill no loop; registro de tools), mockup-régua. Para — 15 prefere esta pronta (§0); MCP/Plugins/Agentes/Instruções/Hooks = fatias futuras (17+), não aqui.

**6. Limites (NÃO fazer):** nada dos outros 4 cartões na v1 (Agentes, Instruções, Hooks, Servidores MCP, Plugins — ficam para 17+) · nada de invocar skill automaticamente na v1 · nada de Command Center aqui (vai na 17, Q14-5) · nada de mexer na coluna direita (é a 15) · nada de loja/galeria de skills.

**7. Critérios de aceite:** 1. Lateral tem "Personalizações" com as medidas do mockup. 2. Criar skill → aparece, liga/desliga funciona. 3. Invocar `/nome` → agente segue a skill. 4. Desligar `excluir` → some do anúncio (testável). 5. Frontmatter torto → "com erro", lista de pé. 6. F5 → tudo persiste. 7. tsc 0 + unit + E2E verdes (stub) + roteiro do dono.

**8. Testes:** unit — parse frontmatter (válido/inválido), descoberta (usuário+projeto), liga/desliga, anúncio filtra desligadas; E2E (stub) — T1 criar→invocar→segue, T2 desligar some do anúncio, T3 skill quebrada não derruba, T4 F5 persiste, T5 medidas da lateral ±2px; homologação = roteiro do dono (com SKILL.md real de exemplo).

**9. Riscos:** R14-1 escopo (7 cartões!) — mitigação: bound da v1 inegociável (§6). R14-2 compat SKILL.md tem detalhes (frontmatter, pastas) — mitigação: subconjunto documentado + skill-exemplo no repo de testes. R14-3 mockup ≠ React 1:1 — mitigação: régua ±2px, não pixel-perfect cego.

**10. Perguntas abertas:** Q14-1 v1 = Visão geral + Habilidades + Ferramentas (rec: sim)? → DECIDIDO (20/10): sim. · Q14-2 formato SKILL.md-compatível (rec: sim)? → DECIDIDO (20/10): sim. · Q14-3 só invocação manual na v1 (rec: sim)? → DECIDIDO (20/10): sim, manual; v2-auto DECIDIDO (20/10): (a) logo após a 14 (+ Instruções junto). · Q14-4 storage usuário+projeto (rec: sim)? → DECIDIDO (20/10): sim. · Q14-5 Command Center na 17 com a Pesquisa (rec: sim)? → DECIDIDO (20/10): (a) mantém na 17 com a Pesquisa.

## PARTE 2I — SPEC da FATIA 15: Janela única de abas (DEBT-12) — FECHADA (Q&A 100% em 20/10)

> Esta SPEC é a **execução** da avaliação completa já feita em `06 §8.7` (D90 — "15 abre por DEBT-12", número pós-D95). Não reavalia: executa.

**1. Objetivo:** fundir os dois modelos de aba numa barra única estilo VS Code: o editor que salva vai para o centro; a coluna direita aposenta.

**2. Entregáveis:** (a) `EditorTab` × `AttachTab` fundidos; (b) editor que salva na aba central (reaproveita `writeFileAtomic` — §2D); (c) Explorer/Busca/SCM roteados para a barra única; (d) aposentadoria: `AuxiliaryBar`/`AttachArea` + `pendingAttachOpen` + Regra 10; máquina de estados do painel 4→2; (e) caso "arquivo aberto + Provedores" deixa de existir por construção (§8.4).

**3. Requisitos funcionais:** RF15-1 editar+salvar sem F5 (critério-mãe) · RF15-2 abas irmãs alternam sem perder estado · RF15-3 Provedores/Browser/Changes como abas centrais (posicionamento §8.3/D88 preservado) · RF15-4 F5 restaura abas e modos.

**4. Requisitos não-funcionais:** RNF15-1 repontar 31 unit + 11 E2E que tocam o anexo; obsoleto → quarentena COM registro (nunca apagar em silêncio — D79) · RNF15-2 App.tsx DIMINUI (meta: gestão de abas sai dele) · RNF15-3 esquerda (14) intacta.

**5. Dependências:** de — 14 pronta (preferência §0); §8.7 (avaliação). Para — 16 usa o centro estável; 17 usa abas para Pesquisa/Command Center.

**6. Limites (NÃO fazer):** nada da lateral esquerda (é a 14) · nada de terminal (é a 16) · nada de ressuscitar a coluna direita · nada de Net Promoter de abas (sem métrica subjetiva).

**7. Critérios de aceite:** 1. editar+salvar sem F5. 2. Arquivo + Provedores como abas irmãs. 3. F5 restaura. 4. 31+11 testes repontados/quarentenados com registro. 5. tsc 0 + suítes verdes (baseline sem as quarentenas) + roteiro do dono.

**8. Testes:** unit — fusão de abas, roteamento, persistência, máquina 4→2; E2E — fluxos de aba irmã, F5, regressão Provedores/Browser/Changes; quarentenas com registro D79; homologação = roteiro do dono.

**9. Riscos:** R15-1 churn de testes (31+11) — mitigação: repontar em onda própria antes do código (padrão D74). R15-2 regressão abrir/salvar — mitigação: E2E de editar+salvar sem F5 como trava. R15-3 arquivo+Provedores ressurgir — mitigação: impossível por construção + teste que prova.

**10. Perguntas abertas:** Q15-1 §8.7 continua válida pós-D95 (rec: sim, só o número mudou)? → DECIDIDO (20/10): sim, vale. · (Sem outras — avaliação completa.)
