# Plataforma — Agente Window (workspaces npm)

Este diretório é a **raiz dos workspaces** do projeto. Ele existe para instalar
dependências uma única vez (hoist) e expor **um botão ligar oficial**.

## Como ligar — runtime fixado pelo projeto (2026-11-03)

```bash
# Na raiz agente_window, Windows:
iniciar.cmd

# Na raiz agente_window, Linux/macOS:
sh iniciar.sh
```

Pronto: http://127.0.0.1:5174 atende **frontend + `/fs` + `/pty` integrados**.
Nenhum outro servidor é necessário para desenvolver/usar o workbench. O runtime é preparado localmente em `platform/.runtime`, sem trocar o Node global. Node e npm exigidos vêm de `runtime.json`; engines, lockfile e arquivos de gerenciadores são conferidos por `npm run test:runtime`. A instalação limpa usa `npm ci --include=dev`; o inicializador refaz a preparação quando mudar runtime, arquitetura ou lockfile, e verifica SQLite e PTY antes de iniciar.

Use os argumentos `install`, `check`, `typecheck`, `test` ou `build` nos inicializadores. Exemplo: `iniciar.cmd test src/bairros/2-inteligencia/casas/agir/__tests__/agir.test.ts` (argumentos extras são repassados ao comando). Para uso manual, prepare primeiro a versão exata de Node/npm; então, nesta pasta, rode `npm ci --include=dev` e `npm run dev`. Com versão errada os comandos são recusados antes de carregar o aplicativo.

O npm fixado bloqueia scripts de dependências não aprovados. `allowScripts` na raiz autoriza somente as versões presentes no lockfile dos componentes necessários: better-sqlite3, node-pty e as duas versões de esbuild. A política estrita interrompe instalações com novos scripts sem revisão, em vez de deixar módulos nativos incompletos. Não usar liberação global de todos os scripts.

Ao usar a ação `test`, o inicializador cria um perfil descartável em `.cache/test-runs`, redireciona o diretório pessoal observado pelo Node e os temporários/configurações e remove credenciais de API do processo de teste. Os resíduos sintéticos ficam disponíveis para diagnóstico. Isso não prepara servidores/stubs para E2E nem torna seguros testes destrutivos contra um servidor real; siga `docs/09`. Comandos manuais fora do inicializador precisam do isolamento descrito ali.

**Distribuição dos fontes:** preserve `runtime.json`, os dois inicializadores, `scripts/`, manifests, lockfile e os nove canônicos. Não transporte `node_modules`, `.runtime`, `.cache`, credenciais ou conversas pessoais: módulos nativos precisam corresponder ao sistema e à arquitetura de destino. A primeira preparação requer HTTPS para nodejs.org e acesso ao registro npm. Windows usa PowerShell 5.1 e Expand-Archive; Linux/macOS usam curl, tar com suporte XZ e sha256sum ou shasum. Dependências de sistema para módulos nativos e plataformas efetivamente testadas estão em `docs/09`; existência de um inicializador não equivale a homologação de todos os sistemas.

### Por que a instalação precisa ser aqui

O `package.json` deste diretório declara os workspaces
(`apps/workbench-v2`, `services/pty-server`). Instalar na raiz deduplica e
contenta as versões em `platform/node_modules`. Instalar dentro de
`apps/workbench-v2` cria um `node_modules` paralelo, duplica pacotes e diverge
versões — **não faça**.

## O que cada script faz

| Script | Processos | Portas | Quando usar |
|---|---|---|---|
| `npm run dev` | só o workbench (`apps/workbench-v2`, Vite) | **5174** | dia a dia — caminho homologado pelos testes (19/19 anti-regressão das fatias 01–03) |
| `npm run dev:full` | workbench + pty-server standalone (`concurrently`) | 5174 + 7681 | apenas se um fluxo precisar explicitamente do PTY standalone (debug/contraste com o PTY integrado) |
| `npm run dev:pty` | só o pty-server standalone | 7681 | depuração isolada do serviço |
| `npm run dev:frontend` | alias legado de `dev` | 5174 | compatibilidade com o guia antigo |
| `npm run build` / `test` / `test:all` | — | — | build e suítes unitárias |

## Arquitetura em uma frase (por que o pty-server fica fora do `dev`)

O servidor Vite do workbench **integra o PTY WebSocket na mesma porta 5174**
(arquitetura *Single Port*, adotada na fase do terminal interativo). O
`pty-server` standalone (7681) é o **caminho de prod/preview e referência**, não
de dev — por isso a decisão Opcão 3 (2026-09-22) rebaixou o antigo
`dev:=concurrently(pty+v2)` para `dev:full`, e o `dev` oficial virou
"só o botão que liga o necessário".

## Anti-regressão (guarda da decisão)

- Não reintroduzir `concurrently` no script `dev` — contexto: sandbox de CI tem
  1,9 GB de RAM e dois servidores derrubavam o Vite por OOM (registrado em
  `docs/arquivo_morto/12-DOCUMENTACAO-VIVA.md`, porta política 2026-09-21).
- O workbench em dev **nunca** deve depender da porta 7681: os e2e de terminal
  (`sessao_11_terminal_interactive_v2` + `sessao_11_terminal_pty_real`) rodam
  **sem** nada na 7681 — se falharem "só quando o pty-server não está no ar", a
  integração Single Port foi quebrada.
- `npm run dev:full` deve continuar subindo 5174 **e** 7681 (contraste
  deliberado útil na homologação).
