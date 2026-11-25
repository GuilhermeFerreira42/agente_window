// ============================================================================
// Domínio Multimodal — MM-0 — PORTA PÚBLICA de domínio (barrel).
// Só tipos + funções puras: NÃO carrega UI, servidor, rede, storage nem
// framework. Consumidores (Provedores/Conversa/Agir) importam daqui ou
// recebem reexport de TIPO pelos barrels das casas — uma definição só.
//
// API pública mínima (SPEC MM-0 §02.5): adaptarMensagemLegada,
// projetarTextoLegado, validarMensagemMultimodal, validarArtefato,
// mesmaIdentidadeMultimodal, avaliarCapacidadeEfetiva,
// comporCapacidadeDePool.
// ============================================================================

export type {
  ArtefatoMultimodal,
  ChaveCapacidade,
  DeclaracaoCodecLocal,
  DestinoAvaliacaoPool,
  DestinosPool,
  DirecaoMultimodal,
  EnvelopeMensagemMultimodal,
  EntradaAdaptacaoLegada,
  EntradaAvaliacaoCapacidade,
  EntradaComposicaoPool,
  EntradaPerfilMultimodal,
  EstadoArtefato,
  EstadoCapacidadeEfetiva,
  EstadoEvidencia,
  EvidenciaCapacidade,
  IdentidadeAlvoMultimodal,
  MedidaConteudo,
  MedidaId,
  Modalidade,
  OrigemArtefato,
  OrigemEvidencia,
  PapelArmazenamento,
  ParteMensagem,
  PedidoCapacidade,
  PerfilMultimodal,
  RepresentacaoMultimodal,
  RestricaoMedida,
  ResultadoCapacidade,
  ResultadoValidacao,
  UnidadeRestricao,
} from './contrato'

export { adaptarMensagemLegada, projetarTextoLegado, validarMensagemMultimodal } from './mensagens'
export { validarArtefato } from './artefatos'
export { avaliarCapacidadeEfetiva, comporCapacidadeDePool, mesmaIdentidadeMultimodal } from './capacidades'
