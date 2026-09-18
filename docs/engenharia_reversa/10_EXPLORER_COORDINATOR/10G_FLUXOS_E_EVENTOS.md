# 10G — Fluxos e Eventos: Explorer Coordinator

## Fluxo 1 — Expandir pasta
1. Usuário expande um diretório.
2. Explorer chama `ExplorerService.expand(uri)`.
3. O serviço consulta `FileSystemPort.list(uri)`.
4. A árvore recebe os filhos e atualiza apenas o ramo expandido.

## Fluxo 2 — Abrir arquivo
1. Usuário dá duplo clique em um arquivo.
2. Explorer chama `open(uri)`.
3. O serviço delega a abertura ao `EditorService`.
4. O grupo ativo passa a focar a aba correspondente.

## Fluxo 3 — Auto-reveal
- editor muda o recurso ativo;
- Explorer recebe `reveal(uri)`;
- a árvore expande os ancestrais necessários;
- o item correspondente recebe foco visual.

## Eventos mínimos
| Evento | Efeito |
|---|---|
| `explorer.nodeExpanded` | ramo da árvore fica visível |
| `explorer.fileOpened` | editor central recebe foco |
| `explorer.selectionChanged` | ações contextuais e menus recalculam contexto |
| `fs.changed` | árvore sincroniza sem reload completo |
