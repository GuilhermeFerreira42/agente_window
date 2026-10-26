# Resumo executivo — memória, continuidade e medição de contexto

**Status:** investigação concluída para revisão; proposta não aprovada, sem implementação.  
**Data:** 22/10/2026.

## Conclusão principal

O Agente Window já mantém histórico de conversas por sessão/chat e consegue restaurar a timeline, mas **não tem memória de contexto**, compactação/checkpoint, busca de transcript nem retomada durável de uma execução. As mensagens elegíveis do chat atual são reenviadas como texto a cada turno. Ferramentas funcionam dentro de uma execução Agir, mas o transcript posterior conserva apenas cartões/resumos visuais — não a troca estruturada completa que o runtime usou.

O indicador já existe visualmente em `ChatInput.tsx`, porém **não mede contexto**: é um percentual inventado a partir do rascunho digitado e da quantidade de anexos, limitado a 92%. Não inclui histórico, modelo efetivo, limite do provedor, instruções, schemas/chamadas/resultados de ferramentas ou tokens reportados. O tooltip declara “% do contexto utilizado”, portanto hoje induz a uma leitura falsa.

## Achados de maior impacto

1. **Histórico ≠ prompt:** SQLite guarda metadados da sessão e JSONL por sessão guarda as mensagens da UI; a montagem do prompt é outra operação. O JSONL é reconstruído/regravado integralmente em cada salvamento, com escrita temporária + rename. Isso preserva o histórico restaurável, mas não equivale a um log incremental append-only.
2. **Perda de fidelidade das ferramentas entre turnos:** `rodarAgir` inclui chamadas e conteúdo de resultados no diálogo interno durante o loop. No turno seguinte `montarHistorico` projeta apenas `{role, content}` das bolhas. Os cartões da UI guardam resumo/estado/alvo, não o conteúdo bruto completo enviado ao modelo.
3. **Sem compactação e sem busca:** `/api/chat` transforma 413 em erro honesto, sugerindo conversa nova/remover mensagens; não existe checkpoint por chat. Não foi encontrado mecanismo de busca manual da timeline de chat nem busca do agente em chats anteriores. A busca do Editor é busca de arquivos, não transcript.
4. **Indicador sem integração:** `ProvidersView` salva `contexto` e `maxSaida`, mas o `AlvoConversa` não recebe o limite `contexto`; `contexto` não aparece no pedido. O seletor visível de modelo é mock (Auto/Claude/GPT); quem efetivamente responde é o provedor/modelo ativo em Provedores. Não se deve usar o rótulo local do composador como limite real.
5. **Contagem real não chega à UI:** não foi encontrado tokenizer, campo de uso do provedor nem conversão de usage nos SSEs atuais. `Conversa` lê texto da resposta; `Agir` lê texto e tool calls. `maxSaida` só é passado no protocolo Anthropic; os demais pedidos não aplicam esse ajuste.
6. **Reinício não retoma execução:** `working` vira `completed` na restauração; retomar Agir após teto/erro transitório depende de `Map` em memória do servidor, com até 20 itens. Reinício do servidor perde esse estado e a rota responde 409. Abrir transcript e reviver um processo são capacidades distintas.

## Recomendação para discussão

Planejar em camadas, sem inventar um sistema paralelo nem decidir banco antes dos testes:

- medir o **pedido efetivo** e tornar o indicador honesto (reportado pelo provedor / estimado localmente / indisponível), usando o modelo efetivamente selecionado;
- dar identidade e ordem estáveis ao transcript e persistir chamadas/resultados de ferramenta em formato reconstruível;
- adicionar checkpoint de compactação por chat, com proveniência/fingerprint/fronteira e cauda recente completa, sem substituir mensagens originais;
- separar busca humana, recuperação automática do agente e recuperação de execução; começar com pesquisa lexical por fonte original no mesmo chat, não com embeddings;
- tratar busca automática em outros chats como capacidade posterior, isolada e opt-in, não pré-requisito da primeira entrega;
- após interrupção, reconstruir a tarefa com validação do workspace/Git; não repetir ações com efeitos colaterais automaticamente.

O padrão convergente das referências é **transcript preservado + projeção de contexto/checkpoint + faixa recente**, não apagar o histórico. As referências não justificam, por si, transplantar código inteiro.

## Condição documental relevante

A documentação oficial atual diz que Fatia 11 foi homologada; `docs/06` registra a Fatia 12 (DELETE) com SPEC fechada, aguardando ordem, e depois Fatia 13 (terminal para o agente). O anexo de 22/10 descreve “prosseguir a partir da Fatia 13”. Esta proposta mantém a 12 onde está e examina inserir M1–M8 depois dela e antes da antiga 13. É somente um cenário para avaliação; não altera o roadmap.

## Decisões que dependem do dono

- Qual nível de precisão do indicador é aceitável antes do envio quando o provedor não oferece contagem exata? Como mostrar a estimativa e o último uso reportado sem confundi-los?
- `contexto` em Provedores é limite informado pelo dono, padrão do descritor ou metadado confirmado do modelo? Deve haver origem/confiança visível?
- A primeira implementação deve incluir apenas continuidade no mesmo chat, ou já memória de projeto? A proposta recomenda separar.
- Busca automática cross-chat deve permanecer totalmente fora da primeira entrega (recomendação), ser habilitável após pergunta explícita ou começar por uma chamada explícita do usuário?
- Retenção, exportação e exclusão de transcripts, checkpoints, índices e memórias; política para envio de dados a provedores externos.
- Confirmar as fatias futuras e se/como renumerá-las após revisão.

## Limites da investigação

Foi feita leitura estática do workspace em `/home/user/agente_window`, documentação canônica, material anterior e snapshots/código de referência. O caminho não contém `.git` neste workspace: `git status` e `git log` não puderam estabelecer revisão/alterações. Não foram executados build, testes ou benchmarks. Os detalhes reproduzíveis e arquivos auditados estão em [`02_ESTADO_ATUAL_E_EVIDENCIAS.md`](02_ESTADO_ATUAL_E_EVIDENCIAS.md) e [`03_COMPARATIVO_REFERENCIAS.md`](03_COMPARATIVO_REFERENCIAS.md).