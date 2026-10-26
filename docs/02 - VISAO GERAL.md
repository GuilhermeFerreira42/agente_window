# 02 - VISAO GERAL — Agente Window

> Leitura: 2.º arquivo (depois do `01`). Curto de propósito: o que é o projeto, com que é feito e onde está cada coisa. Detalhe técnico no `04`; estado no `03`.

## 1. O que é — Identidade do Produto (90 % / 10 %)
O **Agente Window** é construído sob uma proporção clara de fidelidade:
- **90 % Réplica Fiel da "Agents Window" do VS Code** (**projeto de referência oficial — D66, 2026-10-13**; é a fonte da verdade das funcionalidades): centro com chat, lista de sessões, landing page, fluxo de escolha de pasta, menus e comandos. A régua de medição e fidelidade é o **VS Code Server (porta 8080)** e o VS Code real.
- **10 % Modificado por Decisão de Engenharia:** chassi lateral à direita com terminal integrado e Explorer avançado + página de Provedores com experiência rica inspirada no **Cline** (+ referências que o dono indicar ao longo do avanço).
- **O que É a Agents Window (pesquisa 2026-10-13):** recurso real do VS Code — prévia na **1.115** (abr/2026), **Stable na 1.120**, **Agent Host + protocolo aberto AHP** nas **1.129/1.130** (jul/2026: processo dedicado, sessões que sobrevivem à janela, múltiplos clientes, worktrees) e consolidação na **1.135/1.136** (set/2026). **A infraestrutura de bastidor (Agent Host/protocolo) NÃO será reproduzida** — reproduzimos comportamento visível + interface, com backend próprio mais simples.
- **Régua fixada (D71, 2026-10-14): VS Code 1.135** — versão de referência para fidelidade (comportamento + visual), homologada pelo dono. Versões **posteriores** (1.136+) são consultadas apenas como **refinamento futuro** — nunca para contradizer a 1.135.
- Base em React + Vite em `platform/apps/workbench-v2/`. Monorepo npm em `platform/`. Idioma do time: PT-BR simples; UI em inglês (fiel ao VS Code).

### 1.1 Objetivo final do produto
O **Agente Window** deverá ser um ambiente de desenvolvimento assistido por inteligência artificial, extensível e independente de provedor, capaz de executar tarefas complexas de engenharia de software com **autonomia controlada**. Deverá auxiliar o usuário ao longo de todo o ciclo de desenvolvimento de projetos de software: investigação, compreensão, planejamento, documentação, implementação, testes, manutenção e evolução.

Para isso, o sistema deverá oferecer ferramentas reais, memória persistente, recuperação inteligente de informações, gestão de contexto e continuidade de tarefas. A qualidade do raciocínio também depende do modelo utilizado: o harness deverá fornecer infraestrutura adequada, **sem prometer desempenho idêntico entre modelos diferentes**.

### 1.2 Como interpretar esta visão
Esta seção descreve o **objetivo final aprovado** para o produto. Ela não afirma que todas as capacidades estejam disponíveis hoje, nem substitui o roadmap, as SPECs, as decisões vigentes ou as autorizações de trabalho.

- **Objetivo final:** resultado que o produto pretende alcançar, descrito nesta seção.
- **Funcionalidade planejada:** trabalho que aparece no roadmap ou em uma SPEC; estar planejado não significa que sua implementação esteja autorizada ou concluída.
- **Funcionalidade implementada:** comportamento existente no produto. Sua existência, por si só, não significa que tenha sido testado ou homologado.
- **Testada ou homologada:** condição que exige as evidências e o aceite definidos nos documentos de testes e homologação; não deve ser presumida a partir da descrição de uma capacidade.

O estado real, as próximas fases e os critérios de validação continuam nos documentos canônicos correspondentes (`03`, `06`, `08` e `09`). Discussão, descrição ou planejamento não autorizam alterações no projeto.

### 1.3 Capacidades finais aprovadas — V1.0
As capacidades abaixo descrevem o que o produto deverá permitir ao usuário. São objetivos funcionais, não afirmações de implementação atual nem autorização para antecipar fatias.

