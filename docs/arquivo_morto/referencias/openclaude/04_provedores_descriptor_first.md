# OpenClaude — provedores no estilo "descritor primeiro" (descriptor-first)

> **Serve para:** FATIA 08 — Conectar (Provedores) — junto com a nota do Cline (`cline/01_tela_de_provedores.md`).
> **Fonte:** `docs/architecture/integrations.md` do próprio projeto + a árvore `src/integrations/` do commit fc3be25e (14/10/2026).

## A ideia central (do próprio documento deles)
Em vez de uma teia de "se fornecedor = X então…" espalhada pelo código, cada provedor vira um **descritor** (um verbete declarativo) que diz tudo sobre ele: nome, tipo, modelos, como descobrir modelos, como validar a chave, que caminhos de requisição ("rotas") aceita. O resto do sistema **lê** os descritores.

## As camadas (caminhos deles)
1. `src/integrations/descriptors.ts` — define o **formato** do descritor.
2. `src/integrations/index.ts` + `registry.ts` — carregam e expõem o **registro** de provedores/marcas/modelos.
3. `src/integrations/routeMetadata.ts` — resolve as **rotas** (qual caminho de requisição) e valores padrão.
4. `src/integrations/runtimeMetadata.ts` — deriva o comportamento em tempo de execução a partir do descritor/rota/modelo escolhido.
5. Descoberta, validação e perfil de provedor **consomem** os descritores (não mantêm listas paralelas).

**Regra de ouro deles (traduzida):** quem manda é o **descritor**; o código de execução só obedece — nada de segunda tabela escondida.

## Por que isso serve para a nossa FATIA 08
- Nosso objetivo é a tela rica estilo Cline **sem** virar teia de casos especiais.
- Esqueleto sugerido para a futura Casa Provedores: `descritores/` (um arquivo **declarativo** por provedor) + `registro.ts` + campos comuns (chave, URL base, modelo) — a nota do Cline mostra a **cara**; esta mostra o **esqueleto**.
- Dica: descritor é **dado, não tela** — manter pequeno e sem código de interface.

## O que NÃO foi verificado
- Se a descoberta de modelos deles é online ou via gateway (aprofundar se precisarmos de catálogo dinâmico).
