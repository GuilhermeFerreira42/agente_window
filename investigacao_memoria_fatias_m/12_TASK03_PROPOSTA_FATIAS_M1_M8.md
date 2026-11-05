# 12 — TASK 03 · Proposta técnica revisada das Fatias M1 a M8

**Data:** 2026-10-30 (America/Sao_Paulo)
**Natureza:** **PROPOSTA**. Não é SPEC aprovada, não é decisão, não é roadmap, não é homologação, não autoriza implementação.
**Base exclusiva:** conclusões verificadas da [`11_TASK02_CONSOLIDACAO_DA_INVESTIGACAO.md`](11_TASK02_CONSOLIDACAO_DA_INVESTIGACAO.md) + contratos e decisões já existentes (`docs/04`, `docs/05`, `docs/06`).
**Limites respeitados:** nenhum código alterado · nenhuma documentação canônica alterada · nenhuma sequência canônica alterada · nenhuma fatia criada oficialmente · nenhum commit · nenhum push.
**Rótulos M:** conforme `docs/02 §4`, *"os rótulos M não são números oficiais de fatia"*. Nada aqui os promove.

### Como ler cada contrato

| Marca | Significado |
|---|---|
| ✅ **DECIDIDO** | decisão já fechada pelo dono em `docs/05` (D1–D126) ou homologação já registrada em `docs/08`. **Não reabrir aqui.** |
| 🆕 **PROPOSTA** | proposta nova desta Task 03, derivada de evidência da Task 02. Precisa de aprovação. |
| ⏳ **PENDENTE DE APROVAÇÃO** | o contrato **não pode ser fechado** sem decisão do dono. Aponta para DP-01…DP-06 da Task 02. **Não foi inventada solução.** |
| 🔎 **HIPÓTESE** | precisa de validação medida antes de virar requisito. Aponta para H1…H10 da Task 02. |

Referências a **P#**, **R#**, **H#**, **DP-#**, **RD-#** e **R-#** são aos itens numerados da Task 02.

---

## PARTE A — Revisão do desenho das fatias

### A.1 O que muda em relação às propostas de 22/10 (com justificativa)

| # | Mudança proposta | Justificativa (evidência da Task 02) |
|---|---|---|
| **S1** | **M1 dividido em dois estágios internos: M1-a (contrato + estado honesto) e M1-b (captura real de `usage`).** M1-a **não** depende de credencial; M1-b depende. | P10 (nenhum código lê `usage`) + P8 (o denominador **já existe** nos 8 descritores e já é validado/normalizado) + bloqueio registrado de credencial (`08_PROVAS_TECNICAS §4`, D91/D99). Sem essa divisão, M1 inteiro fica bloqueado por uma credencial e **atrasa M2**, que não precisa dela. |
| **S2** | **M3 renomeado para "Compactação e Projeção de Contexto"** e dono explícito do contrato de montagem do request. | **DP-06.** Hoje a montagem é `montarHistorico` no `App.tsx:1678` (browser, reduz a texto). Com M1/M2/M3/M6 a montagem passa a depender de dados do servidor. `docs/04 §1` regra 3 proíbe `App.tsx` de crescer; ninguém nas propostas de 22/10 nomeava esse dono. Atribuir a M3 evita criar uma 9.ª fatia. |
| **S3** | **M3 ganha um primeiro estágio sem LLM:** poda determinística + *pruning* de tool result + corte seguro por pareamento de ferramentas. A sumarização por modelo vem depois. | R20 (OpenClaude preserva system/recentes/tools/erros e cai para 10% da janela **antes** de qualquer LLM) + R4/DSH (*"can advance the surface **without a summary**"*) + R2 (`toolPairingBalancedBefore/After`, determinístico e com falha fechada). Isso **desacopla M3 de H3/H4/H5** (credencial, latência de modelo auxiliar, comportamento de 413). |
| **S4** | **M4 e M6 compartilham uma única infraestrutura de busca** — um serviço/porta com **dois escopos** — mas continuam fatias separadas, com aceites separados. | **RD-8.** DSH expõe `searchEvents(sessionId)` e `searchSessions()` no **mesmo** seam (R7). Duas implementações de índice seriam dívida criada de propósito. |
| **S5** | **M4 indexa o texto que o usuário vê**, não a serialização voltada ao modelo. Forma desconhecida indexa **vazio**. | **R15** (OpenClaude documentou *phantom matches*: indexar o `content` voltado ao modelo fez `/malware` casar com um lembrete de sistema que nunca aparece na tela). Alinhado ao requisito de Confiabilidade do dono. |
| **S6** | **M8 estreitado**: sai tudo que a Task 01 já entregou; entra só o que **só existe quando houver derivado**. | **RD-2** + P3/P4. Concorrência de writer, atomicidade, revisão monotônica e recuperação de 409 **já estão aprovados tecnicamente**. Manter isso em M8 seria reabrir trabalho fechado e inflar a fatia. |
| **S7** | **M8 deixa de ser só a última fatia e vira também um conjunto de gates aplicados a cada entrega.** | O padrão já é do projeto: `docs/04 §1.5` exige *"demonstrar segurança e comportamento por testes reproduzíveis no produto antes de declarar adoção"*, e `docs/08` exige evidência por cenário. Isolamento, segredos e cascata de exclusão **não podem** ser deixados para o fim. |
| **S8** | **M7 explicitado como consumidor do log durável de M2**, proibido de criar um segundo armazém operacional. | §2.4: `retomarPorFluxo` já guarda `MensagemAgir[]` fiéis — a informação existe, só é volátil. `docs/04 §1.5` condição (4): *"não duplicar catálogo, executor, permissões/aprovações, persistência ou fluxo de sessão"*. |
| **S9** | **M5 sem extração automática no primeiro corte** — memória explícita/curada. Extração automática fica **fora**, ligada à DP-02. | **DP-02** (fork de agente × "Agent Loop único") + RD-10: **3 das 4 referências de código não fazem extração automática** (VS Code = curada por ferramenta com confirmação; DSH = terceirizada e default-off; OpenCode = não tem). Só OpenClaude faz, e **com aprovação de escrita por padrão**. |
| **S10** | **Memória global de usuário fica FORA de M5** e é registrada como decisão própria do dono, com requisitos mínimos já observados. | **DP-05** + RD-10 + §3.5. O dono pediu os três escopos; a evidência mostra que o escopo global **não tem precedente de implementação segura** nas referências de código, e o único precedente em produto tem crítica pública registrada (dossiês horários; *"may still remember information it learned from what you deleted"*). |
| **S11** | **Nenhuma fatia M usa embeddings, banco vetorial ou serviço remoto.** Busca = FTS5 léxico + filtros; opcionalmente re-rank por modelo, **desligável**, com fallback puramente léxico. | §9.3 da Task 02: **nenhum** dos quatro projetos de código usa embeddings para recuperar conversa; o servidor de memória de referência do ecossistema MCP faz *"case-insensitive substring matching […] not semantic retrieval"*. ✅ Além disso, D105 (acesso exclusivamente local) e `docs/02 §1.5` (armazenamento local, nenhuma telemetria externa presumida) já restringem. |
| **S12** | **Todo derivado (índice, checkpoint, memória, spill) nasce com ciclo de vida descartável**: versão de schema, identidade de aplicação, reset/reconstrução in place, e **nunca** pode impedir salvar/reabrir conversa. | **R1** (DSH: schema v8, `application_id`, *"Incompatible versions reset in place"*, recusa de banco estranho, `wx`+0600/0700) + critérios de M4 de 22/10 (*"Índice ausente/corrompido pode ser reconstruído e nunca impede salvar/reabrir chat"*). É a disciplina que torna H7 e R-3 administráveis. |

### A.2 Sobreposições encontradas — e o que **não** foi fundido

| Par | Sobreposição aparente | Veredito |
|---|---|---|
| **M4 × M6** | ambos "buscam no histórico" | **Não fundir as fatias.** Fundir **a infraestrutura** (S4). Os aceites são diferentes: M4 é o **humano** encontrando e lendo o original no chat atual; M6 é o **agente** recuperando com escopo autorizado, orçamento e rótulo de não-confiável. DSH mantém os dois escopos separados no mesmo serviço (R7). |
| **M5 × M6** | ambos "memória" | **Não fundir** (RD-7). M5 = loja + política + CRUD + proveniência + sanitização. M6 = recuperação + injeção + orçamento + auditoria. DSH separa armazenamento de serviço de consulta; OpenClaude separa `memdir/` de `findRelevantMemories.ts`. |
| **M2 × M7** | ambos "estado que sobrevive" | **Não fundir, mas vincular** (S8). M2 é o **log durável** (o que aconteceu). M7 é a **decisão operacional** sobre uma execução interrompida (o que fazer a respeito). Confundir os dois é o erro que `docs/05` D107 e R23 já alertam: transcript recuperado **não** é execução retomável. |
| **M3 × M1** | ambos mexem em tokens | **Não fundir.** M1 **mede e reporta**; M3 **reduz**. R3 mostra por que precisam ser distintos: compactação **não reporta usage**, então o medidor precisa de `projectedTokens` (âncora + delta) para não ficar cego após M3 atuar. |
| **M8 × Task 01** | ambos "confiabilidade de persistência" | **Já resolvido** (S6): Task 01 absorveu a parte de writer. M8 fica com derivados. |

### A.3 O que foi mantido **sem alteração**

- Os **rótulos** M1–M8 e suas fronteiras gerais (nenhuma fatia nova, nenhuma fusão de fatia).
- A **sequência canônica** ✅ **DECIDIDO** D109: **M1 → M2 → M3 → M4** preservada, com a especificação paralela M1/M2 da D102 **revogada**. A ordem proposta nesta Task 03 **não a contradiz** (ver Parte C).
- ✅ **DECIDIDO** D102: **M5–M8 formalizadas somente para planejamento**. Nada aqui as autoriza.
- ✅ **DECIDIDO** `docs/02 §4` / `docs/05`: M1–M4 são o **primeiro conjunto de planejamento**, sem numeração oficial de fatia.

---

## PARTE B — Contratos propostos

> Cada contrato segue os 15 itens exigidos no item 8 da missão. "Superfícies candidatas" são **endereços prováveis**, não autorização de alteração: valem as regras duras de `docs/04 §1` (terminal intocável, `explorer-search/{core,server}` intocável, `App.tsx` só wiring aditivo, `EditorArea.tsx` só com Browser/Customizations) e o princípio D69 *"casa muda de endereço quando a fatia mexer nela"*.

---

## M1 — Gerenciamento de contexto: medição, orçamento e limites

### B.1.1 Objetivo funcional
Substituir o percentual sintético por um **estado verificável** do contexto: quanto o último request custou (quando o provedor informa), quanto o **próximo** custaria, qual é o limite efetivo e de onde esse limite veio — e dizer **"não medido"** quando não houver evidência.

### B.1.2 Problema que resolve
- `ChatInput.tsx:177` → `Math.min(92, 18 + Math.round(text.length / 9) + attachments.length * 4)`, exibido como *"% do contexto utilizado"* (linhas 800-803). É uma fórmula sobre **o rascunho digitado**. Não vê histórico, system prompt, tool schemas, tool results, iterações do Agir, limite do modelo, nem `usage`.
- P10: **nenhum código de produção lê `usage`**. O único hit nas casas 2-inteligencia é um fixture de teste.
- `montarHistorico` reenvia **todo** o texto elegível sem corte → payload cresce sem orçamento (R-6).
- R-5: o dono **vê hoje** um número enganoso.

### B.1.3 Responsabilidades
1. Resolver o **limite efetivo** da janela e sua **origem** (`provider metadata` / `configurado pelo dono` / `default do descritor` / `desconhecido`).
2. Capturar `usage` por protocolo e por **iteração**, sem somar iterações como se fossem uma janela.
3. Produzir um **snapshot de contexto** por `requestId`/iteração com estado explícito.
4. Expor o snapshot à UI por evento aditivo.
5. Emitir alertas de proximidade com limiares configuráveis.
6. **Não** reduzir contexto (é M3) e **não** decidir o que entra no request (é M3, ver S2).

### B.1.4 O que já existe no código (Confirmado)
| O quê | Onde |
|---|---|
| **Denominador já declarado nos 8 descritores** | `provedores/descritores/nativos.ts` — `padroes.contexto`: OpenAI/NVIDIA/OpenRouter/DeepSeek/openai-compat **128000** · Anthropic **200000** · Gemini **1000000** · Ollama **32768** |
| **Campo configurável por provedor salvo + validação + fallback** | `provedores/contract.ts:27,48,68`; `providersRepo.ts:132-133` (`Math.floor`, `Number.isFinite`, `> 0`); `providersRepo.ts:324` (`salvo.contexto ?? descritor.padroes.contexto`) |
| **Ponto único onde Provedores e Conversa se encontram** | `server/session-persistence/chatAlvo.ts` → `obterAlvoDeConversa()` (já valida habilitação, modelo habilitado, baseUrl e chave) |
| **Veículo de evento por iteração já no fio** | `agir/contract.ts:112` → `{ type: 'iteracao'; iteracao: number; teto: number; model?: string }` |
| **Precedente de limite configurável pelo dono, injetado pela prefeitura** | Casa Config → `lerTeto` (`agir/server/rotas.ts:15-18`) |
| **4 protocolos já tipados** | `conversa/contract.ts:6` → `'openai-chat' \| 'anthropic' \| 'gemini' \| 'ollama'` (espelho forçado por typecheck) |
| **Indicador sintético a substituir** | `components/ChatInput.tsx:177,800-803`; `styles/app.css` (`.context-usage`, `.context-usage-meter`) |

### B.1.5 O que precisará ser desenvolvido
**Estágio M1-a — contrato e estado honesto (não exige credencial):**
1. Acrescentar `contexto?: number` e `origemContexto?: 'provedor' | 'configurado' | 'default' | 'desconhecido'` a `AlvoConversa` (**aditivo**), propagados por `obterAlvoDeConversa` a partir do que o `providersRepo` **já** resolve.
2. Definir o tipo `SnapshotContexto` (contrato abaixo) com estado `nao_medido | estimado | reportado | indisponivel | obsoleto`.
3. Remover a fórmula de `ChatInput.tsx` e renderizar o estado real, com alternativa textual acessível.
4. Estimar o payload **somente** quando houver base defensável; caso contrário, `nao_medido`. **Nunca** exibir 18%.
5. Alerta de proximidade com limiares vindos da Casa Config (padrão `lerTeto`).

**Estágio M1-b — `usage` real (exige credencial autorizada):**
6. Normalizar `usage` por protocolo: OpenAI Chat `usage` · Anthropic `usage` · Gemini `usageMetadata` · Ollama `prompt_eval_count`/`eval_count`.
7. Acrescentar `usage?` a `RespostaIteracao` (`agir/contract.ts:118-124`) e um evento aditivo ao fio.
8. Implementar **âncora + delta** (R3): `pressao` = último `usage` reportado; `projetado` = `pressao` + reprecificação heurística **apenas do delta** desde a amostra.

### B.1.6 Componentes e tecnologias reutilizáveis
Casa **Provedores** (descritores + `providersRepo`, já com `contexto`) · Casa **Config** (mecanismo de limite configurável) · **prefeitura** `chatAlvo.ts` (propagação do alvo) · `EventoAgir.iteracao` (veículo aditivo) · **R3** (contrato do token meter do DSH: `baseline.kind`, `pressureTokens`, `projectedTokens`, `contextWindow` ausente quando nenhum adaptador anunciou) · ✅ D101/`docs/02 §1.6` (paridade só por cenário avaliado).
**Nenhuma dependência nova.** 🆕 **PROPOSTA:** não introduzir tokenizer próprio; se um dia for usado, só com modelo/protocolo conhecido e rotulado `estimado`.

### B.1.7 Dependências
- **De outras fatias M:** nenhuma para M1-a. M1-b depende de **credencial autorizada** (🔎 H4).
- **De fatias canônicas:** nenhuma. Não toca Fatia 14/15.
- **Bloqueia:** M3 (que precisa do orçamento para decidir poda/compactação) — **mas só a parte automática**. O primeiro estágio de M3 (S3, determinístico) **não** depende de M1-b.
- ✅ **DECIDIDO** D109: M1 é o **primeiro** da sequência.

### B.1.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
/** Estado honesto do contexto de UMA janela de request. */
export type EstadoContexto =
  | 'nao_medido'    // ainda não há base: nem usage, nem estimativa defensável
  | 'estimado'      // precificado localmente; NUNCA exibido como medição
  | 'reportado'     // veio do usage do provedor, com envelope canônico coincidente
  | 'indisponivel'  // o provedor/modelo não informa e não há estimativa aplicável
  | 'obsoleto'      // havia amostra, mas o alvo (provedor/modelo) mudou desde então

export type OrigemLimite = 'provedor' | 'configurado' | 'default' | 'desconhecido'

