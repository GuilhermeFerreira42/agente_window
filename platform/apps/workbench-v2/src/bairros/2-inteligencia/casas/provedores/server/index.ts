// Porta pública exclusivamente server-side da Casa Provedores.
// Consumidores de outras casas usam este barrel estreito, nunca providersRepo
// ou descritores internos. Não importar este arquivo em módulos de browser.
export type {
  ToolCallingAssessmentRecord,
  ToolCallingCheckReason,
  ToolCallingCapabilityStatus,
} from '../contract'

export {
  descritorPorId,
  fingerprintToolCalling,
  iniciarChamadaModelo,
  lerArquivo,
  registrarToolCallingAssessment,
  resolverChave,
} from './providersRepo'
