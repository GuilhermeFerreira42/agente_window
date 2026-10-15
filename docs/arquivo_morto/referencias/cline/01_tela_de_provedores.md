# Cline — a tela de Provedores (campo a campo)

> **Serve para:** **FATIA 08 — Conectar (Provedores)** e DEBT-10 (formulários ricos estilo Cline).
> **Fonte:** `cline/cline` main **789f79e46d3b** (14/10/2026). Baixamos **só os arquivos da tela** (sem clonar o repositório). Os caminhos abaixo são relativos a `apps/vscode/webview-ui/src/components/settings/`.

## Como a tela é montada
- **Orquestrador:** `ApiOptions.tsx` (545 linhas):
  1. mostra o **seletor de provedor** — dropdown próprio com **busca fuzzy** (biblioteca Fuse), `role="listbox"`, um item por provedor;
  2. ao escolher, monta **o componente daquele provedor**;
  3. cuida do posicionamento do dropdown (há comentário no código: abre para baixo para funcionar dentro de popup).
- **Um arquivo por provedor** em `providers/` (~35 arquivos, incluindo testes): `OllamaProvider.tsx`, `AnthropicProvider.tsx`, `OpenAICompatible.tsx`, `OpenAINative.tsx`, `LMStudioProvider.tsx`, `LiteLlmProvider.tsx`, `QwenProvider.tsx`, `VertexProvider.tsx`, `BedrockProvider.tsx`, `GroqProvider.tsx`, `MoonshotProvider.tsx`, `XaiProvider.tsx`, `ZAiProvider.tsx`, `OpenRouterProvider.tsx`, `HuggingFaceProvider.tsx`…
- **Registro:** `providers/providerSettingsRegistry.ts` (193 linhas):
  - lista **quem tem formulário próprio** (`CUSTOM_PROVIDER_SETTINGS_IDS` — 26 ids: anthropic, ollama, openai, openrouter, qwen, lmstudio, litellm, moonshot, bedrock, vertex, xai, zai…);
  - provedores "**genéricos**" usam o formulário padrão (`GenericProviderSettings`) guiado por um **catálogo que vem de fora** (`ProviderListing`: id, nome, protocolo ∈ `anthropic` / `gemini` / `openai-chat` / `openai-responses`);
  - **ajustes finos por provedor**: link de cadastro ("pegar chave aqui"), campo de URL base (rótulo/placeholder próprios) e `allowsCustomIds` (permitir digitar id de modelo livre).
- A **lista de provedores pode chegar do servidor** (`useProviderListings`) — por isso o registro separa o que é "conhecido" do que é "personalizado".

## Os campos comuns (o que interessa copiar)
- **`common/ApiKeyField.tsx`** (104 l.): campo de senha; rótulo "…API Key"; salva com **espera de 100 ms** (evita salvar a cada tecla); dica "esta chave fica guardada localmente…"; link de cadastro que aparece só com o campo vazio; protege o texto sendo digitado contra atualizações mascaradas que chegam por fora.
- **`common/BaseUrlField.tsx`** (102 l.): **caixa "Use custom base URL"** + campo que só aparece quando marcada; lida com a configuração que chega **depois** de a tela montar; ao desmarcar, limpa o valor salvo (com reversão se falhar).
- **Modelo:** `ModelPickerWithManualEntry.tsx` (escolher da lista **ou digitar à mão**), `common/ModelSelector.tsx`, `common/ModelAutocomplete.tsx`, seletor próprio por provedor (OpenRouter, Groq, Ollama, HuggingFace…) e `ModelInfoView` (ficha do modelo).
- **Ajudas:** `utils/providerUtils.ts` (360 l. — regras comuns), `useApiConfigurationHandlers.ts` (salvar/restaurar), `useProviderApiKeyField.ts`, `utils/apiKeyMasking.ts` (mascarar a chave exibida).

## O fluxo do usuário (o que vamos replicar)
1. escolher o provedor (lista com busca) → 2. preencher **chave** (e **URL base**, se for o caso) → 3. escolher **modelo** (lista ou digitado) → 4. opções extras do provedor → 5. pronto; a config persiste.

## Como usar na nossa FATIA 08
- Copiar o **formato**, não o código (stack e licença diferentes; nosso projeto é React + Vite, npm).
- Nosso recorte do MVP (`06`): **OpenAI, Anthropic, Gemini, Ollama, OpenRouter, DeepSeek** — os demais entram como "genéricos" quando o catálogo abrir (DEBT-10).
- Ler junto: `openclaude/04_provedores_descriptor_first.md` (o esqueleto de **dados** por trás dessa tela).
