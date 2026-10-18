// ============================================================================
// modules → Casa Agir — BARREL ÚNICO (fronteira LEGO).
// Fora da casa, importa-se APENAS este caminho:
//   ./bairros/2-inteligencia/casas/agir
// (A prefeitura, em src/server/**, pode delegar as rotas — exceção estreita
// documentada no teste de fronteira, igual às casas Provedores e Conversa.
// A rota SSE desta casa nasce na C3; a C1 entrega o esqueleto provado.)
// ============================================================================

export type {
  ArgumentosFerramenta,
  CategoriaErroAgir,
  ErroAgir,
  EventoAgir,
  ExecutorFerramenta,
  FerramentaId,
  MensagemAgir,
  PedidoFerramenta,
  ProtocoloAgir,
  RespostaVolta,
  ResultadoFerramenta,
  VizinhoProvedor,
} from './contract'

/** O loop do agente (motor da casa). */
export { MAX_VOLTAS, rodarAgir } from './server/agir'
export type { EmitirAgir, OpcoesAgir, ResultadoAgir, StatusAgir } from './server/agir'

/** Catálogo + executores falsos da C1 (a C2 troca por arquivos de verdade). */
export {
  catalogoFerramentas,
  criarExecutoresFalsos,
  ehFerramentaConhecida,
  ehMexida,
} from './server/ferramentas'
export type { DescritorFerramenta } from './server/ferramentas'

/** Extratores do canal nativo (Q4=(b), D93) — um por protocolo. */
export { extrairFerramentas } from './server/extracao'
