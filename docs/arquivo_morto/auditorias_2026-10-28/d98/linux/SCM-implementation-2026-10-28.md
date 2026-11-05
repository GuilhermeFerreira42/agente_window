# D98-SCM — implementação e verificação local no Linux (2026-10-28)

## Escopo e estado

Implementação da Etapa A/SCM, autorizada explicitamente em 2026-10-28. A lista visual agora calcula uma janela de linhas de 22 px com overscan a partir do único scroll owner; o modelo Git completo continua sendo fonte de contagens, ações e posições ARIA. Foco/Tab/Shift+Tab/Arrow/Home/End, ação por teclado, URI estável entre grupos, âncora do scroll e viewport oculto são preservados sem truncar itens.

Este documento registra execução local Linux. **Não é homologação do Gate D98**, não substitui a validação independente Windows do Codex nem a revisão humana. D98-Explorer não foi iniciado nesta rodada de trabalho até o encerramento desta etapa.

## Ambiente

- Linux x86_64, kernel `6.1.158+`, Debian 13 (trixie).
- Node `v20.20.2`; Playwright `1.63.0`; Chrome for Testing `153.0.8010.12` headless.
- CPU reportada: Intel Xeon 2,60 GHz; 2 vCPUs visíveis; viewport 1400×900.
- Fixtures descartáveis próprias em `/tmp`, repositórios Git isolados com 1.000, 5.000 e 10.000 arquivos untracked; `FS_TEST_ROOT` alternado entre elas. Nenhum workspace/repositório do usuário foi alterado. O marcador da fixture foi explicitamente excluído do status Git.
- Sete repetições warm por volume; uma primeira ativação usada para carregar o estado e excluída. Cada amostra seguinte alterna Explorer→SCM com o modelo já carregado e mede o clique de ativação até estado coerente e dois `requestAnimationFrame`. Não inclui boot, seleção de workspace, `git status` frio nem escolha da pasta. p95 com sete pontos é o máximo empírico observado, não SLA populacional.

## Ativação do SCM: medição final após correção de foco

Tempo em milissegundos. São sete alternâncias warm por volume; todas observaram a contagem lógica esperada e dois RAF após ativação. Estes valores substituem a medição preliminar registrada antes da correção final de foco.

| Recursos | Sete amostras (ms) | p50 mediano | p95 empírico (máximo) | Limite inicial |
|---:|---|---:|---:|---:|
| 1.000 | 103,8; 110,4; 135,9; 120,1; 184,1; 114,9; 116,0 | 116,0 | 184,1 | 200 |
| 5.000 | 75,7; 129,7; 90,3; 67,8; 135,4; 83,9; 52,1 | 83,9 | 135,4 | 200 |
| 10.000 | 104,1; 80,9; 113,4; 182,2; 100,3; 125,3; 151,6 | 113,4 | 182,2 | 200 |

O máximo empírico ficou abaixo do limite inicial de 200 ms nos três volumes, com 15,9 ms de margem em 1k. Isso é uma medição pós-implementação no Linux e cenário warm; não comparar como se fosse par de mesma máquina/cache com o baseline Windows (p50 original 247/1014/1774 ms registrado em `09 §3.8.1`). O protocolo mede serviço/modelo já carregado, clique até coerência + dois RAF; não inclui boot, seleção do workspace ou `git status` frio. p95 com sete pontos é o máximo empírico observado, não SLA populacional.

## Antes/depois observados

| Indicador | Antes / evidência diagnóstica Windows | Depois / execução Linux desta implementação | Observação |
|---|---:|---:|---|
| Recursos lógicos | 1k, 5k ou 10k | 1k, 5k ou 10k íntegros (`data-total`, badge e `aria-setsize`) | Janela DOM não é a fonte de contagem. |
| Linhas de recurso no DOM | 1.000 no cenário 1k; 1.002 linhas lógicas incluindo provider/grupo; 20.558 nós documento | em geral ~32–40 recursos por viewport; pico observado 42 quando a linha focada fica pinada; `<100` nos E2E | Número de linhas varia com viewport/foco. |
| DOM total no documento | 20.558 nós no app original 1k | 1.227 nós em captura do app 10k, viewport 1400×900 | Não é comparação A/B pareada; prova de escala local, não orçamento universal. |
| Final da lista | protótipo anterior omitiu itens finais e perdia foco | End chegou ao recurso 1.000/5.000/10.000; geometria do row ficou dentro do viewport | Verificado no browser real em fixture. |
| Ações | callbacks/actions do app sem otimização | Stage→Unstage em arquivo final do fixture, status Git correto e bytes inalterados | Sem commit; conteúdo sob fixture descartável. |

