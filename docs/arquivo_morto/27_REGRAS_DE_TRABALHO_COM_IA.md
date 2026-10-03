> **Nota 2026-10-02 (migração Context Engineering):** fonte da verdade agora é `/AGENTS.md` → `/PROJECT-STATE.md` → `/DECISIONS.md`. Caminhos de docs movidos foram atualizados neste arquivo; referências a `docs/12`/`docs/11` como "docs vivos a atualizar" valem agora para `CHANGELOG.md`/`PROJECT-STATE.md`.

# 27 — REGRAS DE TRABALHO COM IA NESTE PROJETO

**Data:** 2026-09-29 · **Origem:** arquivo `APRENDIZADOS_REGRAS_INTERACAO_ARENA_VSCODE_WORKSPACE.txt` (versão 2026-09-08) que o usuário enviava a cada sessão, **mais** as regras acrescentadas durante as FATIAS 03–05. Antes só existiam fora do repositório; agora são parte da documentação canônica. Em conflito com outro doc, **este e o `memory-bank/planning/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` prevalecem no modo de trabalhar**; a arquitetura continua nos docs 01–04.

---

## A. Contexto humano (por que as coisas são como são)
- O usuário **dita por voz** — as mensagens têm frases soltas e palavras trocadas. Interprete a intenção; em dúvida real, pergunte com opções curtas. Responda em **PT-BR, linguagem simples**, sem jargão desnecessário.
- **Fluxo de entrega:** a IA trabalha no sandbox da Arena; o usuário **baixa o workspace, roda no Windows 11, valida manualmente e faz commit/push no GitHub**. Por isso os hashes dos commits no GitHub **não coincidem** com os citados nos docs; o conteúdo é o mesmo. Referencie commits pela **mensagem**, não pelo hash.
- O sandbox é **recriado a cada mensagem** do usuário (`docs/26 §3`). Só arquivos em `/home/user` sobrevivem.
- Podem existir **outras IAs** trabalhando a partir de clones do GitHub, sem este contexto. **Tudo que for descoberto ou decidido tem de ir para `docs/`** — a conversa não é memória do projeto.
- Homologação de fase = **validação manual do usuário no Windows**, nunca só o teste verde da IA.

## B. Workspace e servidores
1. O workspace é a fonte de verdade. Reinspecione antes de afirmar que algo falta.
2. **Nunca** resetar sessão, apagar arquivos do usuário, restaurar `legacy/` (foi removida de propósito) ou fazer ação irreversível sem ordem explícita.
3. Um `.txt` que é tarball renomeado **não** se lê como texto (ver cabeçalho de `restore-code-server.sh`).
4. Servidores **sempre** via `start_process`, bind `0.0.0.0`. code-server na **8080 com `--auth none`**, abrindo `/home/user/agente_window`; é ambiente de **medição** (régua do VS Code 1.135), não de produção.
5. Não derrubar o 8080 ou o Vite sem necessidade; se derrubar por RAM, avisar e **religar ao final**. Verificar no fim de cada interação se o 8080 está de pé (quando o turno o exigia).
6. Clones grandes e runtimes ficam em `/home/user/.cache` (fora do snapshot), nunca em `/tmp`.
7. **Proibido** buildar VS Code/code-server da fonte (RAM ~1,9 GB).
8. Não "consertar" código para contornar limitação do sandbox — registrar o bloqueio e orientar validação local.

## C. Como reportar
- No **chat**, não em arquivo extra: **verificado / mudou / passou / falhou / falta**. Sem zip, sem relatório automático.
- **Nunca inventar sucesso** de build/teste. Mostrar números reais (ex.: "708/717, 9 pré-existentes").
- Honestidade sobre feito/não feito; não criar helper paralelo escondido para fazer um teste passar.
- Spec E2E **falhando antes** de cada gap (colar a saída), passando depois.
- **Relatório binário + parada** ao fim de cada commit; **aguardar OK** antes do próximo. Após entregar, não iniciar implementação nem propor "próximos passos" por conta própria ("protocolo de espera ativa").
- "Vamos apenas conversar" = **zero** execução de código/comandos que alterem algo; leitura é permitida.

