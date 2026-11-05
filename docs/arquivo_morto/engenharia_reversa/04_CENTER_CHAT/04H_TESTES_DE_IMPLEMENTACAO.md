# 04H — Testes de Implementação: Center Chat

## Focados
- envio de mensagem cria turno na sessão correta;
- chunks de streaming entram na ordem esperada;
- tool pending bloqueia a continuação até aprovação;
- rascunho, anexos, modo e modelo permanecem isolados por sessão;
- sessão restaurada recupera histórico coerente.

## Integração
- runtime adapter envia eventos corretos;
- integração com editor injeta contexto quando aplicável;
- integração com tool layer retorna resultado ao turno certo.

## E2E mínimo
1. criar sessão;
2. enviar mensagem;
3. observar thinking e streaming;
4. aprovar ou rejeitar uma tool;
5. trocar de sessão e voltar;
6. validar persistência do histórico e do draft esperado.
