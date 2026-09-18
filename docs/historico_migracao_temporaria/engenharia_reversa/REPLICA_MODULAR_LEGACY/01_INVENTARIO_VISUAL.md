# 01 — INVENTÁRIO VISUAL — LEGACY `02_replica_final`

**Fase:** 0 — Inventário Visual  
**Status:** concluída em 2026-09-16  
**Referência única:** `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/src/`  
**Regra:** o legacy é somente leitura; nenhum arquivo do legacy foi alterado.

## 1. Escopo e evidências coletadas

O inventário foi levantado a partir de:

- `src/App.tsx` — shell, estados, handlers e composição visual;
- `src/styles/app.css` — layout, dimensões, estados e responsividade;
- `src/styles/theme.css` — tokens base e temas;
- `src/components/` — componentes visuais;
- `src/components/terminal/` — terminal e painel;
- `src/domain/` — modelos e controladores de comportamento;
- `src/__tests__/` — contratos comportamentais existentes.

Dimensão da referência:

| Item | Evidência |
|---|---:|
| `App.tsx` | 1.930 linhas / 95.153 bytes |
| `styles/app.css` | 4.739 linhas / 106.249 bytes |
| Componentes em `src/components/` | 21 arquivos |
| Módulos em `src/domain/` | 29 arquivos |
| Testes em `src/__tests__/` | 53 arquivos |

## 2. Tokens de layout medidos

Os tokens canônicos estão em `src/styles/theme.css`:

| Token | Valor | Uso |
|---|---:|---|
| `--titlebar-height` | `35px` | faixa superior / title bar |
| `--sidebar-width` | `300px` | sessions sidebar desktop |
| `--auxiliary-width` | `340px` | barra auxiliar desktop |
| `--terminal-height` | `300px` | altura inicial do painel terminal |
| `--statusbar-height` | não declarado como token próprio | status visual fica dentro do shell existente |
| `--activitybar-width` | não declarado como token próprio | não há componente separado; a navegação é composta no shell |

Tokens de suporte relevantes:

- espaçamentos VS Code: `--vscode-spacing-size20` até `--vscode-spacing-size400`;
- raios: `2px`, `4px`, `6px`, `8px`, `12px` e círculo `50%`;
- toda a paleta visual usa `--vscode-*`;
- tema claro é ativado por `.theme-light` no `html`;
- animações respeitam `prefers-reduced-motion: reduce`.

**Nota de fidelidade:** os valores `35px`, `22px` e `48px` aparecem nos contratos DOC-02 como dimensões normativas do layout. Na árvore efetiva desta referência, `35px` aparece como `--titlebar-height`; `22px` e `48px` devem ser tratados como contratos de componentes/áreas a confirmar durante a implementação modular, não como tokens CSS raiz encontrados em `theme.css`.

## 3. Topologia do layout

A composição principal observada em `App.tsx` é:

```text
app-frame
└── titlebar
└── workbench-body
    ├── sessions-sidebar
    ├── sidebar-resize-handle
    └── main-region
        └── right-section (position: relative)
            └── top-right-section
                └── main-surface
                    ├── mobile-dock-tabs (single-pane)
                    ├── sessions/custom view
                    ├── chat-region / ChatPanel
                    ├── editor-pane / EditorArea
                    └── auxiliary-bar
            └── terminal-panel (quando aberto)
└── toast (quando existente)
```

Regras CSS estruturais:

- `.app-frame`: `height: 100%`, flex column;
- `.workbench-body`: flex row, ocupa o espaço restante e tem `overflow: hidden`;
- `.sessions-sidebar`: largura controlada por `--sidebar-width`, mínimo `230px`, máximo `410px`;
- `.main-region`: flexível, `min-width: 0`, `overflow: hidden`;
- `.right-section`: `position: relative`, flex column, `overflow: hidden`;
- `.top-right-section`: flex row, área superior flexível;
- `.main-surface`: flexível, borda/radius tokenizados;
- `.auxiliary-bar`: largura controlada por `--auxiliary-width`, mínimo `220px`, máximo `390px` na definição principal;
- `.sessions-sidebar.is-hidden` e `.auxiliary-bar.is-hidden`: largura zero, opacity zero, sem interação;
- modo `.single-pane`: oculta sidebar/auxiliary e habilita dock mobile.

Há definições posteriores no mesmo `app.css` que ajustam a topologia de produção (`.sidebar`, `.sessions-part`, `.editor-part`). A ordem final do CSS deve ser preservada ao portar, pois essas regras posteriores sobrescrevem parte das definições iniciais.

## 4. Componentes visuais

### Shell e superfícies

- `App.tsx`: composição principal, estado de layout, sessões, tabs, browser, diff e atalhos;
- `Titlebar.tsx`: title bar, command center, navegação e ações;
- `SessionSidebar.tsx`: sessões, filtro, agrupamento, seleção, reorder e resize;
- `ChatPanel.tsx`: transcript, mensagens, aprovação, composer e ações;
- `ChatInput.tsx`: entrada, anexos, modo/modelo, contexto e envio;
- `SessionLanding.tsx`: estado inicial de nova sessão;
- `EditorArea.tsx`: tabs, editor, browser e diff;
- `AuxiliaryBar.tsx`: changes/files/checks e conteúdo auxiliar;
- `CustomizationsView.tsx`: superfície de customizações;
- `ContextMenu.tsx`: menu contextual;
- `SessionsPicker.tsx`: picker de sessões;
- `MobileDiffView.tsx`: diff em overlay mobile.

