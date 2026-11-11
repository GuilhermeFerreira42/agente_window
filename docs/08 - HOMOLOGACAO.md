# Roteiro de homologação da M7 — aceite pendente (11/11/2026)

1. Em uma tarefa sintética interrompida, abra **Execução interrompida: revisar tarefa**. Confira resultados conhecidos e incertos, aprovações históricas, pasta, Git e referências.
2. Um resultado mutável incerto deve impedir **Retomar planejamento**. Inspecione os efeitos antes de pedir uma tarefa nova.
3. Quando a revisão permitir, confirme **Retomar planejamento**. A resposta deve planejar a continuidade. A revisão e a abertura da conversa não devem executar ferramentas nem recuperar autorização antiga.

---

# Roteiro de homologação da M6 — aceite pendente (10/11/2026)

1. Registre um fato sintético em um chat. No compositor, use **Recuperar com o agente** e complete a pergunta após **/historico**.
2. Confira o cartão de consulta e a referência à mensagem original. Repita com um fato presente somente em outro chat e confirme que ele não aparece.
3. Confira que uma consulta histórica não abre aprovação de arquivo nem executa comando. Para sair do modo de consulta, envie um novo turno sem o prefixo.

---

# Roteiro de homologação da M5 — aceite pendente (10/11/2026)

1. Em uma pasta de teste, abra **Memória do projeto** e grave uma decisão sem dados sensíveis. Confira a pasta, a origem e o estado vigente.
2. Abra outro chat na mesma pasta e confira a decisão. Revise o texto com um motivo. A revisão anterior deve aparecer como substituída.
3. Abra um chat de outra pasta e confira o isolamento. Volte ao projeto original, exporte a memória e exclua a entrada sintética. Reabra o painel e confirme que as duas revisões sumiram.

---

# Roteiro de homologação da M4 — aceite pendente (10/11/2026)

1. Abra um chat com uma expressão antiga conhecida. Use **Buscar no histórico** no cabeçalho e pesquise pela expressão.
2. Abra o resultado. O foco deve ir para a mensagem original e permitir ler as mensagens vizinhas. Repita depois de compactar o contexto.
3. Troque de chat e pesquise pela mesma expressão. A busca deve exibir somente resultados do chat que está aberto.

---

# Roteiro de homologação da M3 — aceite pendente (10/11/2026)

1. Em uma sessão descartável, complete três turnos. Registre uma decisão clara no primeiro.
2. Use **Compactar contexto** ao lado do indicador e confirme a chamada ao modelo. Aguarde **Contexto compactado**.
3. Recarregue e confira se todas as mensagens originais continuam disponíveis. Pergunte qual foi a decisão inicial. Depois de mais um turno completo, repita a compactação para testar a atualização do checkpoint.

---

# Roteiro de homologação da M2 — aceite pendente (10/11/2026)

1. Abra um chat em uma pasta de teste e peça ao agente para ler um arquivo sem dados sensíveis. Confira o cartão e aguarde a resposta.
2. Recarregue o Agent Window. Confirme que a conversa e o estado do cartão voltaram. Pergunte o que foi feito no turno anterior e confira que a ferramenta anterior não é executada automaticamente pela recuperação do histórico.
3. Em modo Manual e em uma pasta de teste, negue uma ferramenta que apresente um cartão de aprovação. Confira o estado do cartão depois de recarregar. Uma decisão antiga não concede permissão a um novo pedido.

---

# Roteiro de homologação da M1 — aceite pendente (10/11/2026)

1. Abra um chat novo, escolha a pasta e digite um rascunho. O compositor deve mostrar **Contexto não medido**.
2. Envie uma mensagem a um provedor que retorne contagens, como o Ollama local. Confira no indicador os tokens de entrada. Passe o mouse sobre ele para ver o modelo efetivo, a iteração e a saída reportada.
3. Em **Provedores → Ajustes avançados**, selecione o modelo padrão, edite **Contexto (tokens)** para o limite efetivo do modelo e salve. Se o campo já exibir esse número sem vínculo confirmado, apague e redigite o valor. Após outro envio, confira a porcentagem e a origem da janela nos detalhes. Os alertas começam em 75% e 90%.
4. Abra outro chat ou selecione explicitamente outro modelo. A medição do chat ou modelo anterior deve ficar oculta. Recarregue a página e confirme que as mensagens continuam acessíveis. O indicador volta a **Contexto não medido** até o próximo envio.

---

# Registro de homologação — Fatias 14 e 15 (10/11/2026)

O proprietário informou a homologação das **Fatias 14 e 15**. A conversa registra o aceite das fatias, sem detalhar um novo placar por cenário ou a revisão exata usada no aceite. Os roteiros datados abaixo servem como referência de revalidação. A retirada física E15-d permanece uma decisão separada. A auditoria técnica da base atual fica em 09.

---

# Inspeção D185 — barra lateral direita e Monaco (09/11/2026)

Use **Sidebar fixture session** em um perfil de validação.

1. Expanda uma pasta no Explorer. Confira a distância entre guia, ícone e nome. Abra o menu de três pontos do cabeçalho e alterne Open Editors. Em uma pasta descartável, experimente copiar e colar logo após selecionar o destino.
2. Abra Search e confira se o menu de filtros começa fechado. Abra e feche os detalhes. Aplique um filtro e abra um resultado no editor.
3. Abra Source Control em um repositório descartável. No Graph, confira as referências locais e remotas e use o botão que localiza o commit atual. Abra um arquivo alterado, confira o caminho acima do diff e pressione Alt+Z com o Monaco em foco para alternar a quebra de linha.
4. Arraste a lateral direita e restaure com duplo clique. Com um arquivo aberto, repita na divisória entre o chat e o Monaco e confira a divisão 50/50. Faça também com o Split Editor aberto.
5. Abra e feche Personalizações pela lateral esquerda. Confirme que as abas e o conteúdo aberto continuam disponíveis.

Aceite humano pendente.

---

# Inspeção D184 — barra lateral direita (09/11/2026)

Use a sessão descartável **Sidebar fixture session** no perfil de validação. Salve rascunhos antes de recarregar sua sessão real.

1. Arraste a divisória direita, recarregue e restaure a largura com duplo clique.
2. Reordene, expanda e redimensione as seções do Explorer. Confira a persistência e o menu conforme o elemento selecionado.
3. Pesquise, aplique os filtros, abra um resultado e substitua texto em arquivos descartáveis. Confira a proteção de uma aba suja.
4. Abra o diff de um arquivo no Source Control e alterne linha e lado a lado. Exercite stage, unstage, branch, merge e operações em um remoto descartável.
5. Escreva no workspace pelo terminal e confira a atualização da árvore, busca e alterações Git.

O roteiro detalhado e as capturas estão no relatório operacional. Aceite humano pendente.

---

# Inspeção D183 — lateral e Personalizações (09/11/2026)

Salve rascunhos antes de recarregar o perfil de inspeção.

1. Abra a busca na lateral. Confira o foco, filtre pelo título de uma sessão e feche com Esc. No botão de opções, teste o agrupamento por workspace, os filtros de provedor/estado e o recolhimento dos grupos.
2. Abra cada categoria de Personalizações pela lateral. Alterne dentro do modal, confira a busca independente, maximize/restaure e use a alça inferior direita. Feche por Esc ou pelo X e confira o retorno do foco.
3. Em Habilidades, abra Nova habilidade. Digite linhas na Instrução e confira crescimento e rolagem após o limite. Alterne categoria e volte para conferir o rascunho enquanto a janela está aberta.
4. Reduza a janela e alterne o tema. Confira a navegação horizontal no modal estreito e a rolagem do conteúdo. Compare a referência e o candidato no relatório.

O aceite humano está pendente.

---

# Inspeção vigente — D182, pacote RF-A..G (08/11/2026)

Salve seus rascunhos antes de recarregar 5174. Confira um item por vez em arquivos descartáveis:

1. Lateral principal: Sessões/contagem/Novo, Chats, grupos reais e filtros no botão de ajustes; Personalizações recolhe e mostra oito categorias.
2. Clique em Hooks/Agentes/MCP: deve abrir o mesmo modal e informar indisponibilidade. Habilidades e Ferramentas usam dados reais. Troque de categoria sem fechar; maximize/restaure, Tab/Shift+Tab, Esc e X. Chat, abas e texto devem voltar com foco coerente.
3. Digite html, .html ou *.html no Quick Open (clique no caminho ou Ctrl+P); confira homônimos pelos caminhos, setas/Enter/Esc e Ctrl+Shift+P. F1 mantém apresentação aprovada.
4. Pasta ao lado do caminho: digite caminho absoluto do SERVIDOR, válido e inválido. O inválido conserva a pasta anterior; o válido atualiza caminho/Explorer e persiste após F5. Seletor gráfico é adicional.
5. Voltar/Avançar da barra principal navegam entre chats, Configurações e Search/Explorer sem atuar no Browser embutido. Drafts devem permanecer. A marca Agent Sessions abre o seletor de sessões.
6. Search reabre expandido. Reordene cabeçalhos Explorer e confira F5; Open Editors fecha a aba real com proteção dirty. Timeline filtra e informa quando não há correspondências.
7. Repita ocultar/restaurar, maximizar, várias divisões, preview Markdown e Alt+Z. X principal oculta tudo sem apagar rascunho; X da aba fecha. Salvar/Não salvar/Cancelar devem decidir apenas alterações reais.

Ctrl+W físico pode ser reservado ao Chrome; não é homologado pelo evento automatizado. Linux headless e picker nativo continuam sem validação real nesta rodada. O candidato e a comparação visual estão disponíveis, mas o aceite da Fatia 15 é exclusivamente seu; E15-d física permanece separada.

---

# Inspeção vigente — D181, 08/11/2026

