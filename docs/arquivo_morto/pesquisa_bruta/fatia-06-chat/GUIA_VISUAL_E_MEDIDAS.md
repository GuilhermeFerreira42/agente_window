# Guia Visual e Medidas — Fatia 06 (Agente Window Carcaça)

> **Fonte:** VS Code Oficial 1.135.0 (perfil "Janela Agentes" / `@github/copilot` no Windows 11)  
> **Data de Atualização:** 2026-10-04  
> **Tema de Referência:** VS Code Dark Modern (`vs-dark`)  
> **Ponto de Partida Real:** `platform/apps/workbench-v2/` com Fatia 5 100% homologada

---

## 1. Visão Geral do Layout do Workbench

A carcaça real do projeto é composta pelo painel de sessões à esquerda, a área de conversa ao centro e o chassi homologado à direita:

```
+--------------------------------------------------------------------------------------------------------------------+
| COLUNA 1: SESSÕES     | COLUNA 2: ÁREA DE CONVERSA DO AGENTE (CENTRO)           | COLUNA 3: CHASSI DIREITO (FATIA 5) |
| (Largura: ~270 px)    | (Largura: Flexível 1fr)                                 | (HOMOLOGADO E INTOCÁVEL)           |
|                       |                                                         |                                    |
| Sessões      [Ctrl+N] | [ESTADO 1: EMPTY STATE CENTRALIZADO - 768px]            | Side Bar (274px / 170-300px):      |
| [Chats]               | New session in [agente_window v] with [Copilot v]       | - Explorer (arquivos reais)        |
|   Sem chats           | +-----------------------------------------------------+ | - Search                           |
|                       | | O que há de próximo em seu roteiro?                 | | - Source Control (Git)             |
| [v] agente_window     | | [+] [{/} Agent] [Auto]                 [Mic] [Send] | |                                    |
|   [*] Greeting in PT  | +-----------------------------------------------------+ | Sash de redimensionamento: 4px     |
|       3 semanas atrás | [Interativo] [Manual permissions]                       |                                    |
|                       |                                                         | Activity Bar (48px):               |
| --------------------- | [ESTADO 2: SESSÃO ATIVA (APÓS ENVIO/CLIQUE)]            | - 3 ícones à direita               |
| Personalizações:      | Header superior: • [Greeting in Portuguese]       [...] |                                    |
| Visão geral           | Histórico de Mensagens (Rolagem vertical flex)          | ---------------------------------- |
| Agentes               |                                                         | Terminal Inferior (PTY real):      |
| Habilidades (13)      | Input fixado no rodapé:                                 | - Terminal xterm.js blindado       |
| Servidores MCP (1)... | [+] [Local] [{/} Agent] [Auto]             [Mic] [Send] |   (Zero linhas alteradas)          |
+-----------------------+---------------------------------------------------------+------------------------------------+
```

---

## 2. Medidas Detalhadas por Coluna

### Coluna 1: Painel de Sessões (Esquerda)
* **Largura Total:** `270 px` padrão (com sash de redimensionamento para o centro).
* **Fundo:** `var(--vscode-sideBar-background, #181818)`.
* **Divisória Direita:** Borda de `1 px solid var(--vscode-sideBar-border, #2b2b2b)`.
* **Cabeçalho de Seção (`Sessões`):**
  * **Altura:** `42 px`.
  * **Título:** `Sessões` (13px, negrito/semi-bold).
  * **Botão `Novo [Ctrl+N]`:** Altura `24 px`, padding `2 px 8 px`, texto `11 px`, fundo `var(--vscode-button-secondaryBackground)`.
  * **Ícones de Ação:** Ícone de filtro/ordenação e ícone de busca à direita.
* **Grupos de Sessões (`Chats` e pasta do Workspace):**
  * **Altura da Linha de Grupo:** `26 px`.
  * **Seta de Colapso (`>` / `v`):** `16 px`, rotaciona 90° ao abrir.
  * **Grupo `Chats`:** quando vazio, exibe o indicador cinza `Sem chats` (12px, `var(--vscode-descriptionForeground)`).
  * **Grupo do Workspace (`agente_window`):** exibe o ícone de pasta e as sessões associadas.
* **Linha de Sessão (Ex.: `Greeting in Portuguese`):**
  * **Altura:** `44 px` a `56 px` (título da sessão na 1.ª linha, data/status na 2.ª linha).
  * **Padding:** `8 px 6 px`.
  * **Fundo Ativo/Selecionado:** `var(--vscode-list-activeSelectionBackground)`.
  * **Fundo Hover:** `var(--vscode-list-hoverBackground)`.
  * **Raio de Borda:** `4 px`.
  * **Status inferior (`3 semanas atrás` / status):** `11 px` a `12 px`, cor secundária `var(--vscode-descriptionForeground)`.
