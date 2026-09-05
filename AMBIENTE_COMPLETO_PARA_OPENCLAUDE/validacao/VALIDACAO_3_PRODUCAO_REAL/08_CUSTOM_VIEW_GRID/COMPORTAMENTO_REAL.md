# COMPORTAMENTO REAL - CUSTOM VIEW GRID

## Vídeo novo [02:19] "nessa tela aqui nada tá funcionando nada"
Você mostra tela "Nova sessão em workspace-local" com custom view mas nada funciona, bloqueado.

## Comportamento original real
1. Custom View Grid é view full-surface que substitui session content
2. Quando ativo, esconde Sessions Part, Editor, Auxiliary Bar, Panel - só Titlebar e Sidebar ficam
3. Covered parts retêm desired visibility separadamente de effective grid visibility pra restaurar quando custom view fecha
4. Abrir sessão dismiss custom view (se estava em custom view e clica em sessão, custom view fecha)
5. No phone, custom views participam em mobile navigation, back navigation dismiss them
6. Exemplo: AI Customizations view (tree de agents/skills/MCP) é custom view

## O que deveria acontecer
- Clicar "AI Customizations" -> Sessions Part, Editor, Aux Bar, Panel somem, só Titlebar e Sidebar ficam, mostra grid de customizations
- Clicar em sessão na sidebar -> custom view fecha, volta sessions part
- F5 com custom view ativo -> continua ativo, mas parts escondidas retêm desired visibility
- No mobile, back dismiss custom view
