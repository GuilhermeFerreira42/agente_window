# 01 — VISÃO E ESCOPO: AGENTE WINDOW

## 1. Objetivo do Projeto
O objetivo do projeto **AGENTE WINDOW** é a implementação de uma interface de desenvolvimento (IDE) de alta fidelidade, replicando a experiência de usuário e a arquitetura técnica do "Workbench" do Visual Studio Code. O foco central é a criação de um ambiente onde agentes de IA e desenvolvedores humanos colaborem em tempo real, com foco em fluidez, performance de renderização e precisão comportamental.

## 2. Escopo Funcional (Subsistemas Core)
O projeto é composto por 8 subsistemas interdependentes que formam a "Fonte da Verdade" técnica:

### 2.1. Interface de Shell e Layout
- **Left Sidebar (Barra Lateral Primária)**: Implementação da Activity Bar, gerenciamento de Viewlets (Explorer, Search, Git) e navegação rápida.
- **Right Sidebar (Barra Lateral Secundária)**: Container para views auxiliares, com suporte a modo maximizado e lógica de visibilidade independente.
- **Command Menu & Palette**: Sistema global de registro e execução de comandos via `ICommandService` e menus contextuais reativos.

### 2.2. Core de Desenvolvimento
- **Editor / Code Browser**: Implementação de um editor de texto de alta performance baseado em **Piece Table** e **B-Tree**, com virtualização de viewport e suporte a anotações semânticas.
- **Filesystem I/O**: Sistema de abstração de arquivos via `IFileSystemProvider`, suportando escritas atômicas, controle de concorrência e monitoramento de arquivos em tempo real.

### 2.3. Colaboração e IA
- **Center Chat (Copilot Chat Experience)**: Interface de chat centralizada para orquestração de agentes, com suporte a streaming de respostas, gestão de sessões e injeção de contexto do editor.
- **Terminal**: Emulação de terminal via `xterm.js` e `node-pty`, com suporte a múltiplos perfis de shell, splits de painéis e sincronização de CWD.

### 2.4. Fundação Visual
- **Theme & Token System**: Motor de estilização reativo baseado em tokens CSS, permitindo a troca instantânea de temas e a coloração semântica de código.

## 3. Fora de Escopo (Out of Scope)
Para garantir a fidelidade do núcleo do Workbench, os seguintes itens não fazem parte desta fase de implementação:
- Implementação de compiladores ou interpretadores de linguagens (utiliza-se a interface do LSP).
- Desenvolvimento de extensões de terceiros (foco é a infraestrutura de suporte a extensões).
- Sincronização de nuvem multi-dispositivo (foco é a experiência local/servidor).

## 4. Critérios de Sucesso
O projeto será considerado bem-sucedido quando:
1. **Fidelidade 1:1**: O comportamento de cada subsistema for indistinguível da implementação do VS Code (validado pelos Critérios de Aceite da Fase 2).
2. **Performance**: O editor mantiver 60 FPS durante o scroll e a digitação em arquivos de grande porte (> 1MB).
3. **Estabilidade**: As operações de I/O forem atômicas e resilientes a falhas de processo.
4. **Consenso**: A implementação seguir rigorosamente a "Fonte da Verdade" consolidada na Fase 3.
