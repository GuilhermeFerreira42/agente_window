# 16 — INICIAR POR AQUI: IA EXECUTORA

Este é o único arquivo de entrada que a próxima IA deve receber no início do trabalho.

Se você é a IA executora deste projeto, siga exatamente este protocolo.

## 1. Seu papel
Você não está entrando para rediscutir o projeto do zero.
Você está entrando para continuar a implementação do **AGENTE WINDOW** com base na documentação canônica já consolidada.

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

Depois disso, leia os pacotes modulares apenas se eles forem necessários para a fatia escolhida.

### 3.1 🔴 LEITURA OBRIGATÓRIA DA FRENTE VIGENTE — FATIA-04 (Explorer + Editor em anexo + Browser com IA)

A frente autorizada hoje é a **FATIA-04**, e ela **já possui documentação completa própria**. Portanto, **antes de qualquer implementação da FATIA-04**, leia nesta ordem:

| # | Arquivo | Para quê |
|---|---|---|
| 1 | `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_00_INDICE_E_RESUMO_VIDEO.md` | índice, resumo do vídeo de 8m35s e legenda de evidências |
| 2 | `.../04_15_PLANO_IMPLEMENTACAO_SUBFATIAS.md` | **plano oficial**: 9 sub-fatias (4.1 a 4.9), ordem obrigatória, arquivos-alvo, contratos, testes e DoD |
| 3 | `.../04_13_CRITERIOS_ACEITE_VALIDACAO.md` | **checklist de homologação**: A (vídeo) + B (14 itens anti-regressão do `docs/18`) |
| 4 | `.../04_01` a `.../04_07` | especificação por subsistema: inventor visual, comportamento, menu de contexto, DnD/upload/download, editor em anexo, search e **browser com acesso da IA ao HTML (crítico)** |
| 5 | `.../04_08_REQUISITOS_FUNCIONAIS_RF.md` | RF-01 a RF-34 (cada um com VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO) |
| 6 | `.../04_10_CONTRATOS_TECNICOS_ATUALIZADOS.md` | proposta aditiva dos contratos (`FileSystemPort`, `ExplorerService`, `EditorService`, `SearchService`, `BrowserPort`) |
| 7 | `.../04_11_MAPA_CODIGO_VSCODE_CODE_SERVER.md` | mapa `arquivo:linha` no `microsoft/vscode` main e no `code-server` (zero adivinhação) |
| 8 | `.../04_12_FLUXOS_EVENTOS_MERMAID.md` | 13 fluxos em mermaid |
| 9 | `.../04_14_GAPS_ENTRE_DOC_ATUAL_E_VIDEO.md` | o que faltava na FATIA-04 antiga + **decisões fechadas Q1–Q6** (normativas) |
| 10 | `.../04_16_PROPOSTA_ATUALIZACAO_KANBAN.md` | tabela de sub-fatias que substitui o bloco genérico no `docs/11` |
| — | `.../04_02`, `.../04_03`, `.../04_04`, `.../04_05`, `.../04_06`, `.../04_09` | leitura de apoio conforme a sub-fatia a executar |

**Regras desta frente (decididas em 04_14 §4):**
- Q1 — o **anexo do editor nasce só em `platform/`**; **não** tocar `App.tsx`, `EditorArea.tsx` nem `app.css` do legado (área PROTEGIDA 🟡);
- Q2 — o browser interno roda **no servidor** (Chromium + Playwright/CDP, screencast), não em iframe cross-origin;
- Q3 — “Novo Arquivo” com arquivo selecionado cria **no pai** (padrão VS Code);
- Q4 — **single-root** (multi-root fora de escopo nesta fase);
- Q5 — gravação de browser: **5 min / 200 MB por arquivo, retenção de 7 dias**;
- Q6 — a pasta canônica é `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/` (17 arquivos, `04_00` a `04_16`).

**Ordem de execução obrigatória:** 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.8 → 4.9 (cada sub-fatia só começa com a anterior validada).

Se a fatia exigir fidelidade visual, menus, estados de tela ou comparação de layout, consulte também como apoio:
- `docs/referencias_visuais/README.md`
- `docs/referencias_visuais/TAXONOMIA.md`
- `docs/referencias_visuais/CATALOGO.md`

Essas referências visuais são apoio documental. Em caso de conflito, prevalece a documentação textual canônica de `docs/`.

## 4. O que você deve entender ao final da leitura
Ao terminar a leitura acima, você deve ter entendido claramente:
- o que é o AGENTE WINDOW;
- o que está no escopo e o que está fora do escopo;
- qual é a arquitetura em 4 camadas;
- quais contratos são obrigatórios;
- qual é a ordem de execução aprovada;
- como validar cada fatia;
- qual é a próxima frente autorizada no estado vigente do repositório.

## 5. O que você deve responder antes de começar
Depois da leitura, responda ao usuário com estes cinco blocos, em texto claro:

### A. Resumo do projeto
Explique, com suas palavras, o que é o projeto e qual é o objetivo da fase atual.

### B. Arquitetura entendida
Explique como você entendeu as 4 camadas e os limites entre elas.