export interface SnapshotContexto {
  /** Identidade da medição — sem isto, o número não tem proveniência. */
  requestId: string
  iteracao: number            // iterações do Agir NÃO se somam como uma janela
  providerId: string
  modelId: string
  estado: EstadoContexto
  /** O que o provedor reportou de prompt no último request (exclui a saída). */
  pressaoTokens?: number
  /** pressaoTokens + reprecificação heurística APENAS do delta desde a amostra. */
  projetadoTokens?: number
  /** Limite efetivo da janela. Ausente quando nenhum adaptador/descritor anunciou. */
  limiteJanela?: number
  origemLimite: OrigemLimite
  /** Reserva de saída — separada da ocupação, nunca somada ao numerador de input. */
  reservaSaidaTokens?: number
  /** Proveniência da medição: quantos eventos duráveis foram consumidos (padrão R3). */
  revisaoLog?: number
  medidoEm: number            // epoch ms — permite marcar 'obsoleto'
}
```
**Entrada:** o alvo efetivo (`AlvoConversa` + `contexto`/`origemContexto`) e, em M1-b, o `usage` bruto do provedor.
**Saída:** `SnapshotContexto` por evento aditivo no fio + estado na UI.
**Regra de ouro (R3, literal):** *"the value is a user-facing reference, **not a billing or gating input**"* → o snapshot **não** pode ser usado como prova para bloquear/autorizar operação. Gating é M3, com orçamento próprio.

### B.1.9 Persistência e gerenciamento de estado
🆕 **PROPOSTA:** o snapshot é **efêmero por run** (memória de processo + evento no fio). O **último** snapshot pode ser persistido junto ao evento de fim de run no log de M2 (para histórico de consumo), **como dado derivado e rotulado**, nunca como estado atual. **Não** criar tabela nova em M1.
✅ **DECIDIDO** (herdado): `docs/02 §1.4` — *"preferir `usage` real do provedor; sem isso, estimativa claramente identificada ou estado indisponível. Limites por modelo/provedor, configuráveis manualmente e com origem indicada; alertas em 75% e 90%."* → **os limiares 75%/90% já estão decididos**; só a configurabilidade precisa de desenho.

### B.1.10 Regras de isolamento e segurança
- `apiKey` **nunca** entra no snapshot, no evento, na UI ou em log (✅ D83/D125: chave só no reveal explícito; `chatAlvo.ts` já é o único ponto que resolve segredo e *"segredo nunca vai ao browser"*).
- `limiteJanela` **desconhecido** não é substituído por default não identificado.
- Trocar provedor/modelo **invalida** a amostra anterior (`estado: 'obsoleto'`), não a reaproveita em silêncio — ✅ compatível com D122 (sem troca/fallback silencioso).
- O snapshot não vaza conteúdo de mensagem: só números, identidade e timestamps.

### B.1.11 Tratamento de erros
🆕 **PROPOSTA** — estender `CategoriaErro` **aditivamente**, no estilo existente (mensagens em PT-BR claro):
| Situação | Comportamento |
|---|---|
| Provedor não retorna `usage` | `estado: 'indisponivel'`. **Não** é erro. Exibir "não informado pelo serviço". |
| `usage` presente mas envelope canônico não coincide com o último request | descartar a âncora; `estado: 'estimado'` ou `'nao_medido'`. **Nunca** reaproveitar âncora de request diferente (R3). |
| 413 / estouro | ✅ já existe `'limite'` em `CategoriaErro`. M1 **explica** o número; M3 decide recuperação. 🔎 H5: comportamento real por provedor **não medido**. |
| Limite ausente no descritor e não configurado | `origemLimite: 'desconhecido'`, sem percentual. |
| Falha ao ler Config | mantém último snapshot marcado `obsoleto`; não inventa limiar. |

### B.1.12 Requisitos não funcionais
- Cálculo **síncrono e barato** no caminho do request; nenhuma chamada de rede adicional.
- Se houver estimativa local, ela deve ser O(mensagens) com cache por mensagem imutável (padrão R16: `WeakMap`).
- Zero cor hardcoded (✅ regra 4 de `docs/04`): usar tokens `--vscode-*` em `styles/theme.css`, dark **e** light.
- Acessível: alternativa textual ao medidor; distinguir visual e textualmente reserva de saída de ocupação.
- Nada em `position: fixed` (✅ regra 5).

### B.1.13 Testes necessários
1. Unitário por protocolo: stream **com** e **sem** `usage`, campos ausentes, `usage` parcial, request multi-iteração.
2. Teste do DTO de alvo: `contexto`/`origemContexto` propagados do `providersRepo` para `AlvoConversa`.
3. Teste do medidor: os **cinco** estados, incluindo `obsoleto` após troca de modelo.
4. Teste que prova que **tool schemas e tool results contribuem** ao payload medido/estimado.
5. Teste que prova que `promptTokens` de iterações sucessivas **não** é somado como uma janela.
6. Teste de âncora + delta: simular compactação (que não reporta usage) e verificar que `projetadoTokens` reage enquanto `pressaoTokens` permanece.
7. Teste de regressão visual/contrato: **nenhum** caminho exibe 18% ou percentual derivado de `text.length`.
8. 🔎 H4: com credencial **autorizada**, uma chamada real por protocolo registrando **somente** os campos de uso. Sem credencial ⇒ registrar **bloqueado/não executado** (✅ D91/D99), nunca "passou".

### B.1.14 Critérios objetivos de aceite
1. Antes do primeiro request e sem estimativa aplicável, a UI mostra **"não medido"/"indisponível"** — nunca 18% nem qualquer valor derivado de chars/anexos.
2. Para provedor que devolve `usage`, o valor exibido corresponde ao usage do **request corrente**, rotulado **reportado**; `completionTokens` não é somado ao numerador de input.
3. Para provedor sem `usage`, a UI mostra **estimativa local** com nome do modelo/limite e timestamp, **ou** indisponível. Nenhuma estimativa recebe rótulo de medição.
4. Trocar provedor/modelo efetivo marca o snapshot anterior como **obsoleto**; o seletor não altera o denominador em silêncio.
5. Um Agir com schema e resultado de ferramenta mostra o consumo relativo **à iteração** que os incluiu.
6. Limite desconhecido **não** é substituído por default não identificado; nenhuma chave aparece em snapshot/evento/UI/log.
7. Alerta em **75%** e **90%** (✅ já decidido em `docs/02 §1.4`), com limiares configuráveis e origem indicada.
8. `npm run typecheck` = 0 erros; testes focados verdes; sem regressão no baseline registrado em `docs/09`.

### B.1.15 Fora do escopo
Compactar ou apagar histórico (M3) · decidir o que entra no request (M3, S2) · buscar/memória (M4–M6) · assumir limite por **nome** de provedor · criar tokenizer próprio · usar mock em homologação como prova de precisão · corrigir completamente o seletor de modelo (**DEBT-14**) · reabrir D122/D115–D117 · qualquer alteração em área congelada.

### B.1.16 Decisões pendentes desta fatia
⏳ **PENDENTE DE APROVAÇÃO:** (a) se a **reserva de saída** entra no denominador visual; (b) fonte autoritativa quando `contexto` do provedor salvo diverge do default do descritor (hoje o `providersRepo` já resolve: `salvo ?? default` — **propõe-se manter**); (c) tolerância de divergência entre estimativa local e `usage` reportado antes de marcar `indisponivel`; (d) se os limiares 75/90 são por **modelo** ou globais; (e) política para o provedor genérico "Compatível com OpenAI", cujo `contexto` default é 128000 mas o serviço real pode ser outro; (f) como informar instruções ocultas injetadas pelo provedor.

---

## M2 — Persistência e histórico: transcript fiel e eventos de ferramenta

### B.2.1 Objetivo funcional
Fazer a fonte persistida representar **o diálogo que o agente realmente usou** — com identidade, ordem e as chamadas/resultados de ferramentas — separando de forma explícita **três objetos**: log canônico, projeção para o provedor e cartão de UI.

### B.2.2 Problema que resolve
- §2.2: `FerramentaNoChat` (`types.ts:12-28`) tem `id`, `ferramenta`, `alvo`, `previa?`, `status`, `allowSession?`, `progresso?`, `resumo?`, `ordem?` — **não** tem argumentos completos, **não** tem resultado completo, **não** tem `toolCallId` do protocolo.
- `EventoAgir.tool_result` (`agir/contract.ts:108`) trafega apenas `{ id, ferramenta, ok, resumo }`.
- `MensagemAgir` (`agir/contract.ts:72-81`) **é fiel** (`pedidos?: PedidoFerramenta[]`, `pedidoId?`, `ferramenta?`) mas existe **só em memória, dentro de um run**.
- `App.tsx:1678-1681` reduz tudo a `{ role, content }`; `App.tsx:2066-2068` é o que vai no request.
- **Consequência:** nenhum segundo turno reconstrói o protocolo. Nenhuma camada de memória recupera o que não foi gravado.

### B.2.3 Responsabilidades
1. Definir **evento durável** com `sessionId`, `chatId`, `messageId`, **sequência monotônica** e `turnId`.
2. Registrar tool-call, argumentos, aprovação/negação, resultado, erro, cancelamento e `toolCallId` como **eventos vinculados**.
3. Manter o **cartão de UI** como projeção derivada, distinguível da fonte.
4. Definir a **política de conteúdo grande** (⏳ DP-03).
5. Preservar e **estender** as garantias da Task 01 (fila, temporário exclusivo, ordem JSONL→SQLite, revisão monotônica) — **sem reabri-las**.
6. **Não** criar índice de busca (M4), **não** criar checkpoint (M3), **não** retomar execução (M7).

### B.2.4 O que já existe no código (Confirmado)
| O quê | Onde |
|---|---|
| Catálogo SQLite/WAL + `foreign_keys=ON` | `session-persistence/database.ts:25-26` |
| Transcript JSONL por `<slug>/<sessionId>.jsonl` | `transcripts.ts` (`transcriptPath`, `readTranscript`, `writeTranscript`, `deleteTranscript`) |
| Temporário exclusivo `.<pid>.<uuid>.tmp` + `wx` + `rename` | `transcripts.ts:57-61` |
| Fila por sessão e por destino | `index.ts` (`withSessionPersistenceQueue`), `transcripts.ts:9` (`withTranscript`) |
| Revisão monotônica + 409 `stale_session_snapshot` | `index.ts` + `sessionsClient.ts:52` |
| Entradas de transcript com `type`, `chatId`, `uuid`, `timestamp` | `index.ts` (`transcriptEntries`) |
| `ChatMessage` com `running`, `cancelled`, `erro`, `ferramentas`, `continuar`, `iteracaoAtual`, `tetoAtual`, `inicioEm` | `types.ts:30-52` |
| `MensagemAgir` fiel (modelo a espelhar no log) | `agir/contract.ts:72-81` |
| Identidade de projeto + diretório + guarda anti-traversal | `types.ts:97` (`slug`), `paths.ts` |
| Saneamento pós-F5 (`working` → `completed`, cartões pendentes sanados) | `index.ts` (`sanarStatusAposF5`) |
| **Benchmark do writer atual** | P2: 200 msgs / 235.429 B → salvar p50 1,895 ms; reler p50 1,143 ms |

### B.2.5 O que precisará ser desenvolvido
1. **Tipo `EventoTranscript`** com sequência monotônica por `(slug, sessionId)` e `turnId`.
2. **Eventos de ferramenta**: `tool_call` (com argumentos e `toolCallId`), `tool_approval` (decisão + grant), `tool_result` (ok/erro + conteúdo conforme DP-03), `tool_cancel`, `command_progress`.
3. **Projeção de request**: função **no servidor** que reconstrói a sequência protocolar a partir dos eventos, por protocolo. Hoje isso é `montarHistorico` no browser — ⚠️ a mudança de dono é **aditiva** ao `App.tsx` (regra 3 de `docs/04`), mas o **cálculo** sai do browser. Ver S2/DP-06.
4. **Política de conteúdo grande** (⏳ DP-03).
5. **Migração/compatibilidade**: sessões legadas sem eventos continuam abrindo. 🆕 **PROPOSTA:** leitura tolerante + **nenhuma** migração destrutiva; derivado é reconstruível (S12).
6. 🔎 H1: re-medir o writer em 2k/10k/50k mensagens antes de decidir append-only vs. reescrita.

### B.2.6 Componentes e tecnologias reutilizáveis
`better-sqlite3` (P1) · `randomUUID` de `node:crypto` (já em `transcripts.ts:1`) · fila e revisão da Task 01 · **R22** (seções do resumo do OpenCode — insumo para M3, não para M2) · **R4** (spill do DSH, se DP-03 escolher essa via) · **R15** (separar texto voltado ao modelo de texto voltado ao usuário — crítico aqui, não só em M4) · padrão casa/porta única com `frontier.test.ts` (D68–D70).

### B.2.7 Dependências
- **M1:** fraca. M2 pode gravar `SnapshotContexto` por run **se** M1-a já existir; não é pré-requisito.
- **Task 01:** ✅ já entregue — é a **base**. M2 **não** pode enfraquecer fila/revisão/atomicidade.
- **Bloqueia:** M3, M4, M5, M6, M7. **É o pré-requisito de tudo** (conclusão 3 da Task 02).
- ✅ **DECIDIDO** D109: M2 vem **depois** de M1.
- ⚠️ **Risco de perímetro:** M2 toca `types.ts` e o caminho de `montarHistorico`. `EditorArea.tsx` e áreas congeladas **não** podem entrar (`docs/01 §3.E` lista o perímetro a conferir antes de commitar).

### B.2.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
export type TipoEventoTranscript =
  | 'mensagem'        // user/assistant textual (o que já existe hoje)
  | 'tool_call'       // assistente pediu ferramenta
  | 'tool_approval'   // dono decidiu: permitir | negar | sessao
  | 'tool_result'     // resultado (ok | erro), conteúdo conforme DP-03
  | 'tool_cancel'     // Parar / expiração
  | 'command_progress'// saída parcial de `executar`
  | 'run_start' | 'run_end'   // fronteiras de execução, com alvo e teto
  | 'erro' | 'checkpoint_ref' // erro honesto; referência a derivado de M3

export interface EventoTranscript {
  sessionId: string
  chatId: string
  /** Sequência monotônica por (slug, sessionId). É ELA que define ordem —
   *  não timestamp, não ordem de chegada na UI. */
  seq: number
  turnId: string
  type: TipoEventoTranscript
  /** Identidade protocolar da chamada, quando houver. */
  toolCallId?: string
  ferramenta?: 'ler'|'listar'|'buscar'|'criar'|'escrever'|'excluir'|'executar'
  payload: unknown          // tipado por `type`; zero `any` em porta de serviço (regra 4, docs/04)
  /** Proveniência: o que o modelo viu ≠ o que o usuário viu (R15). */
  visibilidade: 'modelo_e_usuario' | 'so_usuario' | 'so_modelo'
  timestamp: number
}

/** Saída da projeção — o que efetivamente vai ao provedor. */
export interface ProjecaoRequest {
  protocolo: 'openai-chat'|'anthropic'|'gemini'|'ollama'
  mensagens: unknown[]           // forma exata do protocolo, tool calls/results inclusos
  fronteiraSegura: { seqInicial: number; seqFinal: number }
  snapshotContexto?: SnapshotContexto   // de M1
}
```
**Entrada:** eventos do loop Agir (hoje `MensagemAgir[]` + `EventoAgir`) e mensagens da UI.
**Saída:** (a) log durável; (b) `ProjecaoRequest` para o próximo turno; (c) cartões de UI derivados.

### B.2.9 Persistência e gerenciamento de estado
- **Autoridade:** o log durável. Cartão de UI e projeção são **derivados**.
- **Onde:** JSONL existente (`~/.agente_window/projects/<slug>/<sessionId>.jsonl`) e/ou tabela nova no SQLite existente. ⏳ **PENDENTE DE APROVAÇÃO:** JSONL de eventos (append + reescrita, como hoje) **vs.** tabela `eventos` no SQLite. **Proposta desta Task 03:** manter JSONL como fonte (preserva P2/P3 e o padrão já homologado tecnicamente) e **não** decidir agora; medir em H1.
- ✅ **DECIDIDO** (herdado de `docs/04 §1.5`, condição 2): preservar **SQLite+JSONL**. Migrar sem benchmark e plano de rollback é violação.
- **Ordem de gravação preservada:** JSONL publicado **antes** do upsert SQLite (Task 01).
- **Limitação herdada e que deve constar do aceite:** fila só em memória do processo (R-10) e ausência de transação distribuída entre os dois armazéns (R-9).

### B.2.10 Regras de isolamento e segurança
- Escopo por `(slug, sessionId, chatId)`. `resolveProjectDir()` já tem guarda anti-traversal — **reutilizar, não reimplementar**.
- **Segredos:** `apiKey` nunca entra no log. Conteúdo de arquivo lido por `ler`/`buscar` é o ponto de risco — ⏳ **DP-03**.
- 🆕 **PROPOSTA (R17/R18):** sanitização **antes** de persistir, e guarda **no ponto de escrita** (não em scanner posterior). Isso é requisito de M5, mas o **mesmo mecanismo** deve cobrir `tool_result` de M2 se DP-03 escolher persistir conteúdo.
- Texto histórico é **dado não confiável**, nunca instrução executável (R-1) — o log precisa permitir rotular isso na projeção (M6).

### B.2.11 Tratamento de erros
| Situação | Comportamento |
|---|---|
| Falha ao publicar JSONL | **não** avançar o catálogo SQLite; preservar dado anterior; devolver erro recuperável (✅ já é o comportamento da Task 01) |
| Revisão obsoleta | `409 stale_session_snapshot` + aviso persistente + "Save a separate copy" (✅ já implementado) |
| Evento com `seq` duplicada/regredida | recusar; **não** reordenar silenciosamente |
| `tool_result` sem `tool_call` correspondente | registrar como **corrupto** e falhar fechado na projeção (padrão R2: *"orphan result"* lança erro) |
| Run interrompido (`running === true`) | já é retirado por `transcriptEntries`; M2 deve gravar `tool_cancel`/`run_end` **ausente** de forma detectável (padrão R6: lock órfão detectável em vez de falso "terminou") |
| Sessão legada sem eventos | abre normalmente; projeção cai no modo texto atual, **rotulado** |

### B.2.12 Requisitos não funcionais
- 🔎 H1: salvar/reler/restaurar medidos em 2k/10k/50k mensagens antes de escolher estratégia de escrita.
- Nenhum aumento perceptível no tempo de boot (restauração já é feita em `listSessions`).
- Zero `any` em porta de serviço (✅ regra 4).
- Inglês só em peças novas/migradas (✅ `docs/01 §3.F`); PT-BR nas mensagens de erro voltadas ao dono, no estilo `CategoriaErro`.

### B.2.13 Testes necessários
1. Round-trip de evento por **cada um dos 4 protocolos**.
2. Identidade e ordem: `seq` duplicada, timestamp igual, reordenação, IDs repetidos.
3. Execução completa com tool call → aprovação → leitura → escrita → erro → cancelamento, restaurada com ordem correta.
4. **Segundo turno recebe a sequência de tool exchange** necessária ao protocolo (o teste que hoje **falharia**).
5. Cartão de UI derivado sem substituir a fonte; texto original e resumo distinguíveis.
6. Restart: `running` não vira "completo"; o app **não** afirma que processo/ferramenta continua vivo.
7. Segredo-canário: `apiKey` e valor com forma de segredo **nunca** aparecem no log.
8. Concorrência: repetir **P3/P4** (2 rodadas × 16 PUTs) como **critério de aceite**, não como descoberta.
9. Migração: sessão legada abre, exibe e persiste sem perda.
10. `frontier.test.ts` da casa: nenhum import de internals alheios.

