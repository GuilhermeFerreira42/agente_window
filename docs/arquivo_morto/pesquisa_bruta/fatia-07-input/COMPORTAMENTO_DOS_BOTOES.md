# Comportamento e Ações do Input — Fatia 07

---

## 1. Comportamento do Teclado e Envio
* **Enter:** Envia a mensagem e inicia o streaming do agente.
* **Shift + Enter:** Insere uma quebra de linha sem enviar.
* **Escape:** Cancela o foco ou fecha menus suspensos abertos.
* **Auto-grow:** Conforme o texto cresce, a altura aumenta até 320 px; acima disso, surge a barra de rolagem vertical.

## 2. Seleção de Agente (`Agent`)
* Ao clicar na pastilha `Agent`:
  * Abre menu suspenso com os perfis disponíveis:
    * `Agent` (Padrão: autonomia total para ler, editar e executar).
    * `Ask` (Modo apenas leitura e perguntas).
    * `Edit` (Modo focado em edições cirúrgicas no editor).
    * `Custom Agent` (Carrega instruções personalizadas de `.github/copilot-instructions.md`).

## 3. Seleção de Modelo e Pool (`meu-pool`)
* Ao clicar na pastilha `meu-pool`:
  * Abre menu suspenso com os provedores e modelos configurados:
    * `Claude 3.7 Sonnet`
    * `GPT-4.1 / GPT-4o`
    * `Custom Endpoint / LiteLLM / Ollama`
  * O modelo escolhido é salvo e associado à sessão ativa.

## 4. Modos de Permissão
* **`Interativo`:** O agente sempre exibe a barra de `Accept / Discard` antes de aplicar qualquer alteração ou rodar comandos de terminal.
* **`Default permissions`:** Aplica as regras de permissão automática pré-configuradas no workspace.
