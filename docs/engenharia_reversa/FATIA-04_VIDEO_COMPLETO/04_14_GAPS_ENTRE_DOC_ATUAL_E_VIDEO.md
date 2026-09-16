# 04_14 — GAPS: DOC ATUAL (FATIA-04 PLANEJADA) vs. VÍDEO (FASE 4 COMPLETA)

> Compara a FATIA-04 **como estava documentada** (kanban `docs/11`, backlog `docs/05` Onda 4/Épico D, contratos `docs/04`) com o que o **vídeo** exige. O que faltava está marcado como **GAP** e foi especificado nesta documentação.

---

## 1. Comparação item a item

| Tema | Estado pré-vídeo (planejado) | Exigido pelo vídeo | Situação | Onde foi documentado |
|---|---|---|---|---|
| RPC/bridge de I/O (`FileHost`) | item 4.1 — planejado | upload/download + operações de arquivo | ✅ coberto (expandido) | `04_04`, `04_10` §1 |
| `ExplorerService` (setRoot/expand/collapse/open/reveal/refresh) | item 4.2 — 6 métodos | + createFile/createFolder/rename/delete/cut/copy/paste/download/upload/collapseAll/setSortOrder/select | **GAP** | `04_10` §2 |
| Árvore lazy com reveal/seleção | item 4.3 — planejado | + header com 5 botões, 3 seções, estados vazios, 22 px | **GAP** | `04_01`, `04_02` |
| Watcher `fs.changed` + refresh automático | item 4.4 — planejado | idem + refresh sem perder seleção | ✅ coberto | `04_02` §8 |
| Operações seguras `move/remove` com atomic write | item 4.5 — planejado | + copy, + lixeira, + confirmações de colisão | **GAP** | `04_04` §4, `04_10` §1 |
| Integração explorer → editor | item 4.6 — planejado | editor **em anexo lateral**, não no centro | **GAP estrutural** | `04_05` |
| Menu de contexto completo | **não constava** na FATIA-04 | 8+ itens com grupos/ordem/when | **GAP** | `04_03` |
| Download para máquina local | **não constava** | item obrigatório (“diferencial”) | **GAP** | `04_04` §3 |
| Upload por DnD do SO (arquivos **e pastas**) | **não constava** | obrigatório | **GAP** | `04_04` §2 |
| Seções Editores Abertos / Linha do Tempo / Outline | **não constava** | obrigatório | **GAP** | `04_01` §4 |
| Pesquisa dentro da sessão | **não constava** (só `ViewId 'search'`) | obrigatório | **GAP** | `04_06` |
| Browser interno por “+” na sessão | **não constava** | obrigatório | **GAP** | `04_07` §2 |
| IA com acesso a HTML (ler/clonar/interagir/filmar) | **não constava** em nenhum contrato do projeto | requisito **crítico** | **GAP crítico** | `04_07`, `04_10` §5 |
| Recolher anexo preservando estado (`display: contents/none`) | padrão existia só para o terminal (blindado) | aplicado ao editor | **GAP** (reuso de contrato) | `04_05` §3 |
| Fidelidade de tokens/ícones/aria | citada no `docs/18` só para terminal | vale para Explorer/Editor/Search/Browser | **GAP de cobertura** | `04_01` §5, `04_09` §2 |
| Critérios de aceite da FASE 4 | `docs/07` tinha `VAL-EXP-01/02/03` | 15+ validações novas | **GAP** | `04_13` |

---

## 2. O que foi **adicionado agora** (por esta documentação)

1. **Inventário visual completo do Explorer** com tokens e métricas reais (22 px, ícones codicon, 5 botões do header, 3 seções, estados vazios) — `04_01`.
2. **Menu de contexto canônico** com grupos/ordens/`when` extraídos do código do VS Code (incl. `5b_importexport` com Download e Upload) — `04_03`.
3. **Fluxo completo de transferência de arquivos** entre navegador e máquina local (upload com progresso/cancelamento/sobrescrita; download com save/directory picker e fallback blob) — `04_04`.
4. **Contrato de anexo lateral do editor** com recolhimento não destrutivo (espelho da Regra 10 do `docs/18`) e persistência por sessão — `04_05`.
5. **SearchService com escopo de sessão** (debounce, cancelamento, include/exclude, substituir) — `04_06`.
6. **Arquitetura do browser interno** com runtime Chromium/Playwright no servidor + **10 tools de IA com nomes canônicos idênticos aos do VS Code** (`readPage`, `clickElement`, `runPlaywrightCode`, …) + tool nova de gravação — `04_07`.
7. **Proposta formal de atualização do `docs/04`** (FileSystemPort, ExplorerService, EditorService, SearchService, BrowserSessionService + eventos) — `04_10`.
8. **Mapa de código arquivo:linha** nas duas bases (vscode main e code-server) para implementação sem adivinhação — `04_11`.
9. **13 diagramas de fluxo** (mermaid) cobrindo todos os caminhos do vídeo — `04_12`.
10. **Checklist de aceite em duas camadas** (vídeo + anti-regressão `docs/18` 14 itens) — `04_13`.

---

## 3. Decisões de produto que esta documentação **fixa** (e que antes eram ambíguas)

| # | Decisão | Fundamento |
|---|---|---|
| D1 | O editor vive em **anexo lateral por sessão**, não no grupo central | vídeo 3.2 (desvio consciente do VS Code, permitido pelo ADR-010) |
| D2 | O browser interno é **do servidor** (Chromium + Playwright/CDP), não um iframe | vídeo 3.4 exige acesso a HTML; iframe do `simple-browser` é cross-origin (`simpleBrowserView.ts:169`) |
| D3 | Ações com efeito externo no browser exigem **aprovação humana** | `docs/04` §3 (`requiresApproval`) + Exemplo 4 do `docs/03A` |
| D4 | Ferramenta de **gravação** (`.webm`) entra como requisito novo | vídeo 3.4 (“filmar”) — o VS Code não tem essa tool |
| D5 | Recolher anexo = `display: none`, **nunca** desmontar | Regra 10 do `docs/18` aplicada por analogia |
| D6 | Nomes das tools de browser seguem o **canônico do VS Code** | `browserChatToolReferenceNames.ts` (evidência) |

---

## 4. Decisões Q1–Q6 — RESOLVIDAS em 2026-09-16

As seis dúvidas abertas na primeira versão desta documentação foram decididas. Estas decisões passam a ser **normativas** para a implementação da FASE 4.

| # | Dúvida original | **DECISÃO** | Consequência prática |
|---|---|---|---|
| **Q1** | Anexo convive com o grupo central de editores do legado, ou substitui? | **Anexo vive SÓ em `platform/`.** Não tocar `App.tsx`, `EditorArea.tsx` nem `app.css` do legado (área PROTEGIDA 🟡 do `docs/18`). A migração do legado é débito técnico de sprint futura (Opção B do comitê). | Implementação começa e termina dentro de `platform/apps/workbench/src/{logic,ui}/editor/`; integração visual via bridge, no mesmo padrão do `PlatformTerminalBridge.tsx` (que **não** deve ser editado). |
| **Q2** | Como o browser interno renderiza a página? | **Screencast CDP** (`Page.startScreencast`) a partir do Chromium do servidor. Mesma página para IA e usuário; sem iframe cross-origin. | `platform/services/browser-runtime/` expõe stream de frames + canal de input; a UI só desenha o frame e envia eventos. Iframe same-origin fica descartado. |
| **Q3** | “Novo Arquivo” com um **arquivo** selecionado: cria no pai ou oculta o item? | **Seguir o VS Code: criar no pai** (comportamento `CanCreateContext` + `ExplorerResourceParentReadOnlyContext`). | O item permanece visível em arquivos, mas a criação acontece na pasta-pai; se o pai for read-only, item fica desabilitado. |
| **Q4** | Multi-root / múltiplas raízes por sessão? | **Fora de escopo nesta fase — single-root.** | `ExplorerService.setRoot` permanece com uma raiz por sessão; itens de “Add/Remove Folder to Workspace” do menu **não** entram no menu desta fase. |
| **Q5** | Limites de gravação do browser (`.webm`)? | **5 min por gravação / 200 MB por arquivo; retenção de 7 dias** (configurável). | `BrowserPort.record` aplica o teto e encerra sozinho ao atingir; job de limpeza remove artefatos com mais de 7 dias. |
| **Q6** | Pasta de saída da documentação veio truncada no prompt (`[STRIPPED 75 bytes]`) | **Resolvido:** a documentação vive em `a/agente_window/docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/`. | Os 15 arquivos foram relocados para o caminho canônico + 2 novos (`04_15`, `04_16`) = **17 arquivos**. |

