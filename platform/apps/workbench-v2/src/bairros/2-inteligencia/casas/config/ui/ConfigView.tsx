// ============================================================================
// Casa Config — a tela (FATIA 11, aba própria no editor central).
// v1: teto de iterações do agente (1–250) + rolagem automática do chat.
// Rascunho + Salvar explícito, como a casa Provedores: o slider não cospe
// PUT a cada pixel — o servidor grampeia e a tela mostra o eco final.
// ============================================================================
import { useEffect, useState } from 'react'
import { CircleAlert, LoaderCircle, Save, Sparkles } from 'lucide-react'
import type { ConfigAgente } from '../contract'
import { AUTOSCROLL_PADRAO, TETO_MAXIMO, TETO_MINIMO, TETO_PADRAO } from '../contract'
import { carregarConfig, salvarConfig } from './client/api'
import './config.css'

/**
 * Estado que a MOLDURA pode conhecer (U-1 R07). Só fatos: a moldura nunca
 * recebe valores de formulário e nunca decide salvar por conta própria.
 */
export interface EstadoPainelConfig {
  dirty: boolean
  saving: boolean
  canLeave: boolean
}

export interface ConfigViewProps {
  aoSalvar?: (config: ConfigAgente) => void
  /**
   * U-1: `hospedado` remove o cabeçalho próprio (o modal já titula a
   * categoria) sem mudar nada de dados, rascunho ou save.
   */
  hospedado?: boolean
  /** Avisa a moldura sobre rascunho/save. Não é autorização de escrita. */
  aoMudarEstado?: (estado: EstadoPainelConfig) => void
  /** Teto de título próprio: a moldura fornece o `h2`. */
  semTitulo?: boolean
  /**
   * U-1 R07: quando a moldura unificada hospeda a tela, ela desenha a barra de
   * ações no pé do diálogo. O botão é o MESMO (mesmo clique, mesmo dono do
   * estado) — só muda de lugar, para não ficar escondido pela rolagem.
   */
  acoesNaMoldura?: boolean
}

