# BACKLOG ESTRATÉGICO — Réplica Agents Window (VS Code)

## Intenção Original
- **Objetivo:** construir uma réplica de alta fidelidade e 100% funcional da Agents Window do VS Code, eliminando mocks onde houver integração real exigida.
- **Estado Atual:** Onda 1 e Onda 2 permanecem registradas como entregas históricas validadas, porém o **Terminal Real foi reaberto** após a regressão reproduzida em 2026-09-07 e após a aprovação do `BLUEPRINT_TERMINAL_REAL.md` **Revisão 3**.
- **Meta Final:** encerrar o terminal com a fundação corrigida (`RC1`–`RC4`), servidor único em `/pty`, paridade visual aprovada e cadeia final `typecheck + test + playwright + build` verde na mesma sessão documental.

---

## Onda 1 — Produção Real: Filesystem & Terminal (histórico)
> Pré-requisito histórico: Sessões 01 a 05 concluídas e validadas

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W1-01 | Sessões List Real (Sessão 04) | Agrupamento completo (Hoje/Fixadas), 3 chats aninhados, workspace capping 3, drag seguro e teclado | `SessionSidebar.tsx`, `sessionsList.ts`, `dragAndDrop.ts` | E2E `sessao_02` passa (5/5) e typecheck 0 erros | CONCLUÍDO |
| W1-02 | Layout Topologia (Sessão 05) | Docked controller, session sync, CannotClose tabs e regra R-070 | `sessionLayout.ts`, `sessionLayoutSync.ts`, `App.tsx` | E2E `sessao_09` passa (5/5) | CONCLUÍDO |
| W1-03 | File System Access API (Sessão 08) | Entregue: `showDirectoryPicker` real, árvore do disco, persistência do handle em IndexedDB e fallback honesto; E2E prova a chamada nativa | `src/domain/fileSystem.ts`, `AuxiliaryBar.tsx`, `App.tsx` | E2E `sessao_08` 5/5 e chamada real de `showDirectoryPicker` instrumentada | CONCLUÍDO |
| W1-04 | Terminal Real xterm.js (Sessão 11) | **Marco histórico:** backend PTY + WebSocket entregue e Gate 0 verde em 2026-09-06. **Situação atual:** a trilha foi reaberta pela regressão Arena (2026-09-07) e pela Revisão 3 do blueprint; o follow-up executável está agora na **Onda TR** abaixo. | `pty-server/`, `TerminalPanel.tsx`, `usePtySession.ts` | Evidência histórica em `GATES_EXECUCAO.md` §6; replanejamento atual em `BLUEPRINT_TERMINAL_REAL.md` Rev. 3 | CONCLUÍDO (HISTÓRICO) |

### Meta da Onda 1
- **Critério binário histórico:** Filesystem e Terminal reais integrados sem mocks, com testes unitários passando.
- **Status:** CONCLUÍDO (histórico; terminal reaberto em onda corretiva posterior)

### CONTRATOS_DA_ONDA 1 — Registro Histórico
```yaml
FONTE: "04_gestao_completo/documentacao_viva/BLUEPRINT_TERMINAL_REAL.md (Revisão 2, agora parcialmente revisada pela Revisão 3)"

FATOS_HISTORICOS:
  - "Gate 0 ficou verde em 2026-09-06 e permanece como evidência histórica de uma execução real."
  - "A regressão observada em 2026-09-07 NÃO apaga esse fato; ela apenas reabre a frente do terminal."
  - "A Revisão 3 substitui formalmente a estratégia de porta dedicada + discovery para o trabalho futuro."
```

---

## Onda 2 — Custom Views, Mobile & Fechamento de Produção (histórico)
> Pré-requisito histórico: Onda 1 concluída

### Itens

| ID | Entregável | Descrição | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------|----------------------|---------------------|--------|
| W2-01 | Custom View Grid (Sessão 08) | Superfície full-surface mutuamente exclusiva com Sessions Part/Editor/Aux/Panel, desired vs effective visibility, dismiss e persistência | `src/domain/customView.ts`, `App.tsx`, `CustomizationsView.tsx` | E2E `sessao_10` 6/6 + 15 unitários de `customView` | CONCLUÍDO |
| W2-02 | Responsividade Mobile (Sessão 10A) | Gate por toque (`pointer:coarse` + maxTouchPoints), dock bottom-bar, alvos de 44px e gesto de swipe lateral | `mobileLayout.ts`, `App.tsx`, `app.css` | E2E `sessao_06` 5/5 em 390x780 com toque e handlers de swipe | CONCLUÍDO |
| W2-03 | Suíte Final de E2E & Screenshots (Sessão 10B) | Asserções reais e screenshots de evidência | `e2e/*.spec.ts`, `test-results/` | `npx playwright test` verde na execução histórica correspondente | CONCLUÍDO |
| W2-04 | Build de Produção Limpo | Code-splitting com `manualChunks` no `vite.config.ts` isolando `monaco-editor` e `@xterm/xterm` | `vite.config.ts`, `dist/` | `npm run build` concluir com exit code 0 | CONCLUÍDO |

### Meta da Onda 2
- **Critério binário histórico:** E2E completo e build de produção concluído com evidência real.
- **Status:** CONCLUÍDO

### CONTRATOS_DA_ONDA 2
```yaml
OUTPUT_SCHEMAS:
  W2-01: "GridState -> { panes: PaneItem[], activePaneId: string, splitDirection: 'horizontal' | 'vertical' }"

ESCOPO_CONGELADO:
  - "src/components/SessionSidebar.tsx"

DECISOES_EXTRAS:
  - "Não adicionar novos frameworks visuais; utilizar apenas CSS customizado existente"
```

---

