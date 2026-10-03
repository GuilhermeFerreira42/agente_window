# Guia Visual e Medidas — Fatia 09 (Tools, Worktrees & Painel de Alterações)

> **Fonte:** VS Code Oficial 1.140.0 (`sessions.html` / `agent-sessions-workbench`)  
> **Data:** 2026-10-03  
> **Tema:** VS Code Dark Modern (`vs-dark`)

---

## 1. Visão Geral do Painel de Alterações (Coluna 3)

A Coluna Direita do Agente Window gerencia todos os arquivos modificados e comandos de ferramentas executados na sessão:

```
+-----------------------------------------------------------------------------------------------+
| Alterações                                          Arquivos                     [+] [...]    |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|                                                                                               |
|                                            Changes                                            |
|                  Os arquivos alterados e outros artefatos da sessão aparecerão aqui.          |
|                                                                                               |
|                                                                                               |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Medidas e Estilos Detalhados

### Painel Principal (`changes-panel`)
* **Largura:** `280 px` (com redimensionamento por sash).
* **Fundo:** `var(--vscode-sideBar-background, #181818)` / `rgb(24, 24, 24)`.
* **Divisória com o Centro:** Borda esquerda de `1 px solid var(--vscode-sideBar-border, #2b2b2b)`.

### Barra de Abas do Topo (`changes-tab-bar`)
* **Altura:** `35 px`.
* **Padding:** `0 8 px`.
* **Abas:**
  * `Alterações` (Aba padrão ativa com borda inferior de 2 px `var(--vscode-panelTitle-activeBorder, #007fd4)`).
  * `Arquivos` (Aba inativa com cor secundária).
* **Botões de Ação do Topo:**
  * Botão `+` (`Add File to Session`): `22 px x 22 px`.
  * Botão `...` (`More Actions`): `22 px x 22 px`.

### Estado Vazio (Empty State)
* **Alinhamento:** Centralizado vertical e horizontalmente.
* **Título (`Changes`):** `13 px`, negrito `600`, cor `var(--vscode-foreground, #cccccc)`.
* **Texto Descritivo:** `"Os arquivos alterados e outros artefatos da sessão aparecerão aqui."` (`12 px`, cor `var(--vscode-descriptionForeground, #888888)`, margem superior `6 px`, largura máxima `220 px`, texto centralizado).

### Lista de Arquivos Modificados (Quando Populada)
* **Altura da Linha de Arquivo:** `24 px`.
* **Padding:** `2 px 10 px`.
* **Ícone de Arquivo:** Codicon ou ícone do tema de arquivos.
* **Badges de Alteração:**
  * Adições: `+N` em verde `var(--vscode-gitDecoration-addedResourceForeground, #81b88b)`.
  * Remoções: `-N` em vermelho `var(--vscode-gitDecoration-deletedResourceForeground, #c74e39)`.
* **Hover:** Fundo `var(--vscode-list-hoverBackground)`.
* **Ações Rápidas no Hover:** Botões de `Discard` e `Diff`.
