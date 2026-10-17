// ============================================================================
// modules → Casa Provedores — BARREL ÚNICO (fronteira LEGO).
// Fora da casa, importa-se APENAS este caminho:
//   ./bairros/2-inteligencia/casas/provedores
// Nada de subpastas (descubra violações em __tests__/frontier.test.ts).
// ============================================================================

export type {
  ArquivoProvedores,
  CategoriaTeste,
  Descritor,
  EstadoProvedores,
  Protocolo,
  ProvedorConfig,
  ProvedorNaTela,
  ResultadoModelos,
  ResultadoTeste,
  SalvarProvedoresInput,
} from './contract'

export { DESCRITORES, descritorPorId } from './descritores/registro'

/** A tela da casa (cliente). O síndico (`App.tsx`) monta só isto. */
export { ProvidersView } from './ui/ProvidersView'
