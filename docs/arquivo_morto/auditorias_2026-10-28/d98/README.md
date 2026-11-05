# D98 — pacote de evidências (2026-10-28)

Artefatos auxiliares da investigação aberta; o estado, método, resultados e limitações vigentes estão no canônico `docs/09 - TESTES E AMBIENTE.md`, §3.8. Este diretório **não é documento canônico** e não altera Fatias 07–12, F1–F5-B, contratos aprovados ou implementação de produção.

## Baseline e ambiente

- Repositório: branch `docs/capacidades-d102-alinhamento`, HEAD de referência `59dfc32c99417136c9817984c81456803f296e58`.
- Linux x86_64, kernel 6.1.158; Node 20.20.2; Git 2.47.3; Vite 5.4.21; Playwright 1.63.0; Chromium distribuído por Playwright, revisão `1243`.
- RAM visível: 1.982 MiB, sem swap; disponível variou durante os testes. 5175 foi a única porta do app usada; 5174 e projetos reais não foram acessados. HOME isolado em `/tmp/d98-home`.
- `raw/` mantém saídas JSON e traces CDP originais copiados do ambiente temporário, inclusive a tentativa Explorer 5k interrompida por falha no boot. Traces gzipados devem ser preservados sem reserialização.

## Fixtures

`generate-fixtures.mjs` recria, sob `/tmp/d98-fixtures`, repositórios Git descartáveis com arquivos untracked (1k, 2k, 3k, 5k e 10k) e um repo Explorer com pastas `children-1000`/`children-5000`. O script recusa raízes fora de `/tmp/` e substitui apenas subpastas com nomes próprios da fixture. São dados sintéticos; nunca usar projeto real.

## Inventário de `raw/`

- `scm-1000.json` + `scm-1000.trace.json.gz`: sessão do app real/SCM 1k e trace CDP.
- `explorer-1000.json` + `explorer-1000.trace.json.gz`: expansão real Explorer 1k e trace CDP.
- `explorer-5000.json`: tentativa que expirou aguardando a UI inicial `.agent-sessions-workbench`; corpo vazio, nenhuma chamada `/fs/list`/`/fs/stat`, uma falha `ERR_INSUFFICIENT_RESOURCES`. **Não é uma medição de expansão 5k.**
- `component-{1000,5000}-real.json`: montagem isolada do componente `ChangesList` atual, com retorno real de `/git/status` e `buildGroups` para a fixture correspondente.
- `component-{1000,5000,10000}-virtual.json`: protótipo local não versionado de janela visível, usando a mesma API/fixture; prova exploratória, não candidata a produção.

As medições de GitHost, `buildGroups`, parser, Git CLI e HTTP estão resumidas em `raw/isolated-git-summary.json` e relatadas com ressalvas em §3.8 do canônico 09; o arquivo temporário de Vitest e as sete amostras individuais não foram preservados, logo esse resumo não substitui uma repetição futura. Os demais traces/JSON são os dados originais mantidos sem reserialização. Harnesses temporários foram retirados do caminho de produção ao encerrar a rodada. Não usar a tentativa Explorer 5k nem os protótipos como baseline homologada ou como aprovação de SPEC.
