# 13 — ADRs — DOC-02

## ADR-001 — Réplica Visual Exata do 02_replica_final como Referência
Decisão: A partir de DOC-02, a única referência visual é `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`, não vídeo Antigravity.
Motivo: Layout desejado já existe no legacy.
Consequência: Descontinuar `platform/apps/workbench/` baseado em vídeo.

## ADR-002 — Nova Fundação Modular como Monolito Modular
Decisão: Construir nova fundação em `platform/apps/workbench-v2/` que replica visualmente o legacy, mas internamente modular com contratos.
Motivo: Permitir que módulos sejam independentes.
Consequência: Arquitetura com boundaries, eventos, sem import cruzado interno.

## ADR-003 — Preservação do Terminal Estabilizado
Decisão: Portar VSCodeTerminal 68KB + PlatformTerminalBridge + useTerminalTheme como módulo, preservando pendingOutputRef, fitAllInstancesRef, display contents/none, MutationObserver, data-pty-*.
Motivo: Terminal já homologado com 6 E2E passando, blindado por docs/18.

## ADR-004 — FileSystem com Atomicidade e Fila
Decisão: FileSystemPort deve implementar temp+rename e fila por recurso, já validado com 68/68 testes.

## ADR-005 — Descontinuação da DOC anterior
Decisão: DOC anterior (FATIA-04_VIDEO_COMPLETO baseada em vídeo) é arquivada. DOC-02 substitui completamente.
