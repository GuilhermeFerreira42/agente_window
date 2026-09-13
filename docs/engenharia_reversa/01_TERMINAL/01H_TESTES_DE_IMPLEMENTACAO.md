# 01H — Testes de Implementação: Terminal

## Unitários / focados
- criação de instância registra `terminalId` na sessão correta;
- troca de foco atualiza `activeTerminalId`;
- saída de uma instância não contamina outra sessão;
- `clear` limpa a viewport sem encerrar a sessão;
- evento `exit` preserva aba e estado visual.

## Integração
- `TerminalService` + `TerminalRuntimePort` criam PTY real;
- `WorkbenchLayoutService` redistribui espaço ao fazer split;
- mudança de CWD chega ao estado da sessão;
- persistência salva e restaura grupos e abas.

## E2E obrigatório
1. abrir terminal;
2. maximizar;
3. restaurar;
4. dividir em dois;
5. digitar em ambos os lados;
6. executar `clear`;
7. trocar de sessão e voltar;
8. verificar ausência de sujeira visual ou de roteamento de input.

## Regressões críticas
- input indo para terminal errado;
- perda de conteúdo ao restaurar painel;
- fechamento indevido após `exit`;
- split abrindo sem herdar contexto mínimo da origem.
