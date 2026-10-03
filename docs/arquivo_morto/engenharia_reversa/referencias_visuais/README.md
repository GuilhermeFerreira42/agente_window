# Referências visuais do workbench

Este diretório reúne a coleção canônica de prints usada como **apoio visual** da documentação do projeto.

## Ordem de leitura local

1. `TAXONOMIA.md`
2. `CATALOGO.md`
3. subpastas com as imagens

## Regras de uso

- As imagens complementam a documentação textual de `docs/`, mas **não substituem** os documentos canônicos.
- Em caso de conflito entre imagem e texto, prevalece a documentação textual principal do projeto.
- A organização deve ser feita por **subsistema dono da referência**, e não por tipo genérico de estado visual.
- O nome do arquivo deve preservar a numeração original da coleta e descrever o estado capturado.

## Categorias oficiais atuais

- `workbench/`
- `chat_agente/`
- `configuracoes_agente/`
- `explorer/`
- `editor/`
- `terminal/`
- `tabs_breadcrumbs/`

## Observação sobre categorias futuras

A categoria `activity_bar/` pode existir futuramente, mas **somente** quando houver capturas claramente centradas nesse subsistema. Ela não faz parte da coleção atual.

## Seleção prioritária para leitura rápida

- `workbench/01_workbench_visao_geral.png`
- `explorer/07_explorer_autocomplete_arquivos.png`
- `terminal/08_panel_terminal_unico_aberto.png`
- `terminal/12_terminal_split_duplo.png`
- `terminal/14_terminal_split_quadruplo_menu.png`
- `editor/20_editor_yaml_workflow_syntax.png`
- `explorer/21_explorer_estrutura_github_workflows.png`
- `workbench/26_workbench_layout_multi_painel.png`
- `tabs_breadcrumbs/27_workbench_tabs_breadcrumb_visivel.png`
- `workbench/28_workbench_visao_final_completa.png`

## FATIA-04 - Prints do vídeo de referência (NOVO - 2026-09-18)

Esta atualização adiciona 15 prints extraídos do vídeo `Gravar_2026_09_15_21_09_30_680.mp4` (8m35s) que é a fonte da verdade para FATIA-04.

### O que foi adicionado
- `explorer/29_fatia04_video_explorer_header_5_botoes.png` - Header 5 botões
- `explorer/30_fatia04_video_menu_contexto_completo_baixar.png` - Menu contexto + Baixar
- `explorer/31_fatia04_video_editores_abertos_nenhum_editor.png` - Editores Abertos vazio
- `explorer/32_fatia04_video_explorer_completo_sessao.png` - Sessão completa
- `explorer/33_fatia04_video_drag_drop_download.png` - Drag & Drop + Download
- `explorer/40_fatia04_video_menu_contexto_baixar_detalhe.png` - Detalhe Baixar
- `editor/34_fatia04_video_editor_anexo_lateral_direita.png` - **CRÍTICO**: Editor em anexo lateral à direita, NÃO no centro
- `editor/35_fatia04_video_editor_anexo_recolhido.png` - Anexo recolhe ao fechar última aba
- `editor/36_fatia04_video_botao_plus_navegador_pesquisar.png` - Botão + com Navegador e Pesquisar
- `editor/37_fatia04_video_editor_anexo_resize_nao_centro.png` - Resize por sash, nunca centro inteiro
- `workbench/38_fatia04_video_workbench_layout_final_exatamente_igual.png` - Layout final exatamente igual
- `workbench/39_fatia04_video_visao_geral_inicio.png` - Visão geral início
- `workbench/41_fatia04_video_antigravity_cor.png` - Prova tema dinâmico
- `browser/42_fatia04_video_browser_navegador_funcionando.png` - **FUTURO 4.8** Navegador funcionando
- `browser/43_fatia04_video_browser_ia_acesso_html.png` - **FUTURO 4.8** IA acesso HTML

### Pasta de referência bruta
`fatia04_video/` contém todos os 15 prints com prefixo de subsistema para navegação rápida da Arena.

### Como a Arena deve usar
1. Ler `CATALOGO.md` entradas 29-43 para entender timestamp e validação
2. Ver prints em `explorer/`, `editor/`, `workbench/` para implementar RF-01 a RF-23
3. Deixar `browser/` para sub-fatia 4.8 (conforme orientação: mexer só quando chegar nessa parte)
4. Em caso de conflito imagem x texto, prevalece documentação textual de `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/`

### Seleção prioritária atualizada para FATIA-04
- `explorer/29_fatia04_video_explorer_header_5_botoes.png` - **NOVO - ESSENCIAL**
- `explorer/30_fatia04_video_menu_contexto_completo_baixar.png` - **NOVO - ESSENCIAL**
- `editor/34_fatia04_video_editor_anexo_lateral_direita.png` - **NOVO - CRÍTICO**
- `editor/35_fatia04_video_editor_anexo_recolhido.png` - **NOVO - CRÍTICO**
- `editor/36_fatia04_video_botao_plus_navegador_pesquisar.png` - **NOVO - ESSENCIAL**
- `workbench/38_fatia04_video_workbench_layout_final_exatamente_igual.png` - **NOVO - FIDELIDADE**
- `workbench/01_workbench_visao_geral.png` - Base antiga
- `explorer/07_explorer_autocomplete_arquivos.png` - Base antiga
- `editor/20_editor_yaml_workflow_syntax.png` - Base antiga conteúdo
- `editor/23_editor_estado_vazio_selecione_arquivo.png` - Base antiga empty state

