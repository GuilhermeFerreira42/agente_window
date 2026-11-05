# Casa Provedores — cartão de visita

**Bairro:** 2 · Inteligência (D69/D76). **Nasceu na:** FATIA 08 — Conectar (15/10/2026).
**Sinônimos de leitura:** "a tela de Provedores", "configuração de IA".

## O que esta casa faz
Guarda **quais serviços de IA** o dono usa e como falar com cada um: chave, endereço,
modelo escolhido e ajustes (contexto, máximo de saída, temperatura). É ela quem
**testa a conexão** de verdade (a chamada sai do servidor) e quem diz para o resto do
app qual é o **provedor ativo** — o que o chat vai usar na FATIA 09.

## Como falar com a casa (fronteira LEGO)
De fora, importe **apenas** `./bairros/2-inteligencia/casas/provedores` (o `index.ts`).
A "prefeitura" do servidor (`src/server/session-persistence`) fala com `server/rotas.ts`.
Nada de importar arquivo interno de outra casa (o teste `__tests__/frontier.test.ts` vigia).

## Mapa das pastas
- `contract.ts` — os tipos da porta (sem `any`).
- `descritores/` — **um verbete de dado por provedor** (D82) + `registro.ts` (a lista oficial).
  Acrescentar um provedor = criar 1 arquivo e registrá-lo. Nada de tela aqui.
- `ui/` — a tela (`ProvidersView.tsx`) + `client/api.ts` (chamadas ao servidor).
- `server/` — `providersRepo.ts` (arquivo de configuração, migração, máscara, reveal),
  `probe.ts` (sonda de conexão por protocolo), `rotas.ts` (endpoints, incluindo a verificação opt-in de tool calling).
- `providers.css` — estilos (tokens do tema, sem cor solta).

## Decisões que mandam aqui (docs/05 e docs/06 PARTE 2B)
- **D81:** a chave mora em `~/.agente_window/providers.json` — **fora do projeto**, 0600,
  backup `.bak-<carimbo>` antes de reescrever. O `.gitignore` do repo é a segunda tranca.
- **D82/D82a:** 7 nativos (OpenAI · NVIDIA · Anthropic · Gemini · Ollama · OpenRouter ·
  DeepSeek) + **1** genérico "Compatível com OpenAI" (o dono troca o serviço quando quiser).
- **D83:** a chave aparece **mascarada** (`••••a1b2`); o "olhinho" busca a chave inteira
  em `POST /api/providers/reveal` (`Cache-Control: no-store`). Nunca em log, nunca em URL.
- **D84:** chave **salva manda**; variável de ambiente é reserva e a tela mostra a origem.

## Modelos no modo Agir (F5-B, regra vigente D122)

O seletor mantém `Auto` e os pares explícitos `(providerId, modelId)` habilitados. Ao
iniciar Agir, o servidor envia diretamente o pedido normal com o anúncio de ferramentas
nativas do protocolo; não consulta `verified`, não exige capability conhecida e não roda
canary. Uma resposta textual comum, sem chamada de ferramenta, é uma conclusão válida.

Se o provedor rejeitar o pedido, a interface mostra o erro HTTP tipado e o detalhe legível
que o próprio serviço retornou, com redação de credenciais. Isso não muda o modelo, não
faz fallback e não bloqueia uma tentativa futura. A seleção/Auto, validação de habilitação,
Manual/Permitir tudo e os quatro modos continuam independentes; Perguntar/Planejar seguem
read-only, e Permitir tudo não é Autopilot nem contorna validação do servidor.

Arquivos v4 antigos ainda podem conter `toolCallingAssessments`; a leitura ignora esse
campo legado e um salvamento normal o omite. Nenhum fluxo atual consulta ou grava essas
avaliações.

## Testes desta casa
`__tests__/registro.test.ts` (catálogo) · `__tests__/providersRepo.test.ts` (arquivo,
migração com backup, máscara, precedência, tranca do `.gitignore`) · `__tests__/probe.test.ts`
(sucesso, 401, serviço que não lista, sem chave, timeout de 10 s — com `fetch` mockado) ·
`__tests__/frontier.test.ts` (ninguém importa abaixo do barrel) · `__tests__/rotas.test.ts` (rota de verificação removida; GET do catálogo sem evidência/capability) · `ui/__tests__/ProvidersView.test.tsx` (configuração preservada sem prova) · `agir/__tests__/rotas.test.ts` (modelo sem capability inicia com ferramentas; resposta sem ferramentas é aceita; rejeição real mostra detalhe sem fallback) · `agir/__tests__/vizinho.test.ts` (protocolos/streaming e erros upstream) · E2E `provedores_fatia08.spec.ts`.
