// ============================================================================
// U-1 — CONFIGURAÇÕES UNIFICADAS: domínio puro.
//
// O que este módulo decide (e só ele):
//   · o catálogo de categorias e a ordem aprovada pelo proprietário;
//   · a rota interna (categoria + subseção de Personalizações);
//   · a tradução das ENTRADAS LEGADAS (abas `config`/`providers` do editor e o
//     id `aiCustomizations`) para a categoria equivalente;
//   · os estados de painel que a moldura pode conhecer (dirty/saving/leitura).
//
// O que ele NÃO faz, por contrato (R10):
//   · não importa Casa nenhuma, não conhece React, não guarda valores de
//     formulário, chave revelada ou preferência de dados;
//   · não é um segundo gerenciador de configurações: os donos continuam sendo
//     os stores/serviços existentes (settings.json, providers.json,
//     personalizacoes.json, tema do navegador).
//
// Puro de propósito: sem IO, sem relógio, sem storage. Quem persiste é o shell.
// ============================================================================

/** Categorias do menu, na ordem e nos grupos aprovados (R02). */
export const CATEGORIAS_CONFIGURACOES = [
  'geral',
  'aparencia',
  'notificacoes',
  'provedores',
  'personalizacoes',
  'agentes-instrucoes',
  'permissoes',
  'mcp',
  'hooks',
  'plugins',
  'conversas-armazenamento',
  'workspaces',
  'importacao-backup',
] as const

export type CategoriaConfiguracoes = typeof CATEGORIAS_CONFIGURACOES[number]

/** Subseções de Personalizações que vivem na MESMA navegação (R02). */
export const SUBSECOES_PERSONALIZACOES = ['visao', 'habilidades', 'ferramentas'] as const
export type SubsecaoPersonalizacoes = typeof SUBSECOES_PERSONALIZACOES[number]

export interface RotaConfiguracoes {
  categoria: CategoriaConfiguracoes
  subsecao?: SubsecaoPersonalizacoes
}

export interface EntradaMenu {
  id: CategoriaConfiguracoes
  label: string
  /** `false` = a categoria explica o limite, sem ação fictícia (R02). */
  implementada: boolean
}

export interface GrupoMenu {
  id: 'aplicativo' | 'inteligencia' | 'dados'
  label: string
  entradas: readonly EntradaMenu[]
}

/**
 * Menu aprovado (R02). A ordem DESTE array é o contrato: os testes comparam a
 * sequência exata, não a presença.
 */
export const MENU_CONFIGURACOES: readonly GrupoMenu[] = [
  {
    id: 'aplicativo',
    label: 'Aplicativo',
    entradas: [
      { id: 'geral', label: 'Geral', implementada: true },
      { id: 'aparencia', label: 'Aparência', implementada: true },
      { id: 'notificacoes', label: 'Notificações', implementada: false },
    ],
  },
  {
    id: 'inteligencia',
    label: 'Inteligência Artificial',
    entradas: [
      { id: 'provedores', label: 'Provedores e modelos', implementada: true },
      { id: 'personalizacoes', label: 'Personalizações', implementada: true },
      // Atalhos legados (Agentes/Instruções/MCP/Hooks/Plugins) apontam para
      // ESTAS categorias — nunca criam entradas paralelas que pareçam serviços
      // diferentes (R02).
      { id: 'agentes-instrucoes', label: 'Agentes e instruções', implementada: false },
      { id: 'permissoes', label: 'Permissões', implementada: true },
      { id: 'mcp', label: 'MCP', implementada: false },
      { id: 'hooks', label: 'Hooks', implementada: false },
      { id: 'plugins', label: 'Plugins', implementada: false },
    ],
  },
  {
    id: 'dados',
    label: 'Dados e Ambiente',
    entradas: [
      { id: 'conversas-armazenamento', label: 'Conversas e armazenamento', implementada: true },
      { id: 'workspaces', label: 'Workspaces', implementada: true },
      { id: 'importacao-backup', label: 'Importação e backup', implementada: false },
    ],
  },
] as const

/** Texto único do estado "ainda não disponível" (R02) — sem botão fictício. */
export const TEXTO_INDISPONIVEL = 'Esta funcionalidade ainda não está disponível nesta versão.'

export const ROTA_PADRAO: RotaConfiguracoes = { categoria: 'geral' }

export function ehCategoria(valor: unknown): valor is CategoriaConfiguracoes {
  return typeof valor === 'string' && (CATEGORIAS_CONFIGURACOES as readonly string[]).includes(valor)
}

export function ehSubsecao(valor: unknown): valor is SubsecaoPersonalizacoes {
  return typeof valor === 'string' && (SUBSECOES_PERSONALIZACOES as readonly string[]).includes(valor)
}

/** Categoria implementada? As demais só explicam o limite. */
export function categoriaImplementada(categoria: CategoriaConfiguracoes): boolean {
  for (const grupo of MENU_CONFIGURACOES) {
    const entrada = grupo.entradas.find((item) => item.id === categoria)
    if (entrada) return entrada.implementada
  }
  return false
}

export function labelDaCategoria(categoria: CategoriaConfiguracoes): string {
  for (const grupo of MENU_CONFIGURACOES) {
    const entrada = grupo.entradas.find((item) => item.id === categoria)
    if (entrada) return entrada.label
  }
  return categoria
}

/**
 * Normaliza uma rota, aplicando as duas regras que evitam estado impossível:
 *   · `subsecao` só existe em Personalizações;
 *   · subseção inválida cai em `visao` (nunca em "nada").
 */
