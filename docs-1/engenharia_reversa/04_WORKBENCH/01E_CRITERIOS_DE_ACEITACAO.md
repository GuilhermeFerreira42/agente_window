# CAMADA E — CRITÉRIOS DE ACEITAÇÃO (Workbench / Layout / Tabs)

## 1. Matriz de Validação Executável

Estes critérios transformam as observações da Camada A e as regras da Camada B em testes de validação. Um recurso é considerado "Implementado" apenas quando todos os seus cenários de aceitação são satisfeitos.

### 1.1 Gestão de Visibilidade (Parts)
| ID | Cenário de Teste | Gatilho (Trigger) | Resultado Esperado (Expected) | Status |
|---|---|---|---|---|
| **AC-1.1** | Alternância de Sidebar | Acionar `toggleSidebar()` | A Sidebar deve sumir/aparecer e o Editor deve expandir/contrair instantaneamente para preencher o espaço. | [ ] |
| **AC-1.2** | Alternância de Painel | Acionar `togglePanel()` | O Painel inferior deve sumir/aparecer e o Editor deve ajustar sua altura verticalmente. | [ ] |
| **AC-1.3** | Conflito de Visibilidade | Ocultar Editor e Painel simultaneamente | O sistema deve impedir que ambas as áreas sumam, a menos que a Barra Auxiliar esteja maximizada (Fallback: exibir Painel). | [ ] |

### 1.2 Posicionamento e Dimensionamento
| ID | Cenário de Teste | Gatilho (Trigger) | Resultado Esperado (Expected) | Status |
|---|---|---|---|---|
| **AC-2.1** | Redimensionamento de Sidebar | Arrastar borda da Sidebar | A largura da Sidebar deve alterar em tempo real e a área do Editor deve ser recalculada sem saltos visuais. | [ ] |
| **AC-2.2** | Inversão de Lado | Alterar `sidebarPosition` para `RIGHT` | A Sidebar deve migrar para a direita e a Activity Bar deve se ajustar ao novo alinhamento. | [ ] |
| **AC-2.3** | Redimensionamento de Janela | Alterar tamanho da janela do Browser | Todas as partes do Workbench devem disparar `layout()` e ajustar suas dimensões proporcionalmente. | [ ] |

### 1.3 Modos de Foco e Estado
| ID | Cenário de Teste | Gatilho (Trigger) | Resultado Esperado (Expected) | Status |
|---|---|---|---|---|
| **AC-3.1** | Ativação de Zen Mode | Acionar `toggleZenMode(true)` | Activity Bar, Sidebar, Painel e Status Bar devem ser ocultados. O editor deve ser centralizado. | [ ] |
| **AC-3.2** | Desativação de Zen Mode | Acionar `toggleZenMode(false)` | Todas as partes devem retornar ao seu estado de visibilidade anterior ao modo Zen. | [ ] |
| **AC-3.3** | Persistência de Layout | Alterar layout $\rightarrow$ Reload Page | As posições e tamanhos das partes devem ser restaurados a partir do estado salvo no `localStorage`. | [ ] |

### 1.4 Gestão de Editores (Tabs & Groups)
| ID | Cenário de Teste | Gatilho (Trigger) | Resultado Esperado (Expected) | Status |
|---|---|---|---|---|
| **AC-4.1** | Split de Editor | Executar `splitEditor(vertical)` | O editor atual deve ser duplicado em uma nova coluna, dividindo o espaço horizontalmente em 50%/50%. | [ ] |
| **AC-4.2** | Fechamento de Grupo | Fechar o último grupo de editores | O sistema deve redistribuir as abas abertas para o grupo remanescente ou abrir um editor vazio. | [ ] |
| **AC-4.3** | Navegação de Abas | Clicar em uma aba inativa | O conteúdo do editor deve trocar instantaneamente para o documento da aba selecionada. | [ ] |

## 2. Definição de "Pronto" (DoD) para o Módulo de Workbench

O módulo de Workbench é considerado **Concluído** quando:
1. Todos os critérios de **AC-1.1 a AC-4.3** estão marcados como satisfeitos.
2. Não há "saltos" (visual glitches) durante o redimensionamento de partes.
3. O estado de layout é persistido e restaurado corretamente entre recarregamentos de página.
4. O código segue a arquitetura de 4 camadas (Motor $\rightarrow$ Workbench $\rightarrow$ Logic $\rightarrow$ Visual).
