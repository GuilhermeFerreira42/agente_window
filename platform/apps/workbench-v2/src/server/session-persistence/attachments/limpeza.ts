// C-3a — ciclo de vida dos anexos na exclusão da conversa (T27/T28/T29/R12).
//
// Ordem exigida pelo contrato (02_CONTRATOS §Lixeira):
//  1. plano durável enumera os privados exclusivos ANTES de destruir o
//     catálogo que prova ownership (`registrarPlanoAnexos`, chamado pelo
//     tombstone);
//  2. cada arquivo privado vai para a LIXEIRA do sistema (`moverParaLixeira`);
//     nunca `rm` permanente de arquivo final;
//  3. falha em qualquer item deixa o plano `falhou`, PRESERVA o arquivo e o
//     ledger, e a exclusão retorna pendente — não anunciamos limpeza
//     concluída com vínculo órfão (B06/H3);
//  4. só com o plano completo o ledger sai e o tombstone pode concluir.
//
// Referências de projeto e cópias na raiz do workspace NUNCA tocam o arquivo
// do usuário: a exclusão remove apenas o registro.
import { lstat } from 'node:fs/promises'
import path from 'node:path'
import { getAppDir } from '../paths'
import { PersistenceProblem } from '../persistenceErrors'
import { getDatabase } from '../database'
import {
  inserirPlanoLimpeza, listarArtigosChat, marcarPlano, obterArtigo, planosDefinitivamenteFalhos, planosPendentes,
  removerLedgerDoChat,
} from './catalogo'
import { caminhoAbsolutoDeArtigo, hashDeArquivo, raizPrivadaChat } from './estoque'
import { garantirDiretorioReal, garantirDentroDaRaiz } from './contencao'
import { lixeiraDoSistema, recusaDefinitiva, type PortaLixeira } from './lixeira'

export interface OpcoesLimpeza {
  /** Porta da Lixeira injetável (ensaios usam pastaTrash temporária). */
  lixeira?: PortaLixeira
  /** Opções repassadas à porta (pastaTrash/plataforma/executar dos ensaios). */
  lixeiraOpcoes?: Parameters<PortaLixeira['mover']>[1]
  appDir?: string
  /** Remove também os blobs privados de UM chat (T28); ausente = sessão toda. */
  chatId?: string
}

export function temAnexosPrivadosPendentes(sessionId: string): boolean {
  return planosPendentes(sessionId).some(item => item.alvo === 'chat-copy' && item.state !== 'concluido')
}

/** Captura o ownership de TODOS os artefatos do dono no plano (antes de destruir). */
export function registrarPlanoAnexos(sessionId: string, chatId?: string): void {
  const db = getDatabase()
  const chats = chatId
    ? [{ chat_id: chatId }]
    : db.prepare('SELECT DISTINCT chat_id FROM attachment_artifacts WHERE session_id = ?').all(sessionId) as Array<{ chat_id: string }>
  for (const { chat_id: alvoChat } of chats) {
    for (const artigo of listarArtigosChat(sessionId, alvoChat)) {
      const alvo = artigo.mode === 'reference' ? 'referencia' as const
        : artigo.rootKind === 'workspace' ? 'workspace-copy' as const
        : 'chat-copy' as const
      inserirPlanoLimpeza({
        sessionId, chatId: alvoChat, artifactId: artigo.artifactId, alvo, locator: artigo.locator,
        rootKind: artigo.rootKind, workspaceRoot: artigo.workspaceRoot, sha256: artigo.sha256,
      })
    }
  }
}

/**
 * Resolve o alvo privado do plano com contenção real: precisa estar sob a raiz
 * privada da conversa, cada pai sem link, e não pode ser link.
 */
async function alvoPrivadoDe(linha: ReturnType<typeof planosPendentes>[number], appDir?: string): Promise<string | null | 'ausente'> {
  const artigo = obterArtigo(linha.artifactId)
  if (!artigo || artigo.chatId !== linha.chatId || artigo.rootKind !== 'appdir' || artigo.locator !== linha.locator) return null
  const raizChats = artigo.papel === 'gerado-gerenciado'
    ? path.join(appDir ?? getAppDir(), 'artifacts', artigo.sessionId, artigo.chatId, artigo.artifactId)
    : raizPrivadaChat(appDir)
  const absoluto = caminhoAbsolutoDeArtigo(artigo, appDir)
  try {
    await garantirDiretorioReal(raizChats)
    const contido = await garantirDentroDaRaiz(raizChats, absoluto, { code: 'cleanup_out_of_scope' })
    return contido.alvo
  } catch (erro) {
    if (erro instanceof PersistenceProblem && erro.status === 404) return 'ausente'
    return null
  }
}

