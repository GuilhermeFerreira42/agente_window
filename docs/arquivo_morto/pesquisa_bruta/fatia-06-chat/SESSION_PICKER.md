# SESSION_PICKER - Especificação do Buscador e Seletor de Sessões

> **Data:** 2026-10-05  
> **Referência:** Achado crítico do usuário nos vídeos de referência (00:36–01:17) e print da barra superior `@Nova sessão` com modal central.  
> **Localização:** `docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/SESSION_PICKER.md`

---

## 1. Visão Geral e Descoberta Crítica

A análise dos fluxos de trabalho no VS Code real e OpenClaude revelou a distinção fundamental entre os dois botões de criação:

1. **Botão `+` GLOBAL (Topo do Shell):**
   - Cria uma **nova sala isolada** (novo Worktree do Git / nova pasta com slug `untitled-<timestamp>`).
   - Inicializa um novo projeto e uma nova sessão vinculada a essa nova pasta.
   - Abre o Empty State de 768px ("Como posso ajudar?").

2. **Botão `+` DENTRO DO PROJETO (Na barra/cabeçalho da pasta na SessionSidebar):**
   - Cria uma **nova sessão dentro do MESMO worktree / slug**.
   - Compartilha os mesmos arquivos e a mesma branch do projeto.
   - Armazena um novo arquivo `<sessionId>.jsonl` dentro da mesma pasta do projeto:
     `~/.agente_window/projects/<slug>/<sessionId-1>.jsonl`  
     `~/.agente_window/projects/<slug>/<sessionId-2>.jsonl`  
     `~/.agente_window/projects/<slug>/<sessionId-3>.jsonl`

---

## 2. Modal de Busca de Sessões ("Session Picker")

Ao clicar na barra superior `@Nova sessão` ou acionar o atalho `Ctrl+P` / busca de conversas, abre-se o modal central flutuante:

### Layout e Componentes do Modal:
- **Input de Busca Superior:**
  - Placeholder: `"Buscar sessões por nome ou pasta..."`
  - Input auto-focado com borda de realce `--vscode-focusBorder`.
  - Filtro em tempo real conectado à consulta no SQLite (`agente_window.db`).
- **Unificação com a Barra Lateral:**
  - O filtro `"Filtrar sessões"` na barra lateral esquerda (`SessionSidebar`) consome a mesma lógica e estado de filtro do Session Picker.

### Agrupamento de Resultados no Modal:
O seletor organiza as sessões em três seções semânticas:

1. **NEEDS INPUT (Aguardando Resposta / Ação do Usuário):**
   - Sessões em que a IA concluiu uma ação e aguarda instrução do usuário, ou onde há um card de permissão pendente (`allow`, `deny`, `allow-session`).
2. **RECENTLY OPENED (Abertas Recentemente):**
   - As últimas sessões ativas ordenadas por `updated_at DESC`.
3. **OTHER SESSIONS (Outras Sessões):**
   - Sessões mais antigas ou de outros projetos arquivados/concluídos.

---

## 3. Comportamento ao Selecionar um Item (`onClick`)

Quando o usuário clica em uma sessão na lista do modal:
1. **`setActiveSession(sessionId)`:** Atualiza o identificador da sessão ativa no estado global do workbench.
2. **Troca de Worktree / Pasta do Projeto:** Atualiza o ponteiro do projeto para o `workspace_path` / `slug` da sessão selecionada.
3. **Carga do Histórico JSONL:** Carrega as mensagens de `~/.agente_window/projects/<slug>/<sessionId>.jsonl` e renderiza no chat central.
4. **Chaveamento do Terminal PTY:** Envia comando interno para o servidor PTY trocar o diretório ativo (`cwd`) para a pasta da worktree correspondente.
5. **Fechamento do Modal:** Fecha o modal central e restaura o foco para o input do chat ou editor.
