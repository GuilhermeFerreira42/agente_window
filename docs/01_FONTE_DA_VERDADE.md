# 01 — FONTE DA VERDADE

## Decisão central
A partir desta consolidação, a **fonte da verdade principal do projeto AGENTE WINDOW é a pasta `docs/`**.

Motivo:
- ela representa a linha de continuidade do projeto real;
- ela está ancorada no baseline efetivo do repositório atual;
- ela evita reconstrução greenfield desnecessária;
- ela passa a concentrar escopo, arquitetura, contratos, backlog, validação e operação.

## Hierarquia de precedência
Em caso de dúvida ou conflito, a ordem de precedência é esta:

1. `docs/00` a `docs/10`
2. `docs/engenharia_reversa/*`
3. código atual do repositório
4. `code-server-main` e referências externas já absorvidas na engenharia reversa
5. conteúdo herdado da antiga `docs-1/`, já absorvido nesta camada e sem autoridade própria futura

## Quem manda em cada assunto

| Assunto | Documento principal | Evidência/apoio | Regra de desempate |
|---|---|---|---|
| leitura inicial | `docs/00_COMO_LER_ESTA_DOCUMENTACAO.md` | índice desta pasta | se houver ambiguidade, seguir o 00 |
| escopo de produto | `docs/02_ESCOPO_V1_E_NAO_ESCOPO.md` | conteúdo herdado da antiga `docs-1/` já absorvido nesta camada | prevalece o 02 em `docs/` |
| arquitetura | `docs/03_ARQUITETURA_EXECUTAVEL.md` | conteúdo herdado da antiga `docs-1/` e referências do VS Code já absorvidos nesta camada | prevalece o 03 em `docs/` |
| contratos entre módulos | `docs/04_CONTRATOS_TECNICOS.md` | engenharia reversa dos módulos + decisões consolidadas nesta camada | prevalece o 04 em `docs/` |
| backlog e ordem de construção | `docs/05_BACKLOG_MESTRE.md` | rebuild plans herdados da antiga `docs-1/` | prevalece o 05 em `docs/` |
| protocolo para IA | `docs/06_PLANO_DE_IMPLANTACAO_PARA_IA.md` | NEXUS + decisões registradas em conversa | prevalece o 06 em `docs/` |
| testes e aceite | `docs/07_MATRIZ_DE_VALIDACAO.md` e `docs/08_CRITERIOS_DE_HOMOLOGACAO.md` | critérios por subsistema em `docs/engenharia_reversa/*` | prevalece 07/08 em `docs/` |
| deploy, operação e suporte | `docs/09_PLANO_DE_DEPLOY_E_OPERACAO.md` e `docs/10_GOVERNANCA_E_EVOLUCAO.md` | limitações da réplica, scripts e manifests | prevalece 09/10 em `docs/` |
| comportamento detalhado por módulo | `docs/engenharia_reversa/<modulo>/*` | `code-server-main` e código atual do repositório | prevalece a engenharia reversa de `docs/` |

## Política para conflitos documentais
1. Se a camada canônica de `docs/` contradizer qualquer formulação herdada da antiga `docs-1/`, prevalece `docs/`.
2. Se `docs/engenharia_reversa/` contradizer texto genérico de outra pasta, prevalece a evidência mais específica do subsistema.
3. Se o código atual contradizer a documentação e a documentação representar a decisão correta, o código é que está defasado.
4. Se a documentação estiver incompleta para uma decisão concreta, a tarefa deve parar e pedir validação humana.
5. O VS Code é fonte de referência comportamental, não autorização para ignorar a modularidade definida aqui.

## Papel das pastas herdadas

| Pasta | Papel após a consolidação |
|---|---|
| `docs/` | camada canônica viva do projeto |
| `docs/engenharia_reversa/` | base evidencial por subsistema |
| antiga `docs-1/` | apoio greenfield já minerado e absorvido nesta camada |

## Critério de liberação para implementação
A implementação só pode ser retomada quando estiverem aprovados:
- `02_ESCOPO_V1_E_NAO_ESCOPO.md`
- `03_ARQUITETURA_EXECUTAVEL.md`
- `04_CONTRATOS_TECNICOS.md`
- `05_BACKLOG_MESTRE.md`
- `06_PLANO_DE_IMPLANTACAO_PARA_IA.md`
- `07_MATRIZ_DE_VALIDACAO.md`
