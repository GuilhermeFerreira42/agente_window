import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, CircleAlert, Cloud, Save, Server } from 'lucide-react'
import type { ProvidersPayload } from '../server/providers'

export function ProvidersView() {
  const [payload, setPayload] = useState<ProvidersPayload | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/providers').then(async (response) => {
      if (!response.ok) throw new Error('Não foi possível carregar os provedores')
      return response.json() as Promise<ProvidersPayload>
    }).then((value) => { if (active) setPayload(value) }).catch((reason) => { if (active) setError(String(reason.message ?? reason)) })
    return () => { active = false }
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!payload) return
    setSaving(true); setSaved(false); setError('')
    try {
      const response = await fetch('/api/providers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: payload.config }) })
      const value = await response.json() as ProvidersPayload & { message?: string }
      if (!response.ok) throw new Error(value.message || 'Não foi possível salvar os provedores')
      setPayload(value); setSaved(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)) }
    finally { setSaving(false) }
  }

  const toggle = (id: 'openai' | 'gemini' | 'ollama', enabled: boolean) => setPayload((current) => current ? ({ ...current, config: { ...current.config, [id]: { ...current.config[id], enabled } } }) : current)
  if (!payload && !error) return <section className="providers-view" aria-label="Provedores"><p>Carregando provedores…</p></section>

  return <section className="providers-view" aria-label="Provedores">
    <header><h1>Provedores</h1><p>Configure as fontes de modelos. Provedores não são Agentes; nenhuma conexão real é feita nesta tela.</p></header>
    {error && <div className="providers-message is-error" role="alert"><CircleAlert size={14}/>{error}</div>}
    {payload && <form onSubmit={submit}>
      <div className="providers-grid">
        {(['openai', 'gemini'] as const).map((id) => {
          const label = id === 'openai' ? 'OpenAI' : 'Gemini'
          const variable = id === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'
          const configured = id === 'openai' ? payload.environment.openaiConfigured : payload.environment.geminiConfigured
          return <article className="provider-card" key={id}>
            <div className="provider-card-title"><Cloud size={18}/><h2>{label}</h2><label className="provider-toggle"><input type="checkbox" checked={payload.config[id].enabled} onChange={(e) => toggle(id, e.target.checked)}/><span>Ativado</span></label></div>
            <p>A chave não é salva no arquivo de configuração.</p>
            <label>Chave de API<input type="password" value={configured ? '••••••••••••' : ''} readOnly placeholder={`Defina ${variable}`} aria-label={`Chave de API ${label}`}/></label>
            <div className={`provider-status${configured ? ' is-configured' : ''}`}>{configured ? <CheckCircle2 size={13}/> : <CircleAlert size={13}/>} {configured ? `Configurada via ${variable}` : `Não configurada — use ${variable}`}</div>
          </article>
        })}
        <article className="provider-card">
          <div className="provider-card-title"><Server size={18}/><h2>Ollama local</h2><label className="provider-toggle"><input type="checkbox" checked={payload.config.ollama.enabled} onChange={(e) => toggle('ollama', e.target.checked)}/><span>Ativado</span></label></div>
          <p>Endereço do servidor local. A conexão não é testada nesta fatia.</p>
          <label>URL base<input type="url" required value={payload.config.ollama.baseUrl} onChange={(e) => setPayload({ ...payload, config: { ...payload.config, ollama: { ...payload.config.ollama, baseUrl: e.target.value } } })}/></label>
        </article>
      </div>
      <div className="providers-actions"><span aria-live="polite">{saved ? 'Configuração salva' : ''}</span><button className="primary-button" type="submit" disabled={saving}><Save size={14}/>{saving ? 'Salvando…' : 'Salvar provedores'}</button></div>
    </form>}
  </section>
}
