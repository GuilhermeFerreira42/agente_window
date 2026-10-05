# RESET_SESSAO - Analise de Reset / Limpeza de Sessao (OpenClaude + VS Code)

> **Data:** 2026-10-05  
> **Fonte:** `C:\Users\Usuario\Desktop\ARENA\a\openclaude\vscode-extension\openclaude-vscode\src\chat\chatProvider.js` e `sessionManager.js`  
> **Referência:** Pergunta 19 de `Decisoes-Finais-Antigravity.md` ("Dúvida em aberto: Original tem botão Clear? Ou só New Session que começa limpo?")

---

## 1. Conclusão da Investigação no OpenClaude

Após a raspagem aprofundada do código da extensão e do core do OpenClaude:

> **NÃO EXISTE BOTÃO "CLEAR CHAT" (LIMPAR CONVERSA ATUAL).**  
> Tanto o OpenClaude quanto as extensões de chat do VS Code trabalham exclusivamente com o modelo de **"New Session" (Nova Conversa)** e **"Resume Session" (Retomar Conversa)**.

---

## 2. Como Funciona o Ciclo de Vida da Sessão

No `chatProvider.js` do OpenClaude:

```javascript
// Quando o usuário clica para iniciar um novo chat:
case 'new_session':
  this._chatController.stopSession();
  webview.postMessage({ type: 'session_cleared' });
  // Uma nova sessão limpa é instanciada com novo sessionId
  break;

// Quando o usuário seleciona uma conversa do histórico:
case 'resume_session':
  this._chatController.stopSession();
  webview.postMessage({ type: 'session_cleared' });
  await this._loadAndDisplaySession(webview, msg.sessionId);
  await this._chatController.startSession({ sessionId: msg.sessionId });
  break;
```

### Explicação do Fluxo:
1. **Nova Conversa (`new_session`):**
   - O processo ativo da sessão anterior é finalizado (`stopSession()`).
   - A interface webview recebe a mensagem `{ type: 'session_cleared' }` apenas para limpar os elementos visuais do DOM e voltar ao estado de entrada limpo (ou empty state de 768px).
   - O histórico da sessão anterior permanece salvo em disco no seu arquivo `<sessionId>.jsonl`.
   - Um novo identificador de sessão (`UUID`) é gerado para a próxima mensagem enviada.
2. **Exclusão de Sessão:**
   - A exclusão de uma conversa só ocorre se o usuário clicar explicitamente na lixeira ao lado da sessão na lista de conversas, removendo o arquivo `.jsonl` do disco.

---

## 3. Decisão para o Agente Window (Fatia 06 e 08)

1. **Sem botão de "Limpar Chat" no cabeçalho:**
   - Evita perda acidental de histórico e simplifica a persistência.
2. **Botão "+" / "Nova Conversa" no topo:**
   - Limpa o painel central do chat.
   - Retorna para o *empty state* centralizado de 768px.
   - Ao digitar o primeiro prompt, aloca um novo `sessionId` e cria a sessão associada ao projeto ativo.
3. **Lista de Conversas:**
   - Exibe as sessões anteriores agrupadas por data/projeto, permitindo alternar entre elas a qualquer momento.
