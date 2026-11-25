# U-2 — Diálogos internos · Relatório de implementação

Base: `042232e` · Estado: implementada e testada tecnicamente; **não homologada**.

## Implementação

- Os pontos de confirmação, aviso e entrada de texto migrados usam uma porta assíncrona e componentes React internos, em vez de `window.confirm`, `window.alert` ou `window.prompt`. A busca no código de produção não encontrou chamadas dessas três APIs.
- Os pedidos e consequências ficam no domínio; a casca apresenta o diálogo, devolve a escolha e não decide pelo fluxo. Cancelar, Escape, fechar ou clicar fora não autorizam a ação. Confirmações perigosas iniciam com foco em Cancelar; a entrada de texto inicia no campo.
- Os fluxos incluem exclusão de conversa e worktree sujo, permissões, compactação, anexos, recuperação de versão salva, acesso histórico, memória, revisão operacional e grupos. Na exclusão, a execução é capturada após a confirmação; recusar o descarte de worktree libera a sessão para nova tentativa.
- `App.tsx` tem 2883 linhas, abaixo do teto de 2889 do teste arquitetural.

## Validação executada

| Verificação | Resultado |
|---|---|
| TypeScript (`tsc --noEmit -p tsconfig.app.json`) e `git diff --check` | aprovados |
| Diálogos, fluxos adicionais, arquitetura C-2 e aviso de persistência | 41/41 aprovados |
| `ChatInput`, diálogos e FATIA 09 | 56/56 aprovados na execução conjunta; o teste de streaming passou também na suíte ampla |
| `App.test.tsx` | 69 aprovados, 13 skips; mais dois testes focados de worktree aprovados após o ajuste |
| Regressão U-1 em Chromium (`e2e-u1.sh`) | 13/13 aprovados |
| E2E U-2 em Chromium, porta 5220 e dados descartáveis | 1/1 aprovado: casca e porta reais, foco seguro, recusa, campo e largura 800×600; não é uma jornada completa de todos os fluxos |
| Contrato de asserções E2E | 6/6 aprovados após ajustar a declaração da nova spec |

A suíte ampla final, com dois workers, registrou **2308 aprovados, 33 skips e 3 falhas**. As falhas são as já conhecidas de `fatia07_destravar`, `editorTabs` e `monacoLoadFailure`; a suíte ampla, portanto, **não está integralmente verde**. Em execução anterior o contrato de asserções não reconhecia a declaração da nova spec; a declaração foi corrigida, o contrato passou isoladamente (6/6) e passou também na execução ampla final.

Na FATIA 09, a busca repetida por papel acessível em toda a árvore do jsdom com CSS ligado atrasava a renderização. A espera agora usa um seletor localizado, e a ação ainda verifica o botão por papel no cartão; o teste mantém as verificações do resultado. O limite do caso foi ajustado para 45 segundos por conta do custo do jsdom sob concorrência.

Logs desta rodada estão em `/home/user/u1-gates/38-u2/`; capturas da regressão U-1 estão em `/home/user/u1-gates/37-u2-regressao/`. Esses diretórios são evidências locais, fora do repositório.
