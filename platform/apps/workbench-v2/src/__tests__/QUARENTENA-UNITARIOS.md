# Quarentena de testes unitários

**Regra da casa (mesma da `e2e/QUARENTENA.md`):** teste que deixa de descrever o produto vai para
quarentena **com registro medido** — nunca é afrouxado para passar, nunca é apagado em silêncio.

Registro irmão para E2E: `e2e/QUARENTENA.md` (11 specs da coluna removida, D168).

---

## 1. `src/__tests__/TerminalPanel.test.tsx` — 9 testes, `describe.skip`

**Data:** 2026-11-06 (Fatia 15) · **Estado:** quarentenado, não executado.

**O que o arquivo certifica:** uma geração anterior do painel de terminal.

| O teste espera | O componente vivo faz |
|---|---|
| `role="region"` com nome acessível `"Terminal"` | nome `"Painel Inferior"` (nome de produto, PT-BR) |
| abas `"Output"` / `"Problems"` | `"Saída"` / `"Problemas"` |
| `role="tabpanel"` com nome | não usa `tabpanel` (o VS Code também não usa) |
| `data-pty-pid="1234"` / `"4321"` (pid da sessão de trabalho) | expõe o pid da **instância ativa** (`session-one:0`), como o VS Code |
| `role="button"` `"Novo terminal"` | `title`/`aria` do botão `+` é `"Novo Terminal (Ctrl+Shift+\`)"` |
| `role="group"` `"Terminal dividido"` | a divisão é anunciada por `"Terminal dividido"` no grupo de painéis, não no container de abas |
| `"Fechar terminal 2: Bash"` | rótulo por instância: `"Terminal <shell>"` |

**Medição:** 9 de 9 falhando **antes** de qualquer alteração desta rodada; 9 de 9 continuam
falhando depois — o arquivo nunca descreveu o componente atual. Não é regressão.

**O que foi feito no produto nesta rodada (acessibilidade real, mantida):**

- `role="tablist"` + `aria-label="Abas do painel"` no strip Problemas/Saída/Console/Terminal/Portas.
- `aria-label` explícito em cada aba (antes o nome acessível vinha do texto e do badge).
- `role="tablist"` + `aria-label="Terminais abertos"` + `aria-orientation="vertical"` na barra
  lateral de terminais (VS Code real: `role=tablist` vertical).
- `role="tab"` + `aria-selected` + `aria-label="Terminal <shell>"` em cada aba de instância.
- `data-session-id` voltou a ser exposto no `<section>` do painel (chegava como prop e era
  descartada com prefixo `_`).

**Por que não reescrevi o arquivo agora:** cada uma das 9 asserções embute uma suposição diferente
sobre a geração antiga; reescrever sem um contrato escrito do painel trocaria verificação por
suposição — exatamente o que a regra da casa proíbe. A cobertura comportamental do painel nesta
rodada é feita no **navegador real** (Playwright), onde o painel é o que o usuário vê.

**Para sair da quarentena:** escrever o contrato do painel (rótulos, papéis, o que `data-pty-*`
promete) e reescrever o arquivo contra ele, com o painel real como fonte — não com o mock atual.

---

## 2. Falhas que NÃO entraram em quarentena (foram corrigidas)

Ver `arena-operacional/EXECUCAO_AUTONOMA.md`, rodada de 2026-11-06:

- 4 falhas de `fsWatcher`/`fsIntegration` — **artefato de harness** (`TMPDIR` dentro de `.cache`,
  que o filtro de ruído do watcher descarta). Corrigido no gate (`platform/scripts/gate-unit.sh`).
- 2 falhas de `session-persistence` — `AGENTE_WINDOW_TEST_HOME` ausente. Corrigido no gate.
- 3 falhas de `personalizacoes/rotas` — `HOME` não isolado; a suíte lia a skill real
  `~/.agente_window/skills/commit` de execuções anteriores. Corrigido no gate.
- 1 falha de `frontier.test.ts` (FT-01) — `domain/appRuntime.ts` importava
  `casas/agir/contract` abaixo do barrel. **Violação real de fronteira**, corrigida no produto.
- 1 falha de `themeTokens` — 3 tokens `--vscode-quickInput*` referenciados e não declarados.
  Corrigido em `theme.css` (dark e light).
- 1 falha de `visualStates` — `outline: 1px solid` fixo em vez do token de espessura. Corrigido.
- 1 falha de `iconLabels` — o contrato cobrava `title="Mostrar sessões"`, mas o tooltip desse
  botão mostra o **título da sessão ativa** de propósito. Contrato corrigido e justificado no teste.
