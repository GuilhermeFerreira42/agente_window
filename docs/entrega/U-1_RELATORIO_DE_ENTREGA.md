# U-1 — Configurações unificadas · Relatório de entrega

Base: `24d686a` · Branch: `arena/0f2e5de2-agente-window` · Data: 13/11/2026
**Status: implementada e provada tecnicamente. NÃO homologada. Sem merge.**

> Este relatório é a entrega extensa. Os canônicos (`03`, `05`, `06`, `07`, `09`)
> receberam apenas o registro curto. Evidências grandes (JSONs do Vitest,
> Playwright, capturas) ficam **fora do repositório**, em `/home/user/u1-gates/`.

---

## 1. O que mudou (por requisito)

| Req | Entrega | Onde |
|---|---|---|
| R01 | Porta única `abrirConfiguracoes(rota)`; conta, `Ctrl+,`, lateral e cards convergem. Diálogo aberto só navega; instância preservada; nasce expandido; restaurar/maximizar. | `src/shell/useConfiguracoesUnificadas.ts`, `App.tsx` |
| R02 | 13 categorias em 3 grupos, ordem exata. Personalizações (Visão geral/Habilidades/Ferramentas) na **mesma** nav — sem segunda coluna. Futuras dizem "ainda não está disponível", sem ação. Painel oculto sai do foco/leitor. | `src/domain/configuracoesUnificadas.ts`, `src/shell/ConfiguracoesUnificadas.tsx` |
| R03 | Geral hospeda a ConfigView real (1–250, padrão 25), save explícito, eco do servidor; falha de GET → retry e **PUT bloqueado**; falha de save mantém rascunho. Aparência usa **o mesmo** `agents-theme` da barra. | `ConfigView.tsx`, `paineisConfiguracoes.tsx` |
| R04 | Provedores hospedados: 8 descritores, chave mascarada com reveal voluntário, teste de conexão, catálogo dinâmico. Abrir **não** faz inferência/teste. Reveal vive na memória do painel e é limpo ao trocar categoria e ao fechar. | `ProvidersView.tsx`, `usePaineisConfiguracoes.tsx` |
| R05 | Personalizações reais (global/projeto), cards navegam no próprio modal; Permissões explica os controles e aponta a conversa; **nenhum grant novo**; chat sem pasta mantém os limites C-1. | `PersonalizacoesView.tsx`, `paineisConfiguracoes.tsx` |
| R06 | Conversas informa localização **só com fonte confiável** (nenhum corpo de conversa é inspecionado); Workspaces explica contexto imutável e leva a "Nova sessão com pasta"; sem implementação → estado de categoria futura. | `paineisConfiguracoes.tsx` |
| R07 | Cada painel dono do rascunho e do salvar; troca conserva rascunhos; X/Escape/histórico com dados sujos pedem decisão; descartar limpa só rascunhos; **save em voo bloqueia** o fechamento; painéis fechados desmontam. | `decidirFechamento`, hook + moldura |
| R08 | Diálogo com título, rolagem própria, trap de Tab, setas/Home/End, Escape respeitando a confirmação, foco devolvido ao acionador real; `.app-frame` inert sem desmontar chat/editor/Explorer/terminal. | `ConfiguracoesUnificadas.tsx`, `configuracoesUnificadas.css` |
| R09 | Abas `config`/`providers` e o id `aiCustomizations` traduzidos **antes de montar**; aba ativa abre a categoria, inativa preserva a seleção; abas de arquivo/Browser/Changes intactas; voltar/avançar navega sem repetir mutação; nada de rascunho/segredo persistido. | `persistenciaNativas.drenarAbasLegadas`, `App.tsx` |
| R10 | App só faz wiring por barrels; moldura não é gerenciador paralelo; sem dependência nova, sem migração, sem permissão nova. | `App.tsx` (2885 linhas ≤ 2889 do C-2) |

**Arquivos novos:** `src/domain/configuracoesUnificadas.ts`,
`src/shell/ConfiguracoesUnificadas.tsx`, `configuracoesUnificadas.css`,
`src/shell/paineisConfiguracoes.tsx`, `src/shell/useConfiguracoesUnificadas.ts`,
`src/shell/usePaineisConfiguracoes.tsx`, `src/shell/ConfiguracoesUnificadasHost.tsx`,
as duas suítes U-1 de unitárias e `e2e/u1_configuracoes_unificadas.spec.ts`.

**Arquivos alterados (cirúrgico):** `App.tsx`, `ConfigView.tsx` (hospedado/retry/PUT
bloqueado), `ProvidersView.tsx` (hospedado/limparReveal), `PersonalizacoesView.tsx`
(`semNavegacaoPropria`/`semTitulo`), `persistenciaNativas.ts` +
`useFaixaDeAbasNativas.ts` (drenagem das abas legadas) e os testes nominais listados
na §5.

---

## 2. Provas executadas (Linux Debian, perfis descartáveis)

Comando-base (sem retry, sem skip, perfil isolado):

```
AGENTE_WINDOW_TEST_HOME=/tmp/u1-X \
NODE_OPTIONS="--require=<repo>/platform/scripts/test-profile.cjs" \
<runtime>/node platform/node_modules/vitest/vitest.mjs run <arquivo> --maxWorkers=1 --minWorkers=1
```

### 2.1 Unitárias dos critérios

| Suíte | Critérios | Resultado |
|---|---|---|
| `src/__tests__/u1ConfiguracoesShell.test.tsx` | U1-T01, T02, T08, T09, T10 | **22/22** |
| `src/__tests__/u1ConfiguracoesPaineis.test.tsx` | U1-T03, T04, T05, T06, T07 | **17/17** |

Destaques do que é medido de fato: um único `dialog` e `data-modo="expandido"`;
ordem literal dos 13 rótulos; `hidden` + `aria-hidden` no painel não ativo;
`.app-frame` com `inert === true` enquanto o modal está aberto e `false` depois;
foco devolvido ao acionador; `aiCustomizations` → `personalizacoes/visao`;
`config` → `geral`; `providers` → `provedores`; `file` → sem tradução; domínio
puro (sem React, IO ou Casas); GET 500 → alerta + "Tentar novamente" + **zero PUT**;
eco grampeado do servidor (250) aplicado ao `autoScroll`; rascunho sobrevive à troca
de categoria na moldura real.

### 2.2 Comparação nominal com a baseline

| | Base `24d686a` | Depois da U-1 |
|---|---|---|
| Asserções | 2265 | **2266** |
| Aprovadas | 2262 | **2266** |
| Falhas | 3 | **3** |
| Ignoradas | 33 | **33** |
| Suítes com falha | `fatia07_destravar`, `editorTabs`, `monacoLoadFailure` | **as mesmas três** |

Falhas novas: **0**. Skips novos: **0**. As três falhas são pré-existentes e estão
medidas iguais na base — nenhuma foi renomeada, enfraquecida ou posta em quarentena.

### 2.3 Gates do pacote

| Gate | Comando | Resultado |
|---|---|---|
| Preflight | `VALIDAR_U1.mjs --mode preflight` | arquivos presentes (não é prova de qualidade) |
| Foco | `VALIDAR_U1.mjs --mode foco` | **215 aprovadas, 0 falhas nominais, 13 pulados** |
| Ampla | `VALIDAR_U1.mjs --mode ampla --baseline-json 01-baseline/vitest.json` | **2268 aprovadas, 3 falhas nominais (as da base), 33 pulados** |
| E2E oficial | `VALIDAR_E2E_U1.mjs` (porta 5218, `--retries=0`) | **7/7**, sem skip/flaky/retry |

### 2.4 E2E — jornadas

`e2e/u1_configuracoes_unificadas.spec.ts`, porta **5218** (`--strictPort`), servidor
próprio com pastas descartáveis, Chromium local, **7/7**:

- **U1-E01** — uma porta, uma instância: Conta→Provedores e "Adicionar aba"→Personalizações
  caem no MESMO diálogo (1 `dialog`); nenhuma aba `providers`/`config` é criada.
- **U1-E02** — 3 grupos com os `aria-label` aprovados, 13 rótulos na ordem exata,
  categoria futura só explica o limite (`0` botões).
- **U1-E03** — teto com `min=1`/`max=250`; save explícito envia `teto: 40`; **F5 mostra
  40** (eco real, não default); com GET derrubado, aparece alerta + "Tentar novamente"
  e **nenhum PUT sai**.
- **U1-E04** — abrir Provedores não dispara teste/inferência (`0` chamadas ao provedor
  fixture); o campo nasce `type=password`; depois do reveal, trocar de categoria e
  voltar devolve o campo a `password` (reveal não atravessa a fronteira).
- **U1-E05** — Personalizações: uma única `nav`, `0` `.personalizations-navigation`,
  um único `h2`, seções trocando pela nav comum, dados do servidor real.
- **U1-E06** — com rascunho sujo, fechar abre `alertdialog`; "Continuar editando"
  preserva o `77` digitado; "Descartar rascunhos" fecha **sem** PUT.
- **U1-E07** — setas/Home/End movem o foco, Tab fica preso no diálogo, `.app-frame`
  inert; `data-painel-aparencia` acompanha o tema trocado **dentro** do modal;
  800×600 cabe; fechar devolve o foco ao acionador e desliga o inert.

### 2.5 E2E nominais de regressão

| Spec | Porta | Resultado |
|---|---|---|
| `provedores_fatia08` | 5174 + stub 4599 | **6/6** |
| `c1_correcoes` | 5211 | **6/6** |
| `c2_centro` | 5212 | **17/17** |
| `c3b_multimodal` | 5216 | **12/12** |

### 2.6 Typecheck e lint

`npx tsc -b --force` → **0 erros**. `npx eslint src/App.tsx` → **17 problemas**,
idênticos aos 17 da base (medidos por `git stash` antes de começar) — nenhum novo.
Os arquivos novos não geram nenhum aviso.

---

## 3. Capturas (fora do repo)

`/home/user/u1-gates/04-e2e-capturas/`

- `u1-geral-tema-escuro-1400.png` · `u1-aparencia-tema-escuro-1400.png`
- `u1-aparencia-tema-claro-1400.png`
- `u1-aparencia-tema-claro-800x600.png` · `u1-geral-tema-claro-800x600.png`

Capturas de erro e de confirmação de descarte: os dois estados ficam registrados
como asserção nos testes (E03 e E06) e as imagens de falha do Playwright foram
descartadas por serem de execuções intermediárias — para regerar, rode
`U1_EVIDENCIA_DIR=<pasta> sh <runner>` com a spec U-1.

---

## 4. Testes alheios que precisaram acompanhar a mudança de contrato

Nenhum foi afrouxado; todos passaram a **provar o contrato novo com mais rigor**:

| Teste | Antes | Depois |
|---|---|---|
| `App.test.tsx` › "abre Provedores pelo menu da conta" | exigia aba `providers` | exige o `dialog` na categoria Provedores **e a ausência da aba** |
| `App.test.tsx` › "abre Personalizações…" | exigia `region` da tela antiga | exige a categoria no modal, as 3 seções na nav comum, `0` nav própria, e mantém as provas de dado real (skill do servidor, "Ligar Excluir") |
| `faixaDeAbasProtecao.test.tsx` (2) | "Provedores continua como aba após F5" | "Provedores não é aba e não volta após o F5", com Browser preservado |
| `fatia07_destravar.test.tsx` › DEBT-09 | achava aba `providers` na landing | acha o modal na categoria certa |
| `c2_centro.spec.ts` › J7 | modal "Personalizações do Agent Window" | modal "Configurações" em Personalizações, **1 diálogo**, sem 2ª coluna |
| `provedores/__tests__/frontier.test.ts` › FT-05 | a regra só valia no App | continua valendo e passou a valer em **todo** o `src` (a tela saiu do App) |