export function ConfigView({ aoSalvar, hospedado = false, aoMudarEstado, semTitulo = false, acoesNaMoldura = false }: ConfigViewProps = {}) {
  const [config, setConfig] = useState<ConfigAgente | null>(null)
  const [erroCarregar, setErroCarregar] = useState('')
  // Rascunhos: só viram verdade no Salvar.
  const [teto, setTeto] = useState(TETO_PADRAO)
  const [autoScroll, setAutoScroll] = useState(AUTOSCROLL_PADRAO)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  // U-1 T03: cada tentativa tem identidade própria; "Tentar novamente" refaz a
  // leitura e, ao dar certo, libera o Salvar (antes o PUT era permitido com os
  // defaults, gravando valor que o usuário nunca escolheu).
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    setErroCarregar('')
    carregarConfig()
      .then((valor) => {
        if (!ativo) return
        setConfig(valor)
        setTeto(valor.teto)
        setAutoScroll(valor.autoScroll)
        setSalvo(false)
      })
      .catch((motivo) => {
        // Sem base válida não existe "valor salvo": manter `config` nulo é o
        // que bloqueia o PUT e o que impede a tela de mentir.
        if (ativo) {
          setConfig(null)
          setErroCarregar(motivo instanceof Error ? motivo.message : String(motivo))
        }
      })
    return () => {
      ativo = false
    }
  }, [tentativa])

  // Rascunho = difere do eco confirmado. Só existe com base válida.
  const rascunho = config !== null && (teto !== config.teto || autoScroll !== config.autoScroll)

  useEffect(() => {
    aoMudarEstado?.({ dirty: rascunho, saving: salvando, canLeave: true })
  }, [aoMudarEstado, rascunho, salvando])

  function mexer(novoTeto: number, novoScroll: boolean): void {
    setTeto(novoTeto)
    setAutoScroll(novoScroll)
    setSalvo(false)
  }

  async function aoClicarSalvar(): Promise<void> {
    // Sem base válida não há o que salvar: o botão já está desabilitado, esta
    // guarda é a segunda barreira (PUT nunca sai com defaults por engano).
    if (!config) return
    setSalvando(true)
    setErro('')
    try {
      const proxima = await salvarConfig({ teto, autoScroll })
      // Eco do servidor: o que vale é o grampeado (1–250), não o digitado.
      setConfig(proxima)
      setTeto(proxima.teto)
      setAutoScroll(proxima.autoScroll)
      setSalvo(true)
      aoSalvar?.(proxima)
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : String(motivo))
    } finally {
      setSalvando(false)
    }
  }

  if (!config && !erroCarregar) {
    return (
      <section className={`config-view${hospedado ? ' is-hospedado' : ''}`} aria-label="Configurações">
        <p className="config-loading">Carregando configurações…</p>
      </section>
    )
  }

  // U-1 R03: falha de leitura NÃO cai em formulário com defaults. A tela
  // explica o estado, oferece nova tentativa e mantém o Salvar indisponível.
  if (!config && erroCarregar) {
    return (
      <section className={`config-view${hospedado ? ' is-hospedado' : ''}`} aria-label="Configurações">
        <div className="config-banner is-error" role="alert">
          <CircleAlert size={15} /> {erroCarregar}
        </div>
        <p className="config-hint" data-estado-leitura="falhou">
          Não foi possível ler a configuração do servidor. Nada foi alterado e o salvamento está
          indisponível até uma leitura válida.
        </p>
        <div className="config-foot">
          <button
            type="button"
            className="config-btn is-primary"
            onClick={() => setTentativa((valor) => valor + 1)}
            data-acao="tentar-novamente"
          >
            Tentar novamente
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={`config-view${hospedado ? ' is-hospedado' : ''}`} aria-label="Configurações">
      {!semTitulo && (
        <header className="config-head">
          <h1>Configurações</h1>
          <p>
            Ajustes do agente. Tudo fica guardado só no seu computador, em ~/.agente_window/settings.json — fora do projeto, nunca vai para o Git.
          </p>
        </header>
      )}

      {erroCarregar && (
        <div className="config-banner is-error" role="alert">
          <CircleAlert size={15} /> {erroCarregar}
        </div>
      )}

      <div className="config-section">
        <h2>Agente</h2>

        <div className="config-field">
          <span className="config-label" id="config-teto-rotulo">
            Teto de iterações: <strong aria-live="polite">{teto} {teto === 1 ? 'iteração' : 'iterações'}</strong>
          </span>
          <div className="config-range-row">
            <input
              type="range"
              aria-label="Ajustar teto de iterações"
              min={TETO_MINIMO}
              max={TETO_MAXIMO}
              step={1}
              value={teto}
              onChange={(e) => mexer(Number(e.target.value), autoScroll)}
            />
            <label className="config-number">
              <span className="config-sr">Teto de iterações do agente</span>
              <input
                type="number"
                min={TETO_MINIMO}
                max={TETO_MAXIMO}
                value={teto}
                onChange={(e) => mexer(Number(e.target.value), autoScroll)}
              />
            </label>
          </div>
          <span className="config-hint">
            Quantas iterações (idas ao modelo) o agente pode dar antes de perguntar se continua ({TETO_MINIMO}–{TETO_MAXIMO}). Uma iteração pode fazer várias ações de uma vez.
          </span>
        </div>

        <label className="config-check">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => mexer(teto, e.target.checked)}
          />
          <span>
            Rolagem automática do chat
            <span className="config-hint"> — o chat acompanha sozinho as respostas novas, mas nunca puxa de volta quem subiu para ler.</span>
          </span>
        </label>
      </div>

      {erro && (
        <div className="config-banner is-error" role="alert">
          <CircleAlert size={14} /> {erro}
        </div>
      )}

      <div className="config-foot" data-na-moldura={acoesNaMoldura ? 'sim' : 'nao'}>
        <span className="config-saved" aria-live="polite">
          {salvo ? (<><Sparkles size={12} /> Configuração salva</>) : ''}
        </span>
        <button
          type="button"
          className="config-btn is-primary"
          onClick={() => void aoClicarSalvar()}
          disabled={salvando || !config}
          data-rascunho={rascunho ? 'sim' : 'nao'}
        >
          {salvando ? <LoaderCircle size={13} className="spin" /> : <Save size={13} />}
          {salvando ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </section>
  )
}
