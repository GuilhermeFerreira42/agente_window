# Taxonomia canônica das referências visuais

## Objetivo

Esta taxonomia existe para organizar as referências visuais do projeto de forma previsível, fácil de consultar e fácil de manter por futuras sessões de trabalho assistidas por IA.

## Regra principal

**A pasta representa o subsistema dono da referência.**

**O nome do arquivo representa o estado visual, a interação ou a situação capturada.**

Exemplos:

- `terminal/09_terminal_menu_contexto_acoes.png`
- `editor/23_editor_estado_vazio_selecione_arquivo.png`
- `explorer/24_explorer_pesquisa_estado_vazio.png`

## O que esta taxonomia evita

As referências visuais **não** devem mais ser organizadas em pastas genéricas de topo como:

- `menus_contexto/`
- `submenus/`
- `estados_especiais/`
- `side_bar/`

Esses nomes descrevem o **tipo de estado** ou um **recorte genérico da interface**, mas não o subsistema responsável pela referência.

## Categorias oficiais

### `workbench/`
Capturas amplas do shell principal, composição geral do layout e visões panorâmicas da interface.

### `chat_agente/`
Capturas ligadas ao fluxo de conversa com a IA, modos de operação, histórico de sessões e controles contextuais do agente.

### `configuracoes_agente/`
Capturas ligadas a customizações, ferramentas, servidores MCP, preferências e telas de configuração do agente.

### `explorer/`
Capturas ligadas à árvore de arquivos, navegação, pesquisa e estados do explorador de arquivos.

### `editor/`
Capturas ligadas ao editor, renderização de conteúdo, sintaxe, documentos estruturados e estados vazios do editor.

### `terminal/`
Capturas ligadas ao terminal, sessões, splits, menus contextuais e composição do painel de terminal.

### `tabs_breadcrumbs/`
Capturas ligadas à navegação contextual do topo do editor, como abas e breadcrumbs.

## Convenção de nome dos arquivos

Cada arquivo deve, preferencialmente:

1. preservar a numeração da coleta original;
2. usar letras minúsculas;
3. usar underscore entre palavras;
4. indicar o subsistema e o estado visível;
5. evitar nomes genéricos como `print1`, `imagem_final` ou `captura_ok`.


### `browser/` (NOVO - FATIA 4.8 - FUTURO)
Capturas ligadas ao navegador interno da sessão do editor, acesso da IA ao HTML, clonar página, interagir, filmar.
**Status:** Documentado mas implementação adiada para sub-fatia 4.8 conforme orientação do usuário. Prints 42 e 43 já estão capturados do vídeo de referência.

### `fatia04_video/` (NOVO - Coleção do vídeo de referência 8m35s)
Coleção bruta dos prints extraídos diretamente do vídeo `Gravar_2026_09_15_21_09_30_680.mp4`.
Organizada com prefixo de subsistema para facilitar navegação da Arena.
Esta pasta é a **fonte da verdade visual** para FATIA-04 e deve ser usada junto com `CATALOGO.md`.

## Regra de expansão futura

Se uma nova captura puder ser atribuída claramente a um subsistema já existente, ela deve entrar na pasta desse subsistema.

Só criar uma nova categoria de topo quando houver:

- volume suficiente de referências próprias;
- fronteira funcional clara;
- ganho real de navegação documental.

## Precedência documental

As imagens desta pasta são evidência visual de apoio. A autoridade principal continua sendo a documentação textual de `docs/`.
