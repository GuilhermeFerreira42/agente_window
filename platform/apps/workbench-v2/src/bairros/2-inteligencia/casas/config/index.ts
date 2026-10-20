// ============================================================================
// Casa Config — BARREL ÚNICO (fronteira LEGO) — SEGURO PARA O NAVEGADOR.
// Fora da casa, importa-se APENAS este caminho:
//   ./bairros/2-inteligencia/casas/config
// AQUI SÓ entram peças que o navegador pode carregar: tipos, constantes e
// o cliente da rota (C2). O disco (`server/repo`) e a rota (`server/rotas`)
// ficam FORA — a prefeitura importa o arquivo de serviço direto.
// ============================================================================
export {
  AUTOSCROLL_LIMITE_PX,
  AUTOSCROLL_PADRAO,
  TETO_MAXIMO,
  TETO_MINIMO,
  TETO_PADRAO,
} from './contract'
export type { ConfigAgente, ConfigParcial } from './contract'
