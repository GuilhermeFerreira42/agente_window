# Proposta de atualização de `docs/06` e `docs/05` — Layout

**Data:** 2026-10-10  
**Base:** `especificacao-layout-personalizacoes-2026-10-10.md`.  
**Estado:** proposta para revisão; **não aplicada** aos nove documentos canônicos.

## 1. `docs/06 - PROXIMAS FASES E DIVIDAS.md`

### Onde inserir

Após `§2.1 Referência bruta de Personalizações`, inserir nova seção:

### Texto exato para colar

```markdown
### 2.2 Especificação de Layout de Personalizações (proposta 2026-10-10)
- Especificação construtível: `docs/arquivo_morto/pesquisa_bruta/especificacao-layout-personalizacoes-2026-10-10.md`.
- A superfície abre como editor dedicado no centro, sem alterar o chassi sagrado `[lista de sessões 300][centro flex][Side Bar 274][Activity Bar 48]`.
- Dentro do editor, o layout medido é `[nav interna 200][conteúdo flex]`. A captura registrou modal de 1053,6 × 586,4 px, área útil de 1051,6 × 544,4 px e conteúdo central limitado a 840 px. Essas dimensões de viewport são referência de homologação, não largura fixa.
- A nav contém Visão geral, Agentes, Habilidades, Instruções, Hooks, MCP, Plugins e Ferramentas; Prompt Files entra como seção somente quando a função real da Fatia 10 existir. Migrações ficam em bloco separado.
- Overview usa flex-wrap, gap 8 px; card com `flex:1 1 120px`, mínimo 100 px, padding 10 × 12 px e radius 6 px. Não há sombra comprovada.
- Linhas usam grupos por origem, nome + descrição, ações reveladas por hover/focus, estado disabled com opacity 0,5 e empty state com padding 48 × 24 px.
- Detail substitui a lista no mesmo conteúdo: máximo 840 px, inset horizontal 40 px, back 26 px (28 px em MCP), ícone 32 px, preview/raw/edit/override e restauração de foco.
- Tools usam árvore por grupo; group row `8 12 8 0`, tool row `6 12 6 44`, checkbox 18 px, chevron 16 px e contador habilitadas/total. Tool desabilitada não é anunciada ao modelo.
- Estados obrigatórios: empty, disabled, hover, selected, focus-visible, filtered, loading/checking, repairing, uninstalling, warning, error e connected; nenhum estado depende somente de cor.
- Zero cor hardcoded: usar o inventário de 105 tokens `--vscode-*` da especificação. Geometria base medida: stroke 1; radius 2/4/6/8; spacing 0/2/4/6/8/10/12/16/20/24/28/32/36/40 px.
- Acessibilidade obrigatória: navigation/list/tree coerentes, `aria-current`, `aria-expanded`, `aria-controls`, `aria-checked` ou `aria-pressed`, roving tabindex, setas/Home/End/Enter/Space/Esc, foco restaurado e live region para estados assíncronos.
- Fatia 10 entrega estrutura e funções reais; Fatia 09 fornece estados/runtime; Fatia 12 fecha fidelidade visual, responsive/narrow layout, tokens, virtualização, teclado/ARIA, restore selection/scroll e homologação.
```

### Ajuste exato na linha da Fatia 12

Substituir a descrição atual da Fatia 12 por:

```markdown
| **12** | Polish Visual & Ruflo | Fidelidade final do editor de Personalizações: shell `[nav interna 200][conteúdo]`, overview/cards, listas/detail/tools tree, narrow layout, tokens `--vscode-*`, teclado/ARIA, virtualização, restore de seleção/scroll e estados visuais; layout global, sash, medidas, Ruflo, Alt+Z, menu de aba, Command Menu + Theme, hardening, D2.72 e release gate. A Fatia 12 não substitui backend funcional das Fatias 09/10. |
```

## 2. `docs/05 - DECISOES.md`

### Onde inserir

Depois das decisões propostas D39–D47, inserir uma subseção “Decisões propostas — Layout de Personalizações”. Todas devem permanecer **PROPOSTAS — não fechadas** até aprovação.

