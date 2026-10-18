// ============================================================================
// modules → Casa Agir — BARREL ÚNICO (fronteira LEGO) — SEGURO PARA O NAVEGADOR.
// Fora da casa, importa-se APENAS este caminho:
//   ./bairros/2-inteligencia/casas/agir
// AQUI SÓ entram peças que o navegador pode carregar: tipos do contrato,
// cliente da rota e utilidades PURAS. As mãos de disco (`server/discos`,
// `server/territorio`), a rota (`server/rotas`) e o vizinho HTTP ficam FORA —
// quem precisa delas (a prefeitura, os testes) importa o arquivo de serviço
// direto (`.../agir/server/rotas`), como a casa Conversa faz. Puxar disco
// para o cliente quebra o app com "node:fs externalized" (lição da C3).
// ============================================================================

export type {
  ArgumentosFerramenta,
  CategoriaErroAgir,
  DecisaoAprovacao,
  ErroAgir,
  EventoAgir,
  ExecutorFerramenta,
  FerramentaId,
  MensagemAgir,
  MensagemSimples,
  OpcoesVizinho,
  PedidoFerramenta,
  ProtocoloAgir,
  RespostaVolta,
  ResultadoFerramenta,
  VizinhoProvedor,
} from './contract'

/** O loop do agente (motor da casa — puro, sem node:*). */
export { MAX_VOLTAS, rodarAgir } from './server/agir'
export type { EmitirAgir, OpcoesAgir, ResultadoAgir, StatusAgir } from './server/agir'

/** Catálogo + peças puras (ferramentas falsas e extração não tocam node:*). */
export {
  catalogoFerramentas,
  criarExecutoresFalsos,
  ehFerramentaConhecida,
  ehMexida,
} from './server/ferramentas'
export type { DescritorFerramenta } from './server/ferramentas'
export { extrairFerramentas } from './server/extracao'

/** A tela fala com a casa SÓ por aqui (as URLs moram na casa, FT-05). */
export { enviarAgir, responderAprovacao } from './ui/client/api'
export type { ControleAgir, EntradaAgir, OuvintesAgir } from './ui/client/api'
