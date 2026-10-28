# Auditoria Windows — correções estreitas e resultados

**Data:** 2026-10-27

**Escopo:** F3 (cancelamento/publicação), F5-A (persistência do modo Perguntar) e ACL do arquivo de credenciais. D98 e Fatia 13 não foram iniciados.

## Contexto e limite do relatório

O arquivo de relatório Windows citado anteriormente não foi encontrado em `docs/09 - TESTES E AMBIENTE.md`; a nota abaixo registra os achados F3, F5-A e ACL descritos na solicitação e os resultados efetivamente observados neste workspace. Não afirma que cobre outros itens do relatório não fornecidos.

## Correções

### F3 — fronteira de cancelamento

- O servidor acompanha as mutações de arquivo `criar`/`escrever` já iniciadas e aguarda a Promise antes de responder ao endpoint de cancelamento.
- A fronteira do ACK é a publicação efetiva: se não houve efeito publicado, o estado é `cancelled`; se a mutação já terminou com sucesso, o estado é `cancelled_with_effects`. O servidor emite o resultado da ferramenta antes do ACK nesse caso.
- O cliente/UI reconhece `cancelled_with_effects` e informa que as alterações concluídas foram mantidas; não afirma que foram revertidas.
- Teste concorrente em `src/bairros/2-inteligencia/casas/agir/__tests__/rotas.test.ts` segura o executor por uma barreira, comprova que o ACK fica pendente, então libera a publicação e verifica arquivo, `tool_result` e resposta. Teste UI correspondente em `src/__tests__/App.test.tsx`.

### F5-A — modo Perguntar

- `agent`, `edit`, `ask` e `plan` são restaurados/persistidos em `localStorage` por chave de chat. Valores desconhecidos são ignorados.
- Isto guarda somente a preferência de interface; não grava nem amplia grants, approvals ou permissões.
- Teste de remount em `src/__tests__/App.test.tsx` seleciona Perguntar, desmonta/remonta a aplicação e confirma que o modo e o valor persistido continuam `ask`.

### ACL Windows — credenciais

- `0o600` continua aplicado para POSIX, mas não é tratado como proteção de ACL no Windows.
- Em Windows, PowerShell define uma DACL protegida, remove regras anteriores/herdadas, concede Full Control ao SID do usuário atual e verifica o resultado (SID, regra Allow, Full Control, não herdada e sem outras ACEs). Falha ao aplicar/verificar bloqueia leitura/gravação.
- Arquivos existentes (`providers.json`, backups e temporários) são protegidos antes da leitura. Novas gravações e backups são criados com ACL antes dos bytes de conteúdo; a gravação principal usa temporário privado, rename e verificação final.
- O teste Windows em `src/bairros/2-inteligencia/casas/provedores/__tests__/providersRepo.test.ts` usa somente a fixture `fixture-not-a-real-key`. Ele cria um arquivo preexistente herdando ACL, confirma a restrição depois da leitura, salva duas vezes e verifica o DACL do arquivo principal e backup. O teste é ignorado fora de Windows; a eficácia real ainda depende de executá-lo em Windows.
- Limite residual: a DACL restringe outros usuários/principals, mas não é isolamento contra outro processo executado sob o mesmo SID. As operações Node/PowerShell continuam sujeitas a uma corrida se processo da mesma conta substituir caminhos durante syscalls; não foi introduzido um helper nativo nem contenção do SO.

## Resultados de validação neste workspace Linux

| Verificação | Resultado observado |
|---|---|
| `npm ci --ignore-scripts` na raiz `platform/` | Concluído. NPM informou 10 vulnerabilidades no conjunto do lockfile (4 moderadas, 2 altas, 4 críticas); não foi executado `npm audit fix`. |
| `npm rebuild node-pty better-sqlite3` | Concluído com sucesso para habilitar dependências nativas locais. |
| `npm run typecheck` em `apps/workbench-v2` | Passou (`tsc -b --force`). |
| Testes F3 e repositório de provedores | `rotas.test.ts` + `providersRepo.test.ts`: 45 passaram, 1 ignorado (teste DACL, apenas Windows). |
| Testes UI F3/F5-A | `App.test.tsx`: 49 passaram, 13 ignorados. Inclui os dois testes adicionados nesta correção. |
| ESLint dirigido | Passou nos arquivos alterados exceto `App.tsx`; em `App.tsx` foram reportados 20 erros e 1 warning em outras linhas, sem erro nas linhas modificadas. O baseline desses achados não foi medido nesta execução. |
| `npm run lint` global | Falhou: 103 erros e 19 warnings em arquivos diversos do projeto. Não foram alterados testes/arquivos alheios para mascarar as falhas. |
| `npm run build` | `build:fs-boundary` desabilitou a fronteira nativa pelo guard existente (“concurrent parent-directory rename is not contained”); em seguida Vite iniciou, mas o processo excedeu o heap disponível (~915 MB usados / limite ~944 MB) e abortou por OOM. Typecheck separado passou. |

## Repetição no Windows pelo Codex

Em um checkout Windows com Node/npm compatíveis:

```powershell
Set-Location platform
npm ci
Set-Location apps/workbench-v2
npx vitest run src/bairros/2-inteligencia/casas/provedores/__tests__/providersRepo.test.ts --reporter=dot
npx vitest run src/bairros/2-inteligencia/casas/agir/__tests__/rotas.test.ts src/__tests__/App.test.tsx --reporter=dot --silent
npm run typecheck
```

Critério específico da ACL: o teste Windows deve executar (não aparecer como skipped) e validar SID atual, somente uma ACE Allow não herdada com Full Control, tanto no arquivo principal quanto em cada backup. Não usar arquivo de credenciais real. Registrar separadamente qualquer falha de PowerShell/ACL, teste, lint ou build; não substituir por uma verificação baseada apenas em bits POSIX.
