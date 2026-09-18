# Histórico de Homologação e Evidências Visuais (Terminal e Single Port)

Esta pasta contém o arquivo imutável dos scripts e capturas de tela obtidos durante a homologação interativa da Casa Nova (`workbench-v2`) e Casa Velha (`legacy/`).

## Conteúdo da Pasta

1. **`evidencias/`**:
   - `casa_nova_interact_success.png`: Prova visual da Casa Nova (:5174) com terminal aberto, sem tela cinza, executando `echo TESTE_CASA_NOVA_OK`.
   - `evidence_1_terminal_sem_sidebar.png`: Validação da regra de 1 terminal ativo (drawer de abas lateral oculto, 100% largura).
   - `evidence_2_terminais_com_sidebar.png`: Validação da regra ao clicar no `+` (drawer lateral visível a partir de 2 instâncias).
   - `antigravity_legacy_success.png`: Prova visual equivalente na Casa Velha (:5173).

2. **Scripts Independentes (`.cjs`)**:
   - `interact_test.cjs`: Script autônomo com Playwright para simular cliques, digitação no xterm e verificação de atributos PTY.
   - `test_both_ws.cjs`: Teste de handshake e upgrade de protocolo WebSocket na rota `/pty` de porta única.

## Finalidade
Servir como registro histórico e reversível. A execução oficial dos testes do dia a dia deve ser feita através da suíte automatizada do projeto em `platform/apps/workbench-v2/e2e/`.
