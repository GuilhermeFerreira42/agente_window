# C-3a — Entrega e homologação (anexos com bytes reais)

Base do pacote: `3a78ca0500236752393ab822c72b03017b6cef11`.
Branch desta entrega: `0f2e5de2-agente-window` · commit da entrega: `ffa997b`.
Data da execução: 2026-11-18 · SO `linux/x64` · Node **26.13.0** (runtime canônico `platform/runtime.json`).

> Este documento registra **somente o que foi executado**. Nada aqui declara aceite humano
> nem presume Windows: a coluna "Windows" não existe porque não foi medida.

---

## 1. Resumo dos gates

| Gate | Comando | Resultado |
|---|---|---|
| Preflight | `VALIDAR_C3A.mjs --mode preflight` | arquivos presentes; execução não realizada |
| Tipos | `npx tsc -b --force` | **exit 0**, 0 erros |
| Lint (delta) | `eslint src --format json` vs `/tmp/lint-base.json` | **novos = 0, resolvidos = 0** (111 = 111) |
| Build | `NODE_OPTIONS=--max-old-space-size=1408 npx vite build` | **✓ built in 40.20s** |
| Foco | `VALIDAR_C3A.mjs --mode foco` | **194 aprovados · 0 falhas · 0 pulados · missingCriteria = []** |
| Ampla | `VALIDAR_C3A.mjs --mode ampla --baseline-json …/vitest.json` | **2060 aprovados · 3 falhas nominais · 33 pulados · newFailures = [] · newSkips = []** |
| E2E | `sh platform/scripts/e2e-c3a.sh` (porta 5214) | **10/10** (E01–E10) |

Baseline usada: `/home/user/c3a-base-run/vitest.json` (HEAD exato `3a78ca0`, árvore limpa,
node 26.13.0, sha256 conferido pelo runner).

### 1.1 As 3 falhas nominais da ampla (pré-existentes, não tocadas)

| Arquivo | Teste |
|---|---|
| `src/__tests__/fatia07_destravar.test.tsx` | "FATIA 07 — Destravar DEBT-06…" |
| `src/modules/explorer-search/__tests__/editorTabs.test.tsx` | "Breadcrumbs (breadcrumbsControl.ts)…" |
| `src/modules/explorer-search/__tests__/monacoLoadFailure.test.tsx` | "CodeEditorPane — falha ao carregar o editor (D157) 2…" |

Mesmíssimo conjunto do baseline. `providersRepo.test.ts` estava no baseline como falha
**flaky** e nesta execução passou (`resolvedFailures` = 1) — nada foi alterado nele.

---

## 2. Matriz T01–T36 → prova executada

Cada linha tem teste real com o ID no nome; a coluna "suíte" é o arquivo que a foco executa.

