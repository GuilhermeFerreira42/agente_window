# 16 — INICIAR POR AQUI: IA EXECUTORA

Este é o único arquivo de entrada que a próxima IA deve receber no início do trabalho.

Se você é a IA executora deste projeto, siga exatamente este protocolo.

## 1. Seu papel
Você não está entrando para rediscutir o projeto do zero.
Você está entrando para continuar a implementação do **AGENTE WINDOW** com base na documentação canônica consolidada e na fundação Casa Nova (`platform/apps/workbench-v2/`).

Seu papel é:
- ler a documentação na ordem correta;
- resumir o entendimento para validação humana;
- aguardar confirmação do usuário;
- só então iniciar a próxima frente autorizada de implementação.

## 2. Regra principal
Você **não deve começar a implementar imediatamente**.
Primeiro você deve ler, entender e devolver um resumo claro do que compreendeu.
Depois disso, você deve esperar a confirmação explícita do usuário antes de alterar código.

## 3. Ordem obrigatória de leitura
Leia os arquivos abaixo nesta ordem exata:

1. `docs/00_COMO_LER_ESTA_DOCUMENTACAO.md`
2. `docs/01_FONTE_DA_VERDADE.md`
3. `docs/02_ESCOPO_V1_E_NAO_ESCOPO.md`
4. `docs/03_ARQUITETURA_EXECUTAVEL.md`
5. `docs/03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md`
6. `docs/04_CONTRATOS_TECNICOS.md`
7. `docs/05_BACKLOG_MESTRE.md`
8. `docs/06_PLANO_DE_IMPLANTACAO_PARA_IA.md`
9. `docs/07_MATRIZ_DE_VALIDACAO.md`
10. `docs/11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md`
11. `docs/12_DOCUMENTACAO_VIVA.md`
12. `docs/13_ADRS_E_DECISOES_TECNICAS.md`
13. `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md`
14. `docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md`
15. `docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md` (OBRIGATÓRIO: ler para não quebrar componentes homologados)

### 3.1 Documentação essencial da próxima frente (FATIA-04)
Após os arquivos fundamentais, leia os documentos diretores da **FATIA-04**:
1. `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_00_INDICE_E_RESUMO_VIDEO.md`
2. `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_15_PLANO_IMPLEMENTACAO_SUBFATIAS.md`
3. `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_13_CRITERIOS_ACEITE_VALIDACAO.md`

## 4. O que você deve entender ao final da leitura
Ao terminar a leitura ordenada, você deve ser capaz de responder com segurança:
- o que é o projeto AGENTE WINDOW;
- qual é a fonte primária de verdade e por que ela prevalece sobre memória prévia ou arquivos soltos;
- o que está dentro e o que está expressamente fora do escopo da V1;
- qual é a arquitetura monolítica modular planejada em `platform/` (`apps/workbench-v2`, `packages/`, `services/`);
- quais contratos técnicos já estão congelados e por que não podem ser alterados silenciosamente;
- qual é o fluxo de homologação rigoroso (Playwright E2E e Vitest);
- por que o terminal (`VSCodeTerminal.tsx` / `PlatformTerminalBridge.tsx`) e a Casa Velha (`legacy/`) estão blindados e congelados;
- qual é a próxima frente de implementação autorizada (FATIA-04 sobre a Casa Nova `workbench-v2`).

## 5. O que você deve responder antes de começar
Depois de ler os documentos na ordem estabelecida, apresente ao usuário uma resposta estruturada contendo exatamente estes 5 blocos:

### Bloco A — Resumo do entendimento do projeto
Explique o projeto com suas próprias palavras:
- objetivo do AGENTE WINDOW;
- o que ele é e o que ele não é;
- quais são as premissas inegociáveis.

### Bloco B — Arquitetura e contratos entendidos
Explique a estrutura de pastas e responsabilidades:
- papel de `platform/apps/workbench-v2/`;
- papel de `platform/packages/contracts/` e interfaces compartilhadas;
- papel de `platform/services/` e a blindagem da Casa Velha (`legacy/`);
- os contratos técnicos que você identificou como congelados e intocáveis.

### Bloco C — Próxima frente que você pretende executar
Descreva exatamente a próxima fatia que pretende puxar:
- nome da fatia (**FATIA-04: Explorer Completo + Editor em Anexo Lateral + Browser com acesso da IA ao HTML**);
- escopo específico delimitado;
- o que NÃO será feito nesta fatia para evitar transbordamento de escopo.

### Bloco D — Lista de arquivos que você espera alterar ou criar
Liste:
- arquivos novos previstos;
- arquivos existentes que pretende modificar;
- arquivos explicitamente intocáveis nesta etapa (terminal homologado, contratos congelados, etc.).

### Bloco E — Como você pretende validar a fatia
Descreva a estratégia de teste antes de dar a fatia como concluída:
- testes unitários/integração via Vitest (`npm test`);
- testes E2E automatizados via Playwright (`npx playwright test`);
- verificação visual e responsiva no navegador;
- checagem de não regressão do terminal interativo (Single Port 5174).

## 6. Regra de espera obrigatória
Depois de enviar a resposta com os 5 blocos acima:
- **PARE.**
- **NÃO crie arquivos de código.**
- **NÃO altere arquivos existentes.**
- **NÃO avance para a implementação.**
- Aguarde a resposta do usuário dizendo expressamente que você pode começar.

## 7. Contexto de transição e estado vigente
- **Casa Nova (`platform/apps/workbench-v2/`):** É a base oficial e ativa de desenvolvimento. Roda na porta 5174 em arquitetura modular Single Port com PTY WebSocket integrado.
- **Casa Velha (`legacy/`):** Mantida intacta para paridade histórica e blindada.
- **Terminal Interativo Homologado:** Possui 100% de cobertura nos testes automatizados Playwright (`platform/apps/workbench-v2/e2e/sessao_11_terminal_interactive_v2.spec.ts`), cobrindo abertura sem tela cinza, status PTY `open`, regra de abas (`instances.length > 1`) e digitação/execução real no xterm.
- **Próxima frente oficial:** **FATIA-04** (Explorer Completo + Editor em Anexo Lateral + Browser com acesso da IA ao HTML na Casa Nova).

## 8. Regras invioláveis
- `docs/` é a fonte principal de verdade.
- Nunca misture regras temporárias da infraestrutura do ambiente/sandbox na documentação do produto.
- Você não deve começar por aparência antes da estrutura e contratos.
- Trabalhe com fatias pequenas, testes automatizados e aprovações humanas explícitas.
- Siga rigorosamente `docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`.

## 9. Regra de parada por dúvida
Se houver lacuna documental, conflito arquitetural ou ambiguidade:
- pare;
- cite o documento ou trecho insuficiente;
- explique a dúvida de forma objetiva;
- aguarde orientação antes de prosseguir.
