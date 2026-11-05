# Comportamento de Tools e Painel de Alterações — Fatia 09

---

## 1. Gestão de Worktrees Isoladas
* Cada sessão cria automaticamente uma branch de trabalho isolada (ex.: `agents/greeting-response-oi`).
* As alterações feitas pelas tools do agente acontecem nessa worktree sem sujar a branch principal de trabalho do usuário.

## 2. Ações nos Arquivos da Sessão
* **Clique no Arquivo:** Abre a visualização de Diff lado a lado no editor central para comparar o antes e depois.
* **Botão `Accept All` / `Apply`:** Aplica as alterações validadas da sessão de volta para a branch de trabalho.
* **Botão `Discard`:** Descarta as alterações propostas pelo agente para aquele arquivo específico.
* **Aba `Arquivos`:** Permite explorar a árvore de arquivos completa da worktree para inspecionar novos arquivos criados pelo agente.
