# 16 — INICIAR POR AQUI: IA EXECUTORA — DOC-02

Este é o único arquivo de entrada que a próxima IA deve receber no início do trabalho.

## 1. Seu papel
Você não está entrando para rediscutir o projeto do zero. Você está entrando para executar a **DOC-02: Réplica Modular Exata do Legacy**.

Seu papel é:
- ler a documentação na ordem correta
- resumir o entendimento para validação humana
- aguardar confirmação do usuário
- só então iniciar a implementação

## 2. Regra principal
Você **não deve começar a implementar imediatamente**. Primeiro você deve ler, entender e devolver um resumo claro do que compreendeu. Depois disso, você deve esperar a confirmação explícita do usuário antes de alterar código.

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
13. `docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md` (OBRIGATÓRIO)

Depois, leia a referência visual absoluta:
- `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/src/App.tsx`
- `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/src/styles/app.css`

E então:
- `docs/engenharia_reversa/REPLICA_MODULAR_LEGACY/00_INDICE.md` (quando existir)

## 4. O que você deve entender ao final da leitura
- o que é o AGENTE WINDOW
- que a referência visual absoluta agora é o `02_replica_final`, não vídeo Antigravity
- que a arquitetura alvo é monolito modular com contratos
- que a tarefa é construir nova fundação `platform/apps/workbench-v2/` idêntica visualmente ao legacy, mas modular
- que o `platform/apps/workbench/` atual será descontinuado
- qual é a ordem de execução (Fase 0 → 1 → 2 → 3 → 4)

## 5. O que você deve responder antes de começar
Depois da leitura, responda com estes cinco blocos:

### A. Resumo do projeto
O que é o projeto e qual é o objetivo da DOC-02

### B. Arquitetura entendida
Como você entendeu as camadas e a réplica modular

### C. Próxima frente que pretende executar
Fase 0 — Inventário Visual

### D. Arquivos que você espera alterar
Liste áreas que serão tocadas (workbench-v2, contracts, services, etc.)

### E. Validações que pretende rodar
Comparação 5173 vs 5174, tsc, testes, anti-regressão

## 6. Regra de espera obrigatória
Depois de responder os cinco blocos, pare. Não implemente nada ainda. Espere confirmação explícita do usuário.

## 7. Estado vigente
- FATIA-01,02,03 concluídas no legacy, terminal estabilizado
- FATIA-04 4.1 foi feita na arquitetura antiga mas será refeita sobre nova fundação após DOC-02
- Próxima frente: **DOC-02 — Réplica Modular Exata**
- Após DOC-02 homologada, retomar FATIA-04 completa (Explorer + Editor anexo + Browser com IA) sobre nova fundação

## 8. Referência visual absoluta
`legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/` — este é o layout que deve ser replicado pixel a pixel na nova fundação modular.