### B.2.14 Critérios objetivos de aceite
1. Uma execução com tool call, aprovação, resultado de leitura, resultado de escrita e erro é **restaurada com identidade e ordem corretas** após restart de processo.
2. O **segundo turno recebe a troca de ferramentas** necessária ao protocolo; resultados não se perdem por redução a bolha de texto.
3. A UI pode mostrar cartão resumido **sem** substituir a fonte; resumo e original são distinguíveis (campo `visibilidade`).
4. Ordem é definida por `seq`, nunca por timestamp ou ordem de chegada.
5. Mensagens/runs `running` não são tratados como completos; após restart o app não alega processo vivo.
6. Nenhum segredo-canário entra no log.
7. **P3/P4 continuam verdes** (2 rodadas × 16 PUTs íntegros; zero EPERM no Windows).
8. O writer só será trocado por append-only se **H1** mostrar necessidade medida **e** a migração provar preservação.
9. Typecheck 0 + testes focados verdes + sem regressão no baseline de `docs/09`.

### B.2.15 Fora do escopo
Checkpoint/compactação (M3) · índice de busca (M4) · **replay de ferramenta** (M7 e ✅ D107: cancelar invalida aprovações) · trocar de banco ou migrar todo o session storage sem evidência de gargalo · reabrir Task 01 · tocar em terminal/PTY (`executar` é o executor one-shot da Fatia 13, ✅ D126 — M2 **registra** o evento, **não** altera o executor).

### B.2.16 Decisões pendentes desta fatia
⏳ **DP-03** (bloqueante para fechar o contrato): onde mora o conteúdo grande — verbatim no log, referência/localizador (spill), ou truncamento com política declarada? Agravante nosso: a tool `ler` lê arquivo do workspace do dono; persistir o resultado em `~/.agente_window` **move conteúdo do projeto para fora do projeto**.
⏳ adicionais: (a) JSONL de eventos vs. tabela SQLite; (b) política de retenção/apagamento de conteúdo de ferramenta; (c) contrato de versionamento/migração do log; (d) limites de tamanho por evento e por sessão.

---

## M3 — Compactação, checkpoint e **Projeção de Contexto**

### B.3.1 Objetivo funcional
Limitar o que é enviado ao modelo em conversas longas **sem apagar a fonte**, **sem partir uma rodada de ferramentas** e **sem depender de um modelo auxiliar no primeiro estágio** — e nomear explicitamente o dono da montagem de cada request (S2).

### B.3.2 Problema que resolve
- Nenhum mecanismo de resumo/checkpoint/compactação existe (§2.6).
- `montarHistorico` reenvia **todo** o texto elegível, sem corte (R-6).
- A montagem vive no `App.tsx:1678` — **no browser** — e `docs/04 §1` regra 3 impede `App.tsx` de crescer (DP-06).
- Sem corte seguro, qualquer poda por contagem de mensagens pode **partir** um par tool-call/result (o estudo de 22/10 já apontava isso; R2 agora dá o algoritmo).

### B.3.3 Responsabilidades
1. **Ser o dono da Projeção de Contexto** (S2): decidir o que entra em cada request, no servidor.
2. **Estágio 1 — determinístico, sem LLM** (S3): poda por relevância preservando system/recentes/tools/erros; *pruning* de tool result; corte **somente** em fronteira balanceada.
3. **Estágio 2 — checkpoint derivado**: resumo estruturado, versionado, com fronteira fonte e fingerprint.
4. Manter o **original intacto** — derivado **sombrea**, nunca apaga.
5. Trava de operação com detecção de lock órfão.
6. **Não** medir tokens (M1) e **não** buscar histórico (M4/M6).

### B.3.4 O que já existe no código (Confirmado)
| O quê | Onde |
|---|---|
| Teto de iterações configurável + evento de pausa honesta | Casa Config (`lerTeto`), `EventoAgir.teto`/`iteracao`, cartão "Limite de voltas — Pausado no limite" (✅ Fatia 11 homologada D96) |
| Retomada validada de contexto | `agir/server/rotas.ts:622-671` (`retomarPorFluxo`, revalidação de sessão/chat/raiz/modo/permissão) |
| Categoria `'limite'` (413) | `conversa/contract.ts:17` |
| Ponto de montagem atual (a **mover**, não a crescer) | `App.tsx:1678-1681`, `2066-2068` |
| Estado de run já parcialmente persistido em mensagem | `types.ts:48-52` (`iteracaoAtual`, `tetoAtual`, `inicioEm`) |

### B.3.5 O que precisará ser desenvolvido
**Estágio 1 (sem LLM):**
1. `podarPorRelevancia(eventos, { alvoTokens, preservarRecentes, preservarFerramentas: true, preservarErros: true, preservarSystem: true })` — padrão R20.
2. `podaDeResultadoDeFerramenta(eventos)` — substitui conteúdo por versão podada **preservando o original sombreado**, reportando `seqOriginal`, `seqSubstituta`, `toolCallId`, `charsAntes`, `charsDepois` — padrão R4/DSH. **Pode avançar a projeção sem gerar resumo.**
3. `fronteiraBalanceadaAntes(eventos, seq)` / `...Depois(...)` — padrão R2: saldo incremental de tool-calls em aberto; **falha fechada** em superfície corrompida ou resultado órfão.
4. Fallback quando não cabe: fração da janela (R20 usa `10%`), **nunca** cauda de zero mensagens (normalização defensiva de config, R21).

**Estágio 2 (checkpoint derivado):**
5. `CheckpointContexto` versionado, com fronteira fonte (`cobertoAteSeq`), fingerprint/hash, data, modelo, estratégia, status.
6. Resumo estruturado com seções fixas — 🆕 **PROPOSTA:** adotar as sete seções de R22 (`Objective`, `Requirements`, `Decisions`, `Work State{Completed/Active/Blocked}`, `Next Move`, `Relevant Files`, `Important Context`), que já coincidem quase 1:1 com a proposta de 22/10 e com o que o dono pede para "continuidade".
7. Trava `compactacao_inicio → resumo → substituição → compactacao_fim`, liberando **por último** (R6): crash vira **lock órfão detectável**, nunca um "terminou" falso.
8. Recompactação incorpora checkpoint anterior + delta, sem duplicar nem omitir.

### B.3.6 Componentes e tecnologias reutilizáveis
Casa Config (limiares configuráveis, padrão `lerTeto`) · prefeitura (composição, S2/DP-06) · M1 (`SnapshotContexto` como gatilho) · M2 (eventos + `seq` + `fronteiraSegura`) · **R2, R4, R5, R6, R20, R21, R22** · ✅ D68–D70 (compaction como **casa/porta opcional**, não espinha do loop — R5 é exatamente o nosso Monolito Modular).
**Nenhuma dependência nova.**

### B.3.7 Dependências
- **M1** para o estágio automático (orçamento). **Não** para o estágio 1 determinístico (S3) — este pode operar com limite do descritor (P8) sem `usage`.
- **M2** obrigatória: sem `seq` e sem eventos de ferramenta não há fronteira segura nem sombra.
- **Bloqueia:** valor real de M4 (buscar o que saiu do contexto) e M7 (estado da tarefa).
- ✅ **DECIDIDO** D109: M3 vem depois de M2 e antes de M4. **A ordem proposta aqui respeita.**

### B.3.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
export interface CheckpointContexto {
  checkpointId: string
  slug: string
  chatId: string
  /** Fronteira FONTE: até qual seq do log este checkpoint cobre. */
  cobertoAteSeq: number
  /** Seqs sombreadas, em ordem de superfície — o conjunto autoritativo (padrão DSH). */
  seqsSombreadas: number[]
  fingerprintFonte: string     // hash do prefixo coberto: impede aplicar a chat diferente
  resumo: SecoesResumo          // derivado; NUNCA apresentado como citação literal
  modelo?: string; estrategia: 'poda' | 'pruning' | 'resumo' | 'mista'
  versao: number
  criadoEm: number
  status: 'valido' | 'invalido' | 'superseded'
  tokensEstimadosSombreados: number
}

export interface SecoesResumo {
  objetivo: string; requisitos: string[]; decisoes: string[]
  estadoDoTrabalho: { concluido: string[]; ativo: string[]; bloqueado: string[] }
  proximoPasso: string; arquivosRelevantes: string[]; contextoImportante: string
}

export type MotivoCompactacao = 'pressao' | 'estouro_de_contexto' | 'manual'

export type ErroCompactacao =   // taxonomia fechada, padrão DSH (R6/compaction.md)
  | 'ocupado' | 'cancelado' | 'fonte_mudou' | 'resumo_falhou'
  | 'commit_parcial' | 'persistencia_falhou' | 'sem_fronteira_segura'
```
**Entrada:** eventos de M2 + `SnapshotContexto` de M1 + motivo.
**Saída:** `ProjecaoRequest` (de M2) montada como `checkpoint válido + eventos fonte após a fronteira + turno atual + instruções/tools necessários`.

### B.3.9 Persistência e gerenciamento de estado
🆕 **PROPOSTA:** checkpoint em **arquivo sidecar** por chat (`~/.agente_window/projects/<slug>/checkpoints/<chatId>.json`) **ou** tabela no SQLite existente — ⏳ **PENDENTE DE APROVAÇÃO**. Argumento a favor do sidecar: é derivado descartável (S12) e não mistura com o catálogo. Argumento a favor da tabela: reusa fila/revisão da Task 01.
- **Nunca** sobrescrever a fonte. Transcript permanece autoridade.
- Checkpoint inválido/corrompido ⇒ **recuar** para o anterior válido e explicar; nunca gravar resumo vazio como válido.
- **Lock órfão** (`compactacao_inicio` sem `compactacao_fim`) é detectável e recuperável.

### B.3.10 Regras de isolamento e segurança
- Checkpoint é escopado por `(slug, chatId)`; `fingerprintFonte` impede aplicar a chat diferente ou a transcript alterado.
- Resumo é **derivado não confiável**: não pode virar instrução executável (R-1).
- Nenhuma ferramenta executa com base **só** no resumo (✅ D107/D108: modos impostos pelo servidor; cancelar invalida aprovações).
- Sem segredo no resumo: aplicar a mesma sanitização de M2/M5 (R17).

### B.3.11 Tratamento de erros
Taxonomia fechada acima. Regras: `fonte_mudou` e `resumo_falhou` fecham e persistem a tentativa **sem** substituição; `commit_parcial` pode seguir mutação parcial e **deve** ser reportado como tal; `persistencia_falhou` = trava fechou em memória mas o flush falhou; `sem_fronteira_segura` = não há corte balanceado disponível ⇒ **não compactar** e explicar. Cancelamento vence sempre e lança o motivo exato após limpeza.
**413:** 🆕 pode permitir **uma única** recuperação segura de contexto **somente se não repetir efeito de ferramenta**; caso contrário, explicar sem apagar histórico. 🔎 H5 (comportamento real de 413 por provedor não medido).

### B.3.12 Requisitos não funcionais
- Estágio 1 **síncrono e determinístico**, testável sem rede nem modelo.
- Disjuntor + cooldown para compactação automática (R21): falhas consecutivas não podem virar loop; configuração inválida não pode desligar o disjuntor.
- Medir latência e tokens antes/depois; registrar fonte/versão. **Não declarar que perdeu informação recuperável.**
- Zero cor hardcoded; nada em `position: fixed`.

### B.3.13 Testes necessários
1. `fronteiraBalanceada*`: corte antes/depois de cada tipo de evento; resultado órfão ⇒ erro; seq ausente ⇒ erro; cache invalidado por geração.
2. Poda determinística: system preservado, cauda recente preservada, tools preservados, erros preservados; `0.5` na config não produz cauda vazia.
3. *Pruning* de tool result: `charsAntes`/`charsDepois`, original sombreado, avanço de projeção **sem** resumo.
4. Duas ou mais compactações seguidas: cobertura contínua, sem duplicação nem omissão.
5. Checkpoint aplicado a chat diferente / transcript alterado / seq incompatível com fingerprint ⇒ **recusado**.
6. Lock órfão: matar entre `inicio` e `fim` ⇒ detectável e recuperável.
7. `resumo_falhou`, `commit_parcial`, `persistencia_falhou`, storage cheio, sidecar corrompido.
8. Restart: restaura transcript **e** checkpoint **sem** enviar pedido novo ao modelo.
9. Regressão: conversa curta **não** é compactada; anexos/multimodal não quebram a fronteira.
10. Benchmark de redução e tempo em dataset sintético — **não substitui** homologação com fluxo real.

### B.3.14 Critérios objetivos de aceite
1. Conversa acima do limiar envia **checkpoint validado + faixa recente**, sem reenviar o transcript integral e **sem remover originais**.
2. Nenhuma compactação parte um par tool-call/result: todo corte é balanceado (R2).
3. Compactações sucessivas preservam cobertura contínua; a cauda contém **eventos fonte originais**.
4. Checkpoint não se aplica a chat diferente, transcript alterado ou sequência incompatível com o fingerprint.
5. Timeout, erro, resumo vazio, storage cheio e corrupção **não danificam** transcript nem checkpoint anterior; o erro é visível e tipado.
6. Reabrir/reiniciar restaura transcript e checkpoint **sem** nova chamada ao modelo.
7. **Estágio 1 entrega redução medida sem nenhuma chamada de LLM** (S3).
8. Disjuntor: N falhas consecutivas param a compactação automática e o estado é explicável; cooldown respeitado.
9. Typecheck 0 + testes verdes + sem regressão.

### B.3.15 Fora do escopo
Memória de projeto/global (M5) · busca automática em chats anteriores (M6) · persistir processo vivo (M7) · **replay de comandos** · banco vetorial · reabrir a Fatia 11 (teto) ou DEBT-23 · alterar o executor `executar` (✅ D126).

### B.3.16 Decisões pendentes desta fatia
⏳ **DP-06** (bloqueante para o endereço): quem compõe a Projeção de Contexto. **Proposta desta Task 03:** a **prefeitura** (`server/chatAlvo.ts` já é o único ponto onde Provedores e Conversa se encontram), com M3 como casa dona do contrato — **PENDENTE DE APROVAÇÃO**, porque criar um novo ponto de composição é decisão arquitetural.
⏳ adicionais: (a) limiar de compactação e se o primeiro corte é **manual/opt-in** (as propostas de 22/10 e S3 recomendam manual primeiro); (b) modelo/estratégia de sumarização e seu custo; (c) sidecar vs. tabela; (d) retenção de checkpoints; (e) tratamento de conteúdo que não pode ser resumido; (f) como o dono recupera detalhe antigo quando o resumo não basta (é M4).

---

## M4 — Pesquisa histórica manual (escopo: chat atual)

### B.4.1 Objetivo funcional
Permitir à **pessoa** encontrar e **ler o original** de mensagens antigas do chat ativo — inclusive depois de compactado — com trecho literal, posição e navegação para a vizinhança.

### B.4.2 Problema que resolve
- Não existe busca de transcript (§2.6). A única busca é a do módulo `explorer-search`, sobre **arquivos do workspace**.
- `05_RECUPERACAO_CONTEXTUAL.md`: *"Encontrar uma mensagem antiga manualmente exige ferramenta/UI de busca de transcript; não foi localizada."*
- O pedido do dono é explícito: *"recuperar assuntos anteriores […] mesmo quando a pergunta utiliza palavras diferentes das originais"*.
- Depois de M3 compactar, o resumo **não** é citação literal — sem busca, o original fica inacessível na prática.

### B.4.3 Responsabilidades
1. Extrair **texto pesquisável** dos eventos de M2, indexando **o que o usuário vê** (S5/R15).
2. Manter **índice derivado e descartável** (S12/R1).
3. Executar consulta **léxica** com filtros fechados, com a query tratada **como dado** (R8).
4. Devolver hits com `chatId`, `messageId`, `seq`, papel, timestamp e **trecho literal**.
5. Permitir abrir a mensagem original e sua vizinhança ordenada.
6. **Escopo: somente o chat/sessão autorizada.** Busca entre chats é M6.

### B.4.4 O que já existe no código (Confirmado)
| O quê | Onde |
|---|---|
| **FTS5 disponível e comprovado no binding instalado** | **P1**: `better-sqlite3@12.11.1`, `ENABLE_FTS5`, SQLite 3.53.2, `CREATE VIRTUAL TABLE … fts5` + `MATCH` funcionaram |
| Banco SQLite já aberto com WAL | `session-persistence/database.ts:25-26` |
| Fonte de texto a indexar | transcript JSONL (`transcripts.ts`) e, após M2, eventos tipados |
| Infraestrutura de busca **de arquivos** (não reutilizável para transcript, e **congelada**) | `modules/explorer-search/{core,server}` — ⚠️ `docs/04 §1` regra 2: **intocável**. M4 **não** mexe aqui |
| Precedente de UI com painel e atalho | Side Bar/Search já existentes (Fatia 04/05 homologadas) |

### B.4.5 O que precisará ser desenvolvido
1. `extrairTextoPesquisavel(evento)` — por tipo de evento, **espelhando o que a UI renderiza** (R15). Formas desconhecidas ⇒ **string vazia** (*"under-count is honest, phantom is a lie"*).
2. Índice FTS5 **derivado**, em banco/arquivo **separado** do catálogo, com: versão de schema, identidade de aplicação, recusa de banco estranho, criação exclusiva `wx` + `0600`/`0700`, e tabelas TEMP de conexão separadas das persistentes (R1).
3. Serviço de busca com **dois escopos** (S4): `buscarNoChat(chatId, …)` agora; `buscarEntreSessoes(…)` em M6 — **mesma porta**.
4. Filtros fechados (R8/R9): `seq`, `tempo`, `tipo`, `superficie`, `texto` literal. Arrays AND, valores OR, faixas inclusivas.
5. Paginação por cursor opaco + `snippet` limitado.
6. Reconstrução do índice (rebuild) e invalidação por exclusão.
7. UI de busca no chat + navegação acessível por teclado.

### B.4.6 Componentes e tecnologias reutilizáveis
`better-sqlite3` + **FTS5 (P1)** — **mesmo mecanismo** usado por VS Code/Chronicle (FTS5+BM25) e DSH (FTS5 `unicode61`) · padrão R1 de índice descartável · R8 (query como dado) · R9 (política do que entra) · R15 (texto visível) · R16 (`WeakMap` de texto já minúsculo para eventos imutáveis) · M2 (`seq`, `visibilidade`) · M3 (`superficie: current | shadowed | log-only` como filtro).
**Nenhuma dependência nova** (S11).

### B.4.7 Dependências
- **M2** obrigatória (identidade, `seq`, `visibilidade`).
- **M3** ajuda a demonstrar valor (buscar o que saiu do contexto), mas M4 **pode indexar transcript sem checkpoint**.
- **Compartilha porta com M6** (S4).
- ✅ **DECIDIDO** D109: M4 vem **depois** de M3. **Respeitado.**
- 🔎 H2 (relevância do FTS5 no nosso corpus) e 🔎 H7 (custo de RAM/boot do índice).

### B.4.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
/** Um único serviço, dois escopos (S4 / R7). M4 implementa o primeiro. */
export interface PortaBuscaHistorico {
  buscarNoChat(pedido: BuscaNoChat): Promise<PaginaBusca<HitEvento>>
  buscarEntreSessoes(pedido: BuscaEntreSessoes): Promise<PaginaBusca<HitSessao>>  // M6
}

export interface BuscaNoChat {
  sessionId: string
  chatId: string
  /** Query interpretada COMO DADO — nunca sintaxe FTS executável (R8). */
  query: string
  filtros?: FiltroEvento[]        // seq | tempo | tipo | superficie | texto-literal
  limite?: number
  cursor?: CursorBusca            // opaco, ligado à query normalizada + filtros + limite
}

export interface HitEvento {
  sessionId: string; chatId: string; messageId: string; seq: number
  papel: 'usuario' | 'assistente' | 'ferramenta'
  tipo: TipoEventoTranscript
  superficie: 'atual' | 'sombreado' | 'so_log'
  timestamp: number
  /** Trecho LITERAL limitado, selecionado em volta do match. */
  trecho: string
}

export interface PaginaBusca<T> { itens: readonly T[]; proximoCursor?: CursorBusca }

export type ErroBuscaHistorico =   // taxonomia fechada, padrão DSH
  | 'consulta_invalida' | 'filtro_invalido' | 'limite_invalido' | 'cursor_invalido'
  | 'cursor_obsoleto' | 'indice_indisponivel' | 'indice_corrompido'
  | 'sessao_nao_encontrada' | 'chat_nao_encontrado' | 'evento_nao_encontrado'
  | 'busca_desabilitada' | 'abortado' | 'persistencia_falhou' | 'conflito_de_fonte'
```

