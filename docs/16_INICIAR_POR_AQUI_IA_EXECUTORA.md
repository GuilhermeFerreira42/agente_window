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
- só então iniciar a próxima frente autorizada de implementação.

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
14. `docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md`
15. `docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md` (OBRIGATÓRIO: ler para não quebrar componentes homologados)

Depois disso, leia os pacotes modulares apenas se eles forem necessários para a fatia escolhida.

Se a fatia exigir fidelidade visual, menus, estados de tela ou comparação de layout, consulte também como apoio:
- `docs/referencias_visuais/README.md`
- `docs/referencias_visuais/TAXONOMIA.md`
- `docs/referencias_visuais/CATALOGO.md`

Essas referências visuais são apoio documental. Em caso de conflito, prevalece a documentação textual canônica de `docs/`.

## 4. O que você deve entender ao final da leitura
Ao terminar a leitura acima, você deve ter entendido claramente:
- o que é o AGENTE WINDOW;
- o que está no escopo e o que está fora do escopo;
- qual é a arquitetura em 4 camadas;
- quais contratos são obrigatórios;
- qual é a ordem de execução aprovada;
- como validar cada fatia;
- qual é a próxima frente autorizada no estado vigente do repositório.

## 5. O que você deve responder antes de começar
Depois da leitura, responda ao usuário com estes cinco blocos, em texto claro:

### A. Resumo do projeto
Explique, com suas palavras, o que é o projeto e qual é o objetivo da fase atual.

### B. Arquitetura entendida
Explique como você entendeu as 4 camadas e os limites entre elas.

### C. Próxima frente que pretende executar
Diga qual é a próxima frente que você pretende executar no estado vigente do repositório.

### D. Arquivos que você espera alterar
Liste os arquivos ou áreas do repositório que você acredita que serão tocados.

### E. Validações que pretende rodar
Diga quais validações pretende executar ao final da fatia.

## 6. Regra de espera obrigatória
Depois de responder os cinco blocos acima, pare.
Não implemente nada ainda.
Espere a confirmação explícita do usuário.

## 7. Estado vigente e próxima frente autorizada
O estado vigente deste repositório **já está após a FATIA-01, FATIA-02 e FATIA-03**.

Portanto:
- não reinicie a execução pela FATIA-01;
- não trate a arquitetura como discussão em aberto;
- use `docs/12_DOCUMENTACAO_VIVA.md` para distinguir estado atual, decisões congeladas e o que ainda está apenas em transição.

A direção arquitetural aprovada para a nova estrutura é:
- container `platform/`;
- `platform/apps/workbench/src/` para a aplicação visual principal;
- `platform/packages/` para contratos, shared, runtime de agente, provider e tools;
- `platform/services/` para serviços operacionais.

A próxima frente funcional alvo é:

**FATIA-04 — Explorador de Arquivos (Explorer)**

Ela deve começar já assumindo `platform/` como estrutura vigente, `legacy/.../VSCodeTerminal.tsx` como terminal estabilizado (não tocar), e sem reabrir discussão arquitetural congelada.

## 8. O que significa a próxima frente desta rodada
Nesta etapa, a IA executora deve assumir que:
- FATIA-01, FATIA-02 e **FATIA-03** já são fatos concluídos no repositório atual;
- o terminal (`VSCodeTerminal.tsx` em `legacy/`) está estabilizado — fidelidade ≈85%, PTY real funcionando, redimensionamento corrigido, sidebar condicional, 5 abas funcionais; **não tocar sem autorização explícita**;
- a estrutura vigente já foi materializada em `platform/` e `legacy/`; registros antigos podem mencionar a antiga árvore `src/` na raiz como estado histórico de transição;
- a separação entre interface/workbench, backend/runtime/serviços e camada de IA/provider/tools não é opcional;
- qualquer continuidade rumo à FATIA-04 precisa respeitar essa separação e não pode reintroduzir acoplamento estrutural.

## 9. O que você não deve fazer nesta etapa
Não faça nada disso nesta etapa:
- não reinicie a execução pela FATIA-01 como se o repositório estivesse no estado inicial;
- não reabra a discussão sobre deixar a nova arquitetura solta na raiz;
- não colapse `platform/apps`, `platform/packages` e `platform/services` em uma única massa indiferenciada;
- não tentar implementar o terminal inteiro ao mesmo tempo em que reorganiza todo o sistema sem recorte claro;
- não usar referências visuais para sobrescrever a documentação textual canônica;
- não pule contratos para ganhar velocidade.

## 10. Regras invioláveis
- `docs/` é a fonte principal de verdade.
- Você não deve usar documentação histórica como autoridade acima de `docs/`.
- Você não deve começar por aparência antes da estrutura.
- Você não deve misturar múltiplos subsistemas grandes na mesma fatia sem necessidade explícita.
- Você deve trabalhar com fatias pequenas e paradas frequentes.
- Você deve validar a fatia antes de seguir para a próxima.
- Você deve seguir rigorosamente `docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`, executando o checklist de homologação no navegador real antes de considerar qualquer fatia entregue.
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
Seu primeiro objetivo é provar que entendeu corretamente a documentação e que consegue executar a próxima frente autorizada sem desviar da arquitetura.
