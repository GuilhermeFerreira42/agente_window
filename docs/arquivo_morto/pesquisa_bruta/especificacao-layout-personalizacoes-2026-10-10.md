# Especificação Construtível — Layout Personalizações

**Data:** 2026-10-10  
**Fontes medidas:** DOM preservado em `personalizacoes/vscode_agents_mockup_interativo (1).html`; CSS e código do `microsoft/vscode main` no commit `cc3fec8846d0e678357e476fa611774da26d7e24`; comparação com `workbench-v2/src/components/CustomizationsView.tsx`, `domain/aiCustomizations.ts`, `aiCustomizationsData.ts` e `styles/app.css`.  
**Regra:** o HTML é a régua visual recebida. O `main` complementa comportamento e estados mais novos; diferenças são identificadas. Nenhuma cor literal desta captura deve ser copiada: usar somente tokens `--vscode-*`.

## 1. Visão geral do layout

### 1.1 Diagrama do editor dedicado

```text
Modal/editor dedicado: 1053,6 × 586,4 px na captura
┌──────────────────────────────────────────────────────────────────────┐
│ tab/header do editor modal: 42 px                                   │
├──────────────────── 200 px ┬──────────────────── 851,6 px ──────────┤
│ navegação                   │ conteúdo                                │
│ Visão geral                 │ overview/cards                          │
│ Agentes                     │ ou lista da seção                       │
│ Habilidades                 │ ou detail/editor embutido               │
│ Instruções                  │ ou tools tree                           │
│ Hooks / MCP / Plugins       │                                         │
│ Ferramentas                 │ conteúdo central limitado a 840 px      │
│ Migrate Prompts/User Data   │                                         │
└─────────────────────────────┴─────────────────────────────────────────┘
Área útil medida: 1051,6 × 544,4 px
```

**Régua comprovada no DOM:**
- modal `.modal-editor-resizable`: **1053,6 × 586,4 px**, posição `left:131,7`, `top:90,8` na captura;
- editor/content: **1051,6 × 544,4 px**;
- diferença vertical: **42 px**, correspondente ao cabeçalho/tab do modal;
- `.management-sidebar`: **200 px** na captura, não 274 px;
- área restante antes de paddings: **851,6 px**;
- conteúdo principal/listas/detalhes: `width:min(..., 840px)`;
- modal responsivo: `max-width:calc(100vw - 60px)` e `max-height:calc(100vh - 60px)`.

### 1.2 Encaixe no chassi do Agente Window

O editor de Personalizações abre no **centro/editor**, como aba/restaurável, sem alterar as medidas sagradas externas:

```text
[lista de sessões 300][centro flexível: editor Personalizações][Side Bar 274][Activity Bar 48]
```

A navegação interna de Personalizações é **200 px**, medida do conteúdo; não reutiliza a Side Bar externa de 274 px. Em largura insuficiente, o centro deve preservar o mínimo funcional, reduzir o painel de conteúdo e usar layout estreito previsto no original; não deslocar Side Bar/Activity Bar.

### 1.3 Estrutura funcional

- raiz: coluna, `height:100%`, `overflow:hidden`;
- corpo: split horizontal interno `[sidebar 200][content flex]`;
- fundo das duas áreas: `--vscode-editor-background`;
- conteúdo possui padding direito/baixo de 16 px no DOM da captura; no `main`, painéis internos usam borda `--vscode-agentsPanel-border`, fundo `--vscode-agentsPanel-background` e radius 6 px;
- listas e detalhes centralizados com máximo **840 px** e inset horizontal de **40 px por lado** quando houver espaço.

## 2. Navegação lateral

### 2.1 Conteúdo e ordem

Ordem da captura:
1. Visão geral;
2. Agentes;
3. Habilidades;
4. Instruções;
5. Hooks/Ganchos;
6. Servidores MCP;
7. Plugins;
8. Ferramentas;
9. atalhos separados: Migrate Prompts e Migrate User Data.

**Prompt Files:** no DOM recebido, não há item “Prompts” como seção principal; há migração de Prompt Files. O código `main` possui tipo/seção de Prompt. Para o nosso produto, incluir `Prompts` entre Instruções e Hooks somente quando a Fatia 10 entregar Prompt Files reais. Não mostrar seção vazia baseada apenas em fixture.

### 2.2 Medidas

