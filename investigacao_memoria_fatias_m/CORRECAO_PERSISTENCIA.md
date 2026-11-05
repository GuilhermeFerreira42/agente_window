# Task 01 — Correção e blindagem da persistência

> **Atualização corretiva Windows — 2026-10-30:** H01/H02/H03 corrigidos e retestados; **PRONTA PARA NOVA HOMOLOGAÇÃO INDEPENDENTE**, sem homologação oficial. Árvore de trabalho sobre HEAD local `0dfe3c245a0589fe1ac9ae106e10ea9834714f67` (`fix: document Ollama Cloud model discovery fix`), sem commit/push. As seções originais abaixo descrevem a entrega Linux da Arena e seus limites históricos; para o estado após correção e testes Windows, prevalecem o complemento ao fim deste documento e `docs/09 §3.24`. O relatório independente original reprovado foi preservado.

**Data:** 2026-10-30 (America/Sao_Paulo)  
**Baseline:** HEAD `971a59f5d2a5118e8526d2829ba26039a344b796`, branch `main`.  
**Status:** correções localizadas implementadas e revalidadas em cópia isolada; **pronta para homologação independente, ainda não homologada**. Build de produção, Windows real e encerramento real em browser permanecem sem aprovação por limitações concretas do ambiente.

## Resumo executivo

A corrida anterior estava presente no código do baseline. Todos os escritores de um mesmo transcript usavam o nome de temporário `<destino>.<pid>.tmp`; no mesmo processo, 16 requisições concorrentes disputavam esse caminho. Um `rename` podia mover o arquivo que outra operação ainda esperava usar, causando `ENOENT` e HTTP 500.

A correção mantém SQLite + JSONL e não adiciona dependências: arquivo temporário exclusivo por operação, criação exclusiva (`wx`), publicação por rename no mesmo diretório, fila de operações por sessão no processo servidor, escrita do JSONL antes de avançar o catálogo SQLite e revisão monotônica por sessão para rejeitar snapshots antigos. PUT, GET e DELETE da mesma sessão são coordenados. As correções foram testadas em cópia descartável com dados sintéticos; não foram usados bancos, conversas, chaves ou workspaces reais. A fila original resolvia a concorrência de execução, mas não a ordem lógica dos snapshots; esse segundo defeito foi reproduzido e corrigido nesta finalização.

## Diagnóstico e causa raiz

### Arquivos e fluxo anteriores à correção

- `platform/apps/workbench-v2/src/server/session-persistence/index.ts`
  - `transcriptEntries`: cada mensagem não marcada `running` vira uma entrada contendo `type`, `chatId`, a mensagem `ChatMessage` completa, `uuid` e `timestamp`.
  - `saveSession`: fazia `upsertSessionRecord()` sincronamente no SQLite e, depois, aguardava `writeTranscript()`.
  - `listSessions` lia o catálogo e depois cada JSONL; não esperava uma gravação concorrente da mesma sessão.
  - A rota DELETE removia worktree, transcript e registro sem serializar com PUT.
- `platform/apps/workbench-v2/src/server/session-persistence/transcripts.ts`
  - `writeTranscript` serializava as entradas, gravava um temporário e fazia `rename` para o arquivo final.
  - O temporário era `${destination}.${process.pid}.tmp`: igual para todos os escritores da mesma sessão no processo.
- `platform/apps/workbench-v2/src/server/session-persistence/database.ts`
  - SQLite/WAL contém o catálogo e os metadados JSON da sessão; o JSON do catálogo guarda chats sem as mensagens.
  - JSONL guarda as mensagens completas; `listSessions` reagrupa-as por `chatId` e na ordem das linhas.
  - Não existe transação atômica que inclua SQLite e um arquivo JSONL.
- Cliente/UI: `App.tsx` agenda gravação com debounce de 150 ms e dispara persistência no `pagehide` com `keepalive`. Esses envios são assíncronos e não constituem confirmação de que o último estado foi gravado antes de encerramento abrupto.

