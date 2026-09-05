# COMPORTAMENTO REAL - SINGLE PANE

## Comportamento original real
1. Single-pane layout é default quando setting habilitado, phone sempre classic
2. Editor e Auxiliary Bar compõem um side pane ao lado da sessão ativa
3. Main Editor suporta exatamente 1 editor group, sem split (canSplitMainEditor retorna false)
4. Transições: editor+detail (ambos visíveis), editor-only (só editor), detail-only (só details), closed (nenhum)
5. Browser é transient: tab Browser esconde detail panel temporariamente mas só enquanto editor visível
6. Se editor hidden enquanto Browser ativo, panel mostra fallback Changes/Files, não fica em branco
7. Managed tabs (Changes/Files) não podem fechar enquanto detail-only (CannotClose)
8. Docked: ao entrar detail-only fecha abas não-acopladas, captura restauráveis, descarta Search sujo
9. Tab bar permanece em detail-only (keepForDockedTabBar)
10. Bordas residuais ao recolher colunas não devem aparecer (R-070)

## O que deveria acontecer
- Abrir browser tab -> detail panel some temporariamente (transient)
- Hide editor enquanto browser ativo -> detail mostra fallback Files, não branco
- Entrar detail-only (hide editor) -> tentar fechar Changes tab -> não fecha (CannotClose)
- Hide/Show editor 10x rápido sem tela preta/crash (race condition já descoberto)
- Sem bordas residuais ao recolher
