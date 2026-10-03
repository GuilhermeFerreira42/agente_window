# 01F — Contrato de Implementação: Terminal

## Objetivo
Definir como o subsistema Terminal deve ser implementado no AGENTE WINDOW sem violar a arquitetura de 4 camadas.

## Responsabilidade do módulo
Receber comandos de criação e interação de terminal, orquestrar instâncias PTY reais, manter foco e estado por sessão e renderizar a saída via xterm.

## Fronteiras obrigatórias
- **UI**: renderiza tabs, split panes, foco e saída.
- **Workbench**: hospeda o painel, maximiza/restaura e distribui espaço.
- **Lógica**: gerencia instâncias, grupos, sessão ativa e snapshots.
- **Runtime**: cria PTY, escreve, redimensiona, limpa e encerra processos.

## Dependências permitidas
- `WorkbenchLayoutService`
- `TerminalRuntimePort`
- `PersistencePort`
- `FileSystemPort` para validar CWD e perfis

## Dependências proibidas
- UI do Terminal importar diretamente `node-pty`
- Runtime conhecer componentes React
- Chat ou Explorer manipular estado interno de terminal sem serviço intermediário

## Contratos públicos obrigatórios
```ts
interface TerminalSessionState {
  sessionId: string;
  terminalIds: string[];
  activeTerminalId: string | null;
  groups: Array<{ groupId: string; terminalIds: string[]; direction?: 'horizontal' | 'vertical' }>;
}
```

```ts
interface TerminalServiceContract {
  createTerminal(input: { sessionId: string; cwd: string; profileId: string }): Promise<{ terminalId: string }>;
  splitTerminal(input: { sourceTerminalId: string; direction: 'horizontal' | 'vertical' }): Promise<{ terminalId: string }>;
  focusTerminal(input: { terminalId: string }): void;
  closeTerminal(input: { terminalId: string }): Promise<void>;
}
```

## Eventos mínimos
| Evento | Origem | Payload mínimo | Destino |
|---|---|---|---|
| `terminal.created` | Lógica | `terminalId`, `sessionId`, `profileId` | UI / persistência |
| `terminal.output` | Runtime | `terminalId`, `chunk` | UI |
| `terminal.exit` | Runtime | `terminalId`, `exitCode` | UI / Lógica |
| `terminal.cwd` | Runtime | `terminalId`, `cwd` | Lógica |
| `terminal.focusChanged` | UI/Lógica | `terminalId` | UI |

## Persistência
- Persistir associação `sessionId -> terminalIds -> layout do grupo`.
- Persistir apenas snapshot leve de estado visual; nunca serializar o processo PTY em si.
- Ao restaurar, a lógica deve reanexar ou recriar a instância de forma explícita.

## Proibições do módulo
- não usar terminal fake na implementação final da V1;
- não misturar buffer visual com fonte de verdade do processo;
- não perder foco ou vínculo de input ao alternar sessão;
- não limpar automaticamente a aba ao receber `exit`.
