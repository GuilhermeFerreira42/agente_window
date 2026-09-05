# RELATÓRIO — FASE 06: A RÉGUA DE TESTES QUE CONSEGUE FALHAR
**Data:** 2026-09-05 · **Projeto:** Réplica da Agents Window (VS Code) · **Escopo autorizado:** consertar a esteira de testes ANTES de qualquer feature nova

---

## 1. O problema em uma frase

A suíte dizia "48/48 passando" enquanto o vídeo do usuário mostrava bugs.
Isso não era azar: **10 dos 48 testes E2E não tinham um único `expect`**. Eram
`console.log` + screenshot. Um teste sem asserção passa sempre — inclusive com a
tela em branco.

| Métrica da suíte E2E | Antes | Depois |
|---|---|---|
| Testes | 48 | **49** |
| `expect` no total | 34 | **160** |
| Testes sem nenhum assert | 10 | **0** |
| Verificações de geometria (`boundingBox`) | 2 | 14 |
| Specs apontando para porta morta (5175) | 6 | 0 (`webServer` sobe o Vite sozinho) |
| `console.log` usado como "prova" | 27 | 0 |

---

## 2. Os 6 bugs REAIS que a nova régua encontrou (todos corrigidos)

Nenhum deles era detectável pela suíte antiga.

### 2.1 Monaco sem workers — 98 erros de runtime no console
`src/main.tsx` carregava o Monaco localmente mas nunca definia
`MonacoEnvironment.getWorker`. Resultado: a cada montagem do editor/diff,
`Cannot read properties of undefined (reading 'toUrl')`. Alternar o editor 10x
gerava **98 erros**. Corrigido registrando os 5 workers empacotados pelo Vite.

### 2.2 DiffEditor destruía os modelos fora de ordem
Ocultar o editor com um diff aberto lançava
`TextModel got disposed before DiffEditorWidget model got reset`.
Corrigido com `keepCurrentOriginalModel` / `keepCurrentModifiedModel`.

### 2.3 `onToggleFolder` não existe
`App.tsx` chamava `onToggleFolder(entry.path)` ao abrir uma **pasta real** da
árvore do disco. O identificador não existe no escopo — quebraria em runtime.
Corrigido para `toggleFolder`.

### 2.4 O gate de tipos era um no-op (o mais grave)
`npm run typecheck` rodava `tsc --noEmit`, e o `tsconfig.json` da raiz tem
`"files": []` com apenas `references`. **Ele não checava nenhum arquivo** e
retornava 0 erros sempre — foi por isso que o bug 2.3 sobreviveu.
Agora `npm run typecheck` roda `tsc -b --force`, que checa o projeto inteiro.

### 2.5 A linha de sessão não tinha nome acessível
A linha usa `role="button"` sem `aria-label`, então o nome acessível dela virava
a soma do texto dos filhos — incluindo o botão "Expandir chats". Consequência
dupla: leitor de tela anuncia uma sopa de palavras, e qualquer consulta por
papel/nome casa a linha no lugar do botão (o clique "funcionava" e não fazia
nada). Corrigido com `aria-label="Sessão {título}"` + `data-session-id`.

### 2.6 Alvo de toque do dock mobile com 34px
`MOBILE.md` exige 44px mínimos. O dock single-pane entregava 34px.
Corrigido em `app.css` (`min-height: 44px`).

---

## 3. O que cada spec passou a provar

| Spec | Provas reais (exemplos) |
|---|---|
| `sessao_01_sessions_core` | ids únicos por linha; nova sessão cria **exatamente uma**; sessão ativa sobrevive ao F5; arrastar o sash muda a largura E grava o mesmo número no `localStorage` (±4px) |
| `sessao_02_sessions_list` | **antes: 0 asserts.** Agora: contador da seção bate com as linhas renderizadas; expandir chats muda o DOM; filtro não some com a sessão ativa (R-015); menu de contexto com as 5 ações; capping de 3 workspaces |
| `sessao_03_layout` | sidebar colapsa para 0px e o estado persiste; tab bar sobrevive ao editor oculto; 10 toggles sem **nenhum** erro de console; formato do estado persistido |
| `sessao_04_layout_controller` | memória de layout **por sessão** (abre aux na s1, fecha na s2, volta na s1) e o mapa `workbench.sessions.layouts.v1` idêntico após F5 |
| `sessao_05_single_pane` | encolher a janela sem toque nunca vira single-pane; browser esconde o detail de forma transiente e devolve; nenhuma coluna residual de 1–6px |
| `sessao_06_mobile` | phone **com toque** entra em single-pane, **sem toque** não entra; alvos de 44px medidos |
| `sessao_07_browser_editor` | **antes: 0 asserts.** Agora: browser pertence à sessão ativa; viewport 375/768 muda a largura medida do frame; Voltar restaura o endereço anterior |
| `sessao_08_filesystem` | o seletor é `BUTTON` (não span decorativo) e o clique **chama `showDirectoryPicker` de verdade** (API instrumentada) |
| `sessao_09_bugs_criticos` | F2 renomeia de fato; Delete remove uma linha; setas movem o foco; fixar move a sessão para a seção Fixadas |
| `validacao3_sessao03_...` | os 3 cenários do pacote anti-trapaça **+ o cenário [00:33] com aba Browser ativa**: a aux escondida transientemente pelo browser não pode virar preferência persistida |

---

## 4. A trava para isso não afrouxar de novo

`src/__tests__/e2eAssertionContract.test.ts` roda junto com `npm run test` e
**reprova o build** se alguma spec E2E:
1. tiver um bloco `test(` sem nenhum `expect(`;
2. não declarar teste nenhum;
3. hardcodar `localhost:porta` (a URL base vem só de `e2e/helpers.ts`);
4. usar `console.log` no lugar de asserção.

---

## 5. Estado dos gates (executados nesta sessão, não copiados)

| Gate | Comando | Resultado |
|---|---|---|
| Tipos (real) | `npm run typecheck` → `tsc -b --force` | **0 erros** |
| Lint | `npm run lint` | **0 erros**, 2 warnings (`exhaustive-deps` intencionais) |
| Unitários | `npm run test` | **353/353** em 42 arquivos (~78s) |
| E2E | `npx playwright test` | **49/49** (~4,6 min), 51 screenshots em `test-results/` |
| Build | `npm run build` | ⚠️ **não executável neste sandbox**: `vite build` é morto por OOM (2 GB de RAM; o bundle do Monaco estoura a heap do V8). O gate de tipos equivalente passa. |

---

## 6. O que continua em aberto (honestamente)

1. **`08_CUSTOM_VIEW_GRID`** — único gap 100% aberto da Validação 3:
   `.custom-view-grid` existe só em `app.css:4908`; nenhum TSX consome. Hoje
   Customizations abre como aba (`App.tsx:808`), não como superfície full.
2. **Terminal real (módulo 07)** — adiado por decisão sua; o xterm digita
   (`onData`), mas a execução é um shell simulado. Um terminal de verdade exige
   backend PTY.
3. **Topologia da sessão 05** — o split por sessão é persistido, mas ainda usa
   `PanelGroup defaultSize` em vez do `flex: 1` que o pacote de validação pede.
4. **`npm run build`** — precisa rodar numa máquina com mais memória.

---

## 7. Commit sugerido

```
[FASE_06] Régua de testes confiável — 49 E2E com asserções reais + 6 bugs de produção corrigidos

- e2e: 10 specs reescritas (34 -> 160 expects, 0 testes sem assert)
- e2e: webServer no playwright.config, fim da porta 5175 hardcoded
- test: e2eAssertionContract trava specs sem expect
- fix(monaco): MonacoEnvironment.getWorker (98 erros de runtime)
- fix(monaco): keepCurrent*Model no DiffEditor
- fix(app): onToggleFolder inexistente ao abrir pasta real
- fix(build): npm run typecheck era no-op (tsc --noEmit com files: [])
- fix(a11y): aria-label e data-session-id na linha de sessão
- fix(mobile): alvo de toque de 44px no dock single-pane
- chore: lint zerado (12 erros)
```
