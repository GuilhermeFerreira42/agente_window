# CAMADA E — CRITÉRIO DE ACEITE (Terminal)

## 1. Funcionalidades Core
- **Criação de Instância**:
  - **Passo**: Clicar em "Novo Terminal".
  - **Resultado**: Um processo PTY é iniciado, xterm.js é montado e o prompt do shell aparece.
  - **Validação**: Verificar via logs do `PtyService` a criação do processo e a renderização no DOM.

- **Divisão de Painel (Split)**:
  - **Passo**: Clicar no botão "Split Terminal".
  - **Resultado**: A área visual é dividida em dois, e uma nova instância de terminal é criada no novo painel.
  - **Validação**: Verificar se `ITerminalGroup.terminalInstances` contém 2 instâncias e se o DOM possui dois elementos xterm.

- **Alternância de Foco**:
  - **Passo**: Clicar no painel adjacente de um terminal dividido.
  - **Resultado**: O cursor do teclado é transferido para o novo painel.
  - **Validação**: Digitar no terminal e verificar se o input chega ao processo PTY correto.

## 2. Gestão de Estado e UI
- **Renomeação de Aba**:
  - **Passo**: Clicar com o botão direito na aba -> "Rename" -> Digitar nome.
  - **Resultado**: O título da aba é atualizado e persiste durante a sessão.
  - **Validação**: Verificar a propriedade `title` da `ITerminalInstance`.

- **Troca de Perfil**:
  - **Passo**: Abrir Shell Picker -> Selecionar "Bash" em vez de "PowerShell".
  - **Resultado**: O terminal atual é encerrado e um novo é iniciado com o executável do Bash.
  - **Validação**: Verificar o `shellLaunchConfig` enviado ao `PtyService`.

## 3. Resiliência e Performance
- **Sobrevivência ao Hide/Show**:
  - **Passo**: Abrir terminal -> Executar comando longo -> Ocultar Painel -> Mostrar Painel.
  - **Resultado**: O comando continua rodando e a saída permanece no buffer.
  - **Validação**: Verificar que o PID do processo não mudou.

- **Recuperação de Buffer (Revive)**:
  - **Passo**: Abrir terminal -> Escrever texto -> Reiniciar App -> Abrir terminal.
  - **Resultado**: O conteúdo anterior é re-renderizado no terminal.
  - **Validação**: Comparar o buffer final com o snapshot salvo via `XtermSerializer`.

- **Latência de Input**:
  - **Passo**: Digitar rapidamente no terminal.
  - **Resultado**: Sem lag perceptível entre tecla e renderização.
  - **Validação**: Medir tempo entre `input()` no `PtyService` e `onData` no xterm.js (< 50ms).
