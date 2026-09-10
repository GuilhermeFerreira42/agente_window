# CAMADA D — GAP VS ESTADO ATUAL (Chat/Agent Session)

| Comportamento | VS Code (Referência) | AGENTE WINDOW (Atual) | Status | Ação Necessária |
|---|---|---|---|---|
| **Streaming de Resposta** | Texto e raciocínio (Thinking) renderizados em tempo real via WebSocket. | Respostas estáticas ou simples. | `Parcial` | Implementar loop de observação de estado via `AgentHostSessionHandler`. |
| **Gestão de Sessões** | Múltiplas sessões independentes com persistência em banco de dados. | Sessão única efêmera. | `Ausente` | Implementar `AgentHostSessionListController` e storage de sessões. |
| **Confirmation Gates** | Pausa na execução para aprovação de ferramentas sensíveis. | Execução automática sem validação. | `Ausente` | Implementar `ToolCallPendingConfirmationState` e UI de aprovação. |
| **Subagentes Recursivos** | Capacidade de um agente spawnar outro, com observação aninhada. | Agente linear simples. | `Ausente` | Implementar `subAgentInvocationId` e observadores recursivos de turnos. |
| **Artefatos Dinâmicos** | Painel lateral que renderiza versões de código e diagramas. | Texto puro no chat. | `Ausente` | Implementar `ArtifactsView` e sistema de versionamento de arquivos gerados. |
| **Sincronização de Contexto** | Anexos de arquivos e símbolos vinculados a cada turno. | Contexto manual. | `Parcial` | Implementar `MessageAttachment` e integração com `FileExplorer`. |
| **Recuperação de Estado** | Restauração completa de turnos e buffer via snapshot. | Perda de estado ao recarregar. | `Ausente` | Implementar `provideChatSessionContent` e `AgentHostSnapshotController`. |
