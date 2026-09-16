# 04_13 — CRITÉRIOS DE ACEITE E VALIDAÇÃO (HOMOLOGAÇÃO)

> Duas camadas de aceite, **ambas obrigatórias**:
> **(A)** Aceite do vídeo (FASE 4) — checklist por item demonstrado.
> **(B)** Anti-regressão `docs/18` — 14 itens de homologação (o terminal não pode regredir).

---

## A. Aceite do vídeo (item por item)

### A.1 Explorer — header
- [ ] **A1.1** Botão “Nova Pasta” visível, com tooltip/aria “New Folder...”, cria pasta na pasta selecionada com input inline.
- [ ] **A1.2** Botão “Novo Arquivo” idem (novo arquivo com nome editável).
- [ ] **A1.3** Botão “Atualizar” relê a raiz e **mantém** expansão + seleção (sem “piscar”).
- [ ] **A1.4** Botão “Colapsar Pastas” fecha toda a árvore.
- [ ] **A1.5** Overflow “…” contém as ações restantes e abre com teclado.

### A.2 Explorer — árvore e seções
- [ ] **A2.1** Árvore lazy: expandir só carrega o ramo; colapsar/expandir de novo não relê do disco.
- [ ] **A2.2** Multi-seleção + contexto recalculado (Paste só após Cut/Copy).
- [ ] **A2.3** Auto-reveal ao abrir arquivo por outro caminho (comando/chat/terminal).
- [ ] **A2.4** Seção **Editores Abertos** com estado vazio “Nenhum editor aberto”.
- [ ] **A2.5** Seção **Linha do Tempo** presente e reagindo à seleção.
- [ ] **A2.6** Seção **Estrutura de Código (Outline)** presente e reagindo ao editor ativo.

### A.3 Menu de contexto
- [ ] **A3.1** Em pasta: Novo Arquivo, Nova Pasta, Cortar, Copiar, Colar, Renomear, Excluir, **Baixar**, Copiar Caminho.
- [ ] **A3.2** Em arquivo: Novo Arquivo (no pai), Cortar, Copiar, **Baixar**, Renomear, Excluir, Copiar Caminho.
- [ ] **A3.3** “Baixar” funciona em arquivo (save picker) e, com suporte, em pasta (directory picker) e multi-seleção.
- [ ] **A3.4** Itens proibidos pelo estado (raiz, read-only, sem clipboard) aparecem desabilitados/ausentes.
- [ ] **A3.5** Menu aberto por teclado, navegável, fecha com `Esc`, retorna foco à árvore.

### A.4 Upload / download / DnD
- [ ] **A4.1** Arrastar arquivo do SO para a árvore → grava no destino com progresso.
- [ ] **A4.2** Arrastar **pasta** do SO → estrutura replicada recursivamente.
- [ ] **A4.3** Colisão de nome → diálogo Replace/Skip/Cancel.
- [ ] **A4.4** Cancelar upload no meio → nenhum arquivo parcial (verificar por tamanho/hash).
- [ ] **A4.5** Download de arquivo binário grande → streaming, UI responsiva, conteúdo íntegro (hash).
- [ ] **A4.6** Download de pasta → estrutura relativa preservada.
- [ ] **A4.7** Sem File System Access → fallback blob funciona.
- [ ] **A4.8** DnD interno: mover entre pastas; `Alt` copia; `Esc` cancela.

### A.5 Editor (anexo lateral)
- [ ] **A5.1** Abrir arquivo **não** ocupa o centro: anexo aparece à direita da árvore, dentro da sessão.
- [ ] **A5.2** Sash de 6 px redimensiona com suavidade; largura persiste após reload.
- [ ] **A5.3** Fechar a última aba **recolhe** o anexo (espaço volta para a árvore).
- [ ] **A5.4** Reabrir arquivo após recolhimento → conteúdo/scroll/cursor intactos (sem estado perdido).
- [ ] **A5.5** Abas são **por sessão** (trocar sessão não destrói as abas da outra).
- [ ] **A5.6** Salvar (`Ctrl+S`) grava atomicamente e limpa o dirty.
- [ ] **A5.7** Nenhuma `position: fixed` cobrindo sidebars/statusbar (checagem por CSS computado).

### A.6 Search na sessão
- [ ] **A6.1** Widget de busca dentro do anexo (aba Search), não na sidebar.
- [ ] **A6.2** Debounce + cancelamento (resultados da busca anterior não “vazam”).
- [ ] **A6.3** Include/exclude funcionam; `node_modules` ignorado por padrão.
- [ ] **A6.4** Clique em resultado abre no anexo na linha correta.
- [ ] **A6.5** Estado vazio correto para termo inexistente.
- [ ] **A6.6** Substituir tudo grava atomicamente e reporta a contagem.