### Evidência de reprodução

A cópia de baseline (sem a correção), mesmo HEAD e HOME descartável, foi submetida a 16 PUTs concorrentes ao mesmo ID. Uma rodada reproduziu **6 HTTP 500/16**; as demais respostas foram 200. A saída apontou status mistos na mesma operação de teste. Isso confirma a condição; a quantidade variável é compatível com uma corrida e não representa uma taxa geral. A investigação anterior, no mesmo baseline, já havia registrado 2/16 em cada uma de duas rodadas.

A falha real não era apenas “o rename não é atômico”: a substituição por rename já evitava publicar um arquivo escrito pela metade quando cada escritor tinha seu próprio temporário. A colisão do nome temporário era a causa direta de `ENOENT`. Havia também duas janelas relacionadas, confirmadas no fluxo: operações do mesmo ID não eram serializadas; e o catálogo SQLite era atualizado antes de uma possível falha na escrita do JSONL.

## Solução implementada

### 1. Temporário exclusivo e substituição atômica

Em `transcripts.ts`, o caminho passou a incluir PID e `randomUUID()`, no mesmo diretório do destino. O arquivo é criado com `flag: 'wx'`, evitando reutilização acidental, e substituído com `rename`. Se a gravação ou publicação falha, o temporário daquela operação é removido e o erro é propagado. A extensão `.jsonl` e o formato de linhas JSON permanecem inalterados.

Um processo morto abruptamente pode deixar um temporário órfão porque não executa `catch`; o destino anterior, porém, permanece a fonte lida. O leitor não faz glob de temporários, portanto não confunde um órfão com transcript.

### 2. Fila por sessão dentro do servidor

Em `index.ts`, `withSessionPersistenceQueue` serializa, por `session.id`, os saves, as leituras da recuperação e as exclusões. Assim, as gravações executam em ordem de entrada no servidor; um GET espera uma escrita já iniciada e relê o registro SQLite dentro da fila; um DELETE não corre no meio de PUT concorrente. Filas e estado vivem somente em memória do processo; não foi criado lock global, serviço, banco ou dependência.

### 3. Ordem de gravação dos dois armazenamentos

`saveSession` agora publica o JSONL com sucesso antes de atualizar/reapontar o registro SQLite e sua contagem. Portanto, falha de transcript não anuncia em SQLite uma mensagem ainda não publicada. A fila mantém os passos coordenados dentro do processo, na ordem em que as operações entram nela (após a leitura do corpo HTTP). Não se alega transação crash-proof entre arquivo e SQLite; a lacuna residual está descrita adiante.

### 4. Revisão monotônica contra snapshots antigos

`Session.persistenceRevision` é avançada pelo cliente em gravações normais e `keepalive`. O servidor compara o valor recebido com a revisão persistida e recusa revisões iguais/menores com HTTP 409 (`stale_session_snapshot`), devolvendo a revisão atual; salvamentos internos por mudança de workspace também avançam a revisão. Entradas inválidas são recusadas. A alteração não cria migração SQLite nem dependência. O cliente sincroniza sua revisão em respostas de sucesso/conflito e aceita respostas 2xx sem corpo JSON.

A regressão foi executada primeiro contra o código anterior: após salvar revisão 12, o servidor aceitou uma revisão 11 com HTTP 200; o teste falhou exatamente por esperar HTTP 409. Depois do patch, a revisão antiga é recusada e a versão mais nova permanece.

## Testes adicionados

- `platform/apps/workbench-v2/src/server/session-persistence/index.test.ts`
  - HTTP real sobre middleware da persistência; duas rodadas de 16 PUTs simultâneos para o mesmo ID; respostas, snapshot integral, conteúdo, IDs, ordem e `messageCount`; fecha/reabre o servidor e recupera a sessão.
  - Injeta falha controlada na publicação do transcript e verifica HTTP 500, preservação do registro SQLite anterior e recuperação do transcript anterior.
  - Confere preservação de cartões de ferramentas/resultado/erro/continuação e isolamento entre duas sessões com IDs distintos no mesmo slug.
