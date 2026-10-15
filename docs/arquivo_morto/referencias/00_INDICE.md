# REFERÊNCIAS RASPADAS — índice (14/10/2026)

> **O que é isto.** Notas **destiladas** da Raspagem Total feita em 14/10/2026, antes da FATIA 07, para servir a **todas** as fatias (MVP 07–10 e Condomínio Robusto). Decisão: **D77** (`docs/05`).
> **Regras:** (1) isto **não é norma** — a norma são os canônicos `docs/01–09`; (2) **não guardamos código de terceiros** (só o que aprendemos; os downloads foram descartados ao fim da raspagem); (3) cada nota diz **para que serve** e **de onde veio** (arquivo exato); (4) reconsultar no futuro é barato — os comandos estão no fim.

## Fontes desta raspagem (com prova de origem)
| Fonte | Versão / commit | Peso baixado | Método |
|---|---|---|---|
| VS Code (`microsoft/vscode`) | tag **1.135.0** (08d4889f) | 50 MB (pacote do tag, **sem histórico**) | download + extração em área descartável, fora do workspace |
| OpenClaude (`Twigpine/openclaude`) | commit **fc3be25e** | 53 MB | clone raso (`--depth 1`) |
| Cline (`cline/cline`) | main **789f79e46d3b** (14/10/2026) | ~1 MB (só os arquivos da tela) | API do GitHub + raw (sem clonar) |
| Arquitetura limpa | — (pesquisa web 14/10) | — | links verificados |

## As notas, e para que servem
| Nota | Serve para |
|---|---|
| `vs-code-1.135/01_os_cinco_predios.md` | ROBUSTO (DEBT-ROBUST-02) — como o VS Code separa processos |
| `vs-code-1.135/02_extension_host_e_ipc.md` | ROBUSTO — o "prédio das extensões" + a ponte de recados (RPC) |
| `vs-code-1.135/03_monaco_e_editor.md` | FATIA 11/16 — como o editor se separa para ser embutido |
| `vs-code-1.135/04_terminal_e_pty.md` | FATIA 12 (Terminal 2.0) + DEBT-01/02/03 |
| `vs-code-1.135/05_comandos_menu_atalhos_e_di.md` | ROBUSTO (DEBT-ROBUST-01/03/04) — comandos, menus, atalhos, DI, layout em pedaços |
| `openclaude/01_loop_do_agente_e_ferramentas.md` | FATIAS 09/10 — o loop, limites e ferramentas |
| `openclaude/02_skills_e_plugins.md` | Bairro 5 (pós-MVP) — skills |
| `openclaude/03_sessoes_e_permissoes.md` | FATIA 10 — permissões ("permitir na sessão") e sessões |
| `openclaude/04_provedores_descriptor_first.md` | FATIA 08 — como descrever provedores sem bagunça |
| `cline/01_tela_de_provedores.md` | FATIA 08 + DEBT-10 — a tela do Cline, campo a campo |
| `arquitetura-limpa/01_lista_de_referencias.md` | Bairros 1–4 — projetos e ferramentas de arquitetura limpa |
| `arquitetura-limpa/02_porta_unica_e_fiscal_de_imports.md` | Regra do condomínio — porta única + fiscal automático de fronteiras |

## Como refazer (barato — nada fica guardado)
```bash
# VS Code (tag exata, sem histórico):
curl -sL -o vscode-1.135.0.tar.gz https://github.com/microsoft/vscode/archive/refs/tags/1.135.0.tar.gz
# OpenClaude (clone raso):
git clone --depth 1 https://github.com/Twigpine/openclaude.git
# Cline (sem clonar — lista de arquivos + arquivo avulso):
curl -s "https://api.github.com/repos/cline/cline/git/trees/main?recursive=1"
curl -s "https://raw.githubusercontent.com/cline/cline/main/<caminho do arquivo>"
```

## Lacunas conscientes (NÃO raspadas — decidir quando a fatia abrir)
- **Layout/Parts:** só a lista de pastas (nota 05) — aprofundar na FATIA 14.
- **Worktrees e sessões isoladas** (FATIA 15): não aprofundado (a ideia já está no 06).
- **Navegador embutido** (FATIA 16): não aprofundado.
- Agente Host remoto (SSH/WSL/túnel): visto por cima (nota 01) — não é nosso caso agora.
