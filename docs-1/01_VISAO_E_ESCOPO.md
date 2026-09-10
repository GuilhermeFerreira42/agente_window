# 01_VISAO_E_ESCOPO: AGENTE WINDOW

## 1. Visão Geral
O **AGENTE WINDOW** é um workbench modular projetado para replicar a experiência de alta fidelidade do VS Code, servindo como o ambiente de interface para sessões de agentes de software. O objetivo é fornecer um ecossistema onde a orquestração de agentes, a execução de código e a interação com o sistema de arquivos ocorram em uma interface familiar, fluida e extremamente performática.

## 2. Escopo do Projeto

### 2.1. Funcionalidades Core (In-Scope)
- **Terminal Avançado**: Sistema de terminais com suporte a múltiplos perfis, divisão de tela (split), persistência de sessão e integração profunda com o shell.
- **Navegação de Arquivos**: Explorador de arquivos modular com suporte a virtualização de diretórios e busca rápida.
- **Interface de Chat/Agente**: Painel de interação com agentes, suporte a streaming de respostas e renderização de artefatos.
- **Sistema de Abas e Layout**: Gerenciador de janelas dinâmico, permitindo arrastar, soltar e dividir painéis (Workbench).
- **Runtime de Execução**: Camada de motor (Motor) para execução de processos e comunicação via RPC/WebSockets.

### 2.2. Fora de Escopo (Out-of-Scope)
- **Compiladores Internos**: O projeto não implementa compiladores, mas sim consome shells e runtimes existentes.
- **Sistemas de Versionamento Complexos**: Integração com Git via CLI/API, mas não a implementação de um motor de Git interno.

## 3. Objetivos de Design (Design Goals)
- **Fidelidade Visual**: Replicar a "sensação" do VS Code (latência zero, transições suaves).
- **Modularidade**: Cada módulo (Terminal, Chat, Explorer) deve ser independente, comunicando-se através de uma camada de lógica centralizada.
- **Desempenho**: O "Motor" deve operar de forma assíncrona para garantir que a UI nunca trave, independentemente da carga do processo de backend.

## 4. Definição de "Pronto" (Definition of Done)
Um módulo é considerado pronto quando:
1. Passa por todo o processo de Engenharia Reversa (Camadas A $\rightarrow$ E).
2. Possui um `REBUILD-PLAN.md` aprovado.
3. A implementação segue a `IMPLEMENTATION_GUIDANCE.md`.
4. Todos os critérios de aceite da Camada E são validados.