O baseline Windows e os protótipos diagnósticos estão detalhados em `09 §3.8.1–3.8.2`; não são intercambiáveis com estas medições locais.

## Evidência funcional e E2E

A spec `platform/apps/workbench-v2/e2e/d98_scm.spec.ts` foi executada contra a aplicação real/Vite, Chromium headless e repositórios Git descartáveis nos três volumes (1k/5k/10k). Em cada volume passou: contagem completa; árvore ARIA; DOM limitado; Tab do provider à ação e ao grupo; End até o último recurso; row dentro do viewport; Stage/Unstage real; `git status` coerente; bytes preservados; refresh com arquivo temporário (+1 e remoção); troca para Explorer com zero linhas de recurso e retorno ao SCM com contagem e janela restauradas.

Resultados finais de Playwright: **1/1 passou em cada volume** (execuções separadas; sem retries). Depois da correção de foco, 1k passou em 13,5 s e 10k em 7,9 s; 5k passou novamente em 8,5 s após aquecimento do Vite. A execução inicial de 5k após a correção levou 1m51s; esse outlier não se repetiu, mas não houve trace/telemetria por fase que permita atribuir sua causa. O tempo E2E é funcional, não mede o alvo de ativação. A spec exige `FS_TEST_ROOT` marcado como fixture, root fora do repositório e `D98_SCM_EXPECTED=1000|5000|10000`; seu `afterEach` restaura apenas o arquivo conhecido do fixture e remove apenas a linha temporária criada pelo próprio teste.

Após a correção final de foco, Vitest dirigido (7 arquivos: `ChangesList`, helper de viewport, `changesConfirm`, `gitService`, `frontier`, `attachDialog` e contrato E2E): **45/45 passaram**, incluindo o ciclo de ocultar/desmontar e reabrir/restaurar o recurso focado. O teste 10k verifica contagens, ação de grupo com 10.000 recursos, ARIA e End até o último item com DOM limitado. `npm run typecheck` e ESLint dirigido passaram.

## Regressão global, build e limitações

- Regressão global repetida após a correção final: `npm test -- --reporter=dot`: **972 passaram, 12 falharam, 27 skip** (123 arquivos; 283,46 s). As mesmas quatro suítes fora do perímetro SCM falharam: `TerminalPanel.test.tsx` (9), `iconLabels.test.ts` (1), `themeTokens.test.ts` (1), `visualStates.test.ts` (1). Não foi feita execução comparável em HEAD antes das alterações; causalidade/baseline não está provada. A suíte global permanece não verde; os testes D98 dirigidos/E2E passaram.
- `npm run build`: após reparar apenas o binário local já declarado `node-pty` (sem alterar manifest/lock), duas tentativas foram terminadas pelo SO com código 137 durante `vite build`/`transforming`. Typecheck e lint focado passam; build de produção não foi concluído neste limite de memória/ambiente. `build:fs-boundary` informou sua desativação fail-closed existente (`concurrent parent-directory rename is not contained`), não modificada por D98.
- Nenhum leitor de tela/tecnologia assistiva foi exercitado; `role`, nomes e contagens ARIA foram verificados por testes e Playwright, mas isso não prova homologação acessível completa. Teste independente Windows/Edge ainda é responsabilidade do Codex.
- Não houve alteração em GitHost/GitService, protocolos, dependências ou contratos de filesystem. Não houve commit/push no momento da coleta deste relatório.

## Reproduzir o E2E

1. Criar fora do repositório um Git fixture com `files/item-00000.txt` até `item-(N-1).txt`, inicializar `.git`, criar `.d98-scm-fixture` com conteúdo exato `D98 disposable SCM fixture\n` e adicionar `/.d98-scm-fixture` a `.git/info/exclude`.
2. Iniciar Vite local na porta 5175 com `FS_TEST_ROOT=file:///caminho/absoluto/fixture`.
3. No app `platform/apps/workbench-v2`, executar:

```sh
FS_TEST_ROOT=file:///caminho/absoluto/fixture \
D98_SCM_EXPECTED=5000 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 \
npx playwright test e2e/d98_scm.spec.ts --reporter=line
```

4. Repetir com fixtures 1.000 e 10.000, alterando `D98_SCM_EXPECTED` e a raiz do servidor. A spec usa o endpoint normal do app e não injeta modelo/mocks.
