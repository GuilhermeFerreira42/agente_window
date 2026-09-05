# VALIDACAO 3 - PRODUCAO REAL - REFERENCIAS DO CODIGO ORIGINAL

## Contexto
Este pacote é a continuação da Validação 2, mas agora com **referências diretas do código original** extraídas de `01_original/sessions/` (2.015 arquivos). Cada módulo tem:
- REFERENCIA_ORIGINAL.md - trecho do código original Microsoft
- COMPORTAMENTO_REAL.md - como funciona de verdade (com timestamp do seu vídeo novo Record_2026_09_04_08_52_56_496.mp4)
- CODIGO_MOCKADO_ATUAL.md - o que a réplica tem hoje (simulação)
- TAREFA_PARA_ARENA.md - o que trocar, arquivos exatos, lógica, teste E2E

## Vídeo novo analisado
- [00:24] Google.com não abre no browser
- [00:43] Arquivos são tudo simulação
- [01:02] Layout que não existe no original (filtros ORDENAR/STATUS)
- [02:08] Novo chat inicia errado, deveria ser "Nova sessão em workspace-local"
- [02:19] Tela bloqueada, nada funciona
- [02:48] Terminal só simulação
- [03:40] Original tem layout correto, menu contexto, vários chats, novo grupo
- [06:13] Original consegue selecionar pasta Entrega/Downloads - réplica nada funcional

## Por que nada funcionava após Arena dizer 100%?
Ver `04_gestao_completo/KANBAN.md` e `RELATORIO_ONDA_1.md`:
- Arena disse 32/32 concluídos, mas 12 dos 14 itens ela classificou como "já estava OK" sem fazer
- Só fez 2 itens: tema claro e sincronizar aba com coluna direita
- 348 testes passando são unitários mockados, não testam browser real, file system real
- Código continua com `srcDoc` fixo, `const folders = [...]` hardcoded, `initialTerminalLines` fixo

## Ordem de execução - OBRIGATÓRIA
1. 03_LAYOUT_CONTROLLER_MEMORIA (base de tudo, portas batem sozinhas)
2. 05_LAYOUT_TOPOLOGIA (grid, Sessions Part flexível)
3. 04_SESSIONS_LIST_AGRUPAMENTO (vários chats por pasta, remover filtros fake)
4. 01_BROWSER_REAL (browser por sessão, history)
5. 02_FILESYSTEM_WORKSPACE_REAL (escolher pasta real)
6. 07_TERMINAL_REAL (terminal por sessão, aceita digitação)
7. 08_CUSTOM_VIEW_GRID (substitui tudo)
8. 06_SINGLE_PANE_TRANSIENTE (browser transient, detail-only)
9. 09_MENU_CONTEXTO_DRAG_DROP_TECLADO (menu, drag, teclado)
10. 10_MOBILE_E_PRODUCAO (phone ≤600px + build final)

Cada pasta tem 4 arquivos + EVIDENCIAS.
