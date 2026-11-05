# 04B - Comportamento do Subsistema Center Chat

Este documento descreve o comportamento funcional e o fluxo de interação do subsistema de chat central.

## Fluxo de Interação Principal

1. **Inicialização**:
   - O `ChatViewPane` é instanciado. Se não houver sessão ativa, o `ChatViewWelcomeController` exibe a tela de boas-vindas.
2. **Entrada do Usuário**:
   - O usuário interage com o `ChatInputPart`, digitando texto ou selecionando comandos de barra.
   - A submissão dispara um evento capturado pelo `ChatWidget`.
3. **Processamento e Requisição**:
   - O `ChatWidget` valida a entrada e chama o `IChatService` para enviar a mensagem ao modelo de IA.
   - O estado do chat é alterado para "enviando", possivelmente bloqueando a entrada ou mostrando um indicador de carregamento.
4. **Renderização da Resposta**:
   - À medida que a resposta chega (geralmente via streaming), o `ChatWidget` atualiza o `ChatListWidget`.
   - O `ChatListWidget` anexa a nova mensagem ao final da lista e ajusta o scroll automaticamente.
5. **Gestão de Sessões**:
   - O `ChatViewPane` permite a alternância entre diferentes sessões de chat, restaurando o estado do `ChatWidget` e a lista de mensagens correspondente.

## Estados do Sistema
- **Empty/Welcome**: Sem sessão ativa; exibe sugestões e guias.
- **Active**: Sessão em andamento; entrada habilitada e histórico visível.
- **Processing**: Aguardando resposta da IA; indicadores de progresso ativos.
- **Locked**: Quando um agente de codificação está realizando alterações no editor, a interface de chat pode entrar em modo de leitura ou aguardar a conclusão.
