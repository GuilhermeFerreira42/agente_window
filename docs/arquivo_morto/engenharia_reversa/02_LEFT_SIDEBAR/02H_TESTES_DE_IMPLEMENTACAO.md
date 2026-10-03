# 02H — Testes de Implementação: Left Sidebar

## Focados
- registro de container respeita ordem e contexto;
- ativação troca o container visível sem render duplicado;
- badge atualiza o item correto;
- largura persiste entre reloads quando aplicável.

## Integração
- toggle de visibilidade redistribui espaço no workbench;
- abrir Explorer e Search sincroniza conteúdo central quando necessário.

## E2E mínimo
1. abrir e fechar sidebar;
2. alternar entre pelo menos dois containers;
3. confirmar foco e conteúdo correto;
4. recarregar e verificar persistência da visibilidade e largura.
