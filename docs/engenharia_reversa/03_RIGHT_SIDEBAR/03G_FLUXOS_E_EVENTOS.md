# 03G — Fluxos e Eventos: Right Sidebar

## Fluxo principal — mostrar view auxiliar
1. Comando ou clique aciona abertura da barra auxiliar.
2. Serviço marca a barra como visível.
3. Layout recalcula o espaço.
4. View registrada é montada no host.

## Eventos mínimos
| Evento | Efeito esperado |
|---|---|
| `auxiliaryBar.visibilityChanged` | layout persiste o novo estado |
| `auxiliaryView.activated` | conteúdo correto é exibido |
| `auxiliaryBar.maximized` | painel assume modo expandido quando permitido |

## Integrações
- Right Sidebar -> Layout.
- Right Sidebar -> Theme.
- Right Sidebar -> Command/Menu via context keys.