Salve seus rascunhos e recarregue 5174. Com arquivos descartáveis, confira um item de cada vez:

1. X principal oculta toda a coluna; chat ganha largura. Mostrar editor devolve abas e texto; abrir arquivo pelo Explorer também revela.
2. Barra superior mostra caminho (inteiro no tooltip); clique busca por nome ou *.html. Menu separado permite digitar pasta/procurar pasta.
3. Pesquisa lateral distingue conteúdo de nome e abre Replace/incluir/excluir. Atualizar, limpar e recolher/expandir devem agir nos resultados.
4. Abrir pesquisa no editor copia a consulta e produz resultados reais; editar ali não altera consulta lateral. Resultado abre arquivo.
5. Habilite Open Editors pelo menu de cabeçalho; fechar uma linha fecha a aba verdadeira. Dirty exige Salvar/Não Salvar/Cancelar.
6. Arraste seções do Explorer e recarregue para conferir ordem. Outline ordena/recolhe símbolos reais; Timeline atualiza e filtra histórico disponível.
7. Personalizações no rodapé esquerdo recolhe/expande e abre Visão geral/Habilidades/Ferramentas. Navegação mostra uma seção por vez; criar/ligar/desligar permanece real.
8. Confira novamente maximizar, divisões sucessivas, breadcrumbs e preview Markdown. F1 mantém visual aprovado; Alt+Z alterna quebra visual.

Ctrl+W pode ser reservado pelo navegador; fechar pela UI/paleta é o caminho disponível. Pesquisa de arquivo não troca a pasta sem confirmação. F5 não preserva rascunhos. Esta lista é para seu aceite, ainda não é homologação da Fatia 15.

---

# Inspeção vigente — D180 (08/11/2026)

Salve eventual rascunho antes de recarregar a página para carregar todos os componentes atualizados. Confira a largura real do texto ao maximizar e sua altura ao restaurar. Use o X da barra principal: todo o conjunto de editores deve sumir, com abas conservadas; Mostrar editor devolve as mesmas vistas. O X dentro de um grupo fecha aquele grupo.

Clique quatro vezes em Dividir: devem existir cinco vistas. Foque um grupo e abra outro arquivo. Edite em duas vistas do mesmo arquivo, salve e confira o disco; ocultar/reabrir conserva rascunhos, e F5 conserva apenas o salvo. Feche grupos até sobrar um: fechar a última vista dirty deve pedir decisão.

Abra Markdown e use o botão de livro para o preview. Na faixa abaixo das abas, clique no nome do arquivo ou da pasta para navegar; o tooltip traz o endereço inteiro. Em TypeScript, navegue até uma função pelo botão de símbolos. Arquivo BAT sem provedor pode mostrar apenas caminho. O F1 fica como aprovado visualmente. Esta revisão continua aguardando seu aceite da Fatia 15.

---

# Inspeção dirigida do editor — D179 (08/11/2026)

Ainda depende do seu aceite. Abra um arquivo e divida: o mesmo texto deve aparecer nos dois lados, com cursores independentes. Edite, feche uma cópia e confira o rascunho na outra; ao fechar a última, confira Salvar/Não Salvar/Cancelar. Feche o principal e confira a promoção do painel restante, sem área vazia.

Em Markdown ou texto, use o botão de visualização; no Markdown, Ctrl+Shift+V também abre o preview. Confira edição e preview lado a lado. Recolha o editor e maximize: deve aparecer ampliado. Abra F1 fora do código e compare a paleta compacta; dentro do código permanece a paleta nativa do Monaco. Ctrl+K Ctrl+S mostra a tabela pesquisável. Abra um atalho Windows: deve aparecer aviso de binário, sem edição como texto. Alt+Z continua alternando a quebra visual.

Use arquivos descartáveis para testar. F5 restaura só conteúdo já salvo. As ressalvas de suíte integral e a decisão separada sobre E15-d permanecem; testes técnicos não encerram a Fatia 15.

---

# Complemento para inspeção — atalhos (08/11/2026)

No arquivo de código, Alt+Z deve alternar a quebra visual; F1 abre a paleta, e Ctrl+K seguido de Ctrl+S mostra os atalhos. Conferir também abrir/salvar/fechar pelo teclado e foco dos dois grupos. Salvar como pede destino novo e conserva o arquivo se a gravação falhar. Recursos de linguagem dependem do provedor; atalhos reservados podem ser tomados pelo navegador. A correção e seus testes não representam sua homologação da Fatia 15.

---

# Situação de aceite — Fatia 15 (08/11/2026)

**Não homologada.** O candidato corrigido passou pelos fluxos dirigidos da auditoria; a suíte integral Windows continua com 36 falhas e 30 ignorados classificados em 09/relatório. A decisão humana é exclusivamente do dono. Não encerrar a Fatia 15 nem avançar o roadmap por inferência dos testes focais.

Usar o roteiro existente de homologação da Fatia 15 em perfil descartável. Conferir fechamento limpo imediato, as três escolhas do dirty, erro de Save, divisão com dois dirty e preservação de rascunhos ao recolher/restaurar. F5 restaura conteúdo salvo; salvar antes de recarregar. Provedores/Config são abas; Personalizações mantém a tela R-092. E15-d exige decisão expressa separada para remover fisicamente a rede de rollback.

---

# 08 - HOMOLOGACAO (do humano)

> **D140 — divisão de responsabilidades (04/11/2026):** a Arena/Codex executora pode conferir critérios técnicos e **avançar para a fatia seguinte** com evidências e pendências honestas. Isto **não** é homologação funcional humana; somente o dono aceita a V1.0 final e qualquer decisão reservada de produto/segurança. Os roteiros manuais permanecem disponíveis para execução posterior no Windows, e itens não verificados nunca viram “passou”. Detalhe da delegação em `05` D140.


> **Para você, não para a IA.** Aqui não entra comando de terminal nem detalhe de teste — isso é o `09`. Parte A = o que cada fatia precisa provar (antigo `07`). Parte B = quando uma entrega está "pronta" (antigo `08`).
> Regra de sempre: **homologação funcional = você no Windows real (5174), com prints/vídeo**. Teste verde da IA não homologa.
> **D91/D99:** uma validação real de provedor sem ambiente/acesso/autorização seguros será registrada como bloqueada/não executada; isso não substitui nem transfere sua responsabilidade de homologação funcional. Regras operacionais e de credenciais ficam no `09`.

## Como homologar uma fatia em 5 passos
1. Peça o servidor 5174 de pé e abra no Windows.
2. Confira os itens da Parte A da fatia (e as medidas que a IA citou no `03`).
3. Compare com o VS Code real (régua: vscode.dev / 8080 / prints em `arquivo_morto/engenharia_reversa/`).
4. Rode o seu roteiro manual (F5, trocar sessão, maximizar/restaurar, terminal, Search, SCM, drag & drop).
5. Diga "homologada" ou liste o que falhou. A IA registra no `03` e no `07`.

---

## Avaliação comparativa D101 — evidência não equivale a homologação

A diretriz de paridade funcional/desempenho aprovada em D101 não declara que o produto já seja paritário ou superior, nem substitui a homologação humana de uma fatia. Para incluir uma alegação comparativa no pacote de homologação de um cenário CAP/D100, apresentar o protocolo e os critérios pré-definidos, referência e versões/commits, ambiente/configuração, fixture e passos repetíveis, resultados brutos por rodada, desvios/limitações e a separação entre desempenho do modelo/provedor e overhead do Agente Window (`09 §3.10`). Critérios quantitativos só entram na SPEC depois de medições; não se inventam alvos numéricos nem se extrapola um cenário para a V1 inteira.

Classificar cada critério/cenário como **superior**, **equivalente**, **inferior**, **inconclusivo**, **não testado** ou **não comparável**, com evidência que sustente o estado. Não omitir falhas/rodadas nem tratar teste automatizado com stub como validação de provedor real. O responsável avalia a evidência e a conclusão funcional; sem avaliação/reprodução suficiente, não marcar paridade como aceita. Relatos históricos não reproduzidos permanecem identificados como relatos. Esta seção não cria critério de aceite retroativo para Fatias 07–12, não reabre homologações históricas e não inicia D98.

**Registro histórico da auditoria D102–D117 e snapshot pré-D121:** decisões não eram resultados de teste; o registro integral permanece para rastreabilidade em `03`/`06`. **Estado corrente D119/D120/D121/D122 (2026-10-29):** nenhuma F1–F5-B está homologada. D122 substitui em F5-B qualquer exigência de `verified`/canary: Agir inicia o par habilitado diretamente e rejeição real aparece como erro legível, sem fallback; detalhes e limites em `05`/`06`/`09`. D120 permanece apenas como histórico. F1 mantém local-only e autoridade/grants server-side; unit 6/6, sem E2E/preview/Windows. F2 agora usa paths absolutos ou relativos ao workspace sob permissões normais do SO, com limite TOCTOU documentado; não promete contenção física contra processo malicioso da mesma conta. F3 tem testes focados, sem homologação E2E. F4: criar exclusivo; escrita exige leitura e compara fingerprint; conflitos observáveis recusam, sem CAS universal; hardlinks múltiplos recusados. F5-A mantém Perguntar/Planejar sem mutações e modo Agir/Edit registrado server-side; F5-B inicia diretamente o par habilitado sem prova/canary, aceita resposta sem tool call e mostra rejeição HTTP real sem fallback; nenhuma credencial/provedor real. Linux local foi testado; Windows e homologação humana pendentes.

## Validação futura dos achados F1–F8 (planejamento; não é homologação atual)

Esta lista orienta investigação e SPEC futura; não afirma que os riscos ocorreram em runtime nem que qualquer critério tenha passado. A execução depende de autorização por escopo e critérios previamente acordados. Homologação permanece com o dono.

