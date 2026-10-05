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

## 2. Decisão e Especificação para o Agente Window (Fatia 06 e 09)

O Agente Window opera com uma interface gráfica visual com Explorer à direita e Terminal na parte inferior. Por isso, precisa de um diretório de arquivos real para exibir na árvore do Explorer e rodar o terminal.

### Regra do Workspace Vazio:
1. **Boot Inicial:**
   - Se o usuário abrir o Agente Window sem nenhuma pasta selecionada, a interface abre no **Empty State Central de 768px**.
   - A Side Bar (Explorer) exibe o estado padrão de boas-vindas com botão "Open Folder" / "Abrir Pasta".
2. **Ao Submeter Mensagem sem Pasta Aberta:**
   - O Agente Window cria automaticamente uma pasta de projeto temporária/dedicada em:
     - **Windows:** `%USERPROFILE%\agente_window\projects\untitled-<timestamp>\`
     - **Linux/Mac:** `~/agente_window/projects/untitled-<timestamp>/`
   - Essa pasta é automaticamente definida como a raiz ativa do Explorer e a raiz do terminal pty.
   - Qualquer arquivo criado pela IA (`write_file`, anexo, `upload/`) é salvo dentro desse diretório.
   - O usuário pode renomear ou migrar a pasta posteriormente sem perder o histórico do chat.
3. **Se o Usuário já tem Pasta Selecionada (ou Worktree):**
   - Usa diretamente a pasta selecionada ou a pasta da worktree criada na Fatia 06.
