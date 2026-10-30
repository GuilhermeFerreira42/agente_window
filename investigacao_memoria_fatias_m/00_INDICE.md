# Investigação técnica da arquitetura de memória — Fatias M1–M8

**Status:** investigação M1–M8 continua sem implementação de memória; correção localizada da persistência executada na Task 01, sem alteração de roadmap ou documentos canônicos.  
**Início:** 2026-10-30 (America/Sao_Paulo).  
**Projeto auditado:** `/home/user/agente_window`, HEAD `971a59f5d2a5118e8526d2829ba26039a344b796`, branch `main`, árvore limpa no início da investigação.  
**Escopo:** código atual do Agente Window, relatórios anteriores datados de 2026-10-22/23/24, documentação oficial corrente de VS Code/GitHub Copilot e OpenCode, e testes isolados descartáveis quando possível.

> Relatório investigativo. Nenhuma recomendação está aprovada para implementação. A ausência de achado limita-se aos caminhos e versões explicitamente auditados. Os artefatos anteriores são pistas, não prova atual; conclusões relevantes serão revalidadas contra o HEAD acima.

## Documentos

1. [01 — Estado atual do Agente Window](01_ESTADO_ATUAL_AGENTE_WINDOW.md)
2. [02 — Referências VS Code / GitHub Copilot](02_REFERENCIAS_VSCODE_COPILOT.md)
3. [03 — Referências OpenCode](03_REFERENCIAS_OPENCODE.md)
4. [04 — Arquiteturas de memória](04_ARQUITETURAS_DE_MEMORIA.md)
5. [05 — Recuperação contextual](05_RECUPERACAO_CONTEXTUAL.md)
6. [06 — Resultados dos testes operacionais](06_RESULTADOS_DOS_TESTES.md)
7. [07 — Matriz comparativa](07_MATRIZ_COMPARATIVA.md)
8. [08 — Análise M1–M8](08_ANALISE_FATIAS_M1_M8.md)
9. [09 — Recomendações arquiteturais](09_RECOMENDACOES_ARQUITETURAIS.md)
10. [10 — Pendências e limitações](10_PENDENCIAS_E_LIMITACOES.md)

## Critérios de evidência

- **Documentado:** descrito em documentação oficial do fornecedor, sem implicar funcionamento testado por esta investigação.
- **Código:** localizado em código-fonte identificado por URL/commit/caminho/símbolo.
- **Teste:** teste automatizado existente ou execução controlada identificada; ler um teste não equivale a executá-lo.
- **Observado:** comportamento obtido diretamente em execução isolada.
- **Inferência:** interpretação fundamentada, mas não demonstrada diretamente.
- **Não localizado:** não encontrado no escopo inspecionado; não equivale a prova universal de inexistência.

## Registro e progresso (2026-10-30)

- HEAD local registrado para a investigação em 2026-10-30; working tree inicialmente limpo. Antes da Task 01, só esta pasta estava não rastreada. A Task 01 iniciou sobre o mesmo HEAD, sem alterações de terceiros.
- Estudo anterior em `docs/arquivo_morto/estudo_memoria_contexto_2026-10-22/` e materiais auxiliares foram usados como roteiro, não como prova; as afirmações sobre indicador, transcript, tools, busca e restart foram confrontadas com o HEAD atual.
- Snapshots analisados: OpenCode v2.2.4 `45898d0f8569225eb1ddb4ee13f8581b34dff311`; VS Code/Copilot `c8a3f819b4a13366d5846a02288ab53b4d89ac50`. Os serviços Copilot cloud privados não estão disponíveis no snapshot.
- Agente Window: suite direcionada em cópia isolada — 17 arquivos, 139 testes passaram e 4 foram skipped; `typecheck` passou. `vite build` foi morto com exit 137 por limite de recursos durante transformação; não repetido.
- A–H: fixtures descartáveis usadas. Persistência/restart e tool cards tiveram round-trip observado; UI confirmou escopo do prompt atual. Corrida de persistência JSONL repetiu 2 erros `ENOENT` em 16 PUTs simultâneos, em duas execuções. Limitações detalhadas em `06` e `10`.
- Teste temporário de escopo UI da investigação foi repetido após correção dos stubs: 1/1 passou; warnings ambientais e 404 stubados não impediram a execução. Cópia e snapshots daquela investigação foram removidos de `/tmp`.
- **Task 01 — Correção e Blindagem da Persistência:** causa raiz confirmada em baseline: nome temporário comum por PID; novo teste reprovou 6/16 operações simultâneas na cópia sem correção. Correção localizada implementada; duas rodadas corrigidas com 16/16 HTTP 200 e integridade comprovada, mais leitura após novo processo. Detalhes/resultados/limites em `CORRECAO_PERSISTENCIA.md`.
- Somente os arquivos de persistência necessários e os testes específicos foram alterados; nenhum documento canônico ou roadmap. M1–M8 seguem sem implementação e recomendações continuam pendentes de aprovação.

