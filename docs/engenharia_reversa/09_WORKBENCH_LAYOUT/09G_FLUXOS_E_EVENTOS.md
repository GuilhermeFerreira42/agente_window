# 09G — Fluxos e Eventos: Workbench Layout

## Fluxo 1 — Toggle de parte
1. Usuário dispara comando ou clique de visibilidade.
2. `WorkbenchLayoutService.togglePart()` altera o estado.
3. A grade redistribui espaço.
4. Os módulos visíveis são rerenderizados ou reexpostos sem perder o estado permitido.

## Fluxo 2 — Resize manual
1. Usuário arrasta divisor.
2. Layout calcula nova dimensão.
3. Snapshot transitório é atualizado.
4. Componentes filhos recebem o novo espaço disponível.

## Fluxo 3 — Maximizar e restaurar
- comando de maximização marca uma parte como dominante;
- layout oculta ou comprime partes secundárias conforme a regra;
- restaurar recompõe a geometria anterior.

## Eventos mínimos
| Evento | Efeito |
|---|---|
| `layout.partToggled` | workbench redistribui espaço |
| `layout.resized` | componentes medem novamente o container |
| `layout.maximized` | parte ocupa a área expandida |
| `layout.restored` | geometria anterior volta |

## Integrações críticas
- Workbench -> Terminal e Editor para resize.
- Workbench -> Sidebars e Auxiliary Bar para visibilidade.
- Workbench -> Persistência para serialização do snapshot.
