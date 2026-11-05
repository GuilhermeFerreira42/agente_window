# ÍNDICE DO ARQUIVO MORTO — o que existe aqui dentro e para que serve

> **Para quem chegou agora (humano ou IA):** esta pasta guarda **história**, não norma. As regras vivas são `docs/01` a `docs/09`. **Nada aqui é autoridade** — se um arquivo daqui contradiz um dos 9 canônicos, **os canônicos mandam**.
> **Regra dura:** não apagar, não restaurar para `docs/` e não "corrigir" nada daqui sem **ordem expressa do dono**.
> **Criado em 2026-10-17** porque a pasta já tinha 45 itens e ninguém sabia o que era o quê. Este índice é o mapa; ele **não substitui** o `28_INVENTARIO_OBSOLETOS`, complementa.

## Como usar este índice
1. Procure pelo **assunto** (seção 2) ou pelo **nome do arquivo** (seção 3).
2. Leia a coluna **"serve quando…"** — ela diz o que você ganha abrindo.
3. Se for investigar algo do passado, comece por **`28_INVENTARIO_OBSOLETOS_E_NAO_USAR.md`** (lista o que **não** se usa) e por este índice (diz o que **existe**).

---

## 1. Pastas (8) — o que cada uma contém

| Pasta | Tamanho / arquivos | O que é | Serve quando… | Confiabilidade |
|---|---|---|---|---|
| **`engenharia_reversa/`** | 948 KB · 114 | A maior e mais útil: **raspagem do VS Code real** organizada por área — `01_TERMINAL`, `02_LEFT_SIDEBAR`, `03_RIGHT_SIDEBAR`, `04_CENTER_CHAT`, `05_EDITOR_CODE_BROWSER`, `06_FILESYSTEM_IO`, `07_COMMAND_MENU`, `08_THEME_TOKEN`, `09_WORKBENCH_LAYOUT`, `10_EXPLORER_COORDINATOR` + `FATIA-04_VIDEO_COMPLETO`, `FATIA-05_LAYOUT` e `referencias_visuais/` (prints numerados) | Você precisa **replicar fielmente** um comportamento do VS Code e quer a evidência original (print, medida, trecho) | **Alta para fatos visuais**; é onde a régua dos 90 % foi construída |
| **`pesquisa_bruta/`** | 3,3 MB · 32 | Material **bruto** de pesquisa por fatia: `fatia-06-chat` (inclui `PERMISSOES.md`), `fatia-07-input`, `fatia-08-streaming`, `fatia-09-tools`, `fatia-10-polish`, `personalizacoes/` (mockup interativo de 3 MB) | Vai **desenhar** as fatias 09 (Conversar) ou 10 (Agir) e quer o material que embasou o plano | Média — pesquisa, não decisão |
| **`referencias/`** | 60 KB · 13 | Notas curadas de projetos de terceiros: `arquitetura-limpa/` (dependency-cruiser, ts-arch), `cline/`, `openclaude/`, `vs-code-1.135/` | Precisa da fonte de uma decisão de arquitetura ou de como o Cline resolve algo | Média-alta — referência externa |
| **`manual_evidence_fatia03/`** | 3,5 MB · 21 | **Movida para cá em 17/10** (estava em `platform/apps/workbench-v2/`): prova **manual** da homologação do terminal — 18 prints + 1 vídeo (`.webm`) de 08/09/2026, com `summary.json` de cada rodada. Os resumos provam, com número, que ao fechar/reabrir o terminal **o processo é o mesmo** (`pidBefore 21550 → pidAfter 21550`) e que **não houve erro de página** | Alguém questiona "o terminal foi mesmo homologado?" ou precisa da evidência **visual** da FATIA 03 | **Alta** — evidência de homologação |
| **`historico_homologacao/`** | 28 KB · 6 | Registros de homologação de fases anteriores | Quer a trilha de quando/como cada fase foi aceita | Alta |
| **`historico_migracao_temporaria/`** | 128 KB · 26 | Restos da migração da documentação (inclui um `engenharia_reversa/` antigo) | Investigando **por que** a documentação mudou de forma em out/2026 | Média |
| **`FATIA-05_LAYOUT_BYTE_A_BYTE/`** | 56 KB · 7 | O plano **original** de layout da FATIA 05 (Side Bar à esquerda) — **superado** pelo plano "Chassis-Right" | Quer entender a **mudança de rumo** do layout (por que a Side Bar foi para a direita) | Baixa — plano abandonado |
| **`comparacao-terminal/`** | 12 KB · 1 | Comparação do terminal com o original | Dúvida sobre fidelidade do terminal | Média |

---

## 2. Assunto → onde olhar (atalho para investigação)

| Você quer saber sobre… | Vá para |
|---|---|
| **Terminal** (referência, correções, homologação, evidência visual) | `engenharia_reversa/01_TERMINAL/` · `17_COMITE_TERMINAL_FIDELIDADE…` · `ANALISE_TERMINAL_CODE_SERVER_CLONE.md` · `CORRECAO_REGRESSAO_TERMINAL_V2.md` · `comparacao-terminal/` · **`manual_evidence_fatia03/`** |
| **Layout / chassi / Side Bar à direita** | `FATIA-05_LAYOUT_BYTE_A_BYTE/` (plano antigo) · `24_PLANO_FATIA-05_CHASSIS_RIGHT.md` (o que valeu) · `engenharia_reversa/09_WORKBENCH_LAYOUT/` |
| **Chat / centro / landing** | `engenharia_reversa/04_CENTER_CHAT/` · `pesquisa_bruta/fatia-06-chat/` |
| **Editor / browser / abas** | `engenharia_reversa/05_EDITOR_CODE_BROWSER/` |
| **Regras de trabalho com IA** | `27_REGRAS_DE_TRABALHO_COM_IA.md` (versão antiga; hoje vale `docs/01 §3`) |
| **O que está obsoleto e não deve ser lido** | `28_INVENTARIO_OBSOLETOS_E_NAO_USAR.md` |
| **Como a documentação chegou no formato atual** | `README_archive_2026-10-02.md` · `README_memory-bank_2026-10-02.md` · `AGENTS_2026-10-02.md` · `PROJECT-STATE_2026-10-02.md` · `DECISIONS_2026-10-02.md` · `CHANGELOG_2026-10-02.md` |
| **Histórico de decisões antigas (pré-D1)** | `13_ADRS_E_DECISOES_TECNICAS.md` · `DECISIONS_2026-10-02.md` |
| **Escopo V1 / não escopo original** | `02_ESCOPO_V1_E_NAO_ESCOPO.md` |

