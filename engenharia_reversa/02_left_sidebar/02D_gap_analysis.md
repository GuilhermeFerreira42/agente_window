# 02D - Gap Analysis: Left Sidebar

## 1. Comparativo: VS Code vs. Agente Window (Estado Atual)

| Recurso / Comportamento | VS Code (Target) | Agente Window (Atual) | Status | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **Estrutura de Componente** | `SidebarPart` (Composite Part) | Componente simples de Sidebar | ⚠️ Parcial | A estrutura básica existe, mas a lógica de "Composite Part" (estágios de visibilidade) é simplificada. |
| **Activity Bar (Rail)** | `ActivitybarPart` com ícones dinâmicos | Barra de ícones estática | ⚠️ Parcial | Os ícones estão presentes, mas a orquestração via `ActivityBarCompositeBar` não é completa. |
| **Troca de Viewlets** | Dinâmica via `IViewsService` | Troca de estado manual/estática | ⚠️ Parcial | A troca de views funciona, mas não segue o modelo de registro dinâmico de extensões. |
| **Modern UI (Floating)** | Card flutuante com margens externas | Sidebar colada na borda | ❌ Ausente | Não implementada a estética de "Floating Panels" da Modern UI. |
| **Auto-Hide Logic** | Baseada em `VisibleViewContainersTracker` | Sem lógica de auto-ocultação | ❌ Ausente | A Activity Bar não se oculta automaticamente com base no conteúdo. |
| **Posicionamento Rail** | Top, Bottom, Left, Right | Apenas Left | ❌ Ausente | O layout é fixo à esquerda; não há suporte a mudança de posição do rail. |

## 2. Análise de Impacto
A falta de flexibilidade no posicionamento e a ausência da Modern UI reduzem a fidelidade visual e a ergonomia do projeto em comparação ao VS Code, embora as funcionalidades básicas de navegação entre views estejam presentes.

## 3. Plano de Mitigação (Prioridades)
1. **Prioridade Média**: Implementar a lógica de auto-ocultação da Activity Bar.
2. **Prioridade Baixa**: Implementar a estética de "Floating Panels".
3. **Prioridade Baixa**: Adicionar suporte a múltiplas posições para o Rail (Activity Bar).