### A.7 Browser interno + IA
- [ ] **A7.1** “+” abre aba **Navegador** que renderiza página real (ex.: servidor local de teste).
- [ ] **A7.2** Pergunta “o que você está vendo?” → resposta cita **conteúdo real** da página (não genérica).
- [ ] **A7.3** “Clone a página” → HTML + ativos gravados no workspace via `FileSystemPort`.
- [ ] **A7.4** “Clique/digite/arraste no elemento X” → efeito real, **com aprovação humana** antes.
- [ ] **A7.5** “Grave N segundos desta página” → `.webm` criado e reproduzível.
- [ ] **A7.6** Duas sessões → páginas isoladas (storage independente).
- [ ] **A7.7** Filtro de rede do agente respeitado (domínio bloqueado → erro tratado, não crash).

### A.8 Fidelidade
- [ ] **A8.1** Header, ícones, tooltips e aria-labels iguais aos da referência.
- [ ] **A8.2** Zero cor hardcoded de sistema nos módulos novos (grep de `#rrggbb`/`rgb(` = 0 em CSS de sistema).
- [ ] **A8.3** Métricas do shell mantidas (titlebar 35 px, statusbar 22 px, activitybar 48 px).
- [ ] **A8.4** Troca de tema (claro/escuro) reflete em Explorer/Editor/Search/Browser **sem reload**.

---

## B. Anti-regressão `docs/18` (14 itens — repetir integralmente antes do aceite)

1. [ ] Resize do terminal via `--terminal-height` inline (drag + duplo clique).
2. [ ] Maximizar terminal: `position: absolute` ancorado em `.right-section` com sidebars visíveis.
3. [ ] Sessão única: sidebar de abas do terminal **oculta**; com 2+ visível.
4. [ ] `+` 3× rápido → nenhum branco; buffer + rAF fit/focus.
5. [ ] Split sash 6 px, drag suave com clamp 0.2–0.8.
6. [ ] Tema dinâmico do terminal atualiza via `useTerminalTheme` (zero `#181818`).
7. [ ] Preservação PTY: fechar painel e reabrir mantém PID e output (`display: contents/none`).
8. [ ] I/O real PTY: `echo TESTE` responde instantâneo, sem erro no console.
9. [ ] Aba Portas dinâmica via `/api/ports` (5 s).
10. [ ] IDs únicos `crypto.randomUUID()` em criação rápida.
11. [ ] Drag & drop de abas do terminal reordena com feedback visual.
12. [ ] Botões do header do terminal com aria-label corretos.
13. [ ] Layout global: `.right-section {position:relative}`, nenhum `fixed` cobrindo shell.
14. [ ] `npx playwright test sessao_11_terminal_pty_real` → **6/6**.

> ⚠️ Se qualquer item de B falhar, o aceite de A é **rejeitado** (violação do `docs/18` §6).

---

## C. Estratégia de execução dos testes (conforme ADR-008)

| Ordem | Camada | Escopo FASE 4 | Ferramenta |
|---|---|---|---|
| 1 | Typecheck | contratos + `platform/` | `npm run typecheck:contracts` + `npx tsc --noEmit` |
| 2 | Unit | `ExplorerService`, `EditorService` (attach), `SearchService`, `FileSystemPort` (upload/download com fs fake) | `vitest` |
| 3 | Integração | I/O atômico (`VAL-FS-01/02`), upload/download com fixtures, watcher (`VAL-EXP-03`) | `vitest` + fixtures |
| 4 | Probe | bridge de browser (Playwright/Chromium sobe, página responde, `getHTML` retorna conteúdo) | script probe |
| 5 | E2E | `VAL-EXP-01…15`, `VAL-BRW-01…05`, `VAL-INT-01` | Playwright (harness existente em `legacy/.../e2e/`) |
| 6 | Manual | checklist A (navegador real) + checklist B (14 itens) | humano/agente |

**Build completo**: apenas no fechamento da fatia (marco de integração), pelo `RISK-03` (OOM com Monaco no ambiente Arena).

---

## D. Evidência de aceite exigida no fechamento

1. lista de arquivos alterados (com caminho real);
2. saída de `tsc` (0 erros) e dos testes focados (contagem);
3. captura/descrição do E2E executado (quais specs, quantos passaram);
4. checklist A e B respondidos item a item, com “não testado” explícito onde for o caso;
5. pendências e riscos remanescentes (nunca declarar concluído sem evidência).

---

## E. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Onde está neste documento |
|---|---|
| **VISUAL** | §A.1 (header com 5 botões), §A.2 (árvore/seções), §A.5 (anexo lateral, sash, recolhimento), §A.8 (fidelidade, tokens, métricas) — critérios verificáveis por inspeção e por CSS computado. |
| **COMPORTAMENTO** | §A.3 (menu e habilitação por contexto), §A.4 (upload/download/DnD com casos de borda), §A.6 (search), §A.7 (browser/IA) — critérios por ação observável. |
| **EVENTO** | Cada item de A tem efeito de evento correspondente nos docs `04_02`, `04_04`, `04_05`, `04_06`, `04_07`; o aceite verifica o **efeito observável**, não a existência do evento no console. |
| **VALIDAÇÃO** | O arquivo inteiro é o protocolo; §C define a ordem (typecheck → unit → integração → probe → E2E → manual) e §D define a evidência exigida no fechamento. |

**Regra de ouro do aceite:** se um item de §A passar mas qualquer item de §B (anti-regressão `docs/18`) falhar, o aceite é **rejeitado**.
