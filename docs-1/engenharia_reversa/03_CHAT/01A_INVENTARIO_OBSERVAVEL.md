# CAMADA A — INVENTÁRIO OBSERVÁVEL (Chat/Agent Session)

## 1. Elementos Visuais (UI)
- **Painel de Conversa (Chat Panel)**: Fluxo vertical de mensagens entre usuário e agente.
- **Mensagem do Usuário**: Balão de texto com opção de editar ou deletar.
- **Mensagem do Agente**: Bloco de resposta contendo:
  - **Texto/Markdown**: Respostas explicativas e instruções.
  - **Raciocínio (Thinking)**: Bloco expansível mostrando a "cadeia de pensamento" do agente.
  - **Invocações de Ferramentas (Tool Invocations)**: Widgets que mostram qual ferramenta foi chamada, com quais argumentos e o resultado.
- **Input de Chat**: Campo de texto multifuncional com:
  - Suporte a Markdown/Múltiplas linhas.
  - Seleção de Modelo (Model Picker).
  - Anexos de Contexto (Arquivos, Símbolos, etc).
- **Lista de Sessões (Session List)**: Barra lateral com histórico de conversas, permitindo renomear, deletar ou criar novas sessões.
- **Artefatos (Artifacts)**: Painel lateral ou modal que renderiza código, diagramas ou documentos gerados pelo agente.

## 2. Ações do Usuário
- **Interação com Agente**:
  - Enviar mensagem de texto.
  - Solicitar "Continuar" (Continue) em respostas truncadas.
  - Fornecer feedback (Like/Dislike) em respostas.
- **Gestão de Sessão**:
  - Criar nova sessão.
  - Alternar entre sessões existentes.
  - Renomear ou excluir sessões.
- **Controle de Ferramentas**:
  - Aprovar/Rejeitar a execução de uma ferramenta (Confirmation Gate).
  - Interromper a execução de uma ferramenta em andamento.
- **Manipulação de Artefatos**:
  - Abrir artefato no editor.
  - Copiar código do artefato.
  - Versionar artefatos (ver histórico de alterações).

## 3. Estados Observáveis
- **Digitando/Pensando (Typing/Thinking)**: Indicador visual de que o agente está processando.
- **Streaming**: Texto aparecendo em tempo real enquanto é gerado.
- **Aguardando Aprovação (Pending Confirmation)**: Estado onde o agente para e espera o usuário autorizar uma ação (ex: escrever arquivo).
- **Executando Ferramenta (Running Tool)**: Estado onde uma ferramenta está processando e aguarda o resultado.
- **Erro de Resposta**: Exibição de erro de quota, timeout ou falha na API.
- **Sessão Read-Only**: Quando a conversa é um histórico arquivado e não aceita novos inputs.
