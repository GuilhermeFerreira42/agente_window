# OpenClaude — skills (o que alimenta o futuro Bairro 5)

> **Serve para:** Bairro 5 "Extensões" (pós-MVP) — as skills agnósticas.
> **Fonte:** commit fc3be25e (14/10/2026).

## Como funciona (peças conferidas)
- **Descoberta em pasta:** `src/skills/loadSkillsDir.ts` — varre uma pasta de skills, lê cada arquivo (padrão SKILL.md / markdown), extrai o cabeçalho (front-matter: nome, gatilhos, esforço…) e registra como comando/comando de prompt.
- **Skills embutidas:** `src/skills/bundledSkills.ts` — as que já vêm no programa.
- **Skills vindas de servidores (MCP):** `src/skills/mcpSkills.ts` + `mcpSkillBuilders.ts`.
- **Invocação:** `src/tools/SkillTool/SkillTool.ts` — a ferramenta que o agente usa para **ativar** uma skill; conecta com o sistema de **permissões** (skill também pede autorização) e com plugins/marketplace (`src/utils/plugins/pluginIdentifier.ts`).
- **Documentação do próprio projeto:** `docs/skills.md`.

## Receita que vamos querer (pós-MVP)
1. Skill = **arquivo de texto** com cabeçalho + conteúdo (fácil de escrever à mão).
2. Fluxo: descobrir → registrar → uma **ferramenta única** de invocação → permissão por skill.
3. **Cuidado registrado no chat da Meta:** eles chamam a descoberta de skills em **6 lugares** diferentes do código — sinal de que concentrar isso numa **casa só** (como queremos no Bairro 5) é a decisão certa.

## O que NÃO foi verificado
- Formato exato do front-matter e versionamento de skills — aprofundar quando o Bairro 5 abrir.
