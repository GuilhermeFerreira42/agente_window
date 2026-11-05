# WORKTREE_OPENCLAUDE - Raspagem Real de Worktree e Isolamento

> **Data:** 2026-10-05  
> **Fonte:** Código-fonte em `C:\Users\Usuario\Desktop\ARENA\a\openclaude\src\utils\worktree.ts` e `src/utils/sessionRestore.ts`  
> **Referência da Tarefa:** Tarefa 2 e Fatia 06 de `Decisoes-Finais-Antigravity.md` ("Worktree - caixinha criar sala isolada + troca raiz terminal")

---

## 1. Visão Geral da Arquitetura de Worktree

O OpenClaude implementa um sistema completo e maduro de **Worktrees do Git** para permitir que sessões do agente trabalhem em branches e diretórios fisicamente isolados da árvore de trabalho principal do usuário. Isso evita colisões de arquivos, conflitos com o editor do desenvolvedor e garante reversibilidade total.

---

## 2. Estrutura de Diretórios e Validação

### Caminho da Worktree
As salas isoladas são criadas dentro do diretório do projeto:
`<repo-root>/.openclaude/worktrees/<worktree-name>/`
*(ou `.claude/worktrees/<worktree-name>/` em modo legado)*

### Validação de Nome e Proteção contra Traversal (`validateWorktreeSlug`)
Para impedir ataques de traversal (`../../`) que escapem para pastas do sistema operacional:
```ts
const VALID_WORKTREE_SLUG_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const MAX_WORKTREE_SLUG_LENGTH = 64;

export function validateWorktreeSlug(slug: string): void {
  if (slug.length > MAX_WORKTREE_SLUG_LENGTH) {
    throw new Error(`Invalid worktree name: must be 64 characters or fewer`);
  }
  for (const segment of slug.split('/')) {
    if (segment === '.' || segment === '..') {
      throw new Error(`Invalid worktree name: must not contain "." or ".."`);
    }
    if (!VALID_WORKTREE_SLUG_SEGMENT.test(segment)) {
      throw new Error(`Invalid worktree name: each segment must contain only letters, digits, dots, underscores, and dashes`);
    }
  }
}
```

---

## 3. Criação e Configuração da Worktree (`git worktree add`)

O OpenClaude executa os seguintes passos ao inicializar uma sessão em modo isolado:
1. Identifica a branch atual e o commit HEAD da raiz principal.
2. Cria o diretório pai recursivamente (`mkdirRecursive`).
3. Executa o comando Git:
   ```bash
   git worktree add -b <new-branch> <worktree-path> <head-commit>
   ```
4. Se o usuário tiver hooks configurados (`worktreeCreateHook`), dispara o script customizado de setup da sala.

---

## 4. Otimização Anti-Bloat: Symlinks de Pastas Pesadas (`symlinkDirectories`)

Para evitar a duplicação massiva de gigabytes em disco (ex: `node_modules`, `.venv`, `target`, `vendor`):
```ts
async function symlinkDirectories(
  repoRootPath: string,
  worktreePath: string,
  dirsToSymlink: string[]
): Promise<void> {
  for (const dir of dirsToSymlink) {
    const sourcePath = join(repoRootPath, dir);
    const destPath = join(worktreePath, dir);
    await symlink(sourcePath, destPath, 'dir');
  }
}
```
Isso garante que ferramentas de build e typechecking funcionem imediatamente na sala isolada sem necessidade de executar `npm install` novamente.

---

## 5. Modelo de Sessão (`WorktreeSession`) e Restauração

O estado da worktree é acoplado ao ciclo de vida da sessão:
```ts
export type WorktreeSession = {
  originalCwd: string;            // Diretório onde o usuário abriu o projeto
  worktreePath: string;           // Caminho absoluto da sala isolada
  worktreeName: string;           // Nome/slug da sala
  worktreeBranch?: string;        // Branch git criada para a sessão
  originalBranch?: string;        // Branch de onde a sessão partiu
  originalHeadCommit?: string;    // Commit base
  sessionId: string;              // ID da conversa vinculada
  creationDurationMs?: number;
};
```
Ao retomar a conversa (`--resume` ou seleção na lista de conversas), a função `restoreWorktreeSession(session)` restaura o ponteiro `currentWorktreeSession` e faz o chaveamento do diretório de trabalho ativo.

---

## 6. Integração com o Terminal (`pty-server`) no Agente Window

Conforme estipulado na **Pergunta 12** e **Fatia 06** de `Decisoes-Finais-Antigravity.md`:
1. Quando uma conversa com worktree for ativada no chat, o serviço de terminal emite uma mensagem para o processo do terminal pty (`/terminal/resize`, `/terminal/input` ou comando interno de `cd`).
2. O terminal inferior tem seu `cwd` atualizado automaticamente para `worktreeSession.worktreePath`.
3. Ao alternar de conversa para uma sessão no workspace raiz ou em outra sala, a raiz do terminal é chaveada imediatamente para acompanhar a sessão ativa.