| Elemento | Medida comprovada |
|---|---:|
| largura da nav interna | **200 px** |
| padding da sidebar | `0 12px 4px 4px` |
| gap header | 4 px |
| item home | padding `5px 8px`, gap 10 px, line-height 18 px, radius 4 px |
| item de seção | padding `4px 8px`, gap 10 px, radius 4 px |
| altura resultante mínima do item | **26 px** (`18 + 4 + 4`) |
| ícone/chevron | 16 × 16 px; chevron compacto 12 px |
| count | mínimo 14 px, line-height 16 px; fonte 11 px |
| separador de migração | 1 px; margem `0 8px 6px` |
| header “Personalizações” da view lateral da captura | padding `6px 10px`; chevron 22 × 22 px |

### 2.3 Tokens e estados

- normal: `--vscode-foreground`, ícone `--vscode-icon-foreground`;
- hover: `--vscode-list-hoverBackground`;
- selected: `--vscode-list-inactiveSelectionBackground` + `--vscode-list-inactiveSelectionForeground` no home, e seleção ativa da lista por `--vscode-list-activeSelectionBackground/Foreground`;
- foco: outline **1 px** `--vscode-focusBorder`, offset **-1 px**;
- contagem: `--vscode-descriptionForeground`; em high contrast pode usar `--vscode-badge-background/foreground`;
- warning de migração: `--vscode-list-warningForeground` com fallback semântico para `--vscode-editorWarning-foreground` e `--vscode-descriptionForeground`.

**Correção importante:** a captura/CSS original **não comprova borda externa de 2 px igual à D25 da Activity Bar**. O selecionado usa background e outline interno de 1 px. Não implementar a borda de 2 px sem decisão explícita.

### 2.4 Contagem

- contar itens projetados e visíveis para o harness ativo;
- contagem da seção = número de linhas de item, sem contar headers de origem;
- total = soma das linhas das seções visíveis;
- filtros e enablement não podem duplicar itens;
- no DOM: Habilidades 14, Instruções 1, MCP 1 e Ferramentas 11 na navegação capturada.

### 2.5 ARIA e interação

- nav: `role="navigation"` ou lista com nome “Seções de personalizações”;
- itens: botão real; selecionado com `aria-current="page"`;
- contagem deve ficar no nome acessível, por exemplo “Habilidades, 14 itens”;
- Enter/Space abre; Up/Down muda o foco; Home/End primeiro/último; Esc volta do detalhe para a lista;
- migrações ficam depois de separador semântico, não misturadas às oito seções.

## 3. Overview com cards

### 3.1 Conteúdo

Cabeçalho/introdução observado:
- “Agent Customizations for Copilot [Agent Host]”;
- texto: personalizar como agentes trabalham, com customizações de workspace ou usuário;
- bloco “Personalizar o seu agente”, que recebe preferências e convenções para rascunhar agentes, skills e instruções.

Cards/seções:
- Agentes — `New...`;
- Habilidades — `New...`;
- Instruções — `New...`;
- Hooks — `New...`;
- Servidores MCP — `Browse...`;
- Plugins — `Browse...`;
- Ferramentas — `Browse...`.

Prompt Files entra como seção apenas quando funcional; na captura, aparece como migração.

### 3.2 Layout construtível

O CSS do `main` define overview compacto por flex-wrap:

```css
.ai-customization-overview { display:flex; flex-direction:column; height:100%; padding:8px; }
.overview-sections { display:flex; flex-wrap:wrap; gap:8px; }
.overview-section {
  display:flex; align-items:center; gap:8px;
  padding:10px 12px;
  flex:1 1 120px; min-width:100px;
  border:1px solid var(--vscode-widget-border);
  border-radius:6px;
}
```

- usar flex-wrap, não grid rígido;
- card cresce a partir de 120 px e nunca abaixo de 100 px;
- ícone 16 × 16 px;
- label 12 px semibold, uma linha com ellipsis;
- count: mínimo 14 px, padding `1px 5px`, radius 8 px, fonte 9 px;
- hover muda background para `--vscode-list-hoverBackground` e borda para `--vscode-focusBorder`;
- foco: outline 1 px, offset -1 px;
- nenhum shadow foi comprovado; **não adicionar sombra**.

Para o overview rico da captura, cada card deve conservar título, descrição e ação. A ação é botão VS Code padrão, com `--vscode-button-*`; New cria no escopo escolhido e Browse abre catálogo/Marketplace. Enquanto backend não existir, mostrar disabled honesto e tooltip, nunca simular sucesso.

