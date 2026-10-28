# 04 - ARQUITETURA E REGRAS DURAS

> Da IA. Lido antes de tocar em código. Resume `03_ARQUITETURA_EXECUTAVEL`, `04_CONTRATOS_TECNICOS`, `13_ADRS`, `18_PROTOCOLO_ANTI_REGRESSAO` e `28_INVENTARIO_OBSOLETOS` (originais íntegros em `docs/arquivo_morto/`). Em caso de dúvida sobre o terminal, **abrir o 18 original** antes de agir.

## 1. Regras duras (violação = rollback imediato)
1. **Terminal intocável** — `src/components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `platform/services/pty-server/**`, specs `e2e/sessao_11*`. Homologado pelo comitê (`17`, `75c6686`). Zero linhas, nem "só CSS".
2. **`src/modules/explorer-search/{core,server}/**` intocáveis.** Única exceção já concedida: `server/git` **aditivo** (`POST /git/log`, 5.6). `index.ts`/`contract.ts` do módulo só aditivos; `ui/**` só montagem; **o módulo nunca importa do shell**.
3. **`App.tsx` só wiring aditivo** via barrel (`src/shell/index.ts`, `modules/explorer-search/index.ts`). `EditorArea.tsx` segue só com Browser/Customizations.
4. **Zero cor hardcoded** — só tokens `--vscode-*` definidos em `styles/theme.css` (dark **e** light). Zero `any` em porta de serviço. **`.env` proibido.** npm (não pnpm/yarn).
5. Sem `position: fixed`. Recolher superfície com box = `display: flex/none` (`contents/none` só em wrapper transparente — Regra 10 do 18). Sem transição CSS de largura em Side Bar/sash (o VS Code não anima).
6. Chassi à **direita**: `[lista 300][centro: chat | editor anexo][Side Bar 274][Activity Bar 48]`; sash da Side Bar 4 px; maximizado do editor **mantém** Side Bar 274 (D6 v1.2).
7. RAM ~1,9 GB: **um Vite por vez**; proibido buildar VS Code/code-server; runtimes/clones em `~/.cache`.
8. Princípio **LEGO**: módulos prontos são reposicionados, nunca reescritos. Nada em `legacy/` (removida pelo usuário; não restaurar). **Eliminação definitiva do visualizador legado:** qualquer componente de visualizador antigo é banido da arquitetura; todas as abas e superfícies auxiliares (inclusive Provedores) abrem exclusivamente no editor moderno.
9. **Padrão Spec-Driven / Stream Coding:** 40 % de especificação prévia obrigatória antes de codar; fatias verticais pequenas; proibido iniciar nova fatia com dívida técnica aberta.

## 1.1 Decisão 06.3 — seletor nativo de repositório (2026-10-06)
- **Inspeção técnica:** `workbench-v2` é Vite/React puro; não há `tauri.conf`, pacote `@tauri-apps` nem runtime Tauri. Portanto, `plugin-dialog` não se aplica.
- **Opção C servidor:** no Windows, o plugin Vite chama `powershell.exe` via `child_process.execFile`, em modo STA, e abre `System.Windows.Forms.FolderBrowserDialog`.
- **Fluxo padrão 06.4a:** o caminho deve existir, ser diretório e resolver por `realpath`. Git não é obrigatório. `git rev-parse --show-toplevel` só pode ser exigido quando a chamada explícita usar `requireGit=true`/`useWorktree=true` (worktree opcional da FATIA 19 — era 11 em esquema antigo).
- A operação fica em `src/server/session-persistence/`; a UI usa endpoint single-port dedicado. Cancelamento retorna resultado explícito, não cria draft e não altera a seleção atual.
- **Proibido:** usar `FileSystemDirectoryHandle`/File System Access API para inferir caminho absoluto; aceitar caminho sem validação canônica; implementar o diálogo dentro de Explorer ou terminal.
- Fora do Windows, o endpoint de diálogo responde “não suportado”; a validação de caminho e os testes backend continuam multiplataforma.
- **D38 / exceção mínima autorizada:** `POST /fs/workspace { path }` pode recriar os hosts FS/Git com uma raiz canônica por sessão após validar `realpath` e diretório. Apenas o servidor e o wiring de `App.tsx` mudam; componentes visuais de Explorer/Search/SCM permanecem congelados.

## 1.2 Compatibilidade de Stack com o Runtime de Agente (D30 - 2026-10-05)
- **OpenClaude como referência nativa de Runtime:** O repositório de referência `openclaude` é 100% **TypeScript / Bun / Node**, alinhando-se perfeitamente à stack do nosso produto (`platform/apps/workbench-v2/` em React + Vite + TypeScript).
- **Sem necessidade de sidecar Go:** A raspagem prévia de `opencode` (Go + sqlc + goose) apontava para a necessidade de compilação de binários Go e processos sidecar em background. Com o OpenClaude, todos os serviços de persistência (`sessionStorage`), controle de chamadas (`doomLoop`), segurança (`permissions`), worktrees e providers são TypeScript nativo, permitindo integração direta via contratos na camada 2.1 (Motor / Agent Runtime), eliminando pontes IPC pesadas.

> **Nota de proveniência e vigência documental (24/10/2026):** D30 é mantida como registro histórico da decisão tomada em 05/10 sobre compatibilidade de stack e persistência SQLite+JSONL; esta nota não a revoga nem altera seu significado histórico. A investigação posterior identificou no `LICENSE`/NOTICE do snapshot OpenClaude código derivado do CLI proprietário Claude Code, contribuições OpenClaude MIT apenas “where legally permissible” e declaração de ausência de autorização Anthropic para distribuir o código proprietário. Portanto, OpenClaude permanece referência conceitual; D30 não autoriza importar nem copiar código. O rótulo OpenCode e a stack Go/sqlc/goose em D30 descrevem a raspagem histórica então considerada; o snapshot OpenCode desta investigação (`a5328d2b…`) é Bun/TypeScript/Effect/SQLite/Drizzle. As duas anotações referem-se a snapshots distintos e não devem ser tratadas como descrição única e atemporal do projeto. Ver §1.5 e D101.

## 1.3 Contratos de Sincronização e Visualização da Fatia 6.1 (2026-10-11; hoje **FATIA 07** por D64)
- **Sincronização atômica de Workspace (DEBT-06):** Ao confirmar a escolha de uma pasta (Windows Explorer moderno ou entrada manual Linux), o estado `workspacePath` deve atualizar imediatamente e de forma atômica:
  1. O cliente do Explorer (recarrega a árvore raiz sem exigir reload de página);
  2. O PTY do Terminal (emite `cd` e sincroniza o PWD sem exigir envio de mensagem no chat);
  3. O arquivo de recentes (`~/.agente_window/recent-workspaces.json`).
- **Desacoplamento de Provedores (DEBT-09):** O menu da conta > Provedores deve abrir o painel de configuração independentemente do estado do chat. Funciona tanto na landing page vazia quanto com sessões ativas.
- **Limpeza de buffer do Terminal (DEBT-01):** Execução de `clear`/`cls` no PTY deve disparar limpeza completa do viewport do xterm sem deixar resíduos visuais no topo.
- **Purga de componentes legados (DEBT-04):** Baniu-se qualquer montagem ou referência ao visualizador antigo; todas as telas auxiliares usam a infraestrutura do editor moderno.

## 1.4 Diretrizes aprovadas para SPECs futuras (D99, 2026-10-23)

Estas diretrizes registram decisões de produto, **não** escolhem implementação. Cada capacidade permanente requer SPEC própria e aprovação antes de produção.

- **Central de Diagnósticos:** futura capacidade permanente aprovada; registrar falhas/eventos relevantes, notificar discretamente só problemas importantes, manter eventos comuns silenciosos, deduplicar/agregar e permitir exportação sanitizada. Armazenamento, interface, retenção, arquitetura e política detalhada de privacidade ficam para SPEC própria. Não presumir envio externo.
- **M1–M4 (primeiro conjunto de planejamento, sem numeração oficial):** M1 medir/orçar contexto; M2 transcript estruturado; M3 checkpoints/compactação; M4 busca manual no histórico. M5–M8 só entram em planejamento posterior. Nada aqui autoriza implementação.
- **Privacidade para memória/contexto:** armazenamento local preferencialmente em `~/.agente_window`; isolamento entre projetos e conversas; transcript original preservado; aprovação humana para gravar memória persistente de projeto; exportação e exclusão explícitas; proteger credenciais e dados sensíveis; nenhuma telemetria externa presumida; não reexecutar ferramentas interrompidas. Retenção e limpeza detalhadas exigem SPEC.
- **Medição honesta de contexto:** preferir `usage` real do provedor; sem isso, estimativa claramente identificada ou estado indisponível. Limites por modelo/provedor, configuráveis manualmente e com origem indicada; alertas em 75% e 90%.
- **D98/PERF:** o dono autorizou explicitamente em 2026-10-28 a investigação técnica sem validação documental prévia. Fixture/protótipo isolado e trace são experimentais; não alteram produção. A autorização não libera mudança permanente: esta exige SPEC, critérios quantitativos derivados das medições e aprovação explícita.

## 1.5 Referências técnicas externas para avaliação (D101, 2026-10-24)

Os snapshots abaixo foram investigados como fontes de mecanismos e evidências de desenho, não como soluções já homologadas. Os identificadores são fixos para permitir reconsulta; versões, commits, licença e custo devem ser novamente verificados antes de qualquer adoção. Aplicações potenciais limitam-se às capacidades e cenários D100/CAP-01–CAP-20. Nenhuma linha desta tabela altera contratos, decisões, roadmap, segurança ou escopo de implementação.

| Referência e snapshot | Mecanismos examinados e possível uso no nosso escopo | Custo/limites de adoção direta | Licença e condição de uso |
|---|---|---|---|
| **[OpenClaude](https://github.com/Twigpine/openclaude/tree/cd350528f6f412a0ff19e779a6bd12d0fd0f52a5)**, `Twigpine/openclaude`, commit `cd350528f6f412a0ff19e779a6bd12d0fd0f52a5` | `src/tools/FileWriteTool/FileWriteTool.ts` (leitura prévia/`mtime` e confirmação), `src/utils/permissions/`, `src/utils/doomLoop.ts`, além de `src/utils/memoryCompaction.ts` e `sessionPersistence.ts`: permissões, cancelamento, repetição, sessões e projeção de contexto; conceitos potencialmente relevantes a CAP-04/08/09/12/13/16. | Muito alto: CLI e runtime TypeScript/Bun, APIs/ecossistema próprios; nenhuma evidência de compatibilidade drop-in com o Agent Loop atual. Não importar runtime ou estrutura substancial. | **Restrição de proveniência:** snapshot declara código derivado de Claude Code proprietário; licença MIT aplica-se a contribuições OpenClaude “where legally permissible”, e aviso declara ausência de autorização Anthropic para distribuir o código proprietário. **Somente referência conceitual** até revisão jurídica/proveniência adequada; sem cópia de código/estrutura substancial. |
| **[OpenCode](https://github.com/anomalyco/opencode/tree/a5328d2b66074ede538da972f6ccd30fa21ea67e)**, `anomalyco/opencode`, commit `a5328d2b66074ede538da972f6ccd30fa21ea67e` | `packages/core/src/file-access.ts` separa resolução e autorização; `packages/core/src/session/compaction.ts`, `session/history.ts` e `session/context.ts` descrevem fronteiras/checkpoints e reconstrução de transcript. Pode informar CAP-04/06/08/09/10/12/16 e planejamento M2/M3, sem duplicar persistência atual. | Alto/XL para importar o núcleo: Bun, Effect, SQLite/Drizzle e serviços/CLI/UI próprios criariam stack e arquitetura paralelas. Não é substituto de verificação de identidade real contra symlinks/TOCTOU. | MIT declarada no snapshot; só considerar adaptação localizada após revisão de cabeçalhos, dependências transitivas, avisos e proveniência. MIT não dispensa atribuição e notices aplicáveis. |
| **[Qwen Code](https://github.com/QwenLM/qwen-code/tree/1eee20a72bb1a4fe53cc1221f5d61e3ed7cf2c93)**, `QwenLM/qwen-code`, commit `1eee20a72bb1a4fe53cc1221f5d61e3ed7cf2c93` | `packages/core/src/tools/edit.ts` e `utils/atomicFileWrite.ts`: diff/confirmação, `AbortSignal`, cancelamento e escrita atômica; `services/compactionInputSlimming.ts`, `memoryPressureMonitor.ts` e `omni/memory-recall.ts`: redução/sanitização de payload e memória. Inspira testes para CAP-04/08/09/10/12/13/19; pressão de heap não equivale a uso de contexto do modelo. | Alto para integrar CLI/core completo; baixo–médio para adaptar princípios e cenários de teste. Pacotes, serviços e runtime excedem a necessidade documentada. | **Apache-2.0**, conforme `LICENSE` do snapshot. Corrige a indicação MIT divergente no relatório de capacidades: para esta referência, prevalece a verificação do snapshot descrita na investigação aprofundada/consolidação. Qualquer adaptação exige notices, atribuição, alterações, patentes e dependências conforme a licença. |
| **[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness/tree/22ddee3792402c3e70ec5f86a63c3e3e895a2f60)**, repositório oficial `deepseek-ai/deepseek-harness`, commit `22ddee3792402c3e70ec5f86a63c3e3e895a2f60` | `packages/fs/fs-local/src/fsio.ts` e `packages/fs/fs-sandbox/src/index.ts`: canonicalização de caminhos existentes/inexistentes, política junto ao executor, mitigação de TOCTOU e escrita atômica/cancelável; os testes incluem symlinks. `packages/client/ui-conversation/src/client/context-occupancy.ts` e `packages/compaction/compaction/src/checkpoint.ts` registram ocupação desconhecida e checkpoints correlacionáveis. Referência possível para CAP-04/09/13/16/19, sem presumir equivalência de contextos. | XL para plataforma/harness completo, com dependências e suporte nativo/testes de plataforma. Os padrões/testes são aproveitáveis conceitualmente; não adicionar dependência do harness. | MIT declarada no snapshot oficial. Verificar licença de cada arquivo/dependência e preservar avisos caso futura cópia localizada seja autorizada. |
| **[VS Code `main`](https://github.com/microsoft/vscode/tree/4b40f12604553b3b4c1edb01d1d5f9d78ca71c77)**, `microsoft/vscode`, commit `4b40f12604553b3b4c1edb01d1d5f9d78ca71c77` (1.144.0) | `src/vs/platform/agentHost/node/sessionPermissions.ts`, `chatContributions/checkpointAndChangeset/checkpointAndChangesetContribution.ts` e serviços/modelos de chat/sessão: separação de Agent Host, Agents Window, provedores, estados e checkpoints. Útil como referência para CAP-02/12/14/16/17; não tomar Agent Host como arquitetura-alvo. A régua visual do projeto continua VS Code 1.135.0 conforme decisões vigentes; este snapshot posterior não substitui essa baseline. | XL para adoção de implementação: forte acoplamento a Workbench/Electron, DI, serviços internos e integrações de provedor. Não reconstruir Agent Host nem tomar recursos comerciais/extensões como prova de disponibilidade no repositório aberto. | Repositório declara MIT; cabeçalhos, `ThirdPartyNotices.txt`, extensões e dependências têm de ser verificados individualmente. Preferir conceitos/comportamentos, não importar serviços inteiros. |

**Condições comuns para adoção futura:** (1) SPEC/decisão aprovada identifica necessidade e consumidor dentro do escopo; (2) preservar monólito modular, processo local único, Vite Single Port, casas/contratos, Workbench integrado, Agent Loop único, catálogo/execução de ferramentas sob contratos vigentes, aprovações humanas, provedores nativos, SQLite+JSONL e terminal humano separado da futura ferramenta de terminal do agente; (3) manter distintos histórico visual, histórico protocolar, estado de execução, transcript, contexto, checkpoint, memória, conhecimento recuperado e instruções; não fundi-los num gestor genérico; (4) não tratar busca do Explorer/GitHost ou PTY humano como ferramenta do agente já implementada, nem duplicar catálogo, executor, permissões/aprovações, persistência ou fluxo de sessão; (5) revisar proveniência, licença do arquivo, notices, dependências, manutenção e custo; (6) demonstrar segurança e comportamento por testes reproduzíveis no produto antes de declarar adoção. A licença do repositório não prova licença uniforme de cada arquivo ou dependência.

**Limites da investigação e riscos:** mecanismos foram inspecionados estaticamente e, quando presentes, foram lidos testes-fonte dos projetos externos; isso não é homologação no Agente Window nem comprovação de que o defeito correspondente ocorra no nosso fluxo. Na base atual, a guarda lexical de caminhos não demonstra contenção física contra symlinks/junctions/TOCTOU; a semântica observada de `criar` pode sobrescrever um arquivo regular existente; mapas de aprovação/continuidade são em memória; overwrite, symlink e retomada após reinício não foram reproduzidos end-to-end nesta investigação. São riscos estáticos/pendências de prova, não declaração de falha reproduzida nem de correção. Nenhum teste do produto, benchmark ou Gate D98 decorre deste registro.


## 1.6 Requisitos de segurança e autoridade aprovados após D102 (D103–D108, 2026-10-26)

**Natureza:** regras aprovadas para orientar planejamento e SPECs futuras. Não descrevem o comportamento atual, não reabrem retroativamente homologações e não autorizam correções nesta rodada. Fonte de decisão: `05` D103–D108; matriz de riscos, estado observado e critérios preliminares: `06` e `09`.

- **Autoridade do servidor:** workspace, sessão, modo e permissões são validados no servidor. Campos da interface são solicitações, nunca prova de consentimento. Reaproveitar a arquitetura modular, casas, contratos e serviços existentes antes de propor componentes novos.
- **Escopo da autorização:** permissões futuras vinculam-se à identidade do projeto/workspace e à sessão pertinente. Troca de pasta, identidade de projeto ou sessão requer revalidação e invalidação do que não se aplica.
- **Acesso local:** a política atual de produto é acesso somente no computador instalado. A restrição de rede ao próprio computador é distinta da autorização de cada ferramenta. Acesso por outros computadores da rede local fica como evolução futura, sem implementação aprovada.
- **Ferramentas de arquivo:** `criar` é exclusivo para destino inexistente; `escrever` opera em arquivo existente, considerando a versão/identidade observada. Conflito não migra para sobrescrita automática. SPEC futura deve cobrir atomicidade, falhas parciais, concorrência, symlinks/junctions e Windows.
- **Cancelamento:** cancelar invalida aprovações pendentes; nenhuma aprovação atrasada reativa uma execução. Continuação legítima revalida estado e autorização.
- **Modos e modelo:** Perguntar e Planejar não produzem efeitos de escrita; Agir usa somente ferramentas autorizadas. O backend impõe o modo e valida a correspondência entre modelo escolhido e alvo ativo, sem aceitar credenciais/provedores arbitrários enviados pelo cliente.
- Estes contratos futuros **não alteram o terminal congelado**, o Monolito Modular ou a sequência D98 → 13 → 14 → 15 → M1 → M2 → M3 → M4. F1–F4 bloqueiam a ampliação de autonomia até passarem pelos gates próprios; M8 não adia a investigação de segurança transversal.

**Divergência observada, somente leitura:** `platform/apps/workbench-v2/vite.config.ts` define `server.host` e `preview.host` como `0.0.0.0` e `allowedHosts: true`; isso não impõe nem demonstra acesso local-only (alcance efetivo também depende de rede/firewall/proxy). O script externo `/home/user/restore-code-server.sh`, quando executado, usa `--bind-addr 0.0.0.0:8080 --auth none`; code-server é régua/ambiente, não autenticação nem autorização do produto. O PTY server define `PTY_HOST || 127.0.0.1` como bind padrão, enquanto a configuração efetiva em runtime pode depender do ambiente. Nesta tarefa não foi localizado processo/listener code-server, e nenhuma configuração, porta, bind ou inicialização foi alterada. Detalhamento e limites de verificação em `09`.

## 1.7 Revisão técnica F1–F8 — registro da auditoria anterior à D119 (2026-10-26)

A inspeção estática posterior a D103–D112 e as propostas técnicas daquele momento estão consolidadas em `06`, na seção “Auditoria técnica F1–F8”. D119 aprovou depois somente F1–F4/F5-A/F5-B para implementação nesta missão; F6–F8 continuam fora do escopo. Esta seção não muda as Regras Duras, os contratos D93/D97, o terminal congelado ou a arquitetura. A revisão preserva Monolito Modular/Single Port: autoridade comum na prefeitura e decisões de domínio nas casas existentes, sem microserviço, sem importar interiores privados e sem alterar `explorer-search/{core,server}` sem autorização expressa.

O estado encontrado naquela auditoria era evidência estática; os riscos não haviam sido reproduzidos em runtime. Nenhuma proposta declarava correção, superioridade ou homologação. A validação deve seguir `09` e manter separados os testes do agente, D98/Explorer, code-server de medição e homologação humana.

## 1.8 Alinhamento aprovado F1–F5 (D113–D117, 2026-10-26)

- **Local-only simples:** processo local do mesmo usuário do SO está no perímetro confiável; sem login/autenticação remota/isolamento complexo. Host/Origin rigorosos, CSRF quando aplicável, validação server-side do contexto sessão + workspace + grants. LAN é evolução futura. Separar explicitamente runtime local do produto dos ambientes de teste/proxy; não alterar bind/Host/porta sem mapear Vite, code-server, APIs, serviços e homologações. Acesso local não substitui autorização individual de ferramenta.
- **Política de modos (D114):** `agent`/`edit` → Agir; `ask` → Perguntar (somente leitura); `plan` → Planejar (investigação/plano sem escrita ou efeitos equivalentes). UI envia intenção; servidor impõe política independentemente do modelo. Agent/Edit podem variar só em UX/instruções, nunca em permissões.
- **Alvo de modelo (D115):** seleção explícita é o par inequívoco `(providerId, modelId)` da fonte administrativa Provedores; execução envia esse ID sem fallback. Credenciais ficam no backend. Remoção, desabilitação, indisponibilidade e incompatibilidade são estados distintos e visíveis. A seleção tem de sobreviver à restauração de conversa conforme SPEC aprovada.
- **Auto (D116):** preserva opção do seletor; resolve padrão autoritativo Provedores em `(providerId, modelId)` no começo de cada execução, registra/exibe alvo efetivo e nunca roteia/faz fallback.
- **Desabilitação (D117):** chamada upstream já iniciada pode terminar; cada chamada ainda não iniciada, mesmo no mesmo run, revalida habilitação e é bloqueada, sem troca. Parar, revogação de grants/sessão, segurança e credenciais continuam sob seus contratos superiores.
- **Limite:** são decisões e requisitos de planejamento, não descrição do comportamento atual, SPEC definitiva, teste ou autorização de implementação. A decomposição F5-A/F5-B e evidências ficam em `06`; nenhuma casa, ferramenta, fatia ou iniciativa nova é criada por este registro.

## 1.9 Implementação F1 — estado observado em 2026-10-26 (não homologada)

O estado atual da F1 (D119) está registrado em `03`, `06` e `09`. Vite/preview estão configurados para loopback local; `server/local-boundary.mjs` aplica Host/Origin e rejeição de origens cross-site antes das rotas; grants por sessão/workspace e contexto de Agir são validados no backend; a execução revalida esse contexto no início de cada iteração e imediatamente antes do executor de ferramenta. Verificações disponíveis: typecheck, 43 testes focados, App 46 pass/13 skip, cinco checks HTTP/WebSocket contra Vite com fixtures e recusa de bind externo passaram. A compilação completa abortou por limite de heap Node; Windows, E2E funcional, code-server/PTY standalone e homologação humana não foram verificados. Isto registra evidência parcial, não conclui a frente nem altera seus critérios aprovados.

## 1.10 Diretriz vigente F2/F4 — D121 (2026-10-27)

D121 substitui, somente para F2/F4 desta missão, a barreira absoluta ao workspace e a exigência de resistir a um processo malicioso da mesma conta descritas em registros anteriores. Caminhos relativos usam a raiz do workspace server-side; caminhos absolutos/externos explicitamente solicitados podem ser usados sob permissões normais do sistema operacional. O workspace é base de resolução, não sandbox. Node.js direto e APIs normais do SO; helper nativo permanece desativado. `criar` publica exclusivamente e nunca sobrescreve destino existente. `escrever` exige leitura prévia na execução e compara hash/fingerprint/identidade; conflito observável recusa, arquivo com múltiplos hardlinks é bloqueado e não há fallback parcial. Isto reduz erros acidentais, mas não é CAS universal nem impede TOCTOU contra outro processo que altera caminhos entre syscalls. Esse adversário da mesma conta está fora do modelo aceito e o risco é documentado; nenhum claim de contenção física é permitido. Agir/Edit server-side registrado dispensa confirmações repetitivas para criar/escrever; Perguntar/Planejar são read-only; excluir continua indisponível. O payload de `/api/agir` não escolhe modo/grants; a rota explícita de seleção valida o enum e guarda modo no servidor. F1, F3, F5-A, F5-B e D120 não são enfraquecidos. Linux tem testes; Windows real e homologação humana pendentes.

## 2. Arquitetura em 4 camadas (de `03`)
| Camada | Responsabilidade | Exemplos de componentes | Dependências permitidas |
|---|---|---|---|
| 2.1 Motor / Agent Runtime | acesso ao SO, PTY, filesystem, rede, providers de IA e execução de tools | `PtyHost`, `FileHost`, `AgentRuntimeAdapter`, `ToolExecutionAdapter` | nenhuma dependência de UI |
| 2.2 Workbench | carcaça do produto, layout global, partições, docking, focus, persistência geométrica | `WorkbenchShell`, `LayoutManager`, `PartRegistry`, `ViewContainerCoordinator` | pode consumir contratos da Lógica, nunca detalhes de Runtime |
| 2.3 Lógica / Backend do Workbench | regras de negócio, orquestração de sessões, comandos, estados e adaptação entre Workbench e Runtime | `TerminalService`, `ExplorerService`, `ChatSessionService`, `CommandRegistry` | pode falar com contratos do Runtime e notificar o Workbench |
| 2.4 Interface Visual | renderização e interação com o usuário | `TerminalPanel`, `ExplorerTree`, `ChatPanel`, `Titlebar`, `AuxiliaryBar` | só consome estado/comandos da Lógica e do Workbench |

## Regra principal de dependência
A dependência desce nesta ordem:

`Visual -> Workbench -> Lógica -> Runtime`

É proibido:
- UI importar detalhes internos do Runtime;
- Runtime conhecer componentes de UI;
- um subsistema acessar estado interno de outro sem passar por serviço/contrato;
- camadas pularem contratos para “ganhar velocidade”.

## 2.1 Modularização — diagnóstico verificado (2026-10-13; decisão consolidada na §2.2 em 2026-10-14)
> **Pedido do dono:** confirmar se a arquitetura está sendo construída em **módulos separados, com responsabilidades bem definidas e baixo acoplamento** (ex.: mexer no terminal deve afetar **só** o terminal; o mesmo princípio para sessões e demais componentes). **Resposta honesta: parcialmente** — a direção está certa e comprovada em um subsistema, mas **ainda não é o padrão de todo o código**.

**O que já está no padrão (comprovado no código em 13/10):**
- `modules/explorer-search` é um **módulo de verdade**: `contract.ts` (fronteira congelada em 2026-09-20) + `index.ts` (barrel único) + **teste automático de fronteira** (`__tests__/frontier.test.ts`) + 32 arquivos de teste. Auditoria de 13/10: **nenhuma violação** — nada fora do módulo importa `core/`/`ui/`/`server/` diretamente, e o `App.tsx` importa o módulo **uma única vez** pelo barrel.
- O terminal já tem o **backend como pacote separado**: `platform/services/pty-server` (com `package.json`/`tsconfig` próprios).

**O que ainda NÃO está no padrão:**
- **`App.tsx` — 2.247 linhas** — é a "cola" central do sistema: 22 imports de `domain/`, 12 de `components/`, 5 de `shell/`; contém, por exemplo, a **sincronização sessão → terminal** (`fetch('/api/pty/cwd')`). Hoje, mexer nessa sincronização toca o mesmo arquivo que mexe em sessões/chat.
- Chat/sessões, provedores e editor ainda vivem em **pastas por tipo** (`components/`, `domain/`, `server/`), não como módulos com contrato/fronteira próprios.

**Rumo DECIDIDO (2026-10-14 — D68/D69/D70, detalhe na §2.2):** espalhar a receita do explorer-search (contrato + barrel + teste de fronteira) aos próximos módulos e encolher o `App.tsx` até a **composição fina (~200 linhas)**. A ordem é a das próprias fatias: **Provedores (08) → Chat (09) → Agente (10, novo) → Editor + Personalizações (11) → Terminal (12 — endereço congelado, exige ordem) → Sessões + Command Center + Navegador (13)** (**numeração de 14/10, pré-D95** — mapa vigente no `06` Parte 3). **Nada foi alterado no código.**

## 2.2 Arquitetura oficial — Monolito Modular ("Condomínio") — D68/D69/D70 (2026-10-14)

> **Decisão do dono (2026-10-14).** Vocabulário criado na conversa com a IA colaboradora (Meta, 14/10). **Não é microserviço e nem "tudo num arquivo só"** — é uma casa grande com cômodos separados: manutenção isolada sem a complexidade de rede/debug dos microserviços.

### Vocabulário oficial (dicionário — D76)

> Esta tabela é a **tradução oficial**: qualquer inteligência, pessoa ou máquina que abrir a documentação entende cada termo **sem ter participado da conversa**. O apelido de alto nível anda SEMPRE acompanhado do nome técnico.

| Termo | Em palavras simples | Equivalente técnico | Exemplo no nosso código |
|---|---|---|---|
| **Condomínio** | O projeto inteiro | a aplicação | `agente_window` |
| **Bairro** | Grupo de casas que trabalham juntas; **bairro não importa bairro** | agrupamento de módulos isolado | 1 Workbench sem IA · 2 Inteligência · 3 Ponte · 4 Agent Host · 5 Extensões |
| **Casa** | Cômodo que pode ser trocado sem quebrar o resto | módulo com **estado + contrato (porta) + teste próprio** | `modules/explorer-search` (exemplo que funciona — 0 violações) |
| **Móvel** | Peça só visual, mora dentro de uma casa | componente de interface sem estado próprio | `WorkspaceSwitcher` (móvel da Casa do Command Center) |
| **Corredor** | Só junta casas; não guarda nada | composição/layout sem estado | Titlebar |
| **Síndico** | Só cola as partes (meta: ~200 linhas) | arquivo de composição (wiring) | `src/App.tsx` (hoje: 2.247 linhas — a ser encolhido) |
| **Prefeitura** | Serviços centrais que todas as casas usam | serviços compartilhados (no MVP: a "caderneta") | `domain/shellCommandRegistry.ts` |
| **Prédio** | Processo separado; um cai e o outro fica de pé | processo do sistema operacional | MVP: 1 prédio · Robusto: 5 prédios (referências: `arquivo_morto/referencias/vs-code-1.135/01_os_cinco_predios.md`) |

**Quem pode falar com quem (a regra de uma olhada):**
- **Casa** → fala com outra casa **só pela porta** (`index.ts`); o resto da casa é privado.
- **Bairro** → **não** importa outro bairro; o Bairro 1, em especial, **funciona sem IA**.
- **Móvel** → mora dentro de **uma** casa; não tem estado próprio e não fala com outras casas.
- **Corredor** → só posiciona; **não** guarda estado nem regra de negócio.

**Critério "Casa ou Móvel?"** (para não exagerar e virar micropedaço): é **CASA** se tem estado + contrato + pode ser trocada + teste próprio. Senão, é **MÓVEL**.

### A língua em três lugares (D76) — para o projeto se explicar sozinho
O nome de alto nível existe para o dono orquestrar. Para que **ninguém** dependa de ter lido uma conversa, cada termo vive em **três lugares**:
1. **Dicionário** — esta tabela (+ resumo no `01 §0.1`);
2. **Pastas do código** — `src/bairros/<n>-<nome>/casas/<casa>/…` (estrutura abaixo);
3. **Cartão de visita por casa** — um README **curto** dentro da pasta da casa ("eu sou a casa X; só me chame pela porta `index.ts`"), criado **na migração da casa** (D69), nunca em arqueologia no fim.

**Regra do registro:** todo termo novo que o dono nomear numa conversa entra neste dicionário — senão a língua se perde.

**Apelidos (não oficiais — registrados por fidelidade, D76):** a IA colaboradora usou nomes diferentes para os mesmos bairros na conversa de 14/10 — **Provedores** (= 2 Inteligência) · **Cérebro** (= 3 Ponte) · **Runtime** (= 4 Agent Host). São sinônimos de leitura; a nomenclatura **oficial é a da tabela acima**.

### Estrutura de pastas (destino)
```
src/bairros/
  1-workbench/casas/     → editor, terminal*, explorer-search*, navegador, command-center, sessoes, personalizacoes
  2-inteligencia/casas/  → provedores
  3-ponte/casas/         → chat
  4-agent-host/casas/    → agente (runtime, sessões, ferramentas)
  5-extensoes/casas/     → skills, plugins
```
`*` **Endereço congelado:** área com contrato congelado **não muda de pasta** até a fatia que abrir a área **com ordem expressa do dono** — o **Terminal** muda na **FATIA 16** (pós-D95); o **Explorer/Search** pode ficar onde está (já é casa de verdade). Cada casa por dentro segue o desenho que já funciona: `contract.ts` (porta tipada) · `index.ts` (barrel) · `ui/`, `core/`, `server/` internos.

### Regras do Condomínio (valem para o MVP e para o Robusto)
1. **Bairro 1 não importa Bairro 2–5** — desligue a IA e o Workbench continua um editor completo (igual VS Code sem Copilot). **Verificado por teste automático** (não é promessa).
2. Cada casa tem **porta única**: de fora, **só se importa pelo `index.ts`** — `frontier.test.ts` por casa (modelo já existente).
3. **Mover uma casa por vez**, na fatia que já ia mexer nela ("a casa muda de endereço quando a fatia mexer nela") — sem big-bang, sem renomear por renomear, **sem pasta vazia**.
4. **Apelidos de caminho** (`@workbench/…`, `@ia/…`) para evitar `../../..`.
5. **Um padrão de nome só** (o desenho acima); endereços antigos esvaziam aos poucos — **sem renomear por renomear**.

### Registro das Casas (onde mora cada coisa)
| Casa | Bairro | Endereço hoje | Destino | Situação |
|---|---|---|---|---|
| Explorer/Search | 1 | `modules/explorer-search` | (pode ficar) | ✅ verde — exemplo a copiar |
| Terminal | 1 | `components/terminal` + `services/pty-server` | `1-workbench/casas/terminal` | 🔒 congelado — muda na FATIA 16 (pós-D95; ordem expressa) |
| Provedores | 2 | `components/ProvidersView.tsx` + `server/providers.ts` + lógica no `App.tsx` | `2-inteligencia/casas/provedores` | ✅ **migrado em 15/10 (FATIA 08)** — 1.ª casa extraída; os 3 arquivos antigos foram removidos |
| Chat / Conversa | 3 | `components/ChatPanel.tsx` + casa `bairros/2-inteligencia/casas/conversa` (rota `/api/chat`, fio SSE) | `2-inteligencia/casas/conversa` (destino decidido na SPEC da 09 — D69/D76; era `3-ponte/casas/chat`) | ✅ **nasceu na FATIA 09 (17/10)** — casa extraída + `handleSend` ligado ao provedor; o `ChatPanel.tsx` segue em `components/` |
| Agente (runtime/sessões/ferramentas) | 4 | (novo) | `4-agent-host/casas/…` | 🆕 nasce na FATIA 10 |
| Editor | 1 | `components/EditorArea.tsx` + gestão de abas no `App.tsx` | `1-workbench/casas/editor` | 🟠 nasce na FATIA 15 (pós-D95) |
| Personalizações | 1 | `components/CustomizationsView.tsx` + dados no `App.tsx` | `1-workbench/casas/personalizacoes` | 🟠 nasce na FATIA 14 (pós-D95; era 11) |
| Sessões | 1 | `components/SessionSidebar.tsx` + lógica no `App.tsx` | `1-workbench/casas/sessoes` | 🟠 nasce na FATIA 14 (pós-D95; era 13) |
| Command Center | 1 | `components/TopBar/WorkspaceSwitcher.tsx` + centro da Titlebar | `1-workbench/casas/command-center` | 🟠 nasce na FATIA 17 (pós-D95; com a Pesquisa) |
| Navegador | 1 | `BrowserPreview` dentro de `EditorArea.tsx` | `1-workbench/casas/navegador` | 🟠 nasce na FATIA 20 (pós-D95) — **por último** (padrão `simple-browser`; acordo com a Meta, 14/10) |
| Skills (agnósticas) | 5 | (novo) | `5-extensoes/casas/skills` | 🆕 pós-MVP (padrão `loadSkillsDir` do OpenClaude) |

### Escolhas do MVP — justificativa e "quando revisitar"
| Escolha | Por quê | Quando revisitar |
|---|---|---|
| **Comandos: caderneta simples** | ~30 comandos hoje, 36 linhas de código, já verde. A "central da prefeitura" custa **~10 linhas por comando**; benefício só aparece com 100+ comandos, menus e atalhos | **100+ comandos** ou precisar de atalho/menu/condicional (→ DEBT-ROBUST-01) |
| **Processos: mesmo prédio** | Sem ponte (IPC), debug fácil, é o que já existe; custo aceito **de propósito** | Agente **travar a tela** · **mesma sessão em 2 janelas** · **vários agentes** (→ DEBT-ROBUST-02) |
| **Titlebar = corredor** | Não tem estado próprio; o estado (pasta atual, sessões) fica na Casa do Command Center | Layout ficar complexo (→ DEBT-ROBUST-03) |
| **Bairro 1 independente** | Garante "desligue a IA e o editor continua completo"; protege o que já foi aprovado | Nunca (regra dura; no Robusto ganha DI) |

### Condomínio Robusto (pós-MVP) — quando migrar
> **Regra de ouro:** só migrar **depois do MVP pronto, funcionando e com o dono usando** — e **sempre por decisão do dono**. Nunca no meio do caminho. **Não é outro programa:** as casas, portas, regra do Bairro 1 e testes continuam; muda a **fundação**.

| Dívida | O que muda | Gatilho (o "sinal") | Custo estimado |
|---|---|---|---|
| **DEBT-ROBUST-01** | Comandos: caderneta → CommandsRegistry + MenuRegistry + Keybindings + DI | Querer **atalhos/menus/comandos condicionais** em tudo, ou **100+ comandos** | 3–4 dias |
| **DEBT-ROBUST-02** | Processos: mesmo prédio → **5 prédios** (Main · Workbench · Extension Host · Agent Host (AHP) · Pty Host) | **Tela travar com o agente** · **mesma sessão em 2 janelas** · **vários agentes ao mesmo tempo** | 1–2 semanas |
| **DEBT-ROBUST-03** | Layout: Titlebar corredor → **LayoutService com Parts** (Command Center desmembrado: QuickOpen Ctrl+P · CommandPalette Ctrl+Shift+P · CommandCenter) | **Layout complexo** (esconder/mostrar partes, comandos de layout) | 2–3 dias |
| **DEBT-ROBUST-04** | Bairro 1 ganha **DI** (peças trocáveis via `accessor.get`) | **Trocar uma peça sem quebrar** (ex.: arquivos local ↔ nuvem) | 2 dias |

**O que NUNCA muda (nem no Robusto):** o vocabulário (condomínio/bairro/casa/móvel/corredor/síndico/prédio) · **Bairro 1 funciona sem IA** · cada casa com **porta única** + teste de fronteira · o fluxo de trabalho (conversar → especificar → implementar → testar → reportar).

Contratos por subsistema (runtime do agente, model provider, tools, terminal, filesystem, explorer, editor, layout, sessões de chat, persistência, comandos, tema) → `docs/arquivo_morto/04_CONTRATOS_TECNICOS.md`. ADRs → `docs/arquivo_morto/13_ADRS_E_DECISOES_TECNICAS.md`.

## 3. Contratos congelados do terminal (títulos das 14 regras do `18` — texto completo lá)
- Regra 1: Altura e Redimensionamento via CSS Variable
- Regra 2: Visibilidade Condicional da Sidebar de Abas
- Regra 3: Preservação de Sessões PTY e Instâncias xterm.js
- Regra 4: Fidelidade Visual dos Itens da Aba (Tabs)
- Regra 5: As 5 Abas do Painel
- Regra 6: Maximização Confinada ao `.right-section` (`position: absolute`)
- Regra 7: Prevenção de Tela em Branco e Buffer PTY (`pendingOutputRef` + `fitAllInstancesRef`)
- Regra 8: Arraste de Divisor (Split Sash) via Geometria Absoluta
- Regra 9: Reatividade Dinâmica de Tema (`useTerminalTheme`)
- Regra 10: Preservação de Sessões em Background via `display: contents / none`
- Regra 11: IDs Únicos sem Colisão via crypto.randomUUID()
- Regra 12: Portas Dinâmicas via /api/ports (BUG-02)
- Regra 13: Drag & Drop MVP de Abas (BUG-06)
- Regra 14: Atributos data-pty-* e Classes E2E para Validação (Compatibilidade Testes)

Contratos de layout das Fatias 01/02 (`.right-section` relativo, Titlebar 35 px, Statusbar 22 px, Activity Bar 48 px) também estão no `18 §4`.

## 4. Inventário: o que é obsoleto, morto ou intocável (antigo `28`)
**Data:** 2026-09-29 · **HEAD:** `0e36af4`. Lista do que está (ou esteve) no repositório e **não** deve ser lido, testado, corrigido ou restaurado. Cada linha diz o que é, por que ficou, e o destino decidido.

## 1. `legacy/` — REMOVIDA de propósito
- **O que era:** cópia antiga ("Casa Velha", porta 5173) do ambiente, incl. terminal de referência (`legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`).
- **Decisão do usuário (2026-09-29): apagar do branch principal.** Motivos: nenhum código depende dela (verificado: só um comentário em `platform/services/pty-server/src/vitePlugin.ts` a cita como fonte histórica); IAs sem contexto gastam tokens lendo-a; foi apagada por acidente por specs de fixture rodadas contra a 5174 (`docs/09 - TESTES E AMBIENTE.md §1`); pesa em RAM/inotify.
- **Backup = Git.** Recomendação para o commit de remoção (feito pelo usuário no Windows): `git tag legacy-backup-2026-09 <último commit com legacy/>` antes de `git rm -r legacy/`. Recuperação, se um dia precisar: `git checkout legacy-backup-2026-09 -- legacy/`.
- **Regra para IAs:** não referenciar, não restaurar, não procurar. Docs 00/01/03/03A/05 ainda citam `legacy/` em trechos **históricos** — leia como passado.

## 2. Testes mortos — **INTOCÁVEIS, NÃO MOVER** (decisão do usuário 2026-10-02, Etapa 2 da migração)
| Grupo | Onde | Status | Motivo |
|---|---|---|---|
| 13 E2E mortos | `e2e/sessao_08*`, `sessao_10` (T3–T5), `sessao_11b/c/d/e/f` | pré-existentes; não corrigir, não investigar, **não mover para archive** | fazem parte da área do terminal homologado (`docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO…`); causa em `docs/09 - TESTES E AMBIENTE.md §2.4` |
| 9 unitários falhando | `src/__tests__/TerminalPanel.test.tsx` | pré-existentes no sandbox; **INTOCÁVEL — docs/18** | terminal homologado; só reportar o número no relatório de vitest (701 pass / 9 fail / 16 skip em 2026-10-02) |

Qualquer IA que "consertar", mover ou apagar esses arquivos viola regra dura (`AGENTS.md §4.1`). Destino final só por ordem do usuário (P3/P4 em `docs/03 - ESTADO ATUAL.md`).

## 2b. Arquivados em `docs/arquivo_morto/` (2026-10-02)
Ver `docs/arquivo_morto/README.md`: `FATIA-05_LAYOUT_BYTE_A_BYTE/`, `docs/arquivo_morto/00_COMO_LER_ESTA_DOCUMENTACAO.md`, `docs/arquivo_morto/12-DOCUMENTACAO-VIVA.md`, `docs/arquivo_morto/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/arquivo_morto/15_HANDOFF_PROMPT_PARA_NOVA_IA.md`, histórico do terminal (`ANALISE_…`, `CORRECAO_…`, `comparacao-terminal/`, `historico_migracao_temporaria/`), `platform/apps/workbench-v2/tsc` e `test-results-debug/`. `shot.tmp.mjs` não existia; `legacy/` já não existe.

## 3. Planos superados (histórico, não autoridade)
| Caminho | Substituído por |
|---|---|
| `docs/arquivo_morto/FATIA-05_LAYOUT_BYTE_A_BYTE/05_00…05_06` (plano "Byte a Byte", Side Bar à esquerda, decisões A0.x) | `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` v1.1 (Chassis-Right) + `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/` |
| Rascunhos "docs 21–23" citados em conversas | nunca entraram no repo; `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` os absorveu |
| `docs/arquivo_morto/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/arquivo_morto/15_HANDOFF_PROMPT_PARA_NOVA_IA.md` | ponto de entrada atual é `docs/01 - COMECE AQUI.md` → `docs/arquivo_morto/16-INICIAR-POR-AQUI-IA-EXECUTORA.md` |
| `docs/arquivo_morto/historico_migracao_temporaria/`, `docs/arquivo_morto/comparacao-terminal/`, `docs/arquivo_morto/ANALISE_TERMINAL_CODE_SERVER_CLONE.md`, `docs/arquivo_morto/CORRECAO_REGRESSAO_TERMINAL_V2.md` | histórico do terminal (FATIA-03), congelado em `docs/arquivo_morto/17_COMITE_TERMINAL_FIDELIDADE_2026-09-14.md`/`docs/04 - ARQUITETURA E REGRAS DURAS.md (protocolo completo em docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md)` |

## 4. Arquivos soltos em `platform/apps/workbench-v2/`
| Arquivo | O que é | Destino |
|---|---|---|
| `shot.tmp.mjs` | utilitário de print da FATIA-05 | **não existe mais** (verificado 2026-10-02) |
| `tsc` (arquivo vazio) | resíduo de um `npx tsc` errado | **arquivado** em `docs/arquivo_morto/platform-residuos/`; removido em 2026-10-12 na limpeza de espaço (recuperável no histórico do Git) |
| `probe-terminal.mjs`, `validacao-real-workspace.mjs` | sondas manuais da FATIA-03/04 | não usadas; manter até decisão |
| ~~`manual_evidence/`~~, `test-results/`, `test-results-debug/` | evidências antigas e saída do Playwright | `test-results*` são descartáveis; **`manual_evidence/` foi MOVIDO em 17/10** para `docs/arquivo_morto/manual_evidence_fatia03/` (histórico da FATIA-03 — 18 prints + 1 vídeo da homologação do terminal). Ver `docs/arquivo_morto/INDICE.md`. |
| `Data Nesta` (se aparecer no `ls`) | não é arquivo — artefato de exibição | ignorar |

## 5. Fora do repositório (só no sandbox / uploads do usuário)
- `/home/user/uploads/APRENDIZADOS_REGRAS_INTERACAO_ARENA_VSCODE_WORKSPACE.txt` → incorporado em `docs/01 - COMECE AQUI.md §3`.
- `/home/user/uploads/meu_documento.txt` (aprovação do Gate 0, decisões a–g) → incorporado em `docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §2` e `docs/07 - HISTORICO.md`.
- `/home/user/uploads/05_00_relatorio_validacao_pre_fase.md` (auditoria externa) → copiado em `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.
- `/home/user/restore-code-server.sh` e o tarball do code-server → ambiente de medição; não fazem parte do produto.
- Prints antes/depois da FATIA-05 viviam em `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1|c2|c3/` (movidos da raiz do repo em 2026-09-29 — a pasta solta `auditoria_05/` na raiz **não deve existir**). Eram versionados (exigidos pelo protocolo Opção C). **Removidos em 2026-10-12 a pedido do usuário para liberar espaço (46 MB); recuperáveis pelo histórico do Git.**

## Fatia 06 consolidada — fronteiras multiplataforma
- `TerminalPanel.tsx` e xterm permanecem intocáveis. O PWD inicial vem de `activeSession.worktreePath ?? activeSession.workspacePath`; a troca em uma sessão viva usa apenas o wiring aditivo `/api/pty/cwd`, que escreve `cd`/`Set-Location` no PTY existente sem recriar a UI do terminal.
- Picker nativo é exclusivamente Windows e roda no servidor por `powershell.exe -STA`, usando COM `IFileOpenDialog` com `FOS_PICKFOLDERS`; Provedores não importam nem chamam código Windows.
- Em sistemas sem picker, caminho manual oferece autocomplete por `GET /api/fs/list?path=` (somente diretórios reais, ordenados) e a confirmação passa por `POST /api/workspaces/validate`: `realpath`, existência e diretório. Nunca confiar apenas no input do navegador.
- `providers.json` não contém `apiKey`; OpenAI/Gemini usam apenas status das env vars e Ollama guarda somente `baseUrl` HTTP(S).

- A troca de workspace em sessão existente usa identidade explícita `{ sessionId, path }`; nunca há “sessão ativa global” no backend. UI coordena persistência, `/fs/workspace` e `/api/pty/cwd`, com compensação para o caminho anterior se uma etapa falhar.

## 1.6 Implementação técnica F2 — snapshot histórico pré-D121 (2026-10-26; D119)

> Conteúdo arquivado para rastreabilidade. D121 desativou a arquitetura nativa descrita e alterou o critério de acesso; não é descrição do estado vigente. Ver §1.10.

- Investigação prévia e decisão de implementação estão registradas em `06`, antes da adoção do helper. A fronteira é addon N-API C++ integrado no mesmo processo do Workbench; não cria serviço, servidor, porta ou processo auxiliar.
- No Linux, um descritor raiz fixado e `openat2` com `RESOLVE_BENEATH`, `RESOLVE_NO_SYMLINKS`, `RESOLVE_NO_MAGICLINKS` e `RESOLVE_NO_XDEV` confinem leitura/listagem/busca/criação/escrita. A enumeração usa descritor de diretório e não segue symlink; criação exclusiva usa `renameat2(RENAME_NOREPLACE)`. O addon falha fechado se a syscall não existir/for bloqueada.
- Exclusão/lixeira permanece bloqueada porque o fluxo anterior usava paths e não fechava TOCTOU. Windows/macOS não geram addon no script de build e o loader marca indisponível (há somente um stub-fonte opcional); sem fallback path-based e sem declarar a garantia testada. Nenhum teste real Windows foi executado; junctions/reparse points e Windows seguem pendentes.
- Limites conhecidos: operação síncrona N-API; staging substitui inode com modo 0600 (não preserva ACL/modo); `fsync` do diretório/durabilidade após queda não prometidos. F4 ainda deve validar versão observada antes de permitir escrita; não confundir o recheck de inode F2 com CAS de conteúdo.
- Evidência parcial, não homologação: build helper Linux, typecheck e 5 suítes focadas 38/38 passaram (22 testes nos quatro arquivos F2 e 16 de rota); worker concorrente alternou diretório real/symlink durante read/create/write e sentinelas fora permaneceram intactas. Commit parcial `f850fc5`. Cobertura de teste integral da SPEC e teste real Windows ainda faltam. Até então, falhas ficam bloqueadas e nenhuma alegação de segurança Windows é permitida.
