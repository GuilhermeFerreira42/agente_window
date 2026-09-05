# Agent Sessions — réplica web da Janela de Agentes

Réplica frontend autônoma construída com React 18, TypeScript, Vite 5, Tailwind CSS 3, Monaco Editor, xterm, react-resizable-panels, lucide-react e react-markdown.

As fontes restauradas em `/home/user/projeto_restaurado/sessions` e `/home/user/projeto_restaurado/vscode-main` foram usadas apenas como referência. Não são importadas nem modificadas pela aplicação.

## Executar

```bash
npm install
npm run dev
```

Validações:

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm run test:coverage
```

A cobertura está configurada com metas finais de 90% para linhas/funções/statements e 85% para branches. A suíte atual possui **83 testes em 9 arquivos**; a última execução V8 registrada antes da P6.8 registrou 95,75% em statements/lines, 87,80% em functions e 89,49% em branches. Functions ainda está abaixo da meta final; a cobertura global da suíte ampliada será atualizada em P8.4.

## Fluxos disponíveis

- selecione uma sessão e observe o badge não lido desaparecer;
- expanda as sessões com a seta para ver chats filhos e guias de árvore;
- use `Permitir` em uma sessão aguardando input;
- abra Browser, Search e Branch Changes na área principal do editor;
- em Search, confirme o foco inicial, filtre por caminho/conteúdo, observe a contagem, o `<mark>` e o estado vazio; use Ctrl/Cmd+Shift+F para reabrir/focar a busca;
- clique em um resultado Search para abrir o arquivo como uma aba real do Editor;
- crie várias abas Browser e teste histórico, recarregar e viewports;
- no multi-diff, inspecione a lista, selecione arquivos e compare Original/Modificado; as ações `Viewed`, aceitar/reverter, Commit e Criar PR têm efeitos observáveis mockados e foram auditadas em P6.5;
- alterne Files/Changes na barra auxiliar; em Files recolha/expanda pastas e abra um arquivo no Editor;
- em Changes use Revisar, Abrir multi-diff, clique uma alteração para selecioná-la no Editor e teste Checks, rerun e Preparar PR mockados;
- feche/reabra a barra auxiliar pelo botão da própria barra ou pelo titlebar;
- abra o Terminal no titlebar; use limpar, maximizar/restaurar e fechar; a saída mockada é mantida por sessão ao trocar de sessão ou reabrir;
- redimensione para menos de 900px para ativar single-pane e abas docked;
- use `@` ou o clip para anexar contexto, selecione modo/modelo e teste ditado;
- envie uma mensagem e interrompa com o botão Parar, Ctrl/Cmd+Escape ou Alt+Backspace;
- depois de enviar, use ArrowUp no início do composer para restaurar o histórico e ArrowDown no fim para retornar ao rascunho; texto, anexos, modo e modelo permanecem isolados por sessão/chat.


## Limites da réplica

A aparência, estados e interações são reproduzidos com dados em memória. O Browser usa um `iframe` local `srcDoc` para funcionar sem rede; por isso o conteúdo de páginas externas é representativo, embora load/error, histórico e viewport sejam reais no fluxo do componente. O histórico do composer é real durante a vida do App, mas não sobrevive a recargas e não recupera bytes de imagens. O catálogo do model picker é mockado e não resolve providers/entitlements reais. O Terminal instancia xterm e preserva snapshots de saída por sessão, mas não cria shell/PTY nem executa comandos reais. Commit, PR e checks são ações visuais mockadas, sem backend.

