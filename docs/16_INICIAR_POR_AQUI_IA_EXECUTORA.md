# 16 — INICIAR POR AQUI: IA EXECUTORA

Este é o único arquivo de entrada que a próxima IA deve receber no início do trabalho.

Se você é a IA executora deste projeto, siga exatamente este protocolo.

## 1. Seu papel
Você não está entrando para rediscutir o projeto do zero.
Você está entrando para continuar a implementação do **AGENTE WINDOW** com base na documentação canônica já consolidada.

Seu papel é:
- ler a documentação na ordem correta;
- resumir o entendimento para validação humana;
- aguardar confirmação do usuário;
- só então iniciar a primeira fatia de implementação.

## 2. Regra principal
Você **não deve começar a implementar imediatamente**.
Primeiro você deve ler, entender e devolver um resumo claro do que compreendeu.
Depois disso, você deve esperar a confirmação explícita do usuário antes de alterar código.

## 3. Ordem obrigatória de leitura
Leia os arquivos abaixo nesta ordem exata:

1. `docs/00_COMO_LER_ESTA_DOCUMENTACAO.md`
2. `docs/01_FONTE_DA_VERDADE.md`
3. `docs/02_ESCOPO_V1_E_NAO_ESCOPO.md`
4. `docs/03_ARQUITETURA_EXECUTAVEL.md`
5. `docs/03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md`
6. `docs/04_CONTRATOS_TECNICOS.md`
7. `docs/05_BACKLOG_MESTRE.md`
8. `docs/06_PLANO_DE_IMPLANTACAO_PARA_IA.md`
9. `docs/07_MATRIZ_DE_VALIDACAO.md`
10. `docs/11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md`
11. `docs/12_DOCUMENTACAO_VIVA.md`
12. `docs/13_ADRS_E_DECISOES_TECNICAS.md`
13. `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md`

Depois disso, leia os pacotes modulares apenas se eles forem necessários para a fatia escolhida.

## 4. O que você deve entender ao final da leitura
Ao terminar a leitura acima, você deve ter entendido claramente:
- o que é o AGENTE WINDOW;
- o que está no escopo e o que está fora do escopo;
- qual é a arquitetura em 4 camadas;
- quais contratos são obrigatórios;
- qual é a ordem de execução aprovada;
- como validar cada fatia;
- qual é a primeira fatia recomendada.

## 5. O que você deve responder antes de começar
Depois da leitura, responda ao usuário com estes cinco blocos, em texto claro:

### A. Resumo do projeto
Explique, com suas palavras, o que é o projeto e qual é o objetivo da fase atual.

### B. Arquitetura entendida
Explique como você entendeu as 4 camadas e os limites entre elas.

### C. Primeira fatia que pretende executar
Diga qual fatia você pretende executar primeiro.

### D. Arquivos que você espera alterar
Liste os arquivos ou áreas do repositório que você acredita que serão tocados.

### E. Validações que pretende rodar
Diga quais validações pretende executar ao final da fatia.

## 6. Regra de espera obrigatória
Depois de responder os cinco blocos acima, pare.
Não implemente nada ainda.
Espere a confirmação explícita do usuário.

## 7. Primeira fatia oficial desta rodada
A primeira fatia oficial desta rodada **não é o Terminal**.

A primeira fatia oficial desta rodada é:

**FATIA-01 — Fundação estrutural da raiz única + contratos compartilhados mínimos**

Você deve seguir a recomendação registrada em:
- `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md`

## 8. O que significa essa primeira fatia
Nesta primeira fatia, o objetivo é começar a convergir o projeto para uma única raiz de instalação, reduzindo a necessidade de dois `npm install` separados em pastas diferentes.

Isso inclui, em nível geral:
- preparar a base estrutural da raiz única;
- definir o espaço comum de contratos compartilhados;
- organizar a convergência entre frontend atual e runtime;
- evitar migração total de todos os módulos de uma vez.

## 9. O que você não deve fazer nessa primeira fatia
Não faça nada disso na primeira fatia:
- não tente implementar o terminal inteiro;
- não tente migrar o chat inteiro;
- não tente reorganizar o sistema inteiro numa única passada;
- não tente concluir toda a unificação de uma vez só;
- não redefina a arquitetura;
- não pule contratos para ganhar velocidade.

## 10. Regras invioláveis
- `docs/` é a fonte principal de verdade.
- Você não deve usar documentação histórica como autoridade acima de `docs/`.
- Você não deve começar por aparência antes da estrutura.
- Você não deve misturar múltiplos subsistemas grandes na mesma fatia sem necessidade explícita.
- Você deve trabalhar com fatias pequenas e paradas frequentes.
- Você deve validar a fatia antes de seguir para a próxima.
- Você deve priorizar `typecheck`, testes focados, probe e E2E conforme a fatia.
- Você não deve assumir que build completo é obrigatório em toda etapa.

## 11. Regra de parada por dúvida
Se houver lacuna documental, conflito arquitetural ou ambiguidade suficiente para exigir inferência arriscada:
- pare;
- cite o documento ou trecho que ficou insuficiente;
- explique a dúvida de forma objetiva;
- peça confirmação ao usuário antes de continuar.

## 12. Regra final
Seu primeiro objetivo não é codar rápido.
Seu primeiro objetivo é provar que entendeu corretamente a documentação e que consegue executar a primeira fatia sem desviar da arquitetura.
