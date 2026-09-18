# 06G — Fluxos e Eventos: Filesystem I/O

## Fluxo 1 — Salvar arquivo
1. Editor monta `writeFile(uri, content, atomic: true)`.
2. Filesystem enfileira a operação pelo recurso.
3. Runtime escreve em arquivo temporário.
4. Runtime faz rename atômico.
5. Evento de alteração é emitido.

## Fluxo 2 — Watcher
- módulo consumidor registra `watch(uri)`;
- provider observa o recurso;
- mudanças externas geram `FileChangeEvent`;
- Explorer e Editor atualizam o estado sem reload manual.

## Eventos mínimos
| Evento | Consumidores típicos |
|---|---|
| `fs.changed` | Explorer, Editor |
| `fs.deleted` | Explorer, Editor |
| `fs.renamed` | Explorer, Editor |

## Integrações críticas
- Filesystem -> Explorer para navegação.
- Filesystem -> Editor para open/save.
- Filesystem -> Terminal para CWD e shell validation.
