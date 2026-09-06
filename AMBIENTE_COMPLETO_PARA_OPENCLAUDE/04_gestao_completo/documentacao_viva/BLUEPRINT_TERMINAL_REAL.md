# BLUEPRINT — Terminal Real com PTY
> Status: **DECISÕES FINAIS INCORPORADAS — AGUARDANDO APROVAÇÃO PARA IMPLEMENTAÇÃO**
> Criado em: 2026-09-05 | Revisado em: 2026-09-05 | Autor: Antigravity
> Referências analisadas: code-server (coder/code-server), VS Code (microsoft/vscode), OpenHands

---

## 0. Sumário Executivo

Substituir o shell simulado em `TerminalPanel.tsx` por um terminal real: o frontend (`xterm.js` já instalado) se conecta via WebSocket a um mini-servidor Node novo que abre um processo PTY real (`node-pty`) com shell do SO. O frontend não muda de tecnologia — só troca o handler de I/O de mock local para WebSocket.

---

## 0A. Escopo desta Onda (Onda A) — DECISÃO FINAL

### O que ESTÁ incluído nesta onda:

1. **Backend PTY real** via `node-pty`, com protocolo WebSocket conforme seções 2 e 3 deste documento.
2. **Dropdown de shell funcional na UI** — perfis disponíveis por SO:
   - **Windows:** PowerShell (padrão inicial ao abrir), Git Bash (se instalado), Command Prompt
   - **Linux/macOS:** Bash (único perfil automático; expansão em onda futura)
3. **Ações do menu de terminal** — todas implementadas nesta onda:
   - Novo Terminal (abre nova instância PTY)
   - Dividir Terminal com escolha de perfil de shell
   - Nova Janela do Terminal
   - Limpar Terminal
   - Rolar para Comando Anterior / Próximo (via API nativa do xterm.js — `terminal.scrollToLine()` — sem nenhuma mudança no backend)
4. **Sem sessão persistente:** ao fechar ou recarregar a página, o processo do shell morre. O scrollback normal do xterm.js funciona enquanto a aba estiver aberta, mas **nada sobrevive a um reload**. Não há serialização de buffer.

### O que está FORA DE ESCOPO nesta onda — registrado em BACKLOG_FUTURO.md (Onda B):

| Feature | Motivo do adiamento |
|---------|---------------------|
| "Ir para Diretório Recente" | Exige histórico de diretórios persistido. O backend PTY não muda; é só uma camada de persistência simples acima. Adiado para Onda B. |
| "Executar Comando Recente" | Mesma razão: precisa de histórico persistido de comandos. Onda B. |
| "Executar Arquivo Ativo" | Integração editor↔terminal — sistema separado, não faz parte do escopo do terminal em si. |
| "Executar Texto Selecionado" | Integração editor↔terminal — mesma razão acima. |
| "Iniciar Serviço de Voz" | Feature de voz sem nenhuma relação com o terminal. **Nenhum subsistema de voz existe no projeto.** Não iniciar sem blueprint e aprovação própria. |

---

## 1. Estrutura: onde o backend novo mora no monorepo

### 1.1 Localização proposta

```
agente_window/
├── AMBIENTE_COMPLETO_PARA_OPENCLAUDE/
│   ├── 02_replica_final/          <- frontend (não mexe na estrutura)
│   │   └── src/components/TerminalPanel.tsx
│   └── 04_gestao_completo/
│       └── documentacao_viva/
│           └── BLUEPRINT_TERMINAL_REAL.md  <- este arquivo
│
└── pty-server/                    <- [NOVO] backend PTY independente
    ├── package.json               <- nome: "@agente-window/pty-server"
    ├── tsconfig.json
    └── src/
        ├── index.ts               <- entry point: inicia HTTP + WS
        ├── ptyManager.ts          <- cria/destrói processos node-pty
        ├── shellDetector.ts       <- detecta SO e escolhe o shell
        └── wsHandler.ts           <- protocolo WebSocket / mensagens
```

**Por que pasta separada (`pty-server/`) em vez de dentro de `02_replica_final/`?**
- `02_replica_final/` é puramente frontend (Vite, browser); colocar um servidor Node lá misturaria bundler de browser com runtime de servidor — o mesmo problema que o code-server resolve mantendo `src/node/` isolado da `src/browser/`.
- O `pty-server/` tem seu próprio `package.json` e pode ser iniciado/parado independentemente sem tocar no `npm run dev` do Vite.
- O Vite já escuta `localhost:5173`; o PTY server escuta `localhost:7681` (porta dedicada). Dois processos separados, zero conflito.

