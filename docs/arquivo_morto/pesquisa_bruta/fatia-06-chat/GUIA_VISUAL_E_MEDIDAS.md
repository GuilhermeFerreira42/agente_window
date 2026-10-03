# Guia Visual e Medidas — Fatia 06 (Agente Window Carcaça)

> **Fonte:** VS Code Oficial 1.140.0 (`sessions.html` / `agent-sessions-workbench`)  
> **Data de Mapeamento:** 2026-10-03  
> **Tema de Referência:** VS Code Dark Modern (`vs-dark`)

---

## 1. Visão Geral do Layout em 3 Colunas

A carcaça oficial do **Agente Window** é organizada em 3 colunas verticais principais:

```
+---------------------------------------------------------------------------------------------------------+
| [<- ->] agente_window > agents/greeting-response-oi                      [...] [Play] [VSCode]          |  <- Header / Breadcrumbs (35px)
+------------------------+-------------------------------------------------------+------------------------+
| COLUNA 1: SESSÕES      | COLUNA 2: ÁREA DE CONVERSA DO AGENTE                  | COLUNA 3: ALTERAÇÕES   |
| (Largura: 270 px)      | (Largura: Flexível 1fr)                               | (Largura: 280 px)      |
|                        |                                                       |                        |
| [Icon] Automations     | [Header da Sessão :: oi]                              | [Alterações | Arquivos]|
| [Icon] Customizations  |                                                       |                        |
|                        |  [Balão do Usuário: oi]                               | "Os arquivos alterados |
| SESSÕES      [Ctrl+N]  |                                                       |  e outros artefatos da |
| [Chats]                |  [Card do Agente:]                                    |  sessão aparecerão     |
| [Novo Grupo]           |  - Created isolated worktree                          |  aqui."                |
|                        |  - Status: Pensativo                                  |                        |
| [v] agente_window      |                                                       |                        |
|   [*] oi (Ativo)       |                                                       |                        |
|       Working...       | +---------------------------------------------------+ |                        |
|                        | | Caixa de Input ("Conversar com Copilot")          | |                        |
|                        | | [Agent] [meu-pool]                   [Mic] [Send] | |                        |
|                        | +---------------------------------------------------+ |                        |
|                        | [Interativo] [Default permissions]                    |                        |
+------------------------+-------------------------------------------------------+------------------------+
```

---

## 2. Medidas Detalhadas por Coluna

### Coluna 1: Sessões & Automações (Esquerda)
* **Largura Total:** `270 px` (fixo padrão com sash de redimensionamento).
* **Fundo:** `var(--vscode-sideBar-background, #181818)` / `rgb(24, 24, 24)`.
* **Divisória Direita:** Borda de `1 px solid var(--vscode-sideBar-border, #2b2b2b)`.
* **Linhas de Atalho do Topo (`Automations`, `Customizations`):**
  * **Altura:** `28 px`.
  * **Padding:** `0 12 px`.
  * **Fonte:** `13 px`, `Segoe UI`, cor `rgb(204, 204, 204)`.
  * **Raio de Borda (Hover/Foco):** `4 px`.
  * **Badge Numérico (`Customizations 30`):** `18 px` de altura, fundo `var(--vscode-badge-background)`, raio `9 px`.
* **Cabeçalho de Seção (`Sessões`):**
  * **Altura:** `42 px`.
  * **Alinhamento:** Flex com título à esquerda e botão `Novo [Ctrl+N]` à direita.
  * **Botão `Novo [Ctrl+N]`:** Altura `24 px`, padding `2 px 8 px`, texto `11 px`, fundo `var(--vscode-button-secondaryBackground)`.
* **Seções e Grupos (`Chats`, `Novo Grupo`, pasta do Workspace):**
  * **Altura da Linha de Grupo:** `26 px`.
  * **Seta de Colapso (`>` / `v`):** `16 px`, rotação de 90° quando aberto.
* **Item de Sessão Ativa (`oi`):**
  * **Altura:** `56 px` (inclui título da sessão na 1.ª linha e data/status na 2.ª linha).
  * **Padding:** `8 px 6 px 8 px 12 px`.
  * **Fundo Ativo/Selecionado:** `rgb(81, 93, 124)` ou `var(--vscode-list-activeSelectionBackground)`.
  * **Fundo Hover:** `var(--vscode-list-hoverBackground)`.
  * **Raio de Borda:** `4 px`.
  * **Status inferior (`Working...` / `7 minutos atrás`):** `11 px`, cor secundária `rgb(150, 150, 150)`.

