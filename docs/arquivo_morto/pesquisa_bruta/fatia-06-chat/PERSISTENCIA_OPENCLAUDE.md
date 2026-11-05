# PERSISTENCIA_OPENCLAUDE - Raspagem Real do OpenClaude

> **Data:** 2026-10-05  
> **Fonte:** Código-fonte em `C:\Users\Usuario\Desktop\ARENA\a\openclaude\`  
> **Arquivos analisados:** `src/utils/sessionStorage.ts`, `src/utils/sessionRestore.ts`, `src/history.ts`, `src/utils/envUtils.ts`, `src/utils/knowledgeGraph.ts`, `vscode-extension/openclaude-vscode/src/chat/sessionManager.js`

---

## 1. Stack e Arquitetura de Persistência do OpenClaude

Diferente do repositório OpenCode em Go, o **OpenClaude** é implementado em **TypeScript (Bun / Node)** e adota uma arquitetura híbrida de persistência:
- **Transcripts de Sessão:** Arquivos **JSONL** individuais por sessão, agrupados por diretório de projeto.
- **Histórico Global:** Arquivo sequencial `history.jsonl` contendo prompts de todas as sessões.
- **Memória & Conhecimento:** Estrutura híbrida baseada em arquivos markdown (`CLAUDE.md`, `MEMORY.md`), grafos em JSON (`knowledge_graph.json`) e base legada/auxiliar em **SQLite** (`knowledge.db`).
- **Replay Index:** Arquivos de índice rápido (`.replay-index.json`) para reconstrução veloz de sessões.

---

## 2. Localização dos Arquivos no Sistema de Arquivos

A função `resolveConfigDir()` e `getProjectsDir()` (`src/utils/envUtils.ts`) define os caminhos:

| Tipo de Dado | Caminho Padrão (Windows) | Caminho Fallback / Legado |
|---|---|---|
| **Diretório Raiz** | `%USERPROFILE%\.openclaude\` | `%USERPROFILE%\.claude\` |
| **Projetos & Sessões** | `%USERPROFILE%\.openclaude\projects\<sanitized-cwd>\` | `%USERPROFILE%\.claude\projects\<sanitized-cwd>\` |
| **Histórico Global** | `%USERPROFILE%\.openclaude\history.jsonl` | `%USERPROFILE%\.claude\history.jsonl` |
| **Debug / Logs** | `%USERPROFILE%\.openclaude\debug\<sessionId>.txt` | `%USERPROFILE%\.claude\debug\<sessionId>.txt` |
| **Perfis de IA** | `<raiz-do-projeto>\.openclaude-profile.json` | `%USERPROFILE%\.openclaude\settings.json` |

### Sanitização do Diretório do Projeto (`sanitizePath`)
O OpenClaude mapeia cada pasta de projeto para um slug previsível:
```ts
function sanitizePath(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9]/g, '-');
  if (sanitized.length <= 80) return sanitized;
  const hash = simpleHash(name);
  return sanitized.slice(0, 80) + '-' + hash;
}
```
Exemplo: `C:\Users\Usuario\Desktop\ARENA\a` vira `C--Users-Usuario-Desktop-ARENA-a`.

---

## 3. Formato do Arquivo de Sessão (`<sessionId>.jsonl`)

Cada linha do arquivo `<sessionId>.jsonl` é um envelope JSON que registra incrementalmente todos os eventos da sessão:

```json
{"type":"user","message":{"role":"user","content":"Criar componente Button"},"uuid":"msg-001","timestamp":1728140000000}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Vou criar o arquivo..."},{"type":"tool_use","id":"call_123","name":"Write","input":{"file_path":"src/Button.tsx","content":"..."}}]},"uuid":"msg-002","timestamp":1728140002000}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"call_123","content":"File created successfully","is_error":false}]},"uuid":"msg-003","timestamp":1728140003000}
{"type":"file_history_snapshot","snapshot":{"path":"src/Button.tsx","content":"...","version":1}}
{"type":"compact_boundary","reason":"context_window_limit","tokens":128000}
```

### Tipos de Entradas Armazenadas no JSONL:
1. `user`: Prompts do usuário e retornos de tool (`tool_result`).
2. `assistant`: Respostas da IA, blocos de pensamento (*thinking*) e chamadas de ferramenta (`tool_use`).
3. `system`: Mensagens de instrução do sistema e limites de contexto.
4. `file_history_snapshot`: Snapshots dos arquivos antes e depois de edições (permite rollback de arquivos alterados).
5. `compact_boundary`: Ponto de corte e resumo para compactação de contexto quando atinge o teto da janela de contexto.
6. `attribution_snapshot`: Rastreamento de autoria de commits e edições.
7. `goal_state`: Estado de metas longas e sub-tarefas.

---

## 4. Banco SQLite no OpenClaude (`knowledge.db`)

Para persistência estruturada de grafo de conhecimento e busca semântica/vetorial local, o OpenClaude utiliza `knowledge.db` localizado em:
`%USERPROFILE%\.openclaude\projects\<sanitized-cwd>\knowledge.db`

Schema do banco de conhecimento:
- Tabela `entities`: IDs, nomes, tipos de entidades e metadados.
- Tabela `observations`: Fatos extraídos do projeto pelo agente ao longo das conversas.
- Tabela `relations`: Conexões semânticas entre entidades e observações.

---

## 5. Implementação da Persistência Híbrida na Fatia 06 (Fatia 06.1)

Para o Agente Window, a implementação real da persistência na Fatia 06.1 resolve definitivamente o chat como funcional:

### 1. Limpeza de Mocks e Resíduos Visuais (Vídeo 00:10–00:30):
- **Remoção de Mocks:** Desconectar e remover o array simulado `initialSessions` e mensagens estáticas de `src/data.ts`.
- **Remoção de Botões Legados do Rodapé:** Excluir os botões obsoletos no rodapé da barra lateral esquerda observados no vídeo do usuário (*"Buscar personalizações"*, *"Base de..."*), mantendo apenas o botão padrão de Personalizações (28px) conforme D6/D27.

### 2. Estrutura Híbrida SQLite + JSONL:
- **Banco Central SQLite (`~/.agente_window/agente_window.db`):**
  - Tabela `sessions`: `id`, `slug`, `title`, `workspace_path`, `worktree_path`, `message_count`, `created_at`, `updated_at`.
  - Utilizado para alimentação do Session Picker, busca instantânea e agrupamento de projetos.
- **Transcripts em JSONL por Projeto:**
  - Caminho estruturado: `~/.agente_window/projects/<slug>/<sessionId>.jsonl`
  - Métodos extraídos do OpenClaude:
    - `getProjectsDir()`: Retorna o caminho base `~/.agente_window/projects/`.
    - `sanitizePath(workspace_path)`: Converte o caminho da pasta em slug seguro de até 80 caracteres.
    - `_allProjectDirs()`: Varre os diretórios de projeto para listar todas as sessões disponíveis.
- **Múltiplos Chats por Pasta:**
  - Se o usuário criar 3 conversas no mesmo projeto (`+` dentro do projeto), são gerados 3 arquivos `.jsonl` dentro do mesmo diretório `<slug>/`.
- **Critério de Saída da 06.1:**
  - Ao recarregar a aplicação (F5 / restart do Vite 5174), a lista de conversas, mensagens e sessões anteriores persistem e são restauradas perfeitamente.

