# GATES_EXECUCAO — Evidência bruta da última cadeia de validação

> **Regra:** este arquivo guarda a saída BRUTA dos gates, executada de verdade.
> Nenhum número dos demais documentos vivos pode contradizer o que está aqui.
> Se contradisser, vale este arquivo (ou uma execução mais recente registrada aqui).

**Execução:** 2026-09-05 · sandbox Arena (2 GB de RAM) · `02_replica_final/`

| Gate | Comando | Exit code | Resultado |
|------|---------|-----------|-----------|
| Tipos | `npm run typecheck` (`tsc -b --force`) | **0** | 0 erros |
| Unitários | `npm run test` (`vitest run`) | **0** | **43 arquivos / 368 testes passando** |
| E2E | `npx playwright test` | **0** | **56/56 passando em 5,4 min** (58 screenshots) |
| Build | `npm run build` (`tsc -b && vite build`) | **134** | ❌ **BLOQUEIO DE AMBIENTE**: OOM do V8 |

---

## 1. `npm run typecheck`

```
===== npm run typecheck =====
> agents-window-replica@0.1.0 typecheck
> tsc -b --force

EXIT_CODE=0
```

> Observação registrada em sessão anterior e que continua valendo: `tsc --noEmit`
> puro na raiz é **no-op** (o `tsconfig.json` tem `"files": []` e só `references`).
> O gate real é `tsc -b --force`, já configurado no script.

## 2. `npm run test`

```
===== npm run test =====
> agents-window-replica@0.1.0 test
> vitest run

 RUN  v2.1.9 /home/user/.../02_replica_final

 [...]
 ✓ src/__tests__/borderResidual.test.ts (2 tests) 4ms
 ✓ src/__tests__/accessibility.test.tsx (6 tests) 3ms
 ✓ src/__tests__/mobileLayout.test.ts (5 tests) 3ms
 ✓ src/__tests__/keyboardNavigation.test.ts (6 tests) 3ms
 ✓ src/__tests__/search.test.ts (4 tests) 5ms
 ✓ src/__tests__/editorTabs.test.ts (4 tests) 3ms

 Test Files  43 passed (43)
      Tests  368 passed (368)
   Start at  16:56:20
   Duration  81.47s (transform 1.36s, setup 2.24s, collect 3.91s, tests 51.25s, environment 16.66s, prepare 2.50s)

EXIT_CODE=0
```

## 3. `npx playwright test`

```
===== npx playwright test =====
Running 56 tests using 1 worker

  ✓   1 e2e/sessao_01_sessions_core.spec.ts:20:3 › T1: sessões persistidas carregam ao iniciar (4.3s)
  ✓   2 e2e/sessao_01_sessions_core.spec.ts:35:3 › T2: nova sessão cria exatamente uma e a ativa (4.7s)
  ✓   3 e2e/sessao_01_sessions_core.spec.ts:50:3 › T3: sessão ativa persiste após F5 (5.9s)
  ✓   4 e2e/sessao_01_sessions_core.spec.ts:65:3 › T4: estados de sessão têm ícone com rótulo acessível (3.9s)
  ✓   5 e2e/sessao_01_sessions_core.spec.ts:77:3 › T5: largura da sidebar é persistida em px e restaurada após F5 (7.7s)
  [...]
  ✓  55 e2e/validacao3_sessao03_layout_controller_real.spec.ts:71:3 › T3: novo chat mantém as laterais visíveis [00:33] (6.2s)
  ✓  56 e2e/validacao3_sessao03_layout_controller_real.spec.ts:86:3 › T4: [00:33] com aba Browser ativa (aux transiente) (8.4s)

  56 passed (5.4m)

EXIT_CODE=0
```

## 4. `npm run build` — ❌ BLOQUEIO CONHECIDO (ambiente, não código)

