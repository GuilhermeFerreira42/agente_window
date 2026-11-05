> **⚠️ OBSOLETO (2026-09-29):** este plano ("Byte a Byte", Side Bar à esquerda, decisões A0.x) foi **substituído por `docs/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` v1.1** (Side Bar à direita, inglês só no novo, sash 4 px). Mantido apenas como histórico. Não use suas medidas, contratos ou ordem de sub-fatias.

# FATIA-05 — Consolidação e Layout Byte a Byte — Índice e Resumo

**Status:** Planejada (documentação aprovada em 2026-09-28; código da 5.1 aguarda autorização explícita do usuário).
**Depende de:** FATIA-04 (Motor) **100 % concluída** — Explorer, Search, Source Control (Changes + Stage/Unstage/Discard + Commit) e Diff read-only homologados no Windows (HEAD de código `2d1b126`, docs `15a1552`).

## O que é a FATIA-05, em uma frase
Pegar os **motores prontos** da FATIA-04 (componentes React isolados em `src/modules/explorer-search/`) e **remontá-los no chassi exato do VS Code**: Activity Bar (48 px) → Side Bar (uma view por vez: Explorer / Search / Source Control) → Editor Group central (arquivos e diffs) → Panel inferior (Terminal…), **sem reescrever lógica** — só fiação (wiring) de UI.

## Dor que ela resolve
Hoje Search e Source Control vivem **dentro do Editor Anexo** (barra auxiliar, à direita) e **somem quando um arquivo é aberto**. No VS Code real, a Side Bar e o Editor Group são independentes: a busca ou a lista de alterações continua visível enquanto o arquivo (ou o diff) está aberto no centro.

## Arquivos desta pasta
| Arquivo | Conteúdo |
|---|---|
| `05_00_INDICE_E_RESUMO.md` | este índice |
| `05_01_INVENTARIO_VISUAL_LAYOUT.md` | régua medida no CSS/JS compilado do runtime VS Code 1.135 (code-server 8080): Activity Bar, Side Bar, Panel, Editor Group, sashes, badges — e a **descoberta do perfil `agentsWindow`** |
| `05_02_COMPORTAMENTO_LAYOUT.md` | como as partes interagem no VS Code real (toggle da Side Bar, coexistência com o editor, foco, badges, teclas) |
| `05_03_ARQUITETURA_LAYOUT.md` | auditoria do shell atual (`App.tsx`, `AuxiliaryBar.tsx`, `EditorArea.tsx`) + arquitetura alvo (ActivityBar / SideBar / EditorGroup / viewRegistry) |
| `05_04_CONTRATOS_LAYOUT.md` | contratos propostos: `viewRegistry`, `ILayoutApi`, persistência, eventos; o que permanece congelado |
| `05_05_PLANO_IMPLEMENTACAO_SUBFATIAS.md` | plano 5.1–5.7 (comando do usuário de 2026-09-28) com tarefas, arquivos-alvo, critérios, validação, commits atômicos e **pontos de atenção/conflitos** |
| `05_06_CRITERIOS_ACEITE.md` | checklists binários por sub-fatia + Definition of Done da fatia + checklist humano Windows |

## Regras invioláveis (herdadas + novas)
1. Nenhuma sub-fatia começa sem a anterior **homologada no Windows**.
2. **Zero alteração de lógica de negócio** em `src/modules/explorer-search/{core,server}/**` — só montagem/wiring.
3. Anti-regressão completa após **cada commit** (vitest ≥ 382; specs 12/13/14/14b/14c/14d/terminal).
4. Spec E2E **falhando antes** do código de cada commit.
5. Prints lado a lado vs code-server 8080 em `auditoria_15/c<N>/` (quando o sandbox permitir; limitação de RAM registrada em `docs/05` D2.34).
6. Documentação atualizada ao fim de cada sub-fatia (`docs/11`, `12`, `05`, `16` + esta pasta).
7. **Parada e relatório binário** ao fim de cada sub-fatia.

## Numeração vigente das fatias (docs/11)
04 Motor ✅ · **05 Layout Byte a Byte (esta)** · 06 Chat + Runtime de Agente · 07 Editor/Browser/Search · 08 Command + Theme · 09 Hardening · 10 Release.