| ID | Capacidade | Descrição funcional |
|---|---|---|
| CAP-01 | Exploração de projetos grandes | Investigar repositórios extensos, localizar arquivos e relações relevantes e apresentar conclusões apoiadas em evidências verificáveis. |
| CAP-02 | Compreensão arquitetural | Explicar a organização do projeto, seus módulos, dependências, fluxos e limites arquiteturais com base no que foi encontrado. |
| CAP-03 | Produção de documentação técnica | Criar e atualizar documentação técnica útil, coerente com os requisitos, decisões e evidências do projeto. |
| CAP-04 | Ferramentas completas de arquivos | Explorar arquivos e pastas e, quando autorizado, criar, ler, editar, mover ou excluir arquivos, respeitando o escopo, as permissões e as aprovações aplicáveis. |
| CAP-05 | Terminal e execução de comandos | Executar comandos e inspecionar seus resultados de forma controlada. A capacidade final não antecipa a Fatia 13 nem altera o escopo vigente do MVP (D65/D72). |
| CAP-06 | Git e versionamento | Consultar o estado do repositório, comparar alterações e apoiar operações de versionamento autorizadas, sempre dentro das regras e limites aprovados para cada fase; isso não encerra dívidas técnicas automaticamente. |
| CAP-07 | Pesquisa externa e consulta a fontes | Consultar fontes externas pertinentes, distinguir informação encontrada de inferência e apresentar referências que permitam verificar as conclusões. |
| CAP-08 | Memória persistente | Preservar informações úteis entre sessões de modo controlado, para apoiar o trabalho futuro sem confundi-las com o estado atual do projeto. |
| CAP-09 | Gestão inteligente de contexto | Selecionar e organizar o contexto relevante para a tarefa, considerando limites e prioridades, sem tratar toda informação como igualmente importante. |
| CAP-10 | Recuperação inteligente de informações | Localizar e trazer de volta informações relevantes de documentos, histórico e materiais do projeto, distinguindo recuperação de memória persistente e de estado de execução. |
| CAP-11 | Planejamento de tarefas | Transformar objetivos em etapas compreensíveis, identificando dependências, riscos e critérios de conclusão antes da execução quando apropriado. |
| CAP-12 | Execução autônoma controlada | Realizar sequências de trabalho com autonomia dentro do escopo autorizado, interrompendo-se para pedir aprovação quando a ação ou decisão exigir intervenção humana. |
| CAP-13 | Segurança e permissões | Respeitar limites de acesso e autorização, explicar ações relevantes e evitar que a autonomia ultrapasse as permissões concedidas. |
| CAP-14 | Suporte a múltiplos provedores e modelos | Permitir o uso de provedores e modelos diferentes sem dependência de um único fornecedor, comunicando suas capacidades e limitações. Isso não implica paridade entre modelos nem revoga D93: o modo Agir depende do canal nativo de ferramentas do modelo/provedor. |
| CAP-15 | Skills, plugins e extensibilidade | Permitir ampliar as capacidades por skills, plugins e integrações compatíveis, com controles de permissão e segurança. A visão final não amplia o escopo definido para a Fatia 14 nem antecipa extensões futuras. |
| CAP-16 | Continuidade de execuções interrompidas | Retomar tarefas interrompidas recuperando o contexto e o estado persistido, verificando primeiro a situação real do projeto e sem repetir automaticamente operações potencialmente perigosas. |
| CAP-17 | Interface de desenvolvimento integrada | Oferecer uma experiência integrada para conversar, compreender o projeto e acompanhar o trabalho de desenvolvimento, preservando a identidade visual e funcional definida para o produto. |
| CAP-18 | Diagnóstico e observabilidade | Tornar o comportamento e os problemas relevantes compreensíveis e rastreáveis. A Central de Diagnósticos permanente continua futura e depende de SPEC própria. |
| CAP-19 | Verificação técnica e testes | Apoiar a escolha e a execução de verificações pertinentes e relatar com clareza o que passou, falhou, não foi executado ou permanece inconclusivo. |
| CAP-20 | Assistência integral ao ciclo de desenvolvimento de software | Auxiliar no ciclo completo de desenvolvimento de **qualquer projeto de software**. Isso inclui o próprio repositório do Agente Window como um exemplo, não como função especial de autodesenvolvimento. |

### 1.4 Cenários de aceitação da visão V1.0
Estes cenários descrevem resultados observáveis esperados da visão final. São referências para avaliar a cobertura da V1.0; não declaram que os cenários já tenham sido implementados, testados ou homologados.

1. **Compreensão de projetos grandes** — O agente investiga repositórios extensos, identifica arquitetura, dependências e comportamentos, produzindo documentação fundamentada em evidências verificáveis.
2. **Desenvolvimento de funcionalidades** — O agente recebe requisitos ou uma SPEC aprovada, planeja a implementação, executa alterações autorizadas, realiza testes e apresenta resultados.
3. **Continuidade de tarefas** — O agente recupera o contexto e o estado persistido de atividades interrompidas, verifica a situação real do projeto e evita repetir automaticamente operações perigosas.
4. **Extensibilidade** — O usuário consegue instalar, configurar e utilizar skills, plugins e integrações, respeitando compatibilidade, permissões e segurança.
5. **Desenvolvimento colaborativo de projetos complexos** — O usuário consegue conduzir projetos de longa duração por meio de conversas com o agente, discutindo requisitos, avaliando alternativas arquiteturais, aprovando decisões, produzindo documentação e executando implementações autorizadas. O agente distingue atividades consultivas de executivas: discussão ou planejamento não autorizam modificar o projeto.

