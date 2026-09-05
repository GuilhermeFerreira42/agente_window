# COMPORTAMENTO REAL - MENU, DRAG, TECLADO

## Vídeo novo [03:47][03:49][04:36][05:50]
- [03:47] Original: "eu tenho o menu de contexto aqui" - mostra menu ao clicar direito em sessão
- [03:49] "Fields" - mostra Files com menu contexto
- [04:36] "O menu de contexto também funciona aqui, novo terminal"
- [05:50] "Aqui eu tenho esse menu de contexto, eu tenho esse menu de contexto, eu tenho esse menu de contexto" - mostra menu em vários lugares

## Comportamento original real
1. **Menu contexto (R-072):** Botão direito em SessionRow, NestedChatRow, EditorTab, Workspace Files, Terminal, Footer abre menu com ações:
   - Sessão: Pin, PinOff, Archive, Delete, Rename (F2), Open Beside (E14), Atribuir a grupo customizado
   - Chat aninhado: Rename, Delete, Open Beside
   - Editor tab: Fechar, Fechar outros, Fechar à direita, Fechar todos
   - Workspace Files: Abrir, Renomear, Excluir, Revelar no Explorer, Novo arquivo, Nova pasta
   - Terminal: Copiar, Colar, Limpar, Novo terminal, Dividir

2. **Drag & Drop (R-085):** Arrastar sessão muda ordem dentro da seção, move para Fixadas, move para grupo customizado, arrastar workspace section reordena. Drop de sessão no Sessions grid abre via ISessionsService. Archived e fixed sections não são targets. Multi-selection preserva ordem relativa.

3. **Teclado (R-076):** 
   - Tab navega entre seções
   - ArrowUp/Down move foco entre linhas (roving index)
   - Enter seleciona sessão focada
   - F2 entra em modo rename
   - Delete abre confirmação excluir
   - Escape fecha menu/contexto
   - Roving focus respeita ordem visual, seções colapsadas e filtros (só conta o que está no DOM)

4. **Search pill (R-073):** Pill de busca abre picker flutuante com filtros, não só foca filtro lateral

5. **Changes pill (R-083):** Pill Changes clicável abre Changes view

6. **Bordas residuais (R-070):** Ao recolher colunas, remover border residual

## O que deveria acontecer
- Botão direito em sessão abre menu com 5+ opções
- Arrastar sessão de Hoje para Fixadas -> pin e move
- Teclado ArrowDown 3x, Enter -> sessão selecionada muda
- Search pill abre overlay com input e lista filtrável
- Changes pill abre Changes view
- Sem bordas residuais ao recolher
