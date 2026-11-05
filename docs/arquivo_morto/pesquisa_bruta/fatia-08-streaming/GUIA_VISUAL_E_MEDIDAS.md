# Guia Visual e Medidas — Fatia 08 (Streaming, Mensagens & Markdown)

> **Fonte:** VS Code Oficial 1.140.0 (`sessions.html` / `agent-sessions-workbench`)  
> **Data:** 2026-10-03  
> **Tema:** VS Code Dark Modern (`vs-dark`)

---

## 1. Visão Geral das Mensagens no Agente Window

A renderização de mensagens na área central do Agente Window é dividida em dois tipos de blocos principais:

```
+-----------------------------------------------------------------------------------------------+
|                                                                                [ oi ]  <- User (Direita)
|                                                                                               |
| [Sparkle Copilot]                                                              <- Agent (Esquerda)
| +-------------------------------------------------------------------------------------------+ |
| | [Branch Icon] Created isolated worktree for branch agents/greeting-response-oi            | | <- Worktree Badge
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| [Spinner] Pensativo...                                                         <- Status do Streaming
|                                                                                               |
| Aqui está a resposta com formatação:                                                          |
|                                                                                               |
| +-------------------------------------------------------------------------------------------+ |
| | typescript                                                                   [Copy Button]| | <- Codeblock Header
| |-------------------------------------------------------------------------------------------| |
| | const greeting: string = "Hello World";                                                   | |
| +-------------------------------------------------------------------------------------------+ |
|                                                                                               |
| 17:09 · 31s • Custom Endpoint / litellm / meu-pool                             <- Rodapé da Resposta
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Medidas e Estilos Detalhados

### Balão de Mensagem do Usuário (`monaco-list-row request`)
* **Posicionamento:** Alinhado à direita com margem esquerda automática.
* **Largura Máxima:** `80%` da largura da Coluna Central.
* **Fundo:** `var(--vscode-button-background, #0078d4)` / `rgb(0, 120, 212)`.
* **Cor do Texto:** `var(--vscode-button-foreground, #ffffff)`.
* **Padding:** `8 px 14 px`.
* **Raio de Borda:** `8 px` (com cantos suaves).
* **Fonte:** `13 px`, `Segoe UI`, line-height `1.4`.
* **Metadados (Hora e Ações no topo):** Ícone `Recomeçar`, timestamp `17:08`, botão `Ponto de Verificação Restaurado · Refazer`.

### Bloco de Resposta do Agente (`monaco-list-row response`)
* **Posicionamento:** Alinhado à esquerda, ocupando toda a largura útil da coluna central.
* **Fundo:** Transparente com texto direto sobre o fundo do editor (`var(--vscode-editor-background)`).
* **Avatar do Agente:** Ícone Copilot/Sparkle de `16 px x 16 px` ao lado do nome `Copilot`.

### Card de Worktree / Ambiente Isolado (`worktree-card`)
* **Altura:** `32 px`.
* **Fundo:** `rgba(255, 255, 255, 0.04)`.
* **Borda:** `1 px solid var(--vscode-editorGroup-border, #3c3c3c)`.
* **Raio de Borda:** `6 px`.
* **Padding:** `4 px 10 px`.
* **Texto:** `"Created isolated worktree for branch agents/..."` com o nome da branch em destaque (`#dcdcaa`).

### Indicador de Progresso e Streaming (`streaming-status`)
* **Status Ativo:** Texto `Pensativo...` ou `Working...` acompanhado de spinner animado (`14 px`).
* **Cursor Piscante:** Barra vertical de `2 px` com animação suave de fade `blink 1s infinite`.

### Blocos de Código (`codeblock`)
* **Fundo do Bloco:** `var(--vscode-editor-background, #1e1e1e)` / `#181818`.
* **Borda:** `1 px solid var(--vscode-editorGroup-border, #333333)`.
* **Raio de Borda:** `6 px`.
* **Cabeçalho do Bloco de Código:**
  * Altura: `28 px`.
  * Padding: `0 10 px`.
  * Exibe o nome da linguagem à esquerda (ex.: `typescript`, `json`, `python`) e o botão `Copiar` (`Copy`) à direita.
* **Fonte do Código:** `12.5 px`, `Consolas`, `Monaco`, `monospace`, line-height `18 px`.

### Rodapé da Mensagem (`response-footer`)
* **Fonte:** `11 px`, cor secundária `rgb(140, 140, 140)`.
* **Informações:** Timestamp (ex.: `17:09`), tempo de resposta (ex.: `31s`), endpoint usado (`Custom Endpoint/litellm/meu-pool`).
