# CAMADA D — GAP VS ESTADO ATUAL (Terminal)

| Comportamento | VS Code (Referência) | AGENTE WINDOW (Atual) | Status | Ação Necessária |
|---|---|---|---|---|
| **Lançamento de Shell** | Suporte a múltiplos perfis detectados automaticamente. | Lançamento simples de shell fixo. | `Parcial` | Implementar `TerminalProfileService` para detecção de shells. |
| **Split de Tela** | Divisão dinâmica de painéis com redimensionamento via sash. | Terminal único, sem suporte a split. | `Ausente` | Implementar `ITerminalGroupService` e layout de grid. |
| **Persistência de Sessão** | Processos PTY persistem após reload da UI (Revive). | Processo morre ao fechar a sessão/janela. | `Ausente` | Implementar `PersistentTerminalProcess` e serialização de buffer. |
| **Gestão de Abas** | Lista de abas com ícones, cores e rename. | Sem sistema de abas para múltiplos terminais. | `Ausente` | Implementar `TerminalTabsList` e gestão de instâncias. |
| **Menu de Contexto** | Menu rico com ações de cópia/colagem e comandos. | Menu básico ou inexistente. | `Parcial` | Implementar `TerminalContextMenu` e mapear ações para o PTY. |
| **Sincronização de CWD** | Sincroniza o diretório atual entre shell e UI. | CWD é definido apenas no start. | `Parcial` | Implementar detecção de CWD via shell integration. |
| **Redimensionamento** | Ajuste dinâmico de cols/rows baseado no tamanho do DOM. | Tamanho fixo ou ajuste simples. | `Parcial` | Implementar loop de resize sincronizado com xterm.js. |
| **Comandos de UI** | Comandos registrados via Context Keys. | Comandos imperativos simples. | `Divergente` | Implementar sistema de `TerminalActions` baseado em contexto. |
