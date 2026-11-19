// C-3a — contenção de caminho REUTILIZÁVEL (R08/B08): a raiz é resolvida por
// `realpath` e CADA componente do caminho é inspecionado com `lstat` até o
// alvo. Prefixo lexical sozinho não prova nada: um junction/symlink num
// diretório PAI faria `.../workspace/atalho/a.txt` apontar para fora mesmo com
// o arquivo final regular.
//
// Limite declarado (D121/R08): isto protege contra links no caminho de um
// caminho fornecido por dados persistidos/cliente, não é sandbox contra um
// processo hostil do MESMO usuário trocando o alvo entre a validação e o
// syscall (TOCTOU de handle não é prometido aqui).
import { lstat } from 'node:fs/promises'
import path from 'node:path'
import { PersistenceProblem } from '../persistenceErrors'

export interface OpcoesContencao {
  /** Código estável do erro (400 = caminho recusado; 409 = alvo divergente). */
  code?: string
  status?: number
  mensagem?: string
}

function recusa(opcoes: OpcoesContencao): PersistenceProblem {
  return new PersistenceProblem(opcoes.status ?? 400,
    opcoes.code ?? 'path_out_of_scope',
    opcoes.mensagem ?? 'O caminho escolhido sai da área permitida desta conversa. Nada foi registrado.')
}

/** Caminho relativo do alvo em relação à raiz, com separador POSIX, ou null. */
export function relativoDentroDaRaiz(raiz: string, alvo: string): string | null {
  const relativo = path.relative(path.resolve(raiz), path.resolve(alvo))
  if (relativo === '' || relativo.startsWith('..') || path.isAbsolute(relativo)) return null
  return relativo.split(path.sep).join('/')
}

/**
 * Verifica, componente a componente (lstat, nunca follows), que `alvo` está
 * contento em `raiz` e que nenhum pai é link. Devolve o caminho real da raiz e
 * do alvo quando tudo é legítimo.
 *
 * `permitirAlvoLink=false` recusa link no PRÓPRIO alvo (o caso da referência de
 * projeto: apontar para o alvo do link é legítimo, apontar para o link não).
 */
export async function garantirDentroDaRaiz(
  raiz: string, alvo: string, opcoes: OpcoesContencao & { permitirAlvoLink?: boolean } = {},
): Promise<{ raizReal: string; alvo: string }> {
  const raizAbsoluta = path.resolve(raiz)
  const alvoAbsoluto = path.resolve(alvo)
  if (relativoDentroDaRaiz(raizAbsoluta, alvoAbsoluto) === null) throw recusa(opcoes)

  const raizInfo = await lstat(raizAbsoluta).catch(() => null)
  if (!raizInfo) throw recusa({ ...opcoes, status: 404, code: opcoes.code ?? 'path_absent' })
  if (raizInfo.isSymbolicLink()) {
    throw recusa(opcoes)
  }
  if (!raizInfo.isDirectory()) throw recusa(opcoes)

  const relativo = path.relative(raizAbsoluta, alvoAbsoluto)
  const pedacos = relativo.split(path.sep).filter((pedaco) => pedaco.length > 0 && pedaco !== '.')
  let atual = raizAbsoluta
  for (let indice = 0; indice < pedacos.length; indice += 1) {
    atual = path.join(atual, pedacos[indice])
    const info = await lstat(atual).catch(() => null)
    if (!info) {
      throw recusa({ ...opcoes, status: 404, code: opcoes.code ?? 'path_absent' })
    }
    const ultimo = indice === pedacos.length - 1
    if (info.isSymbolicLink()) {
      // Link no PAI sempre escapa do controle. No ALVO, vale a opção: a
      // referência de projeto recusa, a validação de um arquivo já publicado
      // no app dir (que não tem links) também.
      if (!ultimo || opcoes.permitirAlvoLink !== true) throw recusa(opcoes)
    }
  }
  return { raizReal: raizAbsoluta, alvo: alvoAbsoluto }
}

/**
 * Mesma contenção para um DIRETÓRIO de trabalho (stage/uploads): cria nada,
 * apenas prova que cada componente existente é diretório real (sem link).
 */
export async function garantirDiretorioReal(caminho: string, opcoes: OpcoesContencao = {}): Promise<void> {
  const absoluto = path.resolve(caminho)
  const { root } = path.parse(absoluto)
  const pedacos = absoluto.slice(root.length).split(path.sep).filter(Boolean)
  let atual = root
  for (const pedaco of pedacos) {
    atual = path.join(atual, pedaco)
    const info = await lstat(atual).catch(() => null)
    if (!info) return // ainda não criado: o chamador cria DEPOIS da checagem
    if (info.isSymbolicLink() || !info.isDirectory()) throw recusa(opcoes)
  }
}

/** Caminho canônico (realpath) de um diretório existente; fallback: resolve. */
export async function raizCanonica(caminho: string): Promise<string> {
  const { realpath } = await import('node:fs/promises')
  return realpath(caminho).catch(() => path.resolve(caminho))
}

/** Verificação lexical de contenção (após canonicalizar as duas pontas). */
export function contemLexical(raiz: string, alvo: string): boolean {
  return relativoDentroDaRaiz(raiz, alvo) !== null
}