### 1.5 Princípios arquiteturais gerais
São objetivos que devem orientar a evolução do produto, **não escolhas antecipadas de bibliotecas, bancos de dados, provedores ou outras tecnologias**. Devem ser aplicados respeitando a arquitetura e as decisões já aprovadas, inclusive o Monolito Modular (D68–D70).

- Independência de provedores e modelos.
- Persistência confiável.
- Separação entre memória, recuperação de informações e estado de execução.
- Segurança e autonomia controlada.
- Escalabilidade para projetos grandes.
- Observabilidade e rastreabilidade.
- Extensibilidade.
- Verificabilidade dos resultados.
- Preservação das decisões e aprovações humanas.

### 1.6 Diretriz estratégica de paridade e desempenho — D101

**O Agente Window deverá evoluir até oferecer capacidades funcionais comparáveis às dos agentes de programação avançados utilizados como referência, buscando desempenho, eficiência, estabilidade e experiência de uso equivalentes ou superiores nos cenários em que isso puder ser demonstrado por avaliações reproduzíveis.**

OpenClaude, OpenCode, Qwen Code, DeepSeek Harness e VS Code são fontes de conhecimento técnico, não frameworks a incorporar integralmente. A arquitetura existente deve ser preservada sempre que permitir alcançar o escopo aprovado. A meta não autoriza copiar código, criar serviços redundantes, adicionar dependências sem necessidade nem implementar todas as funcionalidades das referências. A visão CAP-01–CAP-20 e seus cinco cenários, aprovados em D100, continuam a delimitar o produto; qualquer capacidade nova exige decisão específica.

Paridade ou superioridade só podem ser declaradas **por cenário avaliado**, com testes comparativos reproduzíveis e condições equivalentes relevantes (modelo/provedor, hardware, projeto/tamanho da fixture, tarefa, versão e configuração). A qualidade do modelo/provedor deve ser separada do overhead do Agente Window. Toda funcionalidade relevante requer critérios verificáveis de comportamento, correção, segurança, desempenho, estabilidade, eficiência, continuidade e experiência, definidos por SPEC conforme o escopo. A metodologia e os estados de resultado ficam em `docs/09`; limites quantitativos serão propostos somente depois de medições. Concluir uma fatia não comprova paridade global nem desempenho superior.

### 1.7 Rastreabilidade da visão até as entregas (auditoria 2026-10-25)

As CAP-01–CAP-20 e os cinco cenários acima continuam sendo **a definição canônica dos objetivos**, não a declaração de que existe uma fatia implementadora aprovada para cada CAP. A **matriz CAP → cobertura homologada/parcial → fatia/iniciativa candidata → lacuna de SPEC → evidência de aceite** está em `06`, seção **“Matriz de rastreabilidade da visão V1.0”**. O `06` identifica explicitamente itens sem destino formal; `08` orienta a avaliação humana por cenário; `09 §3.10` define os protocolos técnicos de comparação D101.

Não confundir a fidelidade de referência VS Code 1.135 (D66/D71, 90%/10% como identidade de produto) com comprovação quantitativa das 20 capacidades. Uma fatia de UI ou uma função humana no Workbench não constitui, automaticamente, uma ferramenta autônoma do agente. A visão **permanece aprovada**; a cobertura de implementação integral **ainda necessita de decisões e SPECs próprias**.

## 2. Com o que é feito (stack)
- **npm** (não pnpm). Vite 5 + React + TypeScript strict. Playwright E2E (`npx playwright test`; `npm run e2e` não existe). Vitest unitário.
- **Single Port**: um Vite serve app + `/fs/*` + `/git/*` + PTY (`singlePort.ts`, `vite-plugin-pty.ts`). Sem `.env`, caminhos relativos.
- **5174 = repo real** (`npx vite --host 0.0.0.0 --port 5174 --strictPort`), **5175 = fixture** (`FS_TEST_ROOT=file:///tmp/explorer-fs-fixture npx vite --host 0.0.0.0 --port 5175 --strictPort`).
- Terminal: PTY real (`platform/services/pty-server`) + xterm.js. Editor anexo: Monaco. Tema: tokens `--vscode-*` em `src/styles/theme.css` (dark + light).