---

## 3. Arquivos soltos na raiz (37) — o que é cada um

### 3.1 Os canônicos **antigos** (`00` a `18`) — a documentação antes da virada para 9 arquivos (2026-10-02)
> Estes foram **substituídos** por `docs/01`–`docs/09`. Guardados para auditoria: mostram como as regras nasceram.

| Arquivo | O que era | Substituído por |
|---|---|---|
| `00_COMECE_AQUI.md` · `00_COMO_LER_ESTA_DOCUMENTACAO.md` | porta de entrada antiga | `docs/01` |
| `01_FONTE_DA_VERDADE.md` | hierarquia de autoridade antiga | `docs/01` |
| `02_ESCOPO_V1_E_NAO_ESCOPO.md` | escopo original da V1 | `docs/02` |
| `03_ARQUITETURA_EXECUTAVEL.md` · `03A_FLUXOS_ARQUITETURAIS_E_EXEMPLOS.md` | arquitetura detalhada de setembro | `docs/04` |
| `04_CONTRATOS_TECNICOS.md` | contratos das peças | `docs/04` |
| `05_BACKLOG_MESTRE.md` | backlog de antes da renumeração | `docs/06` |
| `06_PLANO_DE_IMPLANTACAO_PARA_IA.md` | plano de implantação | `docs/06` |
| `07_MATRIZ_DE_VALIDACAO.md` · `08_CRITERIOS_DE_HOMOLOGACAO.md` | o que cada fase prova | `docs/08` (Partes A e B) |
| `09_PLANO_DE_DEPLOY_E_OPERACAO.md` | deploy (nunca usado neste estágio) | — |
| `10_GOVERNANCA_E_EVOLUCAO.md` | governança | `docs/01 §3` |
| `11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md` | quadro Kanban do processo | — |
| `12-DOCUMENTACAO-VIVA.md` | **diário detalhado de set/out (1.700 linhas)** | `docs/07` (resumido) — **útil para arqueologia** |
| `13_ADRS_E_DECISOES_TECNICAS.md` | decisões técnicas antigas | `docs/05` |
| `14_PRIMEIRA_FATIA_RECOMENDADA.md` · `15_HANDOFF_PROMPT_PARA_NOVA_IA.md` · `16-INICIAR-POR-AQUI-IA-EXECUTORA.md` | instruções de partida para IAs | `docs/01` |
| `17_COMITE_TERMINAL_FIDELIDADE_2026-09-14.md` · `18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md` | **comitê e protocolo do terminal** — ainda citados como origem da regra "terminal é intocável" | `docs/04` (regra dura) |

### 3.2 Planos de fase já concluídos
| Arquivo | O que é |
|---|---|
| `24_PLANO_FATIA-05_CHASSIS_RIGHT.md` (40 KB) | **plano que valeu** para o chassi à direita — referência rica de medidas e decisões da FATIA 05 |
| `25_ESTADO_ATUAL_E_PENDENCIAS_FATIA-05.md` (36 KB) | estado ao fim da FATIA 05 |
| `26_MAPA_SUITE_E2E_E_AMBIENTE_DE_TESTES.md` (20 KB) | mapa antigo da suíte | 
| `27_REGRAS_DE_TRABALHO_COM_IA.md` | regras de trabalho (base do `docs/01 §3`) |
| `28_INVENTARIO_OBSOLETOS_E_NAO_USAR.md` | **lista do que não usar** (legacy removida, testes mortos intocáveis) |
| `relatorio_fatia06_final.md` | relatório de fechamento da FATIA 06 |
| `CHECKLIST.md` | checklist de então |

### 3.3 Migração de 2026-10-02 (a "Engenharia de Contexto" que foi revertida)
`AGENTS_2026-10-02.md` · `PROJECT-STATE_2026-10-02.md` · `DECISIONS_2026-10-02.md` · `CHANGELOG_2026-10-02.md` · `README_archive_2026-10-02.md` · `README_memory-bank_2026-10-02.md`
> Contam **por que** a documentação passou por arquivos em inglês e depois voltou para `docs/` numerada (`docs/01 §0`).

---

## 4. Regras de convivência com esta pasta
1. **História ≠ norma.** Nunca citar arquivo daqui como regra vigente.
2. **Nada de "restaurar"** — se um canônico precisa de algo que está aqui, **copie o conteúdo** para o canônico, com nota de origem; não mova o arquivo de volta.
3. **Ao acrescentar algo aqui**, adicione a linha na tabela correspondente **neste índice** e registre a entrada do dia no `docs/07`.
4. **Arquivos grandes** (`12-DOCUMENTACAO-VIVA`, mockup de personalizações) são **pesados de ler** — prefira o resumo nos canônicos e abra o original só para arqueologia pontual.
5. **Evidência de homologação não se joga fora** (`manual_evidence_fatia03/`, `historico_homologacao/`) — é o que sustenta "isto foi aprovado".
