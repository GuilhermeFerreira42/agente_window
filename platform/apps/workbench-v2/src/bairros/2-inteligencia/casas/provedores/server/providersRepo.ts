// ============================================================================
// Casa Provedores — repositório do arquivo de configuração (servidor).
//
// D81/D125: o arquivo mora FORA do projeto — `~/.agente_window/providers.json`
//      (0600 em POSIX; no Windows, permissões normais da conta/sistema; o Git não o enxerga).
// D83: a chave só sai INTEIRA pelo caminho do "olhinho" (rota de reveal).
// D84: chave salva manda; variável de ambiente é reserva (a tela mostra a origem).
// Migração v1/v2/v3 → v4; propriedades antigas de canary são ignoradas ao ler e removidas ao salvar.
// ============================================================================
import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { ArquivoProvedores, ItemCatalogoModelo, ProvedorConfig, ProvedorNaTela, Protocolo, SalvarProvedoresInput } from '../contract'
import { DESCRITORES, descritorPorId } from '../descritores/registro'

// Re-export MÍNIMO (glicose da prefeitura): quem monta o alvo da conversa
// precisa do descritor sem furar a fronteira LEGO (só `server/**` é permitido
// fora da casa). Adição pura — nenhum comportamento da 08 muda.
export { descritorPorId }

export function caminhoDoArquivo(): string {
  // E2E aponta para uma fixture: o arquivo REAL do dono nunca é tocado pelo teste.
  return process.env.AGENTE_WINDOW_PROVIDERS_PATH ?? join(homedir(), '.agente_window', 'providers.json')
}

export function armazenamentoAtual(): 'fixture' | 'repo-home' {
  return process.env.AGENTE_WINDOW_PROVIDERS_PATH ? 'fixture' : 'repo-home'
}

const VAZIO: ArquivoProvedores = { versao: 4, ativo: null, provedores: {} }
/** Cria arquivo exclusivo com modo POSIX 0600; no Windows, usa permissões normais herdadas do sistema. */
async function escreverArquivoExclusivo(caminho: string, conteudo: string): Promise<void> {
  const arquivo = await open(caminho, 'wx', 0o600)
  try {
    await arquivo.writeFile(conteudo, 'utf8')
    await arquivo.sync()
    await arquivo.close()
  } catch (erro) {
    await arquivo.close().catch(() => undefined)
    await unlink(caminho).catch(() => undefined)
    throw erro
  }
}

async function publicarArquivo(caminho: string, conteudo: string): Promise<void> {
  const temporario = `${caminho}.tmp-${process.pid}-${randomUUID()}`
  try {
    await escreverArquivoExclusivo(temporario, conteudo)
    await rename(temporario, caminho)
  } catch (erro) {
    await unlink(temporario).catch(() => undefined)
    throw erro
  }
}

// Mutex em processo compartilhado por salvar e por linearizar o início do fetch.
let caudaMutex: Promise<void> = Promise.resolve()
async function adquirirMutex(): Promise<() => void> {
  const anterior = caudaMutex
  let liberar!: () => void
  caudaMutex = new Promise<void>((resolve) => { liberar = resolve })
  await anterior
  return liberar
}
async function sobMutex<T>(operacao: () => Promise<T>): Promise<T> {
  const liberar = await adquirirMutex()
  try { return await operacao() } finally { liberar() }
}

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