### 1.2 Relação com o frontend

```
[Browser / xterm.js]
       |  WebSocket ws://127.0.0.1:7681
       v
[pty-server/src/index.ts]  <->  [node-pty -> /bin/bash ou powershell.exe]
```

O frontend não precisa saber como o shell funciona. Ele só envia e recebe mensagens JSON sobre WebSocket. O `TerminalPanel.tsx` permanece o orquestrador de UI; só a lógica de I/O muda.

---

## 2. Protocolo de Comunicação

### 2.1 Escolha: WebSocket — justificativa

| Opção | Prós | Contras |
|-------|------|---------|
| **WebSocket** | Bidirecional, full-duplex, latência mínima, nativo no browser sem libs extras, xterm.js tem attach-addon para WS | Requer handshake HTTP inicial |
| SSE + POST | Unidirecional nativo (output apenas), input via POST separado | Não é full-duplex; latência de round-trip para cada tecla; complexidade double-endpoint |
| TCP raw | Sem overhead de HTTP | Não disponível no browser sem proxy |
| IPC (pipe local) | Mais rápido que WS | Invisível ao browser; frontend não consegue falar IPC |

**Conclusão:** WebSocket é a mesma escolha de code-server, VS Code terminal integrado, Wetty, e ttyd. Para uso local (127.0.0.1) não há overhead de criptografia TLS. O attach-addon do xterm.js (`@xterm/addon-attach`) fala WebSocket nativamente, mas **não será usado diretamente** — em vez disso, usamos o WebSocket da forma crua com mensagens JSON estruturadas, para ter controle total sobre resize e lifecycle da sessão (mesma decisão do VS Code: protocolo próprio sobre WS, não pipe raw).

### 2.2 Formato das mensagens (Frontend -> Backend)

Todas as mensagens do frontend são JSON:

```json
// Abrir uma sessão PTY
{ "type": "open", "sessionId": "s1", "cols": 120, "rows": 30 }

// Enviar tecla / input do usuário
{ "type": "input", "sessionId": "s1", "data": "ls -la\r" }

// Redimensionar o terminal (resize)
{ "type": "resize", "sessionId": "s1", "cols": 100, "rows": 25 }

// Encerrar a sessão explicitamente
{ "type": "close", "sessionId": "s1" }
```

### 2.3 Formato das mensagens (Backend -> Frontend)

```json
// Output do shell (dados crus do PTY — texto ANSI)
{ "type": "output", "sessionId": "s1", "data": "\u001b[32m$ \u001b[0m" }

// Confirmação de sessão aberta
{ "type": "opened", "sessionId": "s1", "pid": 12345, "shell": "powershell" }

// Shell encerrado (exit voluntário ou kill)
{ "type": "exit", "sessionId": "s1", "code": 0 }

// Erro (ex.: shell não encontrado, node-pty não compilou)
{ "type": "error", "sessionId": "s1", "code": "SHELL_NOT_FOUND", "message": "..." }
{ "type": "error", "sessionId": "s1", "code": "PTY_NATIVE_MISSING", "message": "..." }
```

### 2.4 Diagrama de sequência (sessão feliz)

```
Frontend                     pty-server
   |                              |
   |--- WS connect -------------->|
   |                              |
   |--- { type:"open", ... } ---->|  spawnPty(shell, cols, rows)
   |<--- { type:"opened", ... } --|
   |                              |
   |--- { type:"input", ... } --->|  pty.write(data)
   |<--- { type:"output", ... } --|  pty.onData -> send JSON
   |         (streaming)          |
   |--- { type:"resize", ... } -->|  pty.resize(cols, rows)
   |                              |
   |--- { type:"close" } -------->|  pty.kill()
   |<--- { type:"exit", ... } ----|
   |                              |
   |--- WS disconnect ----------->|
```

---

## 3. Ciclo de Vida do Processo Shell

### 3.1 Quando o processo nasce

O processo PTY nasce **ao receber a mensagem `{ type:"open" }`** — que o frontend envia quando `TerminalPanel.tsx` monta (ou seja, quando o painel de terminal fica visível pela primeira vez para uma sessão).

**Não** abre na inicialização do servidor (lazy spawn): múltiplas sessões existem no App mas o usuário normalmente usa uma de cada vez. Abrir um shell por sessão antecipadamente desperdiçaria memória.

### 3.2 Quando o processo morre

