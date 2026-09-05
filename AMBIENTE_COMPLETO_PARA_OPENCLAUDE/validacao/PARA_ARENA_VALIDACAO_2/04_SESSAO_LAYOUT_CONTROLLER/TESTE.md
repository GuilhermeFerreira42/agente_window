# TESTE E2E - LAYOUT CONTROLLER

Playwright - mais importante:
1. Setup: 2 sessões s1 e s2
2. s1: deixar sidebar 350px, aux bar aberta em Files, editor visível
3. Trocar para s2, mudar para aux bar fechada, editor hidden
4. Voltar para s1 - validar que sidebar 350px, aux bar aberta Files, editor visível (restauração por sessão)
5. Teste new session view state:
   - Na landing, fechar aux bar
   - F5 - validar aux bar continua fechada
   - Criar nova sessão - validar que nova sessão herda aux bar fechada? Não, deve herdar do newSessionViewState que está fechado
   - Abrir aux bar na landing, F5, validar aberta
6. Teste bug 00:33:
   - Apagar todas sessões, validar landing aparece centralizada mas laterais NÃO escondidas (sidebar e aux bar ainda visíveis se estavam)
   - Clicar Novo - validar que não esconde laterais
7. Teste Hide/Show Editor sem tela preta:
   - Esconder editor, mostrar, repetir 5x - validar sem crash/tela preta
   - Screenshot após cada toggle
8. Screenshots: estado por sessão antes/depois
