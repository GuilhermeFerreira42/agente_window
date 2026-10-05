# ERRO_HANDLING - Tratamento de Erro, Recuperacao e Limites (OpenClaude)

> **Data:** 2026-10-05  
> **Fonte:** `C:\Users\Usuario\Desktop\ARENA\a\openclaude\src\utils\errors.ts`, `src/services/rateLimitMessages.ts`, `vscode-extension/openclaude-vscode/src/chat/protocol.js`  
> **Referência:** Pergunta 17 de `Decisoes-Finais-Antigravity.md` ("Mensagem clara quando chave expira, Ollama offline, rate-limit, 413 context overflow")

---

## 1. Classificação de Erros no OpenClaude

O OpenClaude estrutura os erros através de classes dedicadas para isolar falhas de rede, subprocessos, estouro de contexto e erros de configuração:

| Classe de Erro | Arquivo Fonte | Quando Ocorre | Ação do Sistema |
|---|---|---|---|
| `ClaudeError` | `src/utils/errors.ts` | Erro geral na camada de agente | Exibe mensagem de erro na UI |
| `ShellError` | `src/utils/errors.ts` | Falha ou interrupção de comando de terminal | Captura `stdout` e `stderr` parciais e retorna como erro de tool |
| `AbortError` / `APIUserAbortError` | `src/utils/errors.ts` | Usuário clicou no botão "Stop" / cancelamento | Cancela requisição sem corromper o estado da sessão |
| `ConfigParseError` | `src/utils/errors.ts` | JSON corrompido em settings ou providers | Reverte para configuração padrão segura com alerta |
| `TelemetrySafeError` | `src/utils/errors.ts` | Erro limpo para logging | Sanitiza caminhos de arquivos e dados sensíveis antes de logar |

---

## 2. Eventos do Protocolo Wire (NDJSON)

A comunicação entre o processo de IA e a interface gráfica do chat utiliza tipos formais no protocolo NDJSON (`protocol.js`):

- **`api_retry`:** Disparado quando ocorre um erro transitório de rede ou sobrecarga (500, 503). Notifica a interface sobre a tentativa em andamento com backoff exponencial.
- **`rate_limit`:** Emitido ao receber HTTP 429. Contém tempo restante para liberação da cota (reset time) e sugere redução do esforço de raciocínio (*reasoning effort*).
- **`compact_boundary`:** Emitido quando o diálogo atinge o limite da janela de contexto (ex: 128k tokens). O sistema insere um ponto de corte e sumariza o histórico prévio para evitar erro 413 (*context overflow*).
- **`status`:** Pílula visual que informa o usuário sobre operações em segundo plano (ex: "Connecting to provider...", "Waiting for Ollama...").

---

## 3. Tratamento dos Cenários Críticos do Agente Window (Fatia 09)

### Cenário A: Chave de API Expirada ou Inválida (HTTP 401 / 403)
- **Detecção:** O cliente detecta status 401 ou payload de erro contendo `invalid_api_key` ou `authentication_error`.
- **Ação:** Interrompe a execução com mensagem amigável:
  > *"Chave de API inválida ou expirada para o provedor configurado. Por favor, acesse o menu Personalizações > Provedores para atualizar sua chave."*
- Oferece link direto para abrir a tela de configuração de provedores.

### Cenário B: Provedor Local Offline (ex: Ollama não iniciado - ECONNREFUSED)
- **Detecção:** Erro de conexão em `localhost:11434` (`ECONNREFUSED` / `ETIMEDOUT`).
- **Ação:** Mensagem orientadora:
  > *"Não foi possível conectar ao servidor Ollama em `http://localhost:11434`. Verifique se o Ollama está em execução (`ollama serve`)."*

### Cenário C: Limite de Contexto Atingido (Context Window 413)
- **Detecção:** HTTP 413 ou contagem de tokens atingindo o teto configurado (`CLAUDE_CODE_OPENAI_CONTEXT_WINDOWS` ou limite do modelo).
- **Ação:** Disparo de `compact_boundary`: resumo dos turnos mais antigos, preservação dos últimos turnos e continuidade da conversa sem crash.

### Cenário D: Interrupção Manual pelo Usuário ("Stop")
- **Detecção:** Acionamento de `AbortController.abort()`.
- **Ação:** O processo do terminal ou streaming é encerrado suavemente; os blocos de texto e ferramentas parciais são mantidos na tela com status `cancelled`.