### B.4.9 Persistência e gerenciamento de estado
- Índice **derivado e descartável**: pode ser apagado e reconstruído a qualquer momento, **sem perda de dados**.
- Versão de schema + identidade de aplicação; versão incompatível ⇒ **reset in place** (R1).
- Arquivo/banco do índice **separado** do catálogo e do transcript.
- **Nunca** pode impedir salvar, reabrir ou excluir conversa.
- 🔎 H7: medir boot, RSS e latência de consulta **com um Vite só** (`docs/09 §4.1`).

### B.4.10 Regras de isolamento e segurança
- **Query como dado** (R8): nunca concatenar em sintaxe FTS. Filtros são união fechada, não SQL do usuário.
- Escopo `(sessionId, chatId)` participa da **consulta e da autorização** — não só do filtro de resultado.
- 🆕 **PROPOSTA:** **não** expor SQL livre ao modelo (R24 exige authorizer do SQLite/Node 24.10+; nosso Node é **20.20.2**, e SQL livre é superfície desnecessária).
- Política de indexação (R9 adaptado): **entra** texto de mensagem, tool call/resultado (na forma **visível**), detalhe de falha/status. **Não entra** reasoning/thinking, prompt bloqueado, evento estrutural, chunk de stream, nem texto substituído por sentinela na UI (R15).
- Nenhum segredo no índice: aplicar sanitização (R17) antes de indexar conteúdo de ferramenta — depende de ⏳ DP-03.

### B.4.11 Tratamento de erros
Taxonomia fechada acima. Regras: índice indisponível/corrompido ⇒ **degradar para busca literal sem índice** ou informar honestamente, e **nunca** bloquear o chat; `cursor_obsoleto` ⇒ pedir nova consulta; exclusão de mensagem/chat ⇒ invalidar o índice conforme política; limite de resultados para não travar a UI; `abortado` respeita `AbortSignal`.

### B.4.12 Requisitos não funcionais
- 🔎 H2: precisão@k, recall@k e MRR medidos em corpus anotado **antes** de declarar qualidade — incluindo acentuação, prefixo de identificador (`camelCase`/`snake_case`), caminhos Windows com `\`, e o caso "palavras diferentes das originais".
- Latência de consulta compatível com digitação (R16: evitar re-minúscular texto grande por tecla — OpenClaude mediu travamento no backspace com ~1,5 MB).
- RAM: sandbox tem ~1,9 GB e o build já morreu por OOM (R-7).
- Acessível: navegação por teclado, sem `position: fixed`, tokens `--vscode-*`.

### B.4.13 Testes necessários
1. Canários exclusivos A/B: buscar no chat A **não** retorna o chat B, **inclusive com a mesma frase**.
2. Acentos/prefixos/pontuação/caminho Windows.
3. Texto longo truncado; mensagem excluída; rebuild; índice indisponível; índice corrompido.
4. **Teste anti-phantom (R15):** semear um tool result cujo texto voltado ao modelo difere do visível; buscar por termo que **só existe no texto do modelo** ⇒ **zero hit**.
5. Busca em trecho de tool result; filtros por tipo/superfície/seq/tempo.
6. `query` contendo sintaxe FTS (`AND`, `NEAR`, `*`, aspas) ⇒ tratada como **dado**, sem erro de sintaxe nem execução.
7. Cursor: paginação, `cursor_obsoleto` após nova gravação, última página sem `proximoCursor`.
8. Busca funcionando **com checkpoint ativo** (M3) e retornando o **original**, não frase do resumo.
9. Volume/tempo com histórico grande (🔎 H1/H7).
10. Autorização: `chatId` de outra sessão ⇒ recusado, não "vazio".

### B.4.14 Critérios objetivos de aceite
1. Buscar um canário antigo no chat A retorna a mensagem **original** de A, com `messageId`/`seq` e **trecho literal**, após compactação.
2. Chat B / projeto diferente **não** aparece, inclusive com a mesma frase; o escopo participa da consulta **e** da autorização.
3. Abrir um hit apresenta a **fonte original** e permite ler mensagens adjacentes — nunca uma frase do resumo.
4. Índice ausente/corrompido é **reconstruído** e **nunca** impede salvar/reabrir/excluir chat.
5. Exclusão de mensagem/chat invalida o índice conforme política; limite de resultados impede travar a UI.
6. **Zero phantom match**: nenhum hit aponta para texto que a UI não exibe (S5).
7. Query com sintaxe FTS é tratada como dado.
8. 🔎 H2 registrado com números (precisão@k, recall@k, MRR, latência, tamanho do índice) **ou** declarado bloqueado/não executado — nunca omitido.
9. Typecheck 0 + testes verdes + sem regressão.

### B.4.15 Fora do escopo
Busca entre chats/projetos (M6) · tool de busca para o **agente** (M6) · semântica/embeddings (S11) · auto-injeção de resultados no prompt (M6) · busca em código/arquivos do workspace (já existe em `explorer-search`, **congelado**) · alterar `explorer-search/{core,server}` (`docs/04 §1` regra 2).

### B.4.16 Decisões pendentes desta fatia
⏳ (a) escopo de filtros expostos ao usuário (período, papel, tipo de ferramenta); (b) indexar ou não conteúdo de ferramenta/anexo — **depende de DP-03**; (c) persistir `snippet` ou recalculá-lo; (d) cota de armazenamento do índice; (e) retenção/exclusão; (f) onde vive a UI de busca no chat — **depende da Fatia 15** (janela única de abas) e não deve ser decidido antes dela.

---

## M5 — Memória persistente (escopo: **projeto**; global fica fora)

### B.5.1 Objetivo funcional
Manter **fatos úteis entre conversas do mesmo projeto** — distintos de transcript e de checkpoint — com inspeção, correção e exclusão pelo dono, proveniência, estado e sanitização de segredos.

### B.5.2 Problema que resolve
- Não existe memória persistente (§2.6). Cada conversa começa sem nada do que foi aprendido nas anteriores.
- Pedido do dono: *"compreender decisões antigas e continuar tarefas sem exigir que o usuário explique novamente todo o contexto."*
- `08_ANALISE_FATIAS_M1_M8.md`: *"Não localizado armazenamento de fatos/notas de projeto acessível ao agente."*

### B.5.3 Responsabilidades
1. Loja de registros de memória com **escopo de projeto**, identidade, tipo, estado, proveniência e timestamps.
2. CRUD completo **visível ao dono**: listar, consultar, adicionar, corrigir/substituir, excluir.
3. **Política de admissão** — o que **não** salvar (R11).
4. **Sanitização de segredos antes de persistir** (R17) e **guarda no ponto de escrita** (R18).
5. Exclusão **em cascata** sobre derivados (R-3, H9).
6. **Não** recuperar/injetar no prompt (M6) e **não** extrair automaticamente (S9/DP-02).

### B.5.4 O que já existe no código (Confirmado)
| O quê | Onde |
|---|---|
| **Diretório por projeto já existe** | `paths.ts` → `~/.agente_window/projects/<slug>/`, com `resolveProjectDir()` e guarda anti-traversal (P9) |
| **Identidade de projeto já existe (mas é frágil)** | `types.ts:97` (`slug`), `index.ts:154` (`sanitizePath(workspacePath)`) — ⚠️ **DP-01/H6** |
| Padrão de arquivo local com permissão e escrita atômica/exclusiva | `providersRepo.ts` (criação exclusiva, `0600` POSIX, permissão normal herdada no Windows — ✅ D125) |
| Padrão de tela de configuração com leitura local, timeout, retry e erro real | Casa Provedores (✅ D123/D125) |
| Precedente de CRUD com confirmação e cartão | Fatias 10/12 (cartões Permitir/Negar; `excluir` → lixeira, ✅ D97) |
| SQLite/WAL já aberto | `database.ts` |

### B.5.5 O que precisará ser desenvolvido
1. **Uma taxonomia única** de tipo de memória (⚠️ RD-6/R-14: o OpenClaude tem **duas** convivendo — não repetir).
2. Schema de registro: `memoryId`, identidade de projeto, tipo, conteúdo, estado (`provisional | confirmed | superseded`), origem (`chatId`/`messageId`/`seq` ou arquivo), criadoEm, atualizadoEm, revisão, motivo da atualização.
3. **Política de admissão** (R11) — 🆕 **PROPOSTA** de transcrição direta das cinco exclusões do OpenClaude, adaptadas:
   - padrões/convenções de código, arquitetura, caminhos e estrutura do projeto — **deriváveis** lendo o estado atual;
   - histórico Git, mudanças recentes, quem-mudou-o-quê — **`git log`/`git blame` são autoritativos** (e nós já temos `GitHost` + `POST /git/log`);
   - soluções de debug ou receitas de correção — **a correção está no código; a mensagem de commit tem o contexto**;
   - qualquer coisa já documentada nos `docs/01`–`09` do projeto;
   - detalhes efêmeros de tarefa: trabalho em andamento, estado temporário, contexto da conversa corrente (**isso é M3/checkpoint, não memória**).
   - **E o gate de pedido explícito:** as exclusões valem **mesmo quando o dono pede para salvar**; nesse caso, perguntar o que foi **surpreendente ou não óbvio** — é essa a parte que vale guardar.
4. **Sanitização** `sanitizarTextoDeMemoria(valor) → { texto, mudou, segredoInteiro }` (R17) e `sanitizarIdentificadorDeMemoria(valor) → string | null` (**rejeita** em vez de redigir parcialmente, porque o identificador vira título/nome de arquivo).
5. **Guarda de escrita** no ponto de validação das tools de escrita, não em scanner posterior (R18).
6. UI de gestão: ver origem/escopo/estado, editar, substituir, excluir.
7. **Cascata de exclusão** (R-3/H9).
8. ⏳ Decisão de formato: Markdown com frontmatter (VS Code/OpenClaude) vs. SQLite vs. JSONL.

### B.5.6 Componentes e tecnologias reutilizáveis
Diretório `projects/<slug>/` (P9) · padrão de escrita exclusiva/atômica do `providersRepo` (✅ D125) · padrão de tela com timeout/retry/erro real (✅ D123) · `better-sqlite3` se o formato for banco · **R11, R12, R17, R18, R25** · `GitHost`/`POST /git/log` já existentes (para a exclusão "Git é autoritativo").
**Nenhuma dependência nova.** ❌ **Não usar** MCP de memória, serviço remoto, embeddings (S11, §9.3 da Task 02).

### B.5.7 Dependências
- **M2** para proveniência confiável (`chatId`/`messageId`/`seq`).
- **M3** para **diferenciar** checkpoint (estado de tarefa) de memória (fato durável) — a fronteira está na exclusão "detalhes efêmeros de tarefa".
- **DP-01** 🔴 **bloqueante**: sem identidade de projeto estável, "memória de projeto" não tem escopo confiável.
- **Bloqueia M6** (recuperação precisa de uma loja).
- ✅ **DECIDIDO** D102: M5–M8 **somente para planejamento**. Nada aqui autoriza implementação.
- ✅ **DECIDIDO** `docs/02 §1.4` (privacidade): armazenamento local em `~/.agente_window`; **isolamento entre projetos e conversas**; transcript original preservado; **aprovação humana para gravar memória persistente de projeto**; exportação e exclusão explícitas; proteger credenciais; nenhuma telemetria externa presumida; não reexecutar ferramentas interrompidas.

### B.5.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
/** UMA taxonomia (S/RD-6). Valores propostos; ⏳ PENDENTE DE APROVAÇÃO. */
export type TipoMemoria = 'preferencia' | 'decisao' | 'fato_tecnico' | 'referencia'

export type EstadoMemoria = 'provisional' | 'confirmado' | 'substituido'

export interface RegistroMemoria {
  memoryId: string
  /** ⏳ DP-01: hoje seria `slug` (derivado de workspacePath). NÃO fechar antes da decisão. */
  projetoId: string
  tipo: TipoMemoria
  titulo: string                 // identificador sanitizado OU null (nunca redigido parcialmente)
  conteudo: string               // sanitizado ANTES de gravar (R17)
  estado: EstadoMemoria
  /** Estrutura recomendada por R11 para 'decisao'/'fato_tecnico': regra/fato, **Por quê**, **Como aplicar**. */
  origem: { chatId?: string; messageId?: string; seq?: number; arquivo?: string; manual: boolean }
  criadoEm: number; atualizadoEm: number; revisao: number
  motivoAtualizacao?: string
  substitui?: string[]           // memoryIds superseded — auditável
  /** R12/R13: frescor para o modelo decidir se precisa verificar. */
  verificadoEm?: number
}

export interface PortaMemoriaProjeto {
  listar(projetoId: string): Promise<RegistroMemoria[]>
  /** Manifesto de UMA linha por memória — é o que M6 oferece ao modelo (R13). */
  manifestar(projetoId: string): Promise<string>   // "- [tipo] titulo (ISO): descrição"
  obter(projetoId: string, memoryId: string): Promise<RegistroMemoria | null>
  adicionar(projetoId: string, entrada: EntradaMemoria): Promise<ResultadoEscritaMemoria>
  substituir(projetoId: string, memoryId: string, entrada: EntradaMemoria, motivo: string): Promise<ResultadoEscritaMemoria>
  excluir(projetoId: string, memoryId: string): Promise<ResultadoExclusao>   // cascata (R-3)
}

export type ResultadoEscritaMemoria =
  | { ok: true; registro: RegistroMemoria; sanitizado: boolean }
  | { ok: false; erro: 'segredo_detectado' | 'identificador_inseguro' | 'projeto_desconhecido'
                 | 'armazenamento_falhou' | 'conflito_de_revisao' | 'approvacao_necessaria' }
```

### B.5.9 Persistência e gerenciamento de estado
- Local em `~/.agente_window/projects/<slug>/` (**já existe**, P9) — ⏳ formato **PENDENTE DE APROVAÇÃO**.
- Escrita **exclusiva/atômica**, `0600` POSIX, permissão normal herdada no Windows (✅ D125 — **não** reintroduzir verificação/reparo de ACL, substituído por D125).
- **Aprovação humana para gravar** memória de projeto (✅ `docs/02 §1.4`). 🆕 **PROPOSTA (R19):** seguir o padrão do OpenClaude em que **o padrão é exigir aprovação** e um `false` explícito desliga — direção segura.
- **Sem gravação automática** no primeiro corte (S9).
- Falha de armazenamento **não** impede o chat nem apaga transcript/checkpoint.

### B.5.10 Regras de isolamento e segurança
- Registros do projeto A **nunca** aparecem no B — inclusive via cache, índice ou manifesto.
- **Memória global de usuário: FORA** (S10/DP-05).
- Segredos: `segredo_detectado` ⇒ recusar a escrita; `identificador_inseguro` ⇒ **rejeitar o valor inteiro**, nunca redigir parcialmente (R17).
- Texto de memória é **dado histórico não confiável**, nunca instrução executável (R-1).
- ✅ D125: **não** alegar isolamento de credenciais contra outros usuários da mesma máquina. O mesmo vale para memória: é armazenamento local, não cofre.
- Retenção/exportação explícitas (✅ `docs/02 §1.4`).

### B.5.11 Tratamento de erros
Taxonomia fechada acima. Regras: `segredo_detectado` **recusa** e mostra o motivo **sem** ecoar o valor; `conflito_de_revisao` preserva ambos e pede decisão; `armazenamento_falhou` mantém o chat funcionando e informa; exclusão de origem (`chatId`/`messageId`) **não** apaga a memória automaticamente, mas **marca** a proveniência como quebrada (H9).

### B.5.12 Requisitos não funcionais
- CRUD barato: listar e manifestar **sem** ler o conteúdo inteiro de todas as memórias (o manifesto usa só cabeçalho/descrição — R13).
- Auto-carregamento **parcimonioso**: se houver, só de memória curta explicitamente configurada, com **teto de linhas** (R25 usa 200). O restante é consultado sob demanda (M6).
- Nenhum segredo em log/telemetria/resposta não destinada a reveal (✅ D83/D125).
- UI acessível, tokens `--vscode-*`, nada em `position: fixed`.

