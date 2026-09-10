# 05E - Critérios de Aceite: Editor / Code Browser

## 1. Critérios Funcionais (Executáveis)

### 1.1. Performance de Edição (Piece Table)
- [ ] **GIVEN** um arquivo de 10MB (100k+ linhas) **WHEN** o usuário insere um caractere na linha 50.000 **THEN** a mutação do buffer deve ocorrer em $< 10\text{ms}$, sem travar a UI.
- [ ] **GIVEN** a inserção de um bloco de texto grande via colar (paste) **WHEN** a operação é executada **THEN** a Piece Table deve criar novas peças sem duplicar o conteúdo original no buffer de adição.

### 1.2. Renderização Eficiente (Viewport)
- [ ] **GIVEN** um arquivo com 1.000 linhas **WHEN** o usuário faz scroll rápido **THEN** o DOM deve conter apenas as linhas visíveis $\pm 5$ linhas de margem, mantendo a taxa de 60 FPS.
- [ ] **GIVEN** o scroll para o final do arquivo **WHEN** a posição é atingida **THEN** a renderização deve ser instantânea, utilizando o B-Tree para saltar para o offset final.

### 1.3. Integridade de Dados (Atomic Writes)
- [ ] **GIVEN** um processo de salvamento em andamento **WHEN** o processo é interrompido abruptamente (crash) **THEN** o arquivo original no disco deve permanecer intacto e sem corrupção.

## 2. Critérios Técnicos (Qualidade)
- [ ] **Complexidade**: Operações de inserção e deleção no buffer devem ter complexidade temporal $O(\log N)$ no pior caso.
- [ ] **Memória**: O uso de memória do editor não deve crescer linearmente com o número de edições (graças à Piece Table).
- [ ] **Acessibilidade**: O cursor deve ser compatível com leitores de tela, expondo a linha e coluna corretas via ARIA.
