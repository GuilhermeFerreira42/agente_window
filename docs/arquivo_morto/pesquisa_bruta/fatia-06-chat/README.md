# Fatia 06 — Chat Carcaça, Janela de Agentes & Pesquisa Bruta OpenClaude

> **Status:** Especificação e Engenharia Reversa Alinhadas à Máquina Real (VS Code 1.135.0) e Raspagem OpenClaude (TypeScript/Bun)  
> **Data:** 2026-10-05  
> **Base de Código:** `platform/apps/workbench-v2/` (Fatia 5 100% homologada)

---

## ⚠️ Regras Sagradas e Perímetro Blindado

1. **Lado Direito INTOCÁVEL:**  
   A `Side Bar` (Explorer, Search, SCM com largura 274px / 170–300px), a `Activity Bar` (48px) e o sash de 4px estão **100% homologados** na Fatia 5. **Zero linhas alteradas**. É expressamente proibido criar colunas extras ou sobrepor a barra de arquivos.
2. **Terminal Inferior INTOCÁVEL:**  
   O `TerminalPanel` (PTY real, xterm.js) continua exatamente como está. **Zero linhas alteradas**.
3. **Escopo da Fatia 06 (Worktree & Isolamento):**  
   - Salas isoladas via `git worktree add` em `.agente_window/worktrees/<slug>`.
   - Chaveamento dinâmico da raiz do terminal pty acompanhando a pasta da sessão ativa.
   - Empty State centralizado de 768px com transição automática para a thread ativa.
   - Remoção de mocks estáticos de `src/data.ts`.

---

## 📚 Documentos de Pesquisa Bruta e Especificação Técnica

### 1. Raspagem OpenClaude & Cline (2026-10-05)

| Arquivo | Descrição e Origem |
|---|---|
| [**`PERSISTENCIA_OPENCLAUDE.md`**](./PERSISTENCIA_OPENCLAUDE.md) | Persistência em JSONL por projeto (`~/.openclaude/projects/<slug>/<sessionId>.jsonl`), envelope de eventos, banco SQLite `knowledge.db` e modelo híbrido para Agente Window |
| [**`WORKTREE_OPENCLAUDE.md`**](./WORKTREE_OPENCLAUDE.md) | Raspagem de `src/utils/worktree.ts`: salas isoladas `.openclaude/worktrees/<slug>`, symlinks anti-bloat de `node_modules`, hooks e troca da raiz do terminal pty |
| [**`PERMISSOES.md`**](./PERMISSOES.md) | Modos de permissão (`default`, `acceptEdits`, `plan`, `fullAccess`), card inline com botões [Permitir], [Não] e [Sempre na Sessão] (HTML/CSS de `chatRenderer.js`) e `checkDoomLoop` |
| [**`ERRO_HANDLING.md`**](./ERRO_HANDLING.md) | Classes de erro (`ClaudeError`, `ShellError`, `AbortError`), protocolo NDJSON (`api_retry`, `rate_limit`, `compact_boundary` 128k) e tratamento de chave expirada e Ollama offline |
| [**`RESET_SESSAO.md`**](./RESET_SESSAO.md) | Confirmação de que **não há botão "Clear Chat"**. O sistema opera com Nova Conversa (`new_session`) e Retomar Conversa (`resume_session`) |
| [**`WORKSPACE_VAZIO.md`**](./WORKSPACE_VAZIO.md) | Comportamento com workspace vazio: empty state de 768px no boot e criação automática de pasta padrão (`~/agente_window/projects/untitled-<timestamp>/`) ao submeter prompt |
| [**`GUI_PROVEDORES_CLONE.md`**](./GUI_PROVEDORES_CLONE.md) | Formulário de provedores estilo Cline integrado aos provedores nativos suportados pelo OpenClaude (`.openclaude-profile.json` e `providerConfig.ts`) |
| [**`PROVIDERS_EXEMPLO.json`**](./PROVIDERS_EXEMPLO.json) | Configuração modelo JSON pronta para uso com OpenAI, Gemini, NVIDIA, Helicone, Ollama e OpenCode Zen |
| [**`PERSISTENCIA_OPENCODE.md`**](./PERSISTENCIA_OPENCODE.md) | Registro da raspagem prévia do OpenCode (Go + sqlc + SQLite) preservado como referência |

---

### 2. Especificação de Interface e Medidas VS Code 1.135.0 (2026-10-04)

1. 📐 [**`GUIA_VISUAL_E_MEDIDAS.md`**](./GUIA_VISUAL_E_MEDIDAS.md):
   - Medidas reais do VS Code 1.135.0 no Windows 11.
   - Empty state centralizado de 768px e ancoragem no rodapé.
   - Dimensões da coluna da esquerda e preservação da coluna direita.

2. ⚙️ [**`COMPORTAMENTO_DOS_BOTOES.md`**](./COMPORTAMENTO_DOS_BOTOES.md):
   - Comportamento do botão `Novo [Ctrl+N]`.
   - Seleção e alternância de sessões reais.
   - Transição automática do estado vazio para a thread ativa.

3. ⚛️ [**`PLANO_DE_COMPONENTES_REACT.md`**](./PLANO_DE_COMPONENTES_REACT.md):
   - Adaptação dos componentes React existentes (`SessionSidebar.tsx`, `SessionLanding.tsx`, `ChatPanel.tsx`, `ChatInput.tsx`) sem quebrar `App.tsx` nem a arquitetura LEGO.
