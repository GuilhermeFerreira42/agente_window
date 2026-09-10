# 05D - Gap Analysis: Editor / Code Browser

## 1. Comparativo: VS Code vs. Agente Window (Estado Atual)

| Recurso / Tecnologia | VS Code (Target) | Agente Window (Atual) | Status | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **Estrutura de Buffer** | Piece Table (R-B Tree) | Standard String / Array | ❌ Ausente | O projeto usa manipulação de strings simples, o que causará lag em arquivos > 1MB. |
| **Indexação de Linhas** | B-Tree Index | Linear Scan | ❌ Ausente | O cálculo de posição $(x, y)$ é feito via `split('\n')`, resultando em $O(N)$ em vez de $O(\log N)$. |
| **Virtualização de View** | Viewport Virtualization | DOM Rendering Completo | ⚠️ Parcial | Implementação básica de scroll, mas sem a lógica de renderização apenas de linhas visíveis. |
| **Sintaxe (Highlighter)** | Lexer $\rightarrow$ Tokens $\rightarrow$ CSS Vars | Regex Simples / Monaco Default | ⚠️ Parcial | Depende do Monaco, mas não implementa o sistema de tokens customizados do VS Code. |
| **Atomic Writes** | Temp File $\rightarrow$ Rename | Direct `fs.writeFile` | ❌ Ausente | Risco de corrupção de arquivos em caso de crash durante o salvamento. |
| **Sincronização FS** | Universal Watcher (OS Native) | Basic `fs.watch` | ⚠️ Parcial | Falta a robustez do `UniversalWatcherClient` para grandes árvores de diretórios. |

## 2. Análise de Impacto
A ausência da Piece Table e da Virtualização de View torna o editor inviável para arquivos de código reais de grande porte, resultando em travamentos da UI Thread durante a digitação ou scroll rápido.

## 3. Plano de Mitigação (Prioridades)
1. **Prioridade Crítica**: Implementar a Piece Table para garantir a performance de edição.
2. **Prioridade Alta**: Implementar a Virtualização de View (Viewport) para evitar gargalos de DOM.
3. **Prioridade Média**: Implementar o sistema de Atomic Writes no módulo de I/O.
