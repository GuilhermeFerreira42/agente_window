# CONTEXTO GERAL — Projeto Agents Window (Réplica)

> **PONTO DE ENTRADA PRINCIPAL.** Se você é uma IA retomar este projeto, leia APENAS este arquivo.
> Ele diz o que é o projeto, onde estamos, o que foi feito, o que falta, e como continuar.
> **NÃO leia** a pasta `ondas_antigas/` — é arquivo histórico, não é necessário para continuar.

---

## 1. O Que É Este Projeto

É uma **réplica funcional** da **"Agents Window"** do VS Code — uma janela de agentes de IA (NÃO é o VS Code comum). A réplica é um app React + TypeScript + Vite que roda no navegador.

- **Original (referência):** `01_original/` — specs do comportamento correto + fontes do VS Code
- **Réplica (código ativo):** `02_replica/` — app React que reproduz o original
- **Validação 1 (completa):** `03_validacao_1/` — auditoria estática (código vs código)
- **Gestão (você está aqui):** `04_gestao_completo/` — contexto, progresso, planos
- **Referências:** `05_referencias/` — libs de terceiros (Monaco, xterm)
- **Histórico visual:** `06_historico_visual/` — prints de bugs e evidências

---

## 2. Histórico Resumido

### Fase 1 — Validação 1 (AUDITORIA ESTÁTICA) ✅ COMPLETA

Uma IA leu o código do original e da réplica, comparou requisito por requisito, e produziu um checklist de conformidade com provas (arquivo:linha). Resultado em `03_validacao_1/`.

### Fase 2 — Implementação das 32 Ondas ✅ COMPLETA

Baseado no relatório da Validação 1, uma IA executou 32 ondas de implementação:
- **Onda 1:** 14 itens de manutenção pós-validação (bugs, features ausentes, CSS)
- **Onda 2:** 6 itens de Sessions List + Filtros + Groups
- **Onda 3:** 12 itens de confirmação (muitos marcados como "FALTA" já existiam)
- **Correções de bugs:** 5 bugs de runtime corrigidos (crash de tela preta, blank screen, etc.)
- **Testes:** 348 testes unitários (Vitest) + 5 testes E2E (Playwright)
- **Build:** TypeScript + Vite build sem erros

Detalhes arquivados em `ondas_antigas/` (NÃO LEIA).

### Fase 3 — Validação 2 (TESTE DINÂMICO) 🔄 EM ANDAMENTO

Transformar a réplica de "casa de fachada" em "produção 100% funcional". São **10 sessões** de trabalho, cada uma com:
- `COMPARACAO.md` — o que o original faz vs o que a réplica faz
- `TAREFA.md` — o que precisa ser implementado
- `TESTE.md` — critérios de teste E2E com Playwright + screenshots

---

## 3. Onde Estamos Agora

**Validação 2 — 8 de 10 sessões concluídas.**

| Sessão | Tema | Status |
|--------|------|--------|
| **01** | **Sessions Core** | **✅ Completa** |
| **02** | **Sessions List** | **✅ Completa** |
| **03** | **Layout** | **✅ Completa** |
| **04** | **Layout Controller** | **✅ Completa** |
| **05** | **Single Pane** | **✅ Completa** |
| **06** | **Mobile** | **✅ Completa** |
| **07** | **Browser/Editor** | **✅ Completa** |
| 08 | Filesystem/Workspace | ⏳ Pendente |
| **09** | **Bugs Críticos** | **✅ Completa** |
| 10 | Produção (build + screenshots) | ⏳ Pendente |

**Números atuais:**
- Testes unitários: ✅ 348/348 passando
- Build: ✅ TypeScript + Vite sem erros
- E2E: ✅ 40/40 passando (8 sessões × 5 testes)
- Progresso geral: ~98% (32/32 ondas antigas + 8/10 sessões Val.2)

---

## 4. O Que Falta Fazer

### Próximo passo imediato: Sessões 03 + 05

Conforme a ordem do `00_INDICE_GERAL.md` (em `validacao_2/sessoes/`), a ordem obrigatória é:

1. **Sessão 03 (Layout)** — ler COMPARACAO.md, TAREFA.md, implementar, testar com Playwright
2. **Sessão 05 (Single Pane)** — mesmo fluxo
3. **Sessão 02 (Sessions List)** — mesmo fluxo
4. **Sessão 07 (Browser/Editor)** — mesmo fluxo
5. **Sessão 08 (Filesystem/Workspace)** — mesmo fluxo
6. **Sessão 06 (Mobile)** — mesmo fluxo
7. **Sessão 01 (Sessions Core)** — mesmo fluxo
8. **Sessão 09 (Bugs Críticos)** — mesmo fluxo
9. **Sessão 10 (Produção)** — build final + Playwright com 24+ screenshots

### Para cada sessão, o fluxo é:

