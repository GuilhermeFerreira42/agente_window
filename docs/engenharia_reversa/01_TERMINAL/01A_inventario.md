# 01A — INVENTÁRIO OBSERVÁVEL: TERMINAL

Este documento cataloga todos os elementos visuais e funcionais observáveis do subsistema de Terminal no VS Code, servindo como a base para a extração de comportamento.

## 1. Interface Visual (UI)
### 1.1 Header e Navegação
- **Aba de Terminal**: Identificador visual da instância ativa.
- **Lista de Terminais**: Painel lateral (ou dropdown) listando todas as sessões abertas.
- **Ícones de Status**: Indicadores de processo rodando, erro ou encerrado.
- **Botão "Novo Terminal"**: Trigger para criação de instância com perfil padrão.
- **Botão "Dividir Terminal" (Split)**: Ícone para criar duplicata da sessão no mesmo grupo.

### 1.2 Área de Conteúdo (Canvas)
- **Instância xterm.js**: Área de renderização de texto com suporte a cores (256/TrueColor).
- **Painéis Divididos (Split Panes)**: Suporte a divisões verticais e horizontais.
- **Barra de Rolagem**: Scrollback persistente com controle de buffer.
- **Cursor**: Indicador de posição com suporte a diferentes formas (bloco, linha, sublinhado).

### 1.3 Menus e Comandos
- **Menu de Contexto (Right-Click)**: Opções de copiar, colar, limpar terminal e matar processo.
- **Seletor de Perfil (Shell Picker)**: Menu para escolher entre diferentes shells instalados (ex: PowerShell, Bash, Cmd).

## 2. Elementos Funcionais (Observáveis)
### 2.1 Ciclo de Vida
- **Criação**: Inicialização do processo PTY e vinculação ao terminal frontend.
- **Foco/Blur**: Mudança de estado quando o usuário clica dentro ou fora do terminal.
- **Encerramento**: Processo de exit, reportando o exit code e mantendo a janela aberta ("Press any key to close").
- **Reconexão**: Capacidade de retomar a sessão após reload da janela.

### 2.2 Interação de Dados
- **Input de Teclado**: Envio de caracteres e sequências de escape para o PTY.
- **Output de Stream**: Recebimento de dados do PTY e renderização via xterm.js.
- **Redimensionamento (Resize)**: Sincronização de colunas e linhas entre o frontend e o processo PTY.

### 2.3 Gerenciamento de Sessões
- **Agrupamento**: Organização de terminais em grupos (`TerminalGroup`).
- **Orientação**: Alternância entre layout vertical e horizontal de splits.
- **Rótulos (Labels)**: Nomeação customizada de cada instância de terminal.