### Texto exato para colar

```markdown
## 10. Decisões propostas — Layout de Personalizações (2026-10-10)

> **Todas as D48–D55 estão PROPOSTAS, não fechadas.** A régua e os tokens estão em `docs/arquivo_morto/pesquisa_bruta/especificacao-layout-personalizacoes-2026-10-10.md`.

| # | Decisão proposta | Proposta para deliberação | Estado |
|---|---|---|---|
| D48 | Largura da navegação interna | Travar a nav interna do editor de Personalizações em **200 px**, valor medido no DOM recebido. Não confundir com a Side Bar externa de 274 px, que permanece intocável. Em narrow layout, aplicar adaptação aprovada sem alterar o chassi. | **PROPOSTA — não fechada** |
| D49 | Tokens e zero cor literal | Usar somente o inventário de tokens `--vscode-*` da especificação; proibir hex/RGB e fallbacks literais no CSS novo. Geometria usa spacing/radius/stroke medidos e tokens do tema. | **PROPOSTA — não fechada** |
| D50 | Regra de contagem | `count` de seção e `totalCount` são o número de linhas projetadas/visíveis para o harness ativo; headers de grupo não contam; filtro, colisão e enablement não podem duplicar item. | **PROPOSTA — não fechada** |
| D51 | Estrutura da superfície | Editor dedicado no centro com `[nav 200][conteúdo flex]`; overview por flex-wrap; listas e detalhes centralizados com máximo 840 px; detalhe substitui lista no mesmo conteúdo, sem nova coluna global. | **PROPOSTA — não fechada** |
| D52 | Estados visuais e honestidade | Implementar empty, disabled, hover, selected, focus, filtered, loading/checking, repairing, uninstalling, warning, error e connected. UI sem backend deve ficar disabled/indisponível e nunca simular sucesso. | **PROPOSTA — não fechada** |
| D53 | Acessibilidade e teclado | Exigir roles coerentes, ARIA de estado/relação, roving tabindex, setas, Home/End, Enter, Space e Esc; restauração de foco ao voltar do detalhe; estados assíncronos em live region. | **PROPOSTA — não fechada** |
| D54 | Responsividade, virtualização e restauração | Preservar o chassi `[300][centro][274][48]`; adotar narrow layout interno; virtualizar listas grandes; restaurar seção, item, expansão e scroll por sessão sem duplicar fonte de estado. | **PROPOSTA — não fechada** |
| D55 | Divisão de responsabilidade | Fatia 10 entrega shell funcional/listas/actions/detail/editor ligados ao registry real; Fatia 09 entrega runtime/estados; Fatia 12 fecha fidelidade, tokens, responsive, performance e acessibilidade. Nenhuma fixture conta como conclusão visual-funcional. | **PROPOSTA — não fechada** |
```

### Nota sobre D48

A sugestão inicial de 274 px não foi confirmada pela régua. O DOM recebido contém `.management-sidebar { width:200px }`. Os **274 px** pertencem à Side Bar externa do chassi. Esta proposta usa **200 px** para não transformar hipótese em decisão.

## 3. `docs/03 - ESTADO ATUAL.md`

**Não alterar agora.** Somente após:
- D48–D55 serem aprovadas;
- a subfatia correspondente começar;
- existir implementação/validação que possa entrar no estado atual.

## 4. Checklist antes de aplicar a proposta

- [ ] Aprovar ou ajustar D48–D55.
- [ ] Confirmar se Prompt Files aparecerá na nav desde o início da Fatia 10 ou apenas após backend real.
- [ ] Confirmar nomenclatura visível “Hooks” ou “Ganchos”.
- [ ] Confirmar se o editor será modal como na captura ou aba central restaurável como recomendado para o nosso chassi.
- [ ] Confirmar política narrow abaixo da largura mínima do conteúdo.
- [ ] Não editar `docs/03` antes de implementação.
- [ ] Manter somente nove arquivos canônicos ativos.
