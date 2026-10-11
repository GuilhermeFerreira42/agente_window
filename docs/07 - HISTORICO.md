# 07 - HISTORICO — Agente Window

> Único lugar de histórico (changelog + diário de sessão). Entradas mais novas no topo, com data e commits. O diário detalhado de set/out 2026 (antigo `12`, 1.700 linhas) está íntegro em `docs/arquivo_morto/12-DOCUMENTACAO-VIVA.md`; o antigo `16` (handoff da IA executora) em `docs/arquivo_morto/16-…`.

## 2026-10-10 - Coerência canônica de estado, roadmap e homologação
- Alinhados `01`–`09` ao estado real da Fatia 06: 06.4a aguarda homologação Windows e bloqueia o início da 06.4b. O roteiro humano está no `08`; estado, roadmap e decisões pendentes ficam no `03` e `06`.
- D39–D55 saíram do arquivo de decisões fechadas e passaram a “Decisões a deliberar” em `06 §2.3`. A Fatia 13 permanece proposta até deliberação D55. Especificação de layout e inventário de gaps continuam em `pesquisa_bruta/`.
- Skills/Instruções e caminhos foram verificados no `microsoft/vscode main` commit `cc3fec8`; o comportamento no VS Code 1.135 **não foi confirmado**. Pastas de pesquisa 07–10 foram marcadas como numeração antiga.

## 2026-10-09 - Auditoria documental e referência bruta de Personalizações
- Recebido e preservado em `docs/arquivo_morto/pesquisa_bruta/personalizacoes/` o mockup `vscode_agents_mockup_interativo (1).html` como ideia estrutural do usuário, sem tratá-lo como prova do VS Code original.
- Corrigidas divergências entre a numeração antiga e a tabela oficial 06–12: removidos do estado atual o bloco obsoleto 06.3–06.6 e a ordem de criar `SESSION_PICKER.md`; Command Menu + Theme, Hardening e Release foram absorvidos pela Fatia 12, e Browser Runtime IA/CDP pela Fatia 09. Detalhes e mapeamento ficam no `06 §2.1`.
- Naquele momento, Skills e Instruções no VS Code 1.135 ficaram **não verificadas**. A auditoria posterior confirmou caminhos no `microsoft/vscode main` commit `cc3fec8`, mas o comportamento no 1.135 continua não confirmado; as propostas resultantes estão no `06`, não no arquivo de decisões fechadas.

## 2026-10-07 - FATIA 06.4a — correção de rota para workspace simples
- Fluxo padrão passou a aceitar qualquer diretório com ou sem Git; `useWorktree=false`, sem branch/cópia, `worktree_path=NULL`, terminal direto e recentes em `~/.agente_window/recent-workspaces.json`.
- Migração automática remove `NOT NULL` de `worktree_path`; exclusão sem worktree remove apenas persistência. `useWorktree=true` sem Git retorna HTTP 400 `worktree_requires_git`; implementação 06.2/06.3 foi preservada para a Fatia 11.
- D38 autorizou alteração aditiva mínima no servidor FS: `POST /fs/workspace { path }` valida `realpath` e diretório, troca a raiz e recarrega Explorer/Search/SCM por sessão sem alterar componentes visuais.
- Documentação reorganizou Fatias 07–12 sem implementar escopo futuro; referência de worktree arquivada em `docs/arquivo_morto/fatia-06-worktree/`.
- Gates locais: typecheck 0; alvo 71 pass; suíte 722 pass + 9 falhas antigas de TerminalPanel; Playwright terminal 3/3; loop 5174 comprovou pastas Git/não-Git, PWD, Explorer, troca, F5, SQLite, exclusão e ausência de worktrees/branches.

