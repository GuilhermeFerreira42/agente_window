# WORKSPACE_VAZIO - Comportamento com Workspace Vazio / Sem Pasta

> **Data:** 2026-10-05  
> **Fonte:** `C:\Users\Usuario\Desktop\ARENA\a\openclaude\vscode-extension\openclaude-vscode\src\chat\sessionManager.js`  
> **Referência:** Pergunta 20 de `Decisoes-Finais-Antigravity.md` ("O que acontece quando usuário inicia conversa sem selecionar workspace/pasta?")

---

## 1. Como o OpenClaude Lida com Falta de Workspace

No código do OpenClaude (`sessionManager.js`):
```javascript
async listSessions() {
  const projectDir = this._cwd ? getProjectDir(this._cwd) : null;
  // Se não há workspace aberto (_cwd === null), busca sessões de todos os diretórios conhecidos:
  const dirs = projectDir ? [projectDir] : await this._allProjectDirs();
  const sessions = [];
  for (const dir of dirs) {
    const items = await this._readSessionDir(dir);
    sessions.push(...items);
  }
  sessions.sort((a, b) => b.timestamp - a.timestamp);
  return sessions;
}
```

No CLI do OpenClaude:
- Se não for um repositório git, o diretório de trabalho padrão (`process.cwd()`) é usado como pasta base e mapeado via `sanitizePath`.
- Se a IA precisar criar arquivos sem que haja uma raiz definida, ela opera relativa ao diretório do processo.

---

## 2. Decisão e Especificação para a Fatia 06 (06.2 e 06.3)

O Agente Window opera com uma interface gráfica visual com Explorer à direita e Terminal na parte inferior. Por isso, precisa de um diretório de arquivos real para exibir na árvore do Explorer e rodar o terminal.

### Regra do Empty State Central de 768px (Fatia 06.3):
1. **Componente Já Existente no Workbench:**
   - A tela vazia central de 768px com a mensagem *"Como posso ajudar?"* e atalhos rápidos **JÁ EXISTE** implementada em `platform/apps/workbench-v2/src/components/chat/SessionLanding.tsx`.
   - **Não precisa de print externo ou recriação:** sua fidelidade visual foi 100% validada no **Vídeo 1** enviado pelo usuário ao apagar todas as conversas. O trabalho é estritamente **plugar** a lógica real de sessões e worktree a esse componente.
2. **Acionamento pelo `+` GLOBAL:**
   - O botão `+` GLOBAL localizado no topo do shell ou na barra superior do chat dispara a desmontagem da thread ativa e exibe imediatamente o Empty State de 768px.
3. **Criação de Worktree Isolado ao Submeter Prompt (Fatia 06.2):**
   - Ao digitar o primeiro prompt no Empty State de 768px e submeter:
     - O sistema gera automaticamente um slug com timestamp: `untitled-<timestamp>` (ex: `untitled-20261005-173000`).
     - Executa `git worktree add -b untitled-<timestamp> <path> HEAD` para criar uma pasta de trabalho completamente isolada.
     - Persiste a nova sessão e seu slug no SQLite (`~/.agente_window/agente_window.db`).
     - Transita fluidamente do Empty State para a thread ativa de chat com o input ancorado no rodapé.
     - Atualiza a raiz do Explorer e chaveia o `cwd` do Terminal PTY para a nova pasta da worktree.
4. **`+` Dentro do Projeto Existente:**
   - Quando o usuário clica em `+` na pasta de um projeto já aberto na barra lateral, ele **não** cria novo worktree; cria uma nova sessão vinculada ao mesmo worktree/slug existente, gerando um novo arquivo JSONL no mesmo diretório do projeto.

