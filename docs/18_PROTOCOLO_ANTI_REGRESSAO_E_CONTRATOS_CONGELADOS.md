# 18 — PROTOCOLO ANTI-REGRESSÃO E CONTRATOS CONGELADOS

> **Documento Normativo Obrigatório**  
> **Status:** Ativo / Vigente  
> **Data de Emissão:** 2026-09-14  
> **Público-Alvo:** Todas as IAs executoras (Arena, Claude, Gemini, Copilot, Cursor, etc.) e desenvolvedores humanos.

---

## 1. Objetivo e Princípio Fundamental
O objetivo deste documento é **blindar contra regressões** tudo o que já foi conquistado e homologado no projeto, especificamente nas **Fatias 01 (Layout Base), 02 (Barras e Navegação) e 03 (Terminal PTY Real e Painel)**.

### O Princípio da Não-Regressão (Zero-Regression Rule):
> *"Nenhuma implementação de nova funcionalidade (ex: FATIA-04 Explorer, FATIA-05 Search, etc.) tem permissão para alterar, desmontar, reescrever ou quebrar componentes estabilizados sem autorização expressa documentada."*

---

## 2. Mapa de Componentes Estabilizados e Níveis de Proteção

| Componente | Localização do Código | Nível de Proteção | Estado Homologado |
| :--- | :--- | :---: | :--- |
| **Terminal PTY Real** | `legacy/.../VSCodeTerminal.tsx` | 🔴 **BLINDADO** | ~85% fidelidade VS Code, WebSocket PTY real, digitação rápida, suporte a múltiplas instâncias. |
| **Estilos do Terminal** | `legacy/.../terminal-vscode.css` | 🔴 **BLINDADO** | Variáveis `--terminal-height`, tabs com hover de fechamento, sidebar estilizada, fontes monospace e cores oficiais do tema dark VS Code. |
| **Painel Inferior (Tabs)** | `legacy/.../VSCodeTerminal.tsx` | 🔴 **BLINDADO** | 5 abas reais (Problemas, Saída, Console de Depuração, Terminal, Portas), alternância preservando instâncias. |
| **Layout Base e Grids** | `legacy/.../App.css`, `App.tsx` | 🟡 **PROTEGIDO** | Contêineres flexíveis (`workbench-main`), dimensionamento dinâmico sem sobreposição. |
| **Topbar & Statusbar** | `legacy/.../components/` | 🟡 **PROTEGIDO** | Altura fixa das barras superior (`35px`) e inferior (`22px`), tokens CSS oficiais. |

---

## 3. Contratos Invioláveis da FATIA-03 (Terminal & Painel Inferior)

Qualquer alteração que toque direta ou indiretamente no terminal deve respeitar estritamente estas 5 regras:

### Regra 1: Altura e Redimensionamento via CSS Variable
- **Causa da lição aprendida:** O `.terminal-panel` em CSS possui `flex: 0 0 var(--terminal-height)`.
- **Contrato:** O redimensionamento por arrasto do splitter superior **DEVE** injetar a variável `--terminal-height` inline no elemento pai:
  ```tsx
  style={{
    ['--terminal-height' as string]: `${panelHeight}px`,
    height: `${panelHeight}px`,
  }}
  ```
- **Proibido:** NUNCA force `height: 100%` ou `height: auto` estático no `.terminal-panel` no CSS global, pois isso quebra o cálculo do drag resize.

### Regra 2: Visibilidade Condicional da Sidebar de Abas
- **Comportamento VS Code Real:** Quando há apenas **1 terminal** ativo, a barra lateral de abas de terminal **NÃO PODE APARECER**.
- **Contrato:**
  ```tsx
  const isTabsListVisible = instances.length > 1;
  // Se false: sidebar com display: none, terminal ocupa 100% da largura.
  // Se true: sidebar visível (140px a 160px), com lista vertical de terminais.
  ```
- **Proibido:** Tornar a sidebar do terminal estática ou fixa para sessão única.

### Regra 3: Preservação de Sessões PTY e Instâncias xterm.js
- **Contrato:** O socket WebSocket de cada terminal (`ws://localhost:.../pty`) e a instância `Terminal` do xterm.js pertencem à sessão ativa e não podem ser recriados desnecessariamente durante re-renders de React.
- **Proibido:** Não execute `new Terminal()` a cada render. Use `useRef` e instancie somente no ciclo de montagem/criação da aba.

### Regra 4: Fidelidade Visual dos Itens da Aba (Tabs)
- **Contrato:**
  - Item ativo: borda esquerda destacada em azul `#007acc` e fundo `#37373d`.
  - Botão de fechar (`x`): visível permanentemente na aba ativa e visível sob `:hover` nas abas inativas.
  - Indicador de divisão (split): uso de caracteres hierárquicos `┌ └ ├`.

### Regra 5: As 5 Abas do Painel
- **Contrato:** O cabeçalho do painel inferior contém 5 abas reais:
  1. Problemas (Problems)
  2. Saída (Output)
  3. Console de Depuração (Debug Console)
  4. Terminal
  5. Portas (Ports)
- Ao alternar entre essas abas, a instância ativa do terminal deve ficar oculta (`display: none`), mas **nunca destruída**, preservando comandos em execução em segundo plano.

---

## 4. Contratos Invioláveis de Layout (FATIA-01 e FATIA-02)

1. **Tokens de Altura:**
   - `--titlebar-height: 35px`
   - `--statusbar-height: 22px`
   - `--activitybar-width: 48px`
2. **Área Central (`workbench-main`):**
   - Deve ocupar todo o espaço restante via `flex: 1 1 auto; overflow: hidden; display: flex`.
   - As barras laterais (Explorer / Sidebar principal) entram à esquerda do Editor.
   - O painel do Terminal entra na parte inferior do Editor.
   - Nenhuma janela ou modal pode utilizar `position: fixed` com coordenadas absolutas que cubram permanentemente a barra de status ou a barra de título.

---

## 5. Checklist Obrigatório de Homologação Anti-Regressão

Antes de commitar ou aprovar qualquer mudança de nova fatia (ex.: FATIA-04 Explorer), a IA ou o desenvolvedor **DEVE** validar os seguintes pontos no navegador real (`http://localhost:5173`):

### 🧪 Bateria de Testes Rápidos (3 minutos):

1. **[ ] Teste de Resize do Terminal:**
   - Arrastar a borda superior do terminal para cima e para baixo.
   - Confirmar que o painel cresce e diminui suavemente e o xterm executa `fitAddon.fit()`.

2. **[ ] Teste de Sessão Única do Terminal:**
   - Garantir que existe apenas 1 sessão aberta.
   - Confirmar visualmente que a sidebar lateral de abas do terminal está **totalmente oculta** e o terminal ocupa 100% da largura útil.

3. **[ ] Teste de Múltiplas Sessões (Sidebar Dinâmica):**
   - Clicar no botão `+` (Novo Terminal).
   - Confirmar que a sidebar de abas aparece imediatamente exibindo `1: bash/powershell` e `2: bash/powershell`.
   - Alternar entre as abas clicando nelas e verificar se o foco do terminal muda.

4. **[ ] Teste de Fechamento de Aba:**
   - Clicar no `X` da segunda aba.
   - A segunda aba deve fechar e a sidebar de abas deve sumir imediatamente, voltando ao estado de sessão única.

5. **[ ] Teste de I/O Real do PTY:**
   - No terminal, digitar `echo "TESTE_ANTI_REGRESSAO"` ou `dir`.
   - Pressionar `Enter` e verificar se a saída do sistema operacional aparece no terminal sem atrasos e sem erros no console DevTools (F12).

6. **[ ] Teste de Layout Global:**
   - Verificar se a Statusbar continua no rodapé (`22px`).
   - Verificar se a Titlebar continua no topo (`35px`).
   - Verificar se o novo componente (ex: Explorer) respeita a área de visualização sem empurrar os demais para fora da tela.

---

## 6. Instruções Específicas para Prompts de Novas IAs (LMSYS Arena, Claude, Copilot)

Ao delegar a implementação de uma nova fatia para outra IA, **sempre adicione o seguinte trecho de instrução**:

```text
AVISO DE CONTRATO ANTI-REGRESSÃO:
As fatias 01, 02 e 03 (Layout base, Barras e Terminal PTY) já estão 100% finalizadas e homologadas em docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md.
É TERMINANTEMENTE PROIBIDO alterar, reescrever ou simplificar os arquivos:
- `src/components/terminal/VSCodeTerminal.tsx`
- `src/styles/terminal-vscode.css`
Sua nova implementação (ex: Explorer) deve se acoplar estritamente aos slots de componentes previstos na arquitetura sem quebrar o redimensionamento do terminal nem a comunicação PTY.
```

---
*Este documento é parte integrante do sistema de governança do projeto e sua violação invalida a entrega da sprint.*
