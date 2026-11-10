# Revisão histórica de inspeção — D180, 08/11/2026

O registro vigente de homologação está no canônico 08.

O cenário antigo limitado a dois grupos foi substituído. Siga o bloco atual do canônico 08: cinco vistas por divisões sucessivas; maximizar/restaurar verifica a caixa efetiva; X principal oculta tudo sem fechar abas; X de um grupo fecha somente esse grupo. Caminho navega por pastas/arquivos e símbolos conforme linguagem. F1 aprovado visualmente e preservado. Sem homologação formal.

---

# Complemento de inspeção — D179, 08/11/2026

Use primeiro os cenários atuais do canônico 08: dividir duplica a vista do arquivo, fechar principal promove o painel restante, última vista dirty pede decisão, preview Markdown/texto e maximizar após recolher funcionam. F1 fora do código é compacto, ajuda de teclas é tabela, binário não aceita edição. Este complemento substitui expectativas antigas de divisão vazia. Não é homologação.

---

# Complemento vigente — inspeção do candidato corrigido (08/11/2026)

As medições atuais estão em 09. Nenhuma marca histórica de teste abaixo representa aprovação humana.

1. Abra dois arquivos descartáveis: o X de um arquivo limpo deve fechar imediatamente; o dirty deve oferecer Salvar/Não Salvar/Cancelar. Em Salvar, confira o conteúdo real no disco antes de considerar o fechamento correto. Cancelar conserva o texto.
2. Repita no modo maximizado e na divisão. Com dois arquivos dirty no grupo secundário, fechar a divisão pede decisão para cada um; cancelar o segundo conserva esse arquivo. Fechar a última aba principal mantém a secundária acessível.
3. O X ao lado de maximizar recolhe a superfície inteira. Restaurar deve conservar abas, ativa, texto e dirty. Esse X não fecha os arquivos.
4. Provedores/Config: digite um rascunho descartável, alterne abas, maximize e recolha/restaure. O rascunho deve continuar. Não forneça chave real para este ensaio. Salvar configurações deve persistir no perfil de inspeção.
5. Salve os arquivos antes de F5: o contrato restaura abas/modos e conteúdo salvo; não promete recuperação de rascunho dirty. Busca/Files/Changes continuam acessíveis pela sidebar/cabeçalho, sem botões redundantes no menu do visualizador.

A decisão de aceite e a autorização de remoção física E15-d são do dono. Os resultados técnicos não as substituem.

---

# Roteiro de homologação — Fatia 15 (visualizador único)

> **Atualização 07/11/2026 — auditoria independente no Windows, base `7ab6a22`.**
> O produto recebeu correções de fechamento, preservação de modelos Monaco,
> navegação Search/SCM e divisão. Medições antigas abaixo são históricas; provas
> atuais e limites estão no `09`. **O dono ainda não homologou a Fatia 15.**
> A remoção física E15-d depende de sua autorização expressa.

**Para:** dono do produto · **Data:** 2026-11-06 · **Base:** `7e41063`
**Tempo estimado:** 20 a 25 minutos · **O que se homologa:** o produto, não o código.

> **Regra desta fatia:** homologação humana é **sua**. Nada aqui está declarado aprovado por
> mim. O que eu pude provar sozinho está marcado **[✅ MEDIDO]** — com o método. O que só você
> pode julgar está marcado **[👤 SUA VEZ]**.

---

## 0. Antes de começar — leia isto (2 min)

**Sem provedor de IA configurado**, o agente responde *"Nenhum provedor disponível para esta
seleção"*. Isso é **esperado**, não é defeito: o app não guarda chave nenhuma nesta máquina.
Para o teste de interface, **não é necessário** configurar provedor — nenhum passo abaixo
depende de uma resposta do agente.

**Se a árvore do Explorer aparecer vazia**, confira a pasta da sessão e o erro mostrado.
Estado antigo de testes é uma causa possível (D167), não um diagnóstico automático.
**Preserve o perfil do usuário.** Faça esta validação em perfil descartável separado,
com `AGENTE_WINDOW_DATA_DIR`, provedores, configurações e home isolados conforme `09`.
Selecione uma pasta de fixture existente; não apague `~/.agente_window` para testar.
O histórico só é descartável quando o perfil foi criado expressamente para a auditoria.

**Auditoria independente Windows — 2026-11-07:** use arquivos descartáveis da fixture
nos passos abaixo, inclusive no lugar de `README.md`, `iniciar.sh` e `App.tsx` do projeto.
Não edite arquivos reais nem faça stage, discard ou commit em repositório do usuário.