## 4. Página de lista por seção

### 4.1 Estrutura comum às 8 seções

```text
[título da seção]
[descrição]
[link Saiba mais]
[busca flex][ação New/Browse]
[grupo Local/User/Extension/Plugin/Built-in]
  [item]
  [item]
[empty state quando zero]
```

- conteúdo limitado a **840 px**, centralizado;
- título: `--vscode-fontSize-heading2` = 18 px, semibold;
- descrição: 13 px, line-height 1,45, margem inferior 8 px;
- linha título: gap 6 px, margem inferior 6 px;
- busca/ação: padding-top 8 px, margem inferior 16 px, gap 8 px;
- botão voltar de seção/detalhe: 26 × 26 px, ícone 14 px, radius 4 px;
- empty state: flex coluna central, padding **48px 24px**, gap 8 px; título 16 px semibold; subtexto 13 px, máximo 250 px; ação com margin-top 16 px.

### 4.2 Agrupamento por origem

Origens finais: Workspace/Local, User, Extension, Plugin e Built-in. Não usar nomes inconsistentes no mesmo contexto.

Header de grupo:
- flex, gap 8 px, padding `4px 8px`, radius 4 px;
- label semibold, cor `--vscode-sideBarSectionHeader-foreground`;
- count mínimo 16 × 16 px, padding horizontal 4 px, radius circular;
- chevron 16 × 16 px à direita;
- hover `--vscode-list-hoverBackground`;
- `aria-expanded` e `aria-controls` obrigatórios.

### 4.3 Linha de item

- base: flex alinhado ao centro;
- padding original geral `6px 12px 6px 16px`; na lista gerenciada, padding inline reduzido para `4px 8px` pelo container;
- mínimo geral 32 px; conteúdo pode resultar em aproximadamente 40 px quando nome + descrição estão visíveis;
- nome 13 px semibold, line-height 18 px;
- descrição 11 px, line-height 14 px, ellipsis;
- icon/badge de origem 16 × 16 px;
- ícone de tipo opcional 24 × 24 px;
- ações 24 × 24 px, inicialmente opacity 0 e visíveis em hover, focus-within ou linha focada;
- disabled: opacity **0,5**; sem riscado obrigatório no original;
- highlight do filtro: `--vscode-list-highlightForeground` + peso semibold/bold;
- toggle individual apenas quando o backend disser que o item pode ser desabilitado; não limitar artificialmente a built-in.

### 4.4 Por seção

| Seção | Empty state | Grupos/dados | Ações |
|---|---|---|---|
| Agents | “Ainda não há agentes” + “Crie seu primeiro agente...” | workspace/user/extension/plugin/built-in | New Agent (Workspace/User), abrir/reveal, enable se suportado |
| Skills | “Ainda não há habilidades” | pasta/`SKILL.md`, origem e descrição | New Skill, Run, abrir fonte, enable |
| Instructions | “Ainda não há instruções” | `AGENTS.md`, `.instructions.md` e formatos aprovados | New Instructions, abrir/editar/override |
| Prompts | “Nenhum prompt file” | `.prompt.md` por origem | New, Run, Migrate to Skill |
| Hooks | “Ainda não há ganchos” | evento/configuração/origem | Configure/New, enable, abrir fonte |
| MCP | “No MCP servers configured” | servidor, origem, estado e compatibilidade | Browse/Add, start/stop, detail, auth/logs |
| Tools | “Nenhuma ferramenta selecionada/disponível” | grupos e tools | browse, toggle grupo/individual, reveal schema |
| Plugins | “No plugins configured” | instalado/Marketplace/origem/estado | Browse, instalar da origem, enable, update/repair/uninstall |

## 5. Detail pane / editor

### 5.1 Navegação e layout

Ao clicar em item:
- conteúdo da seção é substituído por detalhe no mesmo editor, sem terceira coluna obrigatória;
- botão voltar no header: 26 × 26 px; no detalhe MCP do `main`, 28 × 28 px;
- `Esc` equivale a voltar e devolve foco à linha de origem;
- detail ocupa altura total, com overflow interno;
- painel: fundo `--vscode-agentsPanel-background`, borda 1 px `--vscode-agentsPanel-border`, radius 6 px;
- conteúdo central: `width:min(calc(100% - 80px), 840px)`, padding vertical `40px 0 16px`, gap 20 px;
- header detail: flex, margin-bottom 4 px;
- ícone 32 × 32 px; glyph 28 px;
- nome 18 px, line-height 22 px, semibold;
- scope: 12 px/label1, `--vscode-descriptionForeground`, gap 4 px;
- descrição: 13 px, line-height 1,4, `padding-inline-start:32px`; plugin/conector não usa esse recuo;
- actions: flex wrap, gap 6 px, alinhadas à direita; em narrow layout caem para segunda linha.

