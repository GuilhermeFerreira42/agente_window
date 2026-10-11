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
