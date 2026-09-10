# CAMADA B — REGRAS DE COMPORTAMENTO (Terminal)

## 1. Ciclo de Vida e Instâncias
- **Criação de Terminal**
  - **Dado** que o usuário solicita um novo terminal
  - **Quando** o perfil é selecionado (ou usa o padrão)
  - **Então** o `ITerminalInstanceService` cria uma nova instância e o `PtyService` inicia um processo PTY correspondente.

- **Divisão de Tela (Split)**
  - **Dado** que um terminal está ativo e visível
  - **Quando** o usuário aciona a ação de "Split"
  - **Então** o `ITerminalGroupService` cria um novo painel adjacente e lança uma nova instância de terminal nele, dividindo o espaço visual.

- **Fechamento de Terminal**
  - **Dado** que um terminal está aberto
  - **Quando** o usuário clica no 'X' da aba ou executa o comando kill
  - **Então** a instância é descartada, o processo PTY é encerrado e a aba é removida da `TerminalTabsList`.

- **Ocultação vs Destruição**
  - **Dado** que um terminal está aberto
  - **Quando** o usuário oculta o painel de terminais
  - **Então** a instância permanece viva no `ITerminalService`, o processo PTY continua executando, mas a UI é removida do DOM.

## 2. Persistência e Recuperação
- **Recuperação de Sessão (Revive)**
  - **Dado** que o workbench foi reiniciado (F5 ou novo boot)
  - **Quando** a sessão é restaurada
  - **Então** o `PtyService` recria os processos persistentes e o `XtermSerializer` injeta os dados do buffer salvo no novo terminal para restaurar a visão anterior.

- **Reconexão de Processo Órfão**
  - **Dado** que um processo PTY continua rodando mas perdeu a conexão com a UI
  - **Quando** o usuário tenta reativar a sessão
  - **Então** o `PtyService` anexa a instância da UI ao processo PTY existente via `attachToProcess`.

## 3. Interação e UI
- **Atualização de Título**
  - **Dado** que um processo está rodando no terminal
  - **Quando** o processo envia uma sequência de escape de título (OSC 0/2)
  - **Então** a aba correspondente na `TerminalTabsList` atualiza seu texto automaticamente.

- **Foco de Painel**
  - **Dado** que existem múltiplos terminais divididos em um grupo
  - **Quando** o usuário clica em um painel ou usa atalhos de navegação
  - **Então** o `ITerminalGroup` define aquele painel como `activeInstance` e transfere o foco do teclado.
