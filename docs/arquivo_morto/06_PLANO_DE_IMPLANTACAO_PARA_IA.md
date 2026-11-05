# 06 — PLANO DE IMPLANTAÇÃO PARA A IA

## Finalidade
Este documento define como uma IA executora deve entrar no projeto, ler o contexto, escolher uma fatia, implementar, validar e parar. O objetivo é reduzir alucinação, reabertura de decisões e acoplamento indevido.

## Protocolo de entrada obrigatório
Antes de alterar código, a IA deve:
1. Ler `docs/00` até `docs/07`.
2. Ler o módulo correspondente em `docs/engenharia_reversa/`.
3. Inspecionar os arquivos reais que pretende alterar.
4. Resumir em poucas linhas: objetivo da fatia, arquivos-alvo, riscos, validações previstas.
5. Só então iniciar a implementação.

## Regra de ouro
A IA **não decide arquitetura**. Ela executa a arquitetura aprovada.

## Regras invioláveis
1. Não iniciar implementação se a tarefa ainda for documental.
2. Não usar `docs-1/` como fonte principal.
3. Não ignorar contratos para “ganhar velocidade”.
4. Não alterar múltiplos subsistemas grandes no mesmo passo sem necessidade explícita.
5. Não inventar comportamento quando a documentação estiver silenciosa; parar e perguntar.
6. Não gerar relatórios extras no workspace por padrão quando o pedido for apenas atualização do workspace; informar no chat.
7. Não compactar ou criar arquivos de pacote sem pedido explícito.
8. Não tratar arquivos renomeados de pacote comprimido como texto por conta própria.
9. Manter o VS Code disponível; se for indispensável desligá-lo temporariamente por memória em validação pesada, informar e reerguer no mesmo turno.
10. Sempre reportar no final: o que foi feito, o que faltou e quais validações rodaram. Só incluir percentuais se o usuário pedir explicitamente.

## Formato mínimo de trabalho por fatia

### Entrada da fatia
- ID ou nome da onda/épico no `05_BACKLOG_MESTRE.md`
- objetivo funcional
- arquivos-alvo
- contrato impactado
- critérios de aceite

### Saída obrigatória da fatia
- lista de arquivos alterados;
- resumo do comportamento implementado;
- validações executadas;
- pendências ou riscos;
- pendências, riscos e limitações observadas na fatia.

## Sequência operacional por fatia
1. Confirmar a fatia exata.
2. Ler os documentos relevantes.
3. Declarar o plano imediato.
4. Implementar apenas a menor unidade útil.
5. Executar validação na ordem adequada.
6. Corrigir apenas o que a validação da própria fatia apontar.
7. Parar e relatar.

## Ordem de validação padrão
1. typecheck do escopo tocado;
2. testes focados do subsistema;
3. probe técnico, quando existir;
4. E2E do fluxo alterado;
5. build completo apenas em marcos de integração, homologação ou release.

## Regra de parada por informação faltante
Se faltar informação suficiente para implementar sem inferir:
- parar;
- citar a seção/documento bloqueante;
- listar perguntas objetivas;
- aguardar decisão humana.

## Regra de parada por desvio arquitetural
Se a implementação necessária entrar em conflito com `03_ARQUITETURA_EXECUTAVEL.md` ou `04_CONTRATOS_TECNICOS.md`:
- não improvisar;
- não “ajustar” a documentação para caber no código;
- abrir a necessidade de decisão antes de continuar.

## Regra de uso do NEXUS no projeto atual
- usar o NEXUS como critério de estrutura e qualidade documental;
- usar `nexus_parte2` como critério de aprofundamento;
- não substituir automaticamente a documentação existente por uma geração nova e monolítica;
- preferir complementação cirúrgica de arquivos canônicos.

## Handoff recomendado para a próxima IA
Ao iniciar um novo chat, o pedido ideal é:
1. ler `docs/00` a `docs/07`, `docs/11`, `docs/12`, `docs/13`, `docs/14`, `docs/15` e `docs/16`;
2. resumir o entendimento do estado vigente do repositório;
3. confirmar a próxima frente autorizada;
4. listar arquivos a alterar;
5. aguardar confirmação do usuário antes de implementar;
6. implementar apenas a fatia aprovada;
7. validar;
8. parar e reportar.
