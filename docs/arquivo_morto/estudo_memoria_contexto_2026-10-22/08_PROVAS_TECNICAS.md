# 08 — Provas técnicas executadas

**Data da execução:** 23/10/2026 (horário local do workspace)  
**Escopo:** complemento documental; nenhum código de produto foi alterado.  
**Status geral:** provas SQLite/FTS5, JSONL e typecheck executadas; suíte completa executada com falhas; prova de `usage` real de provedor bloqueada por falta de credencial/configuração.

> Esta página acrescenta evidências ao pacote de investigação. Não aprova M1–M8, não altera a numeração oficial de fatias e não substitui documentos canônicos. Os resultados referem-se ao baseline Git indicado abaixo.

## 1. Baseline e ambiente da execução

O repositório foi inicializado em `main` e recebeu o commit solicitado como baseline:

```text
$ git status --short --branch
## main

$ git log -1 --oneline --decorate
376d677 (HEAD -> main) baseline: estado atual pós Fatia 12 DELETE validada

$ git rev-parse HEAD
376d677c3f5cba01ffc852199c3ef69f64a54bdc
```

O status foi consultado novamente após `npm ci`, `typecheck` e a suíte completa; continuava `## main`, sem alterações. A instalação de dependências ficou ignorada pelo Git. Confirmação das regras existentes, sem editar `.gitignore`:

```text
.gitignore:2:node_modules/  platform/node_modules
.gitignore:2:node_modules/  platform/apps/workbench-v2/node_modules
.gitignore:6:dist/          platform/apps/workbench-v2/dist
.gitignore:51:.agente_window/ .agente_window/probe
```

Ambiente observado: Linux `6.1.158+` x86_64; Node `v20.20.2`; npm `10.8.2`. `npm ci` terminou com sucesso e instalou as dependências do lockfile; a auditoria informativa do npm reportou 16 vulnerabilidades (5 moderate, 7 high, 4 critical). Nenhum `npm audit fix` foi executado, para não alterar dependências ou o baseline.

**Nota sobre o rótulo:** a mensagem do commit reproduz a identificação de baseline pedida. Ela não é, por si só, uma auditoria independente do estado da Fatia 12; a documentação canônica consultada anteriormente descrevia a Fatia 12 DELETE como SPEC fechada aguardando ordem.

## 2. SQLite e FTS5 no `better-sqlite3` instalado

Consulta de dependência executada dentro de `platform/`:

```text
better-sqlite3@12.11.1
```

Prova executada em banco SQLite em memória através do binding Node `better-sqlite3` instalado — não através do executável `sqlite3` do sistema:

1. `PRAGMA compile_options` retornou `ENABLE_FTS3`, `ENABLE_FTS3_PARENTHESIS`, `ENABLE_FTS4` e `ENABLE_FTS5`.
2. `SELECT sqlite_version()` retornou `3.53.2`.
3. `CREATE VIRTUAL TABLE ... USING fts5(body)` concluiu sem erro.
4. Uma linha foi inserida e recuperada com consulta `MATCH`; a consulta devolveu o texto inserido.

**Conclusão limitada ao que foi medido:** o runtime instalado tem SQLite compilado com FTS5 e aceita criação e consulta FTS5. Isso confirma viabilidade técnica para avaliação; não decide que FTS5 será adotado, nem substitui testes de relevância, migração, desempenho ou desenho de índice.

## 3. Salvamento e reabertura de JSONL com 200 mensagens

O benchmark empacotou o módulo TypeScript existente `platform/apps/workbench-v2/src/server/session-persistence/transcripts.ts` com o `esbuild` disponível e chamou `writeTranscript`/`readTranscript`. Usou `HOME` temporário, dados sintéticos e apagou o diretório temporário após a execução. Não usou transcript de usuário.

**Método:** 200 registros JSONL sintéticos, com mensagens alternadas user/assistant, conteúdo de aproximadamente 1.000 caracteres e metadado de ferramenta em parte dos registros. Após um aquecimento, foram feitas 30 repetições: cada salvamento reescreveu a lista completa de 200 registros; em seguida, a leitura reabriu e parseou o arquivo inteiro e verificou o total de mensagens. O arquivo medido tinha 235.429 bytes. A coluna de escrita mede o ciclo do `writeTranscript`; a de leitura mede o `readTranscript` e o parse. Os tempos são deste workspace/execução, não uma garantia de produção.

