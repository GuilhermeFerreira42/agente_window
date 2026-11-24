// ============================================================================
// U-1 — composição dos painéis do modal unificado.
//
// O App entrega as dependências (o que ele já sabe: sessão ativa, tema, autoscroll);
// este hook só MONTA os painéis das Casas pelos seus barrels e reporta fatos
// (dirty/saving) para a moldura. Nenhum dado de configuração é copiado para cá:
// ConfigView, ProvidersView e PersonalizacoesView seguem donos do seu estado,
// dos seus rascunhos e dos seus serviços (R03/R04/R05/R07).
// ============================================================================

import { useCallback } from 'react'
import { ConfigView } from '../bairros/2-inteligencia/casas/config'
import { ProvidersView } from '../bairros/2-inteligencia/casas/provedores'
import {
  PERSONALIZATION_SECTIONS,
  PersonalizacoesView,
  type PersonalizationSection,
} from '../bairros/2-inteligencia/casas/personalizacoes'
import type { ConfigAgente } from '../bairros/2-inteligencia/casas/config'
import type { ItemPainel } from './ConfiguracoesUnificadas'
import {
  AparenciaPainel,
  ConversasArmazenamentoPainel,
  PermissoesPainel,
  WorkspacesPainel,
} from './paineisConfiguracoes'
import {
  SUBSECOES_PERSONALIZACOES,
  ehSubsecao,
  type CategoriaConfiguracoes,
  type EstadoPainel,
  type SubsecaoPersonalizacoes,
} from '../domain/configuracoesUnificadas'

export interface DependenciasPaineis {
  /** Alvo das Casas de IA: identidade da conversa (nunca o caminho). */
  alvo: { sessionId: string; chatId: string }
  workspaceAtual?: string
  tema: 'light' | 'dark'
  onAlternarTema: () => void
  /** Eco do servidor: o chat usa o mesmo estado da barra superior (R03). */
  onConfigSalva: (config: ConfigAgente) => void
  onReportarEstado: (categoria: CategoriaConfiguracoes, estado: EstadoPainel) => void
  /** R04 — contador de troca de categoria: limpa o reveal em memória. */
  limpezaReveal: number
  /** Seção de Personalizações que a NAVEGAÇÃO do modal está mostrando. */
  subsecaoAtiva?: PersonalizationSection
  /** Card da tela que leva a uma seção: navega na mesma nav, não em outra. */
  onIrParaSecao: (secao: SubsecaoPersonalizacoes) => void
  /** R06 — levar a "Nova sessão com pasta" sem inventar caminho. */
  onNovaSessaoComPasta: () => void
}

export interface PaineisCompostos {
  paineis: Partial<Record<CategoriaConfiguracoes, ItemPainel>>
  /** R02 — só as três seções de Personalizações entram na nav única. */
  subsecoes: readonly { id: SubsecaoPersonalizacoes; label: string }[]
  tituloSubsecao: (subsecao?: PersonalizationSection) => string | undefined
}

export function usePaineisConfiguracoes(deps: DependenciasPaineis): PaineisCompostos {
  const {
    alvo, workspaceAtual, tema, onAlternarTema, onConfigSalva,
    onReportarEstado, limpezaReveal, subsecaoAtiva, onIrParaSecao, onNovaSessaoComPasta,
  } = deps
  const reportarGeral = useCallback(
    (estado: EstadoPainel) => onReportarEstado('geral', estado), [onReportarEstado])
  const reportarProvedores = useCallback(
    (estado: EstadoPainel) => onReportarEstado('provedores', estado), [onReportarEstado])

  const paineis: Partial<Record<CategoriaConfiguracoes, ItemPainel>> = {
    geral: {
      montavel: true,
      conteudo: (
        <ConfigView
          hospedado
          semTitulo
          acoesNaMoldura
          aoMudarEstado={reportarGeral}
          aoSalvar={onConfigSalva}
        />
      ),
    },
    aparencia: {
      montavel: true,
      // Mesmo estado/ação da barra superior: nada de tema paralelo (R03).
      conteudo: <AparenciaPainel tema={tema} onAlternarTema={onAlternarTema} />,
    },
    provedores: {
      montavel: true,
      conteudo: (
        <ProvidersView
          hospedado
          acoesNaMoldura
          limparReveal={limpezaReveal}
          aoMudarEstado={reportarProvedores}
        />
      ),
    },
    personalizacoes: {
      montavel: true,
      // Sem `sectionRequest`: a seção é a ROTA do modal (`rota.subsecao`) e os
      // cards da tela navegam por `onIrParaSecao`. Uma fonte só de verdade.
      conteudo: (
        <PersonalizacoesView
          embedded
          semNavegacaoPropria
          semTitulo
          alvo={alvo}
          sectionRequest={{ section: subsecaoAtiva ?? 'visao', serial: 0 }}
          onSectionChange={(secao) => { if (ehSubsecao(secao)) onIrParaSecao(secao) }}
        />
      ),
    },
    permissoes: {
      montavel: true,
      conteudo: <PermissoesPainel alvo={alvo} temPasta={Boolean(workspaceAtual)} />,
    },
    'conversas-armazenamento': {
      // R06: o App não conhece o diretório de dados neste ponto e não vai
      // deduzi-lo. O painel diz isso em vez de mostrar caminho inventado.
      montavel: true,
      conteudo: <ConversasArmazenamentoPainel />,
    },
    workspaces: {
      montavel: true,
      conteudo: (
        <WorkspacesPainel
          workspaceAtual={workspaceAtual}
          onNovaSessaoComPasta={onNovaSessaoComPasta}
        />
      ),
    },
  }

  return {
    paineis,
    subsecoes: SUBSECOES_PERSONALIZACOES.map((id) => ({
      id,
      label: PERSONALIZATION_SECTIONS.find((secao) => secao.id === id)?.label ?? id,
    })),
    tituloSubsecao: (subsecao) =>
      subsecao ? PERSONALIZATION_SECTIONS.find((secao) => secao.id === subsecao)?.label : undefined,
  }
}
