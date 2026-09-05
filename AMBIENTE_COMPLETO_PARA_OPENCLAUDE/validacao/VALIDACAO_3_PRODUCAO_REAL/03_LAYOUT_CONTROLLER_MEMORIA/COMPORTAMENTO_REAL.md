# COMPORTAMENTO REAL - LAYOUT CONTROLLER

## Vídeo novo [00:05][00:33][02:08] - Bug mais crítico

[00:05] Você abre com 2 barras abertas, mas ao trocar sessão elas reaparecem/fecham errado - não captura/restaura por sessão
[00:33] "quando eu acredito com novo ele tá iniciando dessa forma aqui, não era pra iniciar dessa forma, era pra iniciar com essa tela aqui" - Novo chat inicia escondendo laterais em vez de só centralizar meio
[02:08] "Vou fechar esse aqui também, eu vou criar um novo chat, quando eu acredito com novo ele tá iniciando dessa forma aqui, não era pra iniciar dessa forma"

## Comportamento original real - Regras D3b/D4

1. **Memória por sessão:** s1 com sidebar 350px, aux bar aberta Files, editor visível. Trocar pra s2, fechar aux bar, esconder editor. Voltar pra s1 -> deve estar igual: sidebar 350px, aux bar aberta Files, editor visível. Hoje não está.

2. **New Session View State compartilhado:** Todas new sessions compartilham um estado. Se usuário fechou aux bar na landing, próxima landing também fechado, e persiste após F5. Hoje sempre DEFAULT, nunca lê localStorage.

3. **Nova sessão não esconde laterais:** Clicar "Novo chat" NÃO deve esconder sidebar e aux bar, só centralizar input no meio com max-width 950px. Hoje SessionLanding tem position:absolute cobrindo tudo.

4. **Hide/Show Editor sem tela preta:** Ao esconder editor, entra em detail-only, fecha abas não-acopladas mas captura Browser/Customizations. Ao mostrar, restaura. Ordem importa: primeiro tabs, depois browserViews, senão tela preta (race condition).

## O que deveria acontecer
- Setup 2 sessões s1/s2, s1 sidebar 350px aux aberta, s2 aux fechada editor hidden, voltar s1 -> restaura s1
- Na landing, fechar aux bar, F5 -> continua fechada
- Criar nova sessão -> nova sessão herda do newSessionViewState que está fechado (compartilhado)
- Novo chat com sessões existentes NÃO esconde laterais, só centraliza meio
- Hide/Show editor 10x rápido sem crash/tela preta