- `platform/apps/workbench-v2/src/server/session-persistence/transcripts.test.ts`
  - Lê o formato JSONL anterior sem migração.
  - Executa duas rodadas de 16 gravações concorrentes diretamente no writer; o conteúdo final precisa corresponder a exatamente um snapshot completo, com ordem íntegra e sem temporários remanescentes.
  - Provoca falha real de `rename` ao usar um diretório como destino, verifica limpeza do temporário e confirma que o transcript completo anterior pode ser restaurado; simula um temporário parcial órfão e confirma que o leitor o ignora.

Os testes de integração HTTP com stubs são automatizados. Além deles, executei um harness isolado em **dois processos Node distintos**: o primeiro enviou duas rodadas de 16 PUTs (32/32 HTTP 200); após o processo terminar, um segundo processo abriu o mesmo HOME SQLite+JSONL e restaurou o snapshot final, com três IDs/conteúdos em ordem e `messageCount: 3`.

## Resultados verificados — etapa inicial (antes da revisão monotônica)

Os números abaixo documentam a primeira correção de concorrência; foram supersedidos pela revalidação final registrada na seção seguinte. Ambiente de teste: cópia descartável do HEAD em `/tmp/aw_persist_task/platform`, dependências instaladas apenas nela, `HOME=/tmp/aw_persist_task/home` e workspaces sintéticos. `npm ci` reportou 10 advisories na árvore de dependências (4 moderados, 2 altos, 4 críticos); não executei `audit fix`.

| Validação | Resultado |
|---|---|
| Baseline sem correção, API, 16 PUTs | **Reproduzida:** 6/16 HTTP 500 numa rodada, além da evidência anterior 2/16 em duas rodadas. |
| Nova suite de persistência/sessões | **7 arquivos, 32/32 testes passaram.** |
| Regressão ampliada | **19 arquivos passaram; 145 passed, 4 skipped** (149 no total). Incluiu persistência, sessões/workspaces/worktrees, streaming de chat e testes da Casa Agir. Skips são os existentes, não falhas novas. |
| Correção, HTTP concorrente | **2 rodadas × 16:** 32/32 HTTP 200; cada leitura final correspondeu a um snapshot completo, sem mistura; IDs, conteúdos, ordem e contagem conferidos. |
| Reinício do servidor/processo | Processo separado restaurou o transcript persistido, incluindo IDs, ordem e conteúdo. |
| JSONL preexistente | Formato anterior de uma entrada JSON por linha foi lido sem migração. |
| Falha controlada / isolamento / ferramentas | Passaram os testes de falha de publicação, preservação do estado anterior, isolamento por sessão e round-trip dos cartões atualmente representados no `ChatMessage`. |
| Typecheck | `npm run typecheck --workspace=agents-window-replica-v2` — **passou** na cópia. |
| Lint focado | ESLint nos dois fontes e dois testes alterados — **passou**. |
| Build | Tentado na cópia: com heap limitado a 768 MB, Vite terminou em OOM/exit 134; com 1024 MB, o ambiente matou o processo com exit 137 durante `vite build`. `build:fs-boundary` e TypeScript passaram antes da etapa Vite. Classificado como limite de recursos/ambiente; não é build aprovado nem falha funcional atribuída ao patch. |

Durante testes JSDOM de streaming apareceram os avisos ambientais já conhecidos de `HTMLCanvasElement.getContext` e 404 stubados do Explorer; não afetaram os resultados.

## Revalidação final após proteção contra snapshots antigos (2026-10-30)

Ambiente: cópia descartável `/tmp/aw_persist_final/platform`, com `HOME` isolado; nenhum dado real. A cópia de teste não altera o workspace de trabalho.

