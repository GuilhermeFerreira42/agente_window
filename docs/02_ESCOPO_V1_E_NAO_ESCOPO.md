# 02 — ESCOPO V1 E NÃO-ESCOPO

## Identidade do produto
**AGENTE WINDOW** é um workbench modular, inspirado no comportamento do VS Code, para colaboração entre usuário e agentes de IA em um ambiente de trabalho web com terminal, chat, arquivos, editor, layout persistente e backend de execução real.

## Declaração de visão
Entregar um workbench web de alta fidelidade comportamental ao VS Code, com arquitetura modular que permita trocar runtime, provider e tools sem reconstruir a carcaça da plataforma.

## Objetivo desta versão
A V1 deve entregar um produto utilizável de ponta a ponta para:
- abrir o workbench;
- navegar por arquivos e contexto de trabalho;
- conversar com um agente;
- operar terminal real com PTY;
- manipular layout, painéis e sessões;
- manter fidelidade comportamental nos fluxos principais.

## Escopo funcional da V1

| Área | Prioridade | Resultado obrigatório da V1 |
|---|---|---|
| Workbench Shell | P0 | layout principal com titlebar, sidebars, área central, painel inferior, persistência de visibilidade e resize |
| Terminal | P0 | terminal real com PTY, múltiplas instâncias, split, foco, clear, maximize/restore, persistência coerente por sessão |
| Explorer + Filesystem | P0 | árvore de arquivos navegável, abertura de arquivos, refresh, eventos de disco, operações seguras de I/O |
| Chat / Sessões | P0 | sessões de agente, streaming, histórico por sessão, gate de ferramentas e artefatos básicos |
| Comandos / Menus | P0 | command palette, comandos globais e menus contextuais coerentes com estado da interface |
| Tema / Tokens | P0 | tokens de tema sem cores fixas hardcoded, troca de tema e coerência visual transversal |
| Editor / Browser | P1 | editor e visualizadores centrais com abas, split e integração com explorer/chat |
| Operação e Deploy | P1 | pipeline mínima de release, smoke test, rollback e observabilidade básica |

## Restrições obrigatórias de produto
1. A fidelidade buscada é **de comportamento e ergonomia**, não apenas de aparência.
2. O terminal é subsistema piloto, mas a arquitetura deve servir ao workbench inteiro.
3. Runtime, model provider e skill/tool layer devem ser trocáveis.
4. A plataforma deve convergir para **uma única instalação em raiz única**, mesmo que o baseline atual ainda esteja dividido.
5. A execução deve acontecer em fatias pequenas, com validação antes da próxima etapa.
6. A documentação canônica vem antes da implementação.

## Público-alvo inicial

| Segmento | Dor principal | Prioridade |
|---|---|---|
| desenvolvedor individual | quer uma janela única para editar, conversar com IA e executar ações sem trocar de ferramenta | P0 |
| operador técnico/orquestrador | precisa controlar o que a IA faz, validar etapas e manter rastreabilidade | P0 |
| equipe pequena de produto/engenharia | quer reaproveitar arquitetura modular e validar fluxos rapidamente | P1 |

## Plataformas e ambiente alvo da V1
- **Prioridade de uso**: Windows 11 + navegador Chromium.
- **Ambiente de desenvolvimento atual**: workspace Linux com preview web.
- **Meta arquitetural**: experiência estável em navegador moderno com backend Node.js.

## Não-escopo desta etapa
Não faz parte da V1:
- marketplace completo de extensões de terceiros;
- sincronização multi-dispositivo em nuvem no nível do VS Code completo;
- suporte pleno a todos os SOs e navegadores antes de estabilizar Windows + Chromium;
- engine própria de compilação, Git interno ou LSP proprietário;
- autonomia irrestrita da IA sem gate humano;
- refazer tudo greenfield só por elegância documental.

## Decisões de produto já congeladas
- `docs/` é a linha principal de continuidade.
- `docs-1/` só entra como apoio já absorvido nesta consolidação.
- O workbench deve ser modular em quatro camadas: Runtime, Workbench, Lógica, Visual.
- O produto deve permitir troca futura de runtime e provider.
- O método de construção é humano no loop, com IA executora e gates frequentes.

## Critérios para considerar a V1 pronta para implementação
A documentação é considerada suficiente para destravar código quando:
- o escopo acima estiver aprovado sem ambiguidades;
- a arquitetura executável estiver fechada;
- os contratos técnicos estiverem formalizados;
- o backlog estiver ordenado;
- a matriz de validação estiver cobrindo todos os fluxos críticos;
- o plano para a IA executora estiver publicado nesta pasta.
