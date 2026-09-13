# 10 — GOVERNANÇA E EVOLUÇÃO

## Objetivo
Definir como o projeto será mantido após a retomada da implementação, incluindo suporte, correções, evolução funcional e atualização da documentação canônica.

## Tipos de manutenção

| Tipo | O que significa | Exemplo no AGENTE WINDOW |
|---|---|---|
| corretiva | corrigir erro observado | terminal perde foco após split |
| adaptativa | ajustar para mudança externa | provider de IA muda API ou política |
| evolutiva | adicionar capacidade nova | novo tipo de tool, nova view ou novo provider |
| preventiva | reduzir risco futuro | refatorar contrato, eliminar acoplamento, reforçar teste |

## Processo de governança documental
1. Descobriu divergência entre código e documentação: registrar primeiro.
2. Se a documentação estiver correta e o código não: corrigir o código.
3. Se a decisão precisar mudar: revisar a documentação canônica antes da implementação.
4. Se um contrato mudar: atualizar `03`, `04`, `05` e `07` na mesma iniciativa.

## Política de mudanças arquiteturais
Mudanças que exigem revisão explícita:
- criação de dependência nova entre camadas;
- quebra do contrato de runtime/provider/tools;
- mudança no modelo de instalação em raiz única;
- mudança no mecanismo de persistência de sessões/layout;
- alteração do papel do terminal como subsistema piloto.

## Operação e suporte

| Faixa | Expectativa mínima |
|---|---|
| incidente blocker | análise imediata, mitigação/rollback e registro |
| bug alto | correção priorizada na próxima janela curta |
| bug médio | entra no backlog com evidência e impacto |
| melhoria | entra como item evolutivo sujeito a priorização |

## Backlog pós-V1
Após a entrega da V1, a evolução deve seguir esta ordem sugerida:
1. estabilidade e performance;
2. maturidade de operação;
3. novos providers/tools;
4. extensibilidade do editor e do workbench;
5. recursos fora do escopo inicial.

## Relação com o método reutilizável
O método canônico de execução com IA pode ser extraído deste projeto como subproduto, mas a governança deste arquivo continua focada no **AGENTE WINDOW real**.

## Definition of Done para manutenção
Uma correção ou evolução só é encerrada quando:
- o item está ligado a backlog ou incidente;
- os contratos impactados permanecem coerentes;
- a validação correspondente foi executada;
- a documentação canônica foi atualizada se necessário;
- o resumo final informa concluído, pendências e validações executadas; percentuais só entram quando o usuário pedir explicitamente.
