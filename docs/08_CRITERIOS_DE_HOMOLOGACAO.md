# 08 — CRITÉRIOS DE HOMOLOGAÇÃO

## Objetivo
Definir quando uma entrega pode ser apresentada como pronta para aceite funcional, sem depender de interpretação subjetiva.

## Gate de homologação da documentação
Antes de liberar implementação ampla, os seguintes itens precisam estar aprovados:
- `00_COMO_LER_ESTA_DOCUMENTACAO.md`
- `01_FONTE_DA_VERDADE.md`
- `02_ESCOPO_V1_E_NAO_ESCOPO.md`
- `03_ARQUITETURA_EXECUTAVEL.md`
- `04_CONTRATOS_TECNICOS.md`
- `05_BACKLOG_MESTRE.md`
- `06_PLANO_DE_IMPLANTACAO_PARA_IA.md`
- `07_MATRIZ_DE_VALIDACAO.md`

## Gate de homologação da implementação futura
Uma entrega de código só pode ser homologada quando:
1. a fatia pertence ao backlog aprovado;
2. os contratos impactados foram respeitados;
3. os testes bloqueantes da fatia passaram;
4. o comportamento observado bate com a documentação e com a referência do VS Code quando aplicável;
5. não existe bug blocker aberto no fluxo principal;
6. o relato da execução identifica claramente o que ficou pendente.

## Script mínimo de aceite funcional por subsistema

| Subsistema | Pergunta de aceite | Evidência mínima |
|---|---|---|
| Workbench | layout abre, alterna painéis e persiste estado? | E2E e gravação do estado restaurado |
| Terminal | abre, divide, aceita input e preserva coerência por sessão? | E2E real + sem sujeira visual |
| Explorer | abre árvore, expande pasta e abre arquivo? | E2E + leitura do arquivo |
| Filesystem | salva com atomicidade e reage a mudanças externas? | teste integração |
| Chat | responde em streaming e respeita gate de ferramenta? | E2E + log de tool pending/aprovado |
| Editor/Browser | abas e grupos centrais funcionam sem quebrar foco? | E2E |
| Commands | comandos e menus disparam comportamento correto? | teste focado + smoke manual |
| Theme | troca visual ocorre via tokens e sem hardcode indevido? | inspeção + teste |

## Critérios de rejeição imediata
A entrega deve ser rejeitada se ocorrer qualquer um dos itens abaixo:
- comportamento fora do escopo aprovado;
- desacoplamento quebrado entre camadas;
- terminal fake onde o backlog exigir PTY real;
- regressão crítica de sessão, persistência ou foco;
- documentação e código divergindo sem registro da decisão;
- validação omitida ou inconclusiva sem aviso explícito.

## Critério de aceite final da V1
A V1 só pode ser declarada pronta quando:
- todos os P0 do escopo estiverem entregues;
- a matriz de validação não tiver falhas bloqueantes abertas;
- o plano de deploy tiver sido exercitado em ambiente de staging;
- existir smoke test pós-deploy executável;
- o runbook operacional estiver publicado.
