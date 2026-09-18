# 18 — PROTOCOLO ANTI-REGRESSÃO E CONTRATOS CONGELADOS

> **Documento Normativo Obrigatório**  
> **Status:** Ativo / Vigente  
> **Data de Emissão:** 2026-09-14
> **Última Atualização:** 2026-09-15 — FATIA-03.11 FASE 1+2 (6/6 PTY real passando)  
> **Público-Alvo:** Todas as IAs executoras (Arena, Claude, Gemini, Copilot, Cursor, etc.) e desenvolvedores humanos.

---

## 1. Objetivo e Princípio Fundamental
O objetivo deste documento é **blindar contra regressões** tudo o que já foi conquistado e homologado no projeto, especificamente nas **Fatias 01 (Layout Base), 02 (Barras e Navegação) e 03 (Terminal PTY Real e Painel)**.

### O Princípio da Não-Regressão (Zero-Regression Rule):
> *"Nenhuma implementação de nova funcionalidade (ex: FATIA-04 Explorer, FATIA-05 Search, etc.) tem permissão para alterar, desmontar, reescrever ou quebrar componentes estabilizados sem autorização expressa documentada."*

---

## 2. Mapa de Componentes Estabilizados e Níveis de Proteção

| Componente | Localização do Código | Nível de Proteção | Estado Homologado |
| :--- | :--- | :---: | :--- |
| **Terminal PTY Real** | `legacy/.../VSCodeTerminal.tsx` | 🔴 **BLINDADO** | ~90% fidelidade VS Code, WebSocket PTY real, buffer `pendingOutputRef` + `fitAllInstancesRef` + rAF focus+resize, drag&drop tabs, portas dinâmicas `/api/ports`, IDs `crypto.randomUUID()`, attrs `data-pty-status/pid/shell-path`. |
| **Ponte de Persistência** | `legacy/.../PlatformTerminalBridge.tsx` | 🔴 **BLINDADO** | `display: contents/none` preserva WS PTY ao fechar/reabrir, mounted state, re-fit automático. |
| **Tema Dinâmico do Terminal** | `legacy/.../src/hooks/useTerminalTheme.ts` | 🔴 **BLINDADO** | `MutationObserver` em `documentElement` observa `class, style, data-theme` + `theme-changed` event, `version` counter, tokens `--vscode-terminal-*` dinâmicos, zero hardcoded #181818. |
| **Estilos do Terminal** | `legacy/.../terminal-vscode.css` | 🔴 **BLINDADO** | Vars `--terminal-height`, tabs hover X, sidebar #37373d + #007acc, `terminal-panes is-split`, `terminal-container`, `terminal-shell-button`. |
| **Painel Inferior (Tabs)** | `legacy/.../VSCodeTerminal.tsx` | 🔴 **BLINDADO** | 5 abas reais (Problemas, Saída, Debug, Terminal, Portas), display:none preserve, maximize absolute `.right-section`, botões `+` split trash `Encerrar` `Limpar` `Maximizar terminal` `Fechar terminal`. |
| **Bridge PTY Vite** | `legacy/.../vite-plugin-pty.ts` + `platform/services/pty-server/src/vitePlugin.ts` + `index.ts` | 🔴 **BLINDADO** | Endpoint `/api/ports` dinâmico [5173,5174,8080,3000] com host dinâmico, WS `/pty` singlePort, `PtyManager` com Map e idle 30min. |
| **Platform Terminal** | `platform/apps/workbench/src/ui/terminal/useXterm.ts` | 🟡 **PROTEGIDO** | `buildTheme()` var(--vscode-*), MutationObserver tema, fitAndResize. |
| **Platform Split** | `platform/apps/workbench/src/ui/terminal/TerminalGroup.tsx` | 🟡 **PROTEGIDO** | `closest('.terminal-group-container')` + `getBoundingClientRect()` + clamp 0.2-0.8 + sash 6px role separator. |
| **Platform Panel** | `platform/apps/workbench/src/ui/terminal/TerminalPanel.tsx` | 🟡 **PROTEGIDO** | `display: visible?flex:none` preserve sessão, `position:absolute inset:0 z10` maximize. |
| **Layout Base e Grids** | `legacy/.../styles/app.css`, `App.tsx` | 🟡 **PROTEGIDO** | `.right-section {position:relative; flex:1; display:flex; flex-direction:column; overflow:hidden}` + `workbench-main` flex. |
| **Topbar & Statusbar** | `legacy/.../components/` | 🟡 **PROTEGIDO** | Titlebar 35px, statusbar 22px, activitybar 48px, tokens oficiais. |
| **Testes Anti-Regressão** | `e2e/sessao_11_terminal_pty_real.spec.ts` (6 testes) + `sessao_11d/e/f` | 🔴 **BLINDADO** | Bateria E2E que valida PTY real, PID, split, maximize, erro honesto, preservação. |

