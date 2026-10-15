# VS Code 1.135 — comandos, menus, atalhos, injeção de dependência e layout em pedaços

> **Serve para:** Condomínio Robusto — **DEBT-ROBUST-01** (comandos/menus/atalhos), **DEBT-ROBUST-03** (layout em pedaços) e **DEBT-ROBUST-04** (peças trocáveis).
> **Fonte:** tag 1.135.0 (08d4889f); conferido em 14/10/2026.

## A "prefeitura de verdade" do original — os registros centrais
1. **Comandos** — `src/vs/platform/commands/common/commands.ts`: existe um **registro único** (`CommandsRegistry`, linha 67). Todo comando tem um **nome (id)** e um dono. A interface chama **pelo id**, nunca pelo objeto — por isso o mesmo comando pode vir de menu, atalho, paleta ou teste.
2. **Menus** — `src/vs/platform/actions/common/actions.ts`: `MenuRegistry` (linha 477). Menus são **listas de itens declaradas** (onde aparece, quando aparece, qual comando chama) — não código espalhado por cada botão.
3. **Atalhos** — `src/vs/platform/keybinding/common/`: `keybindingsRegistry.ts` (+ resolvedor e serviços). Atalho aponta para **id de comando** — por isso a mesma tecla serve em qualquer sistema sem duplicar lógica.
4. **Injeção de dependência (peças trocáveis)** — `src/vs/platform/instantiation/`:
   - `IInstantiationService` (interface, linha 52) — cria objetos e lhes entrega as dependências;
   - `createDecorator` (linha 109) — cria o **carimbo** de cada serviço (o identificador);
   - `ServiceCollection` (linha 9) — monta a lista de peças de um contexto.
   Um serviço se declara por **interface + carimbo**; quem usa pede pelo carimbo — e trocar a peça **não quebra** quem usa (é o alvo exato da DEBT-ROBUST-04).

## O layout em pedaços (DEBT-ROBUST-03)
- Serviço central: `src/vs/workbench/services/layout/browser/layoutService.ts`.
- As **"parts"** (pedaços visuais) ficam em `src/vs/workbench/browser/parts/`:
  `activitybar`, `sidebar`, `auxiliarybar`, `panel`, `statusbar`, `titlebar`, `editor`, `notifications`, `dialogs`, `banner`, `views`…
- Cada pedaço é criado e posicionado pelo serviço de layout — é isso que permite **esconder, mostrar e mover sem quebrar**. É a diferença fundamental para o nosso "Titlebar-corredor" (D70): lá, o pedaço sabe se virar; aqui, o corredor só cola.

## Tradução para o nosso vocabulário
- "**Caderneta**" (nosso MVP) → `CommandsRegistry` completo = prefeitura de verdade. Só vale a pena quando passar de ~100 comandos ou quando atalho/menu/condicional aparecerem (gatilho da D70).
- "**Casa**" → cada part do original é, na prática, uma casa com porta (contrato com o layout).
- "**Injeção de dependência**" → a peça que permite trocar o encanamento sem arrancar a parede.

## O que NÃO foi verificado
- Como o original publica comandos para **extensões de terceiros** (API do extension host) — não é o nosso caso agora.
- Detalhes finos do drag & drop de partes (visto por cima) — aprofundar na FATIA 14.