## 2026-10-06 - FATIAS 06.1 e 06.2 homologadas no Windows real
- **06.1 homologada pelo usuário no Windows real, porta 5174:** persistência SQLite + JSONL e restauração após F5 comprovadas; commits `c9e1f0c` e reparo de respostas transitórias `9ba48db`.
- **06.2 homologada pelo usuário no Windows real, porta 5174, por vídeo 12:06:** commit `f1afebd`; `+` abriu a landing sem divisão; duas sessões exibiram `pwd` em worktrees distintos; a troca pelo picker alterou automaticamente o cwd do terminal; F5 restaurou worktrees e sessões.
- **06.3 implementada localmente e aguardando homologação Windows:** inspeção confirmou Vite puro, sem Tauri; decisão registrada em `docs/04`: `powershell.exe -STA` + `System.Windows.Forms.FolderBrowserDialog`, sem `FileSystemDirectoryHandle`.
- Acrescentados validação server-side da raiz Git, criação a partir de outros repositórios, origem persistida separada do worktree e exclusão protegida/idempotente. Worktree sujo retorna 409, permanece íntegro e exige confirmação explícita para force.
- Loop 5174 com repo-a/repo-b: PWD limpo e distinto, troca por sessão, F5, exclusão limpa e suja, SQLite/branches/diretórios zerados no fim. Gates: typecheck 0; backend 14/14; UI 11/11; App 45 pass; suíte 721 pass + 9 falhas antigas do terminal; Playwright terminal 3/3.
- `worktree_path` persistido no SQLite; terminal ligado pela prop pública `workspace={activeSession.worktreePath ?? activeSession.workspace}` e remontado na troca de sessão para aplicar o novo cwd.
- Landing sem divisão de cor, seletor de outros repositórios desabilitado até 06.3 e inspeção visual 1400×900 concluída.
- Validação local: typecheck verde; App 45/45 executados; worktrees 3/3; suíte Vitest 704 pass / 9 falhas preexistentes de `TerminalPanel.test.tsx` / 16 skip; Playwright terminal real 3/3; SQLite, `git worktree list`, diretórios, `pwd`, troca de sessão e F5 comprovados.