* **Rodapé de Personalizações:**
  * Itens com badges numéricos: *Visão geral*, *Agentes*, *Habilidades (13)*, *Instruções*, *Hooks*, *Servidores MCP (1)*, *Plugins*, *Ferramentas (11)*.
  * Altura da linha: `28 px`.

---

### Coluna 2: Conversa do Agente (Centro) — Os 2 Estados

#### Estado A: Empty State (Sessão Nova / Sem Mensagens)
* **Alinhamento:** Centralizado vertical e horizontalmente (levemente deslocado para o terço superior, `margin-bottom: 6vh`).
* **Largura Máxima do Bloco:** **`768 px`** (travado).
* **Título do Bloco & Seletor de Workspace:**
  * Estrutura: `New session in [ícone pasta] agente_window [v] with [ícone copilot] Copilot [v]`.
  * Fonte: `18 px` a `20 px`, peso regular (`400`).
  * **Dropdown do Seletor de Pasta (`[agente_window v]`):**
    * Chip clicável com seta para baixo. Ao clicar, abre menu suspenso (dropdown) flutuante de largura `~320 px`, fundo `var(--vscode-menu-background)`, borda `1 px solid var(--vscode-menu-border)`, raio `6 px`, box-shadow `0 4px 12px rgba(0,0,0,0.3)`.
    * Cada linha de workspace: altura `32 px`, ícone de pasta (16px), nome da pasta em negrito (13px), caminho completo truncado abaixo (11px, cor secundária). Opção final `Select...` para abrir o explorador de arquivos nativo.
    * A pasta selecionada define o workspace da conversa, sincronizando o Explorer e o Terminal.
* **Caixa de Input Central:**
  * **Borda:** `1 px solid var(--vscode-widget-border, #3c3c3c)`, `border-radius: 8 px`.
  * **Fundo:** `var(--vscode-input-background, #252526)`.
  * **Padding Interno:** `10 px 12 px`.
  * **Placeholder:** `"O que há de próximo em seu roteiro?"` (cor `var(--vscode-descriptionForeground)`).
  * **Pastilhas Internas (Pills):**
    * `+` (Adicionar contexto / anexo).
    * `{/} Agent` (Seletor de agente).
    * `Auto` (Seletor de modelo).
  * **Ações à Direita:** Ícone de microfone (ditar) e botão de envio com seta para cima.
* **Rodapé do Input:**
  * `[balão] Interativo`
  * `[escudo] Manual permissions` (ou `Default permissions`)

#### Estado B: Sessão Ativa (Após Envio ou Seleção de Sessão)
* **Transição:**
  * O bloco centralizado de 768px desaparece imediatamente (`display: none`).
  * O topo da coluna central ganha uma barra de cabeçalho fixa (`35 px`): `• [ícone] Greeting in Portuguese` e botão `...` à direita.
  * A área de histórico de mensagens assume o corpo central com rolagem vertical automática.
  * A caixa de input é fixada no **rodapé da tela**, mantendo as pastilhas e o botão de envio.

---

### Coluna 3: Chassi Direito e Terminal (Fatia 5 Homologada — INTOCÁVEIS)
* **Side Bar (Direita):** Largura de `274 px` (redimensionável de 170 px a 300 px), sash de `4 px`. Contém Explorer, Search e Source Control. **NÃO CRIAR COLUNAS EXTRAS**.
* **Activity Bar (Direita):** Largura de `48 px`, 3 ícones empilhados com indicador ativo de 2 px.
* **Terminal Inferior:** PTY real em `TerminalPanel.tsx`. **ZERO LINHAS ALTERADAS**.

---

## 3. Tabela de Tokens CSS Oficiais (VS Code 1.135.0)

| Token | Propriedade Aplicada | Valor Padrão (Dark Modern) |
|---|---|---|
| `--vscode-sideBar-background` | Fundo do painel de sessões | `#181818` |
| `--vscode-editor-background` | Fundo da área de conversa central | `#1f1f1f` / `#1e1e1e` |
| `--vscode-sideBar-border` | Borda divisória entre painéis | `#2b2b2b` |
| `--vscode-list-activeSelectionBackground` | Sessão ativa na lista | `#04395e` / `#515d7c` |
| `--vscode-list-hoverBackground` | Hover na lista de sessões | `#2a2d2e` |
| `--vscode-input-background` | Fundo da caixa de texto do chat | `#252526` |
| `--vscode-widget-border` | Borda arredondada do input de 768px | `#3c3c3c` |
| `--vscode-button-background` | Botão enviar / Balão usuário | `#0078d4` |
| `--vscode-descriptionForeground` | Placeholders, datas e textos secundários | `#8b949e` / `#cccccc` |
