# 00 — ÍNDICE DA FONTE DA VERDADE: AGENTE WINDOW

Este documento serve como o mapa mestre da documentação técnica do projeto. A "Fonte da Verdade" é a especificação definitiva para a implementação do sistema, consolidando a engenharia reversa do VS Code com a visão do projeto.

## 1. Documentos Fundacionais
Documentos que definem a base estratégica e a arquitetura global.
- **[01 — Visão e Escopo](01_VISAO_E_ESCOPO.md)**: Objetivo, escopo funcional e critérios de sucesso.
- **[02 — Arquitetura](02_ARQUITETURA.md)**: Modelo de 4 camadas e fluxos globais de dados.
- **[03 — Tecnologias](03_TECNOLOGIAS.md)**: Stack tecnológica, componentes especializados e matriz de complexidade.
- **[05 — Runtime](05_RUNTIME.md)**: Modelo de execução híbrido e ponte de comunicação.
- **[06 — Requisitos Não Funcionais](06_REQUISITOS_NAO_FUNCIONAIS.md)**: Performance, estabilidade e segurança.
- **[07 — Método de Execução](07_METODO_DE_EXECUCAO.md)**: Guia de implementação e validação.
- **[08 — Protocolos e Proibições](08_PROTOCOLS_AND_PROHIBITIONS.md)**: Leis arquiteturais para evitar drift.
- **[09 — Glossário e Referências](09_GLOSSARY_AND_REFERENCES.md)**: Terminologia técnica e mapa de referências do `vscode-main`.

## 2. Módulos Técnicos (A Especificação)
Documentação detalhada de cada subsistema, dividida em Visão Geral, Componentes, Regras de Comportamento, Mapa Técnico e Critérios de Aceite.
- **[04 — Módulo: Terminal](04_MODULOS/04_TERMINAL.md)**
- **[05 — Módulo: Left Sidebar](04_MODULOS/05_LEFT_SIDEBAR.md)**
- **[06 — Módulo: Right Sidebar](04_MODULOS/06_RIGHT_SIDEBAR.md)**
- **[07 — Módulo: Center Chat](04_MODULOS/07_CENTER_CHAT.md)**
- **[08 — Módulo: Editor](04_MODULOS/08_EDITOR.md)**
- **[09 — Módulo: Filesystem I/O](04_MODULOS/09_FILESYSTEM_IO.md)**
- **[10 — Módulo: Command Menu](04_MODULOS/10_COMMAND_MENU.md)**
- **[11 — Módulo: Theme & Token](04_MODULOS/11_THEME_TOKEN.md)**

## 3. Rastreabilidade de Extração
Cada módulo acima foi derivado de um processo de extração de 5 camadas localizado em:
`agente_window/engenharia_reversa/[XX]_.../`
- **Camada A**: Inventário Observável
- **Camada B**: Regras de Comportamento
- **Camada C**: Mapa de Código
- **Camada D**: Gap Analysis
- **Camada E**: Critérios de Aceite

## 4. Status de Consenso
Este conjunto de documentos foi validado através de um processo de **Hive-Mind Consensus**, garantindo que:
1. Não existem contradições entre os módulos.
2. Todos os comportamentos órfãos foram resolvidos.
3. A fidelidade técnica ao `vscode-main` é de 1:1.
