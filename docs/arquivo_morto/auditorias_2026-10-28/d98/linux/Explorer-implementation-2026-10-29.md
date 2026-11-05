# D98-Explorer — implementação e validação Linux (2026-10-29)

## Estado e alcance

- Etapa A/SCM continua em commit local separado `4f277db` (`feat(scm): virtualize source control list`).
- Etapa B/Explorer foi implementada depois da Etapa A e commitada localmente em `29b1399` (`feat(explorer): batch stats and virtualize tree`), no branch `d98/performance-implementation`. Código e documentação estão em commits separados. Não houve push.
- O gate D98 continua **aberto e não homologado**. Esta evidência Linux não substitui a revisão independente do Codex no Windows nem o aceite humano.
- Preservado `FileSystemPortLike`; o batching é interno ao `BrowserFsPort`, a chamada individual `/fs/stat` segue sendo usada para 1 URI, e o endpoint JSON `/fs/statBatch` é limitado a 64 URIs por lote. A fila de stat é compartilhada pela árvore, com resultados antigos descartados por geração. `statBatch` aplica `FsHost.stat` e as validações existentes por URI; não amplia permissões nem muda F1–F4.
- A virtualização limita somente linhas montadas: modelo, contagem lógica, ordenação, metadados, seleção, foco, ARIA e navegação continuam cobrindo a árvore completa. Repaints são coalescidos por frame; âncora pendente preserva posição/foco ao receber snapshots parciais durante refreshes repetidos.

## Ambiente e método

- Debian GNU/Linux 13 (trixie), Linux 6.1.158+, x86-64; 2 vCPUs Intel Xeon @ 2,60 GHz; memória total reportada: 2,03 GB.
- Node 20.20.2, npm 10.8.2, Playwright 1.63.0, Chrome for Testing 153.0.8010.12; viewport 1400×900.
- Vite real em `127.0.0.1:5175`, uma fixture marcada, descartável e fora do repositório por execução; Playwright Chromium headless; sem traces durante a coleta. Fixtures tinham 0, 1, 1.000 ou 5.000 arquivos regulares sob `five-thousand-files`.
- Para 0 e 1 arquivo: `--repeat-each=3`; para 1.000 e 5.000: `--repeat-each=7`. As repetições não são uma comparação A/B pareada: todas executam a implementação nova, e não houve exclusão formal de uma amostra warm-up antes das sete. O tempo medido começa imediatamente antes do clique de expansão e termina após a altura lógica completa e dois `requestAnimationFrame` correspondentes; boot, inicialização da view e carregamento inicial da página ficam fora da métrica. p50/p95 populacionais não são inferidos: “máximo” abaixo é somente o maior dos 3 ou 7 pontos observados.
- O teste mede atraso máximo de um timer de 20 ms e observa entradas `PerformanceObserver('longtask')` durante a expansão. `maxLongTaskMs=0` significa que não houve entrada long-task observada, não uma tarefa literal de duração zero.

## Métricas E2E

A sequência numérica em cada célula preserva a ordem das execuções. Expansão e timer em milissegundos.

| Fixture | Expansão: amostras | Mediana / máximo | Atraso do timer: amostras (máximo) | Long tasks | Stats / batches | Linhas DOM iniciais |
|---:|---|---:|---|---:|---:|---:|
| 0 | 96,0; 98,3; 113,0 | 98,3 / 113,0 | 5,3; 10,4; 10,0 (10,4) | nenhuma | 0 / 0 | 1 |
| 1 | 108,2; 103,0; 101,6 | 103,0 / 108,2 | 1,3; 11,3; 8,0 (11,3) | nenhuma | 1 / 0 | 2 |
| 1.000 | 214,4; 227,6; 188,7; 248,0; 266,0; 241,2; 239,3 | 239,3 / 266,0 | 17,5; 2,3; 13,0; 27,2; 12,5; 12,3; 32,5 (32,5) | nenhuma | 1.000 / 16 | 39 |
| 5.000 | 997,5; 923,5; 965,6; 475,4; 537,4; 487,4; 930,3 | 923,5 / 997,5 | 31,1; 27,0; 27,8; 30,9; 94,4; 37,9; 25,3 (94,4) | 59 ms (1/7) | 5.000 / 79 | 39 |

