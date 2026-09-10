# CAMADA C — MAPA DE CÓDIGO DE REFERÊNCIA (Chat/Agent Session)

## 1. Camada de Interface e Serviços (Workbench)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Orquestrador de Sessão | `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/agentHostSessionHandler.ts` | `AgentHostSessionHandler` | Ponte entre o estado do protocolo do Agent Host e a UI de Chat. |
| Gestão de Sessões | `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/agentHostSessionListController.ts` | `AgentHostSessionListController` | Controle da lista de sessões e navegação entre elas. |
| UI de Entrada de Chat | `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/agentHostChatInputPicker.ts` | `AgentHostChatInputPicker` | Implementação do campo de texto e seletores de contexto. |
| Integração com Terminal | `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/agentHostTerminalContribution.ts` | `AgentHostTerminalContribution` | Sincroniza ações do chat com a abertura de terminais. |

## 2. Camada de Protocolo e Estado (Platform)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Definição de Estado | `src/vs/platform/agentHost/common/state/sessionState.ts` | `SessionState`, `Turn`, `Message` | Modelos imutáveis que descrevem a conversa, turnos e mensagens. |
| Ações de Sessão | `src/vs/platform/agentHost/common/state/sessionActions.ts` | `ClientSessionAction` | Definição de comandos enviados do cliente para o servidor (ex: `turnStarted`). |
| Protocolo de Comunicação | `src/vs/platform/agentHost/common/state/sessionProtocol.ts` | `ProtocolError` | Definições de erros e handshakes do protocolo Agent Host. |
| Gestão de Conexão | `src/vs/platform/agentHost/common/remoteAgentHostService.ts` | `IRemoteAgentHostService` | Serviço de transporte para comunicação com o Agent Host remoto. |

## 3. Adaptadores de Progressão (Adapter Layer)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Estado $\rightarrow$ Progressão | `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/stateToProgressAdapter.ts` | `activeTurnToProgress` | Função crítica que converte o estado imutável do protocolo em partes de progresso (`IChatProgress`) para a UI. |
| Processamento de Turnos | `src/vs/workbench/contrib/chat/browser/agentSessions/agentHost/stateToProgressAdapter.ts` | `turnsToHistory` | Converte turnos finalizados em itens de histórico de conversa. |
