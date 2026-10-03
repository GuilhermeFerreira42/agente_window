# Índice Geral da Especificação de Engenharia Reversa (Fatias 6 a 10)

> **Data de Conclusão:** 2026-10-03  
> **Fonte Oficial:** Janela Nativa do VS Code Desktop (*Agentes* - `sessions.html` / `agent-sessions-workbench`)

Este diretório contém o mapeamento completo, réguas de medidas, comportamento dos botões e regras de negócio para a construção do **Agente Window** nas Fatias 6 a 10.

---

## Estrutura das Fatias

### 1. 📁 [Fatia 06 — Chat Carcaça & Sessões](./fatia-06-chat/)
* **[`GUIA_VISUAL_E_MEDIDAS.md`](./fatia-06-chat/GUIA_VISUAL_E_MEDIDAS.md):** Layout em 3 colunas (270px esquerda, flex centro, 280px direita), alturas de linhas, paddings e tokens CSS.
* **[`COMPORTAMENTO_DOS_BOTOES.md`](./fatia-06-chat/COMPORTAMENTO_DOS_BOTOES.md):** Fluxo do botão `Novo [Ctrl+N]`, seleção de sessão ativa e agrupamento por workspace.
* **[`PLANO_DE_COMPONENTES_REACT.md`](./fatia-06-chat/PLANO_DE_COMPONENTES_REACT.md):** Arquitetura modular no padrão LEGO para a carcaça.

### 2. 📁 [Fatia 07 — Input, Pastilhas e Modelos](./fatia-07-input/)
* **[`GUIA_VISUAL_E_MEDIDAS.md`](./fatia-07-input/GUIA_VISUAL_E_MEDIDAS.md):** Caixa de entrada arredondada, auto-grow (90px a 320px) e pastilhas estilo pílula (`Agent`, `meu-pool`).
* **[`COMPORTAMENTO_DOS_BOTOES.md`](./fatia-07-input/COMPORTAMENTO_DOS_BOTOES.md):** Atalhos Enter/Shift+Enter e menus de seleção de agentes/endpoints.

### 3. 📁 [Fatia 08 — Streaming, Mensagens e Markdown](./fatia-08-streaming/)
* **[`GUIA_VISUAL_E_MEDIDAS.md`](./fatia-08-streaming/GUIA_VISUAL_E_MEDIDAS.md):** Balão azul do usuário, card de worktree, blocos de código com destaque de sintaxe e metadados de execução.
* **[`COMPORTAMENTO_E_ESTADOS.md`](./fatia-08-streaming/COMPORTAMENTO_E_ESTADOS.md):** Ciclo de streaming, animações de thinking (`Pensativo...`) e botão de copiar código.

### 4. 📁 [Fatia 09 — Tools, Worktrees e Painel de Alterações](./fatia-09-tools/)
* **[`GUIA_VISUAL_E_MEDIDAS.md`](./fatia-09-tools/GUIA_VISUAL_E_MEDIDAS.md):** Painel direito de Alterações (280px), abas `Alterações`/`Arquivos` e listagem de diffs com badges (+N/-N).
* **[`COMPORTAMENTO_E_DIFFS.md`](./fatia-09-tools/COMPORTAMENTO_E_DIFFS.md):** Isolamento de branches worktree e ações de aceitar/descartar alterações.

### 5. 📁 [Fatia 10 — Polimento, Command Palette e Atalhos](./fatia-10-polish/)
* **[`GUIA_VISUAL_E_MEDIDAS.md`](./fatia-10-polish/GUIA_VISUAL_E_MEDIDAS.md):** Sashes de 4px, redimensionamento com snap-to-close e dimensões da Command Palette (600px).
* **[`ATALHOS_E_COMANDOS.md`](./fatia-10-polish/ATALHOS_E_COMANDOS.md):** Tabela completa de atalhos globais (`Ctrl+N`, `Ctrl+F`, `Ctrl+L`) e comandos do chat.