---

## 1. Abrir o produto [👤 SUA VEZ] — 2 min

1. Abra o preview.
2. Você deve ver: barra de título, **Sessions** à esquerda, **Explorer** à direita, o composer
   no meio.
3. **Escreva qualquer coisa** no campo e aperte **Enter** — isso cria a sessão. A sessão é o
   que faz o Explorer apontar para a pasta certa.

- [ ] A tela montou sem área branca
- [ ] A sessão foi criada e aparece em **Sessions**
- [ ] O Explorer passou a listar os arquivos do projeto

> **Por que a sessão é necessária:** sem ela o Explorer mostra a pasta-pai (`user`), não o
> projeto. É comportamento atual, não erro.

---

## 2. Abrir um arquivo no centro [👤 SUA VEZ] — 3 min

1. No **Explorer**, clique em `README.md`.
2. O centro deve mostrar: faixa de abas com `README.md`, e o editor com o texto do arquivo.
3. Clique em outro arquivo (ex.: `iniciar.sh`). Deve abrir **outra aba**, e a primeira continua lá.

- [ ] Aba apareceu no **centro** (não na lateral)
- [ ] O editor mostrou o conteúdo real do arquivo
- [ ] Abrir um segundo arquivo **não** fechou o primeiro
- [ ] Alternar entre as duas abas preserva o conteúdo (nada recarrega do zero)

**[✅ MEDIDO por mim]**: aba `iniciar.sh` no centro, Monaco montado em 1 s, conteúdo real.

---

## 3. Editar e salvar (RF15-1 — o critério-mãe) [👤 SUA VEZ] — 4 min

1. Abra `README.md` no centro.
2. Clique dentro do editor, digite `teste de homologacao` no começo.
3. Aperte **Ctrl+S**.
4. Confira de **fora do app**: abra o arquivo no seu editor de texto (ou rode `cat README.md`)
   e veja se a linha está lá.

- [ ] O editor marcou como **sujo** (bolinha ● na aba) ao digitar
- [ ] Ctrl+S salvou **sem** recarregar a página
- [ ] **O arquivo no disco tem o texto que você digitou**
- [ ] A marca de sujo (●) desapareceu depois de salvar

> Se o passo 4 falhar, **pare e me avise**: é o critério-mãe da fatia.

**[✅ MEDIDO por mim]**: digitei num arquivo de teste, apertei Ctrl+S e conferi o disco **fora
do navegador** — hash `dc0cab22 → e2274eb2`, mtime atualizado, conteúdo exato, em 1 segundo.

---

## 4. F5 — as abas voltam? (RF15-4) [👤 SUA VEZ] — 2 min

1. Com duas ou três abas abertas, aperte **F5**.
2. Espere o app recarregar.

- [ ] A **sessão** continua lá
- [ ] As **mesmas abas** voltaram, na mesma ordem
- [ ] A aba ativa é a mesma de antes do F5
- [ ] O **conteúdo** do editor voltou (não ficou em branco)

**[✅ MEDIDO por mim]**: antes do F5 → `[ARQUIVO-DE-TESTE.txt, README.md]`; depois do F5 →
idêntico, com o mesmo texto no editor.

**O que o F5 faz com a DIVISÃO** (medido nesta rodada): a divisão **sobrevive** —
cada painel volta com a sua faixa de abas, sem duplicar arquivo entre os dois lados,
e o maximizado também volta. O que o F5 **não** preserva é a **edição não salva**:
o texto volta do disco e a marca de "alteração não salva" desaparece junto. Isso é
deliberado e honesto (não há gravação de rascunho) — mas se você tiver digitado algo
que não salvou, o F5 descarta. Vale saber antes de apertar.

---

## 4b. Aba com alteração NÃO SALVA — a marca existe? [👤 SUA VEZ] — 3 min

Esta é a novidade da rodada D170. Antes dela, a faixa central **não** mostrava que
a aba tinha alteração não salva: o modelo sabia (o app abria o diálogo Salvar / Não
Salvar / Cancelar), mas nada na tela avisava. Se o app abrir o diálogo e a marca não
estiver lá, é regressão — me avise.

1. Abra um arquivo pelo Explorer (duplo clique no nome).
2. Clique dentro do editor e digite qualquer coisa.