/** v1 → v4: preserva provedores; modelos sem seleção explícita ficam desabilitados. */
export function migrarV1ParaV4(v1: Record<string, { enabled?: boolean; baseUrl?: string }>): ArquivoProvedores {
  const saida: ArquivoProvedores = { versao: 4, ativo: null, provedores: {} }
  if (typeof v1.ollama?.baseUrl === 'string' && v1.ollama.baseUrl.trim()) {
    saida.provedores.ollama = {
      baseUrl: v1.ollama.baseUrl.trim().replace(/\/$/, ''),
      modelo: '',
      modelosHabilitados: [],
      habilitado: true,
    }
  }
  if (v1.openai?.enabled) {
    saida.provedores.openai = { baseUrl: descritorPorId('openai')!.baseUrlPadrao, modelo: '', modelosHabilitados: [], habilitado: true }
    saida.ativo = 'openai'
  }
  if (v1.gemini?.enabled) {
    saida.provedores.gemini = { baseUrl: descritorPorId('gemini')!.baseUrlPadrao, modelo: '', modelosHabilitados: [], habilitado: true }
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
  if (bruto.modelosHabilitados !== undefined && (!Array.isArray(bruto.modelosHabilitados) || bruto.modelosHabilitados.some((modelo) => typeof modelo !== 'string' || modelo.trim() === ''))) {
    throw new Error(`${id}: modelosHabilitados deve conter apenas identificadores de modelo não vazios.`)
  }
  if (bruto.habilitado !== undefined && typeof bruto.habilitado !== 'boolean') throw new Error(`${id}: habilitado deve ser verdadeiro ou falso.`)
  const habilitados = Array.isArray(bruto.modelosHabilitados)
    ? bruto.modelosHabilitados.map((modelo) => modelo.trim())
    : limpo.modelo ? [limpo.modelo] : []
  limpo.modelosHabilitados = [...new Set(habilitados)]
  limpo.habilitado = bruto.habilitado !== false
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
  const saida: ArquivoProvedores = { versao: 4, ativo: null, provedores: {} }
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
  if (eArquivoV1(bruto)) return migrarV1ParaV4(bruto)
  if (bruto && typeof bruto === 'object') {
    const versao = (bruto as { versao?: unknown }).versao
    if (versao === 2) {
      const v2 = bruto as { ativo: string | null; provedores?: Record<string, ProvedorConfig> }
      if (!v2.provedores || typeof v2.provedores !== 'object' || Array.isArray(v2.provedores)) throw new Error(`Formato v2 inválido em ${caminho}.` )
      const provedores: Record<string, ProvedorConfig> = {}
      for (const [id, config] of Object.entries(v2.provedores)) {
        const modelo = typeof config.modelo === 'string' ? config.modelo.trim() : ''
        provedores[id] = { ...config, modelosHabilitados: modelo ? [modelo] : [], habilitado: true }
      }
      return { versao: 4, ativo: v2.ativo ?? null, provedores }
    }
    if (versao === 3) {
      const v3 = bruto as { ativo: string | null; provedores: Record<string, ProvedorConfig> }
      if (!v3.provedores || typeof v3.provedores !== 'object' || Array.isArray(v3.provedores)) throw new Error(`Formato v3 inválido em ${caminho}.`)
      return { versao: 4, ativo: v3.ativo ?? null, provedores: v3.provedores }
    }
    if (versao === 4) {
      const v4 = bruto as Partial<ArquivoProvedores>
      if (!v4.provedores || typeof v4.provedores !== 'object' || Array.isArray(v4.provedores)) throw new Error(`Formato v4 inválido em ${caminho}.`)
      return { versao: 4, ativo: v4.ativo ?? null, provedores: v4.provedores }
    }
  }
  throw new Error(`Formato não reconhecido em ${caminho}.`)
}

async function backupSeExistir(caminho: string): Promise<string | null> {
  try {
    const texto = await readFile(caminho, 'utf8')
    const carimbo = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const destino = `${caminho}.bak-${carimbo}-${randomUUID()}`
    await escreverArquivoExclusivo(destino, texto)
    return destino
  } catch (erro) {
    if ((erro as { code?: string }).code !== 'ENOENT') throw erro
    return null
  }
}

export async function salvarArquivo(input: SalvarProvedoresInput, caminho = caminhoDoArquivo()): Promise<ArquivoProvedores> {
  return sobMutex(async () => {
    const atual = await lerArquivo(caminho)
    const validado = validarEntrada(input, atual)
    await mkdir(dirname(caminho), { recursive: true })
    await backupSeExistir(caminho)
    await publicarArquivo(caminho, `${JSON.stringify(validado, null, 2)}\n`)
    return validado
  })
}

export interface ConfigChamadaModelo {
  providerId: string
  modelId: string
  protocolo: Protocolo
  baseUrl: string
  apiKey: string | null
  temperatura?: number
  maxSaida?: number
}

/**
 * Lineariza validação do par habilitado com o início do fetch.
 * O callback deve iniciar o request sincronamente e devolver sua Promise; o
 * mutex é liberado antes de aguardar headers/body, permitindo disable normal
 * enquanto a chamada já iniciada termina. Revogação de credencial continua
 * sujeita ao AbortSignal do run quando suportado.
 */
export async function iniciarChamadaModelo<T>(
  providerId: string,
  modelId: string,
  iniciar: (config: ConfigChamadaModelo) => Promise<T>,
  caminho = caminhoDoArquivo(),
): Promise<T> {
  const liberar = await adquirirMutex()
  let resposta: Promise<T>
  try {
    const arquivo = await lerArquivo(caminho)
    const provedor = arquivo.provedores[providerId]
    if (!provedor || provedor.habilitado === false) {
      throw Object.assign(new Error(`O provedor ${providerId} foi removido ou desabilitado antes da chamada.`), { code: 'selection_unavailable' })
    }
    if (!Array.isArray(provedor.modelosHabilitados) || !provedor.modelosHabilitados.includes(modelId)) {
      throw Object.assign(new Error(`O modelo ${modelId} foi desabilitado ou removido antes da chamada.`), { code: 'model_disabled' })
    }
    const descritor = descritorPorId(providerId)
    if (!descritor) throw Object.assign(new Error('O provedor selecionado não é mais reconhecido.'), { code: 'selection_unavailable' })
    const { chave } = resolverChave(providerId, arquivo)
    if (!descritor.chaveOpcional && !chave) {
      throw Object.assign(new Error(`A credencial de ${providerId} foi removida ou está indisponível.`), { code: 'credential_unavailable' })
    }
    const config: ConfigChamadaModelo = {
      providerId,
      modelId,
      protocolo: descritor.protocolo,
      baseUrl: (provedor.baseUrl || descritor.baseUrlPadrao).replace(/\/+$/, ''),
      apiKey: chave,
      temperatura: provedor.temperatura,
      maxSaida: provedor.maxSaida,
    }
    // Não usar `await`: iniciar() precisa começar o fetch enquanto o mutex
    // ainda ordena com salvarArquivo, mas a resposta pode terminar depois.
    resposta = iniciar(config)
  } finally {
    liberar()
  }
  return resposta!
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
export function estadoParaTela(arquivo: ArquivoProvedores): { provedores: ProvedorNaTela[]; catalogo: ItemCatalogoModelo[]; ativo: string | null } {
  const provedores: ProvedorNaTela[] = []
  const catalogo: ItemCatalogoModelo[] = []
  for (const descritor of DESCRITORES) {
    const salvo = arquivo.provedores[descritor.id]
    if (!salvo) continue
    const { chave, origem } = resolverChave(descritor.id, arquivo)
    if (salvo.habilitado !== false && Array.isArray(salvo.modelosHabilitados)) {
      for (const modelId of salvo.modelosHabilitados) {
        if (typeof modelId !== 'string' || modelId.length === 0) continue
        catalogo.push({
          providerId: descritor.id,
          modelId,
          label: `${descritor.generico ? salvo.nome ?? descritor.nome : descritor.nome} — ${modelId}`,
          protocol: descritor.protocolo,
        })
      }
    }
    provedores.push({
      id: descritor.id,
      nome: descritor.generico ? salvo.nome ?? descritor.nome : descritor.nome,
      baseUrl: salvo.baseUrl,
      modelo: salvo.modelo,
      modelosHabilitados: Array.isArray(salvo.modelosHabilitados) ? salvo.modelosHabilitados : [],
      habilitado: salvo.habilitado !== false,
      contexto: salvo.contexto ?? descritor.padroes.contexto,
      maxSaida: salvo.maxSaida ?? descritor.padroes.maxSaida,
      temperatura: salvo.temperatura ?? descritor.padroes.temperatura,
      chaveMascarada: chave ? mascararChave(chave) : null,
      origemChave: origem,
      variavelAmbiente: descritor.variavelAmbiente ?? null,
    })
  }
  return { provedores, catalogo, ativo: arquivo.ativo }
}

/** D83 — o "olhinho": devolve a chave INTEIRA de UM provedor (rota com no-store). */
export async function revelarChave(id: string, caminho = caminhoDoArquivo()): Promise<string> {
  if (!descritorPorId(id)) throw new Error(`Provedor desconhecido: ${id}`)
  const arquivo = await lerArquivo(caminho)
  const { chave } = resolverChave(id, arquivo)
  if (!chave) throw new Error(`Nenhuma chave guardada para ${id}.`)
  return chave
}
