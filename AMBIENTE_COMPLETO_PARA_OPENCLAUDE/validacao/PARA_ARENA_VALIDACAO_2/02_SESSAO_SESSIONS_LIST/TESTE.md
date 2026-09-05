# TESTE E2E - SESSIONS LIST

Playwright:
1. Abrir app - validar que sidebar NÃO contém "ORDENAR" ou "PROVEDOR"
2. Validar seções: Fixadas, Quick Chats, Hoje existem
3. Criar 2 sessões no mesmo workspace "workspace-local" - validar que aparecem aninhadas sob mesmo workspace header, não como 2 workspaces separados
4. Criar 3 chats dentro da mesma sessão (usar + dentro da sessão) - validar que 3 NestedChatRow aparecem
5. Botão direito em sessão -> validar ContextMenu abre com opções Pin, Arquivar, Excluir
6. Drag: arrastar sessão de Hoje para Fixadas - validar pin
7. Filtrar "Implementação" - validar que workspace ativo continua visível mesmo se filtro não bate (R-015)
8. Screenshot: sidebar original vs réplica lado a lado - devem ter mesma estrutura
