# VS Code 1.135 — o "prédio das extensões" e a ponte de recados (RPC)

> **Serve para:** Condomínio Robusto (DEBT-ROBUST-02) e para entender o limite do "não reproduzir a infraestrutura" (D66).
> **Fonte:** tag 1.135.0 (08d4889f); caminhos conferidos em 14/10/2026.

## As peças
- **Quem sobe:** `src/vs/workbench/services/extensions/electron-browser/extensionHostStarter.ts` e `localProcessExtensionHost.ts` (o comentário interno aponta que é usado o "WindowUtilityProcess" — um processo utilitário da janela).
- **Quem administra:** `src/vs/workbench/services/extensions/common/extensionHostManager.ts` — e os primos:
  - `lazyCreateExtensionHostManager.ts` — o prédio só **nasce quando precisa** (economia de memória);
  - `remoteExtensionHost.ts` — a mesma história, com o prédio morando longe;
  - `extensionHostKind.ts` — os "tipos" de prédio (local, remoto, worker);
  - `extensionHostProxy.ts` — a fachada usada pela cara.
- **Quem entra no processo:** `src/vs/workbench/api/node/extensionHostProcess.ts` (no desktop) e `src/vs/workbench/services/extensions/browser/webWorkerExtensionHost.ts` + `src/vs/workbench/api/worker/*` (no navegador).
- **A ponte de recados:** `src/vs/workbench/services/extensions/common/rpcProtocol.ts` — a classe `RPCProtocol` (linha 115) cria "apelidos remotos" (`getProxy`, linha 241): de um lado você **chama como se fosse local**; do outro, a função roda no processo separado. Dois mapas (`_locals`, `_proxies`) mantêm os dois lados sincronizados.
- **A "lista de recados" (o protocolo):** `src/vs/workbench/api/common/extHost.protocol.ts` — **4.217 linhas**, o contrato de tudo o que a cara pode pedir às extensões e vice-versa.
- **Saúde do prédio:** dentro do `RPCProtocol` existe `UNRESPONSIVE_TIME = 3s` — se o outro lado não responde no prazo, o programa o marca como "não está respondendo" (é o que gera o aviso famoso de extensão travada).

## Lições para nós (sem copiar a infraestrutura)
1. **Chamada remota com cara de local** — quem chama não precisa saber que a peça está noutro processo. É o que um dia permitirá "sessão que sobrevive à janela" (o gatilho da DEBT-ROBUST-02).
2. **Protocolo declarado num arquivo só** (uma lista) evita chamadas soltas e bagunçadas.
3. **Vigiar a saúde** do lado separado (3 s) é barato e resolve o "travou e não avisou".
4. Nosso MVP **não** faz nada disso (D66/D70) — esta nota existe para quando o gatilho do Robusto acender.

## O que NÃO foi verificado
- Como as extensões "acordam" (eventos de ativação) — não aprofundado nesta raspagem.
