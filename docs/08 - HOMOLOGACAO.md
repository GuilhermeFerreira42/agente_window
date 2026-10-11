# 08 - HOMOLOGACAO (do humano)

> **Para você, não para a IA.** Aqui não entra comando de terminal nem detalhe de teste — isso é o `09`. Parte A = o que cada fatia precisa provar (antigo `07`). Parte B = quando uma entrega está "pronta" (antigo `08`).
> Regra de sempre: **homologação = você no Windows real (5174), com prints/vídeo**. Teste verde da IA não homologa.

## Como homologar uma fatia em 5 passos
1. Peça o servidor 5174 de pé e abra no Windows.
2. Confira os itens da Parte A da fatia (e as medidas que a IA citou no `03`).
3. Compare com o VS Code real (régua: vscode.dev / 8080 / prints em `arquivo_morto/engenharia_reversa/`).
4. Rode o seu roteiro manual (F5, trocar sessão, maximizar/restaurar, terminal, Search, SCM, drag & drop).
5. Diga "homologada" ou liste o que falhou. A IA registra no `03` e no `07`.

---

## Gate atual — homologação manual da 06.4a no Windows

A 06.4b só pode começar depois que este roteiro passar no Windows real, porta 5174:

1. **Pasta sem Git:** criar sessão apontando para uma pasta comum; confirmar que abre sem criar Git, branch, cópia ou worktree.
2. **Pasta com Git:** criar sessão apontando diretamente para um repositório; confirmar que continua na pasta original e não cria branch/worktree no fluxo padrão.
3. **Terminal:** em cada sessão, executar `pwd` e confirmar o caminho direto da pasta escolhida.
4. **Troca de sessão:** alternar entre as duas sessões e confirmar que Explorer, Search e SCM passam a usar a raiz da sessão ativa.
5. **F5:** recarregar e confirmar que sessões, pasta ativa e raízes corretas voltam sem duplicação.
6. **Recentes:** abrir novamente o seletor e confirmar as pastas em recentes, sem duplicatas e na ordem mais recente.
7. **Exclusão segura:** excluir uma sessão e confirmar que a pasta real permanece intacta; não pode apagar arquivos do usuário nem criar/remover worktree ou branch.

**Passou:** todos os sete itens funcionam. **Falhou:** anotar item, pasta e comportamento observado. Até o usuário declarar “06.4a homologada”, o próximo passo continua bloqueado.

# PARTE A — O que cada coisa precisa provar (antigo 07 — Matriz de Validação)
## Objetivo
Definir como cada subsistema e cada onda do backlog serão validados, com prioridade para typecheck, testes focados, probes e E2E real.

## Sequência padrão de validação
1. typecheck do escopo alterado;
2. testes unitários/integrados do subsistema tocado;
3. probe técnico ou script de sanidade quando existir;
4. E2E do fluxo principal e do fluxo de borda alterado;
5. build completo apenas em integração ampliada, homologação ou release.

## Matriz por subsistema

| ID | Subsistema | Cenário | Resultado esperado | Método principal | Gate |
|---|---|---|---|---|---|
| VAL-TERM-01 | Terminal | abrir novo terminal | instância criada com shell, foco e output inicial | probe + E2E | bloqueante |
| VAL-TERM-02 | Terminal | split do terminal | duas instâncias operáveis no mesmo grupo | E2E real | bloqueante |
| VAL-TERM-03 | Terminal | maximizar/restaurar | painel muda de modo e retorna sem perder conteúdo | E2E real | bloqueante |
| VAL-TERM-04 | Terminal | digitar nos dois lados do split | entrada roteada para a instância focada | E2E real | bloqueante |
| VAL-TERM-05 | Terminal | comando `clear` | viewport limpa sem quebrar a sessão | E2E real | bloqueante |
| VAL-TERM-06 | Terminal | trocar de sessão e voltar | estado visual e vínculo correto por sessão | teste focado + E2E | bloqueante |
| VAL-EXP-01 | Explorer | expandir pasta | children carregados sob demanda | teste integração + E2E | bloqueante |
| VAL-EXP-02 | Explorer | abrir arquivo | aba/visualização correta é aberta | E2E real | bloqueante |
| VAL-EXP-03 | Explorer | evento externo de disco | árvore atualiza sem reload manual | teste integração | alta |
| VAL-FS-01 | Filesystem | salvar arquivo | escrita atômica e conteúdo persistido | teste integração | bloqueante |
| VAL-FS-02 | Filesystem | concorrência de escrita | lock evita corrupção | teste focado | alta |
| VAL-CHAT-01 | Chat | enviar prompt | turno inicia e resposta começa a aparecer em streaming | E2E + logs | bloqueante |
| VAL-CHAT-02 | Chat | tool pending | ferramenta fica pendente até aprovação/rejeição | teste focado + E2E | bloqueante |
| VAL-CHAT-03 | Chat | restaurar sessão | histórico, rascunho e anexos coerentes por sessão | teste focado | alta |
| VAL-WB-01 | Workbench | toggle de painéis | layout redistribui espaço sem travar a UI | E2E real | bloqueante |
| VAL-WB-02 | Workbench | resize manual | dimensões persistem e são respeitadas após reload | E2E real | alta |
| VAL-WB-03 | Workbench | split da área central | grupos/abas mantêm estado e foco corretos | E2E real | alta |
| VAL-CMD-01 | Commands | executar comando global | ação dispara pelo registro central, não por lógica inline | teste focado | média |
| VAL-THEME-01 | Theme | alternar tema | tokens visuais mudam sem hard reload | teste focado + inspeção visual | média |
| VAL-INT-01 | Integração | explorer -> editor | arquivo aberto via explorer reflete seleção central | E2E real | alta |
| VAL-INT-02 | Integração | chat -> tools -> terminal/filesystem | fluxo de ferramenta respeita gates e contratos | E2E real | alta |

