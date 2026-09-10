# 03D - Gap Analysis: Right Sidebar (Auxiliary Bar)

## 1. Comparativo: VS Code vs. Agente Window (Estado Atual)

| Recurso / Comportamento | VS Code (Target) | Agente Window (Atual) | Status | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **Estrutura de Componente** | `AuxiliaryBarPart` (Composite Part) | Não implementada / Componente simples | ❌ Ausente | Necessário implementar a lógica de Composite Part para hospedar múltiplas views. |
| **Toggle Visibility** | `workbench.action.toggleAuxiliaryBar` | Sem comando dedicado | ❌ Ausente | Atualmente não há controle de visibilidade para a barra secundária. |
| **Modo Maximizado** | Oculta Editor e Painel, ocupa 100% | Não implementado | ❌ Ausente | Falta a lógica de exclusão mútua de visibilidade no Layout Service. |
| **Hospedagem de Views** | Dinâmica via `ViewContainerLocation` | Estática / Hardcoded | ⚠️ Parcial | O projeto possui painéis, mas não a infraestrutura de registro dinâmico de views. |
| **Configuração de Labels** | `secondarySideBar.showLabels` | Sem suporte | ❌ Ausente | A UI não reage a configurações de exibição de rótulos. |
| **Foco de Teclado** | `workbench.action.focusAuxiliaryBar` | Foco manual via DOM | ⚠️ Parcial | Falta o gerenciamento de foco via Context Keys. |

## 2. Análise de Impacto
A ausência da Right Sidebar reduz a capacidade de "multitarefa" do usuário, forçando-o a alternar entre a barra primária e o editor, enquanto o VS Code permite a visualização simultânea de documentação/auxiliares à direita.

## 3. Plano de Mitigação (Prioridades)
1. **Prioridade Alta**: Implementar o `AuxiliaryBarPart` e a ação de Toggle.
2. **Prioridade Média**: Implementar o modo maximizado.
3. **Prioridade Baixa**: Implementar o sistema de registro de views dinâmicas.
