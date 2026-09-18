# 01D — GAP ANALYSIS: TERMINAL

Comparação entre a implementação atual do projeto AGENTE WINDOW e a especificação do VS Code.

## 1. Tabela de Comparação

| Funcionalidade | VS Code (Target) | AGENTE WINDOW (Atual) | Status | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **Conectividade PTY** | WebSocket bridge robusta com reconnect | WebSocket bridge via `pty-server` | **Igual** | A base de comunicação via WS está implementada. |
| **Múltiplas Instâncias** | Suporte a N instâncias com chaves únicas | Suporte via `TerminalInstance` no frontend | **Parcial** | O frontend rastreia, mas a gestão de ciclo de vida é simples. |
| **Divisão de Painéis (Split)** | Splits verticais/horizontais dinâmicos | Único painel por sessão | **Ausente** | Falta a lógica de `SplitPaneContainer`. |
| **Seletor de Perfis** | Detecção automática de shells (bash, zsh, pwsh) | Shell fixo ou configurado via env | **Parcial** | Existe `shellDetector.js`, mas sem UI de escolha para o usuário. |
| **Redimensionamento** | Sincronizado com precisão de pixels/caracteres | Básico via `sendResize` no hook | **Parcial** | Funciona, mas não tem a precisão de cálculo do VS Code. |
| **Ciclo de Vida (Exit)** | Reporta exit code e aguarda interação | Fecha a sessão no `onExit` | **Divergente** | O AGENTE WINDOW remove a sessão imediatamente; VS Code a mantém para auditoria. |
| **Persistência** | Restaura sessões após reload da janela | Perda de estado no reload | **Ausente** | Não há salvamento de estado de sessões ativas. |
| **Shell Integration** | Suporte a sequências de escape para prompt/cwd | Sem integração de shell | **Ausente** | Não detecta mudança de diretório ou comando executado. |

## 2. Prioridades de Implementação (Gaps Críticos)
1. **Implementação de Splits**: Essencial para a experiência de "Workbench".
2. **Ciclo de Vida de Encerramento**: Alterar para manter a janela aberta após o exit do processo.
3. **UI de Seletor de Perfis**: Permitir que o usuário escolha o shell.
4. **Persistência de Sessão**: Implementar rastreamento de IDs de sessão para reconexão automática.