| Operação | p50 | p95 | Máximo |
|---|---:|---:|---:|
| Salvar / reescrever JSONL completo (30 repetições) | 1,895 ms | 2,419 ms | 2,778 ms |
| Reabrir e parsear os 200 registros (30 repetições) | 1,143 ms | 2,084 ms | 4,399 ms |

Um heartbeat de timer de 1 ms, observado durante as repetições, teve drift máximo de 4,055 ms em 89 amostras. Esse valor é apenas observacional e inclui agendamento do sistema; não isola causalmente o custo da escrita. O experimento mede reescritas integrais repetidas, não compara com uma implementação append-only. Portanto, ele quantifica o custo observado no caso sintético de 200 mensagens (~235 KB), mas não prova ausência de impacto em históricos maiores ou sob concorrência.

## 4. `usage` real de OpenAI ou Anthropic — bloqueado

**Critério não satisfeito nesta execução.** Não foi enviado request a OpenAI nem Anthropic, não foi usado mock e nenhum log de `usage` foi fabricado.

Verificações feitas sem imprimir nem ler valores secretos:

- `OPENAI_API_KEY` configurada: não;
- `ANTHROPIC_API_KEY` configurada: não;
- `AGENTE_WINDOW_PROVIDERS_PATH` configurada: não;
- `~/.agente_window/providers.json` existe: não.

O repositório resolve a configuração por `AGENTE_WINDOW_PROVIDERS_PATH` ou, na ausência dela, por `~/.agente_window/providers.json` (`providersRepo.ts`). Sem uma configuração/credencial real não há como produzir a resposta do provedor que contenha o campo `usage`. O resultado permanece **pendente**, não “passou”. Para completá-lo, será preciso configurar uma credencial por meio seguro no ambiente local e repetir uma chamada real, registrando somente os campos de uso retornados — nunca o segredo.

## 5. Typecheck e testes no baseline

Executados em `platform/apps/workbench-v2/`, sem mudança de código entre o commit baseline e as provas:

```text
$ npm run typecheck
> tsc -b --force
exit code: 0
Duração observada: 12,022 s
```

O typecheck concluiu sem diagnóstico de erro.

```text
$ npm run test
> vitest run
Vitest 2.1.9
Test Files  4 failed | 107 passed (111)
Tests       12 failed | 906 passed | 16 skipped (934)
Duration    164.36 s
exit code: 1
```

Falhas observadas no baseline, sem correção aplicada nesta tarefa:

- `src/__tests__/TerminalPanel.test.tsx`: 9 falhas; entre as divergências reportadas, os testes procuram uma região acessível chamada `Terminal`, enquanto o elemento expõe `aria-label="Painel Inferior"`; um teste também esperava uma chamada ao spy que não ocorreu.
- `src/__tests__/iconLabels.test.ts`: 1 falha; contrato esperava `title="Mostrar sessões"`.
- `src/__tests__/themeTokens.test.ts`: 1 falha; o teste encontrou três tokens VS Code ausentes em relação ao contrato.
- `src/__tests__/visualStates.test.ts`: 1 falha; o CSS contém `outline: 1px solid var(--vscode-focusBorder)`, contrariando a expectativa do teste de usar `strokeThickness`.

As 16 marcações `skipped` foram reportadas pelo runner; não foram reinterpretadas como aprovadas. O resultado da suíte é **falha**, ainda que 906 testes tenham passado. Os testes foram apenas observados: nenhum arquivo de código ou expectativa foi alterado.

## 6. Leitura dos resultados e limites

| Verificação | Resultado | O que permite afirmar |
|---|---|---|
| Compilação SQLite / FTS5 | Passou | O binding instalado cria e consulta FTS5 no runtime testado. |
| JSONL, 200 mensagens | Medido | Tempos e tamanho indicados para 30 reescritas/leitura do conjunto sintético. |
| `usage` real de provedor | Bloqueado | Sem credencial/configuração; não houve request nem log real. |
| Typecheck | Passou | `tsc -b --force` terminou com código 0 no baseline. |
| Suíte de testes | Falhou parcialmente | 906 passaram, 12 falharam e 16 foram ignorados pelo runner, em 111 arquivos. |

Essas evidências não implementam M1–M8, não alteram o transcript, não mudam a arquitetura de persistência e não constituem homologação. A atualização futura da prova de `usage` deverá ser anexada aqui como adendo, preservando este registro do bloqueio e os resultados já obtidos.