### 5.2 Modos e ações

- **Preview:** frontmatter em pares chave/valor + corpo renderizado;
- **View Raw:** abre arquivo somente leitura quando origem não é editável;
- **Edit Source:** abre fonte real;
- **Save override:** para built-in/extension/plugin, pedir Workspace, User ou Cancel; nunca sobrescrever fonte original;
- indicar salvamento/erro sem perder edição;
- preview deve ter `role="region"` e `aria-label="Visualização de personalização"`;
- ações perigosas (uninstall) usam tokens de erro/secondary, mas continuam com confirmação.

## 6. Tools — árvore por grupo

### 6.1 Grupos observados

- Copilot;
- VS Code;
- Navegador Integrado;
- Extensões.

Cada grupo mostra label, descrição, contador `habilitadas/total`, chevron e toggle quando configurável. Tool desabilitada não é anunciada ao modelo.

### 6.2 Medidas

- container de busca: gap 8 px; margem vertical `8px 0 16px`;
- árvore: flex 1, overflow hidden, máximo 840 px;
- inventory list: borda 1 px, radius 6 px, divisores internos de 1 px;
- group/set row: gap 8 px; padding `8px 12px 8px 0`;
- tool row: gap 8 px; padding `6px 12px 6px 44px` (`40 + 4`);
- profundidade conectada adicional: 24 px por nível;
- chevron: 16 × 16 px;
- toggle/checkbox medido no DOM: 18 × 18 px;
- ação “more”: 24 × 24 px;
- nome: 13 px semibold, line-height 18 px;
- descrição: 11 px, line-height 14 px;
- contador possui largura reservada de 40 px no `main`; no DOM capturado aparece à direita.

### 6.3 ARIA

- raiz `role="tree"`, nome “Ferramentas disponíveis”;
- grupo `role="treeitem"`, `aria-level="1"`, `aria-expanded`, `aria-checked` quando alternável;
- tool `role="treeitem"`, `aria-level="2"`, `aria-checked`;
- checkbox interno com `role="checkbox"`, `aria-checked` e label “Habilitar <nome>”;
- Right abre grupo, Left fecha/volta ao pai, Up/Down navega, Space alterna, Enter abre detalhe, `*` expande irmãos quando implementado.

## 7. Header e filtros

### 7.1 Editor dedicado original

O título “Agent Customizations for Copilot [Agent Host]” aparece como título do conteúdo/editor dedicado. A captura usa modal editor com header/tab externo de 42 px; navegação de detalhe usa botão back interno, não breadcrumb obrigatório.

### 7.2 O que temos hoje

`CustomizationsView.tsx` possui:
- título “AI Customizations” quando não embedded;
- totalCount;
- select Harness;
- busca “Filtrar personalizações”;
- árvore de seções/origens;
- collapse, reveal, run skill e toggle mockável.

Medidas atuais nossas:
- header padding `12px 14px`, gap 12 px;
- total 18 px alto, radius 9 px;
- select 24 px alto;
- filtro 26 px alto, margem `10px 14px 6px`, padding `0 8px`;
- árvore padding `4px 6px 12px`.

### 7.3 Diferença para o original

Faltam no nosso:
- split interno com nav 200 px;
- overview rico/cards;
- páginas independentes por seção;
- New/Browse e links de ajuda;
- empty states ricos;
- list virtualization e groups no padrão original;
- detail/preview/raw/edit/override;
- tools tree completa;
- Marketplace/MCP/plugin details;
- loading/checking/repairing/uninstalling/error;
- back navigation e restauração de seleção/scroll;
- backend real: nosso header controla fixtures e estado local.

O select Harness deve migrar para a sidebar, com botão/dropdown de altura mínima **26 px**, padding `2px 6px`, gap 6 px e tokens `--vscode-dropdown-*`.

## 8. Estados visuais completos