### B.5.13 Testes necessários
1. CRUD completo + conflito/substituição + `superseded` não apresentado como vigente.
2. **Isolamento por projeto**: canário em A não aparece em B por nenhum caminho (lista, manifesto, busca, cache).
3. **Sanitização**: segredo inteiro ⇒ `[REDACTED]`/recusa; credencial em contexto (`a chave é X`, `use o token X`) ⇒ redigida preservando o entorno; URL com `user:pass@` e com `?token=` ⇒ sanitizada; base64 opaco ⇒ redigido; caminho/URL com `/` **não** é falso-positivo.
4. **Identificador inseguro ⇒ rejeitado** (não redigido parcialmente).
5. **Guarda no ponto de escrita**: tentar gravar segredo via tool de escrita ⇒ recusado na validação (R18).
6. **Cascata de exclusão**: excluir memória ⇒ sai da lista, do manifesto, do índice (M4/M6) e de qualquer cache; excluir a **origem** ⇒ proveniência marcada como quebrada.
7. **Política de admissão**: pedir para salvar uma "lista de PRs da semana" ⇒ o sistema pergunta o que foi não óbvio, em vez de gravar log de atividade (R11, gate explícito).
8. Falha de armazenamento não derruba o chat.
9. Aprovação: gravar sem aprovação ⇒ `approvacao_necessaria`.
10. Migração/backup e restauração.

### B.5.14 Critérios objetivos de aceite
1. Memória nova indica **projeto, origem, data e estado**; o dono consegue inspecionar, corrigir e excluir.
2. Registros do projeto A **não** aparecem no B; memória excluída **não** retorna por consulta, manifesto, cache nem índice.
3. Atualização cria histórico de proveniência auditável; `substituido` **não** é apresentado como decisão vigente.
4. **Nenhum segredo-canário é salvo**; texto não confiável continua marcado como informação histórica.
5. Memória fora do prompt **não** é carregada; inclusão no contexto é relatada em tokens e proveniência por M1.
6. Falha de armazenamento **não** impede o chat nem apaga transcript/checkpoint.
7. Gravação exige **aprovação humana** (✅ `docs/02 §1.4`) e o padrão é exigir.
8. **Nenhuma extração automática** neste corte (S9).
9. Typecheck 0 + testes verdes + sem regressão.

### B.5.15 Fora do escopo
**Memória global entre projetos** (S10/DP-05) · **extração automática** (S9/DP-02) · gravação silenciosa de fatos · sintetizar todos os chats automaticamente · embeddings/banco vetorial · MCP de memória · gravar `MEMORY.md` **dentro** do workspace do dono sem decisão de privacidade/versionamento · permitir que memória autorize execução de instrução antiga · reabrir D125 para reintroduzir ACL.

### B.5.16 Decisões pendentes desta fatia
🔴 ⏳ **DP-01** — identidade de projeto (**bloqueante**).
⏳ adicionais: (a) formato (Markdown+frontmatter vs. SQLite vs. JSONL); (b) **uma** taxonomia de tipos (proposta: 4 valores acima); (c) política de retenção/backup/exportação; (d) se pode haver escrita automática **com confirmação** (ligado a DP-02); (e) auto-load vs. consulta sempre explícita; (f) se memória fica **fora** do workspace do dono (recomendado: sim, em `~/.agente_window`, como já está).

---

## M6 — Recuperação contextual pelo agente

### B.6.1 Objetivo funcional
Permitir que o **agente** localize informação anterior **quando necessário**, dentro de escopo autorizado, devolvendo **citações verificáveis** e entrando no contexto como **dado não confiável**, com orçamento e auditoria.

### B.6.2 Problema que resolve
- Não existe recuperação pelo agente (§2.6). O teste de UI (P6) confirmou que canário de outro projeto **não** entra no request — ou seja, hoje o isolamento é por **ausência de recurso**, não por política.
- Pedido do dono: *"que a IA consiga recuperar assuntos anteriores, compreender decisões antigas e continuar tarefas sem exigir que o usuário explique novamente todo o contexto."*
- Sem M6, M4 e M5 só servem ao humano; o agente continua cego entre conversas.

### B.6.3 Responsabilidades
1. Expor a busca como **porta/ferramenta** do runtime, **separada** do botão de busca manual (M4).
2. Aplicar **escopo autorizado** e orçamento de tokens/resultados.
3. Devolver hits com **identidade + trecho literal + método/score**, e permitir **segunda leitura** limitada da fonte original.
4. Rotular o material recuperado como **histórico não confiável** e injetá-lo na posição correta do request.
5. **Relatar ausência honestamente** — nunca inventar citação.
6. Registrar **por que** cada trecho foi recuperado (auditoria + M1).

### B.6.4 O que já existe no código (Confirmado)
| O quê | Onde |
|---|---|
| **Catálogo de ferramentas com anúncio nativo** | `agir/server/ferramentas.ts` — `ler`, `listar`, `buscar`, `criar`, `escrever`, `excluir`, `executar` |
| **Loop com troca tool-call/result e teto** | `agir/server/agir.ts` (`rodarAgir`), `EventoAgir.iteracao`/`teto` |
| **Aprovações e grants server-side** | `agir/server/rotas.ts:91-95` (`permissoesPorFluxo`), F1/D103/D104/D119 |
| **Modos impostos pelo servidor** | `agir/server/modos.ts` — ✅ D108/F5-A: Perguntar/Planejar read-only |
| **Validação de território** | `agir/server/territorio.ts` |
| **Porta de busca (a criar em M4)** | S4: `PortaBuscaHistorico.buscarEntreSessoes` |
| **Loja de memória (a criar em M5)** | `PortaMemoriaProjeto.manifestar`/`obter` |

### B.6.5 O que precisará ser desenvolvido
1. **Nova ferramenta** no catálogo (ex.: `recordar`), com anúncio nativo, argumentos tipados e resultado limitado.
2. **Seleção de memória por manifesto** (R13): oferecer **cabeçalhos** (`- [tipo] titulo (ISO): descrição`) e deixar o modelo escolher **até N**, com viés de **precisão** (*"only include memories you are certain will be helpful; if unsure, do not include"*), filtrando `alreadySurfaced` antes da chamada e propagando `atualizadoEm` como frescor.
3. **Opcionalmente**, re-rank de sessões por modelo pequeno (R14) — **desligável**, com fallback puramente léxico, e com viés de **recall** (oposto ao da seleção de memória). 🔎 H3.
4. **Injeção orçada e rotulada**: material entra como conteúdo **não confiável** anexado à mensagem do usuário (R10), **nunca** como instrução de sistema.
5. **Contabilidade por referência** (R10): `originalMessages`, `retainedMessages`, `omittedMessages`, `omittedBytes`, `truncated`, `compacted`, `capturedThroughSeq` — e a coordenada é da **geração da fonte**, nunca reinterpretada na sessão receptora.
6. **Auditoria**: registrar quais chats/projetos foram consultados, por quê, e o que entrou no prompt.
7. **Controle do dono**: ver, limitar e **desligar**; 🔎 escopo cross-chat **nunca** silencioso por default.

### B.6.6 Componentes e tecnologias reutilizáveis
`PortaBuscaHistorico` de M4 (S4) · `PortaMemoriaProjeto` de M5 · catálogo/loop/aprovações/modos da casa **Agir** (já homologados nas Fatias 10/13) · `SnapshotContexto` de M1 para orçamento · **R7, R8, R10, R13, R14** · **R12** (verificar antes de recomendar) como **instrução de comportamento**.
**Nenhuma dependência nova.** ❌ Sem embeddings (S11).

### B.6.7 Dependências
- **M2** (identidade/`seq`) · **M4** (busca) · **M5** (memória) · **M1** (orçamento).
- **Fatia 13** ✅ homologada manualmente: a ferramenta nova entra no **mesmo** catálogo, com as **mesmas** aprovações e modos. `executar` (✅ D126) não é alterado.
- **DEBT-23** ✅ decidido: modos (Perguntar/Planejar/Agente/Editar) são **independentes** do nível de permissões (Manual/Permitir tudo). `recordar` é **leitura** ⇒ deve ser permitida em Perguntar/Planejar, ao contrário de `criar`/`escrever`. ⏳ **PENDENTE DE APROVAÇÃO:** confirmar que recuperação é operação de leitura para efeito de modo.
- **Fatia 14** (Personalizações/skills): não iniciada. M6 **não** deve antecipar skills/plugins/MCP.
- ✅ **DECIDIDO** D93 substituído por **D121** para caminhos: acesso sob permissões normais do SO. M6 **não** amplia poderes do agente sobre o sistema de arquivos.

### B.6.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
/** Ferramenta nova no catálogo existente. Leitura. ⏳ nome PENDENTE DE APROVAÇÃO. */
export interface PedidoRecordar {
  /** Query interpretada COMO DADO (R8). */
  query: string
  /** Escopo: SEMPRE explícito. Ausência de escopo ≠ "tudo". */
  escopo:
    | { tipo: 'chat_atual' }
    | { tipo: 'projeto'; projetoId: string }          // ⏳ DP-01
    // 'usuario_global' fica FORA (S10/DP-05)
  fontes: ('transcript' | 'memoria')[]
  limiteResultados?: number
  limiteTokens?: number
}

export interface ResultadoRecordar {
  hits: readonly HitRecuperado[]
  /** Contabilidade por referência — padrão R10. */
  contabilizacao: {
    originais: number; retidos: number; omitidos: number
    bytesOmitidos: number; truncado: boolean; compactado: boolean
    coordenadaFonte: number      // seq na GERAÇÃO DA FONTE, nunca reinterpretada
  }[]
  metodo: 'lexico' | 'lexico+rerank'
  /** Ausência é resposta válida e honesta — nunca inventar citação. */
  ausencia?: 'nenhum_resultado' | 'escopo_vazio' | 'recurso_desligado'
  tokensConsumidos: number       // reportado a M1
}

export interface HitRecuperado {
  origem: { sessionId: string; chatId: string; messageId: string; seq: number }
         | { projetoId: string; memoryId: string }
  trecho: string                 // LITERAL, limitado
  papel?: 'usuario' | 'assistente' | 'ferramenta'
  timestamp: number
  rotulo: 'historico_nao_confiavel'   // R-1: dado, nunca instrução
  /** R12: o que o modelo deve verificar antes de recomendar. */
  verificacaoSugerida?: 'checar_arquivo_existe' | 'grep_simbolo' | 'ler_git_log' | 'observar_estado_atual'
}
```

### B.6.9 Persistência e gerenciamento de estado
- M6 **não cria armazém próprio**: lê M4 (índice derivado) e M5 (loja).
- **Registro de auditoria** (quem consultou o quê, por quê, o que entrou no prompt): ⏳ **PENDENTE DE APROVAÇÃO** se vai para o log de M2 (como evento `so_log`) ou para telemetria local. **Proposta:** evento no log de M2, `visibilidade: 'so_usuario'`, sem conteúdo sensível.
- Estado de `alreadySurfaced` por chat/run (para não re-oferecer o que já foi mostrado — R13).

### B.6.10 Regras de isolamento e segurança
- **Escopo participa da autorização**, não só do filtro (padrão do critério 2 de M4). ✅ D103: *"Dados do cliente são solicitações, nunca provas de autorização"* — o servidor resolve o escopo.
- ✅ D104: permissões **não transitam** entre projetos; troca de pasta/sessão exige revalidação.
- Canário de chat/projeto fora do escopo **jamais** entra no prompt.
- **Rótulo `historico_nao_confiavel`** + posição na mensagem de **usuário** (R10) + **nenhuma** ferramenta executa com base **só** no trecho recuperado.
- **R12 como requisito de comportamento:** memória/trecho que nomeia arquivo, função ou flag é **afirmação datada**; antes de recomendar, **checar existência/grep**; se o dono pergunta por estado **recente/atual**, preferir `git log`/leitura do código ao snapshot. Evidência de que isso funciona: eval 0/2→3/3 **quando em seção própria**, 0/3 quando enterrado como bullet (R-12).
- Auto-reference proibida; teto de referências; orçamento com erro próprio (R10).
- 🔎 H8: teste de prompt injection obrigatório.

### B.6.11 Tratamento de erros
Reusar `ErroBuscaHistorico` de M4 + específicos: `'escopo_nao_autorizado'`, `'orcamento_excedido'`, `'referencia_invalida'`, `'auto_referencia'`, `'referencias_demais'`, `'recurso_desligado'`, `'fonte_conflitante'`.
Regras: índice indisponível ⇒ degradar para léxico sem índice ou informar; **ausência de resultado é resposta válida**, nunca erro; re-rank indisponível ⇒ **fallback léxico**, sem falhar a chamada; orçamento excedido ⇒ truncar **com contabilidade**, não cortar em silêncio.

### B.6.12 Requisitos não funcionais
- 🔎 H3: latência e custo da chamada auxiliar medidos **com provedor autorizado**, ou registrados como bloqueado/não executado (✅ D91/D99).
- Chamada auxiliar **opcional e desligável**; o caminho puramente léxico deve funcionar sozinho.
- Orçamento de tokens respeitado e **reportado a M1**.
- Auditoria sem conteúdo sensível nem chave.

### B.6.13 Testes necessários
1. **Isolamento**: canário em chat/projeto fora do escopo **nunca** entra no prompt — inclusive quando a mesma frase existe no escopo autorizado.
2. **Citação**: cada trecho injetado mantém referência à mensagem original; texto de resumo ou score **não** aparece como citação literal.
3. **Orçamento**: `tokensConsumidos` bate com M1; limite de resultados/bytes respeitado; truncamento **com contabilidade**.
4. **Não-instrução**: semear no transcript/memória um texto que instrui uma ação ⇒ o agente **não** executa ferramenta com base só no trecho (🔎 H8).
5. **Ausência honesta**: consulta sem resultado ⇒ `ausencia`, sem citação inventada.
6. **Verificar antes de recomendar** (R12): memória nomeando arquivo **inexistente** ⇒ o comportamento esperado é checar e reportar a divergência, não recomendar.
7. **Escopo não autorizado** ⇒ `escopo_nao_autorizado`, não resultado vazio.
8. Re-rank desligado/indisponível ⇒ fallback léxico funciona.
9. `query` com sintaxe FTS ⇒ tratada como dado.
10. Modos: em **Perguntar/Planejar**, `recordar` funciona e **nada** é escrito (✅ D108/F5-A).
11. Reload/restart: permissão e escopo revalidados; nada de recuperação silenciosa.
12. Auditoria: o dono consegue ver **quais** chats foram consultados.

### B.6.14 Critérios objetivos de aceite
1. O agente só recupera dentro do **escopo aprovado e autorizado**; canário fora do escopo **jamais** entra no prompt.
2. Cada trecho injetado mantém **referência à origem**; resumo/score nunca aparece como citação literal.
3. Tokens dos trechos são **contabilizados em M1**; número/bytes/resultados são limitados e a contabilidade é exposta.
4. Texto histórico é tratado como **dado**, não como instrução; nenhuma ferramenta executa com base somente no trecho.
5. Busca indisponível ou vazia retorna **ausência honesta**; o agente não inventa memória.
6. O dono consegue **entender quais chats foram consultados** e **desligar/limitar** o recurso; cross-chat **nunca** é silencioso por default.
7. Em Perguntar/Planejar, recupera sem escrever.
8. Typecheck 0 + testes verdes + sem regressão.

### B.6.15 Fora do escopo
Auto-busca invisível entre todos os chats/projetos · busca vetorial/semântica · **gravação automática de memória** (M5/DP-02) · **execução de instruções encontradas** · cross-project/global sem decisão própria (DP-05) · ampliar poderes do agente sobre o sistema de arquivos (✅ D121 não é ampliado) · habilitar `excluir` (✅ continua bloqueada por decisão anterior, mesmo com Permitir tudo — `docs/05` D126) · antecipar skills/plugins/MCP da Fatia 14.

### B.6.16 Decisões pendentes desta fatia
🔴 ⏳ **DP-01** (identidade de projeto, herdada de M5).
⏳ adicionais: (a) **se M6 será implementada** e em que corte; (b) same-chat primeiro vs. cross-chat no mesmo projeto; (c) consulta **explícita do agente** vs. pré-busca automática (proposta: explícita, como em todas as referências); (d) filtros e alcance expostos; (e) UI/consentimento; (f) lexical vs. lexical+re-rank (🔎 H3); (g) nome da ferramenta; (h) confirmar que recuperação conta como **leitura** para efeito de modo (DEBT-23/D108); (i) onde vive o registro de auditoria.

---

## M7 — Continuidade operacional

### B.7.1 Objetivo funcional
Depois de reload/restart, oferecer um **estado compreensível da tarefa** e retomar como **nova execução validada e autorizada** — distinguindo sempre **resultado conhecido** de **resultado indeterminado**, e **nunca** repetindo automaticamente efeito já realizado.

### B.7.2 Problema que resolve
- §2.4: sete `Map`s voláteis em `agir/server/rotas.ts` (linhas 91-95, 108-109, 158). `retomarPorFluxo` guarda `MensagemAgir[]` fiéis — **morre com o processo**.
- Reload restaura transcript e converte `working` → `completed`, saneando cartões pendentes (`sanarStatusAposF5`) — ou seja, **o app hoje afirma que terminou algo cujo resultado é desconhecido**.
- R23 (OpenCode) é explícito: retomada é **at-least-once** e **não impede repetição de efeitos externos**.
- ✅ D107 já decidiu: *"Cancelamento invalida aprovações pendentes e impede que resposta posterior reative execução. Continuação legítima requer estado e autorização revalidados."*

### B.7.3 Responsabilidades
1. Persistir **estado operacional** da execução (objetivo, passos, ação concluída/pendente, resultado, aprovações, arquivos afetados, referências ao transcript).
2. No reabrir, **comparar** identidade/caminho do workspace e estado atual (incluindo Git quando houver) e **apresentar divergências antes de continuar**.
3. Tratar aprovações como **expiráveis**; exigir **nova** autorização para escrita/terminal.
4. Ferramenta em voo ⇒ **resultado desconhecido/interrompido**, pedir inspeção; **não** concluir sucesso nem repetir.
5. **Consumir o log de M2** (S8) — **não** criar um segundo armazém de "o que aconteceu".
6. **Não** prometer reviver processo, nem idempotência geral, nem rollback de efeito externo.

### B.7.4 O que já existe no código (Confirmado)
| O quê | Onde |
|---|---|
| **Revalidação de contexto antes de retomar** | `rotas.ts:633-638` — sessão, chat, **raiz**, **modo** e **permissão efetiva**; divergiu ⇒ recusa |
| **Claim único / anti-corrida** | `rotas.ts:622-628` (`409 already_running`), `658` (identidade do objeto) |
| **Geração por fluxo** | `rotas.ts:95` (`geracaoPorFluxo`) |
| **Cancelamento invalida aprovação** | ✅ D107 / F3 (`runId`/geração/claim único; `docs/08` F3) |
| **Saneamento pós-F5** | `index.ts` (`sanarStatusAposF5`): `working` → `completed`, cartões pendentes sanados |
| **Estado de run parcialmente na mensagem** | `types.ts:48-52` (`iteracaoAtual`, `tetoAtual`, `inicioEm`) |
| **Validação de workspace/Git** | `workspaces.ts`, `worktrees.ts`, `GitHost`, `POST /git/log` |
| **Executor one-shot do agente** | ✅ D126 — `executar` cria processo separado, captura stdout/stderr, `Parar` cancela a árvore; **cancelar não desfaz efeitos já concluídos** |

### B.7.5 O que precisará ser desenvolvido
1. **Evento durável de estado operacional** no log de M2 (`run_start`, `run_end`, `tool_*`) — **consumir**, não duplicar (S8).
2. **Reconciliação no boot**: para cada run sem `run_end`, marcar `interrompido` / `resultado_desconhecido` — **em vez de** converter em `completed`.
3. **Divergências de ambiente**: comparar caminho/identidade do workspace, arquivos afetados e Git (quando houver) e **listar** antes de oferecer continuar.
4. **Expiração de aprovação**: grant antigo **não** autoriza ação nova.
5. **Fluxo "continuar"** = **nova execução**, com nova autorização, partindo do estado observado — **não** replay.
6. 🔎 Cada ponto de parada precisa de teste: antes de tool, aguardando aprovação, tool em voo, após efeito, antes de persistir resultado.

### B.7.6 Componentes e tecnologias reutilizáveis
Log de M2 · `rotas.ts` (revalidação e claim **já prontos**) · `sanarStatusAposF5` (a **corrigir** semanticamente, não a descartar) · `workspaces.ts`/`worktrees.ts`/`GitHost` · cartões de aprovação/continuar da Fatia 11 · **R23** (honestidade at-least-once) · **R6** (lock órfão detectável — o padrão que distingue "interrompido" de "terminou").
**Nenhuma dependência nova.**

### B.7.7 Dependências
- **M2** obrigatória (S8).
- **M3** para o checkpoint de contexto (retomar **com contexto** ≠ retomar **execução**).
- **Fatia 13** ✅: `executar` é one-shot e **cancelar não desfaz efeitos** (D126). M7 herda isso e **não** pode prometer o contrário.
- **Fatia 19 (Worktree & isolamento de sessões)** — não iniciada. M7 **não** deve antecipar.
- ✅ D107/D108 já fechados: não reabrir.

### B.7.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
export type EstadoRun =
  | 'em_andamento' | 'concluido' | 'cancelado' | 'erro'
  | 'interrompido'            // processo morreu; NÃO é 'concluido'
  | 'resultado_desconhecido'  // ferramenta estava em voo

export interface EstadoOperacional {
  runId: string
  sessionId: string; chatId: string
  objetivo?: string
  estado: EstadoRun
  ultimoSeq: number                 // coordenada no log de M2
  acoes: { toolCallId: string; ferramenta: FerramentaId; alvo: string
           estado: 'pendente'|'aprovada'|'negada'|'executada'|'falhou'|'desconhecida'
           efeitoRealizado?: boolean }[]
  aprovacoes: { toolCallId: string; decididaEm: number; expiraEm?: number }[]
  arquivosAfetados: string[]
  workspaceObservado: { path: string; slug: string; gitHead?: string }
  interruptoEm?: number
}

export interface ResultadoReconciliacao {
  runsInterrompidos: EstadoOperacional[]
  divergencias: {
    tipo: 'workspace_mudou' | 'workspace_inacessivel' | 'arquivo_mudou'
        | 'arquivo_desapareceu' | 'git_head_mudou' | 'sem_git'
    detalhe: string
  }[]
  /** Continuar é SEMPRE nova execução autorizada — nunca replay. */
  podeContinuar: boolean
  motivo?: string
}
```

