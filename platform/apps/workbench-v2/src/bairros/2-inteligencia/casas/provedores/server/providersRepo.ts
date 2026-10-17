// ============================================================================
// Casa Provedores — repositório do arquivo de configuração (servidor).
//
// D81: o arquivo mora FORA do projeto — `~/.agente_window/providers.json`
//      (0600; o Git nem o enxerga; o `.gitignore` do repo é a segunda tranca).
// D83: a chave só sai INTEIRA pelo caminho do "olhinho" (rota de reveal).
// D84: chave salva manda; variável de ambiente é reserva (a tela mostra a origem).
// Migração v1 → v2 com backup `.bak-<carimbo>` antes de reescrever.
// ============================================================================
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { ArquivoProvedores, ProvedorConfig, ProvedorNaTela, SalvarProvedoresInput } from '../contract'
import { DESCRITORES, descritorPorId } from '../descritores/registro'

export function caminhoDoArquivo(): string {
  // E2E aponta para uma fixture: o arquivo REAL do dono nunca é tocado pelo teste.
  return process.env.AGENTE_WINDOW_PROVIDERS_PATH ?? join(homedir(), '.agente_window', 'providers.json')
}

export function armazenamentoAtual(): 'fixture' | 'repo-home' {
  return process.env.AGENTE_WINDOW_PROVIDERS_PATH ? 'fixture' : 'repo-home'
}

const VAZIO: ArquivoProvedores = { versao: 2, ativo: null, provedores: {} }

/** Máscara (D83): nunca menos que 4 pontos + os 4 últimos caracteres. */
export function mascararChave(chave: string): string {
  const ultimos = chave.slice(-4)
  const pontos = '•'.repeat(Math.max(4, Math.min(12, chave.length - 4)))
  return `${pontos}${ultimos}`
}

/** Formato antigo (v1): `{ openai: {enabled}, gemini: {...}, ollama: {baseUrl} }`. */
function eArquivoV1(valor: unknown): valor is Record<string, { enabled?: boolean; baseUrl?: string }> {
  if (!valor || typeof valor !== 'object') return false
  const v = valor as Record<string, unknown>
  return v.versao === undefined && (v.openai !== undefined || v.gemini !== undefined || v.ollama !== undefined)
}

/** v1 → v2: preserva o que dava para preservar (o resto o dono redigita na tela). */
export function migrarV1ParaV2(v1: Record<string, { enabled?: boolean; baseUrl?: string }>): ArquivoProvedores {
  const saida: ArquivoProvedores = { versao: 2, ativo: null, provedores: {} }
  if (typeof v1.ollama?.baseUrl === 'string' && v1.ollama.baseUrl.trim()) {
    saida.provedores.ollama = { baseUrl: v1.ollama.baseUrl.trim().replace(/\/$/, ''), modelo: '' }
  }
  if (v1.openai?.enabled) {
    saida.provedores.openai = { baseUrl: descritorPorId('openai')!.baseUrlPadrao, modelo: '' }
    saida.ativo = 'openai'
  }
  if (v1.gemini?.enabled) {
    saida.provedores.gemini = { baseUrl: descritorPorId('gemini')!.baseUrlPadrao, modelo: '' }
    saida.ativo ??= 'gemini'
  }
  return saida
}

