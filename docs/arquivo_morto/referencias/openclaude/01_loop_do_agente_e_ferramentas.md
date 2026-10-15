# OpenClaude (Twigpine) — o loop do agente e as ferramentas

> **Serve para:** FATIA 09 (Conversar) e FATIA 10 (Agir — ferramentas + permissões do MVP).
> **Fonte:** clone de 14/10/2026 — commit **fc3be25e**. Projeto escrito em TypeScript para **Bun** (nosso projeto é npm/Vite/Node — levar em conta ao aproveitar ideias).

## Onde mora o trabalho
O loop é dividido em **arquivos por assunto**, um por trava — pasta `src/query/`:
- `agentStepLimit.ts` — **limite de passos** (quantas rodadas o agente pode dar antes de parar);
- `tokenBudget.ts` — **orçamento** de contexto/texto;
- `autoCompactCooldown.ts` — quando o histórico cresce demais, comprime (com espera para não repetir);
- `stopHooks.ts` — os **ganchos de parada** (o que acontece quando o loop decide encerrar);
- `transitions.ts` — as passagens de estado do loop;
- **`toolFailureLoopGuard.ts`** — a **guarda anti-loop de ferramenta falhando** (primo direto da nossa trava de "3 chamadas idênticas" da FATIA 10).

Entradas: `src/entrypoints/sdk/query.ts` (via SDK) e `src/server/sessionManager.ts` (servidor).

## Ferramentas — as "mãos"
Pasta `src/tools/`, cada uma na sua pasta: `FileReadTool`, `FileWriteTool`, `FileEditTool` (arquivos), `BashTool` (comando de terminal), `SkillTool` (aciona skill). Cada ferramenta declara o **próprio pedido de permissão** (regras por conteúdo, em `utils/permissions`).

## Lição direta para a FATIA 10
O mínimo para o agente não "girar em falso": **limite de passos** + **orçamento de contexto** + **guarda anti-loop** — e, do lado de fora, o cartão de permissão (nota `03` desta pasta).
No MVP (D72), liberamos só as mãos de **arquivo** (equivalentes ao nosso `/fs/*`, que já tem escrita atômica); o `BashTool` fica para depois (FATIA 12/13), com protocolo de permissão mais maduro.

## Cuidados
- Não copiar o loop inteiro — **destilar** só o que serve (limites + guardas + permissão por ferramenta).
- Eles usam `bun:bundle` nos imports — sintaxe que o nosso projeto não tem.
