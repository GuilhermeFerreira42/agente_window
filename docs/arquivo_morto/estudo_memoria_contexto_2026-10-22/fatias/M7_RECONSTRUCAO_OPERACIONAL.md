# M7 — Reconstrução operacional após interrupção (proposta; posição hipotética 19)

**Status:** rascunho não aprovado.  
**Objetivo:** depois de reload/restart, oferecer estado compreensível da tarefa e retomar como nova execução somente após validar o ambiente.

## Distinções obrigatórias

- **Reabrir transcript:** mostrar a conversa persistida e aguardar.
- **Reaplicar checkpoint de contexto:** usar resumo/cauda numa chamada futura.
- **Recuperar memória:** localizar informação de origem.
- **Continuar execução:** reconstruir estado do trabalho, validar workspace/arquivos/Git e iniciar uma nova execução autorizada.
- **Reviver o mesmo processo/replay:** não prometido; efeitos colaterais já executados não são repetidos automaticamente.

## Escopo

- Checkpoint operacional com objetivo, passos/estado, ferramenta/ação concluída ou pendente, resultado, aprovações, arquivos afetados e referências ao transcript; distinguir “status conhecido” de inferência.
- Ao reabrir, comparar caminho/identidade do workspace e estado atual (incluindo Git quando houver repo e Git disponível). Apresentar divergências antes de continuar.
- Tratar aprovações como expiráveis; pedir nova aprovação para ação de escrita/terminal. Não guardar segredo de provider no checkpoint.
- Se ferramenta estava em andamento, marcar resultado desconhecido/interrompido e pedir inspeção; não concluir sucesso nem replay automático.
- Persistir estado de recuperação fora de `Map` volátil somente após schema, atomicidade e política de privacidade aprovados.

## Fora de escopo

Manter processo ativo após fechar o app; replay idempotente geral; reexecutar terminal/escrita sem confirmação; garantir rollback de efeitos externos.

## Dependências e superfícies candidatas

M2 e M3; runtime Agir e seus cartões de approval/continuar; `session-persistence`; validação de workspaces/Git existente. A SPEC da Fatia 13 Terminal-para-o-agente é posterior no cenário de renumeração e pode ampliar tipos de ação.

## Critérios de aceite propostos

1. Reiniciar servidor/app em meio a execução; UI restaura transcript/checkpoint e marca execução como interrompida, não ativa.
2. Continuar apresenta estado e divergências de workspace/Git; não executa ferramenta até pedido explícito.
3. Rejeição/aprovação antiga nunca autoriza ação nova; nova permissão é solicitada.
4. Ferramenta com resultado desconhecido não é repetida; o agente pede inspeção ou apresenta opção clara.
5. Se a pasta mudou ou não é acessível, continuidade é bloqueada com estado explicável; não grava fora do território.
6. Mapa liga cada afirmação do checkpoint à evidência original/estado observado.

## Testes propostos

Simular F5/restart em cada ponto: antes de tool, aguardando approval, tool em execução, após escrita, após retorno; divergência Git/arquivo; pasta removida; estado `Map` perdido; sem Git; sem permissões; mudança de provedor. As provas devem confirmar ausência de requests espontâneos e repetição de effects.