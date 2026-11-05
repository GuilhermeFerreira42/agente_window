# PERMISSOES - Modelo de Permissoes e Confirmacao de Tools (OpenClaude + VS Code)

> **Data:** 2026-10-05  
> **Fonte:** `C:\Users\Usuario\Desktop\ARENA\a\openclaude\src\types\permissions.ts`, `src/utils/permissions/`, `src/utils/doomLoop.ts`, e `openclaude-vscode/src/chat/`  
> **Referência:** Pergunta 16 de `Decisoes-Finais-Antigravity.md` ("Pop-up 'Permitir? [Sim/Não/Sempre]' antes de write_file e run_terminal")

---

## 1. Modos de Permissao (Permission Modes)

O OpenClaude define modos globais que determinam a necessidade de confirmação:
- `default`: Pede confirmação para modificações de arquivos e comandos de terminal que alterem o sistema.
- `acceptEdits`: Aprova automaticamente ferramentas de edição de código (`Write`, `Edit`), mas continua solicitando autorização para comandos perigosos de terminal (`Bash` / `PowerShell`).
- `plan`: Modo somente leitura (planejamento) — todas as ações de escrita são bloqueadas.
- `bypassPermissions` / `fullAccess`: Permite todas as operações sem exibir pop-up.
- `dontAsk`: Nega sumariamente sem perguntar se a ferramenta não tiver permissão pré-concedida.

---

## 2. Comportamento das Decisões (`PermissionBehavior`)

O motor de permissão retorna três comportamentos básicos:
```ts
export type PermissionBehavior = 'allow' | 'deny' | 'ask';
```
- `allow`: Execução imediata sem interrupção do usuário.
- `deny`: Execução abortada imediatamente; devolve mensagem explicativa para a IA ajustar o plano.
- `ask`: Dispara requisição de controle (`control_request`) para a interface gráfica exibir o diálogo de confirmação.

---

## 3. Interface Visual do Pop-up no Chat (OpenClaude Webview)

Na extensão do VS Code (`openclaude-vscode/src/chat/chatRenderer.js` e `permissionResponse.js`), a confirmação é renderizada dentro da linha do tempo do chat como um card de alta visibilidade:

### Estrutura do Card de Permissão (`.perm-card`):
- **Título:** `.perm-title` indicando a ferramenta requerida (ex: `Permission Required: Bash` ou `Write`).
- **Detalhes da Ação:** `.perm-desc` e `.perm-input` mostrando o comando de terminal exato ou o arquivo e diff pretendido.
- **Três Botões de Ação (`.perm-actions`):**
  1. **Allow (`.perm-btn.allow`):** Aprova pontualmente esta chamada.
  2. **Deny (`.perm-btn.deny`):** Rejeita a operação e devolve `User denied permission` à IA.
  3. **Allow for Session (`.perm-btn.allow-session`):** Aprova a ferramenta e inclui nas sugestões persistidas para a sessão atual (`allow-session`).

### HTML Exato do Card (`chatRenderer.js`):
```html
<div class="perm-card" data-request-id="${requestId}" data-tool-use-id="${toolUseId}">
  <div class="perm-title">Permission Required: ${toolName}</div>
  <div class="perm-desc">The assistant wants to execute:</div>
  <pre class="perm-input">${formattedInput}</pre>
  <div class="perm-actions">
    <button class="perm-btn allow" onclick="handlePermission('${requestId}', 'allow')">Permitir</button>
    <button class="perm-btn deny" onclick="handlePermission('${requestId}', 'deny')">Não</button>
    <button class="perm-btn allow-session" onclick="handlePermission('${requestId}', 'allow-session')">Sempre na Sessão</button>
  </div>
</div>
```

### CSS Exato do Card (`chatRenderer.js`):
```css
/* ── Permission card ── */
.perm-card {
  margin: 8px 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--oc-perm-border);
  background: var(--oc-perm-bg);
}
.perm-title {
  font-weight: 700;
  font-size: 12px;
  color: var(--oc-critical, #ff8a6c);
  margin-bottom: 6px;
}
.perm-desc {
  font-size: 12px;
  color: var(--oc-text-dim, #dcc3aa);
  margin-bottom: 8px;
}
.perm-input {
  padding: 6px 8px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  font-family: var(--vscode-editor-font-family, Consolas, monospace);
  font-size: 11px;
  color: var(--oc-text-dim, #dcc3aa);
  white-space: pre-wrap;
  max-height: 120px;
  overflow-y: auto;
}
.perm-actions {
  display: flex;
  gap: 6px;
}
.perm-btn {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: filter 120ms ease;
}
.perm-btn.allow {
  background: rgba(232, 184, 107, 0.14);
  border-color: var(--oc-positive, #e8b86b);
  color: var(--oc-positive, #e8b86b);
}
.perm-btn.deny {
  background: rgba(255, 138, 108, 0.1);
  border-color: var(--oc-critical, #ff8a6c);
  color: var(--oc-critical, #ff8a6c);
}
.perm-btn.allow-session {
  background: rgba(232, 184, 107, 0.08);
  border-color: rgba(232, 184, 107, 0.4);
  color: var(--oc-text-dim, #dcc3aa);
}
.perm-btn:hover {
  filter: brightness(1.15);
}
```

### Payload de Resposta (`permissionResponse.js`):
```js
function buildPermissionControlResult(action, ctx = {}) {
  if (action === 'deny') {
    return { behavior: 'deny', message: 'User denied permission', toolUseID: ctx.toolUseId };
  }
  const result = { behavior: 'allow', updatedInput: ctx.input, toolUseID: ctx.toolUseId };
  if (action === 'allow-session') {
    result.updatedPermissions = ctx.permissionSuggestions || [];
  }
  return result;
}
```

---

## 4. Proteção contra Loops Infinitos de Tools (`doomLoop.ts`)

Conforme especificado na Pergunta 16 ("doom loop permission after 3 identical tool calls"), o OpenClaude implementa um rastreador estrito em `src/utils/doomLoop.ts`:
- **Assinatura:** Calcula o hash SHA-256 do par `toolName + JSON.stringify(input)`.
- **Contador por Agente:** Mantém histórico isolado por agente (`stateByAgent`).
- **Limite:** Padrão de **3 chamadas idênticas consecutivas**.
- **Bloqueio:** Se a ferramenta e seus argumentos forem repetidos pela 3ª vez sem alterações externas observáveis, o sistema bloqueia a chamada e devolve erro para o modelo:
  ```text
  Blocked: 3 consecutive calls to this tool with identical input — you are likely in a loop.
  Change the input, try a different tool, or ask the user for help.
  ```

---

## 5. Implementação no Agente Window (Fatia 08)

1. Para comandos de leitura (`read_file`, `list_files`, `search_files`): auto-aprovados (`allow`).
2. Para comandos de escrita e execução (`write_file`, `edit_file`, `run_terminal`):
   - Exibir card inline com botões: **[Permitir]**, **[Não]**, **[Sempre na Sessão]**.
3. Incorporar o algoritmo do `checkDoomLoop` para abortar ciclos travados do modelo.