Em todos os runs, a asserção de DOM foi ≤60 itens montados e `aria-setsize`/contagem lógica incluiu todos os itens; `End` revelou o último item, com geometria dentro do viewport. A fixture íntegra enviou stat para cada URI esperado. O teste E2E conta URIs incluídas em `/fs/stat` e `/fs/statBatch`; a correção de metadados completos e erros por URI também é coberta por testes unitários/de integração (ver abaixo), não por inspeção individual de 5.000 respostas pelo browser.

Nos volumes com metas explícitas, todas as amostras ficaram abaixo de expansão ≤1.500 ms (1k) e ≤4.500 ms (5k), timer ≤150 ms e long-task ≤150 ms; uma das sete amostras 5k observou 59 ms. Isso não comprova o limite comparativo ≤1,20×/≤0,90× contra controle: não houve braço de controle pareado nesta implementação, nem baseline Windows comparável. Não se extrapola para 10k Explorer, outros filesystems, Edge ou SLA populacional.

## Refresh, foco, navegação e regressões funcionais

- O E2E 5k final passou **7/7** com refreshes consecutivos: remove o item âncora selecionado e adiciona arquivo antes dele; preserva vizinho selecionado e seu offset em pixels; a atualização seguinte remove o vizinho focado e avança a âncora/foco novamente; a terceira atualização restaura a fixture. Só então `End` deve montar/selecionar `item-04999.txt` e deixá-lo dentro do viewport. A fixture foi conferida novamente com exatamente 5.000 arquivos e nomes originais; as temporárias foram retiradas.
- E2E `e2e/sessao_12_explorer.spec.ts` seletivo, novamente após a implementação: **6/6 passou** — lazy expand/collapse sem reler, criar arquivo, rename F2/Enter/Escape, collapse-all + refresh com arquivo externo, Paste real e teclado Shift+F10/foco/scroll.
- O cenário E2E restante de upload/drag-drop falhou: o trace mostrou `/fs/mkdir` 403 `forbidden_path` para `file:///`/`file:///tmp` e `/fs/upload` 403 `local_only`; a rota envia `application/octet-stream`, enquanto a fronteira global existente de métodos inseguros `/fs` exige JSON. Não se alterou nem afrouxou `server/local-boundary.mjs`/F1–F4, nem se contornou a fronteira para obter verde. Logo, upload/DnD no caminho do navegador permanece bloqueador de aceite, ainda que os testes de serviço/porta isolados cubram outras transferências.
- Vitest focado final: **80/80 em 8 arquivos**, incluindo fila concorrente compartilhada, lote limitado, metadata completa, erro isolado por URI, descarte de lote obsoleto após geração, refresh/cancelamento lógico, árvore de 5k, virtualização, seleção/End e contrato do anexo E2E.
- Typecheck `npm run typecheck`: passou. ESLint dirigido nos arquivos alterados, incluindo spec Playwright: passou. `git diff --check`: passou antes do commit de código `29b1399`.

## Desvio quantitativo a revisar

A proposta de SPEC anterior descrevia uma fila de até 16 operações completas e listava o critério “pico ≤16 por instância”. A implementação aprovada para Explorer acrescenta batching interno e `/fs/statBatch`, cujo limite é 64 URIs; a porta envia no máximo um lote HTTP por vez e o servidor processa os até 64 `FsHost.stat` daquele lote em `Promise.all`. Os resultados observados são 16 lotes/1k e 79/5k. Portanto, se “16” significa operações `stat` individuais concorrentes até o filesystem, a implementação **não atende esse número** (pode haver 64 stats simultâneos no servidor); se significa requests HTTP em voo, o fluxo atual tem um lote por vez. Não houve ensaio pareado 16-versus-64. O número candidato original não foi mudado silenciosamente: esta semântica e a justificativa do lote devem ser revisadas antes de tratar esse critério como satisfeito.