| Validação | Resultado final |
|---|---|
| Regressão ampliada | **20 arquivos; 149 testes passaram e 4 foram ignorados**, sem falhas. Avisos de canvas/JSDOM e 404 simulados do Explorer não bloquearam. |
| Testes direcionados de persistência/sessões | **8 arquivos; 36 testes passaram.** Inclui rejeição de snapshot antigo, revisão concorrente, cliente normal e keepalive. |
| TypeScript | `npm run typecheck --workspace=agents-window-replica-v2` — **passou** (`tsc -b --force`). |
| ESLint focado | Os **sete arquivos alterados** passaram. |
| ESLint integral | **Falhou:** 100 erros e 19 avisos em arquivos não alterados/distribuídos pelo projeto. Nenhum erro foi apontado nos arquivos desta correção; não foram feitas alterações fora do escopo para mascarar o baseline. |
| Build de produção | **Não aprovada/não concluída:** `build:fs-boundary` e TypeScript passaram, Vite iniciou transformação, mas o ambiente encerrou o processo com exit 137 após ~854 s usando heap de 1024 MB. Build não pode ser contada como aprovada. |
| Persistência entre processos | Harness Node em processos separados: **32 PUTs aceitos**, revisão 32 permaneceu após encerrar o primeiro processo; o segundo recuperou revisão/título e três mensagens/IDs na ordem esperada. Essa rodada não produziu 409; a regressão específica cobre o snapshot antigo. |
| Windows e browser real | **Não executados:** sandbox Linux (`node v20.20.2`), sem Wine/PowerShell e sem Chromium/Firefox instalado. Linux não é tratado como substituto de Windows. |
| Encerramento/pagehide | Inspeção do caminho existente e testes do cliente confirmam `keepalive` e revisão; não há evidência de entrega em fechamento real de browser, então permanece não verificado operacionalmente. |
| Integridade do diff | `git diff --check` — passou. |

`npm ci` na cópia isolada reportou 10 advisories (4 moderados, 2 altos, 4 críticos); não foi executado `npm audit fix`.

## Compatibilidade e alcance funcional

- Caminho dos históricos, sufixo `.jsonl`, campos das entradas e formato line-delimited foram mantidos; a nova revisão é um campo opcional serializado no JSON da sessão, sem migração SQLite; teste de compatibilidade lê registros do formato anterior.
- O objeto `ChatMessage` completo continua armazenado, preservando IDs, ordem das mensagens, cartões e estados/campos que o produto já representa.
- A implementação atual **não** grava a troca protocolar bruta do provider como eventos independentes de tool-call/tool-result. A tarefa preserva as chamadas/resultados visíveis nos cartões existentes; não amplia o schema de eventos (isso seria funcionalidade futura, fora deste escopo).
- Nenhuma migração, mudança de schema SQLite, alteração canônica/roadmap, implementação M1–M8, alteração da Fatia 13, commit ou push foi feita.

## Riscos residuais e pendências

