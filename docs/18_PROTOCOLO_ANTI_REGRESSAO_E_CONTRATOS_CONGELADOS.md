# 18 — PROTOCOLO ANTI-REGRESSÃO E CONTRATOS CONGELADOS

> **Documento Normativo Obrigatório**  
> **Status:** Ativo / Vigente  
> **Data de Emissão:** 2026-09-14  
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
| **Terminal PTY Real** | `legacy/.../VSCodeTerminal.tsx` | 🔴 **BLINDADO** | ~85% fidelidade VS Code, WebSocket PTY real, digitação rápida, buffer anti-tela-branca (`pendingOutputRef`), sash drag via `getBoundingClientRect()`. |
| **Ponte de Persistência** | `legacy/.../PlatformTerminalBridge.tsx` | 🔴 **BLINDADO** | Mantém terminal montado com `display: visible ? 'contents' : 'none'`, preservando conexão WS e processos PTY ativos ao fechar/reabrir. |
| **Tema Dinâmico do Terminal** | `legacy/.../src/hooks/useTerminalTheme.ts` | 🔴 **BLINDADO** | Reage a trocas de tema via `MutationObserver` em `documentElement`, injetando tokens `--vscode-terminal-*` em tempo real. |
| **Estilos do Terminal** | `legacy/.../terminal-vscode.css` | 🔴 **BLINDADO** | Variáveis `--terminal-height`, tabs com hover de fechamento, sidebar estilizada, fontes monospace e cores oficiais do tema dark VS Code. |
| **Painel Inferior (Tabs)** | `legacy/.../VSCodeTerminal.tsx` | 🔴 **BLINDADO** | 5 abas reais (Problemas, Saída, Console de Depuração, Terminal, Portas), alternância preservando instâncias, maximize absoluto no `.right-section`. |
| **Layout Base e Grids** | `legacy/.../App.css`, `App.tsx` | 🟡 **PROTEGIDO** | Contêineres flexíveis (`workbench-main`), dimensionamento dinâmico sem sobreposição. |
| **Topbar & Statusbar** | `legacy/.../components/` | 🟡 **PROTEGIDO** | Altura fixa das barras superior (`35px`) e inferior (`22px`), tokens CSS oficiais. |

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

### 🧪 Bateria de Testes Rápidos (5 minutos):

1. **[ ] Teste de Resize do Terminal:**
   - Arrastar a borda superior do terminal para cima e para baixo.
   - Confirmar que o painel cresce e diminui suavemente e o xterm executa `fitAddon.fit()`.

2. **[ ] Teste de Maximização Fiel (Bug 1 Anti-Regressão):**
   - Clicar no botão Maximizar do terminal (ícone 🗖).
   - Verificar se o terminal expande até o topo da área central, mas **a ActivityBar (esquerda), Sidebar (esquerda) e Barra Auxiliar (direita) continuam 100% visíveis e interativas**.
   - Clicar em Restaurar e verificar o retorno à altura original.

3. **[ ] Teste de Sessão Única do Terminal:**
   - Garantir que existe apenas 1 sessão aberta.
   - Confirmar visualmente que a sidebar lateral de abas do terminal está **totalmente oculta** e o terminal ocupa 100% da largura útil.

4. **[ ] Teste de Múltiplas Sessões e Anti-Tela-Branca (Bug 2 Anti-Regressão):**
   - Clicar no botão `+` (Novo Terminal) 3 vezes seguidas rapidamente.
   - Confirmar que a sidebar de abas surge com `1: powershell`, `2: powershell`, `3: powershell`.
   - Clicar em cada aba e confirmar que **nenhum terminal fica em branco** — todos exibem prompt imediatamente.

5. **[ ] Teste de Split e Arraste do Sash (Bug 3 Anti-Regressão):**
   - Clicar no botão Dividir Terminal (Split ao lado).
   - Arrastar o divisor central (sash 4px) para a esquerda e para a direita.
   - Confirmar que ambas as divisões redimensionam proporcionalmente de forma suave e estável sem quebrar o layout.

6. **[ ] Teste de Tema Dinâmico (Bug 4 Anti-Regressão):**
   - No console do navegador (F12), alternar `document.documentElement.classList.toggle('theme-light')`.
   - Confirmar que o fundo do terminal e cores ANSI atualizam imediatamente sem necessidade de recarregar a página.

7. **[ ] Teste de Preservação de Sessão em Background (Bug 5 Anti-Regressão):**
   - No terminal, digitar um comando com histórico (ex.: `cd ..`, `echo "SESSAO_VIVA"`).
   - Clicar no botão `X` do cabeçalho do painel para fechá-lo.
   - Reabrir o painel (pelo menu ou atalho `Ctrl+\``).
   - Confirmar que a sessão, texto e subprocesso **continuam intactos** exatamente onde estavam, sem reinício do zero.

8. **[ ] Teste de I/O Real do PTY:**
   - No terminal, digitar `dir` ou `echo "TESTE_ANTI_REGRESSAO"`.
   - Pressionar `Enter` e verificar se a saída do sistema operacional aparece no terminal instantaneamente sem atrasos e sem erros no console DevTools (F12).

9. **[ ] Teste de Layout Global:**
   - Verificar se a Statusbar continua no rodapé (`22px`).
   - Verificar se a Titlebar continua no topo (`35px`).
   - Verificar se o novo componente (ex: Explorer) respeita a área de visualização sem empurrar os demais para fora da tela.

---

## 6. Instruções Específicas para Prompts de Novas IAs (LMSYS Arena, Claude, Copilot)

Ao delegar a implementação de uma nova fatia para outra IA, **sempre adicione o seguinte trecho de instrução**:

```text
AVISO DE CONTRATO ANTI-REGRESSÃO:
As fatias 01, 02 e 03 (Layout base, Barras e Terminal PTY com os 5 bugs de fidelidade corrigidos) já estão 100% finalizadas e blindadas em docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md.
É TERMINANTEMENTE PROIBIDO alterar, reescrever ou simplificar os arquivos:
- `legacy/.../src/components/terminal/VSCodeTerminal.tsx`
- `legacy/.../src/components/terminal/PlatformTerminalBridge.tsx`
- `legacy/.../src/hooks/useTerminalTheme.ts`
- `legacy/.../src/styles/terminal-vscode.css`
Sua nova implementação (ex: FATIA-04 Explorer) deve se acoplar estritamente aos slots de componentes previstos na arquitetura sem quebrar o redimensionamento do terminal, o maximize absoluto, o tema dinâmico, o sash drag nem a persistência PTY.
```

---
*Este documento é parte integrante do sistema de governança do projeto e sua violação invalida a entrega da sprint.*
