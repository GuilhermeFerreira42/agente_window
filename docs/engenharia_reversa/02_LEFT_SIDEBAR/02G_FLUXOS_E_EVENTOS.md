# 02G — Fluxos e Eventos: Left Sidebar

## Fluxo principal — abrir um container
1. Usuário clica em um item da Activity Bar.
2. UI aciona `activateContainer(id)`.
3. Serviço resolve se o container está registrado e visível pelo contexto.
4. Workbench exibe o container correspondente.
5. Context keys e ações da view são atualizadas.

## Eventos observáveis
| Evento | Payload mínimo | Consumidor |
|---|---|---|
| `viewContainer.activated` | `id` | host da sidebar, command/menu |
| `viewContainer.badgeChanged` | `id`, `count` | activity bar |
| `leftSidebar.widthChanged` | `pixels` | layout persistence |

## Integrações críticas
- Left Sidebar -> Workbench layout para show/hide/resize.
- Left Sidebar -> Explorer, Search e views registradas.
- Left Sidebar -> Command system para ações contextuais.
