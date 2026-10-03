# Plano de Componentes React — Fatia 06 (Carcaça & Sessões)

> **Diretório Alvo do Projeto:** `platform/apps/workbench-v2/src/`

---

## 1. Estrutura Modular dos Componentes

Para mantermos a arquitetura limpa (Princípio LEGO), a carcaça da Fatia 6 será organizada nos seguintes componentes:

```
src/
└── modules/
    └── agents-window/
        ├── index.ts                     (Barrel export do módulo)
        ├── contract.ts                  (Tipos: Session, Worktree, ModelConfig)
        ├── components/
        │   ├── AgentsWindowLayout.tsx   (Grid das 3 colunas + Header de navegação)
        │   ├── SessionsSidebar.tsx      (Coluna 1: Lista de sessões, grupos e botão Novo)
        │   ├── SessionItem.tsx          (Linha de sessão com estado ativo, hover e status)
        │   ├── AgentChatView.tsx        (Coluna 2: Breadcrumbs, histórico e input)
        │   ├── ChatInputBox.tsx         (Textarea com pastilhas Agent, meu-pool e botões)
        │   ├── InputPills.tsx           (Componente de pastilhas clicáveis)
        │   └── ChangesPanel.tsx         (Coluna 3: Abas Alterações/Arquivos e lista de diffs)
        └── state/
            └── sessionsStore.ts         (Gerenciamento de estado de sessões e ativação)
```

---

## 2. Contrato de Estado (Types)

```typescript
export interface AgentSession {
  id: string;
  title: string;
  workspaceName: string;
  worktreeBranch: string;
  status: 'idle' | 'working' | 'interrupted' | 'completed';
  createdAt: string;
  updatedAt: string;
  model: string;
  pool: string;
  modifiedFilesCount: number;
}
```

---

## 3. Checklist de Implementação da Fatia 6

- [ ] Criar estrutura base do `AgentsWindowLayout` com as 3 colunas proporcionais.
- [ ] Implementar `SessionsSidebar` com os itens `Automations`, `Customizations` e a seção `Sessões [Ctrl+N]`.
- [ ] Implementar seleção de sessão ativa com persistência no `localStorage`.
- [ ] Implementar cabeçalho com breadcrumbs dinâmicos vinculados à sessão ativa.
- [ ] Implementar `ChatInputBox` com layout arredondado e as pastilhas `Agent` e `meu-pool`.
- [ ] Implementar `ChangesPanel` na coluna direita com as abas `Alterações` e `Arquivos`.
