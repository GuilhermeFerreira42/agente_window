// ============================================================================
// Casa Personalizações — BARREL ÚNICO (fronteira LEGO) — SEGURO PARA O NAVEGADOR.
// Fora da casa, importa-se APENAS este caminho:
//   ./bairros/2-inteligencia/casas/personalizacoes
//
// AQUI SÓ entram peças que o navegador pode carregar: tipos e constantes do
// contrato, a projeção pura de ferramentas e o cliente da rota. Ficam FORA:
//   · `server/skills`  — toca node:fs (descoberta e criação no disco)
//   · `server/estado`  — toca node:fs (o arquivo de preferências)
//   · `server/rotas`   — a rota HTTP
// Quem precisa delas (a prefeitura, os testes) importa o arquivo de serviço
// direto, como as casas Config e Agir fazem. Puxar disco para o cliente quebra o
// app com "node:fs externalized" (lição da C3).
// ============================================================================

export {
  ARQUIVO_SKILL,
  CAMINHO_SKILLS_PROJETO,
  CAMINHO_SKILLS_USUARIO,
  ESTADO_PADRAO,
  LIMITE_ARQUIVO_SKILL_BYTES,
  PADRAO_NOME_SKILL,
  ROTULO_GRUPO_FERRAMENTA,
  TAMANHO_MAXIMO_DESCRICAO_SKILL,
  TAMANHO_MAXIMO_NOME_SKILL,
} from './contract'

export type {
  EstadoParcial,
  EstadoPersonalizacoes,
  EstadoSkill,
  FerramentaVisivel,
  GrupoFerramenta,
  OrigemSkill,
  PedidoCriarSkill,
  Skill,
  VisaoPersonalizacoes,
} from './contract'

/** Projeção pura das ferramentas reais (o catálogo vem da casa Agir). */
export { GRUPO_POR_FERRAMENTA, gruposPresentes, projetarFerramentas } from './server/ferramentas'

/** A tela fala com a casa SÓ por aqui (as URLs moram na casa). */
export { carregarPersonalizacoes, criarSkillNaTela, salvarEstadoPersonalizacoes } from './ui/client/api'
export type { AlvoPersonalizacoes, PedidoCriarSkillTela } from './ui/client/api'