async function moverParaLixeiraSeConfirmado(
  linha: ReturnType<typeof planosPendentes>[number], opcoes: OpcoesLimpeza,
): Promise<'concluido' | 'falhou' | 'referencia' | 'workspace-copy'> {
  if (linha.alvo === 'referencia' || linha.alvo === 'workspace-copy') {
    // O arquivo é território do usuário: só o registro sai (T27/E06).
    return linha.alvo
  }
  const absoluto = await alvoPrivadoDe(linha, opcoes.appDir)
  if (absoluto === 'ausente') return 'concluido'
  if (!absoluto) {
    // Fora da raiz privada: nunca mover/apagar; o ledger fica como evidência.
    return 'falhou'
  }
  const info = await lstat(absoluto).catch(() => null)
  if (!info) return 'concluido' // já ausente: idempotente
  if (info.isSymbolicLink() || !info.isFile()) return 'falhou'
  if (linha.sha256) {
    const hash = await hashDeArquivo(absoluto)
    if (hash !== linha.sha256) return 'falhou' // conteúdo divergente preservado (T28)
  }
  const porta = opcoes.lixeira ?? lixeiraDoSistema
  const resultado = await porta.mover(absoluto, opcoes.lixeiraOpcoes)
  if (resultado.ok) return 'concluido'
  if (resultado.efeitoIniciado) {
    marcarPlano(linha.artifactId, 'falhou', resultado.destino ?? null, resultado.motivo ?? null)
    return 'falhou'
  }
  marcarPlano(linha.artifactId, 'falhou', resultado.destino ?? null, resultado.motivo ?? null)
  return recusaDefinitiva(resultado) ? 'falhou' : 'falhou'
}

/**
 * Executa o plano registrado (retomável). Devolve `true` somente quando TODO
 * alvo privado foi resolvido; qualquer falha mantém o plano e o ledger.
 */
export async function executarPlanoAnexos(sessionId: string, opcoes: OpcoesLimpeza = {}): Promise<boolean> {
  // R3 — seleção por DONO registrado no plano (vem do catálogo na captura):
  // nunca por prefixo de string do locator (o locator começa em `chats/…`).
  // Referências e cópias de projeto não têm blob privado a mover e pertencem
  // ao mesmo dono da captura.
  const linhas = opcoes.chatId
    ? planosPendentes(sessionId, { chatId: opcoes.chatId })
    : planosPendentes(sessionId)
  let completo = true
  for (const linha of linhas) {
    if (linha.state === 'concluido') continue
    try {
      const resultado = await moverParaLixeiraSeConfirmado(linha, opcoes)
      if (resultado === 'falhou') {
        completo = false
        // Evidência DURÁVEL do motivo (hash divergente, alvo fora da raiz,
        // Lixeira recusou) — o plano não pode ficar `pendente` sem diagnóstico.
        if (planosPendentes(sessionId).find((item) => item.artifactId === linha.artifactId)?.state !== 'falhou') {
          marcarPlano(linha.artifactId, 'falhou', null, 'item não confirmado para a Lixeira')
        }
        continue
      }
      if (resultado === 'referencia' || resultado === 'workspace-copy' || resultado === 'concluido') {
        marcarPlano(linha.artifactId, 'concluido')
      }
    } catch (erro) {
      completo = false
      marcarPlano(linha.artifactId, 'falhou', null, String(erro))
    }
  }
  if (planosDefinitivamenteFalhos(sessionId) > 0) completo = false
  if (!completo) return false

  // Plano completo: agora o ledger do DONO pode sair — e só dele.
  if (opcoes.chatId) {
    // `removerLedgerDoChat` já apaga artefatos E tentativas SÓ deste chat; o
    // vizinho permanece intacto (R3).
    removerLedgerDoChat(sessionId, opcoes.chatId)
    getDatabase().prepare('DELETE FROM attachment_cleanup_plan WHERE session_id = ? AND chat_id = ? AND state = ?')
      .run(sessionId, opcoes.chatId, 'concluido')
  } else {
    getDatabase().prepare('DELETE FROM attachment_artifacts WHERE session_id = ?').run(sessionId)
    getDatabase().prepare('DELETE FROM attachment_uploads WHERE session_id = ?').run(sessionId)
    getDatabase().prepare('DELETE FROM attachment_cleanup_plan WHERE session_id = ? AND state = ?')
      .run(sessionId, 'concluido')
  }
  return true
}

/** Stages privados da sessão: temporários próprios, descartados por identidade. */
export async function removerStagesDaSessao(sessionId: string, appDir?: string): Promise<void> {
  const raiz = path.join(appDir ?? getAppDir(), 'uploads', 'stages')
  const alvo = path.join(raiz, sessionId)
  // Nunca recursive: só o diretório vazio da identidade própria.
  const { readdir, rmdir } = await import('node:fs/promises')
  const entradas = await readdir(alvo).catch(() => null)
  if (!entradas) return
  for (const entrada of entradas) {
    const sub = path.join(alvo, entrada)
    const arquivos = await readdir(sub).catch(() => [] as string[])
    for (const arquivo of arquivos) {
      const { unlink } = await import('node:fs/promises')
      await unlink(path.join(sub, arquivo)).catch(() => undefined)
    }
    await rmdir(sub).catch(() => undefined)
  }
  await rmdir(alvo).catch(() => undefined)
}
