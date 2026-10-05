# 05 - DECISOES — decisões fechadas (não reabrir sem ordem do usuário)

> Origem: `24_PLANO_FATIA-05 §2` (D1–D25) e `25` (A0.x, O13/O14), ambos em `docs/arquivo_morto/`. Decisões novas entram **aqui**, no fim, com data. Quem reabre uma decisão fechada tem que citar a evidência que a invalida.

## 1. Decisões travadas da FATIA-05 (D1–D25)

| # | Decisão | Valor travado |
|---|---|---|
| D1 | Lado do chassi | **Direito** (Activity Bar + Side Bar na ponta direita) |
| D2 | Terminal | **Intocável** (blindado por `docs/18`; `core/**`/`server/**` do módulo `explorer-search` também intocados) |
| D3 | Idioma da UI | **Inglês** nas peças novas/migradas. Resto do shell **não é traduzido** — fica como está |
| D4 | Porta | **Single Port 5174** (sem `.env`; caminhos relativos `/fs/*` e `/git/*`) |
| D5 | Ícones na Activity Bar em 5.1 | **3** (Explorer, Search, Source Control). Browser só em 4.8 |
| D6 (v1.2 — 2026-10-02) | AttachArea (editor real) | **Permanece fino à direita (AuxiliaryBar) como default — o chat é o foco principal.** Na 5.7 ganha o estado `editorMaximized` (A0.7, 2026-09-30): o botão maximizar do editor faz ele **tomar o centro e esconder o chat**; restaurar volta para `[chat][editor fino]`; persistido em `workbench.layoutState.v1`. **Maximizado = `[lista 300][EDITOR flex][Side Bar 274][Activity Bar 48]` — a Side Bar NÃO recolhe no maximize, só o chat some (decisão do usuário, homologação 2026-10-02; em 1400 px o editor mede ~767).** **Nunca** migra permanentemente para o centro (corrigido em A0.7 — a redação anterior "migra pro centro em 5.7" estava errada; ver §4 5.7 e fontes) |
| D7 | Timeline/Outline | **Seções internas do Explorer**. Vazias em 5.1, reais em 5.6. **Não** são abas do painel inferior |
| D8 | Numeração das fatias | **FATIA-06 = Chat + Runtime de Agente** (canônica) |
| D9 | Gerenciador de pacotes | **npm** (não pnpm) |
| D10 | Maquete "Changes N" + `src/shell/gitTransition.ts` | **Removidos na 5.3** |
| D11 | Inversão futura da lista de conversas | **Chassi assimétrico**, mas `layoutState.position` já é gravado e `viewRegistry` aceita `container: 'left' \| 'right'` desde a 5.1 |
| D12 | Breadcrumbs / menu "..." / fechar aba / ícones por extensão | **Nada recriado** — já existe no código (§5.3) |
| D13 | Menubar File/Edit/View | **Não existe no VS Code moderno** — não recriar |
| D14 | Tradução pt-BR de "Explorer/Search/Source Control" | **Não traduzir** |
| D15 | `npm run e2e` | **Não existe** — usar `npx playwright test` |
| D16 | `.env` | **Não criar** |
| D17 | Recolhimento de superfícies com box próprio | **`display: flex/none`** (equivalente à Regra 10 do `docs/18`, mas com box mensurável) |
| D18 | `core/**` e `server/**` do módulo `explorer-search` | **Intocados na FATIA-05** |
| D19 | `App.tsx` | Só wiring aditivo via barrel |
| D20 | Cores | Zero hardcode; apenas tokens `--vscode-*` |
| D21 | Tipos | Zero `any` em porta de serviço |
| **D22** | **Sash da Side Bar** | **4 px** (régua do VS Code — medido em `05_01`). O `ATTACH_SASH_WIDTH_PX = 6` continua valendo **só** para o anexo do editor |
| **D23** | **Largura da Side Bar** | Mínimo **170 px**, padrão **`min(300, largura/4)`**, máximo **`largura − 220`**, **snap-to-close** abaixo do mínimo (arrastar até fechar) |
| **D24** | **Side Bar fechada** | Não é `display:none` no VS Code; o part fica com largura 0. Ao reabrir, devolve a **mesma largura** de antes (não reseta pro padrão) |
| **D25** | **Indicador de ícone ativo** | Borda de **2 px** na face **externa** da tirinha (`left: 46px` no modo direito). Permanece no último ativo mesmo com a Side Bar fechada |

## 2. Decisões abertas durante a obra (A0.x) — fechadas

| # | Decisão | Resultado |
|---|---|---|
| A0.1 (2026-09-30) | Activity Bar movível (5.4) × perfil `agentsWindow` readOnly | **Desvio consciente e documentado** (registrado como **O13**). Move Left/Right por menu de contexto; Top/Bottom adiados (D2.64) porque exigiriam wrapper em coluna que quebra a régua do sash. **Não perguntar de novo.** |
| A0.6 (2026-09-30) | Onde vivem Outline/Timeline (5.6) | **Seções do Explorer**, seguem o arquivo ativo do anexo. Timeline via `POST /git/log` **aditivo** em `server/git` (única exceção à regra de `server/**` intocável); `core/git` intocado — cliente novo em `core/timeline/`; Outline via `DocumentSymbolProvider` do Monaco. |
| A0.7 (2026-09-30, corrigida 2026-10-02) | Escopo da 5.7 | Editor anexo **fino à direita é o default; chat é o foco principal**. 5.7 = toggle **maximizar/restaurar** do editor da AuxiliaryBar (`editorMaximized` persistido). **Migração permanente para o centro rejeitada.** v1.2: no maximizado a **Side Bar 274 continua visível** — só o chat some (`[lista 300][EDITOR flex][SB 274][AB 48]`). |
| 2026-10-02 ("1 misto, 2 apagar, 3 767") | Escopo da 5.8 | 5.8 = c1 (coluna "Detalhes" **apagada**, não escondida) + c3 (tokens). Alt+Z e menu de abas → 5.9/futura. Simple Browser → 4.8 separada (D2.39: só UI, sem runtime IA/CDP). DoD maximizado 767 px em 1400. |
| Homologação 5.7 (2026-10-01) | Comportamento das abas do anexo | Abas empilham; fechar aba nunca desmonta a AuxiliaryBar; sem Browser automático; sem "Detalhes" com 0 arquivos; F5 mantém abas. |

