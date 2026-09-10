# CAMADA A — INVENTÁRIO OBSERVÁVEL (Terminal)

## 1. Elementos Visuais (UI)
- **Painel de Terminal**: Área principal de renderização do shell (xterm.js).
- **Lista de Abas (Tabs List)**: Barra superior que lista todas as instâncias abertas.
- **Aba de Terminal**: Item individual na lista de abas contendo:
  - Ícone do Shell (ex: PowerShell, Bash).
  - Título da instância (dinâmico ou fixo).
  - Cor de destaque da aba.
- **Menu de Contexto (Right Click)**: Menu flutuante com ações de manipulação de texto e instância.
- **Menu de Ações (Dropdown/Header)**: Botões de controle no topo do painel (Novo, Split, Kill).
- **Shell Picker**: Interface de seleção de perfil para criação de novas instâncias.

## 2. Ações do Usuário
- **Criação**: Criar nova instância usando perfil padrão ou selecionando um perfil específico.
- **Manipulação de Layout**:
  - Dividir terminal (Split) vertical ou horizontalmente.
  - Redimensionar painéis via sash (arrastar borda).
  - Alternar foco entre painéis divididos.
- **Gerenciamento de Instância**:
  - Renomear aba.
  - Alterar ícone/cor da aba.
  - Fechar instância (Kill).
  - Ocultar/Mostrar terminal (Hide/Show).
- **Interação com Texto**:
  - Copiar/Colar texto.
  - Selecionar texto (Mouse/Keyboard).
  - Pesquisar texto no buffer (Find/Replace).
  - Scrollback (Navegação no histórico).
- **Execução**:
  - Digitar comandos via teclado.
  - Enviar caminhos de arquivos/pastas para o terminal.

## 3. Estados Observáveis
- **Conectando**: Estado transitório enquanto o processo PTY é iniciado.
- **Ativo/Focado**: Terminal recebendo input do teclado.
- **Background/Oculto**: Processo vivo, mas UI não visível.
- **Erro/Exit**: Processo encerrado com código de saída (exibindo o código no título ou status).
- **Sincronizando**: Estado de replay de buffer após reconexão de sessão.
