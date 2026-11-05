# Relatório final — Fatia 06

**Data:** 2026-10-11  
**Checkpoint inicial:** `98c783b`  
**Checkpoints desta missão:** `ace0811`, `00eda23`, `1f531ce`

## 1. Correção do bug Linux `/mnt` não listar

Foi criado o contrato `GET /api/fs/list?path=`. A resposta contém `path`, `realpath`, `parent` e `folders`; usa `readdirSync(..., { withFileTypes: true })`, inclui diretórios ocultos, exclui arquivos e ordena A–Z. Falta de permissão retorna `error: "permission"` e lista vazia.

A seleção saiu da parte inferior da landing e foi integrada à Title Bar por `components/TopBar/WorkspaceSwitcher.tsx`, com apresentação estilo Command Palette. O campo aceita `/`, `/mnt/`, `/home/` e outros caminhos; o dropdown tem scroll, estado de pasta vazia, clique, setas, Enter, Tab e Esc.

## 2. Prova de sincronização Explorer + Terminal

O endpoint `POST /api/session/change-workspace` recebe `{ sessionId, path }`, valida por `realpath`, salva a sessão simples com `worktreePath=null` e `branch=null` e atualiza recentes LIFO 10 removendo entradas inexistentes.

O frontend aplica o mesmo caminho a `/fs/workspace` e ao wiring PTY `/api/pty/cwd`. Esse wiring escreve o comando de mudança de diretório no PTY vivo da sessão sem alterar `TerminalPanel.tsx` ou xterm. Em caso de falha intermediária, há compensação para o caminho anterior.

**Playwright Debian, 1400×900:**
- `/` exibiu `home`, `mnt` e `tmp`;
- `/mnt/` exibiu `Pasta vazia` no ambiente de teste;
- seleção de `/tmp` mudou `/fs/root` para `file:///tmp`;
- `pwd` no xterm retornou `/tmp`;
- `document.title` passou a `/tmp`;
- zero `pageerror`;
- evidência local não versionada: `/home/user/fatia06-topbar-pwd.png`.

## 3. Comparação com o Agent Window original

Alinhado ao original:
- seletor central no topo, com comportamento de Command Palette;
- listagem incremental de diretórios reais;
- navegação por teclado e confirmação explícita;
- workspace simples, sem Git/worktree obrigatório;
- sessão, título, Explorer e terminal acompanhando o mesmo caminho;
- Windows usa seletor Explorer moderno por `CommonOpenFileDialog IsFolderPicker=true` sobre `IFileOpenDialog/FOS_PICKFOLDERS` via PowerShell STA.

Personalização preservada:
- Empty State centralizado em 768 px;
- Conta > Provedores com OpenAI, Gemini e Ollama;
- `~/.agente_window/providers.json` sem chave em texto puro;
- chaves somente por `OPENAI_API_KEY` e `GEMINI_API_KEY`;
- terminal visual e xterm intocáveis.

## 4. Checklist Windows 5174

1. Abrir workspace pela barra superior.
2. Clicar em **Procurar** e confirmar janela grande com favoritos/barra de endereço.
3. Escolher pasta e confirmar Explorer + terminal mudando juntos; executar `Get-Location`.
4. Abrir Conta > Provedores, salvar e confirmar status das env vars sem `apiKey` no JSON.
5. Digitar `/tmp` ou caminho Windows válido na top bar e confirmar título, Explorer e terminal.

## 5. Checklist Linux

1. Clicar na barra superior.
2. Digitar `/` e confirmar lista com `home`, `mnt`, `tmp` conforme o filesystem.
3. Digitar `/mnt/` e confirmar diretórios ou estado `Pasta vazia`.
4. Usar `/tmp`, executar `pwd` e confirmar Explorer e título em `/tmp`.
5. Abrir Conta > Provedores, salvar e reabrir os três cards.

## 6. Dívidas para Fatia 12

- polish visual fino da barra em larguras estreitas;
- fidelidade final de sombras, espaçamentos e animação ao Command Palette original;
- picker unificado avançado com busca em históricos/hosts, grupos e remoção de recentes;
- revisão final de acessibilidade com leitor de tela em Windows.
