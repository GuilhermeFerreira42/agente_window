# 08 — CRITÉRIOS DE HOMOLOGAÇÃO — DOC-02

## Critérios para considerar a nova fundação pronta

1. Visual idêntico ao 02_replica_final — validado lado a lado por humano
2. Terminal PTY real funcionando: WebSocket /pty, PID, buffer sem tela branca
3. Tema claro/escuro reativo sem hardcoded colors
4. Maximize terminal fiel ao VS Code (absolute, não fixed)
5. Typecheck 0 erros
6. Testes unitários platform 68/68 + E2E terminal 6/6
7. Sem regressão nos 14 itens do docs/18
8. Arquitetura modular: nenhum import cruzado interno, só via contrato

Se qualquer critério falhar, a entrega não é homologada.