- [ ] A aba ganhou um **ponto** (bolinha) ao lado do nome
- [ ] Passar o mouse na aba mostra o texto "alterações não salvas"
- [ ] O **X** da aba continua no mesmo lugar e fecha ao clicar
3. Aperte **Ctrl+S** (ou ⌘S).

- [ ] O ponto **desaparece** (quer dizer: salvou de verdade)
- [ ] Feche e reabra o arquivo: o que você digitou **continua lá**

4. Digite de novo sem salvar e clique no **X** da aba.

- [ ] Aparece o diálogo com **Salvar / Não Salvar / Cancelar**
- [ ] **Cancelar** mantém a aba e o texto como estavam

**[✅ MEDIDO por mim]**: limpa → suja (ponto de 7×7 px na cor de "modificado" do
tema) → Ctrl+S → limpa, **e o texto foi gravado no disco** (conferido lendo o
arquivo por fora do app).

---

## 4c. Dividir o editor e "Abrir ao lado" [👤 SUA VEZ] — 4 min

O "Dividir editor" agora divide **de verdade** (dois painéis, cada um com sua faixa
de abas). Antes ele abria uma aba falsa chamada "Files (divisão)" apontando para um
arquivo que não existe.

1. Abra **dois** arquivos no centro.
2. Clique no ícone de **dividir** (o botão com dois retângulos, no canto direito da
   faixa de abas).

- [ ] Apareceu um **segundo painel** à direita, com faixa de abas própria e a
      mensagem "Escolha um arquivo no Explorer para abrir deste lado…"
- [ ] O painel da esquerda **não perdeu** nenhuma aba

3. Clique **dentro do painel da direita** (para ele ficar em foco) e escolha um
   arquivo no Explorer.

- [ ] O arquivo abriu **no painel da direita**, não no da esquerda

4. Clique com o **botão direito** numa aba e escolha **"Abrir ao lado"**.

- [ ] A aba **saiu** do painel onde estava e apareceu no outro lado
- [ ] O **X** ao lado da faixa do painel direito fecha a divisão

5. Com um arquivo **não salvo** no painel direito, feche a divisão.

- [ ] O app **pergunta** o que fazer (não descarta em silêncio)

**[✅ MEDIDO por mim]**: dividir → clicar no painel 2 → escolher arquivo → abre no
painel 2 (dois editores, um em cada lado); "Abrir ao lado" move a aba e, **sem**
divisão aberta, ele **cria** a divisão em vez de reclamar; fechar a divisão com
alteração não salva abre o diálogo.

---

## 4d. O painel Outline mostra os símbolos? [👤 SUA VEZ] — 2 min

Esta é a correção do último defeito da fatia: com um arquivo grande aberto, o
Outline dizia "No symbols found in document" (nenhum símbolo) por causa de um aviso
que se perdia na inicialização.

1. Abra um arquivo **grande e conhecido** (por exemplo `App.tsx` em `src/`).
2. Na Side Bar, clique no cabeçalho **"Outline"** para expandir (ele nasce recolhido,
   como no VS Code).

- [ ] Aparecem **muitas** linhas com nomes de funções/constantes
- [ ] Clicar numa linha leva o cursor até ela no editor

**[✅ MEDIDO por mim]**: 1542 linhas para o `App.tsx` (amostra: `useCallback`,
`useEffect`, `useMemo`, `useRef`); a mensagem "No symbols found" não aparece.

---

## 5. A aba Changes (a novidade desta rodada) [👤 SUA VEZ] — 5 min

1. **Modifique e salve um arquivo da fixture Git isolada** (ou crie nela um arquivo novo).
   Edição ainda não salva no Monaco não altera o estado do Git. Sem mudança no repositório,
   a lista fica vazia — e isso está correto.
2. Na barra lateral, abra **Source Control / Changes**. Para inspecionar o painel
   central, use **Abrir alterações no editor** no cabeçalho. Search, Files e Changes
   saíram do menu redundante do visualizador; a barra lateral mantém seus recursos.
3. Deve abrir a aba **Branch Changes** com o painel de verdade: nome do repositório, branch,
   lista de arquivos modificados e a caixa **Message (Ctrl+Enter to commit…)**.

- [ ] A aba **Branch Changes** abriu **no centro**
- [ ] O painel mostra o repositório e a branch (`main`)
- [ ] O arquivo que você mexeu **aparece na lista** com `M` (ou `U` se for novo)
- [ ] A caixa de mensagem de commit existe
- [ ] Clicar no arquivo abre o **diff** lado a lado
- [ ] A aba continua com o conteúdo ao trocar de aba e voltar

