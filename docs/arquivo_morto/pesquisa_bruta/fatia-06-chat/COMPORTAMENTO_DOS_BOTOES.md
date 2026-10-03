# Comportamento dos Botões e Regras de Negócio — Fatia 06

> **Objetivo:** Definir o que cada botão e elemento interativo faz na carcaça do Agente Window.

---

## 1. Coluna 1: Sessões & Gestão de Histórico

### Botão `Novo [Ctrl+N]`
* **Ação ao Clicar:**
  1. Cria uma nova entrada de sessão na lista sob o workspace ativo.
  2. Limpa o histórico de mensagens da área central.
  3. Foca automaticamente o cursor na caixa de digitar (`Conversar com Copilot`).
  4. Reseta a coluna da direita para o estado vazio (`Changes - Nenhum arquivo alterado`).
* **Atalho:** Pressionar `Ctrl + N` em qualquer lugar do aplicativo dispara essa mesma ação.

### Item de Sessão na Lista (Ex.: `oi`)
* **Ação ao Clicar:**
  1. Define o item como **selecionado/ativo** (fundo azulado `rgb(81, 93, 124)`).
  2. Atualiza o breadcrumb superior com o branch do worktree associado (ex.: `agents/greeting-response-oi`).
  3. Renderiza todas as mensagens anteriores daquela conversa na Coluna Central.
  4. Atualiza o painel da direita com os arquivos criados ou modificados nessa conversa específica.
* **Menu de Botão Direito (Context Menu):**
  * Opções: `Renomear Sessão`, `Deletar Sessão`, `Abrir no VS Code Normal`, `Exportar Conversa`.

### Agrupamento por Pasta (`agente_window`)
* **Ação ao Clicar na Seta:**
  * Recolhe ou expande a lista de sessões pertencentes àquele projeto.
  * O estado colapsado/expandido é persistido localmente (`localStorage`).

---

## 2. Coluna 2: Navegação e Caixa de Input

### Breadcrumbs (`agente_window > agents/greeting-response-oi`)
* **Botões `<-` e `->` (Voltar / Avançar):**
  * Navega pelo histórico de sessões visitadas recentemente.
* **Ação `...` (Menu Superior Direito):**
  * Abre menu de opções da sessão ativa (`Limpar mensagens`, `Alternar modo tela cheia`, `Configurações do Agente`).
* **Botão `Play`:**
  * Continua a execução de uma tarefa pausada ou reexecuta o último passo do agente.
* **Botão `VS Code Icon`:**
  * Transfere o contexto e abre o editor de código tradicional com a worktree ativa.

### Pastilhas do Input (Pills)
* **Pastilha `Agent` (com ícone Sparkle):**
  * Ao clicar, abre o menu suspenso para alternar entre os agentes disponíveis (ex.: *Coding Agent*, *Architect Agent*, *Reviewer*).
* **Pastilha `meu-pool` (com ícone de Ferramentas):**
  * Ao clicar, abre o seletor de endpoint/modelo de IA (ex.: *GPT-4.1*, *Claude 3.7*, *Local Ollama*, *LiteLLM*).
* **Pastilhas de Permissão (`Interativo` / `Default permissions`):**
  * `Interativo`: O agente para e solicita aprovação do usuário antes de rodar comandos de terminal ou editar arquivos.
  * `Default permissions`: Aplica as permissões padrão configuradas nas preferências.

---

## 3. Coluna 3: Painel de Alterações (Changes)

### Abas `Alterações` e `Arquivos`
* **Aba `Alterações` (Ativa por padrão):**
  * Mostra a lista de diffs dos arquivos tocados pelo agente na sessão ativa.
  * Se nenhum arquivo foi modificado, exibe a mensagem de estado vazio (*"Os arquivos alterados e outros artefatos da sessão aparecerão aqui."*).
* **Aba `Arquivos`:**
  * Exibe a árvore de arquivos completa da worktree do agente para navegação rápida.
* **Botão `+` (Topo da Coluna):**
  * Permite adicionar manualmente um arquivo do projeto ao contexto da conversa.