1. **Processo único:** a fila é local ao processo servidor. Duas instâncias independentes usando o mesmo `HOME` não compartilham a fila. Nomes UUID eliminam a colisão do temporário, mas não garantem ordenação entre processos nem consistência cross-store nesse modo; multi-processo não foi homologado.
2. **SQLite + JSONL não formam uma transação distribuída:** se o processo cair depois do rename do JSONL e antes do upsert, um registro existente com o mesmo `slug` tende a recuperar mensagens novas com algum metadado antigo; se o `slug` mudar nessa janela, o arquivo novo pode ficar órfão e o catálogo apontar para o caminho anterior. Se o upsert falhar depois do rename, a mesma classe de divergência é possível. A correção reduz a janela perigosa e não anuncia metadata nova antes do transcript, mas não promete commit atômico dos dois meios.
3. **Durabilidade física:** não há `fsync` explícito do arquivo nem do diretório. Rename atômico protege contra leitores verem escrita parcial no cenário testado; perda de energia, falha de disco, cache do sistema e semântica de rename em Windows não foram homologadas.
4. **Encerramento do browser:** `pagehide`/`keepalive` continua best-effort. Um PUT que não chegue ao servidor antes do encerramento não pode ser salvo pelo writer. Limites de tamanho do keepalive, F5/fechar aba real e desligamento abrupto do processo não foram exercitados em browser.
5. **Temporários órfãos:** hard-kill durante escrita pode deixar um `.tmp` exclusivo. Não afeta leitura nem substituições futuras, mas limpeza/retention de temporários antigos não foi implementada para evitar apagar o arquivo de outra operação ativa.
6. **Dados antigos corrompidos:** JSONL histórico com linha inválida continua podendo falhar no parse de `readTranscript`; não foi introduzida recuperação silenciosa ou truncamento automático que pudesse descartar mensagens válidas.
7. **Snapshots concorrentes antigos:** mitigado no cliente/servidor pela revisão monotônica e HTTP 409. O teste direcionado demonstra que uma revisão 11 não substitui a 12. Persistem riscos de versões antigas de cliente que não enviem revisão ou de execução multi-processo apontados acima; não se declara validação multi-instância.
8. **Plataforma/encerramento:** a validação foi Linux no sandbox; Windows real, aplicação empacotada, pagehide/fechamento real do browser e comportamento no filesystem do usuário ainda necessitam homologação própria. Não havia executável de browser nem runtime Windows disponíveis.

## Diff e status do escopo

Arquivos de código modificados: `session-persistence/index.ts`, `transcripts.ts`, `services/sessions/sessionsClient.ts` e `types.ts`. Testes adicionados/alterados: `session-persistence/index.test.ts`, `transcripts.test.ts` e `services/sessions/sessionsClient.test.ts`. Registro técnico principal: este documento; demais documentos investigativos foram atualizados na etapa anterior.

`git diff --check` passou. A verificação final do `git status` e resumo exato do diff são apresentados na resposta da Task 01. O estado anterior não continha outras alterações de usuário; os únicos dados de teste e dependências foram mantidos na cópia temporária isolada.

## Conclusão técnica

As duas causas comprovadas — colisão do temporário e aceitação de snapshots antigos fora de ordem lógica — têm correções localizadas e regressões que passaram. Concorrência, integridade, recuperação, compatibilidade, typecheck e lint focado passaram em Linux descartável. A Task 01 está **pronta para homologação independente**, não homologada. A homologação deve considerar que build de produção foi bloqueada por exit 137, lint integral falha em arquivos não alterados, e Windows/fechamento real de browser não foram executados. Riscos de transação entre SQLite/JSONL em crash, multi-processo e durabilidade física permanecem explícitos; não houve commit/push nem início da Task 02.


## Roteiro curto para homologação independente

1. Em instalação descartável Windows, iniciar o app com `HOME`/dados de teste vazios e salvar uma conversa com várias mensagens; fechar/reabrir e conferir título, conteúdo, IDs, ordem e contagem.
2. Disparar gravações concorrentes para a mesma sessão e confirmar que a API mantém um snapshot inteiro; enviar uma revisão antiga depois de uma nova e confirmar HTTP 409 (`stale_session_snapshot`) sem regressão do conteúdo.
3. Repetir a validação de reinício usando dois processos separados; conferir revisão, mensagens e JSONL; verificar também isolamento de duas sessões.
4. No browser Windows, editar uma mensagem e fechar/recarregar imediatamente; observar no servidor se o `pagehide`/`keepalive` chegou e reabrir a sessão. Repetir com fechamento de aba e saída do app; registrar separadamente falhas/limites de rede ou encerramento.
5. Registrar a versão do app/OS/browser, passos, logs/status HTTP, revisão antes/depois e resultado. Não usar dados reais, não considerar o teste Linux como aprovação Windows e não converter ausência de erro observado em aprovação de crash/power-loss.

