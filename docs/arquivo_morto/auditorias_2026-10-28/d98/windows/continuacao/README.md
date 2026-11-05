# Continuação D98 — profiling Explorer e fundamentação das SPECs, 2026-10-28

Baseline documental `70eba74`; produção `59dfc32` inalterada. Complementa o pacote Windows anterior, sem substituí-lo. **SPECs candidatas no canônico 06; método e diagnóstico no 09 §3.8.2. Não há aprovação, implementação ou homologação.**

## Dados e interpretação

- `deep-summary.json`: três amostras sem trace por braço, 5k, todos os metadados completos. Controle, coalescing, corte40, combinação e combinação com fila de 16. Alternativas em blocos; não chamar o p95 de SLA robusto.
- `raw/*.json.gz` e `*.log.gz`: bytes originais apenas comprimidos, sem reserialização. `manifest.json` e `SHA256SUMS` verificam os binários e registram hashes/tamanhos dos originais. Arquivos textuais dos scripts podem mudar newline no checkout Windows.
- `deep-baseline-0`/`deep-coalesce-cap16-0`, `cpu-*` e traces correspondentes: execuções com CPU sampling/trace, separadas das medianas. Funções e etapas têm timings inclusivos/nativos sobrepostos; não somar React Profiler, RunTask, layout e GC como parcelas independentes.
- `functional-{real,virtual}`: probes dos mesmos três defeitos SCM, agora com estado da janela e dois scroll containers. `scroll-app*` também verifica a URI correta e clips/viewport no aplicativo real, depois de revelar a linha. A mera presença do último nó DOM não basta.
- `fixture-final-state`: Explorer Git limpo, SCM com quantidades esperadas de untracked e sem staged residual; sentinels preservados. Não houve escrita de conteúdo nas fixtures nesta continuação; stage/unstage só alteraram temporariamente o index fictício.
- `harness-initial-*`, `unapplied-*`, logs `baseline*`/`deep-pilot`: ensaios inválidos do instrumento (declaração JSX, marcador lógico e tentativa de coalescing não aplicada). Preservados para rastreabilidade, excluídos das tabelas. O braço coalescing válido foi repetido e mostrou três notificações para um commit pesado.

**Corte de 40 não é virtualização pronta:** ele mantém o modelo/metadata, cria o JSX completo e deixa só 40 linhas entrarem em React/DOM. Serve para separar o custo de reconciliação/DOM dos custos da árvore e transporte. Não permite navegar por todos os arquivos e jamais pode substituir o produto ou ser usado como aceite funcional. A fila de 16 isolada já foi medida antes; não se repetiu a auditoria inteira.

## Reprodução

Da raiz do repo, com as mesmas dependências npm/Edge da rodada anterior; nada novo precisa ser instalado. Um Vite por vez, somente `127.0.0.1:5175`. HOME/USERPROFILE e arquivos de configuração são fictícios; nenhuma chamada a provedor real. O bootstrap verifica hashes das quatro fontes instrumentadas (normalizados por newline): se a produção mudou, revisar/adaptar o instrumento antes de usar, sem silenciar o bloqueio. Não usar este monkeypatch como benchmark de aceite da implementação futura sem adaptar a instrumentação.

Para reutilizar as fixtures já geradas, passe sua raiz como segundo caminho:

```powershell
$diagnostics = Join-Path $env:TEMP ('d98-continuacao-' + [guid]::NewGuid())
$fixtures = 'C:\caminho\para\d98-windows-20261028\fixtures'
node docs/arquivo_morto/auditorias_2026-10-28/d98/windows/continuacao/scripts/bootstrap.cjs $diagnostics $fixtures
node (Join-Path $diagnostics 'measure-deep.cjs') baseline
node (Join-Path $diagnostics 'measure-deep.cjs') coalesce
node (Join-Path $diagnostics 'measure-deep.cjs') cap
node (Join-Path $diagnostics 'measure-deep.cjs') coalesce-cap
node (Join-Path $diagnostics 'measure-deep.cjs') coalesce-cap16
node (Join-Path $diagnostics 'measure-deep.cjs') profile
node (Join-Path $diagnostics 'measure-deep.cjs') profile-best
node (Join-Path $diagnostics 'measure-deep.cjs') functional
node (Join-Path $diagnostics 'measure-deep.cjs') scroll-app
node (Join-Path $diagnostics 'measure-deep.cjs') scroll-app-virtual
node (Join-Path $diagnostics 'summarize-deep.cjs')
node (Join-Path $diagnostics 'trace-stages.cjs')
node (Join-Path $diagnostics 'best-stages.cjs')
node (Join-Path $diagnostics 'cpu-top.cjs')
```

Sem o argumento `$fixtures`, o bootstrap gera outro conjunto fictício pelo gerador anterior, sempre numa saída externa nova. Não usa diretórios pessoais/projetos reais: valida sentinels do gerador e recusa raiz de fixture interna ao repo. Nada é apagado. A reprodução desta etapa efetivamente reutilizou as fixtures anteriores; esse fallback é só para quem não as possui. Copiar as fixtures para raiz mais curta muda URIs/bytes e pode alterar as métricas.

`deep-plugin.mjs` é a transformação temporária. `measure-deep.cjs` é o harness baseado no anterior, com hooks explícitos de etapas e coleta CPU/probes. `component-probe-template.txt` é o mesmo protótipo SCM anterior com inspeção da geometria. Nenhum desses arquivos é importado pela configuração de produção. Cada comando encerra contextos/Edge e Vite em `finally`; timeouts de página/requisição são explícitos. Se um processo for morto externamente, encerrar somente a árvore de PIDs pertencente ao diagnóstico. Não deixar serviços novos permanentes.

A saída 0 significa coleta terminada, não aprovação: ler status, erros, checks e completude nos JSON. Provas do protótipo reprovadas continuam reprovadas. Bootstrap/syntax/config foram conferidos em pasta externa nova; scripts finais não autorizam otimização definitiva, Fatia 13 ou iniciativas M.
