# 01E — CRITÉRIOS DE ACEITE: TERMINAL

Critérios verificáveis para garantir que a implementação do Terminal atinja a fidelidade 1:1 com o VS Code.

## 1. Funcionalidades Core
- [ ] **Criação de Instância**: Ao clicar em "Novo Terminal", deve ser spawnado um processo PTY utilizando o perfil padrão do SO, com o diretório de trabalho (`cwd`) correto.
- [ ] **Interatividade**: O input de teclado deve chegar ao PTY e o output deve ser renderizado no xterm.js com latência imperceptível.
- [ ] **Redimensionamento**: Alterar o tamanho da janela do terminal deve disparar um comando de `resize` para o PTY, ajustando a largura/altura do shell instantaneamente.

## 2. Layout e Gestão
- [ ] **Split Vertical/Horizontal**: O usuário deve conseguir dividir o terminal em dois ou mais painéis, com cada painel mantendo sua própria instância de PTY mas compartilhando o `cwd` inicial.
- [ ] **Navegação de Sessões**: Deve ser possível alternar entre múltiplas instâncias de terminal via lista lateral ou abas.
- [ ] **Rótulos Customizados**: O usuário deve conseguir renomear a instância do terminal (ex: "Servidor", "Logs").

## 3. Ciclo de Vida e Robustez
- [ ] **Tratamento de Exit**: Quando o processo do shell termina, o terminal NÃO deve fechar automaticamente. Deve exibir o código de saída e aguardar que o usuário pressione qualquer tecla ou clique em fechar.
- [ ] **Recuperação de Conexão**: Se o WebSocket cair, o sistema deve tentar reconectar à sessão PTY existente usando o `sessionId` persistente, sem matar o processo no servidor.
- [ ] **Limitação de Buffer**: O scrollback deve ser limitado a 1MB (ou valor configurável) para evitar vazamento de memória no navegador.

## 4. Integração de Perfis
- [ ] **Shell Picker**: Deve existir um menu onde o usuário possa escolher entre os shells detectados (ex: `cmd.exe`, `powershell.exe`, `bash.exe`).
- [ ] **Validação de Caminho**: Se um shell selecionado não for encontrado no sistema, o terminal deve exibir um erro claro: "Shell not found at [path]".
