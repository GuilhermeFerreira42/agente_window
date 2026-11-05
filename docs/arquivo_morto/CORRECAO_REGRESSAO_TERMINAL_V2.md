# CORREÇÃO DE REGRESSÃO: TERMINAL V2 (Zero Faixa Branca)

## Contexto do Problema (Referência Vídeo 00:25 - 00:52)
Durante o split de terminais (lado a lado / horizontal), observou-se uma faixa branca / fresta residual entre as instâncias divididas e nos cantos do container do terminal.

## Causas Identificadas
1. **Background chapado ou conflitante**: Faltava herança estrita de variáveis CSS de tema (`var(--vscode-terminal-background)`), havendo gaps pontuais com cores duras `#181818` ou fundo de painel `#2b2b2b`.
2. **Gap e dimensionamento no split**: O container `.terminal-panes.is-split` utilizava `gap: 1px` com cor de borda de fundo, criando um traço claro indesejado durante o redimensionamento.
3. **Sash e subpixel rendering**: Ausência de `minWidth: 0` e `minHeight: 0` nos sub-containers do split fazia com que o cálculo do flex gerasse estouro visual e frestas brancas na renderização de subpixels.
4. **Cálculo de Drag do Sash**: O sash necessita de cálculo dinâmico baseado em `getBoundingClientRect()` com clamp estrito entre `0.15` e `0.85` para evitar colapso de divisões ou deslocamento para além dos limites do container.

## Correções Aplicadas na V2 (platform/apps/workbench-v2)
1. **Replicação fiel do Legacy**: Componentes de terminal migrados diretamente de `legacy/src/components/terminal/` para `platform/apps/workbench-v2/src/components/terminal/`.
2. **Ajuste de variáveis de tema**:
   - Backgrounds de panes e split atualizados para `var(--vscode-terminal-background)`.
   - `gap` definido como `0` em splits diretos.
   - Adicionados `minWidth: 0` e `minHeight: 0` nos containers de pane.
3. **Observador Dinâmico de Tema (`useTerminalTheme`)**:
   - `MutationObserver` monitorando `document.documentElement` com `attributeFilter: ['class', 'style', 'data-theme']`.
   - Reatividade via listener de `theme-changed`.
4. **Contratos congelados V2**:
   - Abas visíveis a partir de 1 terminal (`instances.length >= 1`).
   - Atributos `data-pty-pid` e `data-pty-shell-path` propagados no container do painel.
   - Encerramento com limpeza de sessão via `terminalSessions.closeSession()`.
