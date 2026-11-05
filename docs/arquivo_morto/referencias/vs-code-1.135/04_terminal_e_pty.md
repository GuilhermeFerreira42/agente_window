# VS Code 1.135 — o terminal e o "prédio dos PTYs"

> **Serve para:** **FATIA 12 — Terminal 2.0** (o "transplante") + DEBT-01, DEBT-02 e DEBT-03.
> **Fonte:** tag 1.135.0 (08d4889f); conferido em 14/10/2026.

## Lado que SEGURA os terminais — o "Pty Host"
Pastas: `src/vs/platform/terminal/node/` e `src/vs/platform/terminal/electron-main/`.

- `ptyHostMain.ts` — a porta de entrada do **processo** do pty host (o prédio).
- `ptyHostService.ts` / `ptyHost.ts` — o serviço que a cara usa para **pedir** um terminal.
- `nodePtyHostStarter.ts` e `electron-main/electronPtyHostStarter.ts` — **quem sobe** o prédio (há versões para contextos diferentes).
- `terminalProcess.ts` — o processo do **shell** propriamente dito.
- `heartbeatService.ts` — **batimento cardíaco**: o prédio avisa que está vivo (detecta travamento).
- `childProcessMonitor.ts` — vigia o processo filho.
- `terminalEnvironment.ts`, `terminalProfiles.ts`, `windowsShellHelper.ts` — ambiente, perfis de shell e ajudas específicas (Windows leva bastante código extra aqui).
- `src/vs/platform/terminal/common/capabilities/capabilities.ts` — as **capacidades** do terminal (a tal "integração de shell": saber onde começa o prompt, detectar o comando atual, blocos). É o que dá recursos espertos **sem** o programa ficar lendo a tela "no olho".

## Lado da CARA — o que o usuário vê
Pasta: `src/vs/workbench/contrib/terminal/browser/`.

- `terminal.ts`, `baseTerminalBackend.ts`, `remoteTerminalBackend.ts`, `remotePty.ts` — backends (local × remoto).
- `terminalCommands.ts`, `terminalActions.ts`, `terminalContextMenu.ts` — comandos, ações e menu de contexto (o que a **DEBT-03** cobra).
- `terminalEditor.ts` / `terminalEditorInput.ts` / `terminalEditorService.ts` — **terminal como aba de editor** (pista direta para a **DEBT-02**: mover/arrastar sem quebrar).
- `terminalEditingService.ts`, `terminalEscapeSequences.ts` — digitação e sequências de escape.
- **Achado quente:** `agentHostTerminalService.ts`, `agentHostPty.ts`, `ahpTerminalCommandSource.ts` — na 1.135 o **agente também roda comandos em terminal** pelo mesmo prédio (o comando do agente entra como mais uma "fonte"). É exatamente a fronteira que a **D72** deixou **fora do MVP** (agente só mexe em arquivo) e que a FATIA 12 vai estudar com cuidado.

## Lições para o transplante (FATIA 12)
1. Separar "prédio do terminal" de "cara do terminal" é o que permite: reconectar, dividir, arrastar e sobreviver.
2. **Batimento + vigia de processo** são baratos e evitam terminal zumbi (o nosso `clear` quebra e ninguém percebe — DEBT-01).
3. **Capacidades** (marcos do shell) valem mais que "adivinhar por texto".
4. Comandos e menu de contexto são **declarados** em registros (ver nota `05` desta pasta).

## O que NÃO foi verificado
- Comportamento exato de **reconexão** do terminal remoto (conferimos só a existência dos arquivos).
- De onde a aba **"Portas"** se alimenta (DEBT-03) — checar na FATIA 12, contra o code-server 8080.
