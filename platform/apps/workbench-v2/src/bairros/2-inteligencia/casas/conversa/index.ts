// ============================================================================
// modules → Casa Conversa — BARREL ÚNICO (fronteira LEGO).
// Fora da casa, importa-se APENAS este caminho:
//   ./bairros/2-inteligencia/casas/conversa
// (A prefeitura, em src/server/**, pode delegar as rotas — exceção estreita
// documentada no teste de fronteira, igual à casa Provedores.)
// ============================================================================

export type {
  AlvoConversa,
  AlvoOuErro,
  CategoriaErro,
  ErroConversa,
  EventoChat,
  MensagemChat,
  ObterAlvo,
  PedidoChat,
  ProtocoloConversa,
} from './contract'
