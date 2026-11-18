// C-3a — domínio puro de anexos (R01/R02): máquina de estados do rascunho,
// nome seguro de caminho e DTOs sem bytes/locator. Sem IO, sem rede, sem
// armazenamento — importável por cliente e servidor.
export type EstadoTransfert = 'selecionado' | 'transferindo' | 'pronto' | 'falhou' | 'cancelado'

export type EventoTransfert =
  | { tipo: 'iniciar' }
  | { tipo: 'sucesso' }
  | { tipo: 'falha'; motivo?: string }
  | { tipo: 'cancelar' }
  | { tipo: 'retomar' }

export interface ItemRascunho {
  /** Identificador estável local do item (R11: retry reutiliza este id). */
  uploadId: string
  /** Nome exibido (já normalizado para entrada segura de caminho). */
  name: string
  bytes: number
  mime: string
  estado: EstadoTransfert
  /** Motivo legível quando `falhou` (nunca contém bytes). */
  motivo?: string
}

const TRANSICOES: Record<EstadoTransfert, Partial<Record<EventoTransfert['tipo'], EstadoTransfert>>> = {
  selecionado: { iniciar: 'transferindo', cancelar: 'cancelado' },
  transferindo: { sucesso: 'pronto', falha: 'falhou', cancelar: 'cancelado' },
  pronto: { cancelar: 'cancelado' },
  falhou: { iniciar: 'transferindo', retomar: 'transferindo', cancelar: 'cancelado' },
  cancelado: { iniciar: 'transferindo' },
}

/** Transição pura; eventos ilegais devolvem o mesmo estado (nunca pulam etapas). */
export function transitar(item: ItemRascunho, evento: EventoTransfert): ItemRascunho {
  const proximo = TRANSICOES[item.estado][evento.tipo]
  if (!proximo) return item
  if (evento.tipo === 'falha') return { ...item, estado: proximo, motivo: evento.motivo ?? 'falha na transferência' }
  const semMotivo = { ...item }
  delete (semMotivo as { motivo?: string }).motivo
  return { ...semMotivo, estado: proximo }
}

/** G1/G2 da fatia: nesta fase NENHUM item é enviado ao modelo. */
export function podeEnviarModelo(item: ItemRascunho): boolean {
  void item
  return false
}

const medidor = new TextEncoder()
// Separadores de nome de arquivo: as faixas de controle aqui são o CONTEÚDO
// proibido (nome de arquivo não pode ter \x00..\x1f nem \x7f) — não é bug.
// eslint-disable-next-line no-control-regex
const SEPARADORES = /[\\/\u0000-\u001f\u007f]/

/**
 * Normalização de nome para entrada segura de caminho (T05): remove
 * qualquer segmento de diretório e caracteres de controle, colapsa
 * repetições, protege nomes vazios/ocultos perigosos e limita o tamanho
 * preservando a extensão. NUNCA devolve caminho — apenas o segmento final.
 */
export function nomeSeguroArquivo(bruto: string, maxBytes = 255): string {
  const semControle = String(bruto ?? '')
    .normalize('NFC')
    .split(SEPARADORES)
    .filter((pedaco) => pedaco.length > 0)
    .pop() ?? ''
  let nome = semControle.replace(/^[. ]+/, '').replace(/[. ]+$/, '').trim()
  if (!nome) nome = 'arquivo'
  const max = Math.max(16, Math.floor(maxBytes))
  if (medidor.encode(nome).length > max) {
    const ponto = nome.lastIndexOf('.')
    const ext = ponto > 0 && nome.length - ponto <= 12 ? nome.slice(ponto) : ''
    const base = ext ? nome.slice(0, ponto) : nome
    let cortado = base
    while (medidor.encode(cortado + ext).length > max && cortado.length > 1) cortado = cortado.slice(0, -1)
    nome = `${cortado}${ext}` || 'arquivo'
  }
  return nome
}

/** Derivação de título sem texto sintético enviado ao modelo (R02). */
export function tituloDeAnexo(nome: string): string {
  const seguro = nomeSeguroArquivo(nome, 48)
  return seguro
}