### 4.1 Dúvidas remanescentes (menores, não bloqueantes)

| # | Ponto | Encaminhamento |
|---|---|---|
| Q7 | Nome final dos specs E2E novos | proposta: `sessao_12_explorer.spec.ts`, `sessao_13_editor_anexo.spec.ts`, `sessao_14_search.spec.ts`, `sessao_15_browser_ia.spec.ts` (ver `04_15` §4) |
| Q8 | Origem do HTML no “clone de página”: só DOM renderizado ou também assets? | decisão de produto: **DOM + assets referenciados** (css/js/imagens) para o clone ser abrível offline |
| Q9 | Perfil de Chromium do browser-runtime (headless ou headed virtual) | começar **headless**; trocar apenas se a fidelidade de renderização exigir |

---

## 5. Riscos técnicos herdados (do `docs/12`) aplicáveis à FASE 4

| ID | Risco | Mitigação nesta fase |
|---|---|---|
| RISK-01/02 | dual implementação legado × `platform/` | Explorer e Search nascem **só** em `platform/`; integração via bridge (como o terminal) |
| RISK-03 | OOM de build (Monaco) no ambiente Arena | validar por dev server + typecheck; build só no fechamento |
| — | `node_modules` e `.cache` não persistem no snapshot | documentação e artefatos duráveis fora de `.cache` (esta pasta) |
| — | RAM do ambiente (~1,9 GB) com Vite + code-server | subir Vite apenas quando autorizado e reerguer o VS Code no mesmo turno se preciso |

---

## 6. Próximo passo proposto (após avaliação humana)

1. Aprovar `04_10` (contratos) e `04_13` (aceite).
2. Implementar em ordem: `FileSystemPort` ampliado → `ExplorerService` → árvore + header + contexto → DnD/upload/download → anexo do editor → search → browser/IA.
3. Atualizar `docs/12`/`docs/11` **somente com evidência real** ao final de cada sub-fatia.
4. Rodar o checklist completo (`04_13` §A e §B) antes de declarar a FASE 4 concluída.

---

## Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Como aparece nos gaps |
|---|---|
| **VISUAL** | linhas “Árvore lazy com reveal/seleção”, “Seções Editores Abertos/Timeline/Outline”, “Fidelidade de tokens/ícones/aria”, “Menu de contexto completo”. |
| **COMPORTAMENTO** | linhas “ExplorerService ampliado”, “Operações seguras”, “Integração explorer → editor” (anexo lateral), “Pesquisa dentro da sessão”, “IA com acesso a HTML”. |
| **EVENTO** | linha “Watcher `fs.changed`” e decisões D1–D6 (`editor.attachCollapsed`, `browser.*`, `tool.pending`). |
| **VALIDAÇÃO** | linha “Critérios de aceite da FASE 4” + §4 (Q1–Q6 resolvidas) + §5 (riscos herdados e suas mitigações). |