| ID | Req. | Suíte (prova) |
|---|---|---|
| C3A-T01 | R01 | `__tests__/c3aDraft.test.tsx` (2 testes: File real sobrevive a remount; remover chip não altera o original) |
| C3A-T02 | R02 | `__tests__/c3aSend.test.tsx` (2: só-anexo cria 1 sessão, título seguro, texto vazio; Pasta com raiz real) |
| C3A-T03 | R02/R07 | `__tests__/c3aSend.test.tsx` (4: duplo Enter/resposta atrasada; contexto trocado; lock do dono; dedupe por identidade) |
| C3A-T04 | R03 | `attachments/policy.test.ts` + `attachments/store.test.ts` |
| C3A-T05 | R03 | `attachments/store.test.ts` |
| C3A-T06 | R03/R08 | `attachments/store.test.ts` |
| C3A-T07 | R05 | `attachments/policy.test.ts` (64 MiB, NUL, binário desconhecido) |
| C3A-T08 | R05 | `attachments/store.test.ts` (Content-Length mentiroso/ausente, quota concorrente) |
| C3A-T09 | R05 | `attachments/policy.test.ts` (política ausente/inválida) |
| C3A-T10 | R08 | `attachments/policy.test.ts` (traversal/absoluto/reservado/ADS/controle/trailing dot) |
| C3A-T11 | R06/R08 | `attachments/store.test.ts` (colisão e substituição preservam bytes) |
| C3A-T12 | R08 | `attachments/store.test.ts` (symlink/junction, escape) |
| C3A-T13 | R08 | `attachments/routes.test.ts` (dono 404, origin/host 403, sem enumeração) |
| C3A-T14 | R06 | `attachments/store.test.ts` (crash após admissão/durante stream) |
| C3A-T15 | R06 | `attachments/store.test.ts` (crash stage completo/intenção) |
| C3A-T16 | R06 | `attachments/store.test.ts` (crash após publicação antes do commit) |
| C3A-T17 | R06 | `attachments/store.test.ts` (stage corrompido × destino íntegro) |
| C3A-T18 | R07 | `attachments/routes.test.ts` (retry = mesmo ID; metadata divergente = `attachment_forged`) |
| C3A-T19 | R07 | `attachments/routes.test.ts` (`reconciliarIdentidade`, CAS/mutationId) |
| C3A-T20 | R09 | `__tests__/c3aDraft.test.tsx` (3: projeção sem bytes/base64/locator/token; snapshot do rascunho; fusão F5) |
| C3A-T21 | R09 | `__tests__/c3aDraft.test.tsx` (2: legado sem artefato emprestado; chip honesto sem download) |
| C3A-T22 | R09 | `attachments/routes.test.ts` (referência alterada → ausente; re-registro = artefato novo) |
| C3A-T23 | R10 | `__tests__/c3aSend.test.tsx` (3: escolha explícita sem transferência; só texto ao modelo; anexo sem texto = sem run) + `App.test.tsx` (ponta a ponta na UI) |
| C3A-T24 | R10 | `__tests__/c3aSend.test.tsx` (Google/NVIDIA simulados, `tools=[]`, storage independente de rede) |
| C3A-T25 | R11 | `__tests__/c3aSend.test.tsx` (falha no 2º, draft retido, retry com os MESMOS IDs, F5 lista pronto) |
| C3A-T26 | R11 | `attachments/lifecycle.test.ts` (+ `store.test.ts`) |
| C3A-T27 | R12 | `attachments/lifecycle.test.ts` (arquivar preserva; excluir não limpa projeto) |
| C3A-T28 | R12 | `attachments/lifecycle.test.ts` (chat interno limpa só privados exclusivos) |
| C3A-T29 | R12 | `attachments/lifecycle.test.ts` (tombstone × upload em voo → `session_deleted`) |
| C3A-T30 | R13 | `attachments/recovery.test.ts` |
| C3A-T31 | R13 | `attachments/recovery.test.ts` (snapshot forjado/origem excluída não concedem bytes) |
| C3A-T32 | R04 | `attachments/lifecycle.test.ts` (migração preserva FKs/journal/ACK) |
| C3A-T33 | R08 | `attachments/routes.test.ts` (cross-site 403, headers seguros) + `server/localBoundary.test.ts` (binário só na rota de upload) |
| C3A-T34 | R01/R14 | `__tests__/c3aCompatibility.test.tsx` (6: teclado/foco/IME, tokens de tema, 800×600 sem corte, ditado honesto) |
| C3A-T35 | R04/R14 | `__tests__/c3aArchitecture.test.tsx` (7: domínio puro, services/, App só wiring, MM-0 puro, editor humano sem IA) |
| C3A-T36 | R05/R14 | `attachments/policy.test.ts` (buffers limitados, concorrência, expiração) |

`missingCriteria` do runner = `[]` — o runner confere os 36 IDs por regex no **nome** de
testes aprovados, não por declaração.

## 3. Jornadas E01–E10 (servidor real + Chromium, porta 5214)

| ID | Prova executada |
|---|---|
| C3A-E01 | Upload binário real (`Content-Type: application/octet-stream`), chip salvo, **0 requests a `/api/agir`**, F5 reconstrói o chip com o MESMO `artifactId` e o download devolve bytes com **hash SHA-256 idêntico** ao original |
| C3A-E02 | Admissão em Chat (raiz nula) sem codec: `state: pronto`, `sha256` calculado no servidor, lista `{attachments, uploads}` escopada |
| C3A-E03 | 2 arquivos por seleção; remoção de 1 chip; publicação com o restante e bytes conferidos |
| C3A-E04 | Falha forçada no 2º upload: **nenhuma** mensagem publicada, 2 chips no rascunho, retry sem re-admissão do 1º |
| C3A-E05 | Duplo clique/ACK: 1 mensagem com anexo, 1 POST de publicação, botão desabilitado no envio |
| C3A-E06 | Cópia explícita grava `<projeto>/uploads/<nome>`; `DELETE` da sessão (deletionId + expectedRevision) devolve 410/404 na leitura e o **arquivo do projeto permanece íntegro** |
| C3A-E07 | Referência intacta → `presente: true` e bytes originais; alterada → `presente: false`/`estado: ausente`; removida → download 404/409/410; re-registro = `artifactId` NOVO (sem retarget) |
| C3A-E08 | Download escopado por dono/chat (cross-chat e sem mesma origem = 403/404/410); sessão legada metadata-only criada pelo servidor aparece na UI **sem botão de download falso** |
| C3A-E09 | Rascunho da landing (arquivo + texto) sobrevive a abrir Provedores; 800×600 sem overflow horizontal; chip legível no tema claro |
| C3A-E10 | Caminho só-texto: **0** requests de upload, nenhum chip, `/api/agir` chamado normalmente |

## 4. Delta de responsabilidade do `App.tsx`

- `App.tsx` = **2888 linhas** (limite da casa ≤ 2889), com uma **única** chamada
  `enviarMensagemComAnexos({ … , portas: portasEnvioApp({ … }) })` em **linha única**.
