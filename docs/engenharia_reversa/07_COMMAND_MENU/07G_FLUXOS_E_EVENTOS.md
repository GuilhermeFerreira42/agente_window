# 07G — Fluxos e Eventos: Command Menu

## Fluxo principal — Executar comando pela palette
1. Usuário abre command palette.
2. Sistema lista comandos visíveis conforme contexto.
3. Usuário seleciona um item.
4. `CommandService.execute(commandId)` é disparado.
5. Handler correspondente executa na camada de lógica.

## Eventos mínimos
| Evento | Efeito |
|---|---|
| `command.registered` | comando passa a existir na palette e no menu |
| `context.changed` | menus são recalculados |
| `command.executed` | ação rastreável e auditável |

## Integrações críticas
- Command system -> todos os módulos via handlers.
- Command system -> Workbench e UI para atalhos e palette.
