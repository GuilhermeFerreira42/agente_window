# workbench-v2 — a aplicação (Agent Window)

Aplicação principal do projeto: **React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Monaco Editor + xterm + react-resizable-panels**. É a réplica da "Agents Window" do VS Code 1.135 (`docs/02` dos canônicos).

> ⚠️ **Não instale dependências nesta pasta.** A instalação oficial é na raiz dos workspaces (`agente_window/platform`) — ver `platform/README.md`.

## Rodar / testar
```bash
# na raiz dos workspaces (agente_window/platform):
npm install --include=dev && npm run dev     # app integrado na 5174

# nesta pasta:
npm run typecheck    # esperado: 0 erros
npx vitest run       # baseline: 722 passed / 9 failed / 16 skipped (docs/09 §2.5)
npx playwright test  # ⚠️ specs de módulo só contra a fixture na 5175 — leia docs/09 §1 antes
```

## O que é de verdade × o que ainda é simulado (2026-10-14)
- **De verdade:** terminal (PTY próprio, *Single Port*), sistema de arquivos (`/fs/*`, com escrita atômica), Explorer/Search (casa com contrato e teste de fronteira), Controle de Código-Fonte com **diff real** (`git.getDiff`), layout, sessões.
- **Simulado / simplificado (por decisão de fatia):** o **chat** responde com resposta fixa — IA real entra nas FATIAS 08–10; o **navegador embutido** usa conteúdo interno representativo (`srcDoc`); a **Trilha de Navegação** é visual, sem menus (D2.23 → FATIA 13).
- Estado detalhado e o porquê de cada coisa: `docs/03`; trabalho em andamento: `docs/06`.

## Regras
Este app segue a arquitetura e o dicionário do `docs/04` (condomínio) e as decisões fechadas do `docs/05`. Roadmap e dívidas vivem **somente** no `docs/06` — nada de listas paralelas aqui.
