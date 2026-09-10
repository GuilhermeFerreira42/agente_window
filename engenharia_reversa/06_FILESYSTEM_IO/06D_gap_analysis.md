# 06D - Gap Analysis: Filesystem I/O

## 1. Comparativo: VS Code vs. Agente Window (Estado Atual)

| Recurso / Arquitetura | VS Code (Target) | Agente Window (Atual) | Status | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **Abstração de Provedores** | `IFileSystemProvider` (Strategy) | Singleton `FileService` | ⚠️ Parcial | O projeto usa um serviço central, mas não permite a troca dinâmica de provedores (ex: local vs remote). |
| **Esquemas de URI** | `file://`, `vscode-remote://`, etc. | Paths absolutos do Windows | ❌ Ausente | Não há suporte a URIs, dificultando a implementação de sistemas de arquivos virtuais ou remotos. |
| **Atomic Writes** | Temp File $\rightarrow$ Rename | Direct `fs.writeFile` | ❌ Ausente | Falta a garantia de atomicidade nas escritas. |
| **Concorrência (Locks)** | `ResourceMap<Barrier>` | Sem travas explícitas | ❌ Ausente | Risco de `Race Condition` ao ler/escrever o mesmo arquivo simultaneamente via WebSocket. |
| **Universal Watcher** | Processo separado / Parcel | `fs.watch` básico | ⚠️ Parcial | O monitoramento de arquivos falha em diretórios muito grandes devido ao limite de handles do OS. |
| **Buffering de IPC** | 256KB Chunks | Stream raw via WebSocket | ⚠️ Parcial | Falta a otimização de blocos para reduzir a sobrecarga de mensagens entre server e client. |

## 2. Análise de Impacto
A falta de uma arquitetura baseada em provedores e a ausência de travas de concorrência tornam o sistema instável para projetos de grande escala e impedem a evolução para suporte a SSH/Cloud, que é um pilar do VS Code.

## 3. Plano de Mitigação (Prioridades)
1. **Prioridade Alta**: Implementar o padrão de Provedores (`IFileSystemProvider`) e suporte a URIs.
2. **Prioridade Alta**: Implementar `ResourceLocks` para evitar corrupção de dados.
3. **Prioridade Média**: Implementar Atomic Writes.
4. **Prioridade Baixa**: Otimizar o buffering de IPC.
