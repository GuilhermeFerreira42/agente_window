# Arquitetura da documentação (Context Engineering) — 2026-10-02

## Árvore

```
agente_window/
│
├── AGENTS.md            ← REGRAS. Primeiro arquivo que toda IA lê (53 linhas)
├── CLAUDE.md            ← só "@AGENTS.md" (atalho para o Claude Code)
├── .cursorrules         ← só aponta para AGENTS.md (atalho para o Cursor)
├── PROJECT-STATE.md     ← ONDE A OBRA PAROU (placar, HEAD, pendências, próximo passo)
├── DECISIONS.md         ← DECISÕES FECHADAS (D1–D25, A0.x, O13/O14) — não reabrir
├── CHANGELOG.md         ← HISTÓRICO resumido (o que mudou, por data)
│
├── docs/                ← só 6 arquivos OPERACIONAIS (como testar, como homologar, como trabalhar)
│   ├── 00_COMECE_AQUI.md                         (ponteiro: "vá para AGENTS.md")
│   ├── 07_MATRIZ_DE_VALIDACAO.md                 (o que cada fatia precisa provar)
│   ├── 08_CRITERIOS_DE_HOMOLOGACAO.md            (quando algo está "pronto")
│   ├── 26_MAPA_SUITE_E2E_E_AMBIENTE_DE_TESTES.md (receita dos testes, 5174 × 5175, reseed)
│   ├── 27_REGRAS_DE_TRABALHO_COM_IA.md           (como a IA deve se comportar com você)
│   └── 28_INVENTARIO_OBSOLETOS_E_NAO_USAR.md     (lista do que é lixo/intocável)
│
├── memory-bank/         ← MEMÓRIA do projeto: lida sob demanda, nunca inteira
│   ├── README.md                                 (este arquivo)
│   ├── architecture/    (21 arquivos) — como o sistema é construído
│   │   ├── 03_ARQUITETURA_EXECUTAVEL.md
│   │   ├── 04_CONTRATOS_TECNICOS.md
│   │   ├── 13_ADRS_E_DECISOES_TECNICAS.md
│   │   ├── 16-INICIAR-POR-AQUI-IA-EXECUTORA.md
│   │   ├── 17_COMITE_TERMINAL_FIDELIDADE_2026-09-14.md
│   │   ├── 18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md  (terminal intocável)
│   │   └── historico_homologacao/               (provas das homologações antigas)
│   ├── planning/        (2 arquivos) — planos, guardados como histórico
│   │   ├── 05_BACKLOG_MESTRE.md
│   │   └── 24_PLANO_FATIA-05_CHASSIS_RIGHT.md   (v1.4, Fatia 5 encerrada)
│   ├── context/         (290 arquivos) — pesquisa: raspagens do VS Code, auditorias, prints
│   │   ├── 01_TERMINAL/ … 10_EXPLORER_COORDINATOR/   (engenharia reversa por área, A–I)
│   │   ├── FATIA-04_VIDEO_COMPLETO/             (vídeo da Fatia 4 + raspagem 04_17)
│   │   ├── FATIA-05_LAYOUT/                     (Gate 0, raspagem 05_01, auditoria_05 c5.1…c5.8 com prints)
│   │   └── referencias_visuais/                 (imagens de referência)
│   └── archive/         (60 arquivos) — superado; guardado, não apagado
│       ├── README.md                            (explica cada item e por que saiu)
│       ├── docs/                                (00_COMO_LER, 01, 02, 03A, 06, 09, 10, 11 Kanban,
│       │                                         12 Viva, 14, 15, 25, CHECKLIST, README, histórico do terminal)
│       ├── FATIA-05_LAYOUT_BYTE_A_BYTE/         (plano antigo da Fatia 5)
│       └── platform-residuos/                   (tsc vazio, test-results-debug)
│
├── context/
│   └── raw/             ← artefatos BRUTOS de pesquisa futura (ex.: raspagem do chat para a Fatia 6)
│
└── platform/            ← o CÓDIGO (apps/workbench-v2). Não mudou nada na migração.
```

## Como funciona

**Ideia central:** a IA tem "memória curta" (o contexto). Antes, ela precisava ler 373 arquivos para saber o que fazer e se perdia. Agora existem **4 camadas**, da mais lida para a menos lida:

1. **Sempre lido (raiz):** `AGENTS.md` é curto de propósito — só regras que a IA não consegue descobrir olhando o código (o que não tocar, como rodar, como falar com você). `CLAUDE.md` e `.cursorrules` existem só para que ferramentas diferentes (Claude Code, Cursor) achem o mesmo arquivo.
2. **Lido no começo de cada tarefa (raiz):** `PROJECT-STATE.md` diz onde paramos; `DECISIONS.md` evita rediscutir o que já foi decidido; `CHANGELOG.md` conta o que mudou.
3. **Lido só quando precisa (`docs/` + `memory-bank/`):** `docs/` ficou só com o "manual de operação" (testes, homologação, regras de trabalho). `memory-bank/` é a estante: arquitetura, planos, pesquisa e prints — a IA abre só a gaveta da tarefa atual.
4. **Nunca lido por padrão (`archive/`, `context/raw/`):** histórico e material bruto. Está lá para auditoria, não para orientar decisões.

**Regras de manutenção:**
- Mudou o estado da obra → atualizar `PROJECT-STATE.md` e `CHANGELOG.md` (não criar doc novo).
- Tomou decisão nova → uma linha no fim de `DECISIONS.md`, com data.
- Documento ficou velho → vai para `memory-bank/archive/` com `git mv` (nunca apagar).
- Pesquisa nova (raspagem, HTML capturado) → `context/raw/`; só vira regra se for promovida para `DECISIONS.md`.
- Se código e documento discordarem, **o código manda** — mas a divergência deve ser reportada.
