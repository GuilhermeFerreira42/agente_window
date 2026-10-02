# 00 — COMECE AQUI (leia isto antes de gastar um token)

**Atualizado:** 2026-10-02 · **HEAD local:** `4ee0ed8` (5.8-c3) · **Onda 5 / FATIA-05 = 100 % ✅ homologada no Windows (5.1–5.8)** · **Próxima Onda 6 = Chat Carcaça (aguardando autorização)** · histórico: `2bd6cc3` (5.3) · 5.2 `22a1523` · 5.1 `1e9978f` · Projeto **AGENTE WINDOW** — réplica fiel do layout do VS Code 1.135 em React/Vite, em `platform/apps/workbench-v2/`.

Esta página existe porque a documentação é grande (28 docs + engenharia reversa) e IAs novas gastavam turnos redescobrindo o que já era sabido. Em **5 minutos** você deve saber: onde a obra parou, o que não tocar, o que é lixo, como rodar testes sem destruir nada, e o que ler depois.

## 1. Onde a obra parou (detalhe: `docs/25`)
- **FATIA-04 (Motor: Explorer, Search, Source Control, Diff, Editor anexo)** ✅ concluída e homologada no Windows.
- **FATIA-05 "Chassis-Right" ✅ 100 % HOMOLOGADA 2026-10-02** (`docs/24` v1.4 = autoridade; estado final em `docs/25`). **Onda 6 = Chat Carcaça (histórico + workspace sync) — aguardando autorização; não iniciar.** Detalhe histórico abaixo:
- (histórico) **FATIA-05 "Chassis-Right"** (`docs/24` v1.1 = autoridade): Activity Bar (48 px) + Side Bar **à direita**, layout `[centro][AttachArea][Side Bar][Activity Bar]`.
  - Gate 0 ✅ · 5.1 ✅ · 5.2 ✅ homologadas · **5.3 ✅ código concluído** (`2bd6cc3` Source Control na Side Bar, maquete "Changes N" removida) · **aguarda homologação manual do usuário no Windows** · 5.4 não iniciada (exige decisão A0.1).
- **Próxima ação de qualquer IA:** ler `docs/25`; **não começar a 5.4 sem o OK de homologação da 5.3 e sem a decisão A0.1** (`docs/25 §7`). Pendências abertas: P3/P4/P7 (higiene de testes), P5 (`legacy/`), P9 (mobile).

## 2. O que NÃO tocar (detalhe: `docs/18`, `docs/24 §11`, `docs/27 §F`)
Terminal homologado (`src/components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `platform/services/pty-server`) · `src/modules/explorer-search/{core,server}/**` · `EditorArea.tsx` (segue só com Browser/Customizations — a 5.7 **não** o substituiu; A0.7) · `core/**` (única exceção registrada: `ATTACH_MAX_WIDTH_RATIO` 0.5 na 5.7, autorizada 2026-10-01) · specs `sessao_11*` · contratos congelados do `docs/18`. `App.tsx` só recebe wiring aditivo via barrel.

## 3. O que é lixo / obsoleto (detalhe: `docs/28`)
`legacy/` (removida de propósito — **não restaurar**) · 13 E2E mortos + 9 unitários do `TerminalPanel.test` (pré-existentes, não investigar) · pasta `FATIA-05_LAYOUT_BYTE_A_BYTE/` (plano antigo) · `shot.tmp.mjs`, `tsc`, `test-results*`.

## 4. Como rodar testes sem destruir o repositório (detalhe: `docs/26`)
- **Dois mundos:** Vite **5174** serve o repo real; Vite **5175** serve a fixture `/tmp/explorer-fs-fixture`. **Specs 12/13/14* (exceto `14b_git_smoke`) fazem delete/rename e SÓ podem rodar contra a 5175** (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175`). Já apagaram 206 arquivos reais uma vez.
- RAM ~1,9 GB: **um Vite por vez** durante suítes com Monaco (14, 14c), `--workers=1`, code-server 8080 desligado durante a bateria.
- O sandbox é recriado a cada mensagem: reinstalar (`npm install`, `npx playwright install chromium`), religar servidores via `start_process`, reseed da fixture antes de cada spec.
- Números esperados: typecheck **0** · vitest **692 passed / 9 failed (pré-existentes) / 16 skipped (D2.60) / 717** · bateria §9 do `docs/24`: **13/13** (spec 15 incluída).

## 5. Como trabalhar com o usuário (detalhe: `docs/27`)
PT-BR simples (ele dita por voz) · parar e dar **relatório binário** após cada commit, aguardar OK · nunca inventar sucesso · "vamos apenas conversar" = não executar nada · o usuário leva o workspace ao Windows e faz o push (hashes do GitHub diferem; conteúdo igual) · ao achar imprevisto, **parar e reportar**.

## 6. Ordem de leitura recomendada
1. Este arquivo → 2. `docs/25` (estado e pendências) → 3. `docs/24` (plano da FATIA-05, §1 ordem, §2 decisões, §9 anti-regressão, §11 regras) → 4. `docs/27` (regras de trabalho) → 5. `docs/26` (testes/ambiente) → 6. `docs/18` (contratos congelados) → 7. `docs/16` (protocolo da IA executora) → 8. `docs/12` (cronologia) e `docs/11` (Kanban) → 9. medidas: `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_17`, `FATIA-05_LAYOUT/05_01`, `05_02` → 10. arquitetura (docs 01–04) só se for mexer em contrato.

Se algo aqui contradisser o código, o código está certo — **reporte** a divergência e atualize este arquivo.