## 2026-10-05 - Arquivamento da Pesquisa Bruta OpenClaude em fatia-06-chat/ e Limpeza (Antigravity)
- Raspagem profunda do repositório `openclaude` em `C:\Users\Usuario\Desktop\ARENA\a\openclaude\` (TypeScript/Bun).
- Todo o conteúdo de pesquisa foi arquivado em `docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/`:
  - `PERSISTENCIA_OPENCLAUDE.md`, `PERSISTENCIA_OPENCODE.md`, `WORKTREE_OPENCLAUDE.md`, `PERMISSOES.md`, `ERRO_HANDLING.md`, `RESET_SESSAO.md`, `WORKSPACE_VAZIO.md`, `GUI_PROVEDORES_CLONE.md`, `PROVIDERS_EXEMPLO.json`.
  - O índice geral foi integrado ao `README.md` da pasta de pesquisa com links relativos.
  - Pasta temporária `docs_atualizada/` na raiz apagada (zero arquivos soltos fora do padrão).
- Regra dos 9 arquivos oficiais mantida rigorosamente.
- `04 - ARQUITETURA E REGRAS DURAS.md`: documentada compatibilidade nativa de stack TypeScript/Bun do OpenClaude com o workbench React+Vite+TS (D30).
- `05 - DECISOES.md`: consolidadas decisões D30–D35 (persistência híbrida SQLite+JSONL, worktree git + symlink + pty switch, permissões Allow/Deny/Allow-session + doomLoop, sem Clear Chat, providers.json estilo Cline, workspace vazio 768px + untitled auto).
- `PERMISSOES.md` atualizado com o CSS e HTML exatos do card `.perm-card` de `chatRenderer.js` para replicação pela Arena na Fatia 08.
- **Status:** Fatia 06 pausada aguardando autorização para início de código.



## 2026-10-04 - Alinhamento da Fatia 6 com a máquina real (VS Code 1.135.0)
- Recalibração da documentação da Fatia 6 (`docs/arquivo_morto/pesquisa_bruta/fatia-06-chat/`):
  - Referência oficial travada no **VS Code 1.135.0 (perfil Janela Agentes no Windows 11)**, eliminando referências obsoletas a 1.140.0.
  - Zonas sagradas travadas: chassi direito (`Side Bar` 274px, `Activity Bar` 48px, Explorer, Busca, Git) e `TerminalPanel` (PTY real inferior) são **INTOCÁVEIS** (zero linhas alteradas). Removida qualquer menção a colunas paralelas de "Alterações".
  - Regra do Empty State centralizado (768px): tela vazia centralizada; ao enviar mensagem ou selecionar sessão, transita automaticamente para histórico flex com input ancorado no rodapé.
  - Planejamento de remoção de mocks em `src/data.ts` (`initialSessions`, `setupMessages`, etc.) para conexão com o serviço real de sessões.
- Atualizados `docs/03 - ESTADO ATUAL.md` e `docs/05 - DECISOES.md` (D26–D29).

## 2026-10-03 - Documentação reorganizada: Engenharia de Contexto HÍBRIDA (9 arquivos em `docs/`)
- Decisão do dono (conversa Meta + Arena): manter o ganho da migração (um lugar só para cada coisa) mas voltar para **pasta única `docs/` numerada**, por causa do fluxo por voz com várias IAs. Mapeamento completo e motivo no `01 §0–§2`.
- Raiz: só `AGENTS.md` de 1 linha. Removidos da raiz (conteúdo absorvido): `PROJECT-STATE.md`→`03`, `DECISIONS.md`→`05`, `CHANGELOG.md`→`07`, `CLAUDE.md`, `.cursorrules`; pastas `memory-bank/` e `context/` → `docs/arquivo_morto/`.
- Tudo movido com `git mv` (histórico preservado); nenhum arquivo apagado; `platform/` sem código tocado.

## 2026-10-02 - Pausa para verificação de arquitetura + Teste de capacidade Arena

**Status: PROJETO PAUSADO**

**Teste de capacidade Arena concluído** (resultados relatados pelo usuário a partir de sessões próprias; não reproduzidos neste repositório):

- OpenVSCode Server 1.109.5: compila fácil (sem auth, sem yarn, sem proxy), roda na 8080, 200 OK, serve filesystem real. Serve como régua para comparação byte-a-byte.
- VS Code oficial Microsoft 1.140.0 serve-web: compila mas serve sem Agente Window dedicada. A Agente dedicada só existe em: VS Code Desktop 1.120+ com `--agents` ou insiders.vscode.dev/agents + tunnel (exige login GitHub). Testado com Agente fake: extensão aparece mas não tem barra lateral dedicada no web, só no Desktop.
- Limitação Arena: workspace 128 MB / 10 000 arquivos — runtime deve ficar em `~/.local`.
- Fix necessário: proxy para corrigir `X-Frame-Options: SAMEORIGIN`, que deixa tela cinza no Preview da Arena. Usar node proxy 8081 → 8080 reescrevendo o header para `ALLOWALL`.
- Conclusão: Agente Window dedicada hoje SÓ no Desktop/tunnel. Web (serve-web) não tem ainda.

**Próximo passo:** iniciar novo chat limpo com docs em Context Engineering + zip do projeto para raspagem da Fatia 6 (agrupamento de chats por pasta, empty state 768 px, sync com Explorer, badge "N conversas").

## 2026-10-02 - Migração da documentação para Context Engineering (Etapas 2 e 3) — CONCLUÍDA

- **Etapa 2 `aa1167e` — archive não-destrutivo:** criado `docs/arquivo_morto/` (README explica cada item). Movidos: `FATIA-05_LAYOUT_BYTE_A_BYTE/`, `docs/00_COMO_LER`, `12-DOCUMENTACAO-VIVA`, `14`, `15`, histórico do terminal (`ANALISE_…`, `CORRECAO_…`, `comparacao-terminal/`, `historico_migracao_temporaria/`), resíduos `platform/apps/workbench-v2/tsc` (vazio) e `test-results-debug/` (versionado por engano). **Não movidos (decisão do usuário):** 13 E2E mortos + 9 unitários `TerminalPanel.test.tsx` — listados em `docs/28 §2` como INTOCÁVEIS (docs/18). `shot.tmp.mjs` não existia; `legacy/` já não existe.
- **Etapa 3 `25b3a3b` — docs/ enxuto:** `docs/` passou de **373 → 6 arquivos** (`00` ponteiro para `AGENTS.md`, `07`, `08`, `26`, `27`, `28`). Arquivados `01, 02, 03A, 06, 09, 10, 11 (Kanban), 25, CHECKLIST, README`; `engenharia_reversa/01–10 + FATIA-04_VIDEO_COMPLETO` e `referencias_visuais/` → `docs/arquivo_morto/engenharia_reversa/`; `16`, `17`, `historico_homologacao/` → `docs/arquivo_morto/`. Links antigos (`docs/24`, `docs/18`, `docs/12`, `docs/11`, `engenharia_reversa/FATIA-05_LAYOUT`) reescritos em `26`, `27`, `28`; nota de migração em `07`, `08`.
- **Validação:** typecheck 0 · `sessao_15_activity_bar` 21/21 ×2 na 5175 (1ª rodada abortou na partida fria do Vite — não é regressão) · `platform/` com 0 linhas de código tocadas · 374 arquivos preservados em `memory-bank/ + context/` (nada apagado).

## 2026-10-02 - Migração da documentação para Context Engineering (Etapa 1)

- Criados na raiz: `AGENTS.md` (canônico), `CLAUDE.md` (`@AGENTS.md`), `.cursorrules`, `docs/03 - ESTADO ATUAL.md`, `docs/05 - DECISOES.md` (D1–D25 + A0.1/A0.6/A0.7 + O13/O14), este `docs/07 - HISTORICO.md`.
- Criadas `memory-bank/{context,planning,architecture}/` e `context/raw/`; movidos (git mv, histórico preservado): `FATIA-05_LAYOUT/` completa e `04_17` + `raspagem_04_17` → `docs/arquivo_morto/engenharia_reversa/`; `05_BACKLOG_MESTRE`, `24_PLANO_FATIA-05` → `memory-bank/planning/`; `03`, `04`, `13`, `18` → `docs/arquivo_morto/`.
- Divergências encontradas (código/repo manda): `docs/` tinha **373 arquivos** (não 172); `legacy/` **já não existe** no repo (removida pelo usuário); `docs/24` tem D1–**D25** (confirmado).

## 2026-10-02 - FATIA-05 100 % homologada no Windows
- `e93031d` docs v1.3 (5.8 "misto") · `d0c2a8d` 5.8-c1 coluna "Detalhes" removida de vez · `4ee0ed8` 5.8-c3 16 tokens sem fallback adicionados · `2dc832a`/`c2dc674` docs de fechamento.
- Maximizado `[lista 300][EDITOR 767][Side Bar 274][AB 48]` (D6 v1.2); T39; bateria §9 ×2 verde.

## 2026-10-01 - 5.7 editor fino default + maximizar/restaurar (`9a11319`, fixes `a9a73f4`/`0a8ce9a`/`d0a2f81`); homologada por vídeo 08:37:34 em 2026-10-02.
## 2026-09-30 - 5.4 `7bd528b` · 5.5 `1f1ed79`+`4e10381` · 5.6 `7d05c7d` (A0.1, A0.6, A0.7).
## 2026-09-29/30 - Gate 0 aprovado · 5.1 `3fcc913`/`fd05507`/`1e9978f` · 5.2 `22a1523` · 5.3 `2bd6cc3`.
