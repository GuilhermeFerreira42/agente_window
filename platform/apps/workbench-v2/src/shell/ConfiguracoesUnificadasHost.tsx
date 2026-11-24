// ============================================================================
// U-1 — montagem do modal unificado.
//
// Este componente é a ponte entre a moldura neutra e as Casas. O App passa as
// dependências que já possui (alvo da conversa, tema, workspace) e recebe os
// painéis prontos: nenhuma tela é reimplementada aqui, e a moldura não conhece
// config, provedor, segredo nem personalização (R10).
// ============================================================================

import { ConfiguracoesUnificadas } from './ConfiguracoesUnificadas'
import { usePaineisConfiguracoes } from './usePaineisConfiguracoes'
import type { ConfiguracoesUnificadasWiring } from './useConfiguracoesUnificadas'
import type { ConfigAgente } from '../bairros/2-inteligencia/casas/config'

export interface ConfiguracoesUnificadasHostProps {
  wiring: ConfiguracoesUnificadasWiring
  alvo: { sessionId: string; chatId: string }
  workspaceAtual?: string
  tema: 'light' | 'dark'
  onAlternarTema: () => void
  onConfigSalva: (config: ConfigAgente) => void
  onNovaSessaoComPasta: () => void
}

export function ConfiguracoesUnificadasHost({
  wiring, alvo, workspaceAtual, tema, onAlternarTema, onConfigSalva, onNovaSessaoComPasta,
}: ConfiguracoesUnificadasHostProps) {
  const { paineis, subsecoes, tituloSubsecao } = usePaineisConfiguracoes({
    alvo,
    workspaceAtual,
    tema,
    onAlternarTema,
    onConfigSalva,
    onReportarEstado: wiring.reportarEstado,
    limpezaReveal: wiring.limpezaReveal,
    subsecaoAtiva: wiring.rota.subsecao,
    onIrParaSecao: (secao) => wiring.navegar({ categoria: 'personalizacoes', subsecao: secao }),
    onNovaSessaoComPasta: () => { wiring.fechar(); onNovaSessaoComPasta() },
  })

  return (
    <ConfiguracoesUnificadas
      rota={wiring.rota}
      onNavegar={wiring.navegar}
      onFechar={wiring.fechar}
      paineis={paineis}
      subsecoes={subsecoes}
      tituloSubsecao={wiring.rota.categoria === 'personalizacoes'
        ? tituloSubsecao(wiring.rota.subsecao ?? 'visao')
        : undefined}
      confirmacaoAberta={wiring.confirmacaoDescarte}
      salvando={wiring.salvando}
      onContinuarEditando={wiring.continuarEditando}
      onDescartarRascunhos={wiring.descartarRascunhosEFechar}
      focoDeRetorno={wiring.obterAcionador}
    />
  )
}
