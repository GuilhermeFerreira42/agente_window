# 14 — PRIMEIRA FATIA RECOMENDADA

## Objetivo
Sugerir a primeira fatia de implementação mais segura para a próxima IA, com baixo risco arquitetural e alto valor estrutural.

## Opções consideradas

| Opção | Vantagem | Risco | Veredito |
|---|---|---|---|
| Começar pelo Terminal real | valida cedo o subsistema piloto | alto acoplamento se a fundação estrutural ainda não estiver pronta | adiar um passo |
| Começar pelo Chat | força runtime/provider/tools | risco alto de espalhar acoplamento antes de estabilizar shell/layout | adiar |
| Começar por convergência estrutural da raiz | reduz drift, prepara contratos e instalação única | entrega visual pequena no curto prazo | recomendada |
| Começar por Workbench Layout puro | dá visibilidade e base geométrica | ainda depende de contratos compartilhados estáveis | quase recomendada |

## Recomendação final
A primeira fatia recomendada é:

### FATIA-01 — Fundação estrutural da raiz única + contratos compartilhados mínimos

## Objetivo funcional
Preparar o repositório para a execução incremental futura, reduzindo o risco de que cada módulo avance em estruturas físicas divergentes.

## Resultado esperado
- uma raiz única reconhecível como alvo futuro;
- espaço comum para contratos compartilhados;
- ponte clara entre frontend atual e `pty-server`;
- impacto zero ou mínimo no comportamento funcional visível;
- typecheck do escopo estrutural tocado.

## Escopo exato da fatia
1. Criar a pasta-base de contratos compartilhados na raiz alvo.
2. Definir onde frontend, runtime e shared vão convergir.
3. Registrar os tipos mínimos reutilizados por múltiplos módulos.
4. Amarrar a nova estrutura sem tentar migrar todos os módulos de uma vez.

## O que NÃO fazer nesta fatia
- não reescrever terminal inteiro;
- não iniciar chat inteiro;
- não migrar todas as telas de uma vez;
- não tentar concluir a instalação única completa nesta única fatia;
- não misturar refatoração estrutural com feature nova ampla.

## Arquivos-alvo prováveis
- `package.json` da raiz futura, se necessário
- pasta compartilhada de tipos/contratos
- arquivos de bootstrap ou aliases mínimos
- documentação viva e Kanban para registrar o avanço

## Contratos associados
- `docs/04_CONTRATOS_TECNICOS.md`
- `docs/03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md`
- pacotes F/I dos módulos que dependem dos contratos novos

## Validação mínima
1. typecheck do escopo tocado;
2. verificação de imports/aliases sem circularidade nova;
3. boot do app sem regressão imediata;
4. relato final da fatia com arquivos alterados e próximos passos.

## Próxima fatia natural após a FATIA-01
### FATIA-02 — Workbench Layout base estabilizado
- toggles de partes
- resize
- persistência geométrica
- maximize/restore

## Alternativa visível, se o objetivo for prova rápida de comportamento
Se você quiser priorizar uma fatia com efeito visual mais perceptível, a alternativa segura é:

### FATIA-01B — Workbench Layout base
Mas mesmo nessa opção, a IA deve respeitar a estrutura de contratos e a arquitetura definida nos docs.