| Achado | Demonstração humana futura mínima | Estado agora |
|---|---|---|
| **F1 — autoridade/workspace** | Solicitação adulterada não muda pasta, sessão ou permissão; acesso ao app/API restrito ao computador local; operação autorizada pelo servidor. | Boundary/grants e contexto server-side implementados; commit `b2c49b4` endurece Fetch Metadata/Origin; unit 6/6 e typecheck passaram. E2E/preview, Windows e aceite humano não verificados. |
| **F2 — caminhos/escopo** | Demonstrar leitura e operações permitidas em paths relativos e absolutos solicitados, dentro/fora do workspace, respeitando permissões do SO; registrar limites de symlink/reparse/TOCTOU; sem declarar sandbox física. Windows real precisa de roteiro próprio. | D121 substitui contenção obrigatória ao workspace: Node.js direto, workspace como base relativa, caminhos externos autorizados sob permissões normais. Acesso externo, criação/edição em fixtures Linux isoladas cobertos por testes. Risco de processo malicioso da mesma conta aceito e documentado; Windows e homologação humana pendentes. |
| **F3 — cancelamento** | Parar invalida cartões pendentes; resposta posterior não executa nem retoma. | `runId`/geração, invalidação e claim único permanecem; rotas/Agir testados; streaming/parada 3/3 após atualizar o mock da nova rota de seleção de modo. D121 não altera F3. Sem homologação/E2E browser ampla. |
| **F4 — colisão/falha** | `criar` não substitui destino existente; `escrever` exige leitura prévia e detecta conflitos observáveis; falha não deixa gravação parcial; modos Ask/Plan não mutam e Agent/Edit evitam confirmações repetitivas. | `criar` exclusivo e colisão testados; escrita com fingerprint/hash e temp+rename testada; mudança concorrente observável recusa sem alteração; hardlinks múltiplos recusados. Não há CAS universal contra processo externo. Testes Linux locais; Windows e homologação pendentes. |
| **F5 — modos/modelo** | `agent/edit→Agir`, `ask→Perguntar` read-only, `plan→Planejar` sem escrita/efeitos; seleção explícita é par exato; Auto resolve `ativo+modelo` no início do run e mostra o alvo; disable bloqueia a próxima chamada do mesmo run, sem fallback. Apenas `verified` válido habilita Agir; `declared` é opcional por D120. | F5-A enforcement e F5-B catálogo/seleção têm implementação/testes focados. Nenhum provedor/credencial real foi usado; Windows/E2E e homologação pendentes. |
| **F6 — contexto/anexo** | Estimativa não se apresenta como medição; fica claro o conteúdo realmente enviado ao modelo. | Não validado. |
| **F7 — reinício/retomada** | Estado/efeitos são conciliados após reinício; sem execução duplicada nem permissão expirada. | M7 somente planejamento. |
| **F8 — limites/segredos** | Busca/leitura têm limites e cancelamento observáveis; credenciais não vazam em logs/respostas; rota de revelação avaliada. | Cobertura incompleta; não auditada integralmente. |

A revisão estática original de F1–F8 e as seis SPECs aprovadas por D119 constam em `06`. Esta tabela continua sendo roteiro de validação/aceite, não declaração de conformidade: F1 tem evidência automatizada parcial registrada em `09`, mas seus critérios completos não foram aprovados e nenhuma CAP foi homologada nesta missão. D119 autoriza apenas F1–F4/F5-A/F5-B; F6–F8, D98, Fatias 13–20 e iniciativas M continuam fora do escopo. Aceite futuro não reabre homologações históricas 07–12; resultados de correções devem ficar no escopo autorizado correspondente.

## Gate humano de rastreabilidade CAP-01–CAP-20 e cinco cenários D100 (planejamento, atualizado em 26/10/2026)

A tabela de cobertura e lacunas fica **somente no `06`** (“Matriz de rastreabilidade da visão V1.0”); a descrição oficial das CAP e dos cinco cenários continua no `02`. **Este bloco orienta o aceite humano futuro e não reabre as Fatias 07–12.**

Antes de marcar uma capacidade ou cenário como **pronto**, confira: (1) SPEC e destino aprovados; (2) demonstração da tarefa real; (3) comportamento com erro, recusa e cancelamento; (4) registro de evidências e limitações; (5) sua aprovação explícita. UI semelhante à referência, tool anunciada ao modelo e teste unitário isolado não substituem demonstração end-to-end nem sua homologação.

| Cenário da visão | Demonstração humana mínima futura | Situação hoje |
|---|---|---|
| **1. Projeto grande** | Abrir um repositório representativo; pedir mapa arquitetural com caminhos/fontes e verificar precisão, responsividade e escala | Critérios e SPEC integrada pendentes |
| **2. Implementação de função** | Solicitar tarefa com SPEC, revisar plano e permissões, conferir mudanças, testes, Git e relatório honesto | Integração de tools/planner/Git/testes pendente |
| **3. Continuidade** | Interromper tarefa, reiniciar aplicação e verificar o estado físico antes de retomar, sem repetir operação destrutiva | M5/M6/M7 e contrato de retomada pendentes |
| **4. Extensibilidade** | Configurar integração permitida, conferir compatibilidade, permissões e remoção | Fatia 14 cobre skills v1, não plugins/MCP completos |
| **5. Colaboração longa** | Conduzir requisitos→decisões→documentação→execução→testes→continuidade em várias sessões | Cenário transversal ainda sem teste de aceite final |

**Resultado de avaliação:** para cada CAP e cada cenário, registrar evidências separadas e estado *não testado*, *parcial*, *aprovado no escopo da SPEC* ou *bloqueado*. Para qualquer alegação de paridade/superioridade D101, usar os seis estados técnicos definidos no `09 §3.10` e a seção de avaliação comparativa acima. Não marcar as 20 CAP como homologadas por inferência de Fatias 07–12.

## Homologação FATIA 07 — 2026-10-15 (declaração do dono, com evidências)
- **Entregas homologadas:** DEBT-09 (`a69137d`) · DEBT-06 caminho C (`62cf055`) · DEBT-04 (nada a expurgar) · onda 1 da faxina D74 (`9985b9e`) · quarentena pontual dos 2 E2E da Aux (`e182960`).
- **Evidências (externas ao repo, em `validacao_fatia07/`):** `sonda_01_debt09.cjs` · `sonda_02_debt06_landing.cjs` · `sonda_03_debt06_sessao.cjs` (PID novo + `readlink /proc/<pid>/cwd` = pasta nova) · `sonda_05_aux_bar.cjs` + prints `01a`…`05d` (arquivos removidos na limpeza de 21/10, por ordem do dono).
- **Números na homologação:** typecheck 0 · unit 730✓/12✗ (pré-existentes)/16 skip · E2E sem regressão (A/B em `e02e486`).
- **Limitações aceitas com a homologação:** PTYs órfãos até a FATIA 12 (pré-D95 = 16) · 5 E2E vermelhos pré-existentes (`09 §2.6`) · sintoma original do DEBT-06 não reproduzido no estado anterior sob as condições testadas.
## Homologação FATIA 08 — 2026-10-17 (declaração do dono) ✅
**Palavras do dono (canônicas):** *"vamos concluir a fatia número 8. Eu já homologuei ela, já tá funcionando corretamente"* (registro **D89**, `docs/05`).
**O que essa homologação cobre:**
- os **10 critérios de pronto** da SPEC (`docs/06` PARTE 2B §3) — todos verdes na prova automatizada;
- a **validação do dono com serviço REAL** (15/10, vídeo): **Ollama local** ("Conexão aprovada… 209 ms e 5 modelos") e o **genérico apontando para um pool LiteLLM** ("…158 ms e 4 modelos"), **chave sempre mascarada**, nenhum erro;
- as correções abertas naquele momento — **A1** (a tela de sessão nova não sobe mais com o Provedores aberto) e **D88** (o modo do editor é lembrado) — implementadas em 17/10 com trava de geometria (`e2e/fatia08_modo_abertura.spec.ts`, 4/4).
**Pendências que NÃO bloqueiam a homologação (viram refinamento):**
- **D85** — número de contexto/tokens que o dono quer como padrão (decisão dele; hoje os valores gigantes estão digitados de propósito);
- **A4** — "copiar o visual do LiteLLM" (estudo futuro, sem fatia definida).
**Roteiro do dono (PARTE C) — cumprido:** configurar provedor real → Testar conexão → salvar → reabrir e conferir a chave mascarada (feito no vídeo de 15/10).

## Homologação FATIA 09 — 2026-10-18 (declaração do dono) ✅
**Palavras do dono (canônicas):** *"09 homologada. começe a 10"* (registro **D92**, `docs/05`).
**O que essa homologação cobre:**
- os critérios da SPEC (`docs/06` PARTE 2C) — verdes na prova automatizada: tsc **0** · unit **813✓ / 12✗ pré-existentes / 16skip** · E2E `conversa_fatia09` **5/5 em 4 rodadas** · contrato anti-trapaça **6/6**;
- a **validação do dono com serviço REAL** (17/10, 2 vídeos): **Ollama local** (`gemma4:31b-cloud`) — no 1º vídeo o app recusou com o erro honesto *"Nenhum provedor está ativo"* porque a bolinha "usar este provedor no chat" não estava marcada (comportamento correto do sistema); no 2º vídeo, com a bolinha marcada, a conversa funcionou de ponta a ponta (resposta em pedaços, Markdown completo, Parar, rodapé com o modelo efetivo);
- os achados desse teste viraram dívidas anotadas (**DEBT-14/DEBT-15**), sem bloquear a homologação.
**Roteiro do dono (PARTE D) — registrado como roteiro de referência da fatia.**
**Fase ativa passa a ser a FATIA 10 — Agir** (SPEC: `docs/06` PARTE 2D).

## Roteiro histórico de Homologação — FATIA 10: AGIR — ✅ HISTORICAMENTE HOMOLOGADA (D94, 19/10)
> **Nota D121:** o roteiro e a homologação D94 permanecem como registro histórico e não são reabertos. A recusa de `../fora.txt` abaixo refletia o contrato de território D93, substituído para esta missão por D121. Para F1–F5-B atual, valide caminhos externos apenas com fixtures temporárias e a matriz vigente em `06`; não use documentos pessoais nem declare homologação automática.
Pré-requisitos (Windows): app na 5174 · provedor/modelo habilitado em fixture. D122: envie Agir diretamente, sem pré-requisito de prova/canary; valide anúncio normal de ferramentas. Uma resposta sem tool call deve concluir. Se o serviço rejeitar a API, confira o erro legível retornado e confirme que não houve troca/fallback e que nova tentativa não fica previamente bloqueada. Não use credenciais reais neste roteiro sem autorização própria.
1. **Conversa normal (§6.1):** mande "oi" — responde como na 09, sem cartão.
2. **O teste final do MVP (§6.2/3):** numa sessão com **pasta real** (interruptor no topo: digite o caminho da pasta e Enter), mande **"Crie o arquivo teste-homologacao.txt com o conteúdo: feito pela fatia 10"** → cartão com caminho + prévia + 3 botões. **Antes de permitir, confira no Explorador: o arquivo NÃO existe.** Clique **Permitir** → cartão "Feito" e o arquivo **existe** com o conteúdo exato.
3. **Negar (§6.4):** "crie o arquivo nao-quero.txt" → cartão → **Negar** → cartão "Negado por você"; a IA segue sabendo do "não" e **nada é escrito**.
4. **Permitir na Sessão + F5 (§6.5/6):** "crie s1.txt" → **Permitir nesta sessão** → "crie s2.txt" → **não pergunta** (escreve direto). Aperte **F5** → "crie s3.txt" → **ainda não pergunta** (a permissão sobrevive ao F5). Conversa NOVA volta a perguntar.
5. **Território (§6.7):** "crie o arquivo ../fora.txt" → mesmo aprovando: recusa honesta ("Fora da pasta…") e **nada fora da pasta**.
6. **Anti-loop (§6.8):** se o modelo repetir a MESMA chamada 3× seguidas, aparece o aviso de loop e ele é parado (raro com modelo bom; coberto por teste automatizado).
7. **Parar (§6.9):** peça uma ação e clique **Parar** no meio — tudo morre limpo, status honesto na tela.
8. **F5 no meio de um cartão aberto:** cartão pendente vira **expirado** na volta (a execução morreu com a página — nada fica pendurado).

**HOMOLOGADA (D94, 19/10):** declaração do dono (*"vou considerar que já está homologado... vou confiar nos testes que você fez"*) — cobre a bateria (tsc 0 · E2E 5/5 · 15/15) + passo 2 em uso real (CRUD, Nemotron via LiteLLM, cartões aprovados). **Registro honesto:** passos 1, 3, 4, 5, 7, 8 **não** foram executados manualmente. MVP FECHADO.

**Homologado = o dono declara** (padrão das fatias 07–09).

## Roteiro de Homologação — FATIA 11 (teto + continuar + Config) — ✅ HOMOLOGADA (D96, 21/10)
> O que a IA já provou sozinha: typecheck 0 · unit 900✓/12✗ pré/16skip · E2E `teto_fatia11` 2/2 · régua 08+09+10+11 18/18. Abaixo = o que só você prova, no Windows real (5174).
1. **Aba Config:** Conta (canto superior direito) > Configurações → aba abre no centro. Confira: slider + número do teto (1–250, vem 25), interruptor "Rolagem automática" ligado, botão Salvar + aviso "Configuração salva". Mude o teto para **2**, salve, dê **F5**, reabra — tem que continuar 2.
2. **Cartão continuar:** com teto 2, peça ao agente algo que use várias ferramentas (ex.: "liste os .txt e me resuma cada um"). Tem que aparecer o cartão **"Limite de voltas — Pausado no limite"** com [Continuar (+2)] [Parar]. Clique **Continuar** → ele trabalha mais 2 voltas e pausa de novo. Clique **Parar** → "Parado por você", sem erro.
3. **Auto-scroll:** numa resposta longa, role para cima no meio do streaming → o chat NÃO pode puxar você de volta. Fique no fim → acompanha sozinho. Desligue o interruptor na Config → nunca acompanha.
4. Volte o teto para **25** e salve (padrão de fábrica).

**HOMOLOGADA (D96, 21/10):** palavras do dono: *"fiz os testes e parece que foi resolvido. acho tbm ja esta homologada a fatia 11."* Cobre a fatia (teto + Continuar + Config + auto-scroll) + as 7 correções pós-11 (C1–C7), incluindo o fix do "não abre arquivo" (C7) testado por ele no Windows. Prova automatizada: tsc 0 · unit 906✓/12✗ pré/16skip · régua 18/18 · trava C7 3/3. Pós-homologação: conversar o ajuste do teto na Config (pedido dele).

## Roteiro de Homologação — FATIA 12 (excluir para a lixeira) — ✅ HOMOLOGADA (D97, 21/10)
> O que a IA já provou sozinha: typecheck 0 · unit 929✓/12✗ pré/16skip · E2E `excluir_fatia12` 5/5 (lixeira real do Linux, com bilhete) · régua 08+09+10+11+12 23/23. Abaixo = o que só você prova, no Windows real (5174) — aqui a lixeira é a **Lixeira real do Windows**.
1. **Cartão reforçado:** numa sessão com **pasta temporária descartável criada exclusivamente para este teste**, crie `alvo-homolog.txt` (conteúdo sintético) e mande o agente excluir (`"exclua o arquivo alvo-homolog.txt"`). Tem que aparecer o cartão **"Excluir (lixeira)"** com o caminho + começo do conteúdo + aviso **"Sem desfazer direto"** + só 2 botões (**sem** "Permitir na Sessão").
2. **Aprovado vai para a Lixeira:** clique **Permitir** → cartão "Feito". Confira: o arquivo **sumiu da pasta** e **apareceu na Lixeira do Windows** (abra a Lixeira e ache ele lá, com o conteúdo intacto).
3. **Restaurar é pelo Windows:** na Lixeira, clique com o botão direito no arquivo → **Restaurar** → ele **volta para a pasta**. (Restaurar pelo app não existe — é de propósito.)
4. **Negar:** mande excluir outro arquivo → **Negar** → cartão "Negado por você" + "nada sumiu"; o arquivo **continua na pasta** e **não foi para a Lixeira**.
5. **Pasta:** mande excluir uma pasta com arquivos dentro → o cartão mostra a **contagem de itens** antes de você decidir. Permita → pasta some e aparece na Lixeira.
6. **Sessão não cobre:** se você liberou "Permitir na Sessão" para criar/escrever, mande excluir mesmo assim → o cartão do excluir **pergunta igual** (sempre, uma a uma).
7. **Fora da pasta:** mande `"exclua o arquivo ../fora.txt"` → mesmo aprovando: recusa honesta ("Fora da pasta") e **nada some**.
8. Restaure pelo Windows somente os itens descartáveis identificados pelo nome único e caminho da homologação. Preserve todos os demais itens da Lixeira pessoal.

**HOMOLOGADA (D97, 21/10):** palavras do dono: *"a fatia 12 ja esta homologada"*. Cobre a tool `excluir` (arquivo+pasta → lixeira do SO, com contagem) + cartão reforçado (sem desfazer-direto, sem botão de sessão) + sessão nunca cobre (RF12-3) + território = pasta ativa + os 2 fixes do teste real (C4 switch PowerShell + C5 território no Windows). Prova automatizada: tsc 0 · unit 935✓/12✗ pré/16skip · E2E `excluir_fatia12` 5/5 · régua 08–12 23/23. **Registro honesto:** o retest no Windows real dos C4+C5 não foi confirmado neste chat (homologação por declaração, padrão D94). Pós-homologação: conversar o ajuste do teto na Config (pedido dele).

> 🔴 **NOTA DE ALCANCE ADITIVA — D128/DEBT-24 (2026-10-31). Esta homologação NÃO é apagada; seu alcance fica explicitado.** O registro acima **descreve o estado de 2026-10-21 e não o estado atual**. **Verificado em código hoje:** a exclusão **não funciona em nenhuma plataforma** — `agir/server/discos.ts:271` retorna falha fixa **sem chamar** `moverParaLixeira`, e `agir/server/lixeira.ts:17-21` tem o corpo removido (parâmetros `_absoluto`/`_opcoes` não usados) retornando sempre `ok:false`. **Causa:** desligada como *"temporariamente"* no episódio fail-closed da F2 (missão D119), condicionada a *"ser integrada ao helper de handles"* — que **D121 aposentou** (`04:102`). **Nenhuma decisão bloqueou a exclusão**; a expressão *"bloqueada por decisão anterior"* foi corrigida por **D128**. **O que permanece válido desta homologação:** o **contrato** (SPEC 2F: lixeira recuperável, arquivo **e** pasta, cartão reforçado, sessão nunca cobre, território = pasta ativa, nunca-permanente) e a **casca, que está íntegra no código** — catálogo, anúncio nos 4 protocolos, `ehMexida`, RF12-3, exclusão do allow-all (`rotas.ts:351`), cartão com **prévia honesta** (`discos.ts:87`: *"A exclusão não está disponível nesta versão"*), negação "nada sumiu" (`agir.ts:184-186`), Explorer atualiza (`App.tsx:1783`). **O que NÃO permanece válido:** o **comportamento** de mover arquivo/pasta para a lixeira do SO, e o placar **E2E `excluir_fatia12` 5/5** — a spec continua **ativa e sem quarentena** mas **não pode passar** contra o código atual (dedução de leitura; **não executada** nesta missão). Ver a nota de correção em `09` L165. **Consequência registrada:** o **CRUD completo NÃO está homologado**. Criada **DEBT-24** com proposta de **MICRO-FATIA DELETE entre a 13 e a 14** (precedente D98, sem renumerar); **restauração NÃO autorizada** — exige aprovação própria do dono (opções R1/R2/R3 em `investigacao_memoria_fatias_m/15_TASK06_DIAGNOSTICO_FATIA13_EXCLUIR_E_ALINHAMENTO.md` §4). **⚠️ Incógnita de esforço:** o corpo da implementação de 21/10 **não está mais no código**; se `44bbd67`/`133affa` existirem no repositório oficial, restaurar é barato, senão é reescrita — **a cópia de trabalho da Arena não tem remote nem histórico real; verificar no GitHub oficial antes de autorizar.** **Nenhuma exclusão foi executada naquela missão (Task 06)**, nem em arquivo real nem em fixture.
> 🟢 **RESOLUÇÃO — D132/D136 (2026-10-31, Task 07). A regressão foi corrigida; esta nota de alcance deixa de descrever o estado atual.** O dono **aprovou a R1** e a restauração foi **implementada e validada por testes automatizados** (Linux). **A "incógnita de esforço" foi resolvida:** `44bbd67`/`133affa` **existem no repositório oficial público** `GuilhermeFerreira42/agente_window` ⇒ restauração barata a partir de **`90fe21d`** (versão homologada por D97), lida por clone em `/home/user/.cache`. **O `.git` do workspace não foi tocado e o histórico oficial não foi substituído.** `discos.ts` voltou a chamar `moverParaLixeira` e `lixeira.ts` recuperou o corpo. **A casca descrita acima nunca precisou ser refeita** — continuava íntegra. **O roteiro de 8 passos do D97 (logo acima) volta a ser o roteiro válido de homologação manual**, com os 3 passos complementares da seção seguinte. **A homologação D97 continua preservada** e a correção da regressão fica registrada **separadamente**.

## Roteiro vigente — MICRO-FATIA DELETE / missão Codex nº 2 (2026-11-04, D138)

### Aceite manual do dono — HOMOLOGADA COM RESSALVAS nos cenários declarados (2026-11-04)

O dono informou que realizou somente estes testes no Windows, ambos com sucesso, e **determinou registrar a homologação com ressalvas limitada a essa cobertura**:

1. Exclusão usando as novas permissões configuradas.
2. Exclusão de alvo fora da pasta definida na conversa.

**Natureza da evidência:** declaração humana do dono nesta conversa, distinta das provas automatizadas/nativas do Codex em `09`. O relato não especifica quais combinações de permissões foram usadas, tipo/tamanho dos alvos, se houve cartão ou autorização direta, nem restauração, contagem, tempo ou nome/caminho dos itens; **não completar essas lacunas por inferência**. Não atribuir ao dono os cenários da bateria técnica ou os outros passos do roteiro abaixo. Os demais cenários permanecem sem aceite manual específico nesta rodada.

**Avanço autorizado pelo dono:** encerrar a exigência de repetir agora todo o roteiro Windows e seguir para a **regressão integral do sistema pela Arena no Debian**, conforme `09`. A suíte geral ainda não está aprovada; as falhas e limitações continuam registradas. DEBT-24 fica **homologada funcionalmente com ressalvas nesses dois cenários, com validação geral pendente**, sem baixa integral neste registro. Não confundir esse aceite limitado com aprovação exaustiva do sistema. A Fatia 13 mantém seu aceite histórico; implementação da Fatia 14 continua condicionada aos resultados/decisão de avanço e a DP-03/DP-06.

O dono também autorizou o commit da documentação e da consolidação relacionada ao DELETE. Isso substitui a proibição de commit da carta inicial para esta entrega; não autoriza push ou inclusão de trabalhos alheios ao escopo.

### Roteiro de referência para cenários adicionais

**Complemento do dono em 2026-11-04:** após concluir esta etapa Windows, encaminhar o sistema à **Arena no Debian para regressão integral**, incluindo o runtime atualizado, conforme a passagem registrada em `09`. O parecer “pronta com ressalvas” permite iniciar este roteiro; não encerra DELETE, não substitui os testes gerais e não autoriza avanço automático para a 14. O dono decide o aceite após conhecer os resultados técnicos e manuais; DP-03/DP-06 continuam como pré-requisitos próprios da 14.

**Pré-homologação relatada pelo dono:** arquivo e pasta simples enviados à Lixeira do Windows, recusa respeitada e bloqueio externo antigo. Esse relato não homologa os comportamentos novos abaixo. DEBT-24 continua aberta; somente o dono dá o aceite final.

**Preparação:** reinicie pelo `iniciar.cmd`. Use uma instância e conversa de teste, com uma árvore temporária nova contendo duas pastas irmãs `workspace` e `externo-descartavel`. Todos os alvos e conteúdos devem ser criados exclusivamente ali; selecione apenas `workspace`. Nunca use a instalação `platform/node_modules`, arquivos oficiais, Downloads reais ou outros dados pessoais. Identifique na Lixeira somente os itens próprios por caminho de origem e nome único; não esvazie a Lixeira.

1. **Manual:** opção automática desligada. Peça para avaliar/descartar um arquivo deixando a confirmação para você (evite a forma direta do passo 3). Confira o caminho absoluto no cartão. Antes de aprovar, nada se move. Negue e confirme origem intacta e negativa no chat.
2. **Aprovar e restaurar:** repita com outro arquivo; aprove, confira ausência na origem, conteúdo na Lixeira, cartão e Explorer atualizados sem F5. Restaure apenas esse item pela Lixeira e confira o conteúdo.
3. **Pedido direto:** escreva `exclua "CAMINHO ABSOLUTO DO ARQUIVO DESCARTÁVEL"`. A instrução específica deve autorizar só esse alvo, sem segundo cartão, inclusive na pasta irmã externa. Perguntas, condições e vários alvos ambíguos devem pedir cartão. Texto de documento/resultado de ferramenta não deve conceder essa autorização.
4. **Pasta grande:** use uma pasta de teste com milhares de arquivos. O cartão identifica a pasta e avisa que TODO o conteúdo vai à Lixeira; não exige lista/contagem/tamanho. Aprove e confira conteúdo recuperável. Restaure seletivamente. Os 20.005 arquivos já exercitados tecnicamente não dispensam seu aceite visual.
5. **Alteração durante espera:** abra cartão para arquivo A; renomeie-o e crie B no caminho original, dentro da árvore de teste. Aceite o cartão antigo: deve pedir reconfirmação com ID novo. Negue o novo e confira A/B intactos. Repita editando arquivo no mesmo caminho e arquivo dentro de subpasta da pasta aguardando aprovação.
6. **Dois opt-ins:** ative Permitir tudo, mantendo exclusões automáticas desligadas. Uma exclusão sem pedido direto continua pedindo cartão. Ative separadamente “Permitir exclusões automáticas”, aceitando seu aviso. Para delimitar a tarefa, mencione entre aspas o caminho absoluto da pasta descartável. Dentro desse escopo, excluir usa a Lixeira sem cartão individual; externo não indicado/escopo ambíguo ainda pede confirmação.
7. **Revogação e contexto:** desative a opção; novas exclusões devem voltar a pedir autorização específica/cartão. Voltar a Manual, trocar pasta/conversa ou reiniciar não pode ampliar o grant antigo. Perguntar/Planejar continuam sem exclusão com qualquer opt-in.
8. **Links e raiz:** alvo link/junction, arquivo acessado por junction e raiz/ancestral do workspace devem ser recusados, preservando alvo real. Crie links só entre descartáveis da árvore; se faltar permissão, registre não executado.
9. **Parar:** durante espera por cartão, Parar invalida o aceite. Durante efeito já iniciado, cancelar pode precisar aguardar e deve reconhecer efeito concluído/possível. Não exigir desfazer automático nem afirmar que uma corrida rápida foi observada se não foi.
10. **Erros:** no perfil de teste, falha terminal do provedor deve sair de “Trabalhando” com mensagem clara. Contexto excedido deve orientar redução/nova conversa, sem repetir o mesmo payload automaticamente. Queda de rede depois de um DELETE não deve repetir a ferramenta já registrada. Não altere credenciais ou permissões da Lixeira pessoal para simular falhas; cenários injetados estão em `09`.
11. **Escopo e regressão:** peça criar/copiar um descartável; confirme resultado real antes de seguir. Isso não deve autorizar editar documentos canônicos. Confira ler/listar/buscar/criar/escrever e comando seguro na mesma árvore. Shell não é sandbox e comandos arbitrários não têm a garantia “somente Lixeira”; não use comando de exclusão permanente no teste.
12. **Registrar o aceite:** anote cenário, caminho descartável, resultado, falha ou não executado. Outros volumes, Lixeira indisponível/sem capacidade e cancelamento nativo demorado só ficam aprovados se realmente exercitados. Preserve a ordem D133 e o gate DP-03/DP-06; este roteiro não autoriza Fatia 14.

## Roteiro histórico — MICRO-FATIA DELETE — correções de 2026-11-03

> **Superado prospectivamente por D138 e pelo roteiro de 2026-11-04 acima.** Preservado para rastreabilidade; não executar como contrato vigente os passos que exigem confinamento externo, contagem ou cartão incondicional.

Este roteiro substitui as instruções operacionais anteriores da MICRO-FATIA DELETE. O histórico de D97 e da Fatia 13 permanece preservado. Implementação corrigida não significa homologação: resultados técnicos e limitações ficam em `09`.

