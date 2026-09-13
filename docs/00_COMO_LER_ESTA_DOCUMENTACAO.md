# 00 — COMO LER ESTA DOCUMENTAÇÃO

## Objetivo
Este pacote transforma a pasta `docs/` na camada canônica de documentação do **AGENTE WINDOW** para a continuidade do projeto atual.

A regra geral é simples:
- `docs/` = autoridade principal para continuação do projeto;
- `docs/engenharia_reversa/` = evidência detalhada por subsistema;
- o conteúdo histórico já relevante foi absorvido nesta camada canônica;
- a antiga linha `docs-1/` foi absorvida nesta consolidação e não é mais uma pasta operacional.

## Ordem obrigatória de leitura
Para qualquer pessoa ou IA que vá atuar no projeto, a leitura obrigatória é:

1. [`00_COMO_LER_ESTA_DOCUMENTACAO.md`](00_COMO_LER_ESTA_DOCUMENTACAO.md)
2. [`01_FONTE_DA_VERDADE.md`](01_FONTE_DA_VERDADE.md)
3. [`02_ESCOPO_V1_E_NAO_ESCOPO.md`](02_ESCOPO_V1_E_NAO_ESCOPO.md)
4. [`03_ARQUITETURA_EXECUTAVEL.md`](03_ARQUITETURA_EXECUTAVEL.md)
5. [`03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md`](03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md)
6. [`04_CONTRATOS_TECNICOS.md`](04_CONTRATOS_TECNICOS.md)
7. [`05_BACKLOG_MESTRE.md`](05_BACKLOG_MESTRE.md)
8. [`06_PLANO_DE_IMPLANTACAO_PARA_IA.md`](06_PLANO_DE_IMPLANTACAO_PARA_IA.md)
9. [`07_MATRIZ_DE_VALIDACAO.md`](07_MATRIZ_DE_VALIDACAO.md)
10. [`08_CRITERIOS_DE_HOMOLOGACAO.md`](08_CRITERIOS_DE_HOMOLOGACAO.md)
11. [`09_PLANO_DE_DEPLOY_E_OPERACAO.md`](09_PLANO_DE_DEPLOY_E_OPERACAO.md)
12. [`10_GOVERNANCA_E_EVOLUCAO.md`](10_GOVERNANCA_E_EVOLUCAO.md)
13. [`11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md`](11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md)
14. [`12_DOCUMENTACAO_VIVA.md`](12_DOCUMENTACAO_VIVA.md)
15. [`13_ADRS_E_DECISOES_TECNICAS.md`](13_ADRS_E_DECISOES_TECNICAS.md)
16. [`14_PRIMEIRA_FATIA_RECOMENDADA.md`](14_PRIMEIRA_FATIA_RECOMENDADA.md)
17. [`15_HANDOFF_PROMPT_PARA_NOVA_IA.md`](15_HANDOFF_PROMPT_PARA_NOVA_IA.md)

Depois da camada canônica acima, a consulta detalhada deve seguir esta ordem:

1. `docs/engenharia_reversa/*`
2. código atual do repositório (`AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final` e `pty-server`)
3. código atual do repositório e `docs/engenharia_reversa/*` como evidência operacional
4. `vscode-main.zip` e `code-server-main` apenas para esclarecer comportamento ou arquitetura de referência

## Quando usar cada conjunto

| Conjunto | Papel | Quando consultar |
|---|---|---|
| `docs/*.md` (esta camada) | decisão e execução | sempre primeiro |
| `docs/engenharia_reversa/*` | evidência observável e critérios por subsistema | quando a tarefa tocar um módulo específico |
| código atual do repositório | baseline real de continuidade | quando a tarefa depender do estado implementado hoje |
| `vscode-main.zip` / `code-server-main` | referência externa de comportamento e host web | apenas quando houver dúvida concreta não resolvida pelas fontes acima |

## Leitura mínima por perfil

### IA implementadora
Leitura mínima obrigatória:
- 00, 01, 02, 03, 04, 05, 06, 07
- módulo correspondente em `docs/engenharia_reversa/`
- arquivos reais do código que serão alterados

### Revisor técnico
Leitura mínima obrigatória:
- 01, 03, 04, 07, 08, 09, 10

### Tomada de decisão de produto
Leitura mínima obrigatória:
- 02, 05, 08, 09, 10

## Regras de navegação
1. Em caso de conflito, prevalece a regra definida em `01_FONTE_DA_VERDADE.md`.
2. Nenhuma implementação deve começar sem que a tarefa tenha vínculo com um item do `05_BACKLOG_MESTRE.md`.
3. Nenhuma mudança estrutural pode violar `03_ARQUITETURA_EXECUTAVEL.md` e `04_CONTRATOS_TECNICOS.md`.
4. Nenhuma fatia é considerada pronta sem passar por `07_MATRIZ_DE_VALIDACAO.md` e `08_CRITERIOS_DE_HOMOLOGACAO.md`.
5. O projeto continua orientado por documentação antes de implementação.

## Estado atual da documentação
Nesta consolidação:
- a linha de continuidade foi centralizada em `docs/`;
- os insumos úteis de `docs-1/` foram absorvidos como apoio de arquitetura, escopo e backlog;
- a implementação permanece deliberadamente fora desta etapa.
