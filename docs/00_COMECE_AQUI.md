# 00 — COMECE AQUI (leia isto antes de gastar um token)

**Atualizado:** 2026-09-29 · **HEAD local:** `0e36af4` (+ c2 não commitado no working tree) · Projeto **AGENTE WINDOW** — réplica fiel do layout do VS Code 1.135 em React/Vite, em `platform/apps/workbench-v2/`.

Esta página existe porque a documentação é grande (28 docs + engenharia reversa) e IAs novas gastavam turnos redescobrindo o que já era sabido. Em **5 minutos** você deve saber: onde a obra parou, o que não tocar, o que é lixo, como rodar testes sem destruir nada, e o que ler depois.

## 1. Onde a obra parou (detalhe: `docs/25`)
- **FATIA-04 (Motor: Explorer, Search, Source Control, Diff, Editor anexo)** ✅ concluída e homologada no Windows.
- **FATIA-05 "Chassis-Right"** (`docs/24` v1.1 = autoridade): Activity Bar (48 px) + Side Bar **à direita**, layout `[centro][AttachArea][Side Bar][Activity Bar]`.
  - Gate 0 ✅ · **c1 `feat(activity-bar)` ✅ commitado** · **c2 `feat(side-bar)` implementado, não commitado — bloqueado por uma decisão do usuário** (T14 da sessão 14 × largura da Side Bar; opções em `docs/25 §3`) · c3 não iniciado.
- **Próxima ação de qualquer IA:** ler `docs/25`, **perguntar ao usuário a pendência P1** e só então seguir `docs/25 §7`. Não começar 5.2+.

## 2. O que NÃO tocar (detalhe: `docs/18`, `docs/24 §11`, `docs/27 §F`)
Terminal homologado (`src/components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `platform/services/pty-server`) · `src/modules/explorer-search/{core,server}/**` · `EditorArea.tsx` (até a 5.7) · specs `sessao_11*` · contratos congelados do `docs/18`. `App.tsx` só recebe wiring aditivo via barrel.

## 3. O que é lixo / obsoleto (detalhe: `docs/28`)
`legacy/` (removida de propósito — **não restaurar**) · 13 E2E mortos + 9 unitários do `TerminalPanel.test` (pré-existentes, não investigar) · pasta `FATIA-05_LAYOUT_BYTE_A_BYTE/` (plano antigo) · `shot.tmp.mjs`, `tsc`, `test-results*`.

## 4. Como rodar testes sem destruir o repositório (detalhe: `docs/26`)
- **Dois mundos:** Vite **5174** serve o repo real; Vite **5175** serve a fixture `/tmp/explorer-fs-fixture`. **Specs 12/13/14* (exceto `14b_git_smoke`) fazem delete/rename e SÓ podem rodar contra a 5175** (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175`). Já apagaram 206 arquivos reais uma vez.
- RAM ~1,9 GB: **um Vite por vez** durante suítes com Monaco (14, 14c), `--workers=1`, code-server 8080 desligado durante a bateria.
- O sandbox é recriado a cada mensagem: reinstalar (`npm install`, `npx playwright install chromium`), religar servidores via `start_process`, reseed da fixture antes de cada spec.
- Números esperados: typecheck **0** · vitest **708/717** (9 pré-existentes) · bateria §9 do `docs/24`: 12 suítes verdes (hoje 11 + o T14 pendente).

## 5. Como trabalhar com o usuário (detalhe: `docs/27`)
PT-BR simples (ele dita por voz) · parar e dar **relatório binário** após cada commit, aguardar OK · nunca inventar sucesso · "vamos apenas conversar" = não executar nada · o usuário leva o workspace ao Windows e faz o push (hashes do GitHub diferem; conteúdo igual) · ao achar imprevisto, **parar e reportar**.

## 6. Ordem de leitura recomendada
1. Este arquivo → 2. `docs/25` (estado e pendências) → 3. `docs/24` (plano da FATIA-05, §1 ordem, §2 decisões, §9 anti-regressão, §11 regras) → 4. `docs/27` (regras de trabalho) → 5. `docs/26` (testes/ambiente) → 6. `docs/18` (contratos congelados) → 7. `docs/16` (protocolo da IA executora) → 8. `docs/12` (cronologia) e `docs/11` (Kanban) → 9. medidas: `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_17`, `FATIA-05_LAYOUT/05_01`, `05_02` → 10. arquitetura (docs 01–04) só se for mexer em contrato.

Se algo aqui contradisser o código, o código está certo — **reporte** a divergência e atualize este arquivo.
