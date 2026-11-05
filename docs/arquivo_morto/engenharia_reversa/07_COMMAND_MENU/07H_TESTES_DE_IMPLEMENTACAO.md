# 07H — Testes de Implementação: Command Menu

## Focados
- registrar comando e executá-lo pelo ID;
- menu respeita expressão de contexto;
- comando indisponível não aparece ou fica desabilitado conforme regra;
- atalho dispara o handler correto.

## Integração
- comandos acionam Terminal, Explorer, Chat e Workbench sem acoplamento de UI;
- context keys reagem à troca de foco e seleção.

## E2E mínimo
1. abrir command palette;
2. localizar comando;
3. executar ação;
4. validar reflexo no módulo alvo.
