# 06F — Contrato de Implementação: Filesystem I/O

## Objetivo
Definir a camada de I/O como serviço de sistema, com atomicidade, locks e watchers.

## Responsabilidade do módulo
Listar, ler, escrever, mover, remover e observar recursos por URI, sem expor chamadas de disco diretamente aos módulos consumidores.

## Contratos mínimos
```ts
interface FileChangeEvent {
  watcherId: string;
  type: 'created' | 'updated' | 'deleted' | 'renamed';
  uri: string;
  oldUri?: string;
}
```

```ts
interface FileSystemPort {
  list(input: { uri: string }): Promise<Array<{ uri: string; name: string; kind: 'file' | 'directory' }>>;
  readFile(input: { uri: string }): Promise<{ content: string; encoding: 'utf-8' }>;
  writeFile(input: { uri: string; content: string; atomic: true }): Promise<void>;
  watch(input: { uri: string }): Promise<{ watcherId: string }>;
}
```

## Regras obrigatórias
- toda escrita é atômica;
- toda concorrência de escrita é serializada por recurso;
- watchers geram eventos padronizados;
- URIs são a interface pública, não caminhos hardcoded.

## Proibições
- chamar `fs.writeFile` diretamente de módulos consumidores;
- ignorar locking em operações concorrentes;
- vazar caminho absoluto do SO para a UI como contrato primário.
