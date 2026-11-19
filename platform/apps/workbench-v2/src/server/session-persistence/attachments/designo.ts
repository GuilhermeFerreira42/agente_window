// C-3a — registro de escolhas de desenho (R01–R14). D140+ são decisões
// internas do implementador; R-numbers vêm do contrato de entrega.
//
// D140 (ownership): o dono do rascunho continua sendo o controlador React
//   (ChatInput/App/Landing). O domínio guarda Files em um repositório
//   transitório em memória (Map por chave de rascunho) — NUNCA em estado
//   persistido, localStorage ou snapshot de sessão.
// D141 (política): `POLITICA_PADRAO` é a política técnica validada desta
//   entrega (ensaio em politica.test.ts). Arquivo `anexos/politica.json`
//   ausente → materializa os defaults; inválido → bloqueia admissão com
//   `policy_invalid` (explícito, nunca fallback silencioso).
// D142 (armazenamento): cópia de chat vive em
//   `<appdir>/uploads/chats/<sid>/<cid>/<artifactId>/<nomeSeguro>`; cópia
//   explícita de workspace em `<workspaceRoot>/uploads/…`; referência de
//   projeto guarda apenas caminho relativo+fingerprint (sem cópia).
// D143 (publicação no-overwrite): stage no MESMO volume do destino +
//   `link(stage, final)` (EEXIST → colisão preservando bytes anteriores);
//   nunca `rename` por cima de arquivo do usuário. Seam `io` estendido.
// D144 (journal): intenção de publicação gravada ANTES do link; commit no
//   SQLite após o link. Reconciliação na abertura executa a tabela oficial
//   de quedas (stage→preparado→pronto; commit→preparado; idêntico→pronto).
// D145 (transfert client): XMLHttpRequest com File como corpo (não JSON,
//   não base64); uploadId estável por item do rascunho; falha preserva o
//   File para retry do MESMO id (R11).
// D146 (MVP envio): texto+anexo sem codec → escolha explícita
//   (`window.confirm`, precedente de exclusão) antes de publicar; anexo
//   sem texto → publica mensagem e NÃO inicia run (T23).
// D147 (partes): `ChatMessage.attachments` ganha campos aditivos
//   (artifactId/modalidade/bytes/sha256/estado/mode/referencia) — P30
//   aditiva; nunca bytes brutos, base64, locator físico ou token.
// D148 (namespace): rotas em `/api/sessions/:sid/chats/:cid/attachments/*`
//   (batem com API_PREFIX e `rotaPertenceAoModuloConversa`); dispatch
//   próprio no handleRequest antes do 404 de sessão genérico.
// D149 (dono das rotas): cada rota valida identidade contra o SQLite
//   (sessão/chat existentes) e reaplica `validateLocalRequest` (defesa em
//   profundidade além do middleware de borda do Vite).
// D150 (recuperação): `prepare` revalida origem/ownership e grava cópia no
//   âmbito privado (mesmo volume); `confirm` publica no-overwrite e liga a
//   artefato à mensagem; sem duplicar o identificador local (R11).
