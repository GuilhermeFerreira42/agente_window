# VS Code 1.135 — como o editor (Monaco) se separa do resto

> **Serve para:** FATIA 11 (Conferir/editor) e FATIA 16 (navegador e superfícies embutidas) — e para entender a fronteira "cara × editor".
> **Fonte:** tag 1.135.0 (08d4889f); conferido em 14/10/2026.

## O fato central
O editor é uma peça **destacável**: existe uma montagem "só o editor", sem a cara do VS Code por cima.

- **A montagem sozinha:** `src/vs/editor/standalone/browser/` —
  - `standaloneEditor.ts` (cria o editor),
  - `standaloneServices.ts` (o mínimo de serviços necessários),
  - `standaloneThemeService.ts` (temas sem o tema do workbench),
  - `standaloneLanguages.ts` (linguagens prontas para embutir).
- **A API pública:** `src/vs/editor/editor.api.ts` (+ `editor.main.ts`, `editor.all.ts`).
- **As tipagens que viram o pacote de fora:** `src/vs/monaco.d.ts` + as receitas de build em `build/monaco/` (é daí que sai o pacote `monaco-editor` do npm).

## Por que isso importa para nós
- Nossa área de editor **já usa Monaco**; a lição aqui é a **fronteira**.
- No dia em que precisarmos do editor "solto" (ex.: dentro do navegador embutido, numa seção auxiliar, ou num preview), o caminho é a **montagem standalone** — não puxar a cara inteira junto.
- Regra prática fiel ao original: a **cara usa** o editor por contratos; o **editor não conhece** a cara.

## O que NÃO foi verificado
- Diferenças entre a versão do Monaco que usamos hoje e a que acompanha a 1.135 — conferir na FATIA 11.
