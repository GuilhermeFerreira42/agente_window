# 04_09 — REQUISITOS NÃO FUNCIONAIS (RNF)

> Derivados do vídeo (3.5 fidelidade) e das restrições históricas do projeto (`docs/07` RNF-VAL-01…05, `docs/12` RISK-03 build OOM no ambiente).

## 1. Performance

| ID | Requisito | Alvo | Método de verificação |
|---|---|---|---|
| RNF-01 | Input do usuário (hover/scroll/clique na árvore) | resposta visual ≤ **16 ms** | profiler no navegador; medição de frame na interação |
| RNF-02 | Expandir pasta com 1 000 filhos | render ≤ **100 ms** após resposta do `FileSystemPort` | medição com fixture grande |
| RNF-03 | Virtualização da lista | apenas linhas visíveis no DOM (altura 22 px) | contagem de nós DOM ao rolar |
| RNF-04 | Busca em 5 000 arquivos | primeiros resultados ≤ **500 ms**; conclusão ≤ 5 s | benchmark com fixture |
| RNF-05 | Bridge runtime (I/O e PTY já existente) | round-trip ≤ **50 ms** local | timestamps request/response (`docs/07` RNF-VAL-02) |
| RNF-06 | Upload | 20 MB ≤ 10 s em rede local; UI nunca bloqueada | teste com arquivo grande |
| RNF-07 | Download | streaming sem carregar arquivo inteiro na RAM quando > `maxBlobDownloadSize` (10 MB é o limite prático do blob) | inspeção de memória + log de chunks |
| RNF-08 | Browser interno | interação ≤ 300 ms; `getSummary` ≤ 2 s para DOM mediano | medição nas tools |
| RNF-09 | Trocar de sessão | ≤ **150 ms** (abas/anexo restaurados do estado em memória) | medição |

## 2. Fidelidade visual

| ID | Requisito | Critério |
|---|---|---|
| RNF-10 | Tokens em vez de cores | **0** cores hexadecimais de sistema hardcoded nos módulos de Explorer/Editor/Search/Browser |
| RNF-11 | Métricas fixas do shell | `--titlebar-height: 35px`, `--statusbar-height: 22px`, `--activitybar-width: 48px` (contrato `docs/18` §4) |
| RNF-12 | Linha de árvore | 22 px (igual VS Code) |
| RNF-13 | Ícones | codicons equivalentes aos do VS Code (mesma família semântica) |
| RNF-14 | Tooltips/aria | texto idêntico ao do VS Code para ações equivalentes |
| RNF-15 | Estados | hover, foco, ativo, inativo, desabilitado e erro presentes em **todos** os itens interativos |

## 3. Compatibilidade

| ID | Requisito |
|---|---|
| RNF-16 | Alvo primário: **Windows 11 + Chromium** (Chrome/Edge) — mesma prioridade do `docs/02` |
| RNF-17 | **File System Access API**: detectar suporte (`showSaveFilePicker`/`showDirectoryPicker`); sem suporte → fallback blob (download) e input file/DnD (upload) |
| RNF-18 | `DataTransferItem.webkitGetAsEntry()` para pastas em drop externo (Chromium/Firefox; fallback apenas arquivos) |
| RNF-19 | Funcionar servido em `http://localhost` (contexto seguro exigido pela File System Access API) e em produção HTTPS |
| RNF-20 | Sem dependência de APIs exclusivas do Electron |

## 4. Segurança

| ID | Requisito |
|---|---|
| RNF-21 | Path traversal bloqueado em upload/download/rename (`..` nunca aceito) |
| RNF-22 | Escrita atômica obrigatória (`temp + rename`) e **zero escrita parcial** em falha (RNF-VAL-04 histórico) |
| RNF-23 | Browser interno: permissões de câmera/mic/geolocalização **negadas por padrão**; prompts explícitos |
| RNF-24 | Filtro de rede do agente (allow/deny de domínios) aplicado às tools de browser |
| RNF-25 | Tools com efeito externo exigem aprovação humana (`requiresApproval`) |
| RNF-26 | `getHTML` não expõe cookies/segredos da sessão do usuário; apenas DOM renderizado |
| RNF-27 | Logs de tool call auditáveis por sessão (quem pediu, o quê, resultado) |

## 5. Robustez e recuperação

| ID | Requisito |
|---|---|
| RNF-28 | Anexo do editor recolhido **não perde** estado (scroll, cursor, undo, dirty) — contrato `display: contents/none` |
| RNF-29 | Reconexão do browser interno (se o Chromium cair, a sessão avisa e permite reabrir a página no mesmo `pageId` lógico) |
| RNF-30 | Falha de leitura de pasta não derruba a árvore (erro localizado no nó) |
| RNF-31 | Operações longas (upload/download/busca) sempre canceláveis |

## 6. Acessibilidade

| ID | Requisito |
|---|---|
| RNF-32 | Árvore com `role="tree"`/`treeitem`, `aria-expanded`, `aria-level`, `aria-selected` |
| RNF-33 | Navegação completa por teclado (setas, Home/End, Enter, F2 para renomear, Delete) |
| RNF-34 | Menu de contexto acessível (foco preso no menu, `Esc` fecha, setas navegam) |
| RNF-35 | Contrastes conforme tema ativo (nenhum texto abaixo de 4.5:1 nos temas padrão) |

## 7. Observabilidade

| ID | Requisito |
|---|---|
| RNF-36 | Log estruturado por operação de I/O (uri, duração, resultado) — permite diagnosticar “árvore não atualizou” |
| RNF-37 | Contadores: arquivos listados, uploads, downloads, tool calls de browser, erros por sessão |
| RNF-38 | Evento `fs.changed` com origem identificada (watcher/usuário/agente) para depuração |

## 8. Restrições de ambiente (aprendizado operacional do projeto)

- **Build completo não é padrão** (ADR-008): validação = typecheck → testes focados → probe → E2E.
- **RISK-03**: build Vite com Monaco já travou/OOM no ambiente Arena → usar dev server (HMR) para validação visual; build somente em marco de integração.
- **Snapshot da Arena**: `.cache`, `node_modules`, `out`, `dist`, `build` **não persistem**; qualquer artefato durável (docs, zip consolidado) deve viver fora dessas pastas.
- **RAM do ambiente atual**: ~1,9 GB total — subir Vite + code-server juntos exige cuidado; nenhum processo pode derrubar o VS Code.

---

## 9. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Onde está neste documento |
|---|---|
| **VISUAL** | §2 Fidelidade visual (RNF-10…15) — tokens em vez de cores, métricas fixas do shell (35/22/48 px), linha de árvore 22 px, ícones, tooltips/aria, presença obrigatória de todos os estados (hover/foco/ativo/inativo/desabilitado/erro). |
| **COMPORTAMENTO** | §1 Performance (alvos mensuráveis), §3 Compatibilidade, §4 Segurança, §5 Robustez (recolher sem perder estado, reconexão, cancelamento), §6 Acessibilidade, §7 Observabilidade. |
| **EVENTO** | RNFs não emitem eventos próprios; eles **restringem** os eventos dos RF (ex.: `fs.uploadProgress` deve alimentar UI sem bloquear a thread — RNF-06; `browser.*` deve responder em ≤300 ms — RNF-08). |
| **VALIDAÇÃO** | Coluna “Método de verificação” de cada RNF + RNF-VAL-05 (zero hardcode) + `04_13` §A.8 e §B. |

**Regra:** RNF só é considerado atendido com **medição registrada** (número no relatório da fatia), nunca por inspeção subjetiva.