---

## 3. Contratos Invioláveis da FATIA-03 (Terminal & Painel Inferior)

Qualquer alteração que toque direta ou indiretamente no terminal deve respeitar estritamente estas 5 regras:

### Regra 1: Altura e Redimensionamento via CSS Variable
- **Causa da lição aprendida:** O `.terminal-panel` em CSS possui `flex: 0 0 var(--terminal-height)`.
- **Contrato:** O redimensionamento por arrasto do splitter superior **DEVE** injetar a variável `--terminal-height` inline no elemento pai:
  ```tsx
  style={{
    ['--terminal-height' as string]: `${panelHeight}px`,
    height: `${panelHeight}px`,
  }}
  ```
- **Proibido:** NUNCA force `height: 100%` ou `height: auto` estático no `.terminal-panel` no CSS global, pois isso quebra o cálculo do drag resize.

### Regra 2: Visibilidade Condicional da Sidebar de Abas
- **Comportamento VS Code Real:** Quando há apenas **1 terminal** ativo, a barra lateral de abas de terminal **NÃO PODE APARECER**.
- **Contrato:**
  ```tsx
  const isTabsListVisible = instances.length > 1;
  // Se false: sidebar com display: none, terminal ocupa 100% da largura.
  // Se true: sidebar visível (140px a 160px), com lista vertical de terminais.
  ```
- **Proibido:** Tornar a sidebar do terminal estática ou fixa para sessão única.

### Regra 3: Preservação de Sessões PTY e Instâncias xterm.js
- **Contrato:** O socket WebSocket de cada terminal (`ws://localhost:.../pty`) e a instância `Terminal` do xterm.js pertencem à sessão ativa e não podem ser recriados desnecessariamente durante re-renders de React.
- **Proibido:** Não execute `new Terminal()` a cada render. Use `useRef` e instancie somente no ciclo de montagem/criação da aba.

### Regra 4: Fidelidade Visual dos Itens da Aba (Tabs)
- **Contrato:**
  - Item ativo: borda esquerda destacada em azul `#007acc` e fundo `#37373d`.
  - Botão de fechar (`x`): visível permanentemente na aba ativa e visível sob `:hover` nas abas inativas.
  - Indicador de divisão (split): uso de caracteres hierárquicos `┌ └ ├`.

### Regra 5: As 5 Abas do Painel
- **Contrato:** O cabeçalho do painel inferior contém 5 abas reais:
  1. Problemas (Problems)
  2. Saída (Output)
  3. Console de Depuração (Debug Console)
  4. Terminal
  5. Portas (Ports)
- Ao alternar entre essas abas, a instância ativa do terminal deve ficar oculta (`display: none`), mas **nunca destruída**, preservando comandos em execução em segundo plano.

