# 04_00 — ÍNDICE E RESUMO DO VÍDEO (FATIA-04 / FASE 4)

> **Tipo:** documentação reversa (não é implementação).
> **Escopo:** mapear 100% do que o vídeo de 8m35s exige para a FASE 4 do AGENTE WINDOW.
> **Base de análise:** `vscode-main` (clone de `microsoft/vscode`, branch `main`, 18.926 arquivos, 362 MB, em `.cache/vscode`) + `code-server` (fork, 17.768 arquivos) + projeto atual (`agente_window/`, `platform/` + `legacy/`).
> **Data da coleta de evidências:** 2026-09-16.
> **Regra de precedência:** `docs/` textual prevalece sobre referência visual; `docs/18` prevalece sobre tudo em matéria de não-regressão.

---

## 1. Resumo do vídeo (o que o usuário demonstra)

O vídeo mostra um workbench no estilo VS Code (na referência visual, o *Google Antigravity*, fork do VS Code) e define, por demonstração, o que a FASE 4 deve entregar:

1. **Explorer completo na sidebar primária** — header com Novo Arquivo, Nova Pasta, Atualizar, Colapsar Pastas e Mais Opções; árvore lazy; menu de contexto completo (Novo Arquivo, Nova Pasta, Cortar, Copiar, Colar, Renomear, Excluir, **Baixar arquivo**); seções *Editores Abertos*, *Linha do Tempo* e *Estrutura de Código*; drag & drop do sistema operacional para dentro do navegador (upload).
2. **Editor que NÃO ocupa o centro** — o editor vive como **anexo lateral dentro da sessão**, redimensionável por sash, e **recolhe completamente** quando a última aba da sessão é fechada (sem destruir estado).
3. **Pesquisa dentro da sessão do editor** — Search local à sessão, não global.
4. **Botão “+” abre um NAVEGADOR dentro da sessão do editor** — navegador funcional, que renderiza páginas reais.
5. **A IA tem acesso ao conteúdo da página aberta nesse navegador** — deve responder “o que você está vendo?”, analisar HTML, clonar página e interagir (clicar, filmar). No vídeo, uma IA integrada ao Chrome responde: *“Você está vendo uma interface do Visual Studio Code Web aberta no navegador”*.
6. **Fidelidade total ao layout de referência** — botões, ícones, hovers, tooltips, aria-labels, cores 100% por tokens CSS (sem hardcode).

---

## 2. Mapa dos arquivos desta documentação

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | `04_00_INDICE_E_RESUMO_VIDEO.md` | Este índice, resumo do vídeo, método e legenda de evidências |
| 01 | `04_01_INVENTARIO_VISUAL_EXPLORER.md` | Inventário visual completo da sidebar/árvore/header/seções |
| 02 | `04_02_COMPORTAMENTO_EXPLORER.md` | Fluxos de expandir, colapsar, criar, renomear, refresh, seleção |
| 03 | `04_03_MENU_CONTEXTO_EXPLORER.md` | Menu de contexto completo, grupos, ordem e `when` reais |
| 04 | `04_04_DRAG_DROP_DOWNLOAD_FILESYSTEM.md` | DnD interno, upload do OS, download para máquina local |
| 05 | `04_05_EDITOR_ANEXO_LATERAL_LAYOUT.md` | Editor como anexo lateral da sessão + recolher sem destruir |
| 06 | `04_06_SEARCH_SESSAO_EDITOR.md` | Pesquisa dentro da sessão do editor |
| 07 | `04_07_BROWSER_SESSAO_EDITOR_IA_HTML.md` | **Crítico:** browser interno, contrato da IA, acesso a HTML |
| 08 | `04_08_REQUISITOS_FUNCIONAIS_RF.md` | RF-01…RF-24 testáveis |
| 09 | `04_09_REQUISITOS_NAO_FUNCIONAIS_RNF.md` | Performance, fidelidade, compatibilidade, segurança |
| 10 | `04_10_CONTRATOS_TECNICOS_ATUALIZADOS.md` | Proposta de atualização do `docs/04` (contratos) |
| 11 | `04_11_MAPA_CODIGO_VSCODE_CODE_SERVER.md` | Arquivo + linha aproximada de cada comportamento |
| 12 | `04_12_FLUXOS_EVENTOS_MERMAID.md` | Diagramas mermaid de todos os fluxos |
| 13 | `04_13_CRITERIOS_ACEITE_VALIDACAO.md` | Checklist de homologação (vídeo + anti-regressão) |
| 14 | `04_14_GAPS_ENTRE_DOC_ATUAL_E_VIDEO.md` | FATIA-04 antiga vs. vídeo; o que faltava e o que foi adicionado |

---

## 3. Método (como cada requisito está descrito)

Todo requisito desta documentação aparece nos quatro eixos exigidos:

- **VISUAL** — como aparece (forma, ícone, cor por token, ordem, tamanho);
- **COMPORTAMENTO** — o que faz (regra funcional observável);
- **EVENTO** — que evento/comando dispara e o que emite ao final;
- **VALIDAÇÃO** — como testar (unit, integração, E2E, checklist manual).

---

## 4. Legenda de evidências

| Marca | Significado |
|---|---|
| `[E-vscode]` | Evidência lida no clone `microsoft/vscode` main (`.cache/vscode`) — arquivo:linha |
| `[E-code-server]` | Evidência lida no fork `code-server` (dentro do pacote restaurado) |
| `[E-projeto]` | Evidência do estado atual do AGENTE WINDOW (`platform/`, `legacy/`) |
| `[REF-visual]` | Referência visual de apoio (`docs/referencias_visuais/`) |
| `[SPEC]` | Especificação desta documentação (decisão de produto a implementar) |

> ⚠️ **Nada aqui autoriza tocar componentes blindados** (`VSCodeTerminal.tsx`, `PlatformTerminalBridge.tsx`, `useTerminalTheme.ts`, `terminal-vscode.css`, `vite-plugin-pty.ts`, pty-server, terminal em `platform/`) — ver `docs/18`, Regras 1–14.

---

## 5. Restrições de execução (lembrete operacional)

- Esta fase é **documental**: nenhum arquivo do projeto foi alterado.
- O padrão de recolher-sem-destruir já blindado no terminal (`display: contents / none`) é reaproveitado como **referência de contrato** para o anexo do editor (ver `04_05`).
- Fidelidade de layout usa os tokens já homologados (`--titlebar-height: 35px`, `--statusbar-height: 22px`, `--activitybar-width: 48px`).

---

## 6. Ambiguidades reconhecidas já no índice

1. O diretório de saída pedido no prompt chegou **truncado** ao upload (`[STRIPPED 75 bytes]`); esta documentação foi criada em `/home/user/docs_fase_04_mapeamento_video/` (pasta persistente, fora de `.cache`).
2. O vídeo não está no workspace — o mapeamento usa a descrição textual fornecida + engenharia reversa + código real do VS Code.
3. “Filmar” (gravar vídeo da sessão do browser) não existe no VS Code de referência; está tratado como requisito novo em `04_07` §7 e `04_08` RF-21.

---

## 7. Matriz de conformidade dos 4 eixos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

Todo requisito do vídeo é descrito nos quatro eixos. Este mapa diz **onde** cada eixo vive, arquivo por arquivo.

