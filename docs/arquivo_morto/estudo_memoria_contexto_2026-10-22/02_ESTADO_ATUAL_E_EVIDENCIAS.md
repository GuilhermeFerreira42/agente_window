# Estado atual do Agente Window — inventário e evidências

**Data da leitura:** 22/10/2026. **Modo:** inspeção estática; sem edição de código, build, teste ou execução de provedor.  
**Identidade da revisão:** `/home/user/agente_window` não é repositório Git neste workspace; não há HEAD/status disponíveis. Os caminhos abaixo identificam os arquivos lidos, não um commit.

## 1. Persistência de sessão e transcript

| Evidência | O que o código faz | Interpretação/limite |
|---|---|---|
| `src/server/session-persistence/database.ts`: `sessions`, `upsertSessionRecord`, `session_json` | SQLite (`better-sqlite3`) guarda índice/metadata e sessão serializada; WAL e chaves estrangeiras são habilitados. | Não é o transcript de mensagens fonte. |
| `src/server/session-persistence/paths.ts`: `getDatabasePath`, `getProjectsDir` | Raiz padrão `~/.agente_window/`; DB `agente_window.db`; projetos em `projects/<slug>/`. | Ambiente fixture pode sobrescrever paths. |
| `src/server/session-persistence/transcripts.ts`: `readTranscript`, `writeTranscript` | JSONL por sessão; writer serializa todas as entradas recebidas para `.tmp` e faz `rename`. | Gravação é atômica no arquivo final, mas reescreve o transcript inteiro por salvamento; não é append-only físico. |
| `src/server/session-persistence/index.ts`: `transcriptEntries`, `restoreMessages`, `saveSession` | Cada bolha não-running vira `{type, chatId, message, uuid: message.id, timestamp}`; mensagens são reagrupadas pelo `chatId` ao restaurar. O timestamp é sintético, calculado no salvamento. | A ordem no array é relevante, mas não há sequência monotônica de mensagem independente nem intervalo de checkpoint. `message.id` existe, mas o contrato é baseado em texto/bolha UI. |
| `src/types.ts`: `ChatMessage`, `FerramentaNoChat` | Mensagem guarda texto, anexos de referência e cartões de ferramenta/continuar. | Não define eventos estruturados completos de chamada e resposta do modelo/ferramenta. |

## 2. O que é enviado ao modelo

### Conversa

- `src/App.tsx`, função `montarHistorico` (~1660): filtra mensagens `running`, `cancelled`, `erro` e conteúdo vazio; projeta cada uma em `{role, content}`.
- `handleSend` (~1957–2000) monta o histórico elegível do chat corrente e adiciona a nova mensagem do usuário. Não adiciona mensagens de outro chat.
- O texto do anexo é `Arquivos anexados: <nomes>`; `Attachment` contém ID, nome e tipo, não bytes. A tela não lê o conteúdo do arquivo por esse caminho.
- `src/bairros/2-inteligencia/casas/conversa/contract.ts` limita a mensagem do pedido a `role` e `content`. `server/rotas.ts` valida o array e passa-o a `executarConversa` sem compactação.
- `server/requisicao.ts` constrói pedidos OpenAI Chat, Anthropic Messages, Gemini e Ollama. Não adiciona telemetria de contexto nem tratamento de usage. `conversar.ts` extrai texto; status 413 vira erro “histórico ... grande demais”, sem fallback/compactação.

### Agir e chamadas de ferramenta

- `src/bairros/2-inteligencia/casas/agir/server/rotas.ts`: a tela envia histórico textual simples, fluxo, workspace e permissões. A rota cria `MensagemAgir` para a execução.
- `agir.ts` mantém em memória o diálogo do loop; acrescenta pedido do assistente e resposta da ferramenta. Isso preserva a sequência **durante aquele fluxo**.
- `vizinho.ts` combina diálogo traduzido por protocolo (`dialogo.ts`) com catálogo/schema de cinco ferramentas (`anuncio.ts`). Ambos entram no pedido ao modelo, logo consomem contexto. Resultado de `ler/listar/buscar` também pode entrar como conteúdo literal em `MensagemAgir`.
- `App.tsx` converte eventos em cartões visuais. `FerramentaNoChat` guarda alvo, prévia opcional, estado e resumo. A próxima chamada `montarHistorico` ignora os cartões e envia só `{role,content}`. **Confirmado em código:** o payload interno da iteração não é persistido como transcript conversacional completo; o resumo visível não é o conteúdo bruto completo.
- `retomarPorFluxo` é `Map` volátil, no servidor, limitado a 20 retomadas. Os cartões de “Continuar” não persistem o payload necessário. Após reinício, a retomada exata não está disponível.

## 3. Auditoria do indicador de contexto

### Origem visual e de dados

- Arquivo: `src/components/ChatInput.tsx`, linha aproximada 156: `Math.min(92, 18 + Math.round(text.length / 9) + attachments.length * 4)`.
- Renderização: mesmo arquivo, ~693–695; exibe `%`, barra CSS inline e `title` “% do contexto utilizado”. Estilo em `src/styles/app.css` (~1983–2003), largura fixa 42px e cor azul.
- Entrada da fórmula: texto ainda no composador (`text.length`) e número de referências anexadas. Não depende do estado de `activeChat.messages`, da chamada `/api/agir`, do provedor ou da resposta.
- A porcentagem começa em 18%, sobe por caracteres/anexo e **nunca supera 92%**. Não existe caso 0%, 100%, overflow ou estado desconhecido. Não foi encontrado teste que valide a fonte/semântica desse número.