| Estado | Visual | Token | Medida/regra |
|---|---|---|---|
| normal | texto e fundo do editor | `--vscode-foreground`, `--vscode-editor-background` | sem cor literal |
| hover | fundo da linha/card | `--vscode-list-hoverBackground` | transição 0,1 s onde comprovada |
| selected active | fundo/foreground de seleção | `--vscode-list-activeSelectionBackground/Foreground` | sem borda externa inventada |
| selected inactive | fundo/foreground inativo | `--vscode-list-inactiveSelectionBackground/Foreground` | outline de contraste 1 px quando necessário |
| focus-visible | outline interno | `--vscode-focusBorder` | 1 px; offset -1 px |
| disabled | linha esmaecida | `--vscode-disabledForeground` quando texto; item opacity 0,5 | ainda focável só se houver ação explicativa |
| empty | título + subtexto central | `--vscode-foreground`, `--vscode-descriptionForeground` | padding 48×24, gap 8 |
| filtered | trecho realçado | `--vscode-list-highlightForeground` | semibold/bold |
| loading/checking | spinner/progress e texto | `--vscode-progressBar-background`, `--vscode-descriptionForeground` | bloquear ação conflitante |
| repairing | estado em andamento + cancel se suportado | `--vscode-progressBar-background` | não fingir instalado |
| uninstalling | ação desabilitada e progresso | `--vscode-disabledForeground` | impedir clique duplo |
| warning | mensagem/compatibilidade | `--vscode-list-warningForeground`, `--vscode-chat-mcpCompatibilityWarningForeground` | card sem cor literal |
| error | mensagem e ação retry | `--vscode-errorForeground`, `--vscode-inputValidation-error*` | manter item e diagnóstico |
| success/connected | status sem depender só de cor | `--vscode-testing-iconPassed` ou `--vscode-charts-green` | ícone + texto |
| high contrast | borda explícita | `--vscode-contrastBorder`, `--vscode-contrastActiveBorder` | stroke 1 px |

## 9. Tokens `--vscode-*` usados

Inventário único encontrado no CSS de AI Customizations do `main` (105 tokens); implementar sem fallbacks RGB/hex:

**Fundação e texto:**
`--vscode-foreground`, `--vscode-descriptionForeground`, `--vscode-disabledForeground`, `--vscode-icon-foreground`, `--vscode-editor-background`, `--vscode-editorWidget-background`, `--vscode-editorWidget-border`, `--vscode-widget-border`, `--vscode-sideBar-background`, `--vscode-sideBarSectionHeader-foreground`, `--vscode-agentsPanel-background`, `--vscode-agentsPanel-border`.

**Listas, foco e contraste:**
`--vscode-list-activeSelectionBackground`, `--vscode-list-activeSelectionForeground`, `--vscode-list-inactiveSelectionBackground`, `--vscode-list-inactiveSelectionForeground`, `--vscode-list-hoverBackground`, `--vscode-list-highlightForeground`, `--vscode-list-warningForeground`, `--vscode-focusBorder`, `--vscode-contrastBorder`, `--vscode-contrastActiveBorder`.

**Inputs/dropdowns:**
`--vscode-input-background`, `--vscode-input-border`, `--vscode-input-foreground`, `--vscode-input-placeholderForeground`, `--vscode-dropdown-background`, `--vscode-dropdown-border`, `--vscode-dropdown-foreground`, `--vscode-agentsChatInput-focusBorder`.

**Botões, toolbar e badge:**
`--vscode-button-background`, `--vscode-button-border`, `--vscode-button-foreground`, `--vscode-button-hoverBackground`, `--vscode-button-secondaryBackground`, `--vscode-button-secondaryBorder`, `--vscode-button-secondaryForeground`, `--vscode-button-secondaryHoverBackground`, `--vscode-toolbar-hoverBackground`, `--vscode-toolbar-activeBackground`, `--vscode-badge-background`, `--vscode-badge-foreground`.

**Links, markdown e validação:**
`--vscode-textLink-foreground`, `--vscode-textLink-activeForeground`, `--vscode-textBlockQuote-background`, `--vscode-textBlockQuote-border`, `--vscode-textCodeBlock-background`, `--vscode-textPreformat-foreground`, `--vscode-errorForeground`, `--vscode-editorWarning-foreground`, `--vscode-inputValidation-errorBackground`, `--vscode-inputValidation-errorBorder`, `--vscode-inputValidation-warningBackground`, `--vscode-inputValidation-warningBorder`, `--vscode-inputValidation-warningForeground`, `--vscode-chat-mcpCompatibilityWarningForeground`.