## 3. Observações de obra com força de decisão (O13/O14)

| # | Observação | Consequência |
|---|---|---|
| O13 | = A0.1 acima. (O prompt da época pediu "O10", mas O10–O12 já existiam → ficou O13.) | ADR-12 continua válido. |
| O14 | **Views Panel (5.5):** não havia `.part.panel`; o painel inferior era só o `.terminal-panel`. Criado `.part.panel.views-panel` **novo**, irmão acima do terminal em `.right-section` (`display:none` sem views; faixa "Drop view here" durante arrasto; 240 px fixos, D2.66). Terminal 0 linhas tocadas; `.main-region` não refatorado. | Qualquer view "no painel inferior" vai para o Views Panel, nunca para dentro do terminal. |

## 4. Decisões de processo (vigentes)
- Fonte da verdade = repo/preview real; prints e vídeo do Windows prevalecem sobre doc.
- `legacy/` removida pelo usuário (tag `legacy-backup-2026-09`): não restaurar, não referenciar.
- Numeração canônica: FATIA-06 = Chat + Runtime de Agente (D8). Fatia 6 **pausada** até autorização.
- Testes de fixture (`12*/13*/14*`) nunca contra a 5174 (apagam arquivos reais).

## 5. Decisões de documentação (2026-10-03)
- **Engenharia de Contexto híbrida:** pasta única `docs/` com 9 arquivos numerados e travados; `AGENTS.md` de 1 linha na raiz; um lugar só para cada informação (estado=03, decisões=05, futuro/dívidas=06, histórico=07). Não criar o 10.º arquivo. Motivo e mapeamento no `01 §0–§2`.

## 6. Decisões da FATIA-06 (2026-10-04)

| # | Decisão | Valor travado |
|---|---|---|
| D26 | Referência oficial da Fatia 6 | **VS Code 1.135.0 (perfil Janela Agentes no Windows 11)** medido na máquina real do usuário. Substitui referências obsoletas a 1.140.0. |
| D27 | Chassi direito e terminal na Fatia 6 | **Intocáveis.** Zero criação de colunas paralelas ou abas "Alterações/Changes" no lado direito; Side Bar 274px, Activity Bar 48px e TerminalPanel inferior permanecem sem alterações de código. |
| D28 | Empty State Central | **Largura máxima travada em 768 px**, centralizado; ao submeter mensagem ou carregar sessão, transita automaticamente para histórico flex com input fixado no rodapé. |
| D29 | Remoção de Mocks da Fatia 6 | Mocks estáticos de chat e sessão em `src/data.ts` (`initialSessions`, `setupMessages`, `waitingMessages`, etc.) serão desconectados para implementação do serviço real de sessões. |

## 7. Decisões da Raspagem OpenClaude (2026-10-05)

| # | Decisão | Valor travado |
|---|---|---|
| D30 | Stack do OpenClaude e Persistência Híbrida | O OpenClaude real é **TypeScript / Bun / Node**. Persistência híbrida travada para o Agente Window: indexação e metadados rápidos no SQLite `~/.agente_window/agente_window.db` + transcripts streaming em JSONL (`<sessionId>.jsonl`) organizados por projeto (`~/.agente_window/projects/<slug>/`). |
| D31 | Modelo de Permissões e Proteção contra Loops | Modos `default`, `acceptEdits`, `plan`, `fullAccess`. Ações `allow`, `deny`, `ask`. Interface no chat com card inline e botões: **[Permitir]**, **[Não]**, **[Sempre na Sessão]** (`allow-session`). Implementação de `checkDoomLoop` travando loops repetitivos na **3.ª chamada idêntica**. |
| D32 | Reset de Sessão | **Sem botão "Clear Chat" no MVP.** O OpenClaude opera estritamente com **Nova Conversa** (emite `session_cleared`, aloca novo UUID e zera a interface) e **Retomar Conversa** (carrega transcript do disco sem perder histórico). |
| D33 | Provedores e Configuração | Arquivo de configuração em `~/.agente_window/providers.json`. Formulário estilo Cline integrado aos provedores nativos suportados (OpenAI, Gemini, NVIDIA, Mistral, Codex, Helicone, Ollama local e OpenCode Zen). |
| D34 | Worktree e Isolamento (Fatia 06) | Criação de salas de trabalho isoladas via `git worktree add` em `.agente_window/worktrees/<slug>` com proteção contra path traversal. Symlinks automáticos para diretórios pesados (`node_modules`). **Chaveamento automático da raiz do terminal pty** para a pasta da worktree ativa. |
| D35 | Workspace Vazio (Fatia 06/09) | Boot inicial com tela central vazia de **768 px**. Ao submeter mensagem sem workspace aberto, criação automática de pasta padrão em `~/agente_window/projects/untitled-<timestamp>/` como raiz do Explorer e do terminal. |