O processo shell é encerrado em qualquer um destes eventos:

| Evento | Ação |
|--------|------|
| Frontend envia `{ type:"close" }` | `pty.kill('SIGTERM')` -> `SIGKILL` após 3s se não encerrar |
| Conexão WebSocket fecha (tab fechada, reload, app fechado) | `pty.kill('SIGTERM')` no evento `ws.on('close')` |
| Shell sai por conta própria (usuário digita `exit`) | PTY emite evento `exit`; backend notifica frontend com `{ type:"exit" }` |
| **Timeout de inatividade: 30 minutos** | Se nenhuma mensagem `input` for recebida em 30 min, o backend encerra o PTY e envia `{ type:"exit", code:-1 }`. Configurável via env `PTY_IDLE_TIMEOUT_MS`. |

**Por que timeout de inatividade?** O servidor escuta em loop contínuo. Se o usuário fechar o navegador sem digitar `exit`, o shell ficaria vivo indefinidamente. 30 minutos é o padrão adotado pelo code-server e pelo VS Code Tunnel.

### 3.3 Múltiplas sessões simultâneas

O `ptyManager` mantém um `Map<sessionId, PtyProcess>`. Cada sessão do frontend pode ter exatamente um PTY ao mesmo tempo. Uma segunda mensagem `open` para o mesmo `sessionId` encerra o PTY anterior e abre um novo (comportamento de "reabrir terminal").

---

## 4. Detecção de SO e Fallback de Shell

### 4.1 Lógica de detecção (`shellDetector.ts`) — REVISADA

> ⚠️ Ordem corrigida para Windows: `powershell.exe` (5.1, de fábrica) foi adicionado entre `pwsh.exe` e Git Bash. Git Bash também foi incluído como perfil detectável.

```
1. Ler process.platform
   |-- "win32" — ordem de detecção (a → d):
   |     a. pwsh.exe (PowerShell 7+, opcional):
   |        Caminhos: %PROGRAMFILES%\PowerShell\7\pwsh.exe
   |                  %PROGRAMFILES(X86)%\PowerShell\7\pwsh.exe
   |        Se encontrado: disponível como perfil "PowerShell 7".
   |        O padrão inicial ao abrir é PowerShell (preferindo pwsh se existir;
   |        caso contrário, powershell.exe — ver (b)).
   |
   |     b. powershell.exe (Windows PowerShell 5.1 — vem de fábrica):
   |        Caminho fixo: C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
   |        SEMPRE verificar antes de cair para cmd. Perfil: "Windows PowerShell".
   |        Este é o shell padrão na ausência de pwsh.exe.
   |
   |     c. Git Bash (opcional, instalação do Git for Windows):
   |        Caminhos: %PROGRAMFILES%\Git\bin\bash.exe
   |                  %PROGRAMFILES(X86)%\Git\bin\bash.exe
   |                  %LOCALAPPDATA%\Programs\Git\bin\bash.exe
   |        Se encontrado: disponível como perfil "Git Bash" no dropdown.
   |        Não é o padrão — entra como opção extra.
   |
   |     d. cmd.exe (garantido — sempre existe em qualquer Windows):
   |        Caminho fixo: C:\Windows\System32\cmd.exe
   |        Último recurso, mas também disponível como perfil "Command Prompt".
   |        Se cmd.exe não for encontrado (cenário impossível) -> ERRO fatal.
   |
   |  SHELL PADRÃO AO ABRIR: PowerShell (pwsh.exe se disponível, senão powershell.exe).
   |  PERFIS DISPONÍVEIS NO DROPDOWN: todos os encontrados acima, na ordem a→d.
   |
   `-- "linux" / "darwin":
         a. Tentar /bin/bash (sempre existe em distros convencionais). Perfil: "Bash".
         b. Se não encontrado -> tentar /bin/sh (POSIX mínimo). Perfil: "sh".
         c. Se nem /bin/sh -> ERRO fatal.