## SPEC de correção H01/H02/H03 — 2026-10-30

HEAD local: 0dfe3c245a0589fe1ac9ae106e10ea9834714f67 (`fix: document Ollama Cloud model discovery fix`). Substitui: nenhuma SPEC anterior; complemento corretivo autorizado pelo responsável após a auditoria independente.

Objetivo: fechar H01–H03 sem nova dependência, mudança de armazenamento ou avanço de fase. Preservar o patch existente. Sem commit/push.

- H01: change-workspace fará leitura e alteração dos metadados atuais sob a mesma fila por sessão. Não republicará JSONL; preservará IDs, ordem, campos e resultados já confirmados. Revisão avança para rejeitar PUT antigo; a resposta restaura o transcript atual. Não aninhar a mesma fila, evitando deadlock.
- H02: verificar o rename concorrente Windows com arquivos sintéticos. Preservar o contrato público do writer usado pelos testes, coordenando operações por caminho de transcript dentro do processo; caminhos distintos continuam independentes. Sem lock entre processos, retry genérico ou delete-antes-de-rename. Falhas continuam propagadas com limpeza do temporário próprio.
- H03: 409 bloqueia novo envio automático do snapshot conflitante, inclusive pagehide. A UI apresenta indicação persistente por conversa; preserva o conteúdo local e backup local quando disponível. Recuperação explícita salva uma conversa separada, preservando a versão atual no servidor. Falha na recuperação mantém o aviso/conteúdo. Edição durante recuperação não pode ser descartada. Não implementar merge automático.
- App.tsx recebe apenas ligação do tratamento de persistência/aviso e correção da espera de persistSession antes da troca de pasta. Comportamento de sessão fica em services/sessions; terminal e módulos congelados não mudam.

Arquivos: index.ts/test, transcripts.ts/test, sessionsClient.ts/test; hook/componente/testes de persistência e wiring em App.tsx. Registro técnico neste documento; complemento/evidências fora do repositório. Atualizações canônicas apenas de estado/histórico/evidência pertinentes, sem alteração do roadmap.

Aceite: reprodução H01 preserva todo PUT confirmado ou rejeita explicitamente snapshot obsoleto; writer original passa no Windows; 409 gera aviso real na UI, mantém conteúdo e não avança cegamente sobre revisão remota; cópia recuperada contém os dados locais sem perder os remotos; reinício, isolamento, legado e falhas controladas passam. Typecheck, lint focado, build e diff --check. Repetir Edge com dados/perfil exclusivos. Manter resultados preexistentes separados. Não remover materiais antigos bloqueados pela política.


## Complemento corretivo H01/H02/H03 — resultados finais Windows (2026-10-30)

**Causa H01:** leitura da sessão fora da operação interna de salvamento; saveSession interno promovia snapshot antigo para revisão maior. **Correção:** change-workspace lê o registro atual, o transcript para compor a resposta, e atualiza os campos workspace/workspacePath/worktreePath/branch/revisão sob uma única fila por sessão. O JSONL não é regravado nem tem contagem/IDs/mensagens substituídos. Uma gravação enfileirada que ficou obsoleta pode receber 409; todo PUT que recebeu 200 precisa continuar recuperável. O teste reproduz a barreira da auditoria e falhava antes com perda de mensagens e cards. Outro teste impede qualquer publicação JSONL nessa operação e exige preservar a revisão 12 aceita, avançando somente os metadados para 13. App agora espera a persistência normal antes da troca e aplica somente os campos de workspace retornados, preservando mensagens locais que mudaram durante o request; compensação só ocorre se a troca de workspace foi confirmada.