## Onda TR — Terminal Real: Correção de Regressão + Servidor Único + Paridade Visual
> Pré-requisito: diagnóstico de regressão documentado em `GATES_EXECUCAO.md` §7
> Fonte mandatória: `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` **Revisão 3**

### Itens

| ID | Entregável | Descrição (planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|------------------------|----------------------|---------------------|--------|
| TR-01 | Fase E1 — Fundação / RC1–RC4 | Corrigir loop de `setState`, re-subscribe do output, reconexão ao mesmo PTY e resize inicial; filtrar PowerShell fora do Windows | `src/providers/TerminalSessionProvider.tsx`, `src/components/TerminalPanel.tsx`, `src/hooks/usePtySession.ts`, `pty-server/src/ptyManager.ts`, `pty-server/src/wsHandler.ts`, `pty-server/src/shellDetector.ts` | `probe-terminal.mjs` verde: prompt visível antes do input, `echo` aparece no output e o mesmo PID sobrevive ao fechar/reabrir o painel | APROVADO PARA EXECUÇÃO |
| TR-02 | Fase E2 — Servidor Único / Porta Única | Eliminar processo standalone + discovery de porta; servir terminal na mesma origem via `/pty` em dev e produção | `vite.config.ts`, `vite-plugin-pty.ts`, `server.mjs`, `src/hooks/usePtySession.ts`, `pty-server/` | Nenhuma chamada a `discoverPtyPort()` ou `/pty-port`; app e WS funcionando na mesma origem | PENDENTE |
| TR-03 | Fase E3 — Paridade Visual | Tokens, CSS, ícones e chrome do terminal inspirados no VS Code real, reimplementados em React sobre `xterm.js` | `src/styles/terminal-vscode.css`, `src/styles/xterm-vscode.css`, `src/components/TerminalTabsList.tsx`, assets `codicon` | Screenshot E2E com tema `#1e1e1e`, abas à direita, borda ativa correta e action bar consistente | PENDENTE |
| TR-04 | Fase E4 — Fechamento / Régua Final | Reforçar `sessao_11`, validar suíte completa, build e arquivamento documental na mesma sessão | `e2e/sessao_11_*`, `GATES_EXECUCAO.md`, `CURRENT_STATE.md`, `DECISION_LOG.md`, `PHASE_SUMMARY.md` | `npm run typecheck` + `npm run test` + `npx playwright test` + `npm run build` todos verdes; docs vivos atualizados | PENDENTE |

### Meta da Onda TR
- **Critério binário:** terminal real revalidado sob a Revisão 3, com arquitetura de servidor único e paridade visual aprovada.
- **Status:** EM ABERTO

### CONTRATOS_DA_ONDA TR — Revisão 3 (vigente)
```yaml
FONTE: "04_gestao_completo/documentacao_viva/BLUEPRINT_TERMINAL_REAL.md (Revisão 3)"

ORDEM_OBRIGATORIA:
  - "1. Fechar E1 com sonda real verde antes de qualquer refatoração de arquitetura/visual."
  - "2. Só depois avançar para E2 (servidor único / porta única)."
  - "3. Só depois avançar para E3 (paridade visual)."
  - "4. E4 fecha a cadeia final e atualiza toda a documentação viva na mesma sessão."

DECISOES_IMUTAVEIS_DESTA_REVISAO:
  - "Esconder/fechar painel, trocar de terminal ou trocar de sessão NÃO mata o PTY."
  - "A régua mínima do terminal exige prompt visível antes de input e o mesmo PID após toggle do painel."
  - "A arquitetura futura remove o discovery de porta e centraliza tudo na mesma origem com endpoint /pty."
  - "Paridade visual não é copy/paste literal do workbench; é reimplementação React sobre xterm.js usando tokens/CSS/ícones do VS Code."
  - "HOST do produto permanece 127.0.0.1 nesta onda; acesso remoto fica fora de escopo."

FORA_DE_ESCOPO:
  - "Acesso remoto (0.0.0.0) e autenticação de terminal."
  - "Ir para Diretório Recente / Executar Comando Recente (WB-01, WB-02)."
  - "Executar Arquivo Ativo / Executar Texto Selecionado (WB-03, WB-04)."
  - "Serviço de Voz (WB-05)."
  - "Output real do painel inferior."
```

---

## Onda B — Extensões do Terminal Real
> Pré-requisito atualizado: **Onda TR concluída**
> Decisão registrada: itens permanecem adiados e não devem contaminar o escopo da Revisão 3

| ID | Feature | Motivo do adiamento | Status |
|----|---------|---------------------|--------|
| WB-01 | "Ir para Diretório Recente" | Exige histórico de diretórios persistido acima do terminal real. | PENDENTE |
| WB-02 | "Executar Comando Recente" | Exige histórico persistido de comandos, separado do PTY em si. | PENDENTE |
| WB-03 | "Executar Arquivo Ativo" | Integração editor↔terminal, fora da onda corretiva atual. | PENDENTE |
| WB-04 | "Executar Texto Selecionado" | Integração editor↔terminal, fora da onda corretiva atual. | PENDENTE |
| WB-05 | "Iniciar Serviço de Voz" | Sem relação com o PTY e sem blueprint próprio aprovado. | BLOQUEADO — aguarda blueprint próprio |

---

## Regras do Backlog
1. Itens só mudam de status definitivo após validação real registrada em `GATES_EXECUCAO.md` na mesma sessão.
2. Nenhum número novo entra nos documentos vivos sem execução correspondente.
3. Contratos definidos em `CONTRATOS_DA_ONDA` são fatos imutáveis até revisão formal posterior.
4. A Revisão 3 do terminal substitui formalmente a arquitetura de porta dedicada/discovery da Revisão 2 para todo trabalho futuro.