---

### Coluna 2: Conversa do Agente & Worktree (Centro)
* **Largura:** Flexível (`flex: 1`, padrão ~768 px a 1000 px em telas desktop).
* **Fundo:** `var(--vscode-editor-background, #1e1e1e)` / `rgb(30, 30, 30)`.
* **Barra Superior de Navegação / Breadcrumbs:**
  * **Altura:** `35 px`.
  * **Elementos:** Botões de histórico (`<-`, `->`), texto `agente_window > agents/greeting-response-oi`.
  * **Ações à Direita:** `...` (Menu), `Play` (Executar sessão), `VS Code icon` (Abrir no editor normal).
* **Mensagens (Área Central com Rolagem):**
  * **Mensagem do Usuário (`request`):**
    * Alinhamento: À direita.
    * Balão: Fundo azul `var(--vscode-button-background, #0078d4)`, texto branco, padding `8 px 14 px`, border-radius `8 px`.
  * **Mensagem do Agente (`response`):**
    * Alinhamento: À esquerda / largura total.
    * Caixa de Status do Worktree: Borda `1 px solid #3c3c3c`, fundo translúcido, badge de branch `agents/greeting-response-oi`.
    * Indicador de Progresso: Texto `Pensativo` / `Working...` com spinner animado.
* **Caixa de Input no Rodapé (`chat-input`):**
  * **Container do Input:** Arredondado com `border-radius: 8 px`, borda `1 px solid var(--vscode-input-border, #3c3c3c)`, fundo `var(--vscode-input-background, #252526)`.
  * **Padding Interno:** `10 px 12 px`.
  * **Placeholder:** `"Conversar com Copilot"`, cor `rgb(140, 140, 140)`.
  * **Pastilhas Internas (Pills):**
    * Pastilha `Agent`: Altura `22 px`, padding `2 px 8 px`, ícone de brilho (sparkle).
    * Pastilha `meu-pool`: Altura `22 px`, padding `2 px 8 px`, ícone de ferramentas/chave.
  * **Linha de Ações Inferiores:**
    * Botões `Interativo` e `Default permissions` com texto `11 px`.
    * Botão de microfone e botão de envio de mensagem à direita.

---

### Coluna 3: Painel de Alterações e Arquivos (Direita)
* **Largura:** `280 px` (com redimensionamento via sash).
* **Fundo:** `var(--vscode-sideBar-background, #181818)`.
* **Abas do Topo:**
  * **Altura da Barra de Abas:** `35 px`.
  * **Abas:** `Alterações` (ativa com borda inferior de 2 px) e `Arquivos`.
  * **Ações:** Botões `+` (Novo arquivo) e `...` (Mais ações).
* **Área de Conteúdo (Empty State):**
  * Título: `Changes` (`13 px`, negrito).
  * Mensagem descritiva: `"Os arquivos alterados e outros artefatos da sessão aparecerão aqui."` (`12 px`, cor secundária, centralizado).

---

## 3. Tabela de Tokens CSS Oficiais

| Token | Propriedade | Valor Padrão (Dark) |
|---|---|---|
| `--vscode-sideBar-background` | Fundo das Colunas 1 e 3 | `#181818` / `#242525` |
| `--vscode-editor-background` | Fundo da Coluna 2 (Centro) | `#1e1e1e` |
| `--vscode-sideBar-border` | Divisórias verticais | `#2b2b2b` |
| `--vscode-list-activeSelectionBackground` | Sessão ativa selecionada | `#515d7c` / `#094771` |
| `--vscode-list-hoverBackground` | Fundo no mouse hover | `#2a2d2e` |
| `--vscode-input-background` | Fundo da caixa de digitar | `#252526` |
| `--vscode-input-border` | Borda da caixa de digitar | `#3c3c3c` |
| `--vscode-button-background` | Balão do usuário / Botão principal | `#0078d4` |
| `--vscode-badge-background` | Badge de contagem de sessões | `#4d4d4d` |