---

## 5. Roteiro de homologação no Windows (não executado aqui)

> O ambiente desta execução é Linux. **Tudo abaixo está pendente de plataforma** —
> não foi rodado, e portanto não é declarado como aprovado.

Pré-requisitos: Node fixado em `platform/runtime.json` (26.13.0), Chromium/Edge
disponível, `platform/node_modules` instalado.

1. **Typecheck e unitárias**
   ```powershell
   cd platform\apps\workbench-v2
   npx tsc -b --force
   npx vitest run src/__tests__/u1ConfiguracoesShell.test.tsx src/__tests__/u1ConfiguracoesPaineis.test.tsx
   ```
   Esperado: 0 erros de tipo; **22** e **17** testes verdes.

2. **Gates do pacote** (PowerShell)
   ```powershell
   node VALIDAR_U1.ps1 -Repo <repo> -Mode foco -Out <pasta-nova>
   node VALIDAR_U1.ps1 -Repo <repo> -Mode ampla -Out <pasta-nova> -BaselineJson <baseline>\vitest.json
   ```
   Esperado: foco sem falha nominal; ampla com **exatamente** as 3 falhas
   pré-existentes e nenhuma nova.

3. **E2E da U-1** — porta 5218
   ```powershell
   node VALIDAR_E2E_U1.mjs --repo <repo> --out <pasta-nova>
   ```
   Esperado: **7/7**, sem skip/retry. Se o Chromium não for encontrado, aponte
   `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

4. **E2E de regressão (runners da casa)**
   ```powershell
   powershell -File platform\scripts\e2e-c1.ps1
   powershell -File platform\scripts\e2e-c2.ps1
   powershell -File platform\scripts\e2e-c3b.ps1
   ```
   Esperado: 6/6, 17/17 e 12/12. Para `provedores_fatia08`, suba o stub
   `uploads\stub_provider.cjs` (porta 4599) e o app na 5174 — **o stub não está no
   repositório**, e sem ele a régua não tem valor de referência.

5. **Conferência humana (o que o dono precisa olhar)**
   - Abrir Configurações pelo menu da conta e por `Ctrl+,`: mesmo modal, expandido,
     com o título correto.
   - Ir a **Geral**, mudar o teto, salvar, apertar **F5** e reabrir: o valor salvo
     aparece (eco do servidor).
   - Ir a **Aparência**, alternar claro/escuro: a barra superior muda junto; F5
     preserva a escolha.
   - Ir a **Provedores**, revelar uma chave, trocar de categoria e voltar: a chave
     deve estar escondida de novo.
   - Ir a **Personalizações**: as seções trocam pela navegação da esquerda, sem
     segunda coluna.
   - Sujar um rascunho e tentar fechar: deve perguntar; "Continuar editando"
     preserva o texto, "Descartar rascunhos" fecha sem salvar.
   - Redimensionar para ~800×600: o modal cabe, rola e continua navegável pelo
     teclado (setas, Tab preso dentro, Escape).

6. **O que NÃO entra na homologação:** qualquer teste com provedor real, conta ou
   chave. Toda a bateria usa fixture local e perfis descartáveis.

---

## 6. Declaração de escopo

- **Executado:** unitárias U-1, suíte completa com comparação nominal, gates
  preflight/foco/ampla, E2E U-1 (5218) e as quatro E2E nominais, typecheck e lint.
- **Simulado:** provedor de provedores e o backend de teste — sempre por fixture
  HTTP local, nunca serviço remoto.
- **Pendente de plataforma:** todo o roteiro Windows da §5 e a conferência visual
  humana das capturas.
- **Não feito, por decisão:** merge, próxima fatia (MM-I/MM-O/E1–E6), alteração de
  aceites em `08`, force push, dependência nova, segundo store de configurações ou
  de abas, "Salvar tudo" atravessando as três Casas, reset global de padrões,
  grants/permissões novas, ações fictícias nas categorias futuras.

**A U-1 não está homologada.** A palavra final é do proprietário.