```

### 4.2 Verificação de existência

A verificação usa `fs.access(caminho, fs.constants.X_OK)` — checa se o executável existe **e é executável**. Não usa `which` ou `where.exe` como primeira tentativa (evita dependência de PATH do processo Node, que pode diferir do PATH do usuário).

### 4.3 Perfis enviados ao frontend na abertura da sessão

Quando o frontend envia `{ type:"open", sessionId, cols, rows }`, o backend responde com `opened` incluindo a lista de perfis disponíveis:

```json
{
  "type": "opened",
  "sessionId": "s1",
  "pid": 12345,
  "shell": "powershell",
  "shellPath": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
  "availableProfiles": [
    { "id": "pwsh",       "label": "PowerShell 7",        "path": "C:\\Program Files\\PowerShell\\7\\pwsh.exe" },
    { "id": "powershell", "label": "Windows PowerShell",  "path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" },
    { "id": "gitbash",    "label": "Git Bash",             "path": "C:\\Program Files\\Git\\bin\\bash.exe" },
    { "id": "cmd",        "label": "Command Prompt",       "path": "C:\\Windows\\System32\\cmd.exe" }
  ]
}
```

O frontend popula o dropdown com `availableProfiles` e marca como ativo o perfil do `shell` atual.

### 4.4 Falha completa (nenhum shell encontrado)

O backend envia ao frontend:
```json
{
  "type": "error",
  "sessionId": "s1",
  "code": "SHELL_NOT_FOUND",
  "message": "Nenhum shell encontrado. Windows: pwsh.exe, powershell.exe e cmd.exe não localizados. Linux: /bin/bash e /bin/sh não encontrados."
}
```

O `TerminalPanel.tsx` exibe essa mensagem no xterm.js em vermelho e desabilita o input — o usuário vê uma mensagem clara em vez de um terminal travado silenciosamente.

---

## 5. Risco: node-pty tem componente nativo

### 5.1 O problema

`node-pty` depende de um módulo nativo compilado (`build/Release/pty.node`). Ao executar `npm install`, o `node-gyp` precisa:
- Em Windows: Visual Studio Build Tools + SDK do Windows instalado
- Em Linux/macOS: `python3`, `make`, compilador C++ (`gcc`/`clang`)

Se o ambiente não tiver esses pré-requisitos, o `npm install` falhará com:

```
gyp ERR! build error
gyp ERR! stack Error: `make` failed with exit code: 2
```

### 5.2 O que fazer se a compilação falhar

**Estratégia de detecção em runtime, não em silêncio:**

No `index.ts` do pty-server, na inicialização:

```typescript
try {
  require('node-pty')  // teste de importação
  // OK: continua normalmente
} catch (err) {
  // FALHA: logar claramente e sair com código de erro
  console.error(
    '[pty-server] ERRO FATAL: node-pty não pôde ser carregado.\n' +
    'O módulo nativo não foi compilado corretamente.\n\n' +
    'Windows: instale Visual Studio Build Tools 2019+ e node-gyp:\n' +
    '  npm install -g windows-build-tools\n\n' +
    'Linux/macOS: instale build-essential (apt) ou Xcode CLI Tools.\n' +
    '  sudo apt-get install build-essential python3\n\n' +
    'Depois reinstale: cd pty-server && npm install\n'
  )
  process.exit(1)  // sai com erro — nunca trava silenciosamente
}
```

**O servidor NUNCA sobe em estado degradado** — ele falha rápido com mensagem de ação clara.

### 5.3 Alternativa de fallback (para investigar na implementação)

Caso o ambiente seja especialmente restrito, investigar `node-pty-prebuilt-multiarch` — um fork que publica binários pré-compilados para Windows/Linux/macOS nos releases do npm, eliminando a necessidade de `node-gyp`. É exatamente o que o VS Code usa internamente. **Documentar essa opção na implementação, mas não decidir agora.**

---

## 6. Onde exatamente o TerminalPanel.tsx muda

### 6.1 Mapa dos pontos de mudança

O `TerminalPanel.tsx` tem hoje dois sistemas paralelos que serão substituídos:

| Ponto | Localização atual | O que muda |
|-------|------------------|------------|
| **A** | Linhas 83–135: função `executeCommand` inteira | **Removida** — a lógica de interpretar comandos (`ls`, `pwd`, `echo`, etc.) some. O xterm.js deixa de ser um "emulador de shell em JS" e passa a ser apenas um display de output |
| **B** | Linhas 179–255: `instance.onData(...)` — handler de teclado | **Substituído**: em vez de processar localmente (`currentInput`, `executeCommand`, etc.), o handler envia cada `data` ao backend via `ws.send(JSON.stringify({ type:'input', ... }))` |
| **C** | Linhas 171–177: loop que escreve `initialTerminalLines` no xterm | **Removido**: o terminal começa em branco; o shell real escreve seu próprio prompt |
| **D** | Linha 290: split terminal usa mock local | **Substituído**: split terminal abre uma segunda sessão WS (sessionId diferente, ex.: `s1-split`) |
| **E** | Linhas 140–169: inicialização do xterm | **Mantida**: a instância do `Terminal`, `FitAddon`, `WebLinksAddon` permanecem iguais |
| **F** | Linhas 257–269: cleanup do useEffect | **Expandido**: no cleanup também fecha o WebSocket e envia `{ type:"close" }` |
| **G** | Linhas 24–25: constante `SHELLS` e type `Shell` | **Substituída**: o shell não é mais escolhido pelo frontend — o backend detecta. O seletor de shell vira uma sugestão enviada no `open`, mas o backend decide se honra |
| **H** | Snapshots (`TerminalSnapshot`) em App.tsx linha 161 | **Depreciado**: com shell real não há snapshot de linhas; o PTY mantém o scrollback internamente |

### 6.2 Novo hook a criar: `usePtySession`

Para isolar a lógica de WebSocket do componente visual, toda a conexão WS será extraída para um hook custom (`usePtySession`). O `TerminalPanel.tsx` usará esse hook com a assinatura:

```typescript
// src/hooks/usePtySession.ts  (novo arquivo)
usePtySession(sessionId: string, cols: number, rows: number) =>
  {
    status: 'connecting' | 'open' | 'error' | 'closed',
    sendInput: (data: string) => void,
    sendResize: (cols: number, rows: number) => void,
    closeSession: () => void,
    onOutput: (callback: (data: string) => void) => () => void,
    lastError?: { code: string; message: string }
  }