## D. Como validar
- Preferir `npm run typecheck` + testes focados; bateria completa (`memory-bank/planning/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §9`, receita em `docs/26 §3`) **em cada commit** de código da FATIA-05; build completo só ao fechar fase.
- Comandos longos sempre com `timeout`; explicar o que está sendo feito.
- Rollback imediato se teste falhar **após** commit. Quando travar: derrubar todos os processos e recomeçar.
- Flaky conhecido (`docs/26 §4.2`): re-rodar 1× antes de declarar regressão.

## E. Git
- Commit **a cada grupo funcional atômico**, só com typecheck 0 + testes verdes. Exige `git -c user.name="Arena Agent" -c user.email="agent@arena.local" commit …`.
- Passos de "só documentação" não geram commit **salvo ordem** do usuário.
- Conferir perímetro antes de commitar: `git diff --name-only` **não** pode listar `modules/explorer-search/{core,server}/**`, `EditorArea.tsx` (até 5.7), `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, `components/terminal/**`, specs `sessao_11*`.
- Não commitar utilitários temporários (`shot.tmp.mjs`), `test-results/`, prints fora de `auditoria_*/`.

## F. Escopo e arquitetura (resumo operacional; detalhe em `memory-bank/architecture/16-INICIAR-POR-AQUI-IA-EXECUTORA.md`, `memory-bank/architecture/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`, `memory-bank/planning/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §11`)
- Princípio **LEGO**: módulos prontos são **reposicionados**, não reescritos.
- **Intocáveis:** Terminal homologado (`components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server`), contratos congelados (`memory-bank/architecture/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`), `modules/explorer-search/{core,server}/**`, `EditorArea.tsx` (até 5.7).
- `App.tsx` só **wiring aditivo** via barrel único (`src/shell/index.ts` e `modules/explorer-search/index.ts`); `index.ts`/`contract.ts` do módulo **apenas aditivos**; `ui/**` só montagem; **módulo nunca importa do shell**.
- `.env` não existe e não deve existir; npm (não pnpm/yarn); rodar E2E com `npx playwright test` (não há script `npm run e2e`).
- **Inglês só em peças novas/migradas** (lista em `memory-bank/archive/docs/25_ESTADO_ATUAL_E_PENDENCIAS_FATIA-05.md (histórico; estado vivo em PROJECT-STATE.md) §5 O7`). Nada existente é traduzido.
- Nada em `position: fixed`. Recolher container com box = `display: flex/none`; `contents/none` só em wrapper transparente (Regra 10 do `memory-bank/architecture/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`).

## G. Documentação
- Viva em `docs/` (markdown). Atualizar ao fim de cada sub-fase: `CHANGELOG.md` (antigo docs/12, arquivado) (topo cronológico), `PROJECT-STATE.md` (antigo Kanban docs/11, arquivado) (Kanban), `memory-bank/planning/05_BACKLOG_MESTRE.md` (débitos), `PROJECT-STATE.md` (estado), `memory-bank/architecture/16-INICIAR-POR-AQUI-IA-EXECUTORA.md` quando muda o protocolo.
- Sem citar vídeos ou pessoas; sem cor hex (usar tokens `--vscode-*`); medidas só de fontes reais: `04_17`, `05_01`, `05_02`, vscode.dev, 8080. **"Não confie na doc, confie no preview real"**: checar atributos reais no 8080 antes de codar. Prints do Windows do usuário prevalecem sobre o 8080 do sandbox.
- Cada doc novo com **data + HEAD válido + "substitui X"** no cabeçalho. Doc superado recebe aviso de OBSOLETO no topo (não se apaga histórico sem ordem).
- Gaps de fidelidade → `CHANGELOG.md` (antigo docs/12, arquivado) "Débito Técnico do Shell"; pendências herdadas de fases anteriores → backlog `memory-bank/planning/05_BACKLOG_MESTRE.md`, não entram na sub-fase corrente.
- Protocolo **Opção C**: prints antes/depois em `memory-bank/context/FATIA-05_LAYOUT/auditoria_05/c1|c2|c3` provando fidelidade vs. 8080.

## H. Regra final
Em dúvida entre criar artefato / derrubar serviço / assumir algo: **não criar, preservar, reinspecionar, perguntar**. Se surgir imprevisto (conflito de teste, medida nova, erro não previsto): **parar e reportar antes de improvisar**.
