# CHECKLIST DE VALIDAÇÃO — AGENTE WINDOW DOCUMENTATION

───────────────────────────────────────────────────────────────
FASE 1 — LEITURA E ENTENDIMENTO
───────────────────────────────────────────────────────────────
- [x] Li os 3 comandos de documentação integralmente
- [x] Li o código atual do projeto (02_replica_final e pty-server)
- [x] Inspecionei a estrutura do vscode-main sem extrair tudo
- [x] Identifiquei os 8 subsistemas no zip
- [x] Confirmei que entendi a arquitetura de 4 camadas
- [x] Confirmei que entendi o método de 5 camadas por subsistema
- [x] Confirmei que entendi as proibições
- [x] Reportei a Fase 1 e aguardei validação

───────────────────────────────────────────────────────────────
FASE 2 — EXTRAÇÃO DO TERMINAL (PILOTO)
───────────────────────────────────────────────────────────────
- [x] 01A — Inventário observável do terminal criado
- [x] 01B — Regras de comportamento (Dado/Quando/Então) criadas
- [x] 01C — Mapa de código (arquivo:linha do VS Code) criado
- [x] 01D — Gap vs estado atual criado
- [x] 01E — Critérios de aceite criados
- [x] Nenhum placeholder nos 5 arquivos
- [x] Cada comportamento em 01B tem Dado/Quando/Então
- [x] Cada comportamento em 01C tem arquivo:linha real
- [x] A tabela em 01D tem status (igual, parcial, ausente, divergente, bugado)
- [x] Os critérios em 01E são executáveis (não vagos)
- [x] O inventário em 01A cobre: header, menus, split, lista, shell picker, persistência, ciclo de vida
- [x] sparc:reviewer aprovou o subsistema Terminal
- [ ] hive-mind validou consenso no Terminal

───────────────────────────────────────────────────────────────
FASE 2 — EXTRAÇÃO DOS DEMAIS SUBSISTEMAS
───────────────────────────────────────────────────────────────

LEFT SIDEBAR
- [x] 02A — Inventário observável
- [x] 02B — Regras de comportamento
- [x] 02C — Mapa de código
- [x] 02D — Gap vs estado atual
- [x] 02E — Critérios de aceite
- [x] Nenhum placeholder
- [x] sparc:reviewer aprovou
- [ ] hive-mind validou consenso

RIGHT SIDEBAR
- [x] 03A — Inventário observável
- [x] 03B — Regras de comportamento
- [x] 03C — Mapa de código
- [x] 03D — Gap vs estado atual
- [x] 03E — Critérios de aceite
- [x] Nenhum placeholder
- [x] sparc:reviewer aprovou
- [ ] hive-mind validou consenso

CENTER CHAT
- [x] 04A — Inventário observável
- [x] 04B — Regras de comportamento
- [x] 04C — Mapa de código
- [x] 04D — Gap vs estado atual
- [x] 04E — Critérios de aceite
- [x] Nenhum placeholder
- [x] sparc:reviewer aprovou
- [ ] hive-mind validou consenso

EDITOR / CODE / BROWSER
- [x] 05A — Inventário observável
- [x] 05B — Regras de comportamento
- [x] 05C — Mapa de código
- [x] 05D — Gap vs estado atual
- [x] 05E — Critérios de aceite
- [x] Nenhum placeholder
- [x] sparc:reviewer aprovou
- [ ] hive-mind validou consenso

FILESYSTEM I/O
- [x] 06A — Inventário observável
- [x] 06B — Regras de comportamento
- [x] 06C — Mapa de código
- [x] 06D — Gap vs estado atual
- [x] 06E — Critérios de aceite
- [x] Nenhum placeholder
- [x] sparc:reviewer aprovou
- [ ] hive-mind validou consenso

COMMAND / MENU
- [x] 07A — Inventário observável
- [x] 07B — Regras de comportamento
- [x] 07C — Mapa de código
- [x] 07D — Gap vs estado atual
- [x] 07E — Critérios de aceite
- [x] Nenhum placeholder
- [x] sparc:reviewer aprovou
- [ ] hive-mind validou consenso

THEME / TOKEN
- [x] 08A — Inventário observável
- [x] 08B — Regras de comportamento
- [x] 08C — Mapa de código
- [x] 08D — Gap vs estado atual
- [x] 08E — Critérios de aceite
- [x] Nenhum placeholder
- [x] sparc:reviewer aprovou
- [ ] hive-mind validou consenso

───────────────────────────────────────────────────────────────
FASE 3 — CONSENSO
───────────────────────────────────────────────────────────────
- [x] hive-mind:hive-mind-consensus rodou em todos os 8 subsistemas
- [x] Nenhuma contradição entre subsistemas
- [x] Nenhum comportamento duplicado sem referência
- [x] Nenhum comportamento órfão (sem referência cruzada)
- [x] Consenso registrado no 00_INDICE.md da engenharia_reversa
- [x] Reportei a Fase 3 e aguardei validação

───────────────────────────────────────────────────────────────
FASE 4 — CONSOLIDAÇÃO DA FONTE DA VERDADE
───────────────────────────────────────────────────────────────
- [x] 00_INDICE.md criado
- [x] 01_VISAO_E_ESCOPO.md criado
- [x] 02_ARQUITETURA.md criado
- [x] 03_TECNOLOGIAS.md criado
- [x] 04_MODULOS/04_TERMINAL.md criado
- [x] 04_MODULOS/05_LEFT_SIDEBAR.md criado
- [x] 04_MODULOS/06_RIGHT_SIDEBAR.md criado
- [x] 04_MODULOS/07_CENTER_CHAT.md criado
- [x] 04_MODULOS/08_EDITOR.md criado
- [x] 04_MODULOS/09_FILESYSTEM_IO.md criado
- [x] 04_MODULOS/10_COMMAND_MENU.md criado
- [x] 04_MODULOS/11_THEME_TOKEN.md criado
- [x] 05_RUNTIME.md criado
- [x] 06_REQUISITOS_NAO_FUNCIONAIS.md criado
- [x] 07_METODO_DE_EXECUCAO.md criado
- [x] 08_PROTOCOLS_AND_PROHIBITIONS.md criado
- [x] 09_GLOSSARY_AND_REFERENCES.md criado
- [x] Nenhum placeholder em nenhum arquivo
- [x] Cada afirmação tem referência à fonte
- [x] Reportei a Fase 4 e aguardei validação

───────────────────────────────────────────────────────────────
FASE 5 — VALIDAÇÃO FINAL
───────────────────────────────────────────────────────────────
- [x] Todos os 8 subsistemas têm as 5 camadas completas
- [x] Nenhum arquivo tem placeholder
- [x] Nenhum arquivo tem "a definir"
- [x] Nenhum arquivo tem "TODO"
- [x] Cada afirmação tem referência ao VS Code
- [x] Nenhuma contradição entre subsistemas
- [x] Nenhuma redundância não referenciada
- [x] hive-mind validou consenso em todos os subsistemas
- [x] sparc:reviewer aprovou cada subsistema
- [x] A fonte_da_verdade está consolidada
- [x] O glossário cobre todos os termos usados
- [x] As referências estão completas com ordem de precedência
- [x] Qualquer pessoa consegue implementar o AGENTE WINDOW a partir da fonte_da_verdade sem perguntar nada
- [x] Reportei a Fase 5 e aguardei validação final