> Execute operações Git de validação somente no repositório descartável da fixture.

**[✅ MEDIDO por mim]**: repo detectado (`isRepo: true`), `Changes 1`, `ARQUIVO-DE-TESTE.txt`
listado, input de commit presente, e o painel vazio de demonstração **não** aparece.

---

## 6. Configurações, Provedores e navegador no mesmo contêiner [👤 SUA VEZ] — 3 min

1. Por **Conta**, abra **Provedores** e **Configurações**; por **+**, abra **Browser**.
2. Esses conteúdos abrem como abas do mesmo contêiner.
3. **Personalizações** mantém a custom view R-092 da Fatia 14: ao fechar,
   as abas e o layout anteriores devem reaparecer. Não é uma aba comum.

- [ ] Personalizações carrega sem erro e devolve o layout/abas ao fechar
- [ ] Provedores abre como aba do centro
- [ ] Browser abre como aba do centro
- [ ] Nenhum visualizador paralelo apareceu

---

## 7. O que **não** dá para homologar aqui (e por quê)

| Item | Por que não |
|---|---|
| Resposta do agente | sem provedor configurado (não há chave nesta máquina) |
| Terminal integrado | funciona sem IA/provedor; terminal humano permanece fora do perímetro desta fatia |
| Windows | auditoria técnica independente executada; aceite humano continua reservado ao dono |
| Falha real de chunk do Monaco | exige quebrar o bundle de propósito no servidor |

---

## 8. Como me dar o retorno (o que me ajuda de verdade)

Para cada passo que falhar, escreva **o que você fez**, **o que esperava** e **o que viu**.
Se a tela ficar estranha, um print resolve mais que uma descrição.

O que **não** ajuda: "não funcionou". O que ajuda: "cliquei em Changes e a aba abriu vazia,
sem o repositório" — com isso eu vou direto no caminho.

---

## 9. Situação honesta da fatia (para você decidir o que cobrar)

**Pronto e provado:** visualizador único · abrir arquivo no centro · alternar abas sem perder
estado · salvar em disco · F5 restaurando · Changes real no centro · dublê de estado isolado
nos testes · quarentena dos E2E registrada · **divisão real do editor, com dois painéis e
abrir ao lado** · **marca de alteração não salva na faixa central** · **Outline mostrando os
símbolos** · ocultar/mostrar o editor sem perder abas, em anexo e em maximizado.

**Falta depois da sua homologação:**
1. **corte maior do `App.tsx`** (~2 300 linhas de estado) — gate próprio, mexe em persistência;
2. **aposentar `AuxiliaryBar`/`AttachArea`** — só depois que você aprovar, é a rede de rollback;
3. **reescrever (ou aposentar em definitivo) os E2E quarentenados** — trabalho por spec;
4. **campo `editorMaximized` dormente** — só sai com migração do `localStorage`;
5. **arrastar aba entre os dois painéis (DnD)** — não existe, e eu deliberadamente não
   implementei sem você decidir: mover aba entre lados hoje é pelo menu (abrir ao lado),
   que faz o mesmo. Fazer o arrastar atravessar a fronteira shell e módulo é mudança de
   contrato, não correção de defeito;
6. **gestão de abas ainda mora no `App.tsx`** — a RNF15-2 pede que ela saia de lá. É o
   corte de ~2 300 linhas, exige gate próprio. A meta **não** está cumprida.

**Homologação humana: PENDENTE.** Não assino embaixo no seu lugar.

---

## Atualizacao 2026-11-06 — o que mudou desde a versao anterior deste roteiro

