// ============================================================================
// Casa Personalizações — ESTADO PERSISTIDO (critério de aceite 6: F5 persiste).
//
// Um arquivo só, sem segredo: `~/.agente_window/personalizacoes.json`. Segue o
// mesmo desenho da casa Config (`config/server/repo.ts`): ausência de arquivo =
// padrão; arquivo corrompido = erro honesto em português, nunca padrão silencioso;
// gravação atômica por temporário + rename.
//
// Ausente de uma das listas = LIGADO, que é o padrão das duas (RF14-1 e RF14-4).
// A casa guarda só ids: quem reconcilia com o catálogo real é a projeção.
// ============================================================================
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { ESTADO_PADRAO, type EstadoParcial, type EstadoPersonalizacoes } from '../contract'

/** Caminho do arquivo de estado. Fixtura de teste aponta para fora pelo env. */
export function caminhoDoArquivo(): string {
  return process.env.AGENTE_WINDOW_PERSONALIZACOES_PATH ?? join(homedir(), '.agente_window', 'personalizacoes.json')
}

/** Lista saneada: só strings não vazias, sem repetição, ordem preservada. */
function sanarLista(valor: unknown): string[] {
  if (!Array.isArray(valor)) return []
  const unicos = new Set<string>()
  for (const item of valor) {
    if (typeof item !== 'string') continue
    const limpo = item.trim()
    if (limpo) unicos.add(limpo)
  }
  return Array.from(unicos)
}

/** Sanea o que veio do disco ou da tela: nada que não seja lista de string survives. */
export function sanarEstado(bruto: unknown): EstadoPersonalizacoes {
  if (typeof bruto !== 'object' || bruto === null) return { ...ESTADO_PADRAO }
  const corpo = bruto as Record<string, unknown>
  return {
    skillsDesligadas: sanarLista(corpo.skillsDesligadas),
    ferramentasDesligadas: sanarLista(corpo.ferramentasDesligadas),
  }
}

/** Lê o estado. Sem arquivo = padrão (nunca é erro não ter preferências ainda). */
export async function lerEstado(caminho = caminhoDoArquivo()): Promise<EstadoPersonalizacoes> {
  let texto: string
  try {
    texto = await readFile(caminho, 'utf8')
  } catch (erro) {
    if ((erro as { code?: string }).code === 'ENOENT') return { ...ESTADO_PADRAO }
    throw erro
  }
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    throw new Error(`O arquivo de personalizações está corrompido: ${caminho}. Apague-o para voltar ao padrão.`)
  }
  return sanarEstado(bruto)
}

/**
 * Salva o liga/desliga. Parcial de propósito: o que não veio é mantido como está,
 * porque a tela manda a lista inteira de um eixo por vez.
 */
export async function salvarEstado(parcial: EstadoParcial, caminho = caminhoDoArquivo()): Promise<EstadoPersonalizacoes> {
  const atual = await lerEstado(caminho)
  const proximo: EstadoPersonalizacoes = {
    skillsDesligadas: parcial.skillsDesligadas === undefined ? atual.skillsDesligadas : sanarLista(parcial.skillsDesligadas),
    ferramentasDesligadas: parcial.ferramentasDesligadas === undefined ? atual.ferramentasDesligadas : sanarLista(parcial.ferramentasDesligadas),
  }
  await mkdir(dirname(caminho), { recursive: true })
  const temporario = `${caminho}.tmp-${process.pid}`
  await writeFile(temporario, `${JSON.stringify(proximo, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 })
  await rename(temporario, caminho)
  return proximo
}