| Arquivo | VISUAL | COMPORTAMENTO | EVENTO | VALIDAÇÃO |
|---|---|---|---|---|
| 04_01 Inventário visual | ✅ §1–§5 (hierarquia, 5 botões, 22 px, tokens) | ✅ §3.1 (ordenação como estado do serviço) | ➖ (herda de 04_02) | ✅ §6 checklist |
| 04_02 Comportamento | ✅ por fluxo (estado visual de cada ação) | ✅ §2–§9 (lazy, create, rename, refresh, seleção, watcher) | ✅ tabela de eventos por fluxo | ✅ VAL-EXP-01…06 |
| 04_03 Menu de contexto | ✅ §6 (tokens do menu, submenu, atalhos) | ✅ §2 matriz de habilitação, §3 condição real do Download | ✅ context keys (§7) | ✅ §8 checklist |
| 04_04 DnD/Upload/Download | ✅ feedback de drop/progresso | ✅ §2 upload recursivo, §3 download picker/blob, §4 DnD interno | ✅ §7 (`fs.upload*`, `fs.download*`, `fs.changed`) | ✅ VAL-EXP-07/09/10 |
| 04_05 Editor anexo lateral | ✅ §1 layout + tokens | ✅ §2 dez regras + §4 layout | ✅ §5 eventos + §6/§7 mermaid | ✅ §8 (unit/integração/E2E) |
| 04_06 Search na sessão | ✅ §2 (widget, toggles, estados) | ✅ §3 (debounce, escopo, limites) | ✅ §4 (`search.*`) | ✅ §7 |
| 04_07 Browser + IA/HTML | ✅ aba Navegador + barra de URL | ✅ §3 contrato, §5 segurança, §6 gravação | ✅ `browser.*` + `tool.pending/result` | ✅ §8 (VAL-BRW-01…05) |
| 04_08 Requisitos funcionais | ✅ coluna VISUAL de cada RF | ✅ coluna COMPORTAMENTO | ✅ coluna EVENTO | ✅ coluna VALIDAÇÃO (RF-01…RF-34) |
| 04_09 Requisitos não funcionais | ✅ RNF-10…15 (fidelidade) | ✅ RNF-01…09, 16…31 (alvos mensuráveis) | ➖ (RNF não emite evento; observado nos eventos dos RF) | ✅ coluna “método de verificação” |
| 04_10 Contratos | ➖ (contrato não é visual; ver 04_01) | ✅ interfaces + regras preservadas | ✅ §6 tabela de eventos | ✅ §7 matriz de compatibilidade |
| 04_11 Mapa de código | ✅ (onde o visual é implementado no VS Code) | ✅ (onde cada comportamento vive) | ✅ (handlers/eventos localizados) | ✅ (specs E2E correspondentes) |
| 04_12 Fluxos mermaid | ✅ estados citados nos diagramas | ✅ 13 fluxos ponta a ponta | ✅ nomes de evento em cada diagrama | ✅ cada diagrama aponta sua validação |
| 04_13 Critérios de aceite | ✅ checklist A1/A2/A5/A8 | ✅ checklists A3/A4/A6/A7 | ➖ (valida efeito dos eventos) | ✅ arquivo inteiro + checklist B (docs/18) |
| 04_14 Gaps | ✅ (o que faltava no visual) | ✅ (o que faltava no comportamento) | ✅ (o que faltava em eventos) | ✅ (o que faltava em validação) |
| 04_15 Plano por sub-fatias | ✅ por sub-fatia | ✅ por sub-fatia | ✅ por sub-fatia | ✅ testes + critérios de pronto |
| 04_16 Kanban | ➖ | ➖ | ➖ | ✅ (rastreio de status por evidência) |

**Regra de conformidade:** nenhum requisito entra em implementação sem aparecer em um RF (`04_08`) com evento associado e validação nomeada.

---

## 8. Atualização 2026-09-18 - Prints do vídeo incorporados

**Vídeo fonte:** `Gravar_2026_09_15_21_09_30_680.mp4` (8m35s) - fornecido pelo usuário como referência canônica.

**O que foi feito:**
- 19 frames extraídos do vídeo nos timestamps chave (00:03 a 08:25)
- 15 prints selecionados e organizados em `docs/referencias_visuais/explorer/`, `editor/`, `workbench/`, `browser/` (futuro)
- `CATALOGO.md` atualizado com entradas 29-43
- `TAXONOMIA.md` atualizada com categorias `browser/` (futuro 4.8) e `fatia04_video/`
- `README.md` atualizado com seleção prioritária FATIA-04
- Documentos `04_01` e `04_05` atualizados com seção de prints do vídeo

**Status para Arena:**
- **FATIA-04 PARCIAL (sem browser):** Prints 29-41 prontos para implementação de RF-01 a RF-24, RF-31 a RF-34
- **FATIA 4.8 FUTURO:** Prints 42-43 (browser + IA acesso HTML) já capturados mas marcados como FUTURO conforme orientação do usuário para deixar para depois

**Próximo passo:** Arena pode iniciar sub-fatias 4.1 a 4.7 usando apenas os prints e documentação textual. Browser (4.8) fica para depois.
