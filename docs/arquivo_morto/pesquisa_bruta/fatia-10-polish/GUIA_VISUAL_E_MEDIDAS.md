# Guia Visual e Medidas — Fatia 10 (Polimento, Comandos & Atalhos)

> **Fonte:** VS Code Oficial 1.140.0 (`sessions.html` / `agent-sessions-workbench`)  
> **Data:** 2026-10-03  
> **Tema:** VS Code Dark Modern (`vs-dark`)

---

## 1. Visão Geral da Integração do Shell Completo

A Fatia 10 define o polimento global, atalhos de teclado, Quick Pick e comportamento responsivo do Agente Window:

```
+-----------------------------------------------------------------------------------------------+
| Quick Open / Command Palette: > Chat: ...                                                     |
+-----------------------------------------------------------------------------------------------+
| Total: 100% da Janela (ex.: 1600 x 900)                                                       |
| - Coluna 1 (Sessões): 270 px                                                                  |
| - Coluna 2 (Centro): Flex (restante)                                                          |
| - Coluna 3 (Changes): 280 px                                                                  |
| - Redimensionamento: Sashes verticais de 4 px com snap-to-close                               |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Medidas e Estilos Detalhados

### Sashes de Redimensionamento entre Colunas (`monaco-sash`)
* **Largura do Sash:** `4 px` (régua oficial do VS Code).
* **Cursor:** `col-resize` (horizontal).
* **Hover:** Linha de destaque azul de `1 px` (`var(--vscode-sash-hoverBorder, #007fd4)`).
* **Snap-to-close:** Arrastar a coluna para menos de `170 px` recolhe o painel automaticamente; ao reabrir, restaura a largura anterior.

### Command Palette do Agente (`quick-input-widget`)
* **Largura:** `600 px` (centralizado no topo).
* **Fundo:** `var(--vscode-quickInput-background, #252526)`.
* **Borda:** `1 px solid var(--vscode-widget-border, #454545)`.
* **Sombra:** `0 4px 16px rgba(0, 0, 0, 0.4)`.
* **Raio de Borda:** `6 px`.
* **Altura da Linha de Comando:** `28 px`.
