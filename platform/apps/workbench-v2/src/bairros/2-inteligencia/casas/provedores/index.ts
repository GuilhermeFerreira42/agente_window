// ============================================================================
// modules → Casa Provedores — BARREL ÚNICO (fronteira LEGO).
// Fora da casa, importa-se APENAS este caminho:
//   ./bairros/2-inteligencia/casas/provedores
// Nada de subpastas de implementação. A única porta irmã explícita é
// `./server` para consumidores backend; ela não deve ser importada pelo browser.
// ============================================================================

export type {
  ArquivoProvedores,
  CategoriaTeste,
  Descritor,
  EstadoProvedores,
  ItemCatalogoModelo,
  Protocolo,
  ProvedorConfig,
  ProvedorNaTela,
  ResultadoModelos,
  ResultadoTeste,
  SalvarProvedoresInput,
  ToolCallingAssessmentRecord,
  ToolCallingAssessmentView,
  ToolCallingCapabilityStatus,
  ToolCallingCheckReason,
  ResultadoVerificacaoToolCalling,
} from './contract'

export { DESCRITORES, descritorPorId } from './descritores/registro'

/** A tela da casa (cliente). O síndico (`App.tsx`) monta só isto. */
export { ProvidersView } from './ui/ProvidersView'
export { carregarEstado } from './ui/client/api'