export function normalizarRota(rota: Partial<RotaConfiguracoes> | undefined): RotaConfiguracoes {
  const categoria = ehCategoria(rota?.categoria) ? rota.categoria : ROTA_PADRAO.categoria
  if (categoria !== 'personalizacoes') return { categoria }
  return { categoria, subsecao: ehSubsecao(rota?.subsecao) ? rota.subsecao : 'visao' }
}

export function mesmasRotas(a: RotaConfiguracoes, b: RotaConfiguracoes): boolean {
  return a.categoria === b.categoria && a.subsecao === b.subsecao
}

// ============================================================================
// Entradas legadas → categoria (R09)
//
// As abas `config`/`providers` do editor central e o id `aiCustomizations` do
// custom view grid deixam de ser superfícies de settings: passam a ABRIR o
// modal unificado na categoria certa. A tradução acontece ANTES de montar
// qualquer view — é o que impede as duas superfícies de coexistirem.
// ============================================================================

/** Chaves que o controlador/persistência existentes já conhecem. */
export const ALIASES_LEGADOS = {
  config: { categoria: 'geral' },
  providers: { categoria: 'provedores' },
  aiCustomizations: { categoria: 'personalizacoes', subsecao: 'visao' },
} as const satisfies Record<string, Partial<RotaConfiguracoes>>

export type AliasLegado = keyof typeof ALIASES_LEGADOS

/**
 * Traduz uma superfície legada para rota do modal.
 * `undefined` = não é superfície de settings; a aba continua sendo o que é.
 */
export function rotaDaSuperficieLegada(entrada: unknown): RotaConfiguracoes | undefined {
  if (typeof entrada !== 'string') return undefined
  const alias = (ALIASES_LEGADOS as Record<string, Partial<RotaConfiguracoes>>)[entrada]
  return alias ? normalizarRota(alias) : undefined
}

/**
 * Traduz o ALIAS DE SEÇÃO do Personalizações histórico. As seções antigas
 * `agentes`/`instrucoes`/`mcp`/`hooks`/`plugins` já existiam na navegação da
 * tela; elas apontam para as categorias de mesmo nome do menu novo, em vez de
 * sumirem (R02).
 */
export function categoriaDaSecaoLegada(secao: unknown): CategoriaConfiguracoes | undefined {
  switch (secao) {
    case 'visao':
    case 'habilidades':
    case 'ferramentas':
      return 'personalizacoes'
    case 'agentes':
    case 'instrucoes':
      return 'agentes-instrucoes'
    case 'mcp':
      return 'mcp'
    case 'hooks':
      return 'hooks'
    case 'plugins':
      return 'plugins'
    default:
      return undefined
  }
}

/**
 * Rota efetiva para um pedido de seção da tela de Personalizações. Se a seção
 * não pertence a Personalizações, devolve a categoria equivalente com a
 * subseção padrão (nunca uma subseção inventada).
 */
export function rotaDaSecao(secao: unknown): RotaConfiguracoes {
  const categoria = categoriaDaSecaoLegada(secao)
  if (categoria === 'personalizacoes') {
    return { categoria, subsecao: ehSubsecao(secao) ? secao : 'visao' }
  }
  return { categoria: categoria ?? 'personalizacoes', ...(categoria ? {} : { subsecao: 'visao' as const }) }
}

// ============================================================================
// Estado de painel — o pouco que a moldura pode saber (R07)
// ============================================================================

/**
 * `canLeave` é FATO informado pela tela, nunca autorização para o host salvar.
 * `dirty` significa "há rascunho não confirmado"; `saving` significa "há
 * escrita em curso e o fechamento precisa esperar".
 */
export interface EstadoPainel {
  dirty: boolean
  saving: boolean
  canLeave: boolean
}

export const PAINEL_NEUTRO: EstadoPainel = { dirty: false, saving: false, canLeave: true }

/** O modal pode fechar agora? Save em voo bloqueia o descarte (R07). */
export function podeFecharSemConfirmar(estado: EstadoPainel | undefined): boolean {
  if (!estado) return true
  return !estado.dirty && !estado.saving
}

/**
 * Decisão de fechamento: 'fechar' direto, 'confirmar' rascunho, ou 'aguardar'
 * porque há save em curso. Nunca inventamos um quarto caminho.
 */
export type DecisaoFechamento = 'fechar' | 'confirmar' | 'aguardar'

export function decidirFechamento(estado: EstadoPainel | undefined): DecisaoFechamento {
  if (!estado) return 'fechar'
  if (estado.saving) return 'aguardar'
  if (estado.dirty) return 'confirmar'
  return 'fechar'
}

// ============================================================================
// Expansão do modal e navegação por teclado (R01/R08)
// ============================================================================

/** O modal nasce EXPANDIDO; "restaurado" é o outro modo (R01). */
export type ModoModal = 'expandido' | 'restaurado'
export const MODO_INICIAL: ModoModal = 'expandido'

export function alternarModo(atual: ModoModal): ModoModal {
  return atual === 'expandido' ? 'restaurado' : 'expandido'
}

/**
 * Move o foco na navegação com as setas. Devolve o ÍNDICE (não o DOM: o
 * domínio é puro). Circular nos dois sentidos, como o menu de Personalizações
 * já fazia — é o comportamento que a casa adotou.
 */
export function indiceNaNavegacao(atual: number, tecla: string, total: number): number {
  if (total <= 0) return -1
  if (tecla === 'Home') return 0
  if (tecla === 'End') return total - 1
  if (tecla === 'ArrowDown' || tecla === 'ArrowRight') return (atual + 1 + total) % total
  if (tecla === 'ArrowUp' || tecla === 'ArrowLeft') return (atual - 1 + total) % total
  return atual
}

/** O que Enter/Espaço fazem numa entrada de navegação (nunca em categoria futura). */
export function deveAbrirComTecla(tecla: string): boolean {
  return tecla === 'Enter' || tecla === ' '
}
