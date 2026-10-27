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

## Capability de tool calling (F5-B)

O catálogo dinâmico registra `declared`, `verified`, `unknown` ou `incompatible` por par
exato `(providerId, modelId)`. O estado `verified` só é liberado depois de um round-trip
com o adaptador Agir e o endpoint/protocolo configurados. A prova server-side é vinculada
por fingerprint à configuração relevante e à versão do adaptador; endpoint, credencial,
parâmetros de chamada, remoção do modelo da lista habilitada ou versão incompatíveis fazem a prova deixar de valer. Provedor/modelo desabilitado bloqueia Agir enquanto estiver indisponível.
O fingerprint não é enviado à interface, e segredo/token não entra no registro de resultado.

A pessoa precisa marcar consentimento explícito na interface antes de `POST
/api/providers/tool-calling/verify`. O aviso informa que o canary pode fazer até duas
requisições e consumir créditos/custos. Ele anuncia apenas `ler`, usa um caminho e um
marcador aleatórios inertes em memória e nunca passa por executor de workspace, filesystem,
shell ou ferramentas com efeitos externos. O canary não concede grants nem altera as
políticas do agente. Só uma prova válida `verified` libera o gate de Agir; estado ausente,
`declared`, `unknown` ou `incompatible` permanece bloqueado. Erros transitórios de rede,
autenticação e HTTP genérico permanecem `unknown`; incompatibilidade exige recusa explícita de tool calling, requisito de campo que o adaptador não preserva ou parâmetro do adaptador explicitamente recusado.

O estado `declared` é reservado para declaração confiável futura; a listagem `/models` e o
nome de modelo não são tratados como declaração de suporte. Nenhum round-trip com provedor
real foi autorizado ou executado nesta implementação; testes usam `fetch` simulado e
credencial fixture fictícia.

## Testes desta casa
`__tests__/registro.test.ts` (catálogo) · `__tests__/providersRepo.test.ts` (arquivo,
migração com backup, máscara, precedência, tranca do `.gitignore`) · `__tests__/probe.test.ts`
(sucesso, 401, serviço que não lista, sem chave, timeout de 10 s — com `fetch` mockado) ·
`__tests__/frontier.test.ts` (ninguém importa abaixo do barrel) · `__tests__/rotas.test.ts` (rota F5-B sem consentimento/sem chamadas e round-trip sanitizado com mock) · `ui/__tests__/ProvidersView.test.tsx` (aviso, checkbox de consentimento e ação) · `agir/__tests__/toolCallingCapability.test.ts` (round-trip, cache, falhas transitórias, incompatibilidade explícita e corrida de configuração, tudo com `fetch` simulado) · E2E `provedores_fatia08.spec.ts`.