**Preparação segura:** use instância de teste do app, provedor/modelo de fixture e uma árvore temporária nova, de caminho absoluto conhecido, com nome único. Dentro dela, crie duas pastas irmãs: `workspace` (selecione apenas esta no app) e `externo-descartavel`. Todos os arquivos, pastas, links e alvos usados abaixo devem ser criados exclusivamente nessa árvore, com conteúdo sintético. Nunca selecione o projeto Agent Window ou pastas pessoais como workspace deste teste. Identifique os itens na Lixeira por nome único e caminho de origem; preserve os demais itens.

1. **Cartão e aprovação individual:** crie um arquivo descartável; peça a exclusão. Confira caminho, prévia, aviso de restauração pelo SO e ausência de botão de sessão. Sem aprovar, o arquivo permanece.
2. **Lixeira real e Explorer:** aprove; confira conteúdo inteiro na Lixeira, ausência na origem, cartão coerente e Explorer atualizado sem recarregar. Restaure somente esse item pelo Windows e confirme o conteúdo.
3. **Recusa:** repita com outro arquivo, negue; ele permanece intacto e a IA recebe a negativa.
4. **Pasta:** crie uma pasta com subpasta e arquivos sintéticos. Confira contagem no cartão; aprove e verifique a árvore completa na Lixeira. Restaure apenas essa pasta.
5. **Sessão e Permitir tudo:** mesmo com grant de escrita ou Permitir tudo explícito, excluir pede confirmação individual. Perguntar/Planejar continuam sem executar exclusões.
6. **Território:** tente excluir um arquivo em `../externo-descartavel` e a própria raiz do workspace. Mesmo aprovando, ambos devem ser recusados e permanecer intactos.
7. **Links e junctions controlados:** crie dentro do workspace um symlink de arquivo e uma junction de diretório apontando para alvos descartáveis em `externo-descartavel`. Peça a exclusão do link e de um arquivo através da junction. Espere recusa; link, junction e alvos continuam intactos. Atalho `.lnk` não substitui este cenário. Se não houver permissão para criar o link, registre o cenário como não executado.
8. **Substituição durante a aprovação:** abra um cartão para arquivo com conteúdo A. Antes de aprovar, renomeie A dentro da árvore de teste e crie B no caminho original. Aprove o cartão antigo: nada deve ser movido; outro cartão, com ID e prévia novos, pede confirmação de B. Uma resposta repetida ao cartão antigo não autoriza B. Negue o novo cartão e confira A e B intactos; repita e aprove o novo cartão para validar B na Lixeira.
9. **Edição durante a aprovação:** altere o conteúdo do mesmo arquivo enquanto o cartão espera. Repita com um arquivo dentro de subpasta de uma pasta pendente de exclusão. Aprovar a versão antiga exige outra confirmação, com prévia atualizada.
10. **Cancelamento:** Parar enquanto o cartão espera invalida a aprovação. Durante uma movimentação já iniciada, a resposta de cancelamento deve aguardar o resultado e reconhecer efeitos realizados. Se a operação terminar rápido demais para observar a corrida, registre esse caso como não executado manualmente; há teste automatizado com barreira determinística.
11. **Nomes iguais:** crie dois arquivos de mesmo nome, com conteúdos diferentes, em pastas descartáveis distintas. Exclua ambos e confira que os dois conteúdos permanecem recuperáveis. A concorrência XDG e as colisões preexistentes também possuem testes automatizados específicos.
12. **Outro volume, quando disponível:** somente se puder criar outro temporário descartável em volume local apropriado. No Windows, verifique o comportamento observado e a presença recuperável na Lixeira, sem presumir suporte de todo tipo de volume. No Linux/XDG, EXDEV deve recusar sem copiar/apagar a origem. Sem dois volumes apropriados, registre não executado.
13. **Falhas e efeitos parciais:** não altere permissões da Lixeira pessoal para provocar erros. A falha de registro XDG é exercitada por injeção nos testes e ocorre antes de mover. Se uma conferência posterior falhar, a mensagem deve informar efeito parcial e destino; o Explorer deve atualizar e a IA não deve receber “NÃO EXECUTADO” para conteúdo já movido.
14. **Regressão:** na mesma árvore descartável, confira ler/listar/buscar/criar/escrever e um comando seguro de leitura. Registre cada cenário executado, falho ou bloqueado, com conteúdo e caminho observados.

**Limites:** os checks Node e o despacho PowerShell não constituem operação atômica por handle; permanece uma janela entre a última checagem e a syscall/execução do PowerShell, conforme D121. Pastas acima de 20.000 entradas ou profundidade 128, tipos especiais e falhas de observação são recusados sem autorização válida. Os testes não autorizam exclusão permanente nem avanço para a Fatia 14. Ao terminar, restaure somente os itens descartáveis identificados nesta homologação; não faça limpeza geral da Lixeira.


## Registro D98 — Gate concluído e homologado pelo dono (2026-10-29)

**Declaração do dono:** “concluí e homologuei o Gate D98 no meu ambiente Windows, incluindo as correções das regressões encontradas.” O dono confirmou também os seis comportamentos REG-01–REG-06 e o desempenho do Explorer. Registro como fechamento formal decidido pelo dono; não é uma inferência da IA.

**Evidência técnica de suporte:** commits locais `8ec2dda` (correções) e `8793b9e` (testes). Cobertura Linux: E2E REG 6/6; SCM 1/1 e Explorer 1/1 em fixture isolada 1k; Vitest focal 11 arquivos/93; typecheck passou. Regressão geral 991/1030 aprovados, 12 falhos e 27 ignorados; os 12 asserts falhos reproduzem os quatro arquivos com falhas já existentes no baseline `3f5c33c`. Build oficial terminou sem sucesso por OOM no Vite. O dono avaliou essas limitações e declarou o Gate concluído; placares e limites técnicos em `09 §3.8.5`.

**Estado:** Gate D98 **fechado por decisão do dono** ✅ · não reabrir otimizações homologadas · Fatia 13 autorizada em sequência. A divergência arquitetural one-shot versus PTY persistente foi posteriormente resolvida por D126, opção A; o registro separado de homologação manual limitada da Fatia 13 vem a seguir. Fatias 14/15, iniciativas M e push continuam fora do escopo desta abertura.

## Fatia 13 — homologação manual declarada pelo dono (Windows, 2026-10-29)

**Declaração do dono:** o usuário informou que homologou manualmente no Windows os cenários abaixo. Este registro é a declaração de quem executou o aplicativo; não é teste automatizado executado pelo agente e não implica cobertura além dos casos explicitamente relatados.

**Cenários relatados como exercitados:**
- conversas no aplicativo;
- leitura, criação e edição de arquivos;
- comandos PowerShell reais executados pelo agente;
- `Rename-Item`, com conteúdo do arquivo preservado;
- permissões Manual e Permitir tudo nos cenários testados;
- modos Perguntar e Planejar sem criação de arquivos;
- uso de `Parar` para cancelar uma execução que estava aguardando havia 30 segundos;
- confirmação de que o terminal humano permaneceu operacional.

**Limites do aceite:** não se afirma que todos os comandos, padrões de risco, shells, permissões ou provedores tenham sido testados. O aceite não demonstra confinamento do processo ao workspace, isolamento contra outros usuários da máquina, reversão dos efeitos anteriores ao cancelamento, nem cobre cenários não relatados; o shell herda os privilégios normais da conta do sistema. Não há, neste registro, log/vídeo ou resultado de E2E automatizado do Windows anexado. O teste de espera de 30 segundos não altera o timeout de produto de 2 minutos nem a opção de continuar.

A decisão técnica de executor one-shot separado do PTY humano consta em `05` (D126), `04 §1.11` e `06`; a evidência automatizada Linux desta missão está separada em `09 §3.22`. A ferramenta `excluir` continua bloqueada por decisão anterior; a execução de comandos shell não a habilita.

> ⚠️ **CORREÇÃO ADITIVA DE ALCANCE — D128 (2026-10-31).** O parágrafo acima é preservado como histórico, com **duas correções**. **(1) A expressão "bloqueada por decisão anterior" está corrigida:** varredura de **D1 a D126** em `05` **não encontrou nenhuma decisão que bloqueie `excluir`**. O que existe é um comentário de código dizendo *"temporariamente"* (`lixeira.ts:1-4`), uma **exclusão de escopo de missão** no alcance de D121 (*"não autoriza implementar"* ≠ *decidir não implementar*) e a repetição dessa exclusão como se fosse decisão. **Causa real: precondição órfã** — o religamento foi condicionado ao *helper de handles*, que **D121 aposentou**. **(2) O que continua válido e não foi alterado:** a execução de comandos shell **não** habilita `excluir`, e `Permitir tudo` **não** a desbloqueia. **Registro de divergência do dono (2026-10-31):** ele considera a Fatia 13 **aberta** porque o agente não exclui arquivos nem pastas, impedindo o CRUD completo. **Verificado em código: o fato procede** (`discos.ts:271` e `lixeira.ts:17-21` retornam falha fixa). **A causa, porém, não é escopo da Fatia 13** — a SPEC 2G a exclui expressamente; trata-se de **regressão sobre a Fatia 12 homologada por D97**, registrada como **DEBT-24**. **Alcance desta homologação da Fatia 13, explicitado:** cobre a ferramenta **`executar`** e seu entorno (executor one-shot, shell padrão, cwd validado, timeout/continuar, cauda 20 KiB, `Parar`, Manual/Permitir tudo, negação dura, PTY humano intacto) nos cenários de `08`. **NÃO cobre exclusão de arquivos ou pastas, e NÃO declara CRUD completo — o CRUD completo NÃO está homologado e não deve ser declarado.** O trabalho homologado da Fatia 13 **permanece válido e não é desfeito** por este registro. **Restauração da exclusão NÃO autorizada** — exige aprovação própria do dono. Nenhum teste foi executado e **nenhuma exclusão foi executada** naquela missão (Task 06).
> 🟢 **ATUALIZAÇÃO — D132/D136 (2026-10-31, Task 07).** A aprovação própria **foi dada**: o dono aprovou a **R1** e a restauração foi **implementada e validada por testes automatizados** (Linux), com **homologação manual pendente** no Windows real (roteiro na seção *MICRO-FATIA DELETE* deste arquivo). **Esta homologação da Fatia 13 continua preservada e não é reaberta:** seu alcance explicitado acima permanece exato — ela cobre a ferramenta **`executar`** e seu entorno, e **não cobre exclusão**. A exclusão volta a funcionar por **correção complementar registrada separadamente** (MICRO-FATIA DELETE / DEBT-24), não por ampliação da Fatia 13. **O CRUD completo continua NÃO homologado** até o dono homologar.

## Roteiro de Homologação — FATIA 6.1: Fechamento de Dívidas Críticas (Windows 5174 real)

> **Este é o teste que você roda após a entrega da 6.1 para homologar o fechamento de dívidas.** Baseado diretamente nos pontos gravados no seu vídeo.

### 1. Teste da Troca Atômica de Workspace (DEBT-06)
- Subir o servidor na porta 5174 e abrir no navegador no Windows.
- Clicar no seletor de pasta (`+` ou "Open Folder").
- Selecionar uma pasta qualquer do seu computador.
- **Critério de aceite:** No mesmo instante, **sem digitar nada no chat ("oi") e sem apertar F5**:
  - A árvore do Explorer atualiza e mostra os arquivos da pasta escolhida.
  - O terminal executa `cd` para essa pasta e o comando `pwd` / `Get-Location` mostra o caminho exato da pasta selecionada.

### 2. Teste da Lista de Recentes (DEBT-07)
- Clicar novamente no seletor de pasta.
- **Critério de aceite:** O diálogo lista as pastas abertas recentemente para seleção direta com um clique.

### 3. Teste dos Provedores na Landing Page Vazia (DEBT-09)
- Com o aplicativo aberto na tela inicial (sem nenhuma conversa ou mensagem enviada no chat).
- Clicar no ícone de Conta / Perfil > **Provedores**.
- **Critério de aceite:** A aba de configuração de Provedores abre imediatamente na área do editor moderno, sem travar nem dar erro de console.

### 4. Teste de Limpeza de Buffer do Terminal (DEBT-01)
- No painel do terminal, digitar comandos com saída extensa (ex: `dir`, `git status`).
- Digitar `clear` ou `cls` e pressionar Enter.
- **Critério de aceite:** O terminal limpa completamente a tela, sem deixar resíduos visuais, caracteres cortados ou fantasmas de texto no topo do viewport.

### 5. Teste de Purga do Visualizador Legado (DEBT-04)
- Abrir arquivos e painéis auxiliares.
- **Critério de aceite:** Nenhuma interface utiliza o visualizador legado antigo; todas as telas usam o editor moderno.

---

## Gate histórico FATIA 06 — roteiro anterior (Windows 5174 + Linux)

### Windows 5174
1. `+` > pasta: confirmar janela Explorer grande, redimensionável, com favoritos e barra de endereço; escolher uma pasta comum sem Git.
2. Enviar a primeira mensagem: confirmar landing 768 px > histórico; no terminal executar `pwd`/`Get-Location` e conferir a pasta escolhida.
3. Criar sessão em outra pasta, alternar sessões e conferir Explorer/Search/SCM e terminal; F5 deve restaurar cada raiz.
4. Conta > Provedores: ativar cards, alterar Ollama, salvar, reabrir e confirmar persistência. O arquivo `~/.agente_window/providers.json` não pode conter `apiKey`.
5. Excluir uma sessão: a pasta real permanece; não criar worktree/branch. Confirmar que Activity Bar e terminal continuam visualmente iguais.

### Linux
1. `+` > escolher pasta: se o seletor nativo falhar, deve aparecer “Digitar caminho”, sem bloquear a landing. Digitar `/` deve listar as pastas da raiz.
2. Selecionar `home`, confirmar que `/home/` lista seu conteúdo e escolher uma pasta sem Git. Caminho inexistente/arquivo deve mostrar erro; pasta válida deve ser aceita.
3. Enviar, alternar duas sessões e confirmar raiz do Explorer e `pwd` real no terminal; repetir após F5.
4. Conta > Provedores deve abrir na área principal; salvar e reabrir OpenAI/Gemini/Ollama.
5. Confirmar `~/.agente_window/providers.json` sem segredos e que a aplicação não chamou PowerShell no Linux.

**Aceite:** os dez passos passam; qualquer falha deve citar sistema, passo e mensagem observada.

## Resultado do gate — 06.4a homologada com ressalvas no Windows (2026-10-10)

Roteiro usado no Windows real, porta 5174:

1. **Pasta sem Git:** criar sessão apontando para uma pasta comum; confirmar que abre sem criar Git, branch, cópia ou worktree.
2. **Pasta com Git:** criar sessão apontando diretamente para um repositório; confirmar que continua na pasta original e não cria branch/worktree no fluxo padrão.
3. **Terminal:** em cada sessão, executar `pwd` e confirmar o caminho direto da pasta escolhida.
4. **Troca de sessão:** alternar entre as duas sessões e confirmar que Explorer, Search e SCM passam a usar a raiz da sessão ativa.
5. **F5:** recarregar e confirmar que sessões, pasta ativa e raízes corretas voltam sem duplicação.
6. **Recentes:** abrir novamente o seletor e confirmar as pastas em recentes, sem duplicatas e na ordem mais recente.
7. **Exclusão segura:** excluir uma sessão e confirmar que a pasta real permanece intacta; não pode apagar arquivos do usuário nem criar/remover worktree ou branch.

**Resultado histórico da 06.4a:** homologada com ressalvas. Itens **1, 3, 4 e 5** passaram no vídeo; itens **2, 6 e 7** foram aceitos com base na validação local. A dívida do seletor pequeno foi posteriormente corrigida pela consolidação 06.4d/06.5; permanecem para a Fatia 12 (pré-D95 = 16) o polish do Workspace Switcher e o texto/apresentação final da landing.

# PARTE A — O que cada coisa precisa provar (antigo 07 — Matriz de Validação)
## Objetivo
Definir como cada subsistema e cada onda do backlog serão validados, com prioridade para typecheck, testes focados, probes e E2E real.

## Sequência padrão de validação
1. typecheck do escopo alterado;
2. testes unitários/integrados do subsistema tocado;
3. probe técnico ou script de sanidade quando existir;
4. E2E do fluxo principal e do fluxo de borda alterado;
5. build completo apenas em integração ampliada, homologação ou release.

## Matriz por subsistema

| ID | Subsistema | Cenário | Resultado esperado | Método principal | Gate |
|---|---|---|---|---|---|
| VAL-TERM-01 | Terminal | abrir novo terminal | instância criada com shell, foco e output inicial | probe + E2E | bloqueante |
| VAL-TERM-02 | Terminal | split do terminal | duas instâncias operáveis no mesmo grupo | E2E real | bloqueante |
| VAL-TERM-03 | Terminal | maximizar/restaurar | painel muda de modo e retorna sem perder conteúdo | E2E real | bloqueante |
| VAL-TERM-04 | Terminal | digitar nos dois lados do split | entrada roteada para a instância focada | E2E real | bloqueante |
| VAL-TERM-05 | Terminal | comando `clear` | viewport limpa sem quebrar a sessão | E2E real | bloqueante |
| VAL-TERM-06 | Terminal | trocar de sessão e voltar | estado visual e vínculo correto por sessão | teste focado + E2E | bloqueante |
| VAL-EXP-01 | Explorer | expandir pasta | children carregados sob demanda | teste integração + E2E | bloqueante |
| VAL-EXP-02 | Explorer | abrir arquivo | aba/visualização correta é aberta | E2E real | bloqueante |
| VAL-EXP-03 | Explorer | evento externo de disco | árvore atualiza sem reload manual | teste integração | alta |
| VAL-FS-01 | Filesystem | salvar arquivo | escrita atômica e conteúdo persistido | teste integração | bloqueante |
| VAL-FS-02 | Filesystem | concorrência de escrita | lock evita corrupção | teste focado | alta |
| VAL-CHAT-01 | Chat | enviar prompt | turno inicia e resposta começa a aparecer em streaming | E2E + logs | bloqueante |
| VAL-CHAT-02 | Chat | tool pending | ferramenta fica pendente até aprovação/rejeição | teste focado + E2E | bloqueante |
| VAL-CHAT-03 | Chat | restaurar sessão | histórico, rascunho e anexos coerentes por sessão | teste focado | alta |
| VAL-WB-01 | Workbench | toggle de painéis | layout redistribui espaço sem travar a UI | E2E real | bloqueante |
| VAL-WB-02 | Workbench | resize manual | dimensões persistem e são respeitadas após reload | E2E real | alta |
| VAL-WB-03 | Workbench | split da área central | grupos/abas mantêm estado e foco corretos | E2E real | alta |
| VAL-CMD-01 | Commands | executar comando global | ação dispara pelo registro central, não por lógica inline | teste focado | média |
| VAL-THEME-01 | Theme | alternar tema | tokens visuais mudam sem hard reload | teste focado + inspeção visual | média |
| VAL-INT-01 | Integração | explorer -> editor | arquivo aberto via explorer reflete seleção central | E2E real | alta |
| VAL-INT-02 | Integração | chat -> tools -> terminal/filesystem | fluxo de ferramenta respeita gates e contratos | E2E real | alta |

## Gates não funcionais

| ID | Métrica | Target | Método |
|---|---|---|---|
| RNF-VAL-01 | responsividade de input | resposta visual em até 16ms nas interações principais | profiler / medição focada |
| RNF-VAL-02 | latência de bridge runtime | round-trip simples até 50ms no ambiente local de desenvolvimento | timestamps de request/response |
| RNF-VAL-03 | estabilidade de layout | sem perda de estado em reload controlado | E2E + persistência |
| RNF-VAL-04 | integridade de I/O | zero escrita parcial em falha simulada | teste de integração |
| RNF-VAL-05 | tema | zero cor crítica hardcoded nos componentes de sistema | revisão + teste automatizado quando disponível |

