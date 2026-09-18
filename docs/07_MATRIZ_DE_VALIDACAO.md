# 07 — MATRIZ DE VALIDAÇÃO

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
