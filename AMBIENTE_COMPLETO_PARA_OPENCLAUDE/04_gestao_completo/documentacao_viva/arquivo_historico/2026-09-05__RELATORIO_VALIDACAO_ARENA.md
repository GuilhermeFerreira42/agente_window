# Relatório de Validação Executada — Arena (Agent Mode)
**Data:** 05/09/2026 · **Executor:** Arena Agent Mode (sandbox Linux, Node v20.20.2, npm 10.8.2)
**Projeto:** `_AMBIENTE_COMPLETO_PARA_OPENCLAUDE/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final`

> Tudo abaixo foi **executado de verdade** neste workspace. Nenhum número foi estimado.
> Nenhum arquivo do projeto foi modificado nesta rodada (apenas leitura + execução).

---

## 1. Comandos executados e resultado real

| # | Comando | Resultado REAL | Status |
|---|---------|----------------|--------|
| 1 | `npm install` | 497 pacotes instalados (respeitando `package-lock.json`) | ✅ |
| 2 | `npm run typecheck` (`tsc --noEmit`) | **0 erros**, exit code 0 | ✅ |
| 3 | `npm run test` (`vitest run`) | **339 passaram / 9 falharam** — 348 testes, 41 arquivos (3 arquivos falhando) | ❌ |
| 4 | `npm run dev` (Vite 5.4.21) | servidor sobe em `0.0.0.0:5173` em ~180 ms | ✅ |
| 5 | `npx playwright install chromium` + `install-deps` | Chromium headless 151 + libs de sistema (via `sudo apt`) | ✅ |
| 6 | `npx playwright test` (1ª rodada, só 5173 no ar) | **18 passaram / 30 falharam** | ❌ |
| 7 | `npx playwright test` (2ª rodada, com 5173 **e** 5175 no ar) | **48/48 passaram (3.2 min), exit 0** | ✅ |
| 8 | Screenshots gerados | 8 PNGs em `test-results/val3_sessao03_*.png` | ✅ |

---

## 2. Divergência com a documentação viva (falso positivo detectado)

`CURRENT_STATE.md` linha 66 e `CONTEXTO_GERAL.md` linha 67 afirmam:

> "Testes Unitários — **348/348 passando**"

**Realidade medida hoje:** `Tests 9 failed | 339 passed (348)`.
A alegação de 348/348 é um **falso positivo herdado**: a suíte nunca foi executada de ponta a ponta
no estado atual do código (ou foi executada antes de mudanças em `TerminalPanel.tsx` e no CSS).

---

## 3. As 9 falhas unitárias — causa-raiz apurada

### 3.1 `TerminalPanel.test.tsx` — 7 falhas · causa: **teste desatualizado** (dívida de teste, não bug de produto)
```
TypeError: instance.write is not a function
  at src/components/TerminalPanel.tsx:177
```
O `MockTerminal` do teste (linhas 6–22) só implementa
`clear, dispose, fit, loadAddon, open, writeln`.
O componente atual já usa também **`write`**, **`onData`** (e o retorno `dispose` do disposable),
introduzidos quando o terminal virou "REAL" (digitação + execução de comandos).
→ **Correção:** completar o mock (`write`, `onData` retornando `{ dispose }`, `onKey`, `focus`,
`attachCustomKeyEventHandler`, `options`, `cols/rows`). Não há erro no código de produção.

### 3.2 `themeTokens.test.ts` — 1 falha · causa: **gap real de contrato de tema**
Tokens referenciados no CSS da réplica mas **não declarados** no tema Dark+:
- `--vscode-charts-yellow`
- `--vscode-editor-font-family`
- `--vscode-editorGroupHeader-tabsBackground`

→ **Correção:** declarar os 3 tokens no arquivo de tema (ou remover as referências órfãs no CSS).

### 3.3 `App.test.tsx` — 1 falha · causa: **provável bug real de UI (live region)**
```
"audita Changes, Files e Checks da barra auxiliar..."
expect(getByRole('status')).toHaveTextContent('Pull request preparado')
Received: "Accessibility aberto no GitHub (mock)"
```
Após clicar em **Preparar PR**, a região `role="status"` continua exibindo o toast anterior.
Ou o handler do PR não emite o anúncio, ou o toast anterior não é substituído a tempo.
→ **Correção:** investigar o emissor de status do botão "Preparar PR" em `App.tsx`.

---

## 4. As 30 falhas E2E — causa-raiz: **porta hardcoded obsoleta**

Não havia bug nenhum. Seis specs apontam para uma porta antiga de uma sessão passada:

| Spec | BASE_URL |
|------|----------|
| `helpers.ts` | 5173 |
| `sessao_01_sessions_core.spec.ts` | **5175** ← |
| `sessao_02_sessions_list.spec.ts` | 5173 |
| `sessao_03_layout.spec.ts` | **5175** ← |
| `sessao_04_layout_controller.spec.ts` | **5175** ← |
| `sessao_05_single_pane.spec.ts` | 5173 |
| `sessao_06_mobile.spec.ts` | **5175** ← |
| `sessao_07_browser_editor.spec.ts` | **5175** ← |
| `sessao_08_filesystem.spec.ts` | **5175** ← |
| `sessao_09_bugs_criticos.spec.ts` | 5173 |
| `validacao3_sessao03_...spec.ts` | 5173 |

6 arquivos × 5 testes = **exatamente as 30 falhas** (`net::ERR_CONNECTION_REFUSED`).
Subindo um segundo Vite em 5175 → **48/48 passaram**.

→ **Correção definitiva (recomendada):** todas as specs importarem `BASE_URL` de `e2e/helpers.ts`
(ou usar `baseURL` do `playwright.config.ts` + `page.goto('/')`), e adicionar o bloco `webServer`
ao `playwright.config.ts` para o Playwright subir/derrubar o Vite sozinho:

```ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
},
```

---

## 5. Estado consolidado (fonte da verdade de hoje)

| Portão de qualidade | Alegado nos docs | Medido hoje |
|---|---|---|
| TypeScript | 0 erros | ✅ **0 erros** |
| Vitest | 348/348 | ❌ **339/348** (9 falhas: 7 mock, 1 tema, 1 UI) |
| Playwright | "45 E2E + 46 screenshots" | ⚠️ **48 testes existem; 48/48 passam** com 5173+5175 no ar; 18/48 com só 5173 · **8 screenshots** gerados |
| Build/dev server | — | ✅ Vite sobe e a UI renderiza (screenshot conferido) |

---

## 6. Próximos passos sugeridos (na ordem)

1. Corrigir o `MockTerminal` em `TerminalPanel.test.tsx` (+7 testes) — baixo risco.
2. Declarar os 3 tokens ausentes no tema Dark+ (+1 teste) — baixo risco.
3. Investigar o anúncio de status do "Preparar PR" em `App.tsx` (+1 teste) — **bug real**.
4. Unificar `BASE_URL` das specs e adicionar `webServer` ao `playwright.config.ts` — elimina
   permanentemente o falso-negativo de porta.
5. Só então rodar `ARCHIVING_PROTOCOL.md` e atualizar `KANBAN.md`, `CURRENT_STATE.md`,
   `PHASE_SUMMARY.md` com **os números reais** (não com 348/348).
