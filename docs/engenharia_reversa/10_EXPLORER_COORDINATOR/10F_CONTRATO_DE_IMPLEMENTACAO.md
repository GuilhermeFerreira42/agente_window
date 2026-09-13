# 10F — Contrato de Implementação: Explorer Coordinator

## Objetivo
Definir o Explorer como o módulo coordenador entre Left Sidebar, Filesystem e Editor para navegação de árvore, seleção e abertura de recursos.

## Responsabilidade do módulo
Exibir a árvore de arquivos, reagir a expansão/colapso, sincronizar seleção com a área central e traduzir eventos do Filesystem em atualizações da UI.

## Dependências permitidas
- `ExplorerService`
- `FileSystemPort`
- `EditorService`
- `WorkbenchLayoutService`

## Regras obrigatórias
- o Explorer não é dono da leitura/escrita de arquivos; ele coordena navegação;
- abrir recurso deve delegar ao `EditorService`;
- expansão preguiçosa da árvore deve depender do `FileSystemPort`;
- auto-reveal deve respeitar o editor ativo quando habilitado.

## Proibições
- carregar a árvore inteira sem necessidade;
- abrir arquivos injetando conteúdo direto na UI central;
- duplicar estado autoritativo do filesystem dentro do componente visual.
