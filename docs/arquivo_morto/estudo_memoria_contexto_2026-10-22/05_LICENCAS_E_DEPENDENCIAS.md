# Licenças, dependências e possibilidade de reutilização

**Propósito:** separar referência de comportamento de cópia de código. Não é parecer jurídico; qualquer transplantação exige revisão de notices, commits e dependências por arquivo.

## 1. Resumo de reutilização

| Referência | Licença/proveniência verificada | Reutilização sugerida |
|---|---|---|
| OpenClaude | `LICENSE` do ZIP afirma código derivado do Claude Code CLI proprietário; MIT cobre modificações/aditamentos dos contribuidores apenas “where legally permissible”; o próprio aviso diz que o projeto não tem autorização da Anthropic para distribuir o código proprietário e manda usuários avaliarem sua posição. | **Não copiar código** deste snapshot sem análise legal e proveniência arquivo a arquivo. Usar só para entender responsabilidades/fluxos. |
| Open WebUI | Repositório multi-licenciado por data/origem: histórico MIT, depois BSD-3, e contribuições/modificações após `60d84a3...` sob “Open WebUI License”, que inclui cláusula de marca; docs oficiais explicam exceções. O arquivo `context_compaction.py` foi alterado em 2026 no histórico público (`17e649...`), então não presumir licença permissiva antiga. | **Não copiar o arquivo de compaction** até mapear a licença do arquivo/trechos e a cláusula de branding. Preferir reimplementar comportamento com contrato próprio. Não classificar como AGPL. |
| VS Code / Copilot | `vscode-main/LICENSE.txt` e `extensions/copilot/LICENSE.txt` no ZIP declaram MIT. Arquivos selecionados trazem cabeçalho Microsoft MIT. Repositório também contém `ThirdPartyNotices.txt` e dependências licenciadas separadamente. | Trechos pequenos podem ser reaproveitáveis com licença/avisos/atribuição, após verificar cabeçalho, arquivo de extensão e terceiros; APIs internas e grande árvore de dependências tornam cópia direta imprática. Padrões são preferíveis. |
| Cline | `cline/cline` declara Apache-2.0; o snapshot auditado é commit `590785eff565f167b16d5f750d682c4d9d2b7128` (pós-v2.0 license switch). | Licença permite adaptação conforme suas condições; preservar LICENSE, notices, alterações e patentes/atribuição aplicáveis. Não copiar SDK inteiro: selecionar algoritmo/contrato e conferir dependências do arquivo. |
| OpenCode | Repositório declara MIT; commit auditado `5bae6d48aeba7db7fddb7d9a4456f6b74a298549`. | Componentes isolados são candidatos com avisos de copyright/licença; adaptar é mais leve que importar stack SolidJS/Bun/DB. Não copiar sem conferir cabeçalho e dependências transitivas. |

## 2. Correções importantes sobre licenças

Fontes oficiais úteis para a conferência final: [Open WebUI LICENSE](https://github.com/open-webui/open-webui/blob/main/LICENSE), [LICENSE_NOTICE](https://github.com/open-webui/open-webui/blob/main/LICENSE_NOTICE), [histórico de licença](https://github.com/open-webui/open-webui/blob/main/LICENSE_HISTORY), [OpenClaude LICENSE/NOTICE](https://github.com/Twigpine/openclaude/blob/a63ad4a9e0173137de203cafbc18b3bbcd3a4f9e/LICENSE), [Cline LICENSE](https://github.com/cline/cline/blob/590785eff565f167b16d5f750d682c4d9d2b7128/LICENSE), [OpenCode LICENSE](https://github.com/anomalyco/opencode/blob/5bae6d48aeba7db7fddb7d9a4456f6b74a298549/LICENSE). O código VS Code/Copilot lido no ZIP contém `LICENSE.txt` e `extensions/copilot/LICENSE.txt`; ambos declaram MIT no snapshot local.


- Uma pesquisa anterior sugeriu “AGPL” para Open WebUI; isso **não descreve o código-fonte auditado**. A licença atual é própria, por proveniência, com requisito de branding em certas distribuições; as contribuições antigas mantêm licenças históricas. Consultar [docs oficiais de licença](https://docs.openwebui.com/license/) e `LICENSE_HISTORY` antes de qualquer uso.
- O aviso OpenClaude não permite concluir que todo arquivo daquele repositório é MIT. O próprio documento distingue modificações de código derivado/proprietário; tratar a árvore como não liberada para cópia até auditoria jurídica.
- “Código acessível”, “repo público” e “licença do repositório” não significam que todos os modelos, assets, snippets e dependências sejam reutilizáveis sob o mesmo termo.

## 3. Licença do Agente Window e risco de inbound

- `platform/apps/workbench-v2/package.json` marca workspaces como `private: true`; isso evita publicar via npm por padrão, mas **não concede licença de uso de código externo** nem define licença do próprio projeto.
- Não foi encontrado `LICENSE*`, `NOTICE*` ou `COPYING*` na raiz do checkout em `/home/user/agente_window` até profundidade 2. O repositório não pôde ser identificado por Git neste workspace.
- **Risco alto antes de copiar código:** não há licença do projeto local identificada, nem processo de atribuição/notices descrito no código auditado. Recomendação: reaproveitar padrões; se cópia literal for aprovada, esclarecer licença do produto e preparar notices compatíveis.

## 4. Dependências e adequação técnica

### Já existentes no Agente Window

- `better-sqlite3` é dependência de `platform/apps/workbench-v2/package.json` e já é usado em `src/server/session-persistence/database.ts`. Isso torna SQLite uma opção natural para metadados/checkpoints/índice, mas **não prova** que a biblioteca instalada tenha FTS5 compilado. Confirmar `PRAGMA compile_options`/`CREATE VIRTUAL TABLE ... USING fts5` em teste antes de assumir.
- Não foi encontrada dependência tokenizer, embedding, vector store ou biblioteca de contexto. Nenhuma nova dependência deve entrar nesta fase documental.
- O app já tem quatro protocolos (OpenAI Chat, Anthropic, Gemini, Ollama), cada um com formas diferentes de uso e streaming. Normalização precisa ficar nos adaptadores, não em um contador universal presumido.

### Referências que não são drop-in

- OpenClaude traz runtime Bun/CLI, APIs de Claude Code e muitos pacotes; além do risco de proveniência, não se encaixa como dependência pequena em React/Node/Vite.
- Open WebUI é backend Python grande e modelo de dados próprio; não copiar camada inteira para o monólito TypeScript.
- VS Code/Copilot usa serviços internos de instantiation/observables, API de extensão e modelos próprios; o widget não é um componente independente para importar.
- Cline e OpenCode podem fornecer algoritmos/contratos, mas a integração atravessa runtimes, storage e protocolos distintos. Importar SDKs inteiros acrescentaria contratos e dependências maiores que a necessidade.

## 5. Política de seleção de componente

Para cada arquivo/dependência proposto numa futura fatia, registrar: (a) commit/tag e origem oficial; (b) licença do arquivo e notices; (c) licença de dependências diretas/transitivas; (d) código copiado versus comportamento reimplementado; (e) alterações e atribuição; (f) plano de atualização/vulnerabilidades; (g) aprovação legal/produto quando necessária.

**Resultado atual:** a reutilização recomendada é de padrões testáveis (sidecar com fingerprint, eventos de compaction, FTS de índice derivado e pipeline de usage real). Não há aprovação para copiar um componente externo nesta etapa.