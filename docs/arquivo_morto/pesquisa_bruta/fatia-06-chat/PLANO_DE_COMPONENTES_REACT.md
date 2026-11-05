# Plano de Componentes React — Fatia 06 (Carcaça & Sessões Reais)

> **Diretório Alvo do Projeto:** `platform/apps/workbench-v2/src/`  
> **Arquitetura:** Princípio LEGO (aditivo, sem quebrar módulos homologados)

---

## 1. Mapeamento de Componentes Existentes e Ajustes

Ao contrário do plano anterior (que tentava recriar a aplicação do zero), a Fatia 6 **aproveita a carcaça já existente** em `workbench-v2`, apenas conectando-a à realidade:

| Componente Existente | Função na Fatia 6 | O que ajustar |
|---|---|---|
| `components/SessionSidebar.tsx` | Coluna da esquerda (Lista de Sessões) | Desconectar do mock `initialSessions` de `src/data.ts`. Conectar ao serviço real de sessões, renderizar agrupamento por pasta do workspace e empty state `Sem chats`. |
| `components/SessionLanding.tsx` | Empty State Central (768px) | Ajustar max-width para **768px** exatos, placeholder para *"O que há de próximo em seu roteiro?"*, título em inglês e botões de pastilhas `{/} Agent` e `Auto`. |
| `components/ChatPanel.tsx` | Histórico da conversa ativa | Renderizar mensagens reais da sessão em vez de arrays fixos (`setupMessages`/`waitingMessages`). Exibir barra fina no topo (`• Greeting in Portuguese ...`). |
| `components/ChatInput.tsx` | Input fixado no rodapé | Já está no rodapé do `ChatPanel`. Manter a ancoragem e ligar o envio à criação de turnos na conversa ativa. |
| `domain/sessionsService.ts` | Serviço de gerenciamento de sessões | Implementar criação (`createSession`), persistência local/em disco, exclusão e troca de sessão ativa. |
| `data.ts` | Arquivo de dados estáticos | **Remover todos os mocks de chat/sessão** (`setupMessages`, `waitingMessages`, `layoutMessages`, `errorMessages`, `initialSessions`). |

---

## 2. Componentes e Módulos INTOCÁVEIS (Proibido Alterar)

* `shell/sideBar/**` e `shell/activityBar/**` (Chassi direito homologado)
* `modules/explorer-search/**` (Explorer, Busca e Git)
* `components/terminal/**` e `components/TerminalPanel.tsx` (Terminal PTY real)
* `singlePort.ts` e `vite-plugin-pty.ts` (Servidor e plugins Vite)

---

## 3. Checklist de Execução para a IA Executora

- [ ] **Limpeza de Mocks:** Isolar e remover a dependência de dados mockados em `src/data.ts` para as telas de chat e sessões.
- [ ] **Empty State de 768px:** Validar que `SessionLanding.tsx` respeita exatamente a largura máxima de 768px, textos e pastilhas da régua 1.135.0.
- [ ] **Transição Automática:** Garantir que ao clicar em `Novo [Ctrl+N]` a tela exibe o `SessionLanding` de 768px no centro; e ao submeter a primeira mensagem, a tela chaveia para `ChatPanel` com cabeçalho superior e input no rodapé.
- [ ] **Persistência de Sessões:** Garantir que cada nova sessão criada pelo usuário aparece na `SessionSidebar` sob a pasta `agente_window` e permanece salva após recarregar a página (F5).
- [ ] **Zero Regressão:** Conferir que a `Side Bar` (274px), a `Activity Bar` (48px) e o terminal inferior continuam 100% íntegros e funcionais.
