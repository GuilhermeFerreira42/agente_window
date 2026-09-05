# TESTE E2E - SESSIONS CORE

Com Playwright:
1. Abrir app, verificar que existe 1 sessão inicial
2. Clicar "Nova sessão", digitar "teste", enviar
3. Validar que nova sessão aparece no topo de "Hoje" com status working, depois completed
4. Validar que não há draft órfão no localStorage
5. Reload page - sessão deve persistir
6. Screenshot: lista de sessões com nova sessão commitada
