// ============================================================================
// Casa Personalizações — TELA (Fatia 14, SPEC 2H v1).
//
// v1 é exatamente o que a SPEC limita: VISÃO GERAL + HABILIDADES + FERRAMENTAS.
// D182: categorias futuras aparecem apenas como navegação para uma mensagem
// explícita de indisponibilidade; não possuem serviços/configuração simulados.
//
// Segue a convenção das outras casas (ConfigView, ProvidersView): a casa é dona
// da própria tela e fala com o servidor SÓ por `./client/api` (FT-05 — as URLs
// moram na casa). O síndico apenas renderiza; nenhum estado de personalização
// mora em App.tsx (RNF14-3).
//
// RNF14-4: tudo em português. Os rótulos de grupo vêm do contrato
// (ROTULO_GRUPO_FERRAMENTA), não são reinventados aqui.
//
// As classes CSS reutilizadas são as `customizations-*` de styles/app.css, que é
// importado globalmente por main.tsx. Esta tela NÃO importa arquivo de CSS: se
// importasse, o barrel da casa passaria a arrastar CSS para dentro do grafo do
// servidor, que é quem importa o barrel para ler as constantes do contrato.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Blocks,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Eye,
  EyeOff,
  Gauge,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { EstadoPersonalizacoes, GrupoFerramenta, Skill, VisaoPersonalizacoes } from '../contract'
import { ROTULO_GRUPO_FERRAMENTA } from '../contract'
import { PERSONALIZATION_SECTIONS, type PersonalizationSection } from './sections'
import { PersonalizationIcon } from './PersonalizationIcon'
import {
  carregarPersonalizacoes,
  criarSkillNaTela,
  salvarEstadoPersonalizacoes,
  type AlvoPersonalizacoes,
} from './client/api'

/** As três seções da v1, na ordem do mockup. */
type Secao = 'visao' | 'habilidades' | 'ferramentas'

const SECOES: { id: Secao; rotulo: string; icone: JSX.Element }[] = [
  { id: 'visao', rotulo: 'Visão geral', icone: <Gauge size={13} /> },
  { id: 'habilidades', rotulo: 'Habilidades', icone: <Sparkles size={13} /> },
  { id: 'ferramentas', rotulo: 'Ferramentas', icone: <Wrench size={13} /> },
]

const ORDEM_GRUPO: GrupoFerramenta[] = ['leitura', 'escrita', 'destrutiva', 'execucao']

const ROTULO_ESCOPO = { projeto: 'Projeto', usuario: 'Usuário' } as const

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Algo deu errado. Tente novamente.'
}

export interface PersonalizacoesViewProps {
  /** true quando renderizada dentro do Custom View Grid (o grid já dá o título). */
  embedded?: boolean
  sectionRequest?: { section: PersonalizationSection; serial: number }
  onSectionChange?: (section: PersonalizationSection) => void
  /**
   * Identidade da conversa ativa. Sem ela o servidor não resolve a raiz de
   * projeto e só o escopo do usuário aparece — a tela diz isso em vez de fingir
   * que não há projeto. O caminho NUNCA é enviado: só a identidade (F1/D113).
   */
  alvo?: AlvoPersonalizacoes
}

