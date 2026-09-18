# 08G — Fluxos e Eventos: Theme & Token

## Fluxo principal — Troca de tema
1. Usuário escolhe um tema.
2. `ThemeService.applyTheme(themeId)` resolve o conjunto de tokens.
3. CSS variables são atualizadas no `:root`.
4. Componentes reativos refletem a mudança sem hard reload.

## Eventos mínimos
| Evento | Efeito |
|---|---|
| `theme.changed` | componentes themable atualizam aparência |
| `tokens.exported` | CSS variables são publicadas |

## Integrações críticas
- Theme -> Workbench shell.
- Theme -> Editor syntax e token colors.
- Theme -> Chat, sidebars, command menu e terminal.