**Causa H02:** UUID resolveu colisão nominal do temporário, mas não a sobreposição de substituições do mesmo destino no Windows. A libuv 1.52.1 usada por este Node implementa fs rename com MoveFileExW/MOVEFILE_REPLACE_EXISTING: [fonte primária](https://github.com/libuv/libuv/blob/v1.52.1/src/win/fs.c#L2171-L2177). Sonda sem código do app reproduziu 91 EPERM/160 no mesmo destino em paralelo, contra zero/160 serial e zero/160 para destinos distintos. Não foi instrumentado o GetLastError bruto do kernel nem atribuído o erro a ACL/antivírus. **Correção:** preservar o contrato público de concorrência direta do writer com coordenação local por destino canônico, incluindo leitura/exclusão; caminhos distintos continuam independentes. A fila de sessão permanece responsável pela unidade catálogo/revisão/transcript. Sem retry cego, delete-antes-de-rename, nova dependência, lock distribuído ou fila global entre arquivos. A fila libera após falhas e é removida ao esvaziar. Os testes originais foram mantidos e fortalecidos com ordem de admissão, read/delete e nova escrita após falha.

**Causa H03:** o cliente avançava o contador a partir de currentRevision sem preservar estado de conflito; App registrava apenas console.error. **Correção:** bloquear autosave/pagehide da sessão conflitante; só uma confirmação posterior de envio local permite descartar resposta local obsoleta. Aviso persistente na UI; hook de persistência mantém conteúdo local e backup best-effort por conversa em localStorage. Nova recuperação explícita salva cópia em outro ID, sem tomar posse do worktree da original; consulta a versão remota e a restaura apenas se o snapshot local não mudou durante a recuperação. Edições concorrentes à recuperação mantêm seu aviso/backup. Quota/privacidade do navegador gera aviso claro para manter a janela aberta; falha de recuperação mantém o conteúdo para tentar novamente. Não existe merge automático nem reenvio elevado do objeto rejeitado sobre o servidor.

**Arquivos da correção:** index.ts/test, transcripts.ts/test e sessionsClient.ts/test; novos useSessionPersistence.ts, sessionRecovery.ts, SessionPersistenceNotice.tsx, sessionPersistence.css e SessionPersistenceNotice.test.tsx; wiring de App.tsx. types.ts contém apenas a mudança opcional de revisão já feita pela Arena. Documentação relacionada: docs/03, 07, 09 e este registro; roadmap, decisões de outras áreas, terminal e módulos congelados não alterados.

**Evidência:** resultados completos em `docs/09 §3.24` e `C:\Users\Usuario\Documents\ChatGPT\correcao_task01_20261030\COMPLEMENTO_HOMOLOGACAO_TASK_01.md`; logs e scripts no mesmo diretório externo. Regressão 127 pass/1 fail preexistente em worktrees; App 49 pass/13 skip; UI 6/6; harnesses HTTP/falhas 10/10 e cliente 3/3; writer 320/320; processos 32 PUTs + restauração em processo novo; Edge reproduziu aviso/backup/reload/cópia preservando a versão remota e reinício. Typecheck, ESLint focado (exceto baseline de App, sem erros novos), build e diff --check verificados. Nenhuma homologação oficial, commit/push, Task 02 ou implementação M1–M8.

**Riscos e limites preservados:** processo único, ausência de transação atômica JSONL+SQLite/fsync, pagehide best-effort, históricos corrompidos e clientes antigos. Backup de rejeições é local ao navegador/origem, sujeito a quota/limpeza e não substitui persistência confirmada no servidor. Recuperação após falha parcial de rede pode deixar uma cópia já salva antes da UI conseguir confirmá-la; repetir pode criar outra cópia, preservando dados. Não foi testada edição simultânea de backups por várias abas. O teste de worktree não portátil e os 20 erros/1 aviso anteriores de lint em App foram registrados sem correção fora de escopo. Materiais descartáveis antigos e novos permanecem fora do projeto; a limpeza rejeitada pela política não foi novamente tentada.
