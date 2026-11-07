# E15-d — inventário para aposentadoria da superfície antiga

**Fonte normativa:** SPEC 2I §2(d), D151 (docs/05): remover `AuxiliaryBar`/`AttachArea` **depois de migração e validação**. Não confundir “arquivo ainda existe” com “duas superfícies aparecem no produto”. A coluna direita foi desligada na D156; o centro é o caminho vivo. A orientação anterior no `status.json` registra rede de rollback até homologação — não apagar sem resolver essa condição formal.

## Consumidores verificados no código desta rodada

| Artefato | Uso no produto | Risco de apagar agora |
|---|---|---|
| `components/AuxiliaryBar.tsx` | nenhum import de produção encontrado; CSS `.auxiliary-bar` preservado como rede de rollback | baixo isoladamente, mas quebra rollback aprovado e seletores antigos |
| `ui/attach/AttachArea.tsx` | importado em `modules/explorer-search/index.ts`, apenas por `mountAttach` | contrato público `contract.ts` ainda declara `mountAttach/unmountAttach` |
| `mountAttach/unmountAttach` | só definição/uso interno no módulo; nenhum chamador de produção fora dele no grep | contrato de módulo e testes legados; remoção precisa teste de contrato atualizado |
| `pendingAttachOpen` | **vivo** em `mountCodeEditor`: abre requisição feita antes da montagem do centro, inclusive boot/F5 | remoção direta perde abertura de arquivo pendente; substituir por fila genérica do centro ANTES de remover |
| `auxiliaryTab` do App | ainda lido/escrito por `liveLayoutRef`, restore de layout, seleção Changes/Files | migração de layout/persistência tem gate próprio; não declarar morto por nome |
| `dockedAuxiliaryController` | captura abas e views de Browser ao ocultar editor | comportamento ativo R-040, comprovado em navegador após F5; **não** apagar como legado |
| CSS `.auxiliary-bar/.has-attach-slot/.auxiliary-column` | estilos de rollback; `AttachArea` chama `.closest('.auxiliary-bar')` | retirar apenas depois do componente e dos testes |

**Aceite para a remoção:** (1) provar que nenhuma rota de UI chama `mountAttach`; (2) substituir a fila de abertura pré-montagem por porta do centro e testar boot/F5 com arquivo; (3) provar ausência de `AuxiliaryBar` no DOM em anexo/maximizado; (4) preservar o fluxo R-040 ocultar/reexibir, com Browser e arquivos; (5) rodar typecheck, gate do módulo e Playwright real; (6) satisfazer a condição D151/status de homologação da migração antes de eliminar a rede de rollback.

**Situação atual:** superfície antiga **desligada**, código antigo ainda presente para rollback e contrato interno. Isto não é “E15-d concluída”. A condição de retirada não deve paralisar RNF15-2/RF15-4, que prosseguem em paralelo. A recomendação ao Codex é verificar estes seis itens sem apagar legado por simples busca de referências.