- Ficaram **fora** do App os donos novos:
  - `services/sessions/anexosClient.ts` — HTTP dos anexos (`/api/sessions/…/attachments`, corpo binário, sem base64).
  - `services/sessions/enviarComAnexos.ts` — fluxo R11 (`prepararAnexosDaLanding`, `enviarMensagemComAnexos`, `portasEnvioApp`, `transporteAnexosHttp`).
  - `domain/enviarAnexos.ts` — máquina de transferência com transporte injetável.
  - `domain/arquivosVivos.ts` — depósito transitório do `File` (nunca serializado).
  - `domain/anexosRascunho.ts` — máquina de estados/nome seguro/DTO puros (cliente **e** servidor).
  - `hooks/useFusaoAnexos.ts` — fusão F5/offline com a verdade do ledger.
  - `server/session-persistence/attachments/*` — 11 módulos de servidor.
- Migração **somente aditiva** em `database.ts` (`criarTabelasAnexos`, sem FK entre ledger e legado),
  `deletions.ts`, `index.ts`, `projecaoTranscript.ts` (P30 aditiva) e `local-boundary.mjs`
  (exceção pontual para `application/octet-stream` **apenas** na rota de conteúdo de upload).

## 5. Correções de defeito feitas dentro do escopo

1. **`recuperacao.ts` — prioridade de fonte**: stage parcial sombreava a origem íntegra;
   corrigido para stageÍNTEGRO → origem → finalÍNTEGRO (parcial sem fonte íntegra = 410).
2. **`anexosRascunho.ts`** — remoção de `motivo` sem `delete` mutável e sem variáveis não usadas (lint 0).
3. **`data-artifact-id`** no chip publicado (`ChatPanel`) — necessário para o E2E conferir hash
   sem depender de texto de UI; não expõe caminho nem bytes.
4. **`c3aSend`/`c3aDraft`** — os IDs T01/T02/T03/T23 passaram a ser provados em suítes do
   plano (`PLANO_DE_VALIDACAO.json`), não apenas em `App.test.tsx`/arquivo novo fora do plano.

## 6. Limites honestos desta entrega

- **Windows não foi medido.** Os testes de path (T10/T12) cobrem a semântica POSIX do Linux;
  ADS/reservados/junctions exigem execução real em Windows e ficam declarados como pendência
  de homologação, não como aprovados.
- **Sem codec**: nenhum anexo é enviado ao modelo. O produto grava, permite download e diz na
  interface "armazenado; não enviado ao modelo". `podeEnviarModelo()` retorna `false`.
- **Ditado por voz na landing** segue desabilitado com motivo explícito (`Ditar por voz`,
  `aria-disabled`), coberto por T34.
- **`localBoundary.test.ts`** ganhou caso dedicado (7→7 testes): `octet-stream` só é aceito
  na rota exata de conteúdo de upload, com mesma origem/Host/Fetch Metadata; qualquer outra
  mutação sensível continua exigindo JSON, e `application/octet-streamx` não passa.
- Falhas pré-existentes (`fatia07_destravar`, `editorTabs`, `monacoLoadFailure`) **não** foram
  corrigidas: estão fora do escopo C-3a e permanecem idênticas ao baseline.
- Os 33 skips do baseline seguem 33 (nenhum skip novo, nenhum resolvido) — preservados por regra.

## 7. Artefatos de execução

| Artefato | Caminho |
|---|---|
| Preflight | `/home/user/c3a-validacao/01-preflight/preflight.json` |
| Foco (nominais/critérios/log) | `/home/user/c3a-validacao/03-foco/{nominais,criterios,execucao}.json` |
| Ampla (comparação/log) | `/home/user/c3a-validacao/04-ampla/{comparacao,execucao}.json` |
| Baseline | `/home/user/c3a-base-run/{vitest,nominais,execucao}.json` |
| Lint base/atual | `/tmp/lint-base.json`, `/tmp/lint-c3a-new.json` |
| E2E | `sh platform/scripts/e2e-c3a.sh` → `platform/apps/workbench-v2/test-results/` |
| Spec E2E | `platform/apps/workbench-v2/e2e/c3a_anexos.spec.ts` |

Rodar de novo, do zero:

```sh
cd /home/user/agente_window/platform/apps/workbench-v2
PATH=/home/user/agente_window/platform/.runtime/node-v26.13.0-linux-x64/bin:$PATH
npx tsc -b --force
npx eslint src --format json > /tmp/lint-c3a-new.json
NODE_OPTIONS=--max-old-space-size=1408 npx vite build
cd /home/user/memoria-de-projeto/C-3a/pacote/C-3a
node VALIDAR_C3A.mjs --repo /home/user/agente_window --mode foco --out /home/user/c3a-validacao/05-foco
node VALIDAR_C3A.mjs --repo /home/user/agente_window --mode ampla \
  --out /home/user/c3a-validacao/06-ampla --baseline-json /home/user/c3a-base-run/vitest.json
cd /home/user/agente_window && sh platform/scripts/e2e-c3a.sh
```