### Por que o percentual não representa consumo

1. Exclui o transcript anterior, embora ele seja enviado a cada nova mensagem.
2. Conta o rascunho antes de enviar; ainda não é o payload atual do modelo.
3. Conta cada anexo como +4%, embora o caminho atual envie só nomes (sem bytes/conteúdo).
4. Ignora modelo/provedor efetivos, `contexto`, `maxSaida`, mensagens de sistema, schemas de ferramentas, chamadas, resultados, resumo/checkpoint e dados de uso reportados.
5. Limita a 92%, portanto não consegue representar aproximação real de limite/overflow.

### Limite/modelo disponível no projeto

- `provedores/contract.ts`: cada provedor tem `contexto?` e `maxSaida?`; `Descritor.padroes` contém defaults de contexto por provedor (não por modelo).
- `ProvidersView.tsx` oferece campos “Contexto (tokens)” e “Máximo de saída”. `providersRepo.ts` persiste número positivo e monta `estadoParaTela` com defaults.
- `server/chatAlvo.ts` resolve provedor/modelo ativos, mas preenche `AlvoConversa` com protocolo, URL, modelo, chave, temperatura e `maxSaida`; não passa `contexto`. `conversa/contract.ts` também não tem campo de limite.
- O seletor em `ChatInput.tsx` é uma lista estática/mock. Em `App.tsx`, a seleção aparece em metadata da bolha; a chamada real resolve o alvo pelo provedor ativo. A divergência está também registrada como DEBT-14 em `docs/06`.
- No pedido, `maxSaida` é aplicado apenas em Anthropic (`max_tokens`) para Conversa e Agir; não é aplicado em OpenAI/Gemini/Ollama. Não há tokenizador nem parser de `prompt_tokens`, `input_tokens`, `usageMetadata`, `prompt_eval_count` ou equivalentes identificado no app.

**Conclusão:** o widget é protótipo visual com alegação de precisão indevida; precisa ser conectado à fronteira de montagem/envio do prompt, e não corrigido só por UI.

## 4. Busca, memória e continuidade

- Não foi localizada busca manual dedicada ao transcript nos componentes de Chat; `domain/search`/`EditorArea` cobre conteúdo de workspace.
- Nenhum checkpoint/resumo derivado por chat foi localizado no banco/JSONL ou nos contratos de Conversa/Agir.
- Não foi localizada tool de busca do agente em chats antigos. A pesquisa de arquivos da ferramenta `buscar` pesquisa nomes de arquivo no workspace, não mensagens.
- `sanarStatusAposF5` muda estados de sessão/chat `working` para `completed`; mensagens `running` não são persistidas. Isso evita bolha vazia eterna, mas não reconstrói execução/processo.
- O `+` de continuidade não significa replay: `/api/agir/continuar` usa estado em memória e pode dar 409 após reinício. Não existe revalidação persistida de efeitos no workspace/Git.

## 5. Documentos canônicos e divergência documental

- `docs/06 - PROXIMAS FASES E DIVIDAS.md` mantém uma linha DEBT-13 que diz “sem medidor”, embora hoje exista o medidor visual; a redação é correta apenas para ausência de **medidor funcional**. Esta análise não a corrigiu.
- `docs/06` registra Fatia 11 homologada, Fatia 12 DELETE com SPEC fechada aguardando ordem, Fatia 13 Terminal-para-o-agente, e sequência 14–20. A instrução anexada menciona “retomar na 13”; o mapa deste pacote preserva a 12 decidida e avalia inserção de M1–M8 antes da antiga 13.
- Foram observadas diferenças históricas entre `docs/02`, `docs/03` e `docs/06` quanto a roadmap/numeração, inclusive blocos legados dentro dos canônicos. Não são corrigidas aqui; prevalece a decisão vigente de `docs/05`/`docs/06` e a validação do dono.

## 6. Superfícies relevantes para revisão posterior

**Fronteiras de domínio:** `src/bairros/2-inteligencia/casas/{conversa,agir,provedores,config}/{contract.ts,index.ts,server/...}`.  
**Composição/persistência:** `src/server/session-persistence/{index.ts,database.ts,transcripts.ts,paths.ts,chatAlvo.ts}`.  
**UI:** `src/components/{ChatInput.tsx,ChatPanel.tsx}`, `src/types.ts`, `src/styles/app.css`.  
**Testes existentes próximos:** `src/__tests__/ChatInput.test.tsx`, `ChatPanel.test.tsx`, `src/bairros/2-inteligencia/casas/{conversa,agir,provedores}/__tests__/`, `src/server/session-persistence/*.test.ts`, `src/__tests__/chatStreamingFatia09.test.tsx`.

## 7. Evidência negativa e limites

A ausência de um recurso significa “não encontrado nos caminhos auditados”, não prova sobre plugins externos. `grep` recursivo não encontrou tokenizadores/usage no `src` auditado; não executamos a aplicação para observar tráfego. O conteúdo do provedor pode incluir instruções internas que não são visíveis no código local; por isso, antes do retorno do provedor uma estimativa local pode não ser exata. Nenhum arquivo foi modificado.