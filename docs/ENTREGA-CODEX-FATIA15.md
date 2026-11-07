# Candidato à auditoria independente — Fatia 15 (SPEC 2I)

**Não é homologação humana.** O Codex executa auditoria técnica independente; o dono homologa depois. Este documento é o ponto de entrada do auditor, sempre subordinado à SPEC `docs/06` §2I e às decisões `docs/05` (D140, D151).

## Ambiente e fontes

1. `sh /home/user/arena-operacional/restaurar-ambiente.sh` (reconstitui Node em `.cache`, verifica SHA; dependências/caches não são guardados no snapshot). Depois `sh iniciar.sh typecheck` na raiz do repo. Em ambiente novo, `sh iniciar.sh dev` e backend do projeto via `platform/scripts/` — conferir `README.md` e `arena-operacional/roda-teste-browser.sh` para as portas 5174/8080.
2. Suite: `sh platform/scripts/gate-unit.sh` (HOME e TMPDIR isolados; quarentena unitária documentada em `src/__tests__/QUARENTENA-UNITARIOS.md`). Alvo: `sh platform/scripts/gate-unit.sh src/__tests__/App.test.tsx src/__tests__/faixaDeAbasProtecao.test.tsx src/shell/persistenciaNativas.test.ts`. E2E isolado: `sh platform/scripts/e2e-isolado.sh e2e/<spec>.spec.ts`.
3. Roteiro humano corrente: `docs/ROTEIRO-HOMOLOGACAO-FATIA15.md` (ler últimas atualizações, não confundir medições históricas). Histórico de gate/dashboard: `/home/user/arena-operacional/{status.json,EXECUCAO_AUTONOMA.md,dashboard-offline.html}`; evidências em `arena-operacional/evidencias/`.

## Mapa dos contratos

- RF15-1 editar/salvar: módulo `explorer-search` é dono do modelo/Monaco/writeFileAtomic; centro apenas monta slot. Provar no navegador edição + Ctrl+S + bytes no disco, incluindo cancelar fechamento de arquivo sujo.
- RF15-2/RF15-3: uma faixa do `EditorArea`, `shell/ponteAnexo.ts` projeta abas do módulo sem cópia de estado; `shell/useFaixaDeAbasNativas.ts` possui nativas e recursos Browser. Config/Provedores/Browser/Changes aparecem no contêiner único. DnD entre os painéis **não** é exigido; “Abrir ao lado” atende o fluxo.
- RF15-4: módulo persiste arquivos `kind: code` em `workbench.attachTabs.v1`; shell persiste nativas reconstituíveis em `workbench.nativeTabs.v1`. Contrato/testes: `docs/CONTRATO-PERSISTENCIA-NATIVAS-F15.md`, `shell/persistenciaNativas.test.ts`, teste App de remount e Playwright com dois painéis/Browser/ocultar. Diff de arquivo, busca transitória e conteúdo não salvo não entram na serialização nativa.
- RNF15-1: 31 unit/11 E2E antigos repontados ou quarentenados com registro; `e2e/QUARENTENA.md` distingue spec obsoleta de spec que ainda passa. Não executar Playwright cru contra dados do usuário; usar script isolado.
- RNF15-2: `App.tsx` diminuiu, mas auditar se restam políticas de abas indevidas. D174/D175 removeram estado, abertura/fecho, Browser e limpeza de recursos para um único hook do shell; App retém guardas de UI, porta do módulo e orquestração de sessões/layout. Não criar outro controller nem duplicar coleções.
- RNF15-3: lateral esquerda da Fatia 14 não foi reescrita.
- E15-d: `docs/INVENTARIO-E15-D.md` inventaria `AuxiliaryBar`/`AttachArea`/`pendingAttachOpen` e rede de rollback. Não remover `pendingAttachOpen` diretamente: `mountCodeEditor` ainda o consome no boot/F5. Confirmar condição formal da D151/status antes de apagar código de rollback.

## Evidência e honestidade

Os números vigentes são os últimos do `arena-operacional/status.json`; medições de outras datas/commits permanecem históricas, não contam como gate atual. A sonda de Provedores/Configurações sofreu `Page crashed` ao concorrer com suite integral (pressão de memória); repetir sem carga antes de afirmar que passaram. Abrir os relatórios em `arena-operacional/evidencias/`, confrontar com o HEAD (`git rev-parse HEAD`, `git fsck`, `git status --short`). Homologação humana segue pendente.

## Recuperação

`/home/user/recuperacao-2026-11-06/`: bundle Git + tar operacional + LEIA-ME com sha256; regenerar **apenas após commits**, validar `git bundle verify`, clonar em diretório temporário e comparar HEAD. Não fazer push sem autorização. O backup dentro do sandbox só protege quando o dono baixar os artefatos para fora.