### B.7.9 Persistência e gerenciamento de estado
- **Persistir o estado operacional** (hoje volátil) — ⏳ **PENDENTE DE APROVAÇÃO:** onde (tabela no SQLite existente vs. evento no log de M2). **Proposta:** evento no log de M2 + projeção derivada, para **não** criar um terceiro armazém. Só persistir **após** definir atomicidade e política de privacidade (já dizia a proposta de 22/10).
- Nenhum segredo de provedor no estado operacional.
- Herda as limitações R-9/R-10 (fila em memória, dois armazéns sem transação distribuída) — **constar do aceite**.

### B.7.10 Regras de isolamento e segurança
- Revalidar **sessão, chat, raiz, modo e permissão** (✅ padrão já implementado em `rotas.ts:633-638`) — M7 **estende** isso ao restart, não o substitui.
- ✅ D104: permissões vinculadas ao workspace; troca exige revalidação.
- ✅ D107: cancelamento invalida aprovações; resposta posterior **não** reativa execução.
- Workspace inacessível ou diferente ⇒ **continuidade bloqueada** com estado explicável; **nunca** gravar fora do território.
- **Nenhum replay automático** de tool/side effect.

### B.7.11 Tratamento de erros
| Situação | Comportamento |
|---|---|
| Run sem `run_end` no boot | `estado: 'interrompido'`; **não** `completed` |
| Tool em voo no momento da queda | `estado: 'resultado_desconhecido'`, `efeitoRealizado: undefined`; **pedir inspeção** |
| Workspace mudou/inacessível | `podeContinuar: false` + divergência listada |
| Git HEAD mudou | listar como divergência; **não** bloquear sozinho (⏳ decidir) |
| Grant expirado/ausente | pedir **nova** aprovação |
| Estado operacional corrompido | descartar o derivado, manter o log, informar — derivado é reconstruível (S12) |

### B.7.12 Requisitos não funcionais
- Reconciliação no boot **não** pode atrasar perceptivelmente a abertura do app (medir).
- Nenhum request espontâneo a provedor no boot.
- Zero efeito externo sem autorização atual.

### B.7.13 Testes necessários
Simular F5/restart **em cada ponto de parada**: (1) antes de tool; (2) aguardando aprovação; (3) tool em execução; (4) após escrita realizada; (5) após retorno, antes de persistir resultado. Mais: divergência de Git/arquivo; pasta removida; pasta trocada; estado `Map` perdido; sem Git; sem permissão; troca de provedor; grant expirado.
**Cada teste deve provar duas ausências:** nenhum request espontâneo **e** nenhuma repetição de efeito.

### B.7.14 Critérios objetivos de aceite
1. Reiniciar servidor/app no meio de uma execução ⇒ a UI restaura transcript/checkpoint e marca a execução como **interrompida**, nunca como ativa nem como concluída.
2. "Continuar" apresenta estado **e divergências** de workspace/Git; **nenhuma** ferramenta executa até pedido explícito.
3. Rejeição/aprovação antiga **nunca** autoriza ação nova; nova permissão é solicitada.
4. Ferramenta com resultado desconhecido **não é repetida**; o agente pede inspeção ou apresenta opção clara.
5. Pasta mudada ou inacessível ⇒ continuidade **bloqueada** com estado explicável; nada é gravado fora do território.
6. Cada afirmação do estado operacional está **ligada à evidência original** (`ultimoSeq`/`toolCallId`) ou ao estado observado.
7. `sanarStatusAposF5` deixa de converter `working` em `completed` para runs sem `run_end`.
8. Typecheck 0 + testes verdes + sem regressão.

### B.7.15 Fora do escopo
Manter processo ativo após fechar o app · **replay idempotente geral** · reexecutar terminal/escrita sem confirmação · garantir rollback de efeitos externos · reviver o mesmo processo · worktree/isolamento de sessão (Fatia 19) · alterar o executor `executar` (✅ D126).

### B.7.16 Decisões pendentes desta fatia
⏳ (a) onde persistir o estado operacional (tabela vs. evento no log de M2); (b) se divergência de **Git HEAD** bloqueia ou só avisa; (c) prazo de expiração de aprovação; (d) se "continuar" reabre o mesmo `runId` ou cria novo (proposta: **novo**, com referência ao anterior); (e) quanto do estado operacional é exposto na UI.

---

## M8 — Homologação integrada (estreitada — S6/S7)

### B.8.1 Objetivo funcional
Provar que as capacidades aprovadas funcionam **em conjunto**, sem regredir contratos e homologações do Condomínio — e aplicar **os mesmos gates a cada entrega M**, não só no fim.

### B.8.2 Problema que resolve
- Sem M8, cada fatia M seria homologada isoladamente e a **composição** (M1+M2+M3+M4+M5+M6+M7 sobre o mesmo storage, o mesmo processo e a mesma RAM) nunca seria provada.
- R-3 (derivado sobrevive à exclusão), R-1 (injection), R-2 (segredo fora do workspace) e R-7 (RAM/OOM) são **riscos de composição**, não de fatia.
- **RD-2:** o escopo antigo de M8 incluía concorrência de writer, atomicidade e recuperação — **já entregues e tecnicamente aprovados na Task 01** (P3/P4). Manter seria reabrir trabalho fechado.

### B.8.3 Responsabilidades
1. **Gates aplicados a cada entrega M** (S7): isolamento, segredos, cascata de exclusão, derivado reconstruível.
2. **Ameaças de composição**: prompt injection via transcript/memória; segredo em tool result; path traversal; autorização; exposição de usage/prompt; provedor custom; recuperação cross-chat.
3. **Benchmark** de histórico grande, índice e derivado — com número, não com impressão.
4. **Regressão integrada** dos contratos existentes: Conversa, Agir, aprovação, cancelamento, modelo/provedor, 413, compactação, pesquisa, restart.
5. **Homologação humana** no Windows real (✅ `docs/08`: *"Homologado = o dono declara"*).
6. **Não** reimplementar nada; **não** reabrir Task 01, D122, D125, D126 nem as Fatias 07–13.

### B.8.4 O que já existe (e **sai** do escopo de M8)
| Já entregue | Evidência |
|---|---|
| Temporário exclusivo + fila por sessão/destino + ordem JSONL→SQLite + revisão monotônica | P3 (Linux) e **P4** (Windows: 47% EPERM antes, **0 em 320 writes** depois) |
| Recuperação de 409 com aviso, backup e cópia separada | `SessionPersistenceNotice`, `sessionRecovery`; 6/6 UI, 3/3 cliente |
| Isolamento A/B por slug em fixture | P7 |
| Escopo do prompt = chat selecionado, só texto | P6 |
| Typecheck 0, build exit 0, ESLint focal limpo | `HOMOLOGACAO_INDEPENDENTE_TASK_01.md §4` |

### B.8.5 O que precisará ser desenvolvido
1. **Suíte de canários de isolamento** cobrindo **todos** os reads/writes/cache/busca/memória/eventos (não só os dois sessões A/B de P7).
2. **Suíte de cascata de exclusão** (H9): apagar mensagem → índice; apagar chat → checkpoint que o citou + manifesto + cache; apagar memória → índice/manifesto.
3. **Suíte de segredos** (R17/R18): canários de chave em tool result, em memória, em checkpoint, em log, em UI e em proveniência.
4. **Suíte de prompt injection** (🔎 H8): texto histórico que instrui ação ⇒ provar que não executa.
5. **Benchmark** de volume/latência/custo: histórico grande (🔎 H1), índice (🔎 H7), recuperação (🔎 H3), com e sem derivado.
6. **Matriz de regressão integrada** ligada à régua existente (`docs/09 §3.7`, 23/23) **sem** substituí-la.
7. **Roteiro de homologação humana** no estilo de `docs/08` (passo a passo, no Windows 5174 real).

### B.8.6 Componentes e tecnologias reutilizáveis
Bateria anti-regressão `run-antiregressao.sh` · régua pós-MVP `docs/09 §3.7` · fixture 5175 + reseed (`docs/09 §3.3`) · método de análise de vídeo do dono (`docs/09 §11`) · **R1** (índice descartável) · **R17/R18** (segredos) · **R10** (contabilidade) · matriz de validação `docs/08` Parte A (VAL-*) e gates não funcionais (RNF-VAL-01…05).
⚠️ **`docs/09 §1` — regra de ouro:** specs de fixture **só na 5175**; na 5174 **apagam arquivos reais** (foi assim que 206 arquivos morreram). Um Vite por vez (RAM ~1,9 GB).

### B.8.7 Dependências
- Todas as fatias M que forem aprovadas.
- ✅ `docs/08`: homologação funcional é **do dono no Windows real**; teste verde da IA **não homologa**.
- ✅ D91/D99: validação com provedor real exige acesso legítimo, ambiente seguro e autorização; senão, **registrar como bloqueado/não executado**.
- ✅ D101/`docs/09 §3.10`: paridade/superioridade só por **cenário avaliado**, com protocolo reproduzível e seis estados (`superior`, `equivalente`, `inferior`, `inconclusivo`, `não testado`, `não comparável`).

### B.8.8 Contratos de entrada e saída 🆕 **PROPOSTA**
```ts
/** Gate aplicado a CADA entrega M (S7), não só ao fim. */
export interface GateM {
  fatia: 'M1'|'M2'|'M3'|'M4'|'M5'|'M6'|'M7'|'M8'
  isolamento: { canarios: number; vazamentos: number }        // vazamentos === 0
  segredos:   { canarios: number; exposicoes: number }        // exposicoes === 0
  cascataExclusao: { origensApagadas: number; derivadosOrfaos: number } // === 0
  derivadoReconstruivel: boolean                              // true
  regressao: { suites: number; passou: number; falhou: number; falhasPreExistentes: number }
  benchmark?: { cenario: string; p50: number; p95: number; max: number; unidade: string }
  estado: 'aprovado' | 'reprovado' | 'bloqueado' | 'nao_executado'
  /** ✅ D91/D99: 'bloqueado'/'nao_executado' são respostas válidas — nunca omitir. */
  bloqueiosRegistrados: string[]
}
```

### B.8.9 Persistência e gerenciamento de estado
M8 **não persiste estado de produto**. Persiste **evidência**: relatórios com números brutos por rodada, ambiente, fixture e passos repetíveis (✅ `docs/08`, seção de avaliação comparativa D101). Política de retenção/exportação de **derivados** (índice, checkpoint, memória) é requisito de M8, mas o mecanismo é de cada fatia.

### B.8.10 Regras de isolamento e segurança
- Isolamento por projeto/chat em **todos** os caminhos: reads, writes, cache, busca, memória, eventos, auditoria.
- Exclusão/retenção cobrem **derivados** (R-3/H9).
- Logs/telemetria **sem** API key, sem corpos completos e sem conteúdo sensível por padrão (✅ D83/D125).
- Threat model obrigatório: segredo em tool result · injection em memória/transcript · path traversal · autorização · exposição de usage/prompt · provedor custom · cross-chat.
- ✅ D125: **não** alegar isolamento contra outros usuários da mesma máquina.

### B.8.11 Tratamento de erros
- Falha de gate ⇒ **rollback imediato** se o teste falhar **após** commit (✅ `docs/01 §3.D`).
- Flaky conhecido ⇒ **re-rodar 1×** antes de declarar regressão (✅ `docs/09 §4.2`).
- `estado: 'bloqueado'`/`'nao_executado'` são **resultados válidos e obrigatórios de registrar** (✅ D91/D99). **Nunca inventar sucesso** (✅ `docs/01 §3.C`).
- OOM/exit 137 em build ⇒ registrar como **bloqueio de recurso do ambiente**, não como falha funcional (precedente: `06_RESULTADOS_DOS_TESTES.md`).

### B.8.12 Requisitos não funcionais
- RAM ~1,9 GB: um Vite por vez; code-server 8080 desligado durante a bateria; clones/runtimes em `~/.cache` (✅ `docs/01 §3.B`, `docs/09 §3.4/§4.1`).
- Cada gate deve caber **num turno** (✅ `docs/09 §4.4`).
- RNF-VAL-01…05 de `docs/08` Parte A continuam valendo (responsividade de input ≤16 ms nas interações principais; zero escrita parcial em falha simulada; zero cor crítica hardcoded).

### B.8.13 Testes necessários
Fuzz/corrupção de derivado · concorrência de save **e** de compactação · migração/schema antigo · exclusão em cascata · secret scrub · ACL cross-projeto/chat · offline · 413 · provedor **sem** `usage` · limite **desconhecido** · multimodal/anexos · tool result grande · rate limit · restart em cada estado (herdado de M7) · E2E das fatias em ordem e fixtures isoladas conforme `docs/09`.

### B.8.14 Critérios objetivos de aceite
1. Typecheck/unit/build relevantes aprovados; E2E executados **em ordem e fixtures isoladas** conforme `docs/09`.
2. Canários demonstram isolamento A/B/projeto; **nenhuma** resposta de busca ou memória atravessa escopo.
3. Falhas e reinícios **não destroem** transcript nem **reaplicam** side effects; ferramenta de escrita continua exigindo aprovação atual.
4. Segredo-fixture **nunca** aparece em store, log, UI ou proveniência.
5. Índices/derivados podem ser **apagados e reconstruídos sem perda de dados**; checkpoint inválido **recua** com explicação.
6. Benchmark documenta volume, latência e custo; qualquer migração de writer/DB tem **comparação antes/depois** e **plano de rollback**.
7. O indicador de contexto usa **uso real reportado** quando disponível e exibe estimativa/indisponibilidade com honestidade — **sem percentual hardcoded**.
8. **Documentação canônica só é atualizada após decisão explícita** e nova SPEC homologável.
9. **Homologação = declaração do dono** no Windows real (✅ `docs/08`).

### B.8.15 Fora do escopo
Reabrir Task 01 (P3/P4) · reabrir D122/D125/D126 · reabrir homologações históricas das Fatias 07–13 · criar critério de aceite retroativo para Fatias 07–12 · declarar paridade global D101 · declarar as 20 CAP homologadas por inferência (✅ `docs/08` proíbe explicitamente) · alterar áreas congeladas.

