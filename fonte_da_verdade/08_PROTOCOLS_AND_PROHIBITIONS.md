# 08 — PROTOCOLOS E PROIBIÇÕES (ARQUITETURAL LAW)

Este documento define as "Leis" do projeto AGENTE WINDOW. O objetivo é evitar o *architectural drift* (desvio arquitetural), onde a pressa por funcionalidades leva a atalhos técnicos que comprometem a estabilidade, a performance e a fidelidade ao VS Code. O descumprimento destas regras é considerado um erro crítico de arquitetura.

## 1. Protocolos de Comunicação

### 1.1. Fluxo de Dependência Descendente
As dependências entre as camadas da arquitetura devem ser estritamente descendentes:
`Visual Interface` $\rightarrow$ `Workbench Logic` $\rightarrow$ `Workbench Shell` $\rightarrow$ `Agent Runtime`.
- **Proibição**: Componentes do `Agent Runtime` nunca devem importar ou ter conhecimento de componentes da `Visual Interface`.

### 1.2. Desacoplamento de Subsistemas
Subsistemas (ex: Editor e Chat) são entidades isoladas.
- **Protocolo**: A comunicação entre eles deve ocorrer exclusivamente através de serviços de interface (`I...Service`).
- **Proibição**: É terminantemente proibido importar classes internas de um módulo para dentro de outro (ex: importar `PieceTable` do Editor dentro do módulo de Chat).

### 1.3. Sincronização de Estado
Toda mudança de estado que afete múltiplos subsistemas deve passar pelo `Command Registry`.
- **Protocolo**: `Ação` $\rightarrow$ `CommandService` $\rightarrow$ `Lógica de Negócio` $\rightarrow$ `Atualização de Estado` $\rightarrow$ `Notificação da UI`.

## 2. Proibições Técnicas (The "Never" List)

### 2.1. I/O e Persistência
- **NUNCA** escreva diretamente no disco usando `fs.writeFile` ou similar. Use obrigatoriamente o `IFileService` para garantir a atomicidade e o sequenciamento de I/O.
- **NUNCA** utilize caminhos absolutos hardcoded. Utilize a abstração de `URI` para permitir a portabilidade para sistemas remotos.

### 2.2. Performance e Renderização
- **NUNCA** renderize o conteúdo completo de um arquivo no DOM. A Virtualização de Viewport é obrigatória para qualquer visualização de texto.
- **NUNCA** execute processamento pesado (como análise de AST ou Regex complexas) na UI Thread. Utilize Web Workers para qualquer tarefa que possa causar "jank" na interface.

### 2.3. Estilização
- **NUNCA** defina cores fixas (hex/rgb) dentro de arquivos CSS ou componentes. Utilize exclusivamente as variáveis CSS injetadas pelo `WorkbenchThemeService` (ex: `var(--vscode-editor-foreground)`).
- **NUNCA** altere a estrutura do DOM para forçar um estilo visual; utilize as classes de tokens do sistema de temas.

## 3. Regras de Integridade de Buffer

### 3.1. Mutação de Texto
- **Protocolo**: Todas as alterações de texto devem ser processadas pela `Piece Table`.
- **Proibição**: É proibido converter o buffer do editor em uma string única para realizar substituições globais (`string.replace`), pois isso destrói a performance de $O(1)$ e a pilha de Undo/Redo.

### 3.2. Sincronização de IA
- **Protocolo**: Quando um agente de IA estiver modificando o código, o `EditorLockService` deve ser ativado.
- **Proibição**: Não permita a entrada de texto do usuário enquanto o estado `isLocked` for verdadeiro.

## 4. Governança de Código

### 4.1. Alteração da "Fonte da Verdade"
- **Protocolo**: Mudanças na documentação técnica devem ser propostas via PR e revisadas pelo Arquiteto.
- **Proibição**: É proibido alterar a implementação para "dar match" com uma documentação errada. Se a documentação está errada, altera-se a documentação primeiro.

### 4.2. Tipagem
- **Protocolo**: Todo serviço deve ter sua interface definida em um arquivo `.ts` separado.
- **Proibição**: O uso do tipo `any` em interfaces de serviço é tratado como um erro de compilação.
