# PARA ARENA - INSTRUÇÕES DE EXECUÇÃO - VALIDAÇÃO 2 PRODUÇÃO

## Você está em Teste Cego Blind Testing
Você recebeu:
- Vídeo 4min27s com narração detalhada dos bugs (prints extraídos em 00_PRINTS_BRUTOS_DO_VIDEO/)
- Código completo 3.803 arquivos em projeto_restaurado.zip
- Documentação original em 01_original/sessions/
- Esta pasta PARA_ARENA_VALIDACAO_2 com 10 sessões detalhadas

Sem viés: descubra sozinho o que está quebrado comparando ORIGINAL x RÉPLICA.

## Ordem de execução OBRIGATÓRIA
1. Ler 00_INDICE_GERAL.md
2. Começar por 04_SESSAO_LAYOUT_CONTROLLER (bug mais crítico vídeo 00:17)
3. Depois 03, 05, 02, 07, 08, 09, 01, 06, 10
4. Para cada sessão:
   - Ler COMPARACAO.md
   - Ler TAREFA.md
   - Implementar
   - Rodar TESTE.md com Playwright
   - Tirar screenshot e salvar em test-results/
   - Só então ir para próxima sessão

## Tecnologia
- Playwright (Microsoft) para E2E - você já usou antes, fez 348/348 testes e 24 screenshots
- restore_to_zip.py para lidar com projeto gigante sem estourar limite 2048 arquivos
- Leia direto do ZIP: zipfile.ZipFile().read()

## Não faça como antes (rápido sem testar)
Antes você fez rápido e não testou, ficou só ENFEITE/MOCK. Agora faça:
- Uma sessão por vez
- Teste E2E após cada sessão
- Screenshot antes/depois
- Validar persistência com F5

## Entrega
- Código corrigido em 02_replica/src
- Relatório VALIDACAO_2.md
- 24+ screenshots
- 0 erros TypeScript
- Build produção funcionando

Boa sorte! O objetivo é sair de "casa de fachada" para "casa real com motor".
