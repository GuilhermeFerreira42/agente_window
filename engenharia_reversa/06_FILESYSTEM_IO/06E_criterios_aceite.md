# 06E - Critérios de Aceite: Filesystem I/O

## 1. Critérios Funcionais (Executáveis)

### 1.1. Abstração de Provedores
- [ ] **GIVEN** a implementação de um novo `IFileSystemProvider` (ex: `S3Provider`) **WHEN** uma URI com esquema `s3://` é solicitada **THEN** o `FileService` deve delegar a operação automaticamente para o novo provedor sem alterar a lógica do Editor.
- [ ] **GIVEN** múltiplos provedores ativos **WHEN** o sistema solicita o `stat` de um arquivo **THEN** o provedor correto deve ser selecionado com base no esquema da URI.

### 1.2. Integridade e Concorrência
- [ ] **GIVEN** duas requisições de escrita simultâneas para o mesmo arquivo **WHEN** a primeira operação inicia **THEN** a segunda deve aguardar o `Barrier` de liberação da primeira, garantindo a ordem sequencial.
- [ ] **GIVEN** uma escrita atômica em andamento **WHEN** o sistema sofre um crash **THEN** o arquivo original deve ser preservado e o arquivo temporário deve ser descartado no próximo boot.

### 1.3. Observabilidade (Watching)
- [ ] **GIVEN** um projeto com 10k+ arquivos **WHEN** o `UniversalWatcher` é iniciado **THEN** o sistema deve detectar alterações em qualquer subdiretório sem estourar o limite de handles do sistema operacional.
- [ ] **GIVEN** a alteração de um arquivo via terminal externo **WHEN** o evento é capturado pelo Watcher **THEN** o Editor deve atualizar o buffer automaticamente em $< 100\text{ms}$.

## 2. Critérios Técnicos (Qualidade)
- [ ] **Performance**: A resolução de provedores via URI deve ocorrer em tempo constante $O(1)$.
- [ ] **Estabilidade**: O sistema de locks não deve gerar `deadlocks` em operações circulares de arquivos.
- [ ] **Compatibilidade**: O sistema deve suportar caminhos case-insensitive no Windows e case-sensitive no Linux através da interface de capacidades do provedor.
