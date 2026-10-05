# PERSISTENCIA_OPENCODE - Raspagem Real do opencode-ai/opencode

> Data: 2026-10-05 | Fonte: git clone https://github.com/opencode-ai/opencode em \a\opencode\
> CORRECAO IMPORTANTE: O doc Decisoes-Finais-Antigravity.md assumia Node/TypeScript com Drizzle ORM.
> OpenCode e Go com SQLite via sqlc + goose. NAO existe packages/opencode/src/storage/storage.ts.

## 1. Stack real

| Item | Valor |
|---|---|
| Linguagem | Go |
| Gerador SQL | sqlc v1.29.0 |
| Migrations | goose |
| Driver SQLite | github.com/ncruces/go-sqlite3 |
| Interface | TUI terminal (Bubble Tea) - sem webview |

## 2. Localizacao do banco

Padrao: <pasta-do-projeto>/.opencode/opencode.db
Nao e ~/.local/share/opencode/opencode.db como a doc assumia.

## 3. Schema SQL completo (migrations/20250424200609_initial.sql)

-- Sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    parent_session_id TEXT,           -- sub-sessoes: title, task
    title TEXT NOT NULL,
    message_count INTEGER NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    cost REAL NOT NULL DEFAULT 0.0,
    updated_at INTEGER NOT NULL,      -- Unix ms
    created_at INTEGER NOT NULL
);

-- Files (historico de versoes dos arquivos editados pela IA)
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    version TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE,
    UNIQUE(path, session_id, version)
);

-- Messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,                -- "user" | "assistant"
    parts TEXT NOT NULL DEFAULT '[]',  -- JSON array de ContentPart (ver secao 5)
    model TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    finished_at INTEGER,               -- quando IA terminou de responder
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
);

-- Migracao 2 (20250515): adiciona summary_message_id TEXT na tabela sessions.

## 4. Tipos de ContentPart

Parts sao serializadas como JSON array envelope {"type":"...", "data":{...}}:

| type | Uso |
|---|---|
| text | Texto simples |
| reasoning | Pensamento CoT do modelo |
| image_url | Imagem por URL |
| binary | Imagem binaria (upload) |
| tool_call | Chamada de tool pela IA |
| tool_result | Resultado da tool |
| finish | Fim da mensagem (reason: "stop") |

Exemplo real:
[
  {"type":"text","data":{"text":"Como posso ajudar?"}},
  {"type":"tool_call","data":{"id":"uuid","name":"bash","input":"{\"command\":\"ls\"}"}},
  {"type":"tool_result","data":{"tool_call_id":"uuid","content":"arquivo.txt"}},
  {"type":"finish","data":{"reason":"stop","time":1728000000000}}
]

## 5. Hierarquia de sessoes

Session normal (usuario): ID = uuid, parent_session_id = null
Session de titulo (auto): ID = "title-" + parentSessionID
Session de task/agente: ID = toolCallID, parent_session_id = ID pai

## 6. CRUD do Service

Create(ctx, title)                               -- nova sessao
CreateTitleSession(ctx, parentSessionID)          -- sub-sessao titulo
CreateTaskSession(ctx, toolCallID, parentID, t)  -- sub-sessao agente
Get(ctx, id) / List(ctx)
Save(ctx, session)                               -- update tokens e custo
Delete(ctx, id)                                  -- apaga + CASCADE messages + files

Delete e o "limpar" do OpenCode: nao ha botao separado, apaga a sessao inteira.
Novo chat = Create vazio.

## 7. Pragmas SQLite

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA page_size = 4096;
PRAGMA cache_size = -8000;  -- ~8MB
PRAGMA synchronous = NORMAL;

## 8. Adaptacao para Agente Window

| OpenCode | Agente Window (proposta) |
|---|---|
| <projeto>/.opencode/opencode.db | ~/.agente_window/agente_window.db |
| sessions table | + campo workspace_path TEXT |
| messages table | identica |
| files table | identica |
| parent_session_id | agrupar sessoes por pasta (Fatia 06) |
| .opencode.json | ~/.agente_window/providers.json |