export function PersonalizacoesView({ embedded = false, alvo, sectionRequest, onSectionChange }: PersonalizacoesViewProps) {
  const [visao, setVisao] = useState<VisaoPersonalizacoes | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroCarregar, setErroCarregar] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [queries, setQueries] = useState<Partial<Record<PersonalizationSection | 'shared', string>>>({})
  const [collapsed, setCollapsed] = useState<Partial<Record<Secao, boolean>>>({})
  const [activeSection, setActiveSection] = useState<PersonalizationSection>(sectionRequest?.section ?? 'visao')
  const queryKey = embedded ? activeSection : 'shared'
  const query = queries[queryKey] ?? ''
  const content = useRef<HTMLDivElement>(null)
  const categorySearch = useRef<HTMLInputElement>(null)
  const navigateSection = useCallback((section: PersonalizationSection) => {
    setActiveSection(section); setCollapsed(current => ({ ...current, [section]: false }));
    requestAnimationFrame(() => { if (content.current) content.current.scrollTop = 0 })
  }, [])
  useEffect(() => { if (sectionRequest && !carregando) navigateSection(sectionRequest.section) }, [sectionRequest, carregando, navigateSection])
  useEffect(() => {
    if (embedded && !carregando) categorySearch.current?.focus()
  }, [activeSection, carregando, embedded])
  const [formAberto, setFormAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [novoCorpo, setNovoCorpo] = useState('')
  const [novoEscopo, setNovoEscopo] = useState<'usuario' | 'projeto'>('usuario')

  // A identidade vira uma chave estável: recarrega quando a conversa ativa muda,
  // e não a cada render (o objeto `alvo` é novo a cada vez).
  const chaveAlvo = `${alvo?.sessionId ?? ''}:${alvo?.chatId ?? ''}`

  const carregar = useCallback(async (silencioso = false): Promise<void> => {
    if (!silencioso) setCarregando(true)
    setErroCarregar('')
    try {
      setVisao(await carregarPersonalizacoes(alvo))
    } catch (falha) {
      // RNF14-2: um problema de personalização nunca derruba a tela inteira.
      setErroCarregar(mensagemDe(falha))
      setVisao(null)
    } finally {
      setCarregando(false)
    }
    // `alvo` entra pela chave, não pela referência — ver comentário acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveAlvo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  /**
   * Salva um eixo e RECARREGA a visão. Recarregar em vez de recalcular aqui é
   * deliberado: `ligada` em skills e ferramentas é projeção do SERVIDOR. Refazer
   * essa conta na tela criaria uma segunda definição da mesma verdade, e as duas
   * acabariam divergindo.
   */
  const persistir = useCallback(async (parcial: Partial<EstadoPersonalizacoes>, feedback: string): Promise<void> => {
    setOcupado(feedback)
    setErro('')
    setAviso('')
    try {
      await salvarEstadoPersonalizacoes(parcial)
      await carregar(true)
      setAviso(feedback)
    } catch (falha) {
      setErro(mensagemDe(falha))
    } finally {
      setOcupado('')
    }
  }, [carregar])

  const alternarSkill = useCallback((skill: Skill): void => {
    if (!visao) return
    const desligadas = visao.estado.skillsDesligadas.filter((id) => id !== skill.id)
    if (skill.ligada) desligadas.push(skill.id)
    void persistir(
      { skillsDesligadas: desligadas },
      `Habilidade ${skill.nome} ${skill.ligada ? 'desligada' : 'ligada'}.`,
    )
  }, [visao, persistir])

  const alternarFerramenta = useCallback((id: string, ligada: boolean, titulo: string): void => {
    if (!visao) return
    const desligadas = visao.estado.ferramentasDesligadas.filter((item) => item !== id)
    if (ligada) desligadas.push(id)
    void persistir(
      { ferramentasDesligadas: desligadas },
      `Ferramenta ${titulo} ${ligada ? 'desligada' : 'ligada'}.`,
    )
  }, [visao, persistir])

  /** RF14-4 (entregável d): o liga/desliga também vale para o GRUPO inteiro. */
  const alternarGrupo = useCallback((grupo: GrupoFerramenta): void => {
    if (!visao) return
    const doGrupo = visao.ferramentas.filter((ferramenta) => ferramenta.grupo === grupo)
    if (doGrupo.length === 0) return
    const todasLigadas = doGrupo.every((ferramenta) => ferramenta.ligada)
    const desligadas = new Set(visao.estado.ferramentasDesligadas)
    for (const ferramenta of doGrupo) {
      if (todasLigadas) desligadas.add(ferramenta.id)
      else desligadas.delete(ferramenta.id)
    }
    const rotulo = ROTULO_GRUPO_FERRAMENTA[grupo]
    void persistir(
      { ferramentasDesligadas: [...desligadas] },
      `Grupo ${rotulo} ${todasLigadas ? 'desligado' : 'ligado'} por inteiro.`,
    )
  }, [visao, persistir])

  const criarSkill = useCallback(async (): Promise<void> => {
    setOcupado('Criando habilidade…')
    setErro('')
    setAviso('')
    try {
      const criada = await criarSkillNaTela({
        nome: novoNome.trim(),
        descricao: novaDescricao.trim(),
        corpo: novoCorpo,
        origem: novoEscopo,
      }, alvo)
      await carregar(true)
      setAviso(`Habilidade ${criada.nome} criada em ${ROTULO_ESCOPO[criada.origem]}.`)
      setFormAberto(false)
      navigateSection('habilidades')
      setNovoNome('')
      setNovaDescricao('')
      setNovoCorpo('')
    } catch (falha) {
      // A mensagem vem do servidor e já é legível ("Já existe…", "Nome inválido…").
      setErro(mensagemDe(falha))
    } finally {
      setOcupado('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novoNome, novaDescricao, novoCorpo, novoEscopo, carregar, navigateSection])

  const filtro = query.trim().toLowerCase()
  const skillsFiltradas = useMemo(() => {
    if (!visao) return []
    if (!filtro) return visao.skills
    return visao.skills.filter((skill) =>
      skill.nome.toLowerCase().includes(filtro) || skill.descricao.toLowerCase().includes(filtro))
  }, [visao, filtro])

  const ferramentasFiltradas = useMemo(() => {
    if (!visao) return []
    if (!filtro) return visao.ferramentas
    return visao.ferramentas.filter((ferramenta) =>
      ferramenta.id.toLowerCase().includes(filtro)
      || ferramenta.titulo.toLowerCase().includes(filtro)
      || ferramenta.descricao.toLowerCase().includes(filtro))
  }, [visao, filtro])

  if (carregando && !visao) {
    return (
      <section className="customizations-view" aria-label="Personalizações">
        <p className="customizations-empty"><LoaderCircle size={13} className="spin-icon" /> Carregando personalizações…</p>
      </section>
    )
  }

  // Conta só o que DE FATO chega ao agente: íntegra E ligada. Uma skill com erro
  // nunca é injetada (RF14-3), então contá-la como ativa seria mentir para o dono
  // — e a linha seguinte já mostra quantas estão com erro.
  const habilidadesAtivas = visao?.skills.filter((skill) => skill.estado === 'ok' && skill.ligada).length ?? 0
  const habilidadesComErro = visao?.skills.filter((skill) => skill.estado === 'com_erro').length ?? 0
  const ferramentasLigadas = visao?.ferramentas.filter((ferramenta) => ferramenta.ligada).length ?? 0
  const totalFerramentas = visao?.ferramentas.length ?? 0
  const category = PERSONALIZATION_SECTIONS.find(section => section.id === activeSection)!
  const selectCategory = (section: PersonalizationSection) => {
    navigateSection(section)
    onSectionChange?.(section)
  }
  const newSkillButton = (
    <button type="button" className="customizations-nova" onClick={() => setFormAberto(open => !open)} aria-expanded={formAberto}>
      <Plus size={13} /> Nova habilidade
    </button>
  )

  return (
    <section className="customizations-view personalizations-manager" aria-label="Personalizações">
      <nav className="personalizations-navigation" aria-label="Seções de Personalizações" onKeyDown={event => {
        const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End']
        if (!keys.includes(event.key)) return
        const buttons = Array.from(event.currentTarget.querySelectorAll('button'))
        const index = buttons.indexOf(event.target as HTMLButtonElement)
        if (index < 0) return
        const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index + direction
        event.preventDefault()
        buttons[Math.max(0, Math.min(buttons.length - 1, next))]?.focus()
      }}>
        <span className="personalizations-navigation-title">Personalizações</span>
        {PERSONALIZATION_SECTIONS.map(section => {
          const count = section.id === 'habilidades' ? visao?.skills.length : section.id === 'ferramentas' ? totalFerramentas : undefined
          return (
            <button type="button" key={section.id} aria-current={activeSection === section.id ? 'page' : undefined} onClick={() => selectCategory(section.id)}>
              <PersonalizationIcon section={section.id} />
              <span>{section.label}</span>
              {embedded && !!count && <span className="personalizations-nav-count" aria-hidden="true">{count}</span>}
            </button>
          )
        })}
      </nav>
      <div ref={content} className="personalizations-manager-content">
      {!category.available && <div className="personalizations-unavailable" role="status"><h2>{category.label}</h2><p>Esta funcionalidade ainda não está disponível nesta versão.</p></div>}
      <div hidden={!category.available}>
      {embedded ? (
        <header className="personalizations-category-heading">
          <h2>{category.label}</h2>
          <p>{activeSection === 'habilidades' ? 'Instruções reutilizáveis que o agente carrega quando são relevantes para a tarefa.' : activeSection === 'ferramentas' ? 'Gerencie as ferramentas disponíveis para os agentes do seu workspace.' : 'Gerencie as personalizações disponíveis para a conversa e o workspace.'}</p>
        </header>
      ) : <header className="customizations-header">
        <div className="customizations-title">
          <Blocks size={15} />
          {/* Dentro do grid o título já vem do cabeçalho dele; repetir criaria dois
              headings com o mesmo nome acessível. */}
          {!embedded && <h2>Personalizações</h2>}
          <span className="customizations-total" aria-label={`${habilidadesAtivas} habilidades ativas`}>
            {habilidadesAtivas}
          </span>
        </div>
        {newSkillButton}
      </header>}

      {/* O dono precisa VER quando algo não funcionou — nada aqui falha em silêncio. */}
      {erroCarregar && (
        <div className="customizations-banner is-error" role="alert">
          <CircleAlert size={13} /> {erroCarregar}
          <button type="button" onClick={() => void carregar()}>Tentar novamente</button>
        </div>
      )}
      {erro && <div className="customizations-banner is-error" role="alert"><CircleAlert size={13} /> {erro}</div>}
      {aviso && !erro && <div className="customizations-banner is-ok" role="status">{aviso}</div>}
      {ocupado && <div className="customizations-banner" role="status"><LoaderCircle size={13} className="spin-icon" /> {ocupado}</div>}

      {(!embedded || activeSection !== 'visao') && <div className="personalizations-category-toolbar">
        <label className="customizations-filter">
          <Search size={12} aria-hidden="true" />
          <input
            ref={categorySearch}
            value={query}
            onChange={event => {
              const value = event.target.value
              setQueries(current => ({ ...current, [queryKey]: value }))
            }}
            placeholder="Filtrar personalizações"
            aria-label="Filtrar personalizações"
          />
        </label>
        {embedded && activeSection === 'habilidades' && newSkillButton}
      </div>}

      {formAberto && (!embedded || activeSection === 'habilidades') && (
        <form
          className="customizations-form"
          onSubmit={(evento) => { evento.preventDefault(); void criarSkill() }}
          aria-label="Criar habilidade"
        >
          <label className="customizations-field">
            <span>Nome (usado na invocação /nome)</span>
            <input
              value={novoNome}
              onChange={(evento) => setNovoNome(evento.target.value)}
              placeholder="minha-habilidade"
              required
            />
          </label>
          <label className="customizations-field">
            <span>Descrição (uma linha)</span>
            <input
              value={novaDescricao}
              onChange={(evento) => setNovaDescricao(evento.target.value)}
              placeholder="O que esta habilidade faz"
              required
            />
          </label>
          <label className="customizations-field">
            <span>Instrução</span>
            <textarea
              value={novoCorpo}
              onChange={(evento) => setNovoCorpo(evento.target.value)}
              rows={3}
              placeholder="O que o agente deve fazer quando esta habilidade for invocada."
              required
            />
          </label>
          <label className="customizations-field">
            <span>Onde salvar</span>
            <select
              value={novoEscopo}
              onChange={(evento) => setNovoEscopo(evento.target.value === 'projeto' ? 'projeto' : 'usuario')}
            >
              <option value="usuario">Usuário (vale em todos os projetos)</option>
              <option value="projeto" disabled={!visao?.raizProjeto}>
                {visao?.raizProjeto ? 'Projeto (vale só nesta pasta)' : 'Projeto (sem pasta resolve)'}
              </option>
            </select>
          </label>
          <div className="customizations-form-actions">
            <button type="submit" disabled={ocupado !== ''}>Criar</button>
            <button type="button" onClick={() => setFormAberto(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="customizations-tree" role="tree" aria-label="Árvore de personalizações">
        {SECOES.map((secao) => {
          const isCollapsed = collapsed[secao.id] ?? false
          const contentId = `personalizacoes-secao-${secao.id}`
          return (
            <div className="customizations-section" id={`personalizacoes-section-${secao.id}`} style={{ display: activeSection === secao.id ? undefined : 'none' }} key={secao.id} role="treeitem" aria-expanded={!isCollapsed}>
              <button
                type="button"
                className="customizations-section-header"
                aria-expanded={!isCollapsed}
                aria-controls={contentId}
                onClick={() => setCollapsed((atual) => ({ ...atual, [secao.id]: !isCollapsed }))}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                {secao.icone}
                <span className="customizations-section-label">{secao.id === 'visao' ? 'Resumo' : secao.id === 'habilidades' ? 'Habilidades instaladas' : 'Ferramentas disponíveis'}</span>
                <span className="customizations-section-count">
                  {secao.id === 'habilidades' ? skillsFiltradas.length : secao.id === 'ferramentas' ? ferramentasFiltradas.length : 3}
                </span>
              </button>
              {!isCollapsed && (
                <div className="customizations-section-body" id={contentId} role="group">

                  {secao.id === 'visao' && (
                    <div>
                    <div className="personalizations-overview-cards"><button type="button" aria-label="Gerenciar habilidades" onClick={() => navigateSection('habilidades')}><Sparkles size={20}/><strong>Gerenciar habilidades</strong><span>{habilidadesAtivas} ativas</span></button><button type="button" aria-label="Gerenciar ferramentas" onClick={() => navigateSection('ferramentas')}><Wrench size={20}/><strong>Gerenciar ferramentas</strong><span>{ferramentasLigadas} de {totalFerramentas} ligadas</span></button></div>
                    <dl className="customizations-resumo">
                      <div><dt>Habilidades ativas</dt><dd>{habilidadesAtivas} de {visao?.skills.length ?? 0}</dd></div>
                      <div><dt>Habilidades com erro</dt><dd>{habilidadesComErro}</dd></div>
                      <div><dt>Ferramentas anunciadas</dt><dd>{ferramentasLigadas} de {totalFerramentas}</dd></div>
                      <div>
                        <dt>Pasta do projeto</dt>
                        <dd title={visao?.raizProjeto ?? undefined}>
                          {visao?.raizProjeto
                            ? visao.raizProjeto
                            : 'Não resolve — só habilidades de usuário'}
                        </dd>
                      </div>
                    </dl>
                    </div>
                  )}

                  {secao.id === 'habilidades' && (
                    <>
                      {skillsFiltradas.length === 0 && (
                        <p className="customizations-empty">
                          {visao && visao.skills.length === 0
                            ? 'Nenhuma habilidade ainda. Crie a primeira com "Nova habilidade".'
                            : 'Nenhuma habilidade corresponde ao filtro.'}
                        </p>
                      )}
                      {(['projeto', 'usuario'] as const).map((escopo) => {
                        const doEscopo = skillsFiltradas.filter((skill) => skill.origem === escopo)
                        if (doEscopo.length === 0) return null
                        return (
                          <div className="customizations-source-group" key={escopo}>
                            <div className="customizations-source-label">{ROTULO_ESCOPO[escopo]}</div>
                            {doEscopo.map((skill) => (
                              <div
                                className={`customizations-item${skill.ligada ? '' : ' is-disabled'}`}
                                key={skill.id}
                                role="treeitem"
                              >
                                <div className="customizations-item-main" title={skill.arquivo}>
                                  <span className="customizations-item-name">/{skill.nome}</span>
                                  <span className="customizations-item-desc">
                                    {skill.estado === 'com_erro'
                                      ? `com erro — ${skill.motivoErro ?? 'motivo não informado'}`
                                      : skill.descricao}
                                  </span>
                                </div>
                                <div className="customizations-item-actions">
                                  {skill.estado === 'com_erro' && (
                                    <span className="customizations-badge is-error" title={skill.motivoErro}>com erro</span>
                                  )}
                                  <button
                                    type="button"
                                    className="customizations-item-toggle"
                                    aria-label={`${skill.ligada ? 'Desligar' : 'Ligar'} ${skill.nome}`}
                                    aria-pressed={skill.ligada}
                                    title={skill.ligada ? 'Desligar' : 'Ligar'}
                                    // RF14-3: skill com erro não é injetável de qualquer forma; o botão
                                    // continua visível para o dono poder guardar a preferência.
                                    onClick={() => alternarSkill(skill)}
                                  >
                                    {skill.ligada ? <Eye size={15} /> : <EyeOff size={15} />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </>
                  )}

                  {secao.id === 'ferramentas' && (
                    <>
                      {ferramentasFiltradas.length === 0 && (
                        <p className="customizations-empty">Nenhuma ferramenta corresponde ao filtro.</p>
                      )}
                      {ORDEM_GRUPO.map((grupo) => {
                        const doGrupo = ferramentasFiltradas.filter((ferramenta) => ferramenta.grupo === grupo)
                        if (doGrupo.length === 0) return null
                        const ligadas = doGrupo.filter((ferramenta) => ferramenta.ligada).length
                        return (
                          <div className="customizations-source-group" key={grupo}>
                            <div className="customizations-source-label">
                              {/* O rótulo precisa de elemento próprio: sem o span o
                                  texto do div seria a concatenação com o botão, e
                                  ninguém conseguiria achar "Leitura" pelo nome. */}
                              <span>{ROTULO_GRUPO_FERRAMENTA[grupo]}</span>
                              <button
                                type="button"
                                className="customizations-grupo-toggle"
                                aria-label={`${ligadas === doGrupo.length ? 'Desligar' : 'Ligar'} o grupo ${ROTULO_GRUPO_FERRAMENTA[grupo]}`}
                                aria-pressed={ligadas === doGrupo.length}
                                onClick={() => alternarGrupo(grupo)}
                              >
                                {ligadas === doGrupo.length ? 'desligar grupo' : 'ligar grupo'}
                              </button>
                            </div>
                            {doGrupo.map((ferramenta) => (
                              <div
                                className={`customizations-item${ferramenta.ligada ? '' : ' is-disabled'}`}
                                key={ferramenta.id}
                                role="treeitem"
                              >
                                <div className="customizations-item-main">
                                  <span className="customizations-item-name">{ferramenta.titulo}</span>
                                  <span className="customizations-item-desc">{ferramenta.descricao}</span>
                                </div>
                                <div className="customizations-item-actions">
                                  <button
                                    type="button"
                                    className="customizations-item-toggle"
                                    aria-label={`${ferramenta.ligada ? 'Desligar' : 'Ligar'} ${ferramenta.titulo}`}
                                    aria-pressed={ferramenta.ligada}
                                    title={ferramenta.ligada
                                      ? 'Desligar — some do anúncio ao modelo'
                                      : 'Ligar — volta a ser anunciada ao modelo'}
                                    onClick={() => alternarFerramenta(ferramenta.id, ferramenta.ligada, ferramenta.titulo)}
                                  >
                                    {ferramenta.ligada ? <Eye size={15} /> : <EyeOff size={15} />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>
      </div>
    </section>
  )
}