**Status/progresso/scroll:**
`--vscode-progressBar-background`, `--vscode-charts-green`, `--vscode-testing-iconPassed`, `--vscode-terminal-ansiGreen`, `--vscode-scrollbar-background`, `--vscode-scrollbarSlider-background`, `--vscode-scrollbarSlider-hoverBackground`, `--vscode-scrollbarSlider-activeBackground`.

**Tipografia:**
`--vscode-fontSize-body1`, `--vscode-fontSize-body2`, `--vscode-fontSize-heading1`, `--vscode-fontSize-heading2`, `--vscode-fontSize-heading3`, `--vscode-fontSize-label1`, `--vscode-fontSize-label2`, `--vscode-fontSize-label3`, `--vscode-fontWeight-regular`, `--vscode-fontWeight-semiBold`, `--vscode-agents-fontSize-body1`, `--vscode-agents-fontSize-body2`, `--vscode-agents-fontSize-heading2`, `--vscode-agents-fontSize-heading3`, `--vscode-agents-fontSize-label1`, `--vscode-agents-fontSize-label2`, `--vscode-agents-fontSize-label3`, `--vscode-agents-fontWeight-regular`, `--vscode-agents-fontWeight-semiBold`, `--vscode-codiconFontSize`, `--vscode-codiconFontSize-compact`.

**Geometria:**
`--vscode-strokeThickness`, `--vscode-cornerRadius-circle`, `--vscode-cornerRadius-xSmall`, `--vscode-cornerRadius-small`, `--vscode-cornerRadius-medium`, `--vscode-cornerRadius-large`, `--vscode-spacing-sizeNone`, `--vscode-spacing-size20`, `--vscode-spacing-size40`, `--vscode-spacing-size60`, `--vscode-spacing-size80`, `--vscode-spacing-size100`, `--vscode-spacing-size120`, `--vscode-spacing-size160`, `--vscode-spacing-size200`, `--vscode-spacing-size240`, `--vscode-spacing-size280`, `--vscode-spacing-size320`, `--vscode-spacing-size360`, `--vscode-spacing-size400`.

## 10. Medidas em px — régua

### 10.1 Valores dos tokens medidos no HTML

| Token | px | Token | px |
|---|---:|---|---:|
| spacing None/20/40/60 | 0/2/4/6 | spacing 80/100/120 | 8/10/12 |
| spacing 160/200/240 | 16/20/24 | spacing 280/320/360/400 | 28/32/36/40 |
| radius xSmall/small | 2/4 | radius medium/large | 6/8 |
| strokeThickness | 1 | body1/body2 | 13/11 |
| heading2 | 18 | label1/2/3 | 12/11/10 |
| codicon normal/compact | 16/12 | — | — |

### 10.2 Elementos

| Elemento | Largura | Altura | Padding | Gap | Radius |
|---|---:|---:|---|---:|---:|
| modal capturado | 1053,6 | 586,4 | — | — | controlado pelo modal |
| área útil | 1051,6 | 544,4 | — | — | — |
| nav interna | 200 | 100% | `0 12 4 4` | — | — |
| item nav | 100% | 26 mín. | `4 8` | 10 | 4 |
| harness dropdown | 100% | 26 mín. | `2 6` | 6 | 4 |
| overview | flex | 100% | 8 | 8 | — |
| card overview | `flex 1 1 120`, min 100 | conteúdo | `10 12` | 8 | 6 |
| conteúdo central | max 840 | flex | inset 40 por lado | — | — |
| back button | 26 (MCP 28) | 26 (MCP 28) | 0 | — | 4 |
| empty state | flex | flex | `48 24` | 8 | — |
| item geral | 100% | 32 mín. | `6 12 6 16` | 10 | 4 |
| ícone origem | 16 | 16 | 0 | — | — |
| ícone tipo | 24 | 24 | 0 | — | 4 |
| action item | 24 | 24 | 0 | — | 4 |
| detail panel | flex | 100% | `40 0 16` | 20 | 6 |
| detail icon | 32 | 32 | 0 | — | — |
| tools group | 100% | conteúdo | `8 12 8 0` | 8 | 4 |
| tools child | 100% | conteúdo | `6 12 6 44` | 8 | 4 |
| checkbox tool DOM | 18 | 18 | — | — | tema Monaco |

Valores decimais vêm da captura e devem escalar com o centro. Valores estruturais inteiros vêm do CSS medido/fonte do mesmo componente.

