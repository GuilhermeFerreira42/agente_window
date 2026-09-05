# TESTE BROWSER & EDITOR

Playwright:
1. Abrir app sem mandar oi, clicar em Workspace Files > browser > titlebarPart.ts -> validar que tab abre com Monaco mostrando arquivo
2. Clicar New Browser -> validar tab browser abre com address bar, pode navegar, back/forward
3. Fechar tab browser -> validar que browserViews.length diminui
4. Criar sessão s2, abrir arquivo A em s1, arquivo B em s2, trocar entre s1/s2 - validar que só A aparece em s1, só B em s2
5. Hide editor, show editor 5x - sem tela preta, sem erro no console
6. Screenshot: editor com arquivo aberto sem ter mandado mensagem
