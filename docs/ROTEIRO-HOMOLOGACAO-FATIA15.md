# Roteiro de homologação — Fatia 15 (visualizador único)

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

**Se a árvore do Explorer aparecer vazia**, não é o produto: é estado velho de teste. Foi um
defeito real, já corrigido (D167). Rode:

```sh
rm -rf ~/.agente_window && mkdir -p ~/.agente_window
```

…e recarregue. O histórico de sessões é descartável nesta homologação.

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

---

## 5. A aba Changes (a novidade desta rodada) [👤 SUA VEZ] — 5 min

1. **Modifique um arquivo e não salve** (ou crie um arquivo novo). Sem mudança no repositório,
   a lista fica vazia — e isso está correto.
2. No centro, clique no **+** da faixa de abas → escolha **Changes**.
3. Deve abrir a aba **Branch Changes** com o painel de verdade: nome do repositório, branch,
   lista de arquivos modificados e a caixa **Message (Ctrl+Enter to commit…)**.

- [ ] A aba **Branch Changes** abriu **no centro**
- [ ] O painel mostra o repositório e a branch (`main`)
- [ ] O arquivo que você mexeu **aparece na lista** com `M` (ou `U` se for novo)
- [ ] A caixa de mensagem de commit existe
- [ ] Clicar no arquivo abre o **diff** lado a lado
- [ ] A aba continua com o conteúdo ao trocar de aba e voltar

> **Não commite** nada de verdade a menos que queira: é o repositório da obra.

**[✅ MEDIDO por mim]**: repo detectado (`isRepo: true`), `Changes 1`, `ARQUIVO-DE-TESTE.txt`
listado, input de commit presente, e o painel vazio de demonstração **não** aparece.

---

## 6. Configurações, Provedores e navegador no mesmo contêiner [👤 SUA VEZ] — 3 min

1. Pelo **+** da faixa de abas, abra **Personalizações**, depois **Files**, depois **Browser**.
2. Todos devem abrir **como abas do mesmo centro**, não em painel paralelo.

- [ ] Personalizações abre como aba do centro
- [ ] Provedores abre como aba do centro
- [ ] Browser abre como aba do centro
- [ ] Nenhum visualizador paralelo apareceu

---

## 7. O que **não** dá para homologar aqui (e por quê)

| Item | Por que não |
|---|---|
| Resposta do agente | sem provedor configurado (não há chave nesta máquina) |
| Terminal integrado | o PTY sobe, mas o uso real depende de sessão com provedor |
| Windows | esta cópia roda em Linux; **funcionar aqui não homologa o Windows** |
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
nos testes · quarentena dos E2E registrada.

**Falta depois da sua homologação:**
1. **corte maior do `App.tsx`** (~2 300 linhas de estado) — gate próprio, mexe em persistência;
2. **aposentar `AuxiliaryBar`/`AttachArea`** — só depois que você aprovar, é a rede de rollback;
3. **reescrever (ou aposentar em definitivo) os E2E quarentenados** — trabalho por spec;
4. **campo `editorMaximized` dormente** — só sai com migração do `localStorage`.

**Homologação humana: PENDENTE.** Não assino embaixo no seu lugar.
