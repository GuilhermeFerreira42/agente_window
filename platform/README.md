# Plataforma — Agente Window (workspaces npm)

Este diretório é a **raiz dos workspaces** do projeto. Ele existe para instalar
dependências uma única vez (hoist) e expor **um botão ligar oficial**.

## Como ligar (comando oficial — decisão do usuário 2026-09-22)

```bash
cd agente_window/platform
npm install --include=dev   # OBRIGATÓRIO ser aqui (raiz dos workspaces)
npm run dev                 # sobe SÓ o workbench — Single Port 5174
```

Pronto: http://127.0.0.1:5174 atende **frontend + `/fs` + `/pty` integrados**.
Nenhum outro processo é necessário para desenvolver/usar o workbench.

### Por que `npm install` precisa ser aqui

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
  `docs/12`, porta política 2026-09-21).
- O workbench em dev **nunca** deve depender da porta 7681: os e2e de terminal
  (`sessao_11_terminal_interactive_v2` + `sessao_11_terminal_pty_real`) rodam
  **sem** nada na 7681 — se falharem "só quando o pty-server não está no ar", a
  integração Single Port foi quebrada.
- `npm run dev:full` deve continuar subindo 5174 **e** 7681 (contraste
  deliberado útil na homologação).
