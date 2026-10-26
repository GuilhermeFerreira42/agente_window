# M5 — Memória persistente de projeto (proposta; posição hipotética 17)

**Status:** rascunho não aprovado.  
**Objetivo:** manter fatos úteis entre conversas do mesmo projeto, distintos de transcript e checkpoint, com inspeção e controle humano.

## Escopo

- Começar, se aprovado, com escopo **de projeto**, particionado pela identidade estável do projeto/workspace. Memória de tarefa permanece no checkpoint; preferência global de usuário fica fora.
- Registros com `memoryId`, projeto, tipo, conteúdo, estado (`confirmed/provisional/superseded`), origem (`chatId/messageId` ou arquivo), timestamps, revisão e motivo de atualização.
- Permitir listar, consultar, adicionar, corrigir/substituir e excluir; o usuário vê origem e escopo.
- Auto-carregamento só de memória curta explicitamente configurada; o restante é consultado sob demanda para controlar tokens.
- Resumos e citações preservam proveniência; conflito entre registro antigo e decisão atual é apresentado, não resolvido por preferência implícita do agente.
- Scrub de segredos/credenciais e limites de retenção/exportação.

## Fora de escopo

Memória global entre projetos; gravação silenciosa de fatos; síntese de todos os chats automaticamente; embedding/vector store; permissão para executar instruções antigas.

## Dependências e superfícies candidatas

M2 para referências confiáveis; M3 para diferenciar checkpoint; repositório de dados em `~/.agente_window` (forma não definida); uma Casa/porta aprovada; UI acessível. Não gravar automaticamente `MEMORY.md` no workspace sem decisão de privacidade e versionamento.

## Critérios de aceite propostos

1. Memória nova indica projeto, origem/data e estado; usuário consegue inspecionar e corrigir.
2. Registros de projeto A não aparecem no B; memória removida não retorna em consulta nem via cache/índice.
3. Atualização cria histórico de proveniência ou substitui de modo auditável; “superseded” não é apresentado como decisão vigente.
4. Nenhum segredo canário é salvo; texto não confiável continua marcado como informação histórica.
5. Memória fora do prompt não é carregada; inclusão no contexto relata token/proveniência no M1.
6. Falha de storage não impede chat nem apaga transcript/checkpoint.

## Testes propostos

CRUD, conflito/supersedência, isolamento por slug, migração/backup, fonte deletada, secret scrub, limite de contexto, concorrência de edição, exclusão e restauração. Teste de uso confirma que memória não é injetada globalmente sem configuração.

## Decisões pendentes

Formato (SQLite/JSONL/Markdown), schema e ciclo de aprovação; política de retenção/backup; quais tipos entram (decisões, fatos técnicos, preferências); se pode haver escrita automática com confirmação; auto-load versus tool explicitamente chamada.