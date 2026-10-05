# GUI_PROVEDORES_CLONE - Mapeamento de Provedores (Cline 4.1.22 + OpenClaude)

> **Data:** 2026-10-05  
> **Fontes:**  
> 1. Extensão Cline 4.1.22 (`saoudrizwan.claude-dev-4.1.22/webview-ui/`)  
> 2. OpenClaude (`openclaude/src/services/api/providerConfig.ts`, `src/utils/providerProfile.ts`)  
> **Referência:** Pergunta 10 de `Decisoes-Finais-Antigravity.md` ("Lógica: copiar OpenCode/OpenClaude. GUI: copiar Cline.")

---

## 1. Mapeamento de Provedores Nativos

Da análise combinada do Cline e dos perfis do OpenClaude (`.openclaude-profile.json`), temos os provedores compatíveis suportados no Agente Window:

| Identificador do Provedor | Nome de Exibição | Base URL Padrão | Formato / Protocolo |
|---|---|---|---|
| `openai` | OpenAI | `https://api.openai.com/v1` | OpenAI Chat Completions |
| `gemini` | Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | OpenAI-compatible ou Gemini Native |
| `anthropic` | Anthropic Claude | `https://api.anthropic.com/v1` | Anthropic Messages |
| `mistral` | Mistral AI | `https://api.mistral.ai/v1` | OpenAI-compatible |
| `codex` | ChatGPT Codex | `https://chatgpt.com/backend-api/codex` | Codex OAuth / REST |
| `github-copilot` | GitHub Copilot | `https://api.githubcopilot.com` | Copilot Chat Format |
| `ollama` | Ollama (Local) | `http://localhost:11434/v1` | OpenAI-compatible |
| `opencode-zen` | OpenCode Zen | `https://opencode.ai/zen/v1` | OpenCode Zen Proxy |
| `custom-openai` | OpenAI Compatible Generic | Customizável pelo usuário | OpenAI /v1/chat/completions |
| `helicone` | Helicone AI Gateway | `https://ai-gateway.helicone.ai` | Gateway Proxy (com header de auth) |

---

## 2. Campos da Tela de Configuração (Formulário Estilo Cline)

A interface de configuração de Provedores (acessível pelo botão **Personalizações 28px** no rodapé esquerdo) possui a seguinte estrutura de campos:

### Seção 1: Configuração Principal da API
1. **API Provider:** Dropdown com as opções listadas acima.
2. **Base URL:** Input de texto para customização da URL (preenchido com default para provedores conhecidos).
3. **API Key:** Input tipo senha (com botão de alternar visibilidade e máscara `••••••••`).
4. **Model ID:** Input de texto com botão de busca automática (`Fetch Models`) que consulta o endpoint `/v1/models` do provedor.
5. **Custom Headers:** Tabela dinâmica de pares chave-valor (`Add Header` / `Delete Header`):
   - Exemplo para Helicone: `Helicone-Auth: Bearer sk-helicone-...`
   - Exemplo para OpenClaude / Anthropic: `anthropic-version: 2023-06-01`

### Seção 2: Configuração Avançada do Modelo (Model Configuration)
1. **Context Window:** Input numérico (ex: `128000`, `200000`, `1000000`).
2. **Max Output Tokens:** Input numérico (ex: `4096`, `8192`, `16384`).
3. **Temperature:** Slider de `0.0` a `1.0` (padrão `0.0` ou `0.2` para codificação precisa).
4. **Reasoning Effort:** Dropdown (`low`, `medium`, `high`) para modelos compatíveis como OpenAI o1/o3 e Claude Thinking.
5. **Supports Images:** Checkbox indicando suporte a visão computacional.

---

## 3. Armazenamento Seguro no Agente Window

As configurações de provedor são salvas localmente em:
`~/.agente_window/providers.json`

Exemplo de estrutura JSON salva:
```json
{
  "activeProvider": "openai",
  "providers": {
    "openai": {
      "baseURL": "https://api.openai.com/v1",
      "apiKey": "sk-proj-...",
      "model": "gpt-4o",
      "contextWindow": 128000,
      "maxTokens": 4096,
      "temperature": 0.2,
      "headers": {}
    }
  }
}
```
As chaves nunca são salvas no repositório de código nem commitadas no Git.