```

Isso mantém o `TerminalPanel.tsx` como componente de apresentação e o hook como lógica de negócio — padrão já usado no restante do projeto (`domain/` vs `components/`).

---

## 7. Porta padrão e prevenção de conflito

### 7.1 Porta escolhida: **7681**

**Por quê 7681?**
- Porta usada por `ttyd` (terminal web open-source amplamente adotado) — reservada por convenção para terminais web locais.
- Distante o suficiente de 5173 (Vite), 3000 (Express genérico), 8080 (HTTP dev genérico) para evitar conflito acidental.
- Não é porta privilegiada (> 1024), não requer `sudo`.

### 7.2 Estratégia de detecção e fallback de porta

O servidor, ao iniciar, tenta ligar em `127.0.0.1:7681`. Se a porta já estiver ocupada:

```
Sequência de tentativa: 7681 -> 7682 -> 7683 -> ... -> 7699

Algoritmo:
1. Tentar net.listen(7681, '127.0.0.1')
2. Se EADDRINUSE: tentar próxima porta (+1)
3. Repetir até 7699 (19 tentativas)
4. Se todas ocupadas: log de erro e process.exit(1)
   "Nenhuma porta disponível no intervalo 7681-7699. Encerre outros processos ou configure PTY_PORT."

5. A porta efetivamente usada é impressa no console:
   "[pty-server] Escutando em ws://127.0.0.1:PORT"
   E gravada em arquivo: %TEMP%/pty-server.port (Windows) | /tmp/pty-server.port (Linux)
```

**Nota:** O padrão de `findFreeSocketPath` foi diretamente inspirado no código de `code-server/src/node/socket.ts` linhas 98–105.

### 7.3 Como o frontend descobre a porta — DECISÃO FINAL: Opção B

> ⚠️ A Opção A (env var do Vite) foi descartada: funciona apenas em dev. O projeto é distribuído/publicado no GitHub e outros usuários fazem build também — a solução precisa funcionar igual em dev e em produção.

**Opção B — Endpoint HTTP em runtime (DECISÃO FINAL):**

O `pty-server` expõe um endpoint HTTP simples além do WebSocket:

```
GET http://127.0.0.1:PORT/pty-port
Resposta: 200 OK  Content-Type: application/json
{ "port": 7683 }
```

O frontend (hook `usePtySession`) faz `fetch('http://127.0.0.1:7681/pty-port')` ao montar, descobrindo a porta efetiva. Se o servidor estiver em outra porta do intervalo 7681–7699, o frontend tenta cada uma sequencialmente até receber 200.

**Fluxo de discovery em produção e dev (idêntico):**
```
1. Frontend tenta GET http://127.0.0.1:7681/pty-port
2. Se timeout/connection refused: tenta 7682, 7683, ... até 7699
3. Ao receber { port: N }: abre WebSocket em ws://127.0.0.1:N
4. Se nenhuma responder em 7681-7699:
   -> exibe no xterm.js: "pty-server não encontrado. Inicie com: cd pty-server && npm start"