### Regra 6: Maximização Confinada ao `.right-section` (`position: absolute`)
- **Causa da lição aprendida:** No VS Code original, maximizar o terminal expande verticalmente até o topo da área central, mas **NUNCA** cobre a Barra de Atividades (esquerda), a Sidebar Primária (esquerda) nem a Barra Auxiliar (direita). Usar `position: fixed` cobria o sistema inteiro.
- **Contrato:**
  ```tsx
  // No elemento <section className="terminal-panel ...">
  position: maximized ? 'absolute' : 'relative',
  inset: maximized ? 0 : undefined,
  zIndex: maximized ? 100 : 10,
  maxHeight: maximized ? 'none' : '85vh',
  minHeight: maximized ? 0 : '130px',
  ```
- **Proibido:** NUNCA use `position: fixed` com `inset: 0` nem `100vw`/`100vh` no terminal maximizado. Ele deve sempre se ancorar no contêiner `.right-section` que possui `position: relative`.

### Regra 7: Prevenção de Tela em Branco e Buffer PTY (`pendingOutputRef` + `fitAllInstancesRef`)
- **Causa da lição aprendida:** Quando múltiplas abas ou splits são criados em sequência rápida, os dados de WebSocket PTY (`opened` / `output`) chegam antes de o xterm.js estar anexado ao DOM (`term.open(el)`), descartando o prompt inicial. Além disso, referências circulares em `useCallback` causavam Temporal Dead Zone (TDZ).
- **Contrato:**
  1. O componente **DEVE** manter `pendingOutputRef.current[instId]` acumulando saída até a montagem no DOM.
  2. O `mountTerminal` **DEVE** fazer flush imediato do buffer acumulado (`term.write(pending)`).
  3. O redimensionamento do xterm em novas abas e splits **DEVE** usar `fitAllInstancesRef.current` disparado em `requestAnimationFrame` para evitar TDZ e garantir geometria válida no DOM.
- **Proibido:** Chamar `term.write` diretamente sem checar se o terminal está montado ou descartar pacotes WS iniciais.

### Regra 8: Arraste de Divisor (Split Sash) via Geometria Absoluta
- **Causa da lição aprendida:** Usar `querySelector` para medir elementos no mousemove falha com splits múltiplos ou grids 2x2.
- **Contrato:**
  - O contêiner de split **DEVE** possuir `ref={splitContainerRef}`.
  - O manipulador `handleSashMouseDown` **DEVE** calcular a nova proporção via `container.getBoundingClientRect()`:
  ```tsx
  const deltaX = moveEvent.clientX - rect.left;
  const newRatio = Math.max(0.15, Math.min(0.85, deltaX / (rect.width || 1)));
  setSplitRatio(newRatio);
  ```
- **Proibido:** Medir posições relativas do mouse sem ancorar no `rect` do container pai ou omitir o clamp de segurança `[0.15, 0.85]`.

### Regra 9: Reatividade Dinâmica de Tema (`useTerminalTheme`)
- **Causa da lição aprendida:** Hardcodar cores de terminal (`#181818`, `#cccccc`) impede que o terminal acompanhe temas claros (ex.: `.theme-light`) ou de alto contraste do VS Code.
- **Contrato:**
  - O terminal **DEVE** consumir `useTerminalTheme()` de `src/hooks/useTerminalTheme.ts`.
  - O hook escuta mutações de classe em `document.documentElement` via `MutationObserver` e lê tokens CSS oficiais (`--vscode-terminal-*`, `--vscode-panel-*`).
  - Todas as instâncias ativas do xterm **DEVEM** receber `term.options.theme = terminalTheme` dinamicamente quando o hook emitir novo tema.
- **Proibido:** Utilizar cores hexadecimais fixas no fundo ou texto do xterm sem fallback dinâmico via CSS vars.