## Critério de passagem por fatia
Uma fatia passa quando:
- todos os testes bloqueantes da fatia passam;
- nenhuma regressão crítica é detectada nos fluxos adjacentes;
- o relato final informa o que foi testado e o que não foi testado.

## Casos mínimos obrigatórios para o terminal
Os seguintes casos devem existir antes de considerar o Terminal liberado:
- abrir terminal;
- maximizar;
- restaurar;
- dividir em split;
- digitar em ambos os painéis;
- executar `clear`;
- trocar de sessão e voltar;
- relatar se sobrou qualquer "sujeira" visual ou de estado.

---
# PARTE B — Quando está pronto (antigo 08 — Critérios de Homologação)
## Objetivo
Definir quando uma entrega pode ser apresentada como pronta para aceite funcional, sem depender de interpretação subjetiva.

## Referência aos cenários da Visão V1.0
Os cinco cenários de aceitação da Visão de Capacidades Finais V1.0 estão registrados integralmente em `docs/02 - VISAO GERAL.md §1.4`, que é a fonte canônica de suas descrições. Use essa referência ao avaliar a cobertura da visão; registre aqui as evidências e os resultados de homologação aplicáveis, sem duplicar os textos dos cenários. A referência não declara que eles estejam implementados, testados ou homologados.

## Gate de homologação da documentação
Antes de liberar implementação ampla, `docs/01` a `09` precisam estar coerentes com o código (cumprido em 2026-10-03).

## Gate de homologação da implementação futura
Uma entrega de código só pode ser homologada quando:
1. a fatia pertence ao backlog aprovado;
2. os contratos impactados foram respeitados;
3. os testes bloqueantes da fatia passaram;
4. o comportamento observado bate com a documentação e com a referência do VS Code quando aplicável;
5. não existe bug blocker aberto no fluxo principal;
6. o relato da execução identifica claramente o que ficou pendente.

## Script mínimo de aceite funcional por subsistema

| Subsistema | Pergunta de aceite | Evidência mínima |
|---|---|---|
| Workbench | layout abre, alterna painéis e persiste estado? | E2E e gravação do estado restaurado |
| Terminal | abre, divide, aceita input e preserva coerência por sessão? | E2E real + sem sujeira visual |
| Explorer | abre árvore, expande pasta e abre arquivo? | E2E + leitura do arquivo |
| Filesystem | salva com atomicidade e reage a mudanças externas? | teste integração |
| Chat | responde em streaming e respeita gate de ferramenta? | E2E + log de tool pending/aprovado |
| Editor/Browser | abas e grupos centrais funcionam sem quebrar foco? | E2E |
| Commands | comandos e menus disparam comportamento correto? | teste focado + smoke manual |
| Theme | troca visual ocorre via tokens e sem hardcode indevido? | inspeção + teste |

## Critérios de rejeição imediata
A entrega deve ser rejeitada se ocorrer qualquer um dos itens abaixo:
- comportamento fora do escopo aprovado;
- desacoplamento quebrado entre camadas;
- terminal fake onde o backlog exigir PTY real;
- regressão crítica de sessão, persistência ou foco;
- documentação e código divergindo sem registro da decisão;
- validação omitida ou inconclusiva sem aviso explícito.

## Critério de aceite final da V1
A V1 só pode ser declarada pronta quando:
- todos os P0 do escopo estiverem entregues;
- a matriz de validação não tiver falhas bloqueantes abertas;
- o plano de deploy tiver sido exercitado em ambiente de staging;
- existir smoke test pós-deploy executável;
- o runbook operacional estiver publicado.


## Gate da barra superior da Fatia 06
- Linux: `/` lista diretórios; `/mnt/` lista ou mostra pasta vazia; `/tmp` deve aparecer simultaneamente no título, Explorer e `pwd`.
- Windows 5174: Procurar abre seletor Explorer moderno; escolha deve atualizar título, Explorer e `Get-Location`.
- Em ambos: Conta > Provedores continua independente do picker e não persiste chaves.


# PARTE C — FATIA 08 (Conectar/Provedores): roteiro de validação do dono — **CUMPRIDO em 15/10 · HOMOLOGADA em 17/10** (registro no topo deste arquivo)

> **Estado:** implementada em 15/10 (`f87981c`, `2b371c2`, `fde5f0f`). **Não homologada** até este roteiro ser rodado. Prints da prova automatizada em `~/validacao_fatia08/prints/` (removidos na limpeza de 21/10).

## C.1 Caminho rápido (5 minutos, sem chave paga)
1. Suba o app: `npm --prefix platform/apps/workbench-v2 run dev` (porta **5174**). Uma instância só.
2. **Conta ▸ Provedores**.
3. **Compatível com OpenAI** → Nome do serviço: `Local` · Endereço: o do seu serviço local (ex.: LM Studio) — ou `http://127.0.0.1:4599/v1` com o stub `uploads/stub_provider.cjs` no ar.
4. Chave: qualquer texto · **Modelo**: digite um à mão · **[Testar conexão]** → faixa verde · **[Salvar provedores]** → "Configuração salva".
5. **F5** → reabrir Provedores → o serviço continua lá, com o nome no título; o campo da chave vem **mascarado** (o olhinho mostra só sob clique).
6. Marcar **usar este provedor no chat** → chip "provedor ativo do chat" → **F5** → continua ativo.

## C.2 Caminho com chave real (NVIDIA — grátis em build.nvidia.com)
1. Crie a chave (`nvapi-…`) em build.nvidia.com.
2. Em **NVIDIA** → cole a chave → **[Buscar modelos]** (o catálogo aparece) → escolha um modelo → **[Testar conexão]** (faixa verde com a contagem).
3. **[Salvar provedores]** → **F5** → reabrir: a chave volta **mascarada** e o rodapé diz **"guardada em ~/.agente_window/providers.json (fora do projeto) — nunca entra no Git"**.
4. No repo, `git status`: **nenhuma** menção a chave (a segunda tranca é o `.gitignore`).

## C.3 O que observar (falhas honestas, sem erro genérico)
- Chave errada → "Chave inválida (erro 401)" · endereço que não existe → "Não deu para alcançar o endereço" · serviço sem catálogo → aviso de **405** e o **modelo digitado continua valendo**.
- Nenhuma chave em log, URL ou no carregamento da tela; o **olhinho** é o único caminho que traz a chave inteira (D83) — limite consciente registrado em `06 §7`.

## C.4 Se algo falhar
Anote **tela + texto do aviso** e traga: a validação vale como **reprovado com evidência**. Nada é declarado verde sem o aceite do dono.

# PARTE D — FATIA 09 (Conversar): roteiro de validação do dono — **VALIDAÇÃO PARCIAL FEITA EM VÍDEO (17/10) · homologação formal pendente**

> **Estado:** implementada em 17/10 (`5968b70`, `9e2c703`, `c0af6fe`, `90f75c8`) e **já usada com sucesso pelo dono** (2 vídeos de 17/10: Ollama local respondendo, Markdown completo, provedor ativo persistindo; o 1º vídeo também mostrou o erro honesto "Nenhum provedor está ativo" quando a bolinha de ativação fica desligada). A bateria automatizada passou **5/5 em 4 rodadas seguidas**. Prints da prova em `~/validacao_fatia09/` (fora do repo; removidos na limpeza de 21/10 — os stubs seguem em `~/uploads/`). Este roteiro é o caminho curto para **declarar a homologação** — ou apontar o que falta.

## D.1 Caminho rápido (5 minutos, com Ollama local — sem chave)
1. Suba o app: `npm --prefix platform/apps/workbench-v2 run dev` (porta **5174**). Uma instância só.
2. **Conta ▸ Provedores** → **Ollama (local)** → endereço `http://localhost:11434` → **[Buscar modelos]** → escolha um → **[Testar conexão]** (faixa verde) → **[Salvar provedores]** → **marque "usar este provedor no chat"** (a bolinha — sem ela o chat responde *"Nenhum provedor está ativo"*; foi o esquecimento do 1º vídeo).
3. Abra uma sessão e mande "oi" → a resposta **cresce aos poucos** (chega em pedaços, não de uma vez) e, no fim, o rodapé mostra o **modelo que respondeu de verdade**.
4. Peça algo comprido (ex.: *"escreva o hino do Brasil na integral"*) → clique **Parar** no meio → a resposta para onde está, com a marca **Cancelada**, e nada de texto falso entra depois.
5. **F5** → a conversa continua lá, **na mesma sessão**; abra **outra sessão** → a conversa da primeira **não aparece** na segunda.
6. Troque o provedor/modelo ativo em Provedores → a **próxima** pergunta já sai pelo novo, **sem reiniciar** o app.

## D.2 O que observar (falhas honestas, sem erro genérico)
- Sem provedor ativo → *"Nenhum provedor está ativo…"* · chave errada → *"Chave inválida (erro 401)"* · serviço desligado → *"Não deu para alcançar o serviço…"* · demora > 60 s → *"O serviço não respondeu em 60 segundos"*.
- A **chave nunca aparece** na tela, no log nem na resposta da API — a tela mostra só o arquivo de onde ela veio (`~/.agente_window/providers.json`).

## D.3 Se algo falhar
Anote **tela + texto do aviso** (ou grave um vídeo, como em 17/10 — a análise por transcrição + quadros funciona bem) e traga: a validação vale como **reprovado com evidência**. Nada é declarado homologado sem a palavra do dono — ao aprovar, registre a homologação no topo deste arquivo, como na FATIA 08 (D89).
