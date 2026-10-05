# Comportamento dos Botões e Regras de Negócio — Fatia 06

> **Objetivo:** Definir os comportamentos interativos da carcaça do Agente Window com base no VS Code 1.135.0 real.  
> **Premissa Inviolável:** O lado direito (Side Bar + Activity Bar) e o Terminal inferior continuam operando normalmente sem nenhuma alteração na sua estrutura, mas **sincronizam seus caminhos com a sessão ativa**.

---

## 1. Coluna 1: Gestão de Sessões

### Botão `Novo [Ctrl+N]`
* **Ação ao Disparar:**
  1. Alterna o estado da área central para o **Empty State (Estado Vazio de 768px)**.
  2. Limpa o foco da sessão ativa anterior (ou prepara um rascunho de nova sessão no workspace padrão).
  3. Foca automaticamente o cursor na caixa de texto central com o placeholder *"O que há de próximo em seu roteiro?"*.
  4. Mantém o seletor de pasta no workspace ativo ou no último selecionado.
* **Atalho:** `Ctrl + N` dispara a mesma ação.

### Item de Sessão na Lista (Troca de Chat / Alternar Sessão)
* **Ação ao Clicar (Sincronização Global do Workbench):**
  1. **Seleção:** Marca o item como selecionado (fundo com token `list.activeSelectionBackground`).
  2. **Desmonta Empty State:** O Empty State centralizado fecha imediatamente caso esteja aberto.
  3. **Cabeçalho:** Atualiza o topo com o nome da conversa: `• Greeting in Portuguese` e o botão de menu `...`.
  4. **Mensagens:** Carrega o histórico de mensagens real daquela sessão na área central de rolagem.
  5. **Input:** Fixa o input no rodapé da coluna central.
  6. **SINCRONIZAÇÃO DO EXPLORER (Side Bar Direita):**
     * O Explorer na Side Bar direita atualiza sua pasta raiz para a pasta associada àquela sessão (`session.workspacePath`).
     * Exemplo: se o chat é do projeto `agente_window`, a árvore exibe os arquivos de `agente_window`; se o chat for de outro workspace, a árvore chaveia para a pasta desse outro workspace.
  7. **SINCRONIZAÇÃO DO TERMINAL (Painel Inferior):**
     * O terminal integrado no painel inferior sincroniza seu diretório de trabalho (`cwd`) com a pasta da sessão ativa.
     * O prompt do terminal passa a apontar para o caminho do workspace da conversa (ex.: `c:\Users\Usuario\Desktop\a\agente_window`).

### Agrupamento por Pasta do Workspace (`agente_window`)
* **Ação ao Clicar na Seta (`>` / `v`):**
  * Recolhe ou expande a lista de conversas daquela pasta.
  * O estado colapsado/expandido é persistido no navegador.

---

## 2. Coluna Central: Ciclo de Vida do Empty State, Seletor de Pasta e Chat

### Seletor de Pasta / Workspace no Empty State (`New session in [pasta v]`)
* **Comportamento do Dropdown:**
  * O texto `[agente_window v]` é um botão/chip clicável.
  * Ao clicar, abre o menu suspenso (dropdown) exibindo:
    1. A lista de workspaces e pastas recentes (ex.: `agente_window`, `bible_tracker`, `open_arena`, etc.).
    2. A opção `Select...` para selecionar uma nova pasta no disco.
  * **Regra de Negócio:** Esta seleção define em qual pasta a nova conversa vai operar. É o ponto de entrada único do sistema para associar uma conversa a um projeto no disco.

### Regra do Empty State Centralizado (768px)
* **Quando é exibido:**
  * No boot inicial se não houver sessão ativa selecionada;
  * Após o clique no botão `Novo [Ctrl+N]`.
* **Transição ao Enviar a Mensagem:**
  * O usuário digita o texto e pressiona `Enter` (ou clica no botão de envio com a seta para cima).
  * **Passo 1:** A sessão real é criada e registrada na lista da esquerda sob a pasta do workspace selecionado no dropdown.
  * **Passo 2:** O bloco centralizado de 768px fecha imediatamente (`display: none`).
  * **Passo 3:** O cabeçalho superior fixa no topo com o título da sessão recém-criada.
  * **Passo 4:** A mensagem enviada é inserida na lista de histórico do chat.
  * **Passo 5:** A caixa de input é fixada no rodapé da janela, permitindo que a conversa prossiga continuamente.
  * **Passo 6:** O Explorer e o Terminal sincronizam imediatamente com a pasta da nova sessão.

### Pastilhas do Input (Pills)
* **Botão `+`:** Abre o seletor de arquivos do workspace para incluir contexto na conversa.
* **Pastilha `{/} Agent`:** Permite alternar o agente que processará a requisição.
* **Pastilha `Auto`:** Permite escolher o modelo/pool de IA.
* **Pastilhas Inferiores (`Interativo` / `Manual permissions`):**
  * Define se o agente pede autorização para executar ações ou se roda com permissões padrão.

---

## 3. Zonas Proibidas de Alteração

* **Nenhum botão da Fatia 6 pode:**
  * Tentar criar uma aba ou coluna paralela de "Alterações/Changes" no chassi direito;
  * Alterar a largura ou a estrutura do chassi homologado da `Side Bar` (274px) e `Activity Bar` (48px);
  * Danificar a integração do PTY no `TerminalPanel`.
