// C-3a (R04/R05) — política técnica local de admissão. A entrega define a
// política (D141); arquivo externo inválido BLOQUEIA admissão com falha
// explícita — nunca fallback silencioso. O JSON snapshot continua com seu
// limite próprio de 16 MiB (SnapshotGrandeError) e é separado do limite
// binário (G1/G2 do 00_LEIA_PRIMEIRO vencem a norma morta de 16 MiB/UTF-8).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { getAppDir } from '../paths'

export interface PoliticaAnexos {
  /** Maior arquivo aceito em UMA transferência (G1 — bytes são binários). */
  maxUploadBytes: number
  /** Quota privada por chat (cópias em <appdir>/uploads/chats). */
  quotaChatBytes: number
  /** Espaço livre mínimo exigido no volume de destino antes de admitir. */
  reservaDiscoBytes: number
  /** Transferências simultâneas por perfil (produtos locais). */
  concorrencia: number
  /** Prazo de abandono de stage/recebimento (ms). */
  prazoAbandonoMs: number
  /** Tamanho máximo de NOME de arquivo aceito (metadado, não conteúdo). */
  maxNomeBytes: number
}

// Escolhas justificadas pelo ensaio desta entrega (politica.test.ts):
// 256 MiB cobre fixtures positivas de 64 MiB com margem de 4x; quota de
// 512 MiB por chat e reserva livre de 128 MiB protegem o disco local;
// concorrência 2 e abandono de 15 min limitam stages órfãos.
export const POLITICA_PADRAO: Readonly<PoliticaAnexos> = Object.freeze({
  maxUploadBytes: 256 * 1024 * 1024,
  quotaChatBytes: 512 * 1024 * 1024,
  reservaDiscoBytes: 128 * 1024 * 1024,
  concorrencia: 2,
  prazoAbandonoMs: 15 * 60_000,
  maxNomeBytes: 255,
})

export type ResultadoPolitica =
  | { ok: true; politica: PoliticaAnexos; origem: 'default' | 'arquivo' }
  | { ok: false; motivo: string }

function validarPolitica(bruto: unknown): PoliticaAnexos | null {
  if (typeof bruto !== 'object' || bruto === null) return null
  const campos: (keyof PoliticaAnexos)[] = [
    'maxUploadBytes', 'quotaChatBytes', 'reservaDiscoBytes', 'concorrencia', 'prazoAbandonoMs', 'maxNomeBytes',
  ]
  const saida = {} as PoliticaAnexos
  for (const campo of campos) {
    const valor = (bruto as Record<string, unknown>)[campo]
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0 || !Number.isInteger(valor)) return null
    saida[campo] = valor
  }
  if (saida.maxUploadBytes > saida.quotaChatBytes) return null
  return saida
}

export function caminhoPolitica(): string {
  return path.join(getAppDir(), 'anexos', 'politica.json')
}

/**
 * Política ausente → materializa os defaults da entrega (D141).
 * Política presente mas inválida → bloqueio explícito (nunca default silencioso).
 */
export function carregarPolitica(caminho = caminhoPolitica()): ResultadoPolitica {
  if (!existsSync(caminho)) {
    try {
      mkdirSync(path.dirname(caminho), { recursive: true })
      writeFileSync(caminho, `${JSON.stringify(POLITICA_PADRAO, null, 2)}\n`, 'utf8')
    } catch (error) {
      return { ok: false, motivo: `política indisponível: falha ao materializar defaults (${String(error)})` }
    }
    return { ok: true, politica: { ...POLITICA_PADRAO }, origem: 'default' }
  }
  try {
    const bruto: unknown = JSON.parse(readFileSync(caminho, 'utf8'))
    const politica = validarPolitica(bruto)
    if (!politica) return { ok: false, motivo: 'política local inválida: campos ausentes ou fora do domínio' }
    return { ok: true, politica, origem: 'arquivo' }
  } catch (error) {
    return { ok: false, motivo: `política local inválida: ${String(error)}` }
  }
}

/** Falha de admissão quando a política não pode ser confiada. */
export function problemaPolitica(resultado: Extract<ResultadoPolitica, { ok: false }>) {
  return { status: 503 as const, code: 'policy_invalid' as const, message: `Admissão de anexo bloqueada — ${resultado.motivo}` }
}