### B.8.16 Decisões pendentes desta fatia
⏳ (a) políticas de retenção/exportação/telemetria; (b) critérios de benchmark e se há **bloqueio de release**; (c) suporte mínimo de provedor exigido; (d) quem faz a revisão de licenças se houver adaptação localizada de código; (e) quais documentos canônicos serão atualizados **quando** houver aprovação — e isso é decisão do dono, não desta missão.

---

## PARTE C — Dependências e sequência (proposta para aprovação)

### C.1 Grafo de dependências

```
                       ┌──────────────────────────┐
                       │  Task 01 (persistência)  │  ✅ entregue; aprovação técnica
                       │  fila · temp exclusivo · │     independente; homologação
                       │  revisão monotônica ·409 │     oficial PENDENTE (§0.1)
                       └────────────┬─────────────┘
                                    │ base de confiabilidade (não reabrir)
                                    ▼
   ┌────────────┐          ┌────────────────┐
   │    M1-a    │────────▶ │       M2       │  pré-requisito de TUDO
   │ estado     │          │ eventos fiéis  │  (conclusão 3, Task 02)
   │ honesto    │          │ seq · toolCall │
   └─────┬──────┘          └───┬────┬───┬───┘
         │                     │    │   │
   ┌─────▼──────┐              │    │   └──────────────┐
   │    M1-b    │ 🔎H4         │    │                  │
   │ usage real │ (credencial) │    │                  │
   └─────┬──────┘              ▼    ▼                  ▼
         │              ┌──────────┐ ┌────────┐  ┌──────────┐
         └────────────▶ │    M3    │ │   M4   │  │    M7    │
            orçamento   │ Projeção │ │ busca  │  │ continuidade
            (auto só    │ + poda   │ │ chat   │  │ operacional│
            com M1)     │ determ.  │ │ atual  │  └────┬─────┘
                        └────┬─────┘ └───┬────┘       │
                             │           │            │
                             │      ┌────▼─────┐      │
                             │      │    M5    │◀── DP-01 🔴
                             │      │ memória  │      │
                             │      │ projeto  │      │
                             │      └────┬─────┘      │
                             │           │            │
                             ▼           ▼            │
                        ┌──────────────────────┐      │
                        │          M6          │◀─────┘
                        │ recuperação pelo     │◀── DP-01 🔴
                        │ agente (2.º escopo   │
                        │ da porta de M4)      │
                        └──────────┬───────────┘
                                   ▼
                        ┌──────────────────────┐
                        │          M8          │  gates em CADA entrega (S7)
                        │ homologação integrada│  + fechamento no fim
                        └──────────────────────┘
```

**Leitura do grafo:**
- **M1-a → M2 → {M3, M4, M7}**: M2 é o nó crítico. Sem eventos fiéis, M3 não tem fronteira segura, M4 não tem o que indexar e M7 não tem o que reconciliar.
- **M1-b é paralelizável** e **não bloqueia M2/M3-estágio-1/M4** (S1/S3). Só bloqueia **compactação automática** e **medição reportada**.
- **M5 → M6** e **M4 → M6**: M6 é o último dos funcionais porque é o único que **compõe** busca + memória + orçamento + auditoria.
- **DP-01** 🔴 está no caminho de **M5 e M6**, não no de M1–M4. Ou seja: **M1-a, M2, M3, M4 e M7 podem ser especificados e aprovados sem resolver DP-01.**
- **M8 não é só o fim**: é um conjunto de gates aplicados a cada caixa (S7).

### C.2 Compatibilidade com a sequência canônica

| Fonte canônica | O que diz | A proposta conflita? |
|---|---|---|
| ✅ **D109** (`docs/05`) | *"Manter M1 → M2 → M3 → M4 e suas dependências aprovadas. Especificação paralela M1/M2 sugerida em D102 fica revogada. Investigações preparatórias podem correr em paralelo, sem alterar sequência."* | **Não.** A ordem proposta é exatamente M1 → M2 → M3 → M4 → (M5 → M6) → M7 → M8. M1-a/M1-b são **estágios internos** de M1, não paralelismo M1/M2. |
| ✅ **D102** (`docs/05`) | M5–M8 formalizadas **somente para planejamento**; IC-01–IC-09 são propostas documentais | **Não.** M5–M8 continuam **proposta**, sem autorização. |
| ✅ `docs/06` | Ordem oficial: **Gate D98 → 13 → 14 → 15 → M1 → M2 → M3 → M4** | **Não.** Nenhuma renumeração, nenhuma antecipação. |
| ✅ `docs/02 §4` | *"Os rótulos M não são números oficiais de fatia"* | **Não.** Nenhum rótulo foi promovido. |
| ⚠️ `08_ANALISE_FATIAS_M1_M8.md` (nossa investigação) | sugeria *"M4 pode avaliar busca lexical manual"* **antes** de M3 | **Sim, diverge de D109.** → **Esta proposta DESCARTA a sugestão anterior e mantém M3 antes de M4**, porque D109 é decisão fechada. Registro honesto da divergência, sem reabrir a decisão. |
| ⚠️ pacote de 22/10 | "posição hipotética 13…20" para M1–M8 | **Sim, diverge da numeração D95.** → **DP-04.** Nenhuma renumeração feita. |

### C.3 Relação com as demais fatias e iniciativas

| Item | Relação proposta | Status |
|---|---|---|
| **Fatia 13 — Terminal-para-o-agente** | M2 **registra** os eventos de `executar`; M7 **herda** o fato de que `Parar` **não desfaz efeitos já concluídos**. M6 adiciona ferramenta **ao mesmo catálogo**, com as mesmas aprovações. **Nenhuma** altera o executor one-shot nem o PTY humano. | ✅ D126 fechado; homologação manual limitada (`docs/08`) |
| **Fatia 14 — Barra esquerda + Personalizações + Skills** | **M5/M6 não devem antecipar skills/plugins/MCP.** A UI de gestão de memória e o lugar da busca no chat **dependem** de onde a Fatia 14 colocar Personalizações. Skills são o caminho natural para memória plugável **depois**. | Não iniciada |
| **Fatia 15 — Janela única de abas (DEBT-12)** | Define **onde** uma superfície de busca/memória pode viver. ⏳ A UI de M4 **não deve ser decidida antes** da Fatia 15. O **servidor** de M4 pode ser especificado e aprovado antes. | Não iniciada |
| **Integração MCP futura** | **Fora** de todas as fatias M (S11, §9.3). Se um dia houver, o padrão observado no DSH é o mínimo: default-off, processo filho sem variáveis de credencial, e responsabilidade de armazenamento/embeddings/licença do provedor. | Sem SPEC |
| **Execução automática de skills** | **Fora.** Nenhuma fatia M executa skill. M6 recupera **dado**, não dispara execução. | Sem SPEC |
| **DEBT-14 (catálogo/seleção de modelo)** | M1 **não** conserta DEBT-14; apenas **lê** o alvo efetivo já resolvido por `obterAlvoDeConversa`. ✅ D115–D117/D122 continuam governando. | Transversal |
| **DEBT-23 (modos × permissões)** | M6 precisa saber se `recordar` é **leitura** para efeito de modo. ⏳ **PENDENTE DE APROVAÇÃO.** | ✅ decidido na Fatia 13 |
| **DEBT-21 (isolamento de E2E)** | M8 **herda** o problema: specs 08/09 já dividem armazém persistente sem fixture. Qualquer E2E de memória/índice **precisa** de fixture própria, senão reproduz a mesma dívida. | Aberta |
| **F1–F5-B** | M6 depende de **F1** (autoridade do servidor, grants por sessão+workspace) e não pode enfraquecer **F3** (cancelamento invalida aprovação), **F4** (criar exclusivo / escrever condicional) nem **F5-A** (modos impostos pelo servidor). ✅ D121/D122/D125 continuam vigentes. | Aprovadas por D119; **nenhuma homologada** |
| **Gate D98 / PERF** | Fechado por decisão do dono. 🔎 H7 (custo de índice na RAM) **deve** respeitar o mesmo método de medição de `docs/09 §3.8`: fixture isolada na 5175, um Vite por vez, 3 execuções independentes por volume, preservando failures. | ✅ fechado |
| **CAP-08 / CAP-09 / CAP-10 / CAP-16** (`docs/02 §1.3`) | M5 ≈ CAP-08 (memória persistente) · M1+M3 ≈ CAP-09 (gestão de contexto) · M4+M6 ≈ CAP-10 (recuperação) · M7 ≈ CAP-16 (continuidade). **Mapeamento proposto, não declaração de cobertura.** ✅ `docs/08` proíbe marcar CAP homologada por inferência. | Visão aprovada (D100); cobertura **pendente** |

### C.4 Ordem de execução proposta (para aprovação — **não** altera a canônica)

| Ordem | Entrega | Por quê aqui | Gate M8 aplicável |
|---|---|---|---|
| **0** | **Resolver DP-01** (identidade de projeto) | 🔴 Bloqueia M5/M6. **Não** bloqueia 1–4, então pode correr em paralelo à especificação delas. | — |
| **1** | **M1-a** — contrato + estado honesto | Menor risco, maior ganho imediato de honestidade (R-5: o dono vê 18%–92% falso **hoje**). Não exige credencial. P8 mostra que o denominador já existe. | Segredos (não vazar chave no snapshot) |
| **2** | **M2** — eventos fiéis | Nó crítico. Tudo depende dele. | Segredos em tool result (DP-03) · isolamento · P3/P4 continuam verdes |
| **3** | **M3 estágio 1** — poda determinística + *pruning* + fronteira balanceada | Entrega redução de tokens **sem LLM** (S3), logo **sem** H3/H4/H5. | Cascata · derivado reconstruível |
| **4** | **M4** — busca no chat atual + porta de dois escopos | FTS5 já comprovado (P1). Índice descartável (S12). | Isolamento · anti-phantom · H2/H7 medidos ou bloqueados |
| **5** | **M1-b** — `usage` real | Aqui vale a pena: M3/M4 já geram payload cuja medição importa. 🔎 H4. | Sem segredo · estados honestos |
| **6** | **M3 estágio 2** — checkpoint derivado + resumo estruturado | Depende de M1 (orçamento) e M2 (fronteira). Começar **manual/opt-in**. | Lock órfão · fingerprint · regressão |
| **7** | **M5** — memória de projeto (explícita, curada) | Depende de DP-01 e M2. **Sem** extração automática (S9). | Segredos (R17/R18) · cascata (H9) · aprovação por padrão |
| **8** | **M7** — continuidade operacional | Pode vir antes de M5/M6 (é independente do conhecimento), mas **depois** de M2. Proposta aqui por aproveitar M3 (checkpoint de contexto). | Nenhum request espontâneo · nenhum efeito repetido |
| **9** | **M6** — recuperação pelo agente | Último dos funcionais: compõe M4+M5+M1 e exige todos os gates. | Injection (H8) · escopo autorizado · orçamento · auditoria |
| **10** | **M8 fechamento** — composição, benchmark, regressão integrada, homologação humana | Só faz sentido com o conjunto aprovado. | Todos |

**Observações honestas sobre a ordem:**
- Os passos **1–4 não dependem de DP-01**, então a decisão pode amadurecer enquanto M1/M2 são especificados.
- **M7 foi movido para depois de M3** nesta proposta (o estudo de 22/10 o tratava como "fluxo operacional independente"). Justificativa: retomar **com contexto útil** depende de checkpoint; retomar **só com transcript** é o que já acontece hoje e é justamente o comportamento que M7 deve melhorar. **Se o dono preferir M7 antes**, ele é tecnicamente viável logo após M2 — registrar como ⏳ **PENDENTE DE APROVAÇÃO**.
- **M5 e M6 poderiam ser uma única entrega** se o dono quiser reduzir o número de aprovações; a Task 02 mostrou que as **responsabilidades** são distintas (RD-7), mas nada impede um **corte de entrega** combinado. ⏳ **PENDENTE DE APROVAÇÃO.**

---

## PARTE D — Pendências consolidadas para avaliação do dono

### D.1 Decisões arquiteturais (herdadas da Task 02)

| ID | Pergunta | Bloqueia | Recomendação de processo |
|---|---|---|---|
| **DP-01** 🔴 | O que é "o mesmo projeto": caminho do workspace, raiz do Git, ou ID explícito? | **M5, M6** | Decidir antes de especificar M5. Enumeração de opções na Task 02 §8; **nenhuma foi escolhida aqui**. Intersecta ✅ D104 e a decisão de que **Git é opcional** no fluxo 06.4a. |
| **DP-02** 🟡 | Extração automática de memória cabe no "Agent Loop único"? | M5 automático (não M5 explícito) | Proposta S9: **não fazer** extração automática no primeiro corte. 3 das 4 referências de código não fazem. |
| **DP-03** 🟡 | Onde mora o conteúdo grande de tool result: verbatim, referência/localizador (spill), ou truncamento? | **M2** (contrato), M4 (o que indexar), M5 (sanitização) | Enumeradas as quatro respostas das referências (Task 02 §8). Agravante: persistir resultado de `ler` **move conteúdo do projeto para fora do projeto**. |
| **DP-04** 🟢 | Os rótulos M têm "posição" no roadmap? | Nada técnico | Documental. Conflito entre "posição hipotética 13–20" (pacote 22/10) e a numeração D95. **Nenhuma renumeração feita.** |
| **DP-05** 🟡 | Memória global de usuário entra em algum corte? | M5 (escopo) | Proposta S10: **fora** do primeiro corte; decisão própria com requisitos mínimos (opt-in, dashboard ver/editar/apagar, cascata de exclusão, sanitização, nenhuma inferência de objetivo não declarado). |
| **DP-06** 🟡 | Quem compõe a Projeção de Contexto? | **M3** (endereço) | Proposta S2: **prefeitura**, com M3 como casa dona do contrato. Criar novo ponto de composição é decisão arquitetural. |

### D.2 Hipóteses que precisam de medição antes de virar requisito

| ID | Hipótese | Bloqueia | Como validar |
|---|---|---|---|
| **H1** | Writer de reescrita integral aguenta sessões longas reais | M2 (append vs. reescrita) | Benchmark 2k/10k/50k msgs com tool results realistas; protótipo append-only **descartável** |
| **H2** | FTS5 `unicode61` tem relevância aceitável no nosso corpus | M4, M6 | Corpus anotado; precisão@k, recall@k, MRR, latência, tamanho do índice; testar acentos, identificadores, caminhos Windows, "palavras diferentes das originais" |
| **H3** | Seleção/re-rank por LLM tem custo e latência aceitáveis com os nossos provedores | M6 | Medir com provedor **autorizado**; sem acesso ⇒ **bloqueado/não executado** (✅ D91/D99) |
| **H4** | `usage` é obtível nos 4 protocolos **e nos intermediários que o dono usa** (LiteLLM, Ollama Cloud) | M1-b | Uma chamada por protocolo com credencial autorizada, registrando **só** os campos de uso |
| **H5** | Comportamento real de 413/overflow por provedor | M3 | Payload deliberadamente grande contra endpoint controlado/autorizado |
| **H6** | Identidade por `slug` derivado de caminho é suficiente | M5, M6 | Levantar caminhos reais do dono; testar dois caminhos para o mesmo repo, repo movido, subpasta vs. raiz, worktree |
| **H7** | Índice derivado não degrada boot nem RAM (~1,9 GB) | M4 | Protótipo descartável; **um Vite só**; método de `docs/09 §3.8` |
| **H8** | Prompt injection via transcript/memória é risco real **no nosso fluxo** | M5, M6, M8 | Caso de teste em **fixture**, com permissões atuais (Manual) |
| **H9** | Excluir origem apaga **todos** os derivados | M5, M8 | Testar cascata: índice + checkpoint citando + manifesto + cache |
| **H10** | Flags/`feature()` são aplicáveis ao nosso stack (Vite, sem Bun) | desenho de M5/M6 | Verificar `define`/`import.meta.env` vs. configuração em runtime; **tender a runtime** (o dono homologa no Windows sem rebuild) |

### D.3 Contratos marcados **PENDENTE DE APROVAÇÃO** (índice rápido)

| Fatia | Contrato/elemento pendente |
|---|---|
| **M1** | Aditivo a `AlvoConversa` (`contexto`, `origemContexto`) · `SnapshotContexto` · evento aditivo no fio · reserva de saída no denominador visual · limiares por modelo vs. globais · política do provedor genérico |
| **M2** | `EventoTranscript` + `TipoEventoTranscript` + `visibilidade` · `ProjecaoRequest` · **DP-03** · JSONL de eventos vs. tabela SQLite · retenção de conteúdo de ferramenta · versionamento/migração |
| **M3** | **DP-06** (dono da Projeção) · `CheckpointContexto` + `SecoesResumo` · sidecar vs. tabela · limiar e manual-vs-automático no primeiro corte · modelo/estratégia de sumarização · retenção |
| **M4** | `PortaBuscaHistorico` (dois escopos) · `HitEvento` · taxonomia `ErroBuscaHistorico` · política de indexação · `snippet` persistido vs. recalculado · cota/retenção · **UI só depois da Fatia 15** |
| **M5** | **DP-01** 🔴 · **uma** taxonomia `TipoMemoria` · formato (Markdown+frontmatter vs. SQLite vs. JSONL) · política de admissão (R11 adaptado) · aprovação por padrão · cascata de exclusão · **DP-02** · **DP-05** |
| **M6** | **DP-01** 🔴 · ferramenta nova (`recordar`) e se conta como **leitura** para efeito de modo (DEBT-23/D108) · `PedidoRecordar`/`ResultadoRecordar`/`HitRecuperado` · escopos permitidos · lexical vs. lexical+re-rank · consentimento/UI · onde vive a auditoria |
| **M7** | `EstadoOperacional`/`ResultadoReconciliacao` · onde persistir (tabela vs. evento no log de M2) · Git HEAD bloqueia ou avisa · expiração de aprovação · `runId` novo vs. reaberto · mudança de `sanarStatusAposF5` |
| **M8** | `GateM` · retenção/exportação/telemetria · critérios de benchmark e bloqueio de release · suporte mínimo de provedor · revisão de licenças · quais canônicos atualizar **quando** houver aprovação |

---

## PARTE E — Resumo executivo (linguagem simples)

### 1. O que já temos