### C. Próxima frente que pretende executar
Diga qual é a próxima frente que você pretende executar no estado vigente do repositório.

### D. Arquivos que você espera alterar
Liste os arquivos ou áreas do repositório que você acredita que serão tocados.

### E. Validações que pretende rodar
Diga quais validações pretende executar ao final da fatia.

## 6. Regra de espera obrigatória
Depois de responder os cinco blocos acima, pare.
Não implemente nada ainda.
Espere a confirmação explícita do usuário.

## 7. Estado vigente e próxima frente autorizada
O estado vigente deste repositório **já está após a FATIA-01, FATIA-02 e FATIA-03**.

Portanto:
- não reinicie a execução pela FATIA-01;
- não trate a arquitetura como discussão em aberto;
- use `docs/12_DOCUMENTACAO_VIVA.md` para distinguir estado atual, decisões congeladas e o que ainda está apenas em transição.

A direção arquitetural aprovada para a nova estrutura é:
- container `platform/`;
- `platform/apps/workbench/src/` para a aplicação visual principal;
- `platform/packages/` para contratos, shared, runtime de agente, provider e tools;
- `platform/services/` para serviços operacionais.

A próxima frente funcional alvo é:

**FATIA-04 — Explorador de Arquivos (Explorer)**

Ela deve começar já assumindo `platform/` como estrutura vigente, `legacy/.../VSCodeTerminal.tsx` como terminal estabilizado (não tocar), e sem reabrir discussão arquitetural congelada.

> **A FATIA-04 está ampliada e 100% documentada.** O escopo real desta frente é: **Explorer Completo + Editor em Anexo Lateral + Browser com acesso da IA ao HTML**, dividido em **9 sub-fatias (4.1 a 4.9)**.
> Documento de entrada obrigatório: `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_00_INDICE_E_RESUMO_VIDEO.md`
> Plano de execução: `.../04_15_PLANO_IMPLEMENTACAO_SUBFATIAS.md` · Aceite: `.../04_13_CRITERIOS_ACEITE_VALIDACAO.md`
> Não iniciar a implementação sem ter lido os dois (ver §3.1).

## 8. O que significa a próxima frente desta rodada
Nesta etapa, a IA executora deve assumir que:
- FATIA-01, FATIA-02 e **FATIA-03** já são fatos concluídos no repositório atual;
- o terminal (`VSCodeTerminal.tsx`, `PlatformTerminalBridge.tsx`, `useTerminalTheme.ts` em `legacy/`) está 100% blindado e estabilizado com a resolução dos 5 bugs críticos do vídeo (maximize absoluto no `.right-section`, buffer anti-tela-branca `pendingOutputRef`, sash drag suave via `getBoundingClientRect`, tema dinâmico reativo e preservação de sessão em background via `display: contents/none`); **não tocar sem autorização explícita** (conforme `docs/18`);
- a estrutura vigente já foi materializada em `platform/` e `legacy/`; registros antigos podem mencionar a antiga árvore `src/` na raiz como estado histórico de transição;
- a separação entre interface/workbench, backend/runtime/serviços e camada de IA/provider/tools não é opcional;
- qualquer continuidade rumo à FATIA-04 precisa respeitar essa separação e não pode reintroduzir acoplamento estrutural.

## 9. O que você não deve fazer nesta etapa
Não faça nada disso nesta etapa:
- não reinicie a execução pela FATIA-01 como se o repositório estivesse no estado inicial;
- não reabra a discussão sobre deixar a nova arquitetura solta na raiz;
- não colapse `platform/apps`, `platform/packages` e `platform/services` em uma única massa indiferenciada;
- não tentar implementar o terminal inteiro ao mesmo tempo em que reorganiza todo o sistema sem recorte claro;
- não usar referências visuais para sobrescrever a documentação textual canônica;
- não pule contratos para ganhar velocidade.

## 10. Regras invioláveis
- `docs/` é a fonte principal de verdade.
- Você não deve usar documentação histórica como autoridade acima de `docs/`.
- Você não deve começar por aparência antes da estrutura.
- Você não deve misturar múltiplos subsistemas grandes na mesma fatia sem necessidade explícita.
- Você deve trabalhar com fatias pequenas e paradas frequentes.
- Você deve validar a fatia antes de seguir para a próxima.
- Você deve seguir rigorosamente `docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`, executando o checklist de homologação no navegador real antes de considerar qualquer fatia entregue.
- Você deve priorizar `typecheck`, testes focados, probe e E2E conforme a fatia.
- Você não deve assumir que build completo é obrigatório em toda etapa.

## 11. Regra de parada por dúvida
Se houver lacuna documental, conflito arquitetural ou ambiguidade suficiente para exigir inferência arriscada:
- pare;
- cite o documento ou trecho que ficou insuficiente;
- explique a dúvida de forma objetiva;
- peça confirmação ao usuário antes de continuar.

## 12. Regra final
Seu primeiro objetivo não é codar rápido.
Seu primeiro objetivo é provar que entendeu corretamente a documentação e que consegue executar a próxima frente autorizada sem desviar da arquitetura.
