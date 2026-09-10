# 01B — REGRAS DE COMPORTAMENTO: TERMINAL

Este documento define as regras de comportamento do terminal utilizando a sintaxe Dado/Quando/Então (Given/When/Then).

## 1. Criação e Inicialização
### 1.1 Terminal Padrão
- **Dado** que o usuário clica em "Novo Terminal"
- **Quando** a ação é disparada
- **Então** o sistema deve resolver o perfil padrão do sistema e spawnar um processo PTY com esse shell.

### 1.2 Terminal com Perfil Específico
- **Dado** que o usuário seleciona um shell no "Shell Picker"
- **Quando** a seleção é confirmada
- **Então** o sistema deve spawnar um processo PTY utilizando o caminho do executável do shell selecionado.

## 2. Gerenciamento de Layout (Splits)
### 2.1 Divisão de Painel
- **Dado** que existe um terminal ativo
- **Quando** o usuário clica em "Dividir Terminal"
- **Então** o sistema deve criar uma nova instância de terminal no mesmo grupo, mantendo o mesmo diretório de trabalho (CWD) da instância original.

### 2.2 Alteração de Orientação
- **Dado** que existem terminais divididos em um grupo
- **Quando** o usuário alterna a orientação (Vertical $\leftrightarrow$ Horizontal)
- **Então** o sistema deve reorganizar os painéis e disparar um evento de `resize` para cada instância para ajustar as colunas e linhas.

## 3. Interação e Fluxo de Dados
### 3.1 Redimensionamento Dinâmico
- **Dado** que a janela do terminal é redimensionada pelo usuário
- **Quando** as dimensões do container mudam
- **Então** o sistema deve calcular as novas colunas/linhas e enviar um comando de `resize` para o processo PTY.

### 3.2 Buffer de Saída (Scrollback)
- **Dado** que o terminal recebe um volume de dados superior ao limite do buffer
- **Quando** novos dados chegam
- **Então** o sistema deve descartar as linhas mais antigas para manter o limite de memória definido.

## 4. Ciclo de Vida e Encerramento
### 4.1 Saída Normal do Processo
- **Dado** que o processo do shell termina (exit)
- **Quando** o evento `onExit` é disparado
- **Então** o sistema deve reportar o exit code e exibir a mensagem "Process exited with code X. Press any key to close".

### 4.2 Fechamento Manual
- **Dado** que o usuário fecha a aba do terminal ou clica no "X"
- **Quando** a ação de fechamento é executada
- **Então** o sistema deve enviar um sinal de terminação (SIGTERM/SIGKILL) para o processo PTY e remover a instância da lista de ativos.

## 5. Integração com I/O de Arquivos (Subsistema 06)
O terminal depende do subsistema de arquivos para a gestão de caminhos e contexto de execução:
- **Resolução de CWD**: A definição do Diretório de Trabalho Atual (CWD) ao spawnar um shell é validada e resolvida através do `IFileService` para garantir que o caminho seja válido e acessível.
- **Validação de Executáveis**: A detecção de shells instalados no SO utiliza o `IFileSystemProvider` para verificar a existência e as permissões de execução dos binários do shell.
- **Sincronização de Caminhos**: Alterações de diretório via comando `cd` no shell são refletidas no estado do Terminal, que utiliza o `IFileService` para atualizar a referência de URI do diretório ativo.
