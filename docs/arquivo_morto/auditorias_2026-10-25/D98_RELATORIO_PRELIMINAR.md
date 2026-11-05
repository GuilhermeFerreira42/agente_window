# Agente Window — Gate D98: investigação preliminar SCM + Explorer

**Data:** 2026-10-25  
**Fonte:** `workspace-01a16f87-af77-7ed7-b396-842391374c3a.zip`  
**HEAD observado:** `261b0a6b538bfd2f769a1703cd8fd4fa08b44eb9`  
**Perímetro:** leitura estática do workspace + benchmarks **isolados**; **nenhum código de produção editado**.

## 1. Estado e contrato

A pasta `docs/` contém os nove documentos canônicos. Todos os nove estão modificados em relação ao HEAD do arquivo Git; há conteúdo adicional não rastreado em `docs/arquivo_morto/`. Mantidos intactos. `05 - DECISOES.md` D98 e D99 e `06 - PROXIMAS FASES E DIVIDAS.md` §“MICRO-FATIA PERF” exigem confirmar o problema antes de SPEC quantitativa, e proíbem alteração permanente de produção sem aprovação específica. A D101 especifica comparação mensurável por cenário, não alegação geral de superioridade.

## 2. Inspeção do código (fatos verificados estaticamente)

1. `src/modules/explorer-search/server/git/gitHost.ts`: `status()` chama `git status --porcelain=v2 -z --branch --untracked-files=all`, converte o resultado em entradas e ordena por caminho. O subprocesso `execFile` possui timeout de 15s e `maxBuffer` 16 MiB. **Risco a medir:** muitos caminhos/saída volumosa e custo de conversão, rede/antivírus Windows e refresh concorrente; nada disso foi reproduzido aqui.
2. `src/modules/explorer-search/core/git/gitService.ts`: o refresh usa debounce de 300ms e token “último vence” para o resultado. A leitura anterior do Git em execução não é necessariamente cancelada no processo: conferir ciclo completo com traces antes de concluir.
3. `src/modules/explorer-search/ui/attach/changes/ChangesList.tsx`: `state.groups.map` e `group.items.map` montam uma linha React para cada alteração dos grupos; **não há janela de linhas renderizadas neste componente**. Com 20 mil alterações, o custo potencial cresce com a lista toda.
4. `src/modules/explorer-search/ui/ExplorerView.tsx`: `service.getVisibleRows()` produz linhas expandidas; `rows.forEach` em `renderRows()` cria um `RowShell` para cada linha visível. O `height: rowCount * 22` e posições absolutas não constituem virtualização: não limitam a quantidade de componentes renderizados. Não foi identificado recorte por scroll/viewport nesse trecho.
5. `src/modules/explorer-search/server/fs/fsHost.ts`: `list()` faz `readdir({withFileTypes:true})` e retorna `dirents.map`, sem `stat` de cada item **nessa função**. Custos de `stat` em fluxos subsequentes exigem tracing específico; não atribuir 1 stat/arquivo a este método.

## 3. Medições isoladas — NÃO são benchmarks do produto

Ambiente: container Linux desta análise, Git local, Chromium headless 144; fixture sintética composta de arquivos simples não rastreados, em repositório temporário. Medianas Git calculadas sobre quatro medições consecutivas (incluindo cache do SO). Valores dependem de máquina e cache. O HTML reproduz apenas o **volume/complexidade aproximada** de nós aninhados, não os componentes React, CSS, observers, handlers e efeitos da aplicação.

| Volume | Git `status` (mediana de 4) | Tempo criação DOM protótipo | Layout síncrono protótipo | Nós DOM protótipo |
|---:|---:|---:|---:|---:|
| 1.000 | 2,0 ms | 17,4 ms | 51,1 ms | 7.000 |
| 5.000 | 4,7 ms | 57,0 ms | 199,5 ms | 35.000 |
| 20.000 | 15,3 ms | 222,0 ms | 860,7 ms | 140.000 |

Controle ilustrativo: uma montagem limitada a 70 linhas ficou entre ~0,5–5ms nesta amostra, **sem equivalência funcional e sem renderização React**. Não interpretar a diferença como ganho previsto do produto.

**Interpretação:** este cenário reforça a hipótese de que o custo de renderização/layout pode superar o do Git. Não identifica sozinho a causa raiz observada em Windows 11, no repositório `vscode-main` com ~23 mil arquivos. Em repositórios rastreados, cenários de Git com arquivos modificados, Windows/antivírus, CPU lenta e caches diferentes, resultados podem mudar significativamente.

## 4. Evidências ainda faltantes para encerrar Gate D98

- CDP/Performance trace **do Agente Window real** na máquina/contexto reproduzível, abrindo workspace grande e SCM/Explorer, com timeline de long tasks, React commit/render, DOM nodes, memória, eventos e timestamps por ação.
- Medir **separadamente** Git CLI, `gitHost.status`, serialização/transferência, `GitService.buildGroups`, render React, layout/paint e expansão do Explorer; comparar cenário de 20 mil **rastreados e modificados**, não apenas não rastreados.
- Fixture de teste/bench isolada e verificável na stack real, com cenários pequeno/médio/grande e clique/scroll/refresh; evidência de uso efetivo de viewport virtualizada em protótipo separado.
- Comparação com VS Code 1.135 sob condições próximas, mantendo contexto de versão e medição; D101 só autoriza falar de paridade por cenário testado.
- Definir critérios quantitativos e minuta de SPEC **somente** depois dessas medições; usuário aprova antes de mudança permanente.

**Status:** INVESTIGAÇÃO PRELIMINAR, D98 **NÃO concluído**; sem produção alterada; Fatia 13 **NÃO iniciada**.
