# Comportamento do Streaming e Estados de Mensagens — Fatia 08

---

## 1. Ciclo de Vida do Streaming de Resposta
1. **Início:** Ao enviar o prompt, surge o balão do usuário à direita e o container de resposta à esquerda com o card de criação da worktree.
2. **Pensamento (Thinking):** Exibe o spinner com a mensagem `Pensativo...` ou `Analisando arquivos...`.
3. **Streaming de Texto:** Os chunks de Markdown chegam e são renderizados progressivamente com o cursor piscante no final.
4. **Finalização:** O cursor desaparece, o botão de parar (`Stop`) volta a ser enviar (`Send`), e o rodapé registra a duração total e o modelo.

## 2. Ações nos Blocos de Código
* **Botão Copiar (`Copy`):** Copia o conteúdo do bloco de código para a área de transferência do sistema operacional e exibe temporariamente o ícone de Check verde.

## 3. Gestão de Interrupções (`Keep Going`)
* Se a requisição for interrompida pelo usuário ou por timeout, o agente exibe o aviso:
  `The agent was interrupted before this request finished.` com o botão de ação `Keep Going` para continuar do ponto onde parou.