/** Um provedor vindo de fora vira um registro limpo — ou lança erro em português claro. */
function validarProvedor(id: string, bruto: ProvedorConfig, guardados: ProvedorConfig | undefined): ProvedorConfig {
  const descritor = descritorPorId(id)
  if (!descritor) throw new Error(`Provedor desconhecido: ${id}`)
  if (typeof bruto?.baseUrl !== 'string') throw new Error(`${id}: o endereço (baseUrl) deve ser texto.`)
  if (typeof bruto?.modelo !== 'string') throw new Error(`${id}: o modelo deve ser texto.`)
  let baseUrl = bruto.baseUrl.trim()
  if (!descritor.generico && !baseUrl) baseUrl = descritor.baseUrlPadrao
  if (!baseUrl) throw new Error(`${id}: informe o endereço do serviço (ex.: https://api.groq.com/openai/v1).`)
  if (!/^https?:\/\//.test(baseUrl)) throw new Error(`${id}: o endereço deve começar com http:// ou https://`)
  const limpo: ProvedorConfig = { baseUrl: baseUrl.replace(/\/+$/, ''), modelo: bruto.modelo.trim() }
  if (descritor.generico) {
    const nome = (bruto.nome ?? '').trim()
    if (!nome) throw new Error('Compatível com OpenAI: dê um nome ao serviço (ex.: Groq).')
    limpo.nome = nome
  }
  if (typeof bruto.contexto === 'number' && Number.isFinite(bruto.contexto) && bruto.contexto > 0) {
    limpo.contexto = Math.floor(bruto.contexto)
  }
  if (typeof bruto.maxSaida === 'number' && Number.isFinite(bruto.maxSaida) && bruto.maxSaida > 0) {
    limpo.maxSaida = Math.floor(bruto.maxSaida)
  }
  if (typeof bruto.temperatura === 'number' && Number.isFinite(bruto.temperatura) && bruto.temperatura >= 0 && bruto.temperatura <= 2) {
    limpo.temperatura = bruto.temperatura
  }
  // D84: `apiKey` ausente = mantém a guardada; `apiKey: ''` = apaga de propósito.
  if (typeof bruto.apiKey === 'string') {
    const chave = bruto.apiKey.trim()
    if (chave) limpo.apiKey = chave
  } else if (guardados?.apiKey) {
    limpo.apiKey = guardados.apiKey
  }
  return limpo
}

export function validarEntrada(input: SalvarProvedoresInput, atual: ArquivoProvedores): ArquivoProvedores {
  if (!input || typeof input !== 'object' || !input.provedores || typeof input.provedores !== 'object') {
    throw new Error('Payload inválido: falta `provedores`.')
  }
  const saida: ArquivoProvedores = { versao: 2, ativo: null, provedores: {} }
  for (const [id, bruto] of Object.entries(input.provedores)) {
    saida.provedores[id] = validarProvedor(id, bruto as ProvedorConfig, atual.provedores[id])
  }
  const ativo = input.ativo ?? null
  if (ativo !== null && !saida.provedores[ativo]) throw new Error(`Provedor ativo inexistente: ${ativo}`)
  saida.ativo = ativo
  return saida
}

export async function lerArquivo(caminho = caminhoDoArquivo()): Promise<ArquivoProvedores> {
  let texto: string
  try {
    texto = await readFile(caminho, 'utf8')
  } catch (erro) {
    if ((erro as { code?: string }).code === 'ENOENT') return VAZIO
    throw erro
  }
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    throw new Error(`O arquivo de provedores está corrompido: ${caminho}. Há um backup .bak ao lado.`)
  }
  if (eArquivoV1(bruto)) return migrarV1ParaV2(bruto)
  if (bruto && typeof bruto === 'object' && (bruto as { versao?: unknown }).versao === 2) {
    const v2 = bruto as ArquivoProvedores
    if (!v2.provedores || typeof v2.provedores !== 'object') return VAZIO
    return v2
  }
  throw new Error(`Formato não reconhecido em ${caminho}.`)
}

async function backupSeExistir(caminho: string): Promise<string | null> {
  try {
    const texto = await readFile(caminho, 'utf8')
    const carimbo = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const destino = `${caminho}.bak-${carimbo}`
    await writeFile(destino, texto, { encoding: 'utf8', mode: 0o600 })
    return destino
  } catch (erro) {
    if ((erro as { code?: string }).code !== 'ENOENT') throw erro
    return null
  }
}

export async function salvarArquivo(input: SalvarProvedoresInput, caminho = caminhoDoArquivo()): Promise<ArquivoProvedores> {
  const atual = await lerArquivo(caminho)
  const validado = validarEntrada(input, atual)
  await mkdir(dirname(caminho), { recursive: true })
  await backupSeExistir(caminho)
  const temporario = `${caminho}.tmp-${process.pid}`
  await writeFile(temporario, `${JSON.stringify(validado, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temporario, caminho)
  return validado
}

/** De onde a chave viria agora (D84): salva > ambiente; nada = null. */
export function resolverChave(id: string, arquivo: ArquivoProvedores): { chave: string | null; origem: 'salva' | 'ambiente' | null } {
  const salva = arquivo.provedores[id]?.apiKey
  if (salva) return { chave: salva, origem: 'salva' }
  const variavel = descritorPorId(id)?.variavelAmbiente
  const ambiente = variavel ? process.env[variavel] : undefined
  if (ambiente) return { chave: ambiente, origem: 'ambiente' }
  return { chave: null, origem: null }
}

/** O estado que a TELA recebe (D83: chave só mascarada; origem visível — D84). */
export function estadoParaTela(arquivo: ArquivoProvedores): { provedores: ProvedorNaTela[]; ativo: string | null } {
  const provedores: ProvedorNaTela[] = []
  for (const descritor of DESCRITORES) {
    const salvo = arquivo.provedores[descritor.id]
    if (!salvo) continue
    const { chave, origem } = resolverChave(descritor.id, arquivo)
    provedores.push({
      id: descritor.id,
      nome: descritor.generico ? salvo.nome ?? descritor.nome : descritor.nome,
      baseUrl: salvo.baseUrl,
      modelo: salvo.modelo,
      contexto: salvo.contexto ?? descritor.padroes.contexto,
      maxSaida: salvo.maxSaida ?? descritor.padroes.maxSaida,
      temperatura: salvo.temperatura ?? descritor.padroes.temperatura,
      chaveMascarada: chave ? mascararChave(chave) : null,
      origemChave: origem,
      variavelAmbiente: descritor.variavelAmbiente ?? null,
    })
  }
  return { provedores, ativo: arquivo.ativo }
}

/** D83 — o "olhinho": devolve a chave INTEIRA de UM provedor (rota com no-store). */
export async function revelarChave(id: string, caminho = caminhoDoArquivo()): Promise<string> {
  if (!descritorPorId(id)) throw new Error(`Provedor desconhecido: ${id}`)
  const arquivo = await lerArquivo(caminho)
  const { chave } = resolverChave(id, arquivo)
  if (!chave) throw new Error(`Nenhuma chave guardada para ${id}.`)
  return chave
}