### Terminal

- `TerminalPanel.tsx`: wrapper do painel terminal;
- `terminal/VSCodeTerminal.tsx`: implementação principal PTY/xterm, **68.803 bytes**;
- `terminal/PlatformTerminalBridge.tsx`: ponte de persistência, **908 bytes**;
- `terminal/PanelTabs.tsx`: abas Problems, Output, Debug, Terminal e Ports;
- `terminal/TerminalGroup.tsx`: agrupamento de instâncias;
- `terminal/TerminalInstanceTabs.tsx`: tabs de instâncias;
- `terminal/SplitSash.tsx`: divisão/redimensionamento;
- `terminal/TerminalActionBar.tsx`: ações;
- `terminal/TerminalView.tsx`: view;
- `terminal/ShellPicker.tsx`: seleção de shell.

## 5. Estados e comportamentos obrigatórios

### Sidebar

- largura inicial: `300px`;
- resize pelo `.sidebar-resize-handle` com `cursor: col-resize`;
- largura pode ser redefinida;
- recolhimento usa transição de largura/flex-basis/opacity;
- seleção, filtro, agrupamento, arquivamento e reorder de sessões;
- drag and drop de sessões.

### Área de sessões/editor

- sessões visíveis podem ser selecionadas, fechadas e abertas lado a lado;
- modo multi-sessão usa `.sessions-part-grid` e folhas flexíveis;
- editor possui tabs arrastáveis, fechamento e menu de nova tab;
- tabs gerenciadas de Changes/Files podem permanecer visíveis em detail-only;
- chat pode ocupar a área inteira ou ser centralizado em banda máxima de `950px`;
- painel auxiliar pode ser aberto/fechado e redimensionado;
- browser, search, diff e customizations são superfícies do editor/auxiliary.

### Terminal

- altura inicial: `300px`, via `--terminal-height`;
- resize deve calcular a geometria de `.right-section` e atualizar `--terminal-height`;
- faixa single-pane: altura `min(60vh, 420px)`;
- maximize: `position: absolute; inset: 0; z-index: 20` no `.right-section`, sem cobrir a ActivityBar/navegação;
- single terminal e multi-terminal possuem variações de tabs/sidebar;
- tabs do painel: Problems, Output, Debug, Terminal, Ports;
- PTY deve permanecer conectado quando o painel é ocultado, usando `display: contents/none` na ponte;
- saída inicial deve ser acumulada em `pendingOutputRef` até o xterm montar;
- `fitAllInstancesRef` e `requestAnimationFrame` devem ser preservados;
- tema do terminal reage a mudanças no `documentElement` via `MutationObserver`;
- endpoints/atributos exigidos: `/api/ports`, `data-pty-status`, `data-pty-pid`, `data-pty-shell-path`;
- classes de contrato: `.terminal-container`, `.terminal-panes.is-split`, `.terminal-container-split`.

### Tema e acessibilidade

- tema claro/escuro por tokens CSS;
- `color-scheme` e tokens VS Code são a fonte de cor;
- foco usa `:focus-visible` com `--vscode-focusBorder`;
- reduced motion desliga shimmer, spinner, pulso e transições;
- aria-labels, roles de tablist/status/group e navegação por teclado fazem parte da referência.

## 6. Mapa de responsabilidades do `App.tsx`

O shell contém, entre outros, os seguintes estados/fluxos observados:

- sessão ativa e sessões visíveis;
- sidebar e auxiliary visibility;
- largura da sidebar;
- tabs do editor;
- estado do terminal/painel;
- browser views e histórico;
- diff files e resolução;
- custom view;
- navegação mobile;
- toast;
- seleção, reorder, criação, fechamento e atualização de sessões;
- handlers de resize, split, maximize, drag/drop e atalhos.

A composição final usa classes como:

- `app-frame agent-sessions-workbench`;
- `single-pane`;
- `workbench-body`;
- `main-region`;
- `right-section`;
- `top-right-section`;
- `main-surface`;
- `desktop-surface-group`;
- `side-pane-*`;
- `terminal-panel`.

## 7. Inventário de testes de referência

Existem 53 arquivos de teste em `src/__tests__/`, cobrindo:

- shell e layout;
- acessibilidade e labels;
- sessões e session picker;
- editor tabs;
- painel e grupos de terminal;
- PTY/xterm/theme;
- resize/split/persistência;
- drag and drop;
- browser/diff/custom view;
- mobile navigation/diff/pulldown;
- animações, performance e tokens.

Eles são referência comportamental para a migração e não devem ser descartados sem equivalência na nova fundação.

## 8. Resultado da Fase 0

O inventário visual agora registra:

- medidas canônicas encontradas no código;
- divergências entre tokens efetivamente declarados e contratos documentados;
- topologia real do shell;
- componentes e módulos relevantes;
- comportamentos que precisam ser preservados;
- pontos de atenção para a modularização.

**Próximo passo autorizado:** Fase 1 — criar o esqueleto `platform/apps/workbench-v2/`, somente após validação humana deste inventário. Nenhum código da Fase 1 foi iniciado nesta etapa.