## Gates não funcionais

| ID | Métrica | Target | Método |
|---|---|---|---|
| RNF-VAL-01 | responsividade de input | resposta visual em até 16ms nas interações principais | profiler / medição focada |
| RNF-VAL-02 | latência de bridge runtime | round-trip simples até 50ms no ambiente local de desenvolvimento | timestamps de request/response |
| RNF-VAL-03 | estabilidade de layout | sem perda de estado em reload controlado | E2E + persistência |
| RNF-VAL-04 | integridade de I/O | zero escrita parcial em falha simulada | teste de integração |
| RNF-VAL-05 | tema | zero cor crítica hardcoded nos componentes de sistema | revisão + teste automatizado quando disponível |

## Critério de passagem por fatia
Uma fatia passa quando:
- todos os testes bloqueantes da fatia passam;
- nenhuma regressão crítica é detectada nos fluxos adjacentes;
- o relato final informa o que foi testado e o que não foi testado.

## Casos mínimos obrigatórios para o terminal
Os seguintes casos devem existir antes de considerar o Terminal liberado:
- abrir terminal;
- maximizar;
- restaurar;
- dividir em split;
- digitar em ambos os painéis;
- executar `clear`;
- trocar de sessão e voltar;
- relatar se sobrou qualquer "sujeira" visual ou de estado.

---
# PARTE B — Quando está pronto (antigo 08 — Critérios de Homologação)
## Objetivo
Definir quando uma entrega pode ser apresentada como pronta para aceite funcional, sem depender de interpretação subjetiva.

## Gate de homologação da documentação
Antes de liberar implementação ampla, `docs/01` a `09` precisam estar coerentes com o código (cumprido em 2026-10-03).

## Gate de homologação da implementação futura
Uma entrega de código só pode ser homologada quando:
1. a fatia pertence ao backlog aprovado;
2. os contratos impactados foram respeitados;
3. os testes bloqueantes da fatia passaram;
4. o comportamento observado bate com a documentação e com a referência do VS Code quando aplicável;
5. não existe bug blocker aberto no fluxo principal;
6. o relato da execução identifica claramente o que ficou pendente.

## Script mínimo de aceite funcional por subsistema

| Subsistema | Pergunta de aceite | Evidência mínima |
|---|---|---|
| Workbench | layout abre, alterna painéis e persiste estado? | E2E e gravação do estado restaurado |
| Terminal | abre, divide, aceita input e preserva coerência por sessão? | E2E real + sem sujeira visual |
| Explorer | abre árvore, expande pasta e abre arquivo? | E2E + leitura do arquivo |
| Filesystem | salva com atomicidade e reage a mudanças externas? | teste integração |
| Chat | responde em streaming e respeita gate de ferramenta? | E2E + log de tool pending/aprovado |
| Editor/Browser | abas e grupos centrais funcionam sem quebrar foco? | E2E |
| Commands | comandos e menus disparam comportamento correto? | teste focado + smoke manual |
| Theme | troca visual ocorre via tokens e sem hardcode indevido? | inspeção + teste |

## Critérios de rejeição imediata
A entrega deve ser rejeitada se ocorrer qualquer um dos itens abaixo:
- comportamento fora do escopo aprovado;
- desacoplamento quebrado entre camadas;
- terminal fake onde o backlog exigir PTY real;
- regressão crítica de sessão, persistência ou foco;
- documentação e código divergindo sem registro da decisão;
- validação omitida ou inconclusiva sem aviso explícito.

## Critério de aceite final da V1
A V1 só pode ser declarada pronta quando:
- todos os P0 do escopo estiverem entregues;
- a matriz de validação não tiver falhas bloqueantes abertas;
- o plano de deploy tiver sido exercitado em ambiente de staging;
- existir smoke test pós-deploy executável;
- o runbook operacional estiver publicado.
