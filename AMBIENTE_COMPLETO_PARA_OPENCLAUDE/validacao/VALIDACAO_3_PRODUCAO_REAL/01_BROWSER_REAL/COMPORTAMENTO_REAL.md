# COMPORTAMENTO REAL - BROWSER

## Vídeo novo [00:15-00:27]
Você mostra:
- "Ele tá abrindo o navegador aqui, beleza, eu não sei se isso funciona, Google ponto com. O navegador não funciona."
- [00:31] "Pelo menos esses botões aqui está funcionando"
- [00:36] Botões back/forward/reload aparecem mas não navegam

## Comportamento original [03:40-04:00 do seu vídeo]
- Original tem browser contextual por sessão
- Session scope: History stays with active session
- Editor tab: Viewport desktop/tablet/mobile
- Load lifecycle: host reports iframe load and error events
- Ao trocar sessão, browser da outra sessão some
- Ao arquivar sessão, browser é destruído
- Cada sessão tem seu próprio histórico

## O que deveria acontecer
1. Abrir app sem mandar "oi", clicar "New Browser" -> abre tab browser + view com address bar
2. Digitar google.com -> tenta carregar, falha com banner "Falha ao carregar - site bloqueia iframe" (honesto, não simulação)
3. Navegar entre sessões -> só browsers daquela sessão aparecem
4. Fechar tab browser -> view some junto (removeBrowserResourceForTab)
5. Back/Forward funcionam no history da sessão
