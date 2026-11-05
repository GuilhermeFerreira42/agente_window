# OpenClaude — sessões e permissões (o coração do "Permitir / Negar / Na Sessão")

> **Serve para:** FATIA 10 (cartão de permissão + anti-loop) e FATIA 13 (sessões/histórico).
> **Fonte:** commit fc3be25e (14/10/2026).

## Permissões
- **Modos** (`src/types/permissions.ts`): `default`, `acceptEdits` (aceitar edições), `plan` (só planejar), `bypassPermissions`, `dontAsk`, `fullAccess` (+ internos `auto` e `bubble`). É uma **escada de confiança** — o nosso MVP usa só o degrau básico: **pedir e permitir**.
- **Decisão** (`src/hooks/toolPermission/PermissionContext.ts`): monta o pedido, chama ganchos, decide (permitir/negar), registra e avisa quem está esperando.
- **"Permitir na Sessão"** → `src/hooks/toolPermission/permissionSessionOwnership.ts`: a permissão tem **dono** (a sessão). Concedida uma vez naquela sessão, não pergunta de novo — e **não vaza** para outras sessões. É exatamente o desenho do nosso cartão (FATIA 10).
- **Registro/auditoria**: `permissionLogging.ts` (histórico das decisões).

## Sessões
- `src/server/sessionManager.ts` — gerenciamento das sessões (servidor).
- `src/assistant/sessionHistory.ts` (+ `sessionHistorySerialization.ts`) — **histórico por sessão** (para reler depois) — o parente do "histórico de chats antigos" que queremos na FATIA 13.
- `src/entrypoints/sdk/sessions.ts` — sessões via SDK.

## Lição direta para a FATIA 10
Cartão de permissão = **3 botões** (Permitir · Negar · Permitir na Sessão) + **memória de sessão com dono** + **registro** do que foi decidido. Nada de "aprovar tudo" escondido em lugar nenhum.
