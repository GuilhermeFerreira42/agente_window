# 05 — CRITÉRIOS PIXEL-PERFECT — DOC-02

## Como validar que nova fundação é idêntica ao legacy

### Método
1. Rodar legacy em 5173 e workbench-v2 em 5174 lado a lado
2. Mesma resolução, mesmo tema dark
3. Comparar:
   - Altura TitleBar 35px, StatusBar 22px, ActivityBar 48px
   - Cores exatas via var(--vscode-*)
   - Posição de cada botão
   - Comportamento resize, maximize, tabs

### Critérios de aceite
- Nenhuma diferença visual perceptível
- Mesmas classes e data-attributes para E2E
- Mesmos aria-labels
- Terminal funciona idêntico

Se houver diferença, corrigir CSS até ficar idêntico.
