// Fatia 06.2 implementará aqui a criação de worktrees isolados.
// Mantido como módulo explícito para preservar a fronteira do serviço sem
// antecipar execução de `git worktree add` durante a Fatia 06.1.
export interface WorktreeDescriptor {
  slug: string
  path: string
}