**Numeros de teste (o painel estava errado; corrigido).** A suite fechou em
**1515 testes = 1483 aprovados | 0 falhas | 32 pulados**. Rodar com:
`sh platform/scripts/gate-unit.sh` (script novo, no repo — ele fixa TMPDIR/HOME/
AGENTE_WINDOW_TEST_HOME; rodar vitest "na mao" com TMPDIR dentro de `.cache` fabrica 4 falhas
falsas). As 9 falhas de `TerminalPanel.test.tsx` foram para quarentena registrada em
`src/__tests__/QUARENTENA-UNITARIOS.md` — **voce nao precisa homologar um teste que nao testa
mais o produto**, mas precisa saber que o painel de terminal perdeu cobertura UNITARIA (a
cobertura dele nesta rodada e' de navegador).

**Passo novo para homologar (RNF15-2 / D172).** Ao abrir arquivos da arvore:
1. abra `data.ts` → deve aparecer **1** aba;
2. abra `types.ts` → **2** abas, nenhuma duplicada;
3. clique de novo em `data.ts` → continua **2** (reusa, nao duplica);
4. edite e `Ctrl+S` → a marca de nao-salvo some e o arquivo no disco tem o texto.
Isto prova o caminho que a migracao da D172 tocou (identidade/reuso de aba + salvar).

**Arrastar aba entre os dois paineis — NAO e' exigido pela SPEC.**
Conferi `docs/06` L1442: RF15-1..4 e RNF15-1..3, nenhum cita arrastar abas entre paineis.
Fica registrado como lacuna conhecida; mover aba entre lados e' pelo menu **"Abrir ao lado"**.
Se voce quiser DnD, e' escopo novo — me diga e eu abro como requisito proprio.

**Ponto de recuperacao disponivel.** `recuperacao-2026-11-06/` (bundle 29 MB + operacionais
5,3 MB, com sha256 no LEIA-ME). Restauracao testada de verdade, nao presumida. **Baixe para
fora do sandbox** — dentro dele nao protege contra perda do workspace.

---

## Atualização D174 — estado da faixa nativa saiu do App (2026-11-07)

> **Esta seção é a medição atual; números anteriores acima são históricos.**
> O total cresceu em 7 por causa dos testes de proteção D173, não por falhas.

- `App.tsx`: **2.729 → 2.692 linhas**. O novo
  `src/shell/useFaixaDeAbasNativas.ts` é o único dono React da lista de abas
  nativas, da ativa e da memória por sessão/global, MRU e sequência de ids.
  Ativação e escolha da aba ao voltar para uma sessão também saíram do `App`.
- **Sem mudança de F5:** arquivos `kind: code` continuam no módulo e reaparecem;
  abas nativas e diffs não foram transformadas em dados persistidos. A faixa
  continua fundindo abas do módulo por projeção, nunca por cópia no estado.
- Gate específico antes **e** depois: **181 testes = 168 aprovados, 0 falhas,
  13 pulados**, 38 arquivos. Suíte completa após o corte: **1.522 testes =
  1.490 aprovados, 0 falhas, 32 pulados**, 439 arquivos. `tsc -b --force` EXIT 0.
- Navegador real: `data.ts` e `types.ts` em painéis separados, 2 abas antes e
  depois de F5, 0 duplicatas; Outline expandido com 130 itens; maximizar,
  restaurar, ocultar e reexibir acionados sem perder as duas abas.

**Ainda não assinar RNF15-2 como concluída:** `openEditorTab`, `createBrowser`
(que mantém `browserViews`), `closeEditorTab` (que libera recursos de browser)
e limpeza por sessão ainda são orquestrados no `App`. A meta de linhas melhorou,
mas a responsabilidade de abas ainda não saiu *inteira*. O contrato de migração
está em `docs/arquivo_morto/CONTRATO-MIGRACAO-ESTADO-ABAS.md`; nenhum teste foi afrouxado.

**Roteiro humano deste corte:** abra dois arquivos, ative o primeiro; troque de
sessão e volte, confira a aba lembrada; abra Browser, feche a aba e confira que
o endereço do Browser desapareceu; use “Abrir ao lado” e recarregue (F5) com
os dois painéis. Esses passos não substituem a homologação final do dono.

---

## Atualização D175/D175b — gestão das nativas e F5 (2026-11-07)

> Esta seção substitui a frase anterior “abas nativas não voltam após F5”.
> Aquela era uma **medição do defeito antes da implementação**, não o aceite da
> SPEC 2I. RF15-4 e D151 exigem restauração de abas no visualizador unificado.

**Corte D175:** abertura/reutilização, criação de Browser, navegação da view,
fechamento com sucessora MRU, liberação do BrowserView e limpeza por sessão
passaram ao mesmo hook do shell que já possuía o estado D174. `App.tsx` ficou
com a guarda `CannotClose` da superfície, a porta do módulo e a orquestração
de sessões/layout. `App.tsx`: **2.692 → 2.611 linhas**. Antes do corte, gate
181/168/0/13; depois, 182/169/0/13 (um teste novo de remount que fotografava
o comportamento antigo). Navegador: dois Browsers, fechar um remove sua view,
sem erros JS; arquivos em split e Outline sobreviveram ao F5.

**RF15-4 / D175b:** `shell/persistenciaNativas.ts` grava, em chave própria
`workbench.nativeTabs.v1`, somente abas reconstituíveis (Browser, Provedores,
Configurações, Branch Changes e Personalizações), com a view Browser e suas
preferências. Não grava conteúdo de arquivo, dados-base64 ou estado do Monaco.
Arquivos `kind: code` seguem sendo restaurados **pelo módulo**, sem espelhar
esse estado no hook. Ao ocultar o editor (R-040), o snapshot não é sobrescrito
pela coleção temporariamente capturada. Testes escritos antes: a expectativa
nova de Browser após F5 falhou contra o código antigo, como deveria; após a
implementação, passou. Navegador: Browser volta com URL, mesmo após
ocultar → F5 → mostrar; split de arquivos se mantém, zero erros JS.

**Roteiro corrente para o dono/Codex:**
1. Abra `data.ts` e `types.ts` em painéis distintos; F5 deve devolver os dois
   painéis, sem duplicar abas. Edite e use Ctrl+S; confira o disco.
2. Abra Browser, Provedores e Configurações como abas do mesmo contêiner.
   Troque entre elas e um arquivo; F5 deve devolver as abas reconstituíveis.
3. Em Browser, navegue, volte/avance; abra um segundo, feche-o e veja que a
   view correspondente desapareceu. F5 deve manter apenas o primeiro.
4. Com Browser aberto, oculte o editor, pressione F5 e reexiba: Browser não
   deve sumir. Repita com centro maximizado e restaurado.
5. Abra Outline, alterne sessão, volte e confira seleção/aba lembrada; feche
   arquivo não salvo e teste Cancelar, Não salvar e Salvar.

**Limites a declarar:** diff de arquivo com payload, busca transitória e conteúdo
não salvo não são serializados como aba nativa. O resultado do gate integral
D175b só deve ser anotado depois de terminar; o navegador de Provedores/
Configurações ainda precisa reexecução se a máquina sofrer crash do Chromium.
E15-d tem inventário próprio em `docs/arquivo_morto/INVENTARIO-E15-D.md`; a retirada da rede
de rollback depende da condição D151/status, não se confunde com UI ativa.

---

## Atualização D176 — candidato técnico para o Codex (2026-11-07)

**Esta é a fotografia corrente, substitui ressalvas anteriores de RNF15-2.**
`App.tsx` **2.582 linhas** (D174 antes: 2.729); nenhuma declaração
`useState` de abas/BrowserView e nenhum `setEditorTabs`/`setBrowserViews` no
`App`. O hook único `shell/useFaixaDeAbasNativas.ts` é dono de abertura,
fechamento, recursos Browser, memória por sessão, reordenação e captura/
restauração R-040; o `App` só orquestra sessão/layout e porta do módulo.
**RNF15-2 implementada**, sem confundir com E15-d.

**Correção de continuidade D151:** com Changes (aba acoplada) e Browser,
Provedores, Configurações e `data.ts` abertos, ocultar o editor deixa
visíveis Changes/arquivo; mostrar restaura as nativas, e F5 devolve
as cinco abas. A regra antiga descartava Provedores/Config: ampliada
`isRestorableTab` após teste vermelho (2 falhas) e rerodada (16/16).
Playwright real: 5 abas antes/depois do F5, 0 erros JS, split preservado;
Browser URL restaurada; controles de ocultar/mostrar preservam as abas.

**Última suite completa (após D176): 1.530 testes = 1.498 aprovados,
0 falhas, 32 pulados, 442 arquivos, exit 0.** Typecheck EXIT 0;
gate específico do App, controller e persistência: 87/74/0/13.
O E2E legado isolado `sessao_14b_git_smoke` foi iniciado mas **não terminou**
em 240s sob pressão de memória; não contá-lo como verde nem falha de código.
Os fluxos centrais foram executados em Playwright serial no produto real.

**Pendência formal E15-d:** a superfície antiga não aparece no produto, mas
`AuxiliaryBar`/`AttachArea` ainda existem como rollback; `pendingAttachOpen`
continua necessário para abertura antes da montagem do centro. A remoção
física aguarda a condição D151/status (migração validada e homologação da rede
de rollback). Inventário e procedimento em `docs/arquivo_morto/INVENTARIO-E15-D.md`.
**Homologação humana NÃO aprovada.** O Codex deve auditar este candidato antes.