```
===== npm run build =====
> agents-window-replica@0.1.0 build
> tsc -b && vite build

vite v5.4.21 building for production...
transforming...

<--- Last few GCs --->

[58193:0x376d0f20]    29890 ms: Mark-Compact 906.9 (946.1) -> 899.3 (946.6) MB, 824.01 / 0.00 ms
[58193:0x376d0f20]    30758 ms: Mark-Compact 907.6 (946.8) -> 899.6 (947.1) MB, 836.88 / 0.00 ms

<--- JS stacktrace --->

FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----
 1: 0xb78db3 node::OOMErrorHandler(char const*, v8::OOMDetails const&) [node]
 2: 0xee8300 v8::Utils::ReportOOMFailure(...)
 [...]
Aborted
EXIT_CODE=134
```

**Diagnóstico honesto:**
- `tsc -b` (a metade de tipos do build) **passa**; quem morre é o `vite build`.
- A máquina tem **1984 MB de RAM total / ~1346 MB disponíveis**; o V8 aborta perto
  de **900 MB de heap** enquanto empacota o `monaco-editor`.
- Tentativa já feita e registrada: `NODE_OPTIONS=--max-old-space-size=6144` →
  processo **`Killed`** pelo OOM killer do sistema (não adianta pedir mais heap
  do que a máquina tem).
- **Conclusão:** não é bug do projeto; é limite do sandbox. O gate precisa rodar
  numa máquina com ≥ 4 GB. Enquanto isso, permanece como o único gate vermelho e
  está registrado no KANBAN (`A FAZER`) e no BACKLOG (`W2-04`).

---

## 2. Execução 2026-09-05 (Arena IA) — Verificação Sessão 11 + diagnóstico do crash `.platform`
> Workspace restaurado de `codigo_completo.txt`. Ambiente montado do zero nesta sessão:
> `npm install` (frontend), `cd pty-server && npm install` (node-pty nativo compilado — `node_modules/node-pty/build/Release/pty.node` OK),
> `npx playwright install chromium` + `sudo npx playwright install-deps chromium` (libs do SO: libnss3, libnspr4, libatk, libxkbcommon, libasound etc.).
> Vite 5.4.21, Chromium headless 151.

| Gate | Comando | Exit code | Resultado |
|------|---------|-----------|-----------|
| Tipos | `npm run typecheck` (`tsc -b --force`) | **0** | 0 erros |
| Unitários | `npm run test` (`vitest run`) | **0** | **44 arquivos / 370 testes passando** |
| E2E completo | `npx playwright test` | **0** | **62/62 passando (~5,2 min, 12 specs)** — inclui Sessão 11 T1–T5 |
| Build | `npm run build` | **134** | ❌ BLOQUEIO DE AMBIENTE persiste: OOM do V8 (mesmo sandbox ~2 GB) |

### Diagnóstico do crash `.platform` (CURRENT_STATE citava "Cannot read properties of null (reading 'platform')" ao montar o TerminalPanel)
- **Conclusão:** o crash **NÃO se reproduz** no código restaurado. Com o ambiente correto, o painel monta sem erros (spec de diagnóstico + Sessão 11 verdes; 0 `pageerror`, 0 `console.error`).
- **Análise estática do xterm:** em `node_modules/@xterm/xterm/lib/xterm.mjs` o objeto "process" (`xe`) só recebe `process` real, `globalThis.vscode.process` ou fica `undefined` — **nunca `null`**. O guard `if (typeof xe === "object")` é seguro (typeof null === "object" só importaria se `xe` fosse null, o que não ocorre). `navigator.platform` é lido só no branch web (browser sempre tem `navigator`). Logo a causa raiz do "bloqueio" descrito era o **ambiente incompleto** (sem node_modules / pty-server buildado / libs do Chromium), não um bug de código.
- **Correção de governança encontrada:** `e2e/debug_terminal_toggle.spec.ts` (citado no CURRENT_STATE como teste rápido) violava o contrato anti-trapaça (`e2eAssertionContract`): hardcode de `localhost:5173`, `console.log` e `test(...)` sem indentação de 2 espaços → quebrava 3 asserts do contrato (unit ficou 367/370). Reescrito para usar `BASE_URL` de `helpers.ts`, sem `console.log` e indentado → unitários 370/370.
