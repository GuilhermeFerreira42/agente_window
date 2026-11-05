# Porta única + fiscal de imports — a receita

> **Serve para:** dar meios de **verificar por máquina** as regras do condomínio (Bairro 1 isolado; casa só fala pela porta).
> **Fonte:** fontes web de 14/10/2026 (receita padrão de monólito modular; o padrão é chamado "barrel file").

## 1. Porta única (o "barrel")
Cada casa expõe **um** arquivo de entrada — o `index.ts` da casa. Todo o resto (`core/`, `ui/`, `server/`) é **privado**. Quem fala de fora importa **só do `index.ts`**.
- É a versão "de mercado" da nossa regra da porta única (D69).
- O `index.ts` deve ser **curto** (exporta pouco, de propósito).

## 2. Fiscal de imports (dependency-cruiser)
A ferramenta lê os imports **reais** (resolvendo os caminhos, não só o texto) e **falha o build** quando a regra é violada. Regra-tipo (traduzida do artigo):

- "arquivo de dentro de uma casa **não pode** importar o **interior** de outra casa — só a porta (`index.ts`)";
- "nada dos Bairros 2–5 pode ser importado pelo **Bairro 1**" (a nossa regra dura, verificada por teste desde o MVP);
- o que está proibido é o **caminho fundo** (`…/outra-casa/core/…`).

*(Exemplo real: regra `no-cross-domain-internals` com `from` / `to` / `pathNot` — a receita fica pronta para quando adotarmos.)*

## 3. Como isso combina com o que JÁ temos
- Hoje: **`frontier.test.ts` por casa** (o fiscal **manual**), que funciona e está verde no `explorer-search`.
- Robusto/Encerramento: avaliar trocar/reforçar por **dependency-cruiser** — uma linha no CI cobre o condomínio inteiro.
- Nosso "teste do condomínio" (D69) e o fiscal são **a mesma regra**: um roda em teste, o outro roda no build.

## Decisão atual
**Não instalar agora** (o MVP não precisa e o terminal está intocado) — fica registrado como **candidato da etapa ENCERRAMENTO / Condomínio Robusto** (o dono decide na hora).
