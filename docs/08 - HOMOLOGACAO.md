# 08 - HOMOLOGACAO (do humano)

> **Para você, não para a IA.** Aqui não entra comando de terminal nem detalhe de teste — isso é o `09`. Parte A = o que cada fatia precisa provar (antigo `07`). Parte B = quando uma entrega está "pronta" (antigo `08`).
> Regra de sempre: **homologação = você no Windows real (5174), com prints/vídeo**. Teste verde da IA não homologa.

## Como homologar uma fatia em 5 passos
1. Peça o servidor 5174 de pé e abra no Windows.
2. Confira os itens da Parte A da fatia (e as medidas que a IA citou no `03`).
3. Compare com o VS Code real (régua: vscode.dev / 8080 / prints em `arquivo_morto/engenharia_reversa/`).
4. Rode o seu roteiro manual (F5, trocar sessão, maximizar/restaurar, terminal, Search, SCM, drag & drop).
5. Diga "homologada" ou liste o que falhou. A IA registra no `03` e no `07`.

---

## Homologação FATIA 07 — 2026-10-15 (declaração do dono, com evidências)
- **Entregas homologadas:** DEBT-09 (`a69137d`) · DEBT-06 caminho C (`62cf055`) · DEBT-04 (nada a expurgar) · onda 1 da faxina D74 (`9985b9e`) · quarentena pontual dos 2 E2E da Aux (`e182960`).
- **Evidências (externas ao repo, em `validacao_fatia07/`):** `sonda_01_debt09.cjs` · `sonda_02_debt06_landing.cjs` · `sonda_03_debt06_sessao.cjs` (PID novo + `readlink /proc/<pid>/cwd` = pasta nova) · `sonda_05_aux_bar.cjs` + prints `01a`…`05d`.
- **Números na homologação:** typecheck 0 · unit 730✓/12✗ (pré-existentes)/16 skip · E2E sem regressão (A/B em `e02e486`).
- **Limitações aceitas com a homologação:** PTYs órfãos até a FATIA 12 · 5 E2E vermelhos pré-existentes (`09 §2.6`) · sintoma original do DEBT-06 não reproduzido no estado anterior sob as condições testadas.
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

## Roteiro de Homologação — FATIA 10: AGIR (o cartão de permissão no chat) — PENDENTE (a declaração é do dono)
Pré-requisitos (Windows): app na 5174 · provedor ativo **com canal nativo de ferramentas**. **Aviso Q4b (D93):** se o modelo ativo (ex.: `gemma` no Ollama) não tiver tool calling nativo, o Agir mostra aviso honesto (`sem_canal_nativo`) e a conversa segue sem agir — nesse caso valide os passos 2–7 com um provedor que tenha o canal; a conversa normal funciona com qualquer provedor.
1. **Conversa normal (§6.1):** mande "oi" — responde como na 09, sem cartão.
2. **O teste final do MVP (§6.2/3):** numa sessão com **pasta real** (interruptor no topo: digite o caminho da pasta e Enter), mande **"Crie o arquivo teste-homologacao.txt com o conteúdo: feito pela fatia 10"** → cartão com caminho + prévia + 3 botões. **Antes de permitir, confira no Explorador: o arquivo NÃO existe.** Clique **Permitir** → cartão "Feito" e o arquivo **existe** com o conteúdo exato.
3. **Negar (§6.4):** "crie o arquivo nao-quero.txt" → cartão → **Negar** → cartão "Negado por você"; a IA segue sabendo do "não" e **nada é escrito**.
4. **Permitir na Sessão + F5 (§6.5/6):** "crie s1.txt" → **Permitir nesta sessão** → "crie s2.txt" → **não pergunta** (escreve direto). Aperte **F5** → "crie s3.txt" → **ainda não pergunta** (a permissão sobrevive ao F5). Conversa NOVA volta a perguntar.
5. **Território (§6.7):** "crie o arquivo ../fora.txt" → mesmo aprovando: recusa honesta ("Fora da pasta…") e **nada fora da pasta**.
6. **Anti-loop (§6.8):** se o modelo repetir a MESMA chamada 3× seguidas, aparece o aviso de loop e ele é parado (raro com modelo bom; coberto por teste automatizado).
7. **Parar (§6.9):** peça uma ação e clique **Parar** no meio — tudo morre limpo, status honesto na tela.
8. **F5 no meio de um cartão aberto:** cartão pendente vira **expirado** na volta (a execução morreu com a página — nada fica pendurado).

**Homologado = o dono declara** (padrão das fatias 07–09).

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

**Resultado histórico da 06.4a:** homologada com ressalvas. Itens **1, 3, 4 e 5** passaram no vídeo; itens **2, 6 e 7** foram aceitos com base na validação local. A dívida do seletor pequeno foi posteriormente corrigida pela consolidação 06.4d/06.5; permanecem para a Fatia 12 o polish do Workspace Switcher e o texto/apresentação final da landing.

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

> **Estado:** implementada em 15/10 (`f87981c`, `2b371c2`, `fde5f0f`). **Não homologada** até este roteiro ser rodado. Prints da prova automatizada em `~/validacao_fatia08/prints/`.

## C.1 Caminho rápido (5 minutos, sem chave paga)
1. Suba o app: `npm --prefix platform/apps/workbench-v2 run dev` (porta **5174**). Uma instância só.
2. **Conta ▸ Provedores**.
3. **Compatível com OpenAI** → Nome do serviço: `Local` · Endereço: o do seu serviço local (ex.: LM Studio) — ou `http://127.0.0.1:4599/v1` com o stub `validacao_fatia08/stub_provider.cjs` no ar.
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

> **Estado:** implementada em 17/10 (`5968b70`, `9e2c703`, `c0af6fe`, `90f75c8`) e **já usada com sucesso pelo dono** (2 vídeos de 17/10: Ollama local respondendo, Markdown completo, provedor ativo persistindo; o 1º vídeo também mostrou o erro honesto "Nenhum provedor está ativo" quando a bolinha de ativação fica desligada). A bateria automatizada passou **5/5 em 4 rodadas seguidas**. Prints da prova em `~/validacao_fatia09/` (fora do repo). Este roteiro é o caminho curto para **declarar a homologação** — ou apontar o que falta.

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