A rota `/fs/statBatch` só existe para o batching interno desta SPEC, valida 1–64 URIs, responde metadados completos com erros por URI e reaproveita as validações de `FsHost.stat`. Não altera `FileSystemPortLike`, fallback individual, regras de autorização nem qualquer endpoint fora do escopo D98-Explorer.

## Regressão global e build

- Última suíte global Vitest: **119 arquivos passaram, 4 falharam, 2 skipped; 989 testes passaram, 12 falharam, 27 skipped**. Falhas em `TerminalPanel.test.tsx` (9), `iconLabels.test.ts` (1), `themeTokens.test.ts` (1) e `visualStates.test.ts` (1). O contrato `e2eAssertionContract.test.ts` passou; as mesmas quatro áreas já eram falhas conhecidas da rodada anterior, mas não houve comparação integral pareada em HEAD limpo para provar causalidade.
- Build de produção não validado: `build:fs-boundary` reportou que o helper nativo fica desativado porque rename concorrente do diretório-pai não está contido; TypeScript passou. Vite esgotou heap no build padrão (processo abortado durante `transforming`) e, com `NODE_OPTIONS=--max-old-space-size=1280`, ficou sem avanço em `transforming` por 15 minutos e foi encerrado. Não afirmar build aprovado.

## Instruções para repetição independente no Windows/Codex

Executar a partir de `platform/apps/workbench-v2`, branch/código que inclua `29b1399` e a documentação acompanhante. Usar Node/npm compatíveis com o lockfile, instalar Chromium do Playwright e não usar workspace de usuário como fixture. Em PowerShell, um exemplo para 5k:

```powershell
$fixture = Join-Path $env:TEMP 'd98-explorer-codex-5000'
$dir = Join-Path $fixture 'five-thousand-files'
New-Item -ItemType Directory -Force $dir | Out-Null
1..5000 | ForEach-Object { New-Item -ItemType File -Path (Join-Path $dir ('item-{0:D5}.txt' -f ($_ - 1))) | Out-Null }
$env:FS_TEST_ROOT = (& node -e 'process.stdout.write(require("node:url").pathToFileURL(require("node:path").resolve(process.argv[1])).href)' "$fixture")
$env:D98_EXPLORER_EXPECTED = '5000'
```

Criar o marcador irmão `${fixture}.d98-explorer-fixture` com conteúdo UTF-8 exato `D98 disposable Explorer fixture` mais newline:

```powershell
[System.IO.File]::WriteAllBytes("${fixture}.d98-explorer-fixture", [System.Text.Encoding]::UTF8.GetBytes("D98 disposable Explorer fixture`n"))
```

Iniciar Vite usando esse mesmo `FS_TEST_ROOT`:

```powershell
npm run dev -- --host 127.0.0.1 --port 5174 --port 5175 --strictPort
```

Em outro terminal, ainda no pacote:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5175'
npx playwright test e2e/d98_explorer.spec.ts --repeat-each=7 --reporter=line
```

Repetir com fixtures isoladas de 0, 1 e 1.000 arquivos e ajustar `D98_EXPLORER_EXPECTED`; cada raiz precisa conter `five-thousand-files` e marcador irmão. Guardar todas as medições, erros, trace e screenshots; conferir/limpar somente as fixtures marcadas depois de confirmar que `End` e refreshes restauraram a contagem e o conteúdo. Executar também o E2E funcional e a regressão completa; registrar explicitamente upload/DnD, ACL/reparse points, typecheck, build e qualquer falha global. Não trocar `application/octet-stream` ou contornar regras da fronteira local para forçar o teste. O Codex deve comparar com o critério original de 16 e decidir com o dono se é preciso outra iteração; não declarar homologação a partir desta execução Linux.