### Regra 10: Preservação de Sessões em Background via `display: contents / none`
- **Causa da lição aprendida:** Se `PlatformTerminalBridge.tsx` desmontar o componente `VSCodeTerminal` (`if (!visible) return null`), o WebSocket PTY é desconectado, subprocessos do SO são interrompidos e todo o histórico do xterm é perdido ao fechar o painel.
- **Contrato:**
  - O `PlatformTerminalBridge.tsx` **DEVE** manter o nó renderizado após a primeira montagem:
  ```tsx
  return (
    <div style={{ display: visible ? 'contents' : 'none' }}>
      <VSCodeTerminal visible={visible} sessionId={sessionId} workspace={workspace} onClose={onClose} />
    </div>
  );
  ```
  - Ao reexibir (`visible` tornando-se `true`), o terminal executa re-fit automático em `requestAnimationFrame`.
- **Proibido:** Desmontar condicionalmente a árvore do terminal ao fechar o painel inferior.

### Regra 11: IDs Únicos sem Colisão via crypto.randomUUID()
- **Causa:** `Math.random()+Date.now()` colide em criação rápida múltipla (BUG-05).
- **Contrato:**
  ```ts
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Math.random().toString(36).slice(2,8)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,5)}`;
  }
  ```
- **Proibido:** Usar apenas `Math.random()` para sessionId/terminalId.

### Regra 12: Portas Dinâmicas via /api/ports (BUG-02)
- **Causa:** lista estática [5173,8080] não mostra 5174 e não abre.
- **Contrato:**
  - Backend `vite-plugin-pty.ts` e `platform/.../vitePlugin.ts` e `index.ts` **DEVEM** expor `GET /api/ports` retornando `[{port, protocol, name, url, status}]` com host dinâmico.
  - Frontend `VSCodeTerminal.tsx` **DEVE** fazer `fetch('/api/ports')` a cada 5s com fallback dinâmico e `window.open` na aba Portas.
  - Aba Portas **DEVE** ter `<a href target="_blank">` + botão Abrir com `ExternalLink`.
- **Proibido:** Hardcodar apenas 2 portas sem fetch.

### Regra 13: Drag & Drop MVP de Abas (BUG-06)
- **Causa:** VS Code permite arrastar tabs para reordenar/split, nosso não tinha draggable.
- **Contrato:**
  - Cada `.terminal-tab-item` **DEVE** ter `draggable=true`, `onDragStart` guarda `terminalId` em `dataTransfer`, `onDragOver` seta `dragOverId`, `onDrop` reordena `groups` via `setGroups` (mesmo grupo reorder, grupos diferentes move).
  - Visual: `cursor:grab`, `opacity 0.5` quando dragged, `background var(--vscode-list-dropBackground)` quando over.
  - Referência: `code-server/lib/vscode/.../terminalTabsList.ts`.
- **Proibido:** Deixar tabs sem draggable ou sem indicador visual de drop.

### Regra 14: Atributos data-pty-* e Classes E2E para Validação (Compatibilidade Testes)
- **Causa:** testes `sessao_11` esperam `data-pty-status`, `data-pty-pid`, `data-pty-shell-path`, `.terminal-container`, `.terminal-panes.is-split`, `.terminal-container-split`, `.terminal-shell-button/menu/option`.
- **Contrato:**
  - `.terminal-panel` **DEVE** ter `data-pty-status={activeInstance.status}` + `data-pty-pid={activeInstance.pid}` + `data-pty-shell-path={profile.path}`.
  - `.terminal-container` **DEVE** ter `className="terminal-container is-active"` + `data-terminal-id` + `data-pty-status/pid/shell-path`.
  - Quando split: container pai `className="terminal-panes is-split"` + segundo pane `terminal-container-split`.
  - Shell picker: botão `terminal-shell-button` com label + chevron, menu `terminal-shell-menu`, opções `terminal-shell-option`.
  - `resolveWsUrl()` **DEVE** checar `window.__AGENTS_WINDOW_PTY_URL__` para simulação falha T5 que espera `data-pty-status="error"` + `[PTY Error]`.
- **Proibido:** Remover essas classes/attrs ou quebrar compat E2E.

---

## 4. Contratos Invioláveis de Layout (FATIA-01 e FATIA-02)

1. **Tokens de Altura:**
   - `--titlebar-height: 35px`
   - `--statusbar-height: 22px`
   - `--activitybar-width: 48px`
2. **Área Central (`workbench-main`):**
   - Deve ocupar todo o espaço restante via `flex: 1 1 auto; overflow: hidden; display: flex`.
   - As barras laterais (Explorer / Sidebar principal) entram à esquerda do Editor.
   - O painel do Terminal entra na parte inferior do Editor.
   - Nenhuma janela ou modal pode utilizar `position: fixed` com coordenadas absolutas que cubram permanentemente a barra de status ou a barra de título.

---

## 5. Checklist Obrigatório de Homologação Anti-Regressão

Antes de commitar ou aprovar qualquer mudança de nova fatia (ex.: FATIA-04 Explorer), a IA ou o desenvolvedor **DEVE** validar os seguintes pontos no navegador real (`http://localhost:5173`):

