// ============================================================================
// Casa Config — repositório do arquivo de preferências (servidor).
// O arquivo mora FORA do projeto: `~/.agente_window/settings.json` (mesma
// pasta dos provedores; sem segredos, então 0644 basta). Escrita atômica
// (temp + rename — a lição da casa Agir). Testes/E2E apontam para fixture
// via AGENTE_WINDOW_SETTINGS_PATH — o arquivo do dono nunca é tocado.
// ============================================================================
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { AUTOSCROLL_PADRAO, TETO_MAXIMO, TETO_MINIMO, TETO_PADRAO, type ConfigAgente, type ConfigParcial } from '../contract'

export function caminhoDoArquivo(): string {
  return process.env.AGENTE_WINDOW_SETTINGS_PATH ?? join(homedir(), '.agente_window', 'settings.json')
}

export const PADRAO: ConfigAgente = { teto: TETO_PADRAO, autoScroll: AUTOSCROLL_PADRAO }

/** Teto vindo de fora vira número válido — ou erro honesto em português claro. */
export function validarTeto(bruto: unknown): number {
  if (typeof bruto !== 'number' || !Number.isFinite(bruto) || !Number.isInteger(bruto)) {
    throw new Error(`Teto inválido: use um número inteiro de ${TETO_MINIMO} a ${TETO_MAXIMO}.`)
  }
  if (bruto < TETO_MINIMO || bruto > TETO_MAXIMO) {
    throw new Error(`Teto inválido: use um número inteiro de ${TETO_MINIMO} a ${TETO_MAXIMO} (veio ${bruto}).`)
  }
  return bruto
}

function validarAutoScroll(bruto: unknown): boolean {
  if (typeof bruto !== 'boolean') throw new Error('Auto-scroll inválido: use ligado ou desligado.')
  return bruto
}

/** Junta o parcial da tela com o guardado: só o que veio é validado. */
export function validarEntrada(parcial: ConfigParcial, atual: ConfigAgente): ConfigAgente {
  if (!parcial || typeof parcial !== 'object') throw new Error('Payload inválido: mande um objeto com `teto` e/ou `autoScroll`.')
  return {
    teto: parcial.teto === undefined ? atual.teto : validarTeto(parcial.teto),
    autoScroll: parcial.autoScroll === undefined ? atual.autoScroll : validarAutoScroll(parcial.autoScroll),
  }
}

/** Campo torto NO ARQUIVO (mão humana) cai para o padrão — nunca quebra o app. */
function sanitizarArquivo(bruto: unknown): ConfigAgente {
  if (!bruto || typeof bruto !== 'object') throw new Error('Formato não reconhecido no arquivo de preferências.')
  const valor = bruto as Record<string, unknown>
  let teto = TETO_PADRAO
  try {
    if (valor.teto !== undefined) teto = validarTeto(valor.teto)
  } catch {
    teto = TETO_PADRAO
  }
  const autoScroll = typeof valor.autoScroll === 'boolean' ? valor.autoScroll : AUTOSCROLL_PADRAO
  return { teto, autoScroll }
}

export async function lerConfig(caminho = caminhoDoArquivo()): Promise<ConfigAgente> {
  let texto: string
  try {
    texto = await readFile(caminho, 'utf8')
  } catch (erro) {
    if ((erro as { code?: string }).code === 'ENOENT') return { ...PADRAO }
    throw erro
  }
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    throw new Error(`O arquivo de preferências está corrompido: ${caminho}. Apague-o para voltar ao padrão.`)
  }
  return sanitizarArquivo(bruto)
}

export async function salvarConfig(parcial: ConfigParcial, caminho = caminhoDoArquivo()): Promise<ConfigAgente> {
  const atual = await lerConfig(caminho)
  const validado = validarEntrada(parcial, atual)
  await mkdir(dirname(caminho), { recursive: true })
  const temporario = `${caminho}.tmp-${process.pid}`
  await writeFile(temporario, `${JSON.stringify(validado, null, 2)}\n`, { encoding: 'utf8', mode: 0o644 })
  await rename(temporario, caminho)
  return validado
}