## 11. Acessibilidade

### 11.1 Roles e atributos

- editor: região nomeada “Agent Customizations for <harness>”;
- nav: `navigation`; item ativo `aria-current="page"`;
- lista virtualizada: `list`/`listitem` ou `tree`/`treeitem`, sem misturar padrões na mesma superfície;
- grupos colapsáveis: `aria-expanded`, `aria-controls`, label + count;
- tool tree: `tree`, `treeitem`, `aria-level`, `aria-expanded`, `aria-checked`;
- toggle: button com `aria-pressed` ou checkbox com `aria-checked`, nunca ambos no mesmo controle;
- detail preview: `region` com nome;
- loading: `aria-busy="true"`; mensagem assíncrona em live region polite;
- erro: associar diagnóstico por `aria-describedby`;
- ícones decorativos: `aria-hidden="true"`.

### 11.2 Teclado e foco

- Tab visita controles, não cada wrapper;
- Up/Down navega lista/árvore;
- Left/Right fecha/abre grupos;
- Home/End primeiro/último;
- Enter abre item/aciona botão primário;
- Space alterna checkbox/toggle;
- Esc fecha menu ou volta do detalhe;
- ao abrir detalhe, foco vai ao heading/back; ao voltar, retorna ao item de origem;
- ao trocar de seção, foco vai ao heading ou primeira ação, e scroll da seção anterior é preservado;
- outline nunca removido sem alternativa `:focus-visible`.

## 12. Comparação: hoje vs necessário

| Capacidade | Nosso hoje | Para equivalência |
|---|---|---|
| header/total/harness/filtro | existe | mover harness para nav e integrar backend |
| seções/origens/count | existe em árvore única | nav + página por seção; count por linhas reais |
| collapse | existe | preservar na lista/tree real |
| reveal | callback | detail real com back/focus restore |
| run skill | callback/mock | runtime real + progresso/erro/permissão |
| enablement | estado local/mock | persistência + não anunciar ao modelo |
| overview/cards | não existe | construir conforme §3 |
| empty states ricos | parcial | construir conforme §4 |
| New/Browse/Marketplace | não existe | backend Fatia 10 |
| detail/preview/edit/override | não existe | construir conforme §5 |
| tools tree | não existe | construir conforme §6 |
| estados remotos | não existe | loading/checking/repairing/uninstalling/error |
| a11y de árvore | parcial | roving tabindex, teclas, restore focus |
| virtualização | não existe | necessária para tools/plugins/listas grandes |

## 13. Sugestão de implementação

### 13.1 Ordem

1. extrair shell visual reutilizável `[nav 200][content]`;
2. adaptar modelo atual para count por linhas e seleção de seção;
3. criar overview/cards responsivo;
4. criar página/lista comum e empty states;
5. conectar backend real da Fatia 10, removendo fixtures de produção;
6. criar detail/preview/raw/edit/override;
7. criar tools tree virtualizada e enablement real;
8. adicionar Marketplace/MCP/plugin states;
9. fechar teclado, ARIA, foco, restore scroll e high contrast;
10. validar visualmente no chassi 1400 px sem alterar `[Side Bar 274][AB 48]`.

### 13.2 Fatias

- **Fatia 10:** estrutura funcional, modelos reais, listas, ações New/Browse, CRUD, detail/editor, migrations e enablement.
- **Fatia 09:** MCP/tools/hooks runtime e estados reais.
- **Fatia 12:** fidelidade visual final, tokens, responsive/narrow, virtualização, acessibilidade, restore selection/scroll e homologação.

Não deixar tudo para a 12: sem funções reais, seria apenas uma reprodução visual enganosa.

## 14. Evidências e ressalvas finais

- A régua da captura prova nav interna de **200 px**, e não 274 px.
- A captura prova 1053,6 × 586,4 no viewport capturado; o editor é responsivo e não deve travar nessa largura.
- A captura não prova borda externa de 2 px no item selecionado.
- O original recebido chama a seção “Hooks” em alguns pontos e “Ganchos” em outros; padronizar PT-BR na UI, preservando nomes técnicos em arquivos.
- O DOM recebido não possui Prompt Files como seção principal; o `main` possui suporte mais novo. A seção só entra quando a função existir.
- Zero hex/RGB deve entrar no nosso CSS; até fallbacks do upstream devem ser substituídos por tokens existentes no tema do projeto.