## 3. Onde está cada coisa
| O quê | Onde |
|---|---|
| Código do app | `platform/apps/workbench-v2/src/` — `App.tsx` (wiring), `shell/` (Activity Bar, Side Bar, sash, DnD, painel de views), `components/` (AuxiliaryBar = editor anexo, terminal **intocável**, Titlebar, Chat), `modules/explorer-search/` (`core/` e `server/` **congelados (exceção D98 limitada à investigação autorizada após validação documental; mudança permanente exige SPEC e aprovação — ver `05`)**; `ui/` montagem), `styles/theme.css` (tokens dark/light), `domain/` (layout/persistência) |
| Serviço PTY | `platform/services/pty-server/` (**intocável**) |
| Testes | `src/__tests__/` (Vitest) · `e2e/sessao_*.spec.ts` (Playwright) · `run-antiregressao.sh` (bateria com reseed) |
| Documentação ativa | `docs/01…09` (este conjunto canônico) |
| Matriz de Dívidas Técnicas | `docs/06 - PROXIMAS FASES E DIVIDAS.md` |
| Raspagens, auditorias e pesquisa | `docs/arquivo_morto/engenharia_reversa/` e `docs/arquivo_morto/pesquisa_bruta/` (card de permissões, provedores estilo Cline, streaming/input, mockup raspado da Agents Window). A antiga `referencias_visuais/` foi removida na limpeza de 2026-10-12 (recuperável no histórico do Git) |
| Carta de contexto para IA colaboradora | Fora do repositório (D67) — entregue pelo dono; contém o índice curado do `arquivo_morto` com a regra "história ≠ norma" |
| Notas de alinhamento (fora do repo) | `/home/user/registro_alinhamento/` — ex.: nota DEBT-23 p/ a FATIA 13 (21/10). Movida de `uploads/` em 21/10 a pedido do dono |
| Stubs E2E + carta PERF (fora do repo) | Stubs: `/home/user/uploads/` (`stub_provider.cjs` 4599 + `stub_agir.cjs` 4610). Carta PERF: `/home/user/notas_temporarias/carta_contexto_chat_arena_bug_desempenho.md`. Caminhos externos ao repositório; a carta não está em `uploads/` no workspace observado. |
| Docs antigos (referência, não autoridade) | `docs/arquivo_morto/` |

## 4. Fatias do projeto (Roadmap canônico Spec-Driven — **renumeração vigente: D95 de 2026-10-19** (antes D64) — detalhe no `06` Parte 3)
- **01 Fundação:** setup do monorepo, Vite, single port.
- **02 Shell base:** casca da aplicação, Titlebar, Statusbar.
- **03 Terminal PTY real:** PTY e xterm integrados.
- **04 Motor:** Explorer, Search, SCM e Monaco Editor anexo.
- **05 Chassis-Right:** Activity Bar e Side Bar à direita, DnD de views, Outline/Timeline, maximizar editor (100 % homologada).
- **06 Workspace & Chat base:** persistência, Empty State 768 px, base de sessões (implementada).
- **07 Destravar** ✅ 15/10 · **08 Conectar** ✅ 17/10 (D89) · **09 Conversar** ✅ 18/10 (D92) · **10 Agir** ✅ 19/10 (D94) — **MVP FECHADO** · **11 Teto+Continuar+Config** ✅ 21/10 (D96) · **12 DELETE-micro** ✅ 21/10 (D97).
- **PERF (micro, D98)** — desempenho SCM/Explorer em pastas gigantes — entre a 12 e a 13, sem renumerar. Confirmação técnica autorizada em princípio; aguarda validação desta atualização documental antes de iniciar. Nenhuma mudança permanente de produção sem SPEC e aprovação.
- **13 Terminal-para-o-agente** (SPEC 2G + decisão específica de DEBT-23 na abertura) · **14 Barra+Personalizações+skills** (SPEC 2H) · **15 Janela única de abas** (SPEC 2I, abre por DEBT-12) · **16 Terminal 2.0 visual** · **17 Refinamentos** · **18–20** (painéis, sessões isoladas, navegador/polimento). A numeração e a ordem canônicas não mudam nesta consolidação.
- **Futuro aprovado, sem autorização de implementação:** Central de Diagnósticos permanente (SPEC própria pendente); planejamento inicial de contexto **M1–M4**. **M5–M8** ficam para planejamento posterior. Os rótulos M não são números oficiais de fatia.

> Tabela de conversão antigo→novo e o detalhe de cada fatia: `06 - PROXIMAS FASES E DIVIDAS.md` (Partes 2 e 3).

## Estrutura documental: canônicos e relatórios
A raiz `docs/` mantém **exatamente 9 arquivos físicos canônicos numerados, de `01` a `09`**. Toda a Matriz de Dívidas Técnicas e o Roadmap detalhado vivem no `docs/06 - PROXIMAS FASES E DIVIDAS.md`. Relatórios de execução, auditorias e evidências ficam em `docs/arquivo_morto/`.
