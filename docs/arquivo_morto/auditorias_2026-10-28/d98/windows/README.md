# D98 — evidências Windows independentes, 2026-10-28

Complementa o pacote Linux desta pasta; não o substitui nem homologa o Gate. Baseline `fd913db3d442511ae40a1d94ea2a2dfaaab88f4e`; produção `59dfc32` intacta. Estado e interpretação vigentes: **docs/09 §3.8.1**. Não usar o protótipo em produção.

## Inventário e limites

- `environment.json`: ambiente e memória livre no snapshot, não pico/RSS contínuo.
- `results-summary.json`: amostras, p50/p95 empíricos e métricas por braço/volume. As três amostras sem trace são r2/r3/r4; r1 com trace é diagnóstico separado. Componente isolado usa r1/r2/r3 sem trace. Backend tem rep0 warm-up e rep1–7 warm.
- `raw/`: JSON e logs originais gzipados **sem reserialização**; traces CDP já gzipados permanecem binariamente intactos. Nomes no relatório sem `.gz` correspondem ao arquivo descomprimido. `manifest.json` registra tamanho/hash original e armazenado. `SHA256SUMS` cobre os binários gzip; arquivos textuais podem sofrer conversão de newline no checkout Windows.
- `explorer-*`: app real, stats completos/erros, rede, DOM, tasks/timers, CPU e heap CDP. r0 é piloto com 6k untracked/SCM oculto; r1–r4 usam Explorer Git limpo. Os dados brutos distinguem linhas prontas de metadados completos.
- `scm-app-*`: app real original/experimento `virtual`; seleção de SCM já carregado, não boot total. A lista já renderiza oculta. `refreshObservedMs` contém espera fixa de 800 ms: não usar como latência exata até paint. Perfis individuais e spans de commits permitem análise separada.
- `component-*`: componente atual versus outra janela experimental com as mesmas linhas/callbacks; protótipo Linux não estava versionado. `mountSyncMs`, montagem até dois RAF, atualização e scroll são métricas diferentes.
- `functional-*`: atual 10/10, janela 7/10; badge total, foco e último arquivo reprovados no protótipo. Stage/unstage são chamadas reais sobre fixture e retornam 204. `*-first-attempt` e logs iniciais preservam falhas do harness, não benchmarks aprovados.
- `stability-real-app`: 9/9, create/modify/delete, atualização Explorer/SCM, stage/unstage e restauração dos bytes/Git limpo.
- `backend`: CLI, parser, GitHost, buildGroups e HTTP por amostra; não são camadas intercambiáveis.
- `trace-inspection`: também confere os traces Linux, sem alterá-los. São ~88.374 eventos Explorer e 48.403 SCM no pacote Linux. Os traces do SCM Windows começam antes de ativar a view/refresh, depois do boot/contexto; não cobrem toda a montagem oculta inicial.

Há falhas de harness preservadas: falta do preâmbulo React no HTML do piloto, ação de refresh oculta, expectativa errada HTTP 200 versus contrato 204 e erro de sintaxe antes de execução válida. Os scripts finais corrigem o diagnóstico, sem alterações de produto. Não se interpretam essas falhas como crashes do app. O outlier 5k original com trace (14,8 s) não foi incluído no p50/p95 sem trace.

## Reprodução no Windows

Pré-requisitos já usados: dependências npm instaladas em `platform/`, addons nativos compatíveis com Node, Git no PATH e Edge. Não instale bibliotecas novas para este pacote. Execute **da raiz do repositório**. Use uma pasta nova **fora do repo**; o bootstrap recusa saída existente ou interna e nunca apaga uma pasta.

```powershell
$diagnostics = Join-Path $env:TEMP ('d98-windows-' + [guid]::NewGuid())
node docs/arquivo_morto/auditorias_2026-10-28/d98/windows/scripts/bootstrap.cjs $diagnostics
node (Join-Path $diagnostics 'measure.cjs') component
node (Join-Path $diagnostics 'measure.cjs') explorer
node (Join-Path $diagnostics 'measure.cjs') explorer-extra
node (Join-Path $diagnostics 'measure.cjs') scm
node (Join-Path $diagnostics 'measure.cjs') scm-virtual
node (Join-Path $diagnostics 'measure.cjs') functional
node (Join-Path $diagnostics 'measure.cjs') stability
node (Join-Path $diagnostics 'measure.cjs') backend
node (Join-Path $diagnostics 'summarize.cjs')
node (Join-Path $diagnostics 'scm-table.cjs')
node (Join-Path $diagnostics 'final-summary.cjs')
```

Cada comando cria um Vite local em **127.0.0.1:5175**, navegador/contextos novos e HOME/USERPROFILE/arquivos de configuração fictícios. Não execute em paralelo nem use 5174. O bootstrap gera 22 mil arquivos fictícios e commits somente nos repos de fixture. Explorer fica Git limpo no protocolo principal. Para reproduzir o piloto com SCM oculto de 6k, use outra pasta nova e `D98_KEEP_EXPLORER_DIRTY=1` apenas no processo gerador, depois modo `pilot`; o piloto original teve etapas incompletas preservadas nos logs, mas o harness final corrigido pode completá-las; r0 não entra nas tabelas finais. Não modificar variáveis globais do Windows.

O plugin externo transforma módulos em memória para instrumentar e experimentar; nada é escrito nos fontes de produção. O modo virtualizado é estritamente diagnóstico, sem equivalência funcional completa. A fila de stats limita a operação completa, não só o início do fetch. Os resultados originais vieram de caminhos longos do diretório de evidências; usar `%TEMP%` curto muda URI/payload e pode mudar métricas. Preserve essa variável ao comparar.

As operações de página têm timeouts de 30/60/90 s; iniciar o servidor tem polling limitado. O harness encerra Edge/Vite em `finally`. Se o processo for morto externamente, confirme e encerre somente seus PIDs, nunca processos de trabalho do usuário. Bootstrap e syntax check foram validados em pasta externa nova. As medições válidas foram executadas com os scripts preservados, antes da sua cópia para o arquivo morto.

Para inspecionar um JSON comprimido, sem escrever no repositório:

```powershell
node -e "const f=require('fs'),z=require('zlib'); console.log(z.gunzipSync(f.readFileSync(process.argv[1])).toString())" docs/arquivo_morto/auditorias_2026-10-28/d98/windows/raw/functional-virtual.json.gz
```

Traces descomprimidos podem ser abertos no painel Performance do DevTools. Não somar durações de eventos aninhados como se fossem parcelas independentes de CPU. Nenhuma evidência deste pacote autoriza otimização permanente, aprovação automática de SPEC, Fatia 13 ou iniciativas M.

A saída 0 do harness significa coleta terminada, não aprovação: leia `checks`, erros e status nos JSON. O protótipo contém reprovações funcionais deliberadamente preservadas. O Profiler adicional do SCM foi introduzido depois da coleta isolada inicial; a reprodução final mantém essa instrumentação nos dois braços. Diferenças pequenas por instrumentation/versão não alteram a distinção entre fluxo real e componente isolado.
Conferência final: `fixture-integrity.json.gz` verifica o conteúdo de todos os 22.000 arquivos gerados, três sentinels e estado Git esperado; nenhum byte divergente, staged residual ou mudança inesperada. Explorer voltou a Git limpo.
