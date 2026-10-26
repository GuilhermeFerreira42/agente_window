// ============================================================================
// Casa Provedores — a tela (D69: bairro 2 · Inteligência).
// Cara desenhada com o dono em 15/10 (mockup_provedores.html — removido na limpeza de 21/10; a cara já está neste código):
// lista à esquerda com busca · formulário à direita · olhinho na chave (D83) ·
// avisos honestos do teste de conexão · 8 provedores (7 nativos + genérico).
// ============================================================================
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, Eye, EyeOff, Gauge, LoaderCircle, Save, Search, Settings2, Sparkles, TriangleAlert, Wifi } from 'lucide-react'
import type { EstadoProvedores, ProvedorConfig, ProvedorNaTela, ResultadoTeste } from '../contract'
import { DESCRITORES, descritorPorId } from '../descritores/registro'
import { buscarModelos, carregarEstado, revelarChave, salvar, testar } from './client/api'
import '../providers.css'

type Grupo = { titulo: string; itens: { id: string; nome: string; tag?: string }[] }

export function ProvidersView() {
  const [estado, setEstado] = useState<EstadoProvedores | null>(null)
  const [erroCarregar, setErroCarregar] = useState('')
  const [selecionado, setSelecionado] = useState('openai')
  const [busca, setBusca] = useState('')
  // Rascunhos: o que o dono está editando agora (chave só entra aqui se digitada/revelada).
  const [rascunhos, setRascunhos] = useState<Record<string, ProvedorConfig>>({})
  const [chaveEditada, setChaveEditada] = useState<Record<string, string>>({})
  const [revelada, setRevelada] = useState<Record<string, boolean>>({})
  const [modelos, setModelos] = useState<Record<string, string[]>>({})
  const [resultado, setResultado] = useState<ResultadoTeste | null>(null)
  const [avisoBusca, setAvisoBusca] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    carregarEstado()
      .then((valor) => {
        if (!ativo) return
        setEstado(valor)
        setSelecionado(valor.ativo ?? valor.provedores[0]?.id ?? 'openai')
      })
      .catch((motivo) => {
        if (ativo) setErroCarregar(motivo instanceof Error ? motivo.message : String(motivo))
      })
    return () => {
      ativo = false
    }
  }, [])

  const grupos: Grupo[] = useMemo(() => {
    const nativos = DESCRITORES.filter((d) => !d.generico)
    const generico = DESCRITORES.filter((d) => d.generico)
    const configurados = new Set((estado?.provedores ?? []).map((p) => p.id))
    const filtrar = (lista: { id: string; nome: string }[]) =>
      lista
        .filter((d) => d.nome.toLowerCase().includes(busca.trim().toLowerCase()))
        .map((d) => ({ id: d.id, nome: d.nome, tag: configurados.has(d.id) ? 'configurado' : undefined }))
    return [
      { titulo: 'Prontos para usar', itens: filtrar(nativos) },
      { titulo: 'Qualquer outro serviço', itens: filtrar(generico) },
    ]
  }, [busca, estado])

  const descritor = descritorPorId(selecionado)
  const daTela: ProvedorNaTela | undefined = estado?.provedores.find((p) => p.id === selecionado)
  const rascunho: ProvedorConfig = rascunhos[selecionado] ?? {
    nome: daTela?.nome,
    baseUrl: daTela?.baseUrl ?? descritor?.baseUrlPadrao ?? '',
    modelo: daTela?.modelo ?? '',
    modelosHabilitados: daTela?.modelosHabilitados ?? [],
    habilitado: daTela?.habilitado ?? true,
    contexto: daTela?.contexto ?? descritor?.padroes.contexto,
    maxSaida: daTela?.maxSaida ?? descritor?.padroes.maxSaida,
    temperatura: daTela?.temperatura ?? descritor?.padroes.temperatura,
  }
  const chaveDigitada = chaveEditada[selecionado]
  const chaveVisivel = revelada[selecionado] === true

  function editar(mudanca: Partial<ProvedorConfig>) {
    setRascunhos((atual) => ({ ...atual, [selecionado]: { ...rascunho, ...mudanca } }))
    setSalvo(false)
  }

  function aoTrocarDeProvedor(id: string) {
    setSelecionado(id)
    setResultado(null)
    setAvisoBusca('')
    setErro('')
  }

  async function aoClicarOlho() {
    if (chaveVisivel) {
      setRevelada((atual) => ({ ...atual, [selecionado]: false }))
      return
    }
    try {
      const chave = await revelarChave(selecionado)
      setChaveEditada((atual) => ({ ...atual, [selecionado]: chave }))
      setRevelada((atual) => ({ ...atual, [selecionado]: true }))
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : String(motivo))
    }
  }

  function alternarModeloHabilitado(modelId: string, habilitar: boolean) {
    const atuais = Array.isArray(rascunho.modelosHabilitados) ? rascunho.modelosHabilitados : []
    const proximos = habilitar ? [...new Set([...atuais, modelId])] : atuais.filter((id) => id !== modelId)
    editar({ modelosHabilitados: proximos })
  }

  const alvoDaChamada = () => ({
    id: selecionado,
    baseUrl: rascunho.baseUrl,
    modelo: rascunho.modelo,
    ...(chaveDigitada ? { apiKey: chaveDigitada } : {}),
  })

  async function aoTestar() {
    setOcupado('testar')
    setResultado(null)
    setErro('')
    try {
      setResultado(await testar(alvoDaChamada()))
    } catch (motivo) {
      setResultado({ ok: false, categoria: 'resposta', mensagem: motivo instanceof Error ? motivo.message : String(motivo), ms: 0 })
    } finally {
      setOcupado('')
    }
  }

  async function aoBuscarModelos() {
    setOcupado('modelos')
    setAvisoBusca('')
    setErro('')
    try {
      const resposta = await buscarModelos(alvoDaChamada())
      if (resposta.ok) setModelos((atual) => ({ ...atual, [selecionado]: resposta.modelos }))
      else setAvisoBusca(resposta.mensagem ?? 'Não foi possível listar os modelos.')
    } catch (motivo) {
      setAvisoBusca(motivo instanceof Error ? motivo.message : String(motivo))
    } finally {
      setOcupado('')
    }
  }

  // Constrói o que vai ser gravado: o que já existe no disco + o que está na tela
  // (rascunhos) + as chaves digitadas ('' apaga; texto salva — D84).
  function montarProvedores(): Record<string, ProvedorConfig> {
    const base =
      estado?.provedores.reduce<Record<string, ProvedorConfig>>((mapa, p) => {
        mapa[p.id] = {
          // `nome` inclusive: sem ele, o próximo salvamento apagaria o nome do
          // serviço genérico e o servidor recusaria ("dê um nome ao serviço").
          nome: p.nome,
          baseUrl: p.baseUrl,
          modelo: p.modelo,
          modelosHabilitados: p.modelosHabilitados,
          habilitado: p.habilitado,
          contexto: p.contexto,
          maxSaida: p.maxSaida,
          temperatura: p.temperatura,
        }
        return mapa
      }, {}) ?? {}
    const merged: Record<string, ProvedorConfig> = { ...base }
    for (const [id, r] of Object.entries(rascunhos)) merged[id] = { ...(merged[id] ?? {}), ...r }
    for (const [id, digitada] of Object.entries(chaveEditada)) {
      if (digitada === undefined) continue
      merged[id] = { ...(merged[id] ?? {}), apiKey: digitada }
    }
    return merged
  }

  async function aoSalvar() {
    setSalvando(true)
    setErro('')
    try {
      const proximo = await salvar({ ativo: estado?.ativo ?? null, provedores: montarProvedores() })
      setEstado((atual) => (atual ? { ...atual, ...proximo } : proximo))
      setSalvo(true)
      // Depois de salvar, a chave digitada vira "guardada": limpa o rascunho dela.
      setChaveEditada({})
      setRevelada({})
      setRascunhos({})
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : String(motivo))
    } finally {
      setSalvando(false)
    }
  }

  async function aoDefinirAtivo() {
    setEstado((atual) => (atual ? { ...atual, ativo: selecionado } : atual))
    setRascunhos((atual) => ({ ...atual }))
    setSalvo(false)
    // Persiste na hora: o "provedor ativo" é uma escolha pequena e imediata.
    // Vai o MESMO pacote do Salvar (senão o servidor recusa o genérico sem nome
    // e a escolha se perderia no F5).
    try {
      const proximo = await salvar({ ativo: selecionado, provedores: montarProvedores() })
      setEstado((atual) => (atual ? { ...atual, ...proximo } : proximo))
      setSalvo(false)
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : String(motivo))
    }
  }

  if (!estado && !erroCarregar) {
    return (
      <section className="providers-view" aria-label="Provedores">
        <p className="providers-loading">Carregando provedores…</p>
      </section>
    )
  }

  return (
    <section className="providers-view" aria-label="Provedores">
      <header className="providers-head">
        <h1>Provedores</h1>
        <p>
          Configure as fontes de modelos de IA. A chave fica guardada só no seu computador — fora do projeto, nunca vai para o Git.
        </p>
      </header>

      {erroCarregar && (
        <div className="providers-banner is-error" role="alert">
          <CircleAlert size={15} /> {erroCarregar}
        </div>
      )}

      <div className="providers-cols">
        <nav className="providers-rail" aria-label="Lista de provedores">
          <label className="providers-search">
            <Search size={13} />
            <input aria-label="Buscar provedor" placeholder="Buscar provedor…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          {grupos.map((grupo) => (
            <div className="providers-group" key={grupo.titulo}>
              <span className="providers-group-title">{grupo.titulo}</span>
              {grupo.itens.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`providers-item${item.id === selecionado ? ' is-selected' : ''}`}
                  aria-pressed={item.id === selecionado}
                  data-provider-id={item.id}
                  onClick={() => aoTrocarDeProvedor(item.id)}
                >
                  <span className={`providers-dot${item.tag ? ' is-on' : ''}`} />
                  <span className="providers-item-name">{item.nome}</span>
                  {item.tag ? <span className="providers-item-tag">{item.tag}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <form className="providers-form" onSubmit={(evento) => { evento.preventDefault(); void aoSalvar() }}>
          <div className="providers-form-head">
            <div>
              {/* No genérico (1 slot), o título mostra o serviço escolhido: "Compatível com OpenAI · Groq". */}
              <h2>{descritor?.generico && daTela?.nome ? `${descritor.nome} · ${daTela.nome}` : descritor?.nome}</h2>
              <span className="providers-sub">{descritor?.dica}</span>
            </div>
            <span className="providers-grow" />
            {estado?.ativo === selecionado ? (
              <span className="providers-chip is-active">
                <CheckCircle2 size={12} /> provedor ativo do chat
              </span>
            ) : null}
          </div>

          <label className="providers-field">
            <span className="providers-label">Disponibilidade do provedor</span>
            <span className="providers-hint">
              <input type="checkbox" aria-label="Provedor habilitado" checked={rascunho.habilitado !== false} onChange={(e) => editar({ habilitado: e.target.checked })} />
              Habilitado para novas chamadas (desabilitar não apaga configuração nem histórico)
            </span>
          </label>

          {descritor?.generico ? (
            <label className="providers-field">
              <span className="providers-label">Nome do serviço</span>
              <input
                className="providers-input"
                value={rascunho.nome ?? ''}
                placeholder="ex.: Groq, LM Studio, xAI…"
                onChange={(e) => editar({ nome: e.target.value })}
              />
            </label>
          ) : null}

          <div className="providers-field">
            <span className="providers-label">
              Chave de API
              {descritor?.urlChave ? (
                <a className="providers-link" href={descritor.urlChave} target="_blank" rel="noreferrer">
                  pegar a chave aqui ↗
                </a>
              ) : null}
            </span>
            <div className="providers-input-row">
              <input
                className="providers-input is-mono"
                type={chaveVisivel ? 'text' : 'password'}
                aria-label={`Chave de API ${descritor?.nome}`}
                placeholder={daTela?.chaveMascarada ?? 'cole a chave aqui'}
                value={chaveVisivel ? (chaveEditada[selecionado] ?? daTela?.chaveMascarada ?? '') : chaveDigitada ?? ''}
                onChange={(e) => {
                  setChaveEditada((atual) => ({ ...atual, [selecionado]: e.target.value }))
                  setRevelada((atual) => ({ ...atual, [selecionado]: true }))
                  setSalvo(false)
                }}
              />
              <button
                type="button"
                className="providers-eye"
                aria-label={chaveVisivel ? 'Ocultar a chave' : 'Mostrar a chave'}
                title={chaveVisivel ? 'Ocultar a chave' : 'Mostrar a chave'}
                onClick={() => void aoClicarOlho()}
              >
                {chaveVisivel ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {daTela?.origemChave === 'salva' ? (
              <span className="providers-hint is-ok">
                <CheckCircle2 size={12} /> guardada em ~/.agente_window/providers.json (fora do projeto) — nunca entra no Git
              </span>
            ) : daTela?.origemChave === 'ambiente' ? (
              <span className="providers-hint">
                chave vinda do ambiente do sistema ({daTela.variavelAmbiente}) — não está salva em disco
              </span>
            ) : descritor?.chaveOpcional ? (
              <span className="providers-hint">este provedor não exige chave (roda na sua máquina)</span>
            ) : (
              <span className="providers-hint">
                sem chave guardada — cole a sua{daTela?.variavelAmbiente ? ` ou defina ${daTela.variavelAmbiente} no sistema` : ''}
              </span>
            )}
          </div>

          <div className="providers-field">
            <span className="providers-label">Endereço do serviço (URL base)</span>
            <input
              className="providers-input is-mono"
              aria-label={`Endereço do serviço ${descritor?.nome}`}
              value={rascunho.baseUrl}
              placeholder={descritor?.generico ? 'https://api.groq.com/openai/v1' : ''}
              onChange={(e) => editar({ baseUrl: e.target.value })}
            />
          </div>

          <div className="providers-field">
            <span className="providers-label">Modelo</span>
            <div className="providers-input-row">
              <input
                className="providers-input is-mono"
                aria-label={`Modelo ${descritor?.nome}`}
                value={rascunho.modelo}
                placeholder="escolha da lista ou digite à mão"
                onChange={(e) => editar({ modelo: e.target.value })}
              />
              <button type="button" className="providers-btn is-secondary" onClick={() => void aoBuscarModelos()} disabled={ocupado === 'modelos'}>
                {ocupado === 'modelos' ? <LoaderCircle size={13} className="spin" /> : <Search size={13} />} Buscar modelos
              </button>
            </div>
            {(modelos[selecionado]?.length ?? 0) > 0 ? (
              <select
                className="providers-input"
                aria-label={`Modelos disponíveis em ${descritor?.nome}`}
                value={rascunho.modelo}
                onChange={(e) => editar({ modelo: e.target.value })}
              >
                <option value="">escolha um modelo…</option>
                {(modelos[selecionado] ?? []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : null}
            {(modelos[selecionado]?.length ?? 0) > 0 ? (
              <div className="providers-model-candidates" aria-label="Habilitar modelos disponíveis">
                {(modelos[selecionado] ?? []).map((modelId) => (
                  <label key={modelId} className="providers-hint">
                    <input
                      type="checkbox"
                      aria-label={`Habilitar modelo ${modelId}`}
                      checked={(rascunho.modelosHabilitados ?? []).includes(modelId)}
                      onChange={(e) => alternarModeloHabilitado(modelId, e.target.checked)}
                    />
                    Habilitar {modelId}
                  </label>
                ))}
              </div>
            ) : null}
            {rascunho.modelo.trim() && !(rascunho.modelosHabilitados ?? []).includes(rascunho.modelo.trim()) ? (
              <button type="button" className="providers-btn is-secondary" onClick={() => alternarModeloHabilitado(rascunho.modelo.trim(), true)}>
                Habilitar modelo padrão atual
              </button>
            ) : null}
            <span className="providers-hint">Descobertos são candidatos; cada par precisa ser habilitado explicitamente. O ID é case-sensitive.</span>
          </div>

          {avisoBusca ? (
            <div className="providers-banner is-warn" role="status">
              <TriangleAlert size={14} /> {avisoBusca}
            </div>
          ) : null}

          <details className="providers-adv" open>
            <summary>
              <Settings2 size={13} /> Ajustes avançados <span className="providers-sub">(já vêm preenchidos; mexer só se quiser)</span>
            </summary>
            <div className="providers-adv-grid">
              <label className="providers-field">
                <span className="providers-label">Contexto (tokens)</span>
                <input
                  className="providers-input is-mono"
                  type="number"
                  min={1}
                  value={rascunho.contexto ?? ''}
                  onChange={(e) => editar({ contexto: Number(e.target.value) })}
                />
              </label>
              <label className="providers-field">
                <span className="providers-label">Máximo de saída (tokens)</span>
                <input
                  className="providers-input is-mono"
                  type="number"
                  min={1}
                  value={rascunho.maxSaida ?? ''}
                  onChange={(e) => editar({ maxSaida: Number(e.target.value) })}
                />
              </label>
            </div>
            <label className="providers-field">
              <span className="providers-label">
                <Gauge size={12} /> Temperatura (criatividade): {String(rascunho.temperatura ?? 0.2).replace('.', ',')}
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={rascunho.temperatura ?? 0.2}
                onChange={(e) => editar({ temperatura: Number(e.target.value) })}
              />
            </label>
          </details>

          {resultado ? (
            <div className={`providers-banner ${resultado.ok ? 'is-ok' : resultado.categoria === 'tempo' ? 'is-warn' : 'is-error'}`} role="status">
              {resultado.ok ? <CheckCircle2 size={14} /> : resultado.categoria === 'tempo' ? <TriangleAlert size={14} /> : <CircleAlert size={14} />}
              <div>{resultado.mensagem}</div>
            </div>
          ) : null}

          {erro ? (
            <div className="providers-banner is-error" role="alert">
              <CircleAlert size={14} /> {erro}
            </div>
          ) : null}

          <div className="providers-foot">
            <label className="providers-radio">
              <input type="radio" name="provedor-ativo" checked={estado?.ativo === selecionado} onChange={() => void aoDefinirAtivo()} />
              usar este provedor no chat
            </label>
            <span className="providers-grow" />
            <span className="providers-saved" aria-live="polite">
              {salvo ? (
                <>
                  <Sparkles size={12} /> Configuração salva
                </>
              ) : (
                ''
              )}
            </span>
            <button type="button" className="providers-btn is-secondary" onClick={() => void aoTestar()} disabled={ocupado === 'testar'}>
              {ocupado === 'testar' ? <LoaderCircle size={13} className="spin" /> : <Wifi size={13} />} Testar conexão
            </button>
            <button type="submit" className="providers-btn is-primary" disabled={salvando}>
              <Save size={13} /> {salvando ? 'Salvando…' : 'Salvar provedores'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