```

**Vantagens sobre Opção A:**
- Funciona em dev (Vite) e em produção (build estático servido de qualquer servidor)
- Não exige script wrapper de startup
- Robusto a hot reload: cada montagem do componente rediscover a porta
- Não requer configuração manual de nenhuma variável de ambiente

---

## 8. Referências aos projetos analisados

### 8.1 code-server (coder/code-server)

O code-server **não implementa PTY próprio** — embrulha o VS Code e delega o terminal ao VS Code. O que foi aproveitado:

- **Padrão de porta com fallback** (`findFreeSocketPath` em `src/node/socket.ts` linhas 98–105): a lógica de incrementar porta até encontrar uma livre veio desse padrão.
- **Separação `src/node/` vs `src/browser/`**: justifica nossa decisão de `pty-server/` separado de `02_replica_final/`.
- **Referência a `node-pty`** em `patches/copilot.diff`: confirma que node-pty é a biblioteca canônica do ecossistema VS Code.

### 8.2 VS Code (microsoft/vscode)

Em clonagem no momento da análise. O que se sabe pela documentação pública:
- VS Code usa `node-pty` desde 2016 — referência definitiva de que a biblioteca funciona em produção em Windows, Linux e macOS.
- O protocolo de terminal do VS Code (`vscode-jsonrpc` sobre IPC) é mais complexo que o necessário aqui — **não copiamos** a complexidade; usamos WebSocket + JSON simples.
- O VS Code usa `node-pty-prebuilt-multiarch` internamente — documenta a alternativa de binário pré-compilado mencionada na seção 5.

### 8.3 OpenHands

O OpenHands usa Python no backend, mas o padrão de comunicação é relevante:
- **WebSocket para streaming de output**: valida nossa escolha de protocolo.
- **sessionId no protocolo**: OpenHands roteia mensagens por `session_id` — adotamos o mesmo campo para suportar múltiplas sessões simultâneas.
- **Ciclo de vida por sessão** (não por conexão): quando o usuário troca de sessão, a conexão WebSocket pode ser reusada — mesma decisão com o `Map<sessionId, PtyProcess>`.

---

## 9. Invariantes (não negociáveis, já decididos)

1. **Localhost only**: o servidor HTTP/WS liga em `127.0.0.1`, nunca em `0.0.0.0`.
2. **Sem sandbox**: shell irrestrito, processo filho direto do pty-server.
3. **Detecção automática de SO**: frontend não configura shell; backend detecta e informa.
4. **Falha explícita**: qualquer falha de startup (node-pty, porta, shell) termina o processo com código de erro e mensagem legível — nunca degrada silenciosamente.
5. **node-pty como biblioteca principal**: não reinventar PTY em userland.

---

## 10. Checklist pré-implementação — STATUS ATUALIZADO

| Item | Decisão |
|------|---------|
| `pty-server/` localização | **DECIDIDO:** Pasta raiz `agente_window/pty-server/`, mesmo repositório. |
| Descoberta de porta | **DECIDIDO:** Opção B — endpoint HTTP `/pty-port`, funciona em dev e produção. |
| Seletor de shell | **DECIDIDO:** Dropdown populado com perfis detectados pelo backend (`availableProfiles` em `opened`). PowerShell é o padrão no Windows. Frontend envia `shellId` no `open`; backend resolve o caminho real. |
| Snapshot de terminal (`TerminalSnapshot`) | **DECIDIDO:** Depreciado completamente. Shell real não precisa de snapshot — o PTY mantém o scrollback. `TerminalSnapshot` e `saveTerminalSnapshot` serão removidos do `App.tsx`. |
| Timeout de inatividade | **DECIDIDO:** 30 minutos. Configurável via env `PTY_IDLE_TIMEOUT_MS`. |
| Split terminal | **DECIDIDO:** Dois PTYs independentes — dois `sessionId` diferentes (ex.: `s1` e `s1-split`), cada um com sua própria conexão WS. |
| Sessão persistente (reload) | **DECIDIDO:** Sem persistência. Shell morre ao fechar/recarregar. Scrollback do xterm.js funciona enquanto a aba está aberta. |
| Features de voz | **DECIDIDO:** Fora de escopo desta onda e de qualquer onda futura sem blueprint próprio. Não há subsistema de voz no projeto. |

---

*Este documento é a fonte única de verdade do design do terminal real.*
*Nenhuma linha de código deve ser escrita antes da aprovação explícita do usuário.*
