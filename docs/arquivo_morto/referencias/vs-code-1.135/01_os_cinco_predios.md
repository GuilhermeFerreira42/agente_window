# VS Code 1.135 — como o programa se divide em "prédios" (processos)

> **Serve para:** Condomínio Robusto — **DEBT-ROBUST-02** (passar do "prédio único" para 5 prédios).
> **Fonte:** código do tag **1.135.0** (08d4889f), baixado em 14/10/2026. Todos os caminhos citados foram conferidos no código baixado.

## O desenho real (o que o VS Code faz hoje)
O VS Code **não é um programa só num processo**. Ele divide o trabalho:

1. **Main (o "porteiro")** — sobe a janela e gerencia o que é pesado de sistema: `src/vs/code/electron-main/app.ts`.
2. **Workbench (a "cara")** — a interface dentro da janela (`src/vs/workbench/**`).
3. **Processo Compartilhado (Shared Process)** — serviços de fundo usados por todas as janelas (atualizações, coisas de máquina). É também de onde saem os **agent hosts remotos** (SSH, WSL, túnel): `src/vs/code/electron-utility/sharedProcess/sharedProcessMain.ts` importa os serviços `SSHRemoteAgentHostMainService`, `WSLRemoteAgentHostMainService`, `TunnelAgentHostService`.
4. **Processo das Extensões (Extension Host)** — onde o código de terceiros roda, longe da cara: `src/vs/workbench/api/node/extensionHostProcess.ts` (detalhe na nota `02` desta pasta).
5. **Pty Host (o "prédio dos terminais")** — dono dos terminais; segura os processos de shell: `src/vs/platform/terminal/node/ptyHostMain.ts` (detalhe na nota `04`).
6. **Agent Host (o "prédio dos agentes")** — processo próprio, criado pelo Main:
   - `src/vs/code/electron-main/app.ts` (linhas 132–133 e 739–741) instancia `ElectronAgentHostStarter` + **`AgentHostProcessManager`**;
   - o "miolo" vive em **`src/vs/platform/agentHost/`** — `common/` (serviços, metadados das mensagens, mudanças de arquivo, `pendingRequestRegistry`, `fileEditDiff`…) e `node/` (`agentHostService.ts` com a classe `AgentHostProcessManager`, bootstrap, banco, mudanças/subscrições…).

O mecanismo padrão para subir processos separados é o **utility process**: `src/vs/platform/utilityProcess/` (electron-main + common).

## Por que separam (as lições que importam para nós)
- **Um prédio caindo não derruba os outros** — extensão travou? A janela continua.
- **A cara nunca trava** — trabalho pesado é mandado para fora da janela.
- **Pode rodar longe** — os mesmos serviços podem morar em outra máquina (por isso `src/vs/server/` também tem testes de agent host: `agentHostChannel.test.ts`, `serverAgentHostManager.test.ts`).
- **Cada prédio tem um "chefe"** — um *starter* (quem sobe) + um *manager* (quem cuida).

## Como isso vira o nosso "Condomínio Robusto"
A nossa lista de 5 prédios (D70 / DEBT-ROBUST-02) bate com o original: **Main · Workbench · Extension Host · Agent Host · Pty Host**. O VS Code real tem **mais um** (o Processo Compartilhado) — para nós é opcional; fica registrado que existe.
Caminho prático: hoje = **1 prédio** (tudo junto, custo aceito de propósito). Quando o gatilho acender (tela travar, 2 janelas, vários agentes), separar **na ordem que o dono decidir na hora** — começando pelo Agent Host (é o que trava a tela).

## Não confundir
- "Prédio" nosso **não é** microserviço: continua um programa só; muda somente onde as peças rodam.
- **Não** copiamos a infraestrutura de rede do VS Code (protocolo, canais etc.) — copiamos a **ideia** de processo separado + manutenção isolada (D66).

## O que NÃO foi verificado
- Como o Agent Host guarda estado (há `agentHostDatabase.ts` — não aprofundado).
- Empacotamento (instalador) e o modo servidor completo.
