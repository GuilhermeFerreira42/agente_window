# agente_window

Réplica fiel do layout do **VS Code 1.135** (Activity Bar, Side Bar, Explorer/Search/Source Control, Editor anexo, Terminal homologado) em React + Vite, com backend PTY e filesystem próprios.

```
agente_window/
  docs/            -> documentação canônica (COMECE por docs/00_COMECE_AQUI.md)
                      evidências e prints por fatia em docs/engenharia_reversa/ (FATIA-05: FATIA-05_LAYOUT/auditoria_05/c1|c2|c3)
  platform/        -> o produto: apps/workbench-v2 (shell) + services/pty-server
```

> `legacy/` (a "casa antiga", porta 5173) **foi removida do branch principal em 2026-09-29**. Nenhum código depende dela. Backup = histórico do Git (tag `legacy-backup-2026-09`). Não restaurar.

## Para IAs e novos desenvolvedores
1. **`docs/00_COMECE_AQUI.md`** — 1 página: onde a obra parou, o que não tocar, o que é lixo, como testar sem destruir nada.
2. **`docs/25_ESTADO_ATUAL_E_PENDENCIAS_FATIA-05.md`** — estado exato e decisões pendentes do usuário.
3. **`docs/24_PLANO_FATIA-05_CHASSIS_RIGHT.md`** — plano vigente.
4. **`docs/27_REGRAS_DE_TRABALHO_COM_IA.md`** e **`docs/26_MAPA_SUITE_E2E_E_AMBIENTE_DE_TESTES.md`**.

## Rodar (Windows / Linux)
```powershell
cd agente_window/platform
npm install
npm run dev
# Frontend http://localhost:5174 (single port: frontend + PTY + fs/git via plugins do Vite)
```

## Testes
```powershell
cd agente_window/platform/apps/workbench-v2
npm run typecheck          # esperado: 0 erros
npx vitest run             # esperado: 708 passed / 9 failed (9 pré-existentes, ver docs/26 §2.5)
```
E2E (Playwright) — **leia `docs/26 §1` antes**: as specs de módulo (12/13/14*) só podem rodar contra o servidor de **fixture na 5175**; contra a 5174 elas apagam arquivos reais.
```powershell
# servidor de fixture
$env:FS_TEST_ROOT="file:///tmp/explorer-fs-fixture"; npx vite --port 5175 --strictPort
# em outro terminal
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:5175"; npx playwright test e2e/sessao_14c_diff_minimal --workers=1
```
Bateria obrigatória por commit: `docs/24 §9` (12 suítes) — script `platform/apps/workbench-v2/run-antiregressao.sh`.

## Intocáveis
Terminal homologado (`src/components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `services/pty-server`), `src/modules/explorer-search/{core,server}/**`, `EditorArea.tsx` (até a sub-fase 5.7), contratos do `docs/18`.
