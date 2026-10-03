# Guia Visual e Medidas — Fatia 07 (Input, Pastilhas & Seleção de Modelos)

> **Fonte:** VS Code Oficial 1.140.0 (`sessions.html` / `agent-sessions-workbench`)  
> **Data:** 2026-10-03  
> **Tema:** VS Code Dark Modern (`vs-dark`)

---

## 1. Visão Geral da Caixa de Entrada do Agente

A caixa de entrada do Agente Window é uma área fixa no rodapé da Coluna Central com pastilhas integradas:

```
+-----------------------------------------------------------------------------------------------+
| Conversar com Copilot                                                                         |
|                                                                                               |
|                                                                                               |
| [|] [Sparkle Agent v] [Wrench meu-pool v]                                        [Mic] [Send] |
+-----------------------------------------------------------------------------------------------+
  [Interativo v] [Default permissions v]
```

---

## 2. Medidas e Estilos Detalhados

### Caixa Principal do Input (`chat-input-box`)
* **Largura:** `100%` da Coluna Central menos margens laterais (`margin: 0 16px 12px 16px`).
* **Altura:** Auto-grow (mínimo `90 px`, máximo `320 px` com scrollbar vertical interna).
* **Fundo:** `var(--vscode-input-background, #252526)` / `rgb(37, 37, 38)`.
* **Borda:** `1 px solid var(--vscode-input-border, #3c3c3c)`.
* **Borda em Foco (`:focus-within`):** `1 px solid var(--vscode-focusBorder, #007fd4)`.
* **Raio de Borda:** `8 px` (cantos arredondados).
* **Padding:** `10 px 12 px 8 px 12 px`.
* **Sombra:** `0 2px 8px rgba(0,0,0,0.2)`.

### Área de Texto (`textarea`)
* **Fonte:** `13 px`, `Segoe UI`, `-apple-system`, `sans-serif`.
* **Line-height:** `18 px`.
* **Cor do Texto:** `var(--vscode-input-foreground, #cccccc)`.
* **Placeholder:** `"Conversar com Copilot"`, cor `var(--vscode-input-placeholderForeground, #8c8c8c)`.
* **Resize:** `none` (o redimensionamento é automático pelo conteúdo).

### Barra de Pastilhas Internas (Pills)
* **Alinhamento:** Flex row no rodapé da caixa de texto, com `gap: 6 px`.
* **Pastilha de Agente (`Agent`):**
  * Altura: `24 px`.
  * Padding: `2 px 8 px`.
  * Fundo: `rgba(255, 255, 255, 0.06)` com hover `rgba(255, 255, 255, 0.12)`.
  * Borda: `1 px solid rgba(255, 255, 255, 0.1)`.
  * Raio de borda: `12 px` (estilo pílula).
  * Ícone: `Sparkles` (13 px) à esquerda + Seta `ChevronDown` (11 px) à direita.
* **Pastilha de Endpoint / Modelo (`meu-pool`):**
  * Altura: `24 px`.
  * Padding: `2 px 8 px`.
  * Fundo: `rgba(255, 255, 255, 0.06)`.
  * Raio de borda: `12 px`.
  * Ícone: `Wrench` (ferramentas) à esquerda + Seta `ChevronDown` à direita.
* **Botões de Ação à Direita:**
  * Botão de Microfone (`Mic`): `24 px x 24 px`, ícone `14 px`.
  * Botão de Envio (`Send`): `24 px x 24 px`, ícone de seta ou círculo com foco em azul.

### Barra de Permissões Inferior (Fora da Caixa)
* **Margem superior:** `6 px`.
* **Itens:** `Interativo` e `Default permissions`.
* **Fonte:** `11 px`, cor secundária `rgb(160, 160, 160)`.
* **Comportamento:** Botões discretos sem fundo com hover sutil.
