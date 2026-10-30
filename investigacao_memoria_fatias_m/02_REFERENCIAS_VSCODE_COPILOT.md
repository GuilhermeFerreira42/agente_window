# 02 — Referências VS Code / GitHub Copilot

**Status:** documentação e leitura estática concluídas para o recorte abaixo; testes de referência não executados.  
**Código fixado:** Microsoft/vscode, commit `c8a3f819b4a13366d5846a02288ab53b4d89ac50` (30/10/2026).  
**Limite de produto:** o snapshot cobre VS Code e a extensão Copilot pública; não contém a implementação do serviço cloud privado do GitHub Copilot Memory.

## Fontes documentais

- VS Code, memória para agentes: https://code.visualstudio.com/docs/agents/run/memory — diferencia Copilot Memory hospedada na nuvem e arquivos locais de memória do harness.
- VS Code, histórico de sessão: https://code.visualstudio.com/docs/agents/run/sessions/session-history — histórico local/Chronicle, sincronização e controles de privacidade.
- GitHub, Copilot Memory: https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory — descreve memórias de repositório e preferências pessoais, com escopos/gestão distintos; não promete cumprimento perfeito de regras.
- VS Code, configuração: https://code.visualstudio.com/docs/agents/overview e páginas de configuração vinculadas pela documentação de memória.

Documentação descreve capacidades e disponibilidade; os achados de implementação abaixo são somente sobre o commit público fixado.

## A. Harness de arquivos locais de memória

**Achados de código**

- `extensions/copilot/src/extension/tools/node/memoryTool.tsx`, `MemoryTool`, `validatePath`, `_dispatch`, `_resolveUri`, `_localView`, `_localCreate`, `_localStrReplace`, `_localInsert`, `_localDelete`, `_localRename`: ferramenta de arquivos sob `/memories/`, com rejeição de caminhos fora do prefixo e de traversal. Operações mutáveis pedem confirmação (`prepareInvocation`); ler não.
- Três escopos locais separados por diretório:
  - usuário: `globalStorageUri/memory-tool/memories/`;
  - sessão: `storageUri/memory-tool/memories/<sessionId>/`;
  - repositório/workspace: `storageUri/memory-tool/memories/repo/`.
  O escopo “repo” fica no armazenamento local da extensão; neste código não é um arquivo commitado no repositório nem memória compartilhada com colaboradores.
- `memoryContextPrompt.tsx`, `MemoryContextPrompt`: carrega notas de usuário automaticamente no prompt da primeira conversa nova quando a ferramenta está disponível, limitando a saída a 200 linhas. Lista nomes dos arquivos de memória da sessão e do repo, mas diz ao agente para abrir os arquivos necessários com a ferramenta; esses dois escopos não são carregados integralmente pelo prompt.
- `prompts/node/agent/agentPrompt.tsx`, `AgentPrompt`/`GlobalAgentContext`: confirma a ligação: `MemoryInstructionsPrompt` acompanha requests com Memory tool, enquanto `<MemoryContextPrompt>` só entra quando `isNewChat && hasMemoryTool`.
- `tools/common/memoryCleanupService.ts`, `MemoryCleanupService`: limpeza de arquivos de memória de sessão com retenção de 14 dias, inicializada pela MemoryTool; varre diretórios de sessão, não `repo`. Não inferir daqui uma retenção equivalente da memória de usuário, de Chronicle ou do Copilot Memory cloud.
- Há confirmação de aprovação antes de mutações. Testes de origem em `tools/node/test/memoryTool.spec.tsx` incluem escopos e isolamento entre sessões; foram lidos/localizados, não executados.

**Interpretação:** memória local é arquivo editável/curado pelo agente/usuário, com escopos de armazenamento e injeção diferentes; não é sinônimo do transcript do chat.

## B. Chronicle: índice local e consulta a sessões anteriores

**Achados de código**

- `platform/chronicle/node/sessionStore.ts`, `SessionStore`: SQLite, schema version 3, WAL local (ou journal DELETE em remoto), tabelas `sessions`, `turns`, `checkpoints`, `session_files`, `session_refs` e índice FTS5 `search_index`. `search()` usa `MATCH` e ordenação BM25; indexa turnos, seções de checkpoints e artefatos de workspace.
- `extension/chronicle/vscode-node/sessionStoreTracker.ts`, `SessionStoreTracker`: ingestão incremental de spans OTel concluídos, com buffer e flush transacional; feature controlada por `chat.localIndex.enabled`. `sessionReindexer.ts` reconstitui os registros a partir de logs JSONL de debug. Conteúdo é deliberadamente resumido/truncado: limites comuns 1.000 caracteres para mensagem do usuário, 5.000 para resposta do agente e 1.000 para resumo. Ferramentas contribuem caminhos e refs selecionados; a saída integral arbitrária de cada ferramenta não é uma coluna padrão do store local.
- `extension/tools/node/sessionStoreSqlTool.ts`, `SessionStoreSqlTool`: ferramenta do agente aceita SQL `SELECT`/`WITH`, rejeita operações de escrita e limita resposta a 100 linhas. Com indexação local, executa contra SQLite via `executeReadOnly`, exigindo authorizer do SQLite/Node 24.10+ e falhando fechado sem esse recurso.
- `extension/chronicle/common/sessionIndexingPreference.ts`: sincronização cloud depende de `chat.sessionSync.enabled` (desligada por padrão no código) e exclusões configuradas por repositório no caminho de consentimento/exportação. `sessionStoreSqlTool.ts` consulta o serviço remoto quando o consentimento cloud está ativo; a descrição alternativa usa DuckDB e menciona consultas entre sessões/dispositivos. Cliente público chama o serviço, mas seu mecanismo/índice remoto não está implementado neste snapshot.
- O exportador cloud `extension/chronicle/vscode-node/remoteSessionExporter.ts` envia eventos derivados de spans com filtragem de segredos; isso é separado da memória local. A eficácia da filtragem ou políticas de retenção do serviço remoto não foi testada aqui.
- O código registra testes de store, tracking, reindexer, ferramenta SQL e filtragem; nenhum foi executado nesta investigação.

**Conclusão delimitada:** no snapshot público há, além de notas em arquivo, uma trilha de sessões consultável pelo agente. A consulta local é lexical/SQL (FTS5/BM25 disponível), não embeddings. A implementação privada do serviço cloud e a busca remota não podem ser descritas como fatos de código público.

## C. Copilot Memory hospedada pelo GitHub

A documentação oficial descreve fatos de repositório e preferências pessoais com ciclo/escopo próprios. Não há base neste snapshot público para afirmar como o serviço extrai, ranqueia, guarda, filtra ou sincroniza essas memórias. Tratar documentação como evidência documental, não como confirmação operacional independente.