- **Persistência de conversa confiável.** Catálogo em SQLite + transcript JSONL por projeto/sessão, com fila por sessão, arquivo temporário exclusivo, revisão monotônica e recuperação visível de conflito (409) com "Save a separate copy". A corrida que fazia perder mensagem foi **corrigida e medida**: no Linux, 2 rodadas de 16 gravações simultâneas passaram de 2 e 6 falhas para **zero**; no Windows 11, onde 100 `rename` concorrentes davam **47 EPERM**, o writer corrigido fez **320 gravações sem nenhuma falha**. Está **aprovada tecnicamente por auditoria independente**, mas **ainda sem homologação oficial do dono** e os canônicos estão desatualizados sobre isso.
- **Identidade e pasta de projeto já existem.** `Session.slug` e `~/.agente_window/projects/<slug>/` com proteção contra traversal.
- **O limite da janela de contexto já existe nos 8 provedores** (32.768 a 1.000.000 tokens), é configurável pelo dono, validado e com fallback — **só não é usado**.
- **Ferramentas, aprovações, modos, permissões, cancelamento e teto de iterações** funcionando e homologados (Fatias 10, 11, 13).
- **Revalidação de contexto antes de continuar** já implementada: para retomar, o servidor confere sessão, chat, pasta, modo e permissão.
- **FTS5 comprovado no SQLite que já usamos** (`better-sqlite3@12.11.1`, SQLite 3.53.2) — execução real, não leitura de código.
- **Reescrita do JSONL é barata** até o volume medido: 200 mensagens (~235 KB) salvam em p50 **1,9 ms** e releem em p50 **1,1 ms**.

### 2. O que falta construir

- **Fidelidade da fonte (M2).** Hoje o transcript guarda o **cartão da interface** — um resumo — e não a chamada de ferramenta com argumentos, `toolCallId` e resultado completo. O turno seguinte recebe só `{role, content}`. **Nenhuma memória recupera o que não foi gravado.** Este é o nó crítico: M3, M4, M5, M6 e M7 dependem dele.
- **Medição honesta de contexto (M1).** O número que o dono vê hoje — "18% a 92% do contexto utilizado" — é uma fórmula sobre **o tamanho do rascunho digitado**. Não vê histórico, ferramentas, system prompt nem limite do modelo. **Nenhum código de produção lê `usage`.**
- **Redução de contexto (M3).** Não existe nada. Todo o texto elegível é reenviado, sem corte, sem orçamento.
- **Busca no histórico (M4).** Não existe. A única busca é a de **arquivos do workspace**.
- **Memória (M5).** Não existe, em nenhum escopo.
- **Recuperação pelo agente (M6).** Não existe. Hoje o isolamento entre conversas é garantido **pela ausência do recurso**, não por política.
- **Continuidade após reinício (M7).** O estado de execução mora em **sete `Map`s voláteis**. Pior: no F5, uma execução em andamento é convertida em `completed` — o app **afirma que terminou** algo cujo resultado é desconhecido.
- **Homologação da composição (M8).** Nada disso foi testado junto.

### 3. O que podemos aproveitar pronto

**Dentro do projeto (custo zero de dependência):** `better-sqlite3` **com FTS5 comprovado** · o diretório por projeto e sua guarda anti-traversal · a fila, o temporário exclusivo e a revisão monotônica da Task 01 · o `providersRepo` que **já** resolve `contexto` · `chatAlvo.ts` como ponto único de encontro Provedores×Conversa · `EventoAgir.iteracao` como veículo aditivo · a Casa Config como precedente de limite configurável · as taxonomias fechadas de erro em PT-BR claro · o padrão casa/porta única com `frontier.test.ts`.

**Das referências, como conceito (nunca como código):**
- **DeepSeek Harness:** medidor com **âncora de usage + delta heurístico** (resolve a armadilha de que compactação não reporta usage); **corte seguro por pareamento de tool-call/result** com falha fechada; **spill** (conteúdo grande vira artefato + localizador); índice FTS5 **descartável** com versão de schema, identidade de aplicação e reset in place; **dois escopos de busca** no mesmo serviço; **query tratada como dado**; referência cross-session **explícita, orçada, contabilizada e rotulada como não confiável**; compactação como **seam opcional** (igual ao nosso Monolito Modular).
- **OpenClaude:** **política do que NÃO salvar** em memória (não salvar o que é derivável do projeto; `git log`/`git blame` são autoritativos; e o gate de perguntar "o que foi não óbvio" **mesmo quando o usuário pede para salvar**); **verificar antes de recomendar** (memória que nomeia arquivo/função é afirmação **datada** — checar se existe; preferir código/`git log` a snapshot) — com **números de avaliação**: 0/2 → 3/3 quando em seção própria, **0/3** quando enterrado como bullet, e o **cabeçalho** mudou o resultado de 0/3 para 3/3 com o mesmo texto; seleção de memória por **manifesto de cabeçalhos** + LLM escolhendo ≤5 com viés de **precisão**; busca de sessões em **dois estágios** (léxico barato + re-rank por modelo pequeno) com viés de **recall**; **indexar o texto que o usuário vê** (*"under-count is honest, phantom is a lie"*); **sanitização de segredos antes de persistir** e **guarda no `validateInput` das tools de escrita**; extração em fork com **aprovação por padrão**.
- **OpenCode:** template de resumo com sete seções fixas (objetivo, requisitos, decisões, estado do trabalho {concluído/ativo/bloqueado}, próximo passo, arquivos relevantes, contexto importante); retomada declarada **at-least-once**, sem prometer ausência de efeito duplicado.
- **VS Code/Copilot:** memória local em **arquivos** com três escopos por diretório, mutação **com confirmação**, injeção automática **parcimoniosa** (só notas de usuário, teto de 200 linhas) e limpeza de sessão em 14 dias.
- **Meta AI:** apenas como **referência de governança de produto** — memória opt-in com dashboard de ver/editar/apagar, escopo 1:1 como **decisão de segurança**, e o **contra-exemplo** documentado de excesso (dossiês horários, inferência de objetivos não declarados, e *"may still remember information it learned from what you deleted"*). **Evidência secundária; não usar como base técnica.**

### 4. O que **não** precisamos implementar

- **Banco vetorial, embeddings ou auto-RAG.** **Nenhum** dos quatro projetos de código auditados usa isso para recuperar conversa: VS Code usa FTS5+BM25; DeepSeek Harness usa FTS5 `unicode61` + filtros de metadata; OpenCode usa `LIKE` no título; OpenClaude usa léxico + re-rank por modelo pequeno. E o servidor de memória de referência do próprio ecossistema MCP faz *"case-insensitive substring matching […] not semantic retrieval"* e *"does not add embeddings"*. Adicionar embeddings traria custo, superfície de segurança, dependência nova e — se remoto — decisão de consentimento e retenção, **sem problema medido que justifique**.
- **Serviço de memória remoto ou em nuvem.** Choca com D105 (acesso exclusivamente local) e com `docs/02 §1.5` (armazenamento local, nenhuma telemetria externa presumida).
- **Servidores MCP de memória** (Memorix, server-memory, Engram). São **default-off** até no DeepSeek Harness e exigem processo filho separado e runtime adicional; nosso MVP é **um prédio**.
- **Segundo motor de banco** (DuckDB, Postgres, `node:sqlite`). Já temos `better-sqlite3` **com FTS5 comprovado**. `node:sqlite` exigiria Node 22+; estamos em **20.20.2**.
- **SQL livre exposto ao modelo** (estilo `SessionStoreSqlTool` do VS Code). Exige authorizer do SQLite disponível a partir de Node 24.10; e filtros fechados resolvem com superfície de risco muito menor.
- **Múltiplos agentes / subagentes para memória.** A recuperação nas referências usa **uma chamada auxiliar com modelo pequeno**, não subagente. E temos "Agent Loop único" como condição de adoção.
- **Memória global automática de usuário.** Sem precedente seguro nas referências de código; o único precedente em produto tem crítica pública registrada.
- **Compactação automática no primeiro corte.** Exige thresholds, disjuntor, cooldown, normalização de config e poda determinística — superfície grande. Começar manual/opt-in.
- **Migrar o writer JSONL para append-only.** Sem gargalo medido (1,9 ms para 200 mensagens). Medir em volume maior antes.
- **Tokenizer próprio.**
- **Três implementações separadas de busca.** Um serviço, dois escopos.

### 5. Quais decisões ainda dependem da nossa aprovação

**Uma é bloqueante:**
- 🔴 **DP-01 — O que é "o mesmo projeto"?** Hoje `slug` deriva do **caminho do workspace**. OpenClaude ancora na **raiz do Git**; DeepSeek Harness filtra por **`cwd`**; o GitHub separa "fatos de repositório" de "preferências pessoais". E a nossa própria D104 fala em *"pasta **ou identidade do projeto**"* sem definir a segunda, enquanto o fluxo 06.4a decide que **Git é opcional**. Consequência prática: o mesmo repo aberto de dois caminhos vira **dois projetos**, e repo movido deixa o histórico **órfão**. **M5 e M6 não têm escopo confiável sem isso.** Enumerei as opções na Task 02 §8; **não escolhi nenhuma**.
  → **Boa notícia:** DP-01 **não** bloqueia M1, M2, M3 nem M4. Dá para especificar e aprovar esses quatro enquanto a decisão amadurece.

**Outras cinco:**
- 🟡 **DP-02** — Extração automática de memória cabe no "Agent Loop único"? (proposta: **não fazer** no primeiro corte)
- 🟡 **DP-03** — Onde mora o conteúdo grande de tool result: verbatim, referência/spill, ou truncamento? (bloqueia fechar o contrato de M2; agravante: persistir resultado de `ler` **move conteúdo do projeto para fora do projeto**)
- 🟢 **DP-04** — Os rótulos M têm posição no roadmap? (documental; conflita com a numeração D95; nada foi renumerado)
- 🟡 **DP-05** — Memória global de usuário entra em algum corte? (proposta: **fora**, com decisão própria e requisitos mínimos)
- 🟡 **DP-06** — Quem compõe a Projeção de Contexto? (proposta: **prefeitura**, com M3 dona do contrato)

**Mais dez hipóteses a medir** (H1–H10), das quais quatro exigem **credencial autorizada ou Windows real** e, sem isso, devem ser registradas como **bloqueado/não executado** — nunca como "passou" (D91/D99).

### 6. As Fatias M1 a M8 estão prontas para consolidação na documentação canônica?

**Não. Nenhuma delas.**

| O que existe agora | O que falta para virar norma |
|---|---|
| Contratos **propostos** com objetivo, responsabilidades, o que já existe (com arquivo e linha), o que desenvolver, reutilizáveis, dependências, entrada/saída, persistência, isolamento, erros, RNF, testes, aceite e fora-de-escopo — os 15 itens exigidos | **Aprovação do dono** de cada contrato |
| Ordem de execução proposta, **compatível** com D109 (M1→M2→M3→M4) e com a sequência oficial D98→13→14→15→M1→M4 | Decisão sobre **DP-01** (bloqueante para M5/M6) e sobre as outras cinco |
| Evidência consolidada, com o que é comprovado, o que é hipótese e o que não foi encontrado | **Medição** de H1–H10 |
| Riscos e dependências mapeados | **SPEC oficial** por fatia, no formato de `docs/06` |
| — | **Autorização de implementação** (✅ D102 mantém M5–M8 **somente para planejamento**) |

**Registro explícito, conforme exigido:**
- **Nenhuma proposta arquitetural deste documento está homologada.**
- **Nenhuma funcionalidade foi implementada.**
- **Nenhum roadmap foi alterado** e **nenhuma sequência canônica foi tocada.**
- **Nenhuma documentação canônica (`docs/01`–`09`) foi alterada.**
- **Nenhum código-fonte foi alterado.**
- A documentação desta investigação **permanece temporária** e **não** foi movida para `arquivo_morto/` — essa organização será tratada separadamente, como determinado.

---

## PARTE F — Registro de conformidade da Task 03

| Exigência da missão | Cumprimento |
|---|---|
| Usar **exclusivamente** conclusões verificadas da Task 02 + contratos existentes | ✅ Toda referência a P#/R#/H#/DP-#/RD-#/R-# aponta para `11_TASK02_…` |
| Não implementar memória | ✅ nenhum código alterado |
| Transformar investigação em requisitos, responsabilidades, dependências, contratos e critérios de aceite | ✅ Parte B, 15 itens por fatia |
| Revisar M1–M8, sem forçar responsabilidade desnecessária | ✅ Parte A.1 (S1–S12) com justificativa por mudança |
| Recomendar simplificação de sobreposição com justificativa | ✅ A.1 (S4, S6) e A.2 (o que **não** foi fundido, e por quê) |
| Documentar os 15 itens por fatia | ✅ B.x.1 a B.x.15 em todas as oito |
| Diferenciar decisão homologada de proposta nova | ✅ ✅ **DECIDIDO** / 🆕 **PROPOSTA** / ⏳ **PENDENTE DE APROVAÇÃO** / 🔎 **HIPÓTESE** |
| Marcar **PENDENTE DE APROVAÇÃO** onde depender de decisão do dono | ✅ D.3 é o índice rápido; DP-01…DP-06 em D.1 |
| Não transformar hipótese em decisão oficial | ✅ H1–H10 mantidas como hipótese; nenhuma virou requisito |
| Analisar dependências entre M1–M8 | ✅ C.1 (grafo) |
| Analisar relação com Fatia 13, 14, 15, MCP, skills e demais | ✅ C.3 |
| **Não alterar a sequência canônica** | ✅ C.2 verifica item por item contra D109/D102/`docs/06`/`docs/02 §4`; divergências registradas **sem** renumeração |
| Produzir **apenas proposta** de dependências e ordem | ✅ C.4, marcada como proposta para aprovação |
| Usar a pasta de investigação existente | ✅ `investigacao_memoria_fatias_m/` |
| Manter Task 02 e Task 03 **separadas**, com índices e referências cruzadas | ✅ `11_…` e `12_…`, com referência explícita no cabeçalho de cada uma e índice atualizado em `00_INDICE.md` |
| Não criar documentos desnecessários | ✅ **2 arquivos novos** no total (um por tarefa) + atualização do índice existente |
| Não alterar documentação canônica | ✅ `docs/01`–`09` intactos |
| Não mover a pasta para `arquivo_morto/` | ✅ não movida |
| Manter a documentação da investigação **temporária** | ✅ declarado na Parte E, item 6 |
| Não declarar propostas homologadas | ✅ Parte E, item 6 |
| Resumo executivo com os 6 pontos pedidos | ✅ Parte E, itens 1–6 |
| Informar caminhos dos documentos e estado do Git | ✅ Parte G |
| Não fazer commit nem push | ✅ nenhum |
| Não iniciar a próxima etapa do plano de execução | ✅ parado, aguardando aprovação |

---

## PARTE G — Caminhos dos documentos produzidos e estado do Git

### G.1 Documentos produzidos nesta missão

| Arquivo | Conteúdo | Status |
|---|---|---|
| `investigacao_memoria_fatias_m/11_TASK02_CONSOLIDACAO_DA_INVESTIGACAO.md` | **Task 02** — consolidação: estado real do repo, o que existe no Agente Window (com arquivo/linha), o que foi encontrado nas 6 referências (2 delas investigadas agora), matriz comparativa, mecanismos comprovados (P1–P10, R1–R25), redundâncias (RD-1…RD-10), hipóteses (H1–H10), decisões pendentes (DP-01…DP-06), tecnologias aproveitáveis e não necessárias, riscos (R-1…R-15), 12 conclusões técnicas | **Novo.** Temporário até aprovação |
| `investigacao_memoria_fatias_m/12_TASK03_PROPOSTA_FATIAS_M1_M8.md` | **Task 03** — proposta: revisão do desenho (S1–S12), sobreposições e o que não foi fundido, 8 contratos com 15 itens cada, grafo de dependências, compatibilidade com a sequência canônica, relação com Fatias 13/14/15/MCP/skills/DEBTs/F1–F5-B/CAPs, ordem de execução proposta, pendências consolidadas, resumo executivo em 6 pontos | **Novo.** Temporário até aprovação |
| `investigacao_memoria_fatias_m/00_INDICE.md` | Índice da pasta, com entradas e referências cruzadas para `11` e `12` | **Atualizado** (aditivo) |

**Nenhum outro arquivo foi criado, alterado, movido ou apagado.**

### G.2 Arquivos apenas lidos (não alterados)

- `investigacao_memoria_fatias_m/`: `00`–`10`, `CORRECAO_PERSISTENCIA.md`, `HOMOLOGACAO_INDEPENDENTE_TASK_01.md`
- `docs/`: `01`–`09` (canônicos) e `arquivo_morto/estudo_memoria_contexto_2026-10-22/` (`00`–`09` + `fatias/M1`–`M8`), `arquivo_morto/referencias/00_INDICE.md`
- `platform/apps/workbench-v2/src/`: `types.ts`, `App.tsx`, `components/ChatInput.tsx`, `server/session-persistence/{index,transcripts,database,paths,chatAlvo}.ts`, `services/sessions/{sessionsClient,SessionPersistenceNotice}.ts(x)`, `bairros/2-inteligencia/casas/{conversa,agir,provedores,config}/**`, `package.json`
- Referências externas (somente leitura, fora do projeto): DeepSeek Harness `22ddee3` (6 docs de subsistema + `checkpoint.ts` + `tool-pairing.ts` + `schema.ts`), OpenClaude `3a8e12b` (clone raso em `/home/user/.cache/refs/openclaude`, **fora** do snapshot do workspace, conforme `docs/01 §3.B.6`)

### G.3 Estado do Git

| Item | Estado |
|---|---|
| Branch | `main` |
| HEAD | `fe218b8` — *"chore: init projeto agente_window"* (commit único; o `.git` original foi apagado e reinicializado por ordem do dono nesta sessão, antes desta missão) |
| Remote | **nenhum** |
| Commits nesta missão | **nenhum** |
| Push nesta missão | **nenhum** |
| Working tree | **3 alterações, todas dentro de `investigacao_memoria_fatias_m/`**: `11_TASK02_…` (novo), `12_TASK03_…` (novo), `00_INDICE.md` (modificado) |
| Código-fonte | **inalterado** |
| Documentação canônica `docs/01`–`09` | **inalterada** |
| Roadmap / numeração oficial | **inalterados** |
| Dependências (`package.json`, lockfiles, `node_modules`) | **inalteradas** |
| Área congelada (terminal, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server`, `explorer-search/{core,server}`, `EditorArea.tsx`, specs `sessao_11*`) | **não tocada** |

**Parado aqui, aguardando aprovação.** Nenhuma etapa seguinte do plano de execução foi iniciada.