### 🧪 Bateria de Testes Rápidos (5 minutos) — Atualizado FATIA-03.11:

1. **[ ] Teste de Resize do Terminal (Regra 1):**
   - Arrastar borda superior 4px sash ns-resize para cima/baixo, duplo-clique maximize.
   - Confirmar `--terminal-height` inline muda e `fitAddon.fit()` executa.

2. **[ ] Teste de Maximização Fiel (Regra 6 / BUG-01):**
   - Clicar `Maximizar terminal` (🗖) → deve ter `position:absolute inset:0 z100` ancorado em `.right-section {relative}`, ActivityBar 48px + Sidebar + AuxBar visíveis.
   - Restaurar → volta altura original.

3. **[ ] Teste de Sessão Única (Regra 2 / BUG-07):**
   - 1 terminal → `isTabsListVisible = instances.length>1` false, sidebar display none, terminal 100% largura, toolbar split no header.

4. **[ ] Teste Anti-Tela-Branca (Regra 7 / BUG-02 / BUG-04+09):**
   - Clicar `+` 3x rápido → sidebar com 1:,2:,3:, nenhum branco, `pendingOutputRef` flush + `rAF fit+focus+resize` + focus 20ms/60ms ao trocar aba Problemas→Terminal e fechar/reabrir painel.

5. **[ ] Teste de Split Sash (Regra 8 / BUG-03):**
   - Clicar `Dividir terminal` → `.terminal-panes.is-split` + `.terminal-container-split` visíveis, sash 6px `col-resize` role separator, drag via `getBoundingClientRect()` clamp 0.2-0.8 suave.

6. **[ ] Teste de Tema Dinâmico (Regra 9 / BUG-03):**
   - Console `document.documentElement.classList.toggle('theme-light')` → `useTerminalTheme` observer `class,style,data-theme` + `theme-changed` → `term.options.theme` instantâneo, zero #181818 hardcoded, usa `var(--vscode-panel-background)`.

7. **[ ] Teste de Preservação (Regra 10 / BUG-05):**
   - `echo SESSAO_VIVA`, fechar painel X (`display:contents/none` preserva WS), reabrir → mesmo PID (`data-pty-pid`) e output intacto, T6 passa.

8. **[ ] Teste de I/O Real PTY (Regra 3):**
   - `echo TESTE_ANTI_REGRESSAO` → output instantâneo xterm direto sem React re-render, sem `[VSCodeTerminal] Erro WS` no console, `data-pty-status=open`.

9. **[ ] Teste de Portas Dinâmicas (Regra 12 / BUG-02):**
   - Aba Portas → fetch `/api/ports` a cada 5s, lista [5173,5174,8080,3000] dinâmica com host, botão Abrir `window.open` funciona.

10. **[ ] Teste de IDs Únicos (Regra 11 / BUG-05):**
    - Criar 5 terminais rápido → todos IDs únicos `crypto.randomUUID()`, sem colisão.

