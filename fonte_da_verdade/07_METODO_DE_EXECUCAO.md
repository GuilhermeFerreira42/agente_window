# 07 — MÉTODO DE EXECUÇÃO (GUIDE DE IMPLEMENTAÇÃO)

Este documento serve como o guia operacional para a equipe de desenvolvimento. Ele define como a "Fonte da Verdade" deve ser utilizada para traduzir a documentação técnica em código funcional, garantindo que a fidelidade 1:1 com o VS Code seja mantida.

## 1. Fluxo de Implementação (Pipeline)

Para cada funcionalidade, o desenvolvedor deve seguir rigorosamente a seguinte sequência:

1. **Consulta ao Módulo**: Localizar o módulo correspondente em `04_MODULOS/` para entender a visão geral e as regras de comportamento.
2. **Análise do Mapa Técnico**: Verificar a seção "Mapa de Implementação Técnica" para identificar as classes e arquivos de referência no `vscode-main`.
3. **Estudo da Referência**: Ler o código original no `vscode-main` para entender a implementação exata do algoritmo ou padrão de design.
4. **Implementação no Agente Window**: Traduzir a lógica para a stack tecnológica do projeto (React 18, TypeScript, Node.js).
5. **Validação via Critérios de Aceite**: Executar os testes baseados na seção "Critérios de Aceite" do módulo. A funcionalidade só é considerada "Done" quando todos os itens do checklist são marcados.

## 2. Padrões de Implementação Obrigatórios

Para evitar o "architectural drift", as seguintes regras devem ser seguidas:

### 2.1. Padrão de Serviços
- **Interfaces Primeiro**: Toda funcionalidade nova deve começar com a definição de uma interface (ex: `IService`) em um arquivo de tipos comum.
- **Injeção de Dependência**: Componentes não devem instanciar serviços diretamente. Devem recebê-los via props ou contexto, facilitando a substituição por mocks em testes.

### 2.2. Gestão de Estado
- **Fluxo Unidirecional**: O estado deve fluir de `Input` $\rightarrow$ `Logic` $\rightarrow$ `State Update` $\rightarrow$ `UI`. Nunca altere o estado da UI diretamente de dentro de um serviço.
- **Imutabilidade**: Estados globais (Zustand/Redux) devem ser tratados como imutáveis.

### 2.3. Comunicação Cross-Subsystem
- **Proibição de Acoplamento**: É proibido importar componentes de UI de um módulo dentro de outro módulo. A comunicação deve ocorrer via:
    - **Comandos**: Usando o `ICommandService` para disparar ações.
    - **Eventos**: Através de emitters de eventos ou hooks reativos.
    - **Serviços**: Via interfaces de serviço compartilhadas.

## 3. Estratégias de Teste e Validação

### 3.1. Testes de Fidelity (Fidelidade)
O desenvolvedor deve realizar o "Teste do Espelho":
1. Abrir o VS Code original e o AGENTE WINDOW lado a lado.
2. Executar a mesma sequência de ações em ambos.
3. Comparar a resposta visual, o tempo de reação e o comportamento de borda.
4. Qualquer divergência deve ser tratada como um bug de fidelidade.

### 3.2. Testes de Stress de Performance
Para módulos core (Editor, Terminal), é obrigatório:
- **Teste de Volume**: Abrir arquivos de > 10MB e verificar se a UI continua respondendo.
- **Teste de Concorrência**: Disparar múltiplas requisições de I/O simultâneas para validar os `ResourceLocks`.

## 4. Gestão de Mudanças na "Fonte da Verdade"

A "Fonte da Verdade" é um documento vivo, mas protegido:
- **Proibição de Alteração Ad-hoc**: Nenhum desenvolvedor pode alterar a documentação técnica para "ajustar" o código a uma limitação técnica.
- **Processo de Revisão**: Se for descoberta uma discrepância entre a documentação e o comportamento real do VS Code, o desenvolvedor deve:
    1. Documentar a descoberta.
    2. Propor a alteração via PR na pasta `fonte_da_verdade/`.
    3. Aguardar a aprovação do Arquiteto antes de alterar a implementação.

## 5. Checklist de "Definition of Done" (DoD)

- [ ] Implementação segue a arquitetura de 4 camadas.
- [ ] Referências do `vscode-main` foram consultadas e aplicadas.
- [ ] Interface de serviço foi definida e documentada.
- [ ] Todos os Critérios de Aceite do módulo foram validados.
- [ ] Teste do Espelho (Fidelidade 1:1) passou.
- [ ] Nenhuma regressão de performance foi introduzida.
- [ ] Código segue as regras de tipagem estrita e documentação JSDoc.
