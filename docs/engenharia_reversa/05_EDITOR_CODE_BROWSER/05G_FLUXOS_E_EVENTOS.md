# 05G — Fluxos e Eventos: Editor / Code / Browser

## Fluxo 1 — Abrir arquivo pelo Explorer
1. Explorer emite `file.openRequested`.
2. `EditorService.open()` resolve o recurso.
3. Grupo ativo abre ou foca a aba.
4. Visual correspondente renderiza o conteúdo.

## Fluxo 2 — Split de grupo
- comando de split chama `EditorService.split(direction)`;
- workbench cria novo grupo;
- foco é movido segundo a regra definida;
- abas e histórico são atualizados.

## Eventos mínimos
| Evento | Efeito |
|---|---|
| `editor.resourceOpened` | nova aba ou foco em aba existente |
| `editor.groupSplit` | área central redistribui espaço |
| `editor.revealRequested` | viewport navega para linha ou coluna |
| `editor.dirtyChanged` | UI atualiza indicador de arquivo modificado |

## Integrações críticas
- Editor -> Filesystem para leitura e escrita;
- Editor -> Theme para tokens;
- Editor -> Chat para contexto e apply edits;
- Editor -> Command system para save, find, format e reveal.