11. **[ ] Teste de Drag&Drop (Regra 13 / BUG-06):**
    - Arrastar `.terminal-tab-item` draggable → reorder `groups.terminalIds`, visual `grab` + `dropBackground` + `opacity 0.5`.

12. **[ ] Teste de Botões (Regra 4 / BUG-08):**
    - Header com `+` `Split` `Encerrar terminal` `Limpar terminal` `Maximizar terminal` `Fechar terminal` — todos com aria-label, X visível ativo e hover inativo, prefixo árvore `┌└├`.

13. **[ ] Teste de Layout Global (FATIA-01/02):**
    - Titlebar 35px, statusbar 22px, activitybar 48px, `.right-section {relative flex column overflow:hidden}`, sem `fixed` cobrindo tudo.

14. **[ ] Teste E2E Automático:**
    - `npx playwright test sessao_11_terminal_pty_real` → 6/6 PASSOU (T1 PID output, T2 perfil, T3 split, T4 limpar/max/fechar, T5 erro honesto, T6 preservação).

---

## 6. Instruções Específicas para Prompts de Novas IAs (LMSYS Arena, Claude, Copilot)

Ao delegar a implementação de uma nova fatia para outra IA, **sempre adicione o seguinte trecho de instrução**:

```text
AVISO DE CONTRATO ANTI-REGRESSÃO ATUALIZADO 2026-09-15 (FATIA-03.11):
As fatias 01, 02 e 03 (Layout base, Barras e Terminal PTY com 5 bugs críticos + 10 regressões FASE 1+2 corrigidas, 6/6 PTY real passando) já estão 100% finalizadas e blindadas em docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md (Regras 1-14).
É TERMINANTEMENTE PROIBIDO alterar, reescrever ou simplificar sem autorização documentada:
- `legacy/.../src/components/terminal/VSCodeTerminal.tsx` (55KB, 14 regras, attrs data-pty-*, classes terminal-panes is-split, drag&drop, portas dinâmicas, uuid, rAF focus)
- `legacy/.../src/components/terminal/PlatformTerminalBridge.tsx` (display:contents/none preserva PTY)
- `legacy/.../src/hooks/useTerminalTheme.ts` (MutationObserver class,style,data-theme + theme-changed + version)
- `legacy/.../src/styles/terminal-vscode.css` (vars --terminal-height, terminal-panes, terminal-container, shell-button)
- `legacy/.../vite-plugin-pty.ts` (endpoint /api/ports + WS /pty)
- `platform/services/pty-server/src/vitePlugin.ts` e `index.ts` (/api/ports)
- `platform/apps/workbench/src/ui/terminal/useXterm.ts` (MutationObserver tema)
- `platform/apps/workbench/src/ui/terminal/TerminalGroup.tsx` (closest + sash 6px role separator)
- `platform/apps/workbench/src/ui/terminal/TerminalPanel.tsx` (display visible?flex:none + absolute maximize)
Sua nova implementação (FATIA-04 Explorer) deve se acoplar estritamente aos slots previstos sem quebrar: resize via --terminal-height, maximize absolute .right-section, tema dinâmico var(--vscode-*), sash drag getBoundingClientRect, persistência PTY display contents/none, portas dinâmicas, uuid, drag&drop, data-pty-* attrs. Valide checklist 14 itens no browser antes de commitar.
```

---
*Este documento é parte integrante do sistema de governança do projeto e sua violação invalida a entrega da sprint.*


---

## Atualização de Contrato Canônico: Lista de Abas do Terminal (2026-09-17)
- **Regra Mantida:** `isTabsListVisible = instances.length > 1`.
- **Comportamento Homologado:** O terminal ocupa 100% da largura útil sem aba/gaveta lateral enquanto houver apenas 1 instância. A lista lateral de abas só é exibida quando houver 2 ou mais terminais (`> 1`), tanto na Casa Velha (`legacy/`) quanto na Casa Nova (`platform/apps/workbench-v2/`).
