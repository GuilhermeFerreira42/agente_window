# 04F — Contrato de Implementação: Center Chat

## Objetivo
Definir o contrato operacional do chat central e da orquestração de sessões e agente.

## Responsabilidade do módulo
Receber mensagens do usuário, resolver contexto, iniciar turnos no runtime do agente, renderizar streaming, solicitar aprovação de tools e manter histórico por sessão.

## Contratos públicos mínimos
```ts
interface ChatTurnInput {
  sessionId: string;
  text: string;
  attachments: string[];
  mode?: string;
  providerId?: string;
}

interface ChatEvent {
  type: 'thinking' | 'chunk' | 'toolPending' | 'toolResult' | 'completed' | 'failed';
  sessionId: string;
  turnId: string;
}
```

## Responsabilidades por camada
- UI: lista de mensagens, composer, anexos, tool gate e artefatos.
- Lógica: sessões, turns, unread, drafts e histórico.
- Runtime: provider, modelo, tools e streaming.

## Regras obrigatórias
- UI não fala com provider diretamente.
- tool calls com aprovação obrigatória só seguem após consentimento.
- sessão é a unidade de isolamento de histórico, rascunho e anexos.
- respostas truncadas devem suportar continuação quando o runtime permitir.

## Proibições
- misturar estado de duas sessões;
- executar tool aprovada implicitamente;
- concatenar contexto bruto sem resolução estruturada quando houver anexos e referências.