1. Ler `COMPARACAO.md` — entender o gap entre original e réplica
2. Ler `TAREFA.md` — entender o que precisa ser implementado
3. Implementar as mudanças no código (`02_replica/src/`)
4. Rodar testes unitários: `cd 02_replica && npx vitest run`
5. Rodar build: `cd 02_replica && npm run build`
6. Ler `TESTE.md` — critérios de teste E2E
7. Criar/atualizar teste Playwright em `02_replica/e2e/`
8. Rodar E2E: `cd 02_replica && npx playwright test sessao_XX`
9. Gerar screenshots antes/depois
10. Atualizar KANBAN.md e STATUS_ATUAL.md

---

## 5. Como Rodar o Projeto

```bash
cd /home/user/ENTREGA/02_replica
npm install           # se node_modules não existir
npm run dev           # servidor dev em http://localhost:5173
```

### Rodar testes:

```bash
cd /home/user/ENTREGA/02_replica
npx vitest run                    # testes unitários (348 testes)
npx playwright test sessao_04     # E2E de uma sessão específica
npx playwright test               # todos os E2E
```

---

## 6. Mapa da Pasta de Gestão

```
04_gestao_completo/
├── CONTEXTO_GERAL.md          ← Este arquivo (ponto de entrada)
├── STATUS_ATUAL.md            ← Resumo executivo (1 página)
├── KANBAN.md                  ← Quadro completo (tudo: feito + fazendo + pendente)
│
├── ondas_antigas/             ← ⚠️ ARQUIVADO — IA NÃO LÊ
│   ├── BACKLOG.md             (32 requisitos originais)
│   ├── PLANO_IMPLEMENTACAO.md
│   ├── README.md
│   ├── relatorio_ondas/       (relatórios das ondas 1-3)
│   ├── codigo_completo.txt    (código extraído do original)
│   ├── restore_codefilecopier.py
│   └── compactar_projeto.py
│
└── validacao_2/               ← ← TRABALHO ATIVO
    ├── README_PARA_ARENA.md   (briefing da Validação 2)
    ├── SESSAO_04_COMPLETA.md  (relatório da sessão concluída)
    ├── sessoes/               (material das 10 sessões)
    │   ├── 00_INDICE_GERAL.md
    │   ├── 01_SESSAO_SESSIONS_CORE/
    │   ├── 02_SESSAO_SESSIONS_LIST/
    │   ├── ...
    │   └── 10_SESSAO_PRODUCAO/
    └── testes_e2e/            (testes Playwright da Val.2)
        ├── sessao_04_layout_controller.spec.ts
        └── prints/
```

---

## 7. Regras e Constraints

- **Todos os arquivos do projeto ficam dentro de `ENTREGA/`**
- **A pasta `02_replica/` é o código-fonte ativo** — é aqui que se implementa
- **A pasta `01_original/` é somente leitura** — é a referência
- **Testes E2E vivem em `02_replica/e2e/`** (e cópia em `validacao_2/testes_e2e/`)
- **O usuário tem tokens ilimitados** — pode rodar quantos testes forem necessários
- **O usuário NÃO quer testar manualmente** — tudo deve ser automatizado
- **O projeto será entregue para Claude Code / Antigravity / OpenClaude** — manter organizado
- **Linguagem: português brasileiro** — explicações em linguagem simples

---

## 8. Tecnologias

- **React 18** + **TypeScript** + **Vite**
- **Vitest** para testes unitários
- **Playwright** para testes E2E (browser headless)
- **CSS custom** (sem framework CSS, mas com Tailwind config disponível)
- **LocalStorage** para persistência de estado
- **Observable pattern** para layout state (não events)

---

## 9. Arquivos-Chave do Código

| Arquivo | Função |
|---------|--------|
| `02_replica/src/App.tsx` | Componente raiz, orquestra tudo (~1700 linhas) |
| `02_replica/src/domain/sessionLayout.ts` | Capture/restore de layout por sessão |
| `02_replica/src/domain/sessionLayoutSync.ts` | autorun de troca de sessão |
| `02_replica/src/domain/newSessionViewState.ts` | Estado compartilhado de sessões não-criadas |
| `02_replica/src/domain/sidePane.ts` | isChatCentered, lógica de centralização |
| `02_replica/src/components/SessionSidebar.tsx` | Sidebar com lista de sessões |
| `02_replica/src/components/SessionLanding.tsx` | Landing page (nova sessão) |
| `02_replica/src/data.ts` | Dados mockados (sessões iniciais, diffs, providers) |
| `02_replica/src/types.ts` | Tipos TypeScript |

---

## 10. Resumo em Uma Frase

Réplica da Agents Window do VS Code, 32 ondas de implementação concluídas, agora na Validação 2 (teste dinâmico), Sessão 04 de 10 completa, próximo passo é Sessões 03+05. Leia este arquivo, o KANBAN.md, e o STATUS_ATUAL.md para retomar.
