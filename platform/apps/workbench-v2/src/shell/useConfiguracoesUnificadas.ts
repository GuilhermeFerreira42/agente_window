// ============================================================================
// U-1 — wiring do modal unificado de Configurações.
//
// O App é fino (C-2/R11): aqui mora a única porta de entrada de Configurações,
// Provedores e Personalizações e o que a moldura precisa saber dos painéis.
// Nada de dados: nem config, nem provedor, nem segredo passam por este hook —
// cada Casa continua dona do seu estado e dos seus serviços. O hook só guarda
// NAVEGAÇÃO (rota/modo aberto) e os FATOS que os painéis reportam (dirty/saving).
// ============================================================================

import { useCallback, useRef, useState } from 'react'
import {
  ROTA_PADRAO,
  decidirFechamento,
  normalizarRota,
  type CategoriaConfiguracoes,
  type EstadoPainel,
  type RotaConfiguracoes,
} from '../domain/configuracoesUnificadas'

export interface ConfiguracoesUnificadasWiring {
  rota: RotaConfiguracoes
  aberta: boolean
  /** R01 — porta única: abrir outra categoria com o diálogo aberto só navega. */
  abrir: (rota?: Partial<RotaConfiguracoes>) => void
  navegar: (rota: RotaConfiguracoes) => void
  fechar: () => void
  confirmacaoDescarte: boolean
  continuarEditando: () => void
  descartarRascunhosEFechar: () => void
  reportarEstado: (categoria: CategoriaConfiguracoes, estado: EstadoPainel) => void
  estadoPainel: Record<string, EstadoPainel>
  /** R04 — incrementa a cada troca de categoria; o painel limpa o reveal. */
  limpezaReveal: number
  salvando: boolean
  /**
   * R08 — o acionador real que abriu o modal, para devolver o foco ao fechar.
   * Capturado na ABERTURA (antes de o menu/aba sumir do DOM).
   */
  obterAcionador: () => HTMLElement | null
}

export function useConfiguracoesUnificadas(): ConfiguracoesUnificadasWiring {
  const [rota, setRota] = useState<RotaConfiguracoes>(ROTA_PADRAO)
  const [aberta, setAberta] = useState(false)
  // R07 — o que a moldura sabe de cada painel: só FATO (dirty/saving/canLeave).
  const [estadoPainel, setEstadoPainel] = useState<Record<string, EstadoPainel>>({})
  const [confirmacaoDescarte, setConfirmacaoDescarte] = useState(false)
  // R04 — sair da categoria Provedores oculta o segredo revelado; o rascunho fica.
  const [limpezaReveal, setLimpezaReveal] = useState(0)
  const acionador = useRef<HTMLElement | null>(null)

  const abrir = useCallback((destino?: Partial<RotaConfiguracoes>) => {
    // R08 — guarda quem abriu ANTES da montagem. Vindo de um item de menu, o
    // item é desmontado junto com o menu: o gatilho é o botão com `aria-expanded`
    // que estava aberto (Conta, "+" de abas), não o item clicado.
    const ativo = document.activeElement as HTMLElement | null
    const emMenu = ativo?.closest('[role="menu"]')
    acionador.current = (emMenu
      ? document.querySelector<HTMLElement>('[aria-haspopup][aria-expanded="true"]')
      : ativo?.closest<HTMLElement>('[aria-haspopup]') ?? ativo) ?? null
    setRota((atual) => (destino ? normalizarRota(destino) : atual))
    setAberta(true)
  }, [])

  const navegar = useCallback((destino: RotaConfiguracoes) => {
    const proxima = normalizarRota(destino)
    setRota((atual) => {
      // Troca de categoria: revelar não atravessa a fronteira (R04).
      if (atual.categoria !== proxima.categoria) setLimpezaReveal((valor) => valor + 1)
      return proxima
    })
  }, [])

  const fechar = useCallback(() => {
    const decisao = decidirFechamento(estadoPainel[rota.categoria])
    if (decisao === 'aguardar') return // save em voo bloqueia o fechamento (R07)
    if (decisao === 'confirmar') {
      setConfirmacaoDescarte(true)
      return
    }
    setAberta(false)
  }, [estadoPainel, rota.categoria])

  const continuarEditando = useCallback(() => setConfirmacaoDescarte(false), [])

  const descartarRascunhosEFechar = useCallback(() => {
    // Descartar não desfaz o que o servidor confirmou: a moldura sai e os
    // painéis desmontam, então a próxima abertura lê o estado real de novo.
    setConfirmacaoDescarte(false)
    setEstadoPainel({})
    setAberta(false)
  }, [])

  const reportarEstado = useCallback((categoria: CategoriaConfiguracoes, estado: EstadoPainel) => {
    setEstadoPainel((atual) => {
      const anterior = atual[categoria]
      if (anterior && anterior.dirty === estado.dirty && anterior.saving === estado.saving && anterior.canLeave === estado.canLeave) return atual
      return { ...atual, [categoria]: estado }
    })
  }, [])

  return {
    rota,
    aberta,
    abrir,
    navegar,
    fechar,
    confirmacaoDescarte,
    continuarEditando,
    descartarRascunhosEFechar,
    reportarEstado,
    estadoPainel,
    limpezaReveal,
    salvando: estadoPainel[rota.categoria]?.saving ?? false,
    obterAcionador: () => acionador.current,
  }
}
