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

export function ConfigView({ aoSalvar }: { aoSalvar?: (config: ConfigAgente) => void }) {
  const [config, setConfig] = useState<ConfigAgente | null>(null)
  const [erroCarregar, setErroCarregar] = useState('')
  // Rascunhos: só viram verdade no Salvar.
  const [teto, setTeto] = useState(TETO_PADRAO)
  const [autoScroll, setAutoScroll] = useState(AUTOSCROLL_PADRAO)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    carregarConfig()
      .then((valor) => {
        if (!ativo) return
        setConfig(valor)
        setTeto(valor.teto)
        setAutoScroll(valor.autoScroll)
      })
      .catch((motivo) => {
        if (ativo) setErroCarregar(motivo instanceof Error ? motivo.message : String(motivo))
      })
    return () => {
      ativo = false
    }
  }, [])

  function mexer(novoTeto: number, novoScroll: boolean): void {
    setTeto(novoTeto)
    setAutoScroll(novoScroll)
    setSalvo(false)
  }

  async function aoClicarSalvar(): Promise<void> {
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
      <section className="config-view" aria-label="Configurações">
        <p className="config-loading">Carregando configurações…</p>
      </section>
    )
  }

  return (
    <section className="config-view" aria-label="Configurações">
      <header className="config-head">
        <h1>Configurações</h1>
        <p>
          Ajustes do agente. Tudo fica guardado só no seu computador, em ~/.agente_window/settings.json — fora do projeto, nunca vai para o Git.
        </p>
      </header>

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

      <div className="config-foot">
        <span className="config-saved" aria-live="polite">
          {salvo ? (<><Sparkles size={12} /> Configuração salva</>) : ''}
        </span>
        <button type="button" className="config-btn is-primary" onClick={() => void aoClicarSalvar()} disabled={salvando}>
          {salvando ? <LoaderCircle size={13} className="spin" /> : <Save size={13} />}
          {salvando ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </div>
    </section>
  )
}
