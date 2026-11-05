# 04 — PLANO FASES — DOC-02

## Fase 0 — Inventário Visual (1 dia)
- Ler legacy/02_replica_final/App.tsx e styles/app.css
- Preencher 01_INVENTARIO_VISUAL.md

## Fase 1 — Esqueleto Modular V2 (2-3 dias)
- Criar platform/apps/workbench-v2/ com estrutura acima
- Portar App.tsx como shell modular, visual idêntico
- TitleBar 35px, ActivityBar 48px, StatusBar 22px, SideBar, EditorArea vazia, Panel vazio
- Rodar em 5174, comparar com 5173

## Fase 2 — Terminal como Módulo (2 dias)
- Portar VSCodeTerminal.tsx 68KB + PlatformTerminalBridge + useTerminalTheme
- Conectar com pty-server
- Validar 6 E2E terminal

## Fase 3 — FileSystem + Explorer Esqueleto (2 dias)
- FileSystemPort com atomicidade temp+rename e fila por recurso (código já validado 68/68 testes)
- ExplorerView esqueleto modular

## Fase 4 — Validação Final (1 dia)
- Comparação pixel-perfect 5173 vs 5174
- tsc 0 erros, testes 68/68 + 6 E2E, 14 itens docs/18
- Atualizar 12_DOCUMENTACAO_VIVA

Total estimado: 7-9 dias.

Após homologação, iniciar FATIA-04 completa sobre nova fundação.
