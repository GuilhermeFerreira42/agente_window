# agente_window — o "Agent Window"

Aplicativo web que reproduz a **"Agents Window" do VS Code 1.135** — 90 % de fidelidade (a régua é o VS Code real / code-server na **8080**) e 10 % de decisões próprias: chassi com terminal integrado e tela de Provedores inspirada no **Cline** (`docs/02`). Construído em **React + Vite**, com backend de PTY e sistema de arquivos próprios, num monorepo npm (`platform/`).

> **Recebeu este projeto agora?** Leia **`docs/01 - COMECE AQUI.md`** — é a porta de entrada da documentação. **IAs:** leiam `AGENTS.md` antes de qualquer tarefa.

## Estado atual (2026-10-17)
- **FATIA 07 homologada (15/10) e FATIA 08 — Conectar/Provedores — HOMOLOGADA pelo dono em 17/10** (D89). A prova dele foi com **serviço real** (Ollama local e um pool LiteLLM pelo provedor genérico).
- **Fase ativa: FATIA 09 — Conversar** (chat real + streaming). **Ainda não iniciada** — ordem expressa do dono em 17/10: primeiro documentar e baixar o workspace. Hoje o chat responde em modo simulado (`App.tsx::handleSend`).
- **MVP = FATIAS 09 → 10:** Conversar (chat real, streaming) → Agir (ferramentas + permissões).
- **Dívida nova para a FATIA 11:** **DEBT-12 — "janela única de abas"** (editor de código + Provedores + Browser + Changes na mesma barra, conceito do VS Code) — diagnóstico completo em `docs/06 §8.7`.
- Mapa do estado e bloco de retomada: `docs/03 §0` · roadmap e dívidas: `docs/06` · decisões fechadas (até **D91**): `docs/05`.

## Arquitetura em uma frase
**Monolito Modular ("condomínio"):** o projeto é dividido em **bairros**; cada bairro em **casas** (módulos com **porta única** `index.ts` + teste próprio); o **Bairro 1 (Workbench) funciona sem IA**. Dicionário completo, regras e a migração de endereços: **`docs/04 §2.2`**.

```
agente_window/
  docs/      -> documentação canônica (01–09) + arquivo_morto (história e referências; história ≠ norma)
  platform/  -> raiz dos workspaces npm
    apps/workbench-v2/    -> a aplicação (React + Vite)
    services/pty-server/  -> serviço de PTY
```

## Como rodar (Windows / Linux)
```bash
cd platform
npm install --include=dev    # obrigatório ser aqui (raiz dos workspaces)
npm run dev                  # sobe o workbench — http://127.0.0.1:5174
```
A porta **5174** atende tudo integrado: aplicativo + `/fs` + `/pty` (arquitetura *Single Port*). Scripts alternativos (`dev:full`, `dev:pty`) e a explicação de cada um: `platform/README.md`.

## Testes
```bash
cd platform/apps/workbench-v2
npm run typecheck        # esperado: 0 erros
npx vitest run           # baseline 17/10: 767 passed / 12 failed / 16 skipped (docs/09 §2.5.2)
```
- As **12 falhas são pré-existentes** (9 do terminal — débito P4 — + `iconLabels` + `themeTokens` + `visualStates`) e têm conserto agendado para a FATIA 12 (D74). Baselines por fatia em `docs/09`.
- **FATIA 08 (Provedores):** unit da casa `2-inteligencia/casas/provedores` = 37/37 e E2E `e2e/provedores_fatia08.spec.ts` = 6/6 (contra um provedor simulado local; ver `docs/09 §13`).
- **Contrato de abertura (17/10):** `e2e/fatia08_modo_abertura.spec.ts` = **4/4** — trava o A1 (a tela de sessão nova não pode "subir" com aba aberta) e a **D88** (a superfície abre no modo do editor; o último modo é lembrado após reload; padrão de fábrica = modo anexo).
- **Fixture de provedores:** o arquivo de teste precisa estar no formato **v2** — `{"versao":2,"ativo":null,"provedores":{}}`. Em formato antigo a tela mostra "Formato não reconhecido".
- **E2E (Playwright):** ⚠️ specs de módulo (12/13/14…) só rodam contra o servidor de **fixture na 5175** — contra a 5174 elas **apagam arquivos reais**. **Leia `docs/09 §1` antes.**
- Bateria anti-regressão: `platform/apps/workbench-v2/run-antiregressao.sh` (ver `docs/09 §2.1`).

## Portas
| Porta | O que é |
|---|---|
| **5174** | servidor de desenvolvimento / homologação |
| **5175** | servidor de fixture para os E2E de módulo |
| **8080** | régua de comparação (code-server / VS Code real) |

## Áreas congeladas — não mexer sem ordem expressa do dono
`src/components/terminal/**`, `vite-plugin-pty.ts`, `singlePort.ts`, `services/pty-server`, `src/modules/explorer-search/{core,server}/**` e `EditorArea.tsx` (até 5.7). Contratos completos: `docs/arquivo_morto/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`.
`legacy/` foi removida de propósito (2026-09-29) — **não restaurar**.

## Documentação — os 9 canônicos em `docs/` são a fonte da verdade
| Arquivo | Para quê |
|---|---|
| `01 - COMECE AQUI` | porta de entrada: regras do projeto, como trabalhar, rotina de tarefa |
| `02 - VISAO GERAL` | identidade do produto (90/10), stack, onde está cada coisa |
| `03 - ESTADO ATUAL` | onde a obra parou + estado real do código |
| `04 - ARQUITETURA E REGRAS DURAS` | camadas, dicionário do condomínio, intocáveis, contratos |
| `05 - DECISOES` | decisões fechadas (D1–D78) — não reabrir sem o dono |
| `06 - PROXIMAS FASES E DIVIDAS` | roadmap 07–16 + matriz de dívidas (**fonte única**) |
| `07 - HISTORICO` | changelog e diário de sessão |
| `08 - HOMOLOGACAO` | o que o humano testa (Windows real) |
| `09 - TESTES E AMBIENTE` | bateria, receitas e becos sem saída (IA) |

`docs/arquivo_morto/` guarda **história e referências** (regra: **história ≠ norma**) — incluindo as **referências raspadas** (`arquivo_morto/referencias/`, com índice próprio): VS Code 1.135, OpenClaude, Cline e arquitetura limpa.

## Regra de ouro do projeto
**Documentação é a fonte da verdade; código segue a documentação.** Toda tarefa: **especificação prévia, escopo vertical, typecheck 0 + testes verdes** — e nunca inventar sucesso (`docs/01`, seção 3).
