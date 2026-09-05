# COMPORTAMENTO REAL - TERMINAL

## Vídeo novo [02:48][02:53][03:07]
- [02:48] "terminal também só simulação nada tá funcionando"
- [02:53] "eu consigo dividir o terminal mas é tudo nem sei quê que é isso aqui, nada tá funcionando"
- [03:07] "Não não consigo digitar"

## Comportamento original real
1. Terminal pertence a uma sessão - trocar sessão troca terminal exibido (R-063, cenário e2e 05-full-workflow)
2. Bottom panel tem 3 tabs: Terminal, Output, Problems
3. Terminal tab mostra nome da sessão: "Terminal — session-1"
4. Shell picker: bash, zsh, pwsh, fish
5. Split: dividir terminal em 2
6. Snapshot: linhas preservadas ao trocar sessão ou reload
7. Maximizar/restaurar terminal
8. Clear terminal
9. Output tab mostra build logs, Problems mostra warnings
10. Panel visibility é por sessão (B1) - se escondeu terminal em s1, ao voltar pra s1 continua escondido

## O que deveria acontecer
- Terminal aceita digitação (hoje não aceita [03:07])
- Dividir terminal funciona de verdade (hoje é mock)
- Trocar sessão troca terminal (hoje mesmo terminal pra todas sessões)
- Output e Problems tabs funcionam
- Shell picker troca shell
- Clear limpa terminal
- Maximizar funciona
