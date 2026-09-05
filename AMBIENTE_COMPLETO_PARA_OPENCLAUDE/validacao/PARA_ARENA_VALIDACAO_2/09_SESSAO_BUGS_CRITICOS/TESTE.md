# TESTE BUGS CRÍTICOS

Playwright:
1. Botão direito em sessão -> menu aparece com 4 opções -> clicar Excluir -> sessão some
2. Drag sessão 1 para posição 3 -> ordem muda
3. Focar sidebar com Tab, ArrowDown 3x, Enter -> sessão selecionada muda
4. Recolher sidebar -> validar sem border residual (screenshot pixel diff)
5. Clicar Search pill -> picker flutuante abre
6. Clicar Changes pill -> Changes view abre
7. Clicar arquivo em Changes view -> diff abre
