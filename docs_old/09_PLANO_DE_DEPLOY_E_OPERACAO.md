# 09 — PLANO DE DEPLOY E OPERAÇÃO

## Objetivo
Definir como o AGENTE WINDOW sai do ambiente de desenvolvimento para um ambiente utilizável, com release rastreável, rollback e operação mínima.

## Topologia alvo

| Camada | Serviço | Responsabilidade |
|---|---|---|
| Cliente web | frontend do workbench | renderizar UI, manter estado local e abrir WebSocket com o runtime |
| Runtime Node.js | API/bridge principal | chat runtime, command handling, orchestrators e sessão |
| PTY/File Host | serviço de SO | shell real, filesystem e watchers |
| Persistência | storage local/servidor | snapshots, preferências, sessões e artefatos leves |
| Observabilidade | logs e métricas | eventos de erro, latência, disponibilidade e smoke checks |

Na fase inicial, Runtime Node.js e PTY/File Host podem rodar no mesmo processo lógico, desde que os contratos permaneçam separados.

## Ambientes

| Ambiente | Objetivo | Requisitos mínimos |
|---|---|---|
| local | desenvolvimento e validação incremental | frontend, runtime, PTY, dados de teste e logs locais |
| staging | validar release candidata | mesma topologia de produção com chaves e políticas de teste |
| produção | uso real | monitoração, logs persistidos, healthcheck e rollback definido |

## Variáveis de ambiente mínimas

| Variável | Exemplo | Uso |
|---|---|---|
| `NODE_ENV` | `production` | modo de execução |
| `APP_PORT` | `3000` | porta HTTP do frontend/runtime |
| `WS_PORT` | `3001` | porta WebSocket, se separada |
| `WORKSPACE_ROOT` | `/srv/agente-window/workspace` | raiz de arquivos acessível |
| `DEFAULT_SHELL` | `/bin/bash` | shell padrão do PTY |
| `MODEL_PROVIDER` | `openai-compatible` | adaptador ativo |
| `MODEL_BASE_URL` | `https://api.openai.com/v1` | endpoint base do provider |
| `MODEL_API_KEY` | `sk-...` | credencial do provider |
| `MAX_TERMINAL_SCROLLBACK` | `5000` | limite de linhas de terminal |
| `LOG_LEVEL` | `info` | granularidade de logs |

## Sequência de release
1. Consolidar a onda final e validar testes bloqueantes.
2. Gerar release candidate com versão identificável.
3. Publicar em staging.
4. Executar smoke test completo.
5. Corrigir blockers, se existirem.
6. Publicar em produção.
7. Executar smoke test pós-deploy.
8. Monitorar logs e métricas no período inicial da release.

## Smoke test pós-deploy

| Passo | Verificação |
|---|---|
| 1 | aplicação abre e renderiza workbench |
| 2 | conexão runtime/websocket sobe sem erro |
| 3 | explorer lista a raiz esperada |
| 4 | terminal abre e recebe output |
| 5 | chat envia prompt e inicia streaming |
| 6 | layout persiste após reload |
| 7 | comando global básico funciona |
| 8 | logs não mostram erro crítico recorrente |

## Estratégia de rollback
Rollback deve ser executado se houver:
- indisponibilidade do runtime;
- falha generalizada de PTY/filesystem;
- regressão crítica em layout, sessão ou terminal;
- erro de autenticação/configuração de provider que impeça o produto de operar.

Procedimento mínimo:
1. retirar a release atual do tráfego;
2. restaurar a imagem/artefato anterior;
3. reaplicar variáveis estáveis;
4. reexecutar smoke test;
5. registrar incidente e causa provável.

## Operação mínima
- logs estruturados de runtime, terminal, filesystem e chat;
- rastreamento de latência de comandos críticos;
- healthcheck simples para processo HTTP e bridge runtime;
- contagem de erros por sessão;
- registro de crashes de PTY e falhas de reconexão.

## Limites iniciais aceitos
- a primeira release pode compartilhar processo entre runtime e host de PTY/filesystem;
- hard multi-tenant não é exigência da V1;
- observabilidade inicial pode ser simples, desde que suficiente para diagnosticar falhas reais.
