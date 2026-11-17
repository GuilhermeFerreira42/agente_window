// ============================================================================
// C-2 — rascunho da landing e SNAPSHOT IMUTÁVEL do primeiro envio (02 §1).
// Um snapshot por tentativa lógica: texto, modalidade, raiz validada, seleção
// exata de modelo, modo/permissão efetivos e geração do draft. Sem chave,
// headers ou payload de mídia. Puro — sem IO, sem relógio, sem efeitos.
// ============================================================================

import type { SelecaoModelo } from '../bairros/2-inteligencia/casas/conversa'
import type { ModoAgir, NivelPermissaoAgir } from '../bairros/2-inteligencia/casas/agir'
import { mesmaSelecao } from './selecaoModelo'

/**
 * Estado do rascunho DA LANDING. Contexto (Chat/Pasta) e raiz validada
 * permanecem com o dono atual (App) — uma fonte por estado; o snapshot os
 * recebe na captura. Seleção de modelo/modo/permissão são novos e vivem aqui
 * até o primeiro envio.
 */
export interface RascunhoLanding {
  texto: string
  /** Par exato ou Auto — a MESMA escolha vira o primeiro pedido. */
  selecaoModelo: SelecaoModelo
  /** Modo pretendido; em Chat o efetivo é sempre 'ask' (contrato C-1). */
  modo: ModoAgir
  /** Permissão pretendida; em Chat o efetivo é sempre 'manual' (C-1). */
  permissao: NivelPermissaoAgir
  /** Geração do texto: incrementa a cada edição — invalida tentativas velhas. */
  geracao: number
}

/** Snapshot imutável capturado no admitir do envio (02 §1). */
export interface SnapshotPrimeiroEnvio {
  readonly texto: string
  readonly contexto: 'chat' | 'workspace'
  readonly workspacePath: string | null
  readonly workspaceName: string | null
  readonly selecaoModelo: SelecaoModelo
  readonly modo: ModoAgir
  readonly permissao: NivelPermissaoAgir
  readonly geracao: number
  /** Identidade estável da tentativa lógica (deduplicação de clique duplo). */
  readonly tentativaId: string
}

export function rascunhoInicial(): RascunhoLanding {
  return {
    texto: '',
    selecaoModelo: { tipo: 'auto' },
    modo: 'agent',
    permissao: 'manual',
    geracao: 0,
  }
}

/**
 * Aplica uma mudança ao rascunho. Mudanças de TEXTO avançam a geração
 * (tentaivas antigas não podem reivindicar o draft atual); mudanças de
 * seleção preservam a geração vigente.
 */
export function editarRascunho(
  atual: RascunhoLanding,
  mudanca: Partial<Omit<RascunhoLanding, 'geracao'>>,
): RascunhoLanding {
  const mudouTexto = mudanca.texto !== undefined && mudanca.texto !== atual.texto
  return { ...atual, ...mudanca, geracao: mudouTexto ? atual.geracao + 1 : atual.geracao }
}

/** Efeito/autorização do modo conforme a modalidade (contrato C-1 efetivo). */
export function modoEfetivo(contexto: 'chat' | 'workspace', modo: ModoAgir): ModoAgir {
  return contexto === 'chat' ? 'ask' : modo
}

/** Permissão efetiva: Chat é sempre manual; workspace honra a escolha. */
export function permissaoEfetiva(contexto: 'chat' | 'workspace', permissao: NivelPermissaoAgir): NivelPermissaoAgir {
  return contexto === 'chat' ? 'manual' : permissao
}

/**
 * Captura o snapshot da tentativa a partir do rascunho E do contexto/raiz
 * vigentes (fonte atual do App). O texto é aparado nas bordas (semântica
 * textual atual preservada); o conteúdo interno (Unicode/CRLF) não muda.
 */
export function snapshotDoRascunho(
  rascunho: RascunhoLanding,
  contexto: 'chat' | 'workspace',
  workspacePath: string | null,
  workspaceName: string | null,
  tentativaId: string,
): SnapshotPrimeiroEnvio {
  return Object.freeze({
    texto: rascunho.texto.trim(),
    contexto,
    workspacePath: contexto === 'chat' ? null : workspacePath,
    workspaceName: contexto === 'chat' ? null : workspaceName,
    selecaoModelo: rascunho.selecaoModelo,
    modo: modoEfetivo(contexto, rascunho.modo),
    permissao: permissaoEfetiva(contexto, rascunho.permissao),
    geracao: rascunho.geracao,
    tentativaId,
  })
}

/** Recusa honesta do snapshot antes de qualquer efeito (nenhum motivo vira sucesso). */
export function recusarSnapshot(snapshot: SnapshotPrimeiroEnvio): string | null {
  if (!snapshot.texto.trim()) return 'Escreva uma mensagem antes de enviar.'
  if (snapshot.contexto === 'workspace' && !snapshot.workspacePath) {
    return 'Escolha uma pasta real do disco para começar uma conversa workspace.'
  }
  return null
}

/** O snapshot ainda corresponde ao rascunho vigente? (geração não pode vazar) */
export function snapshotAtual(snapshot: SnapshotPrimeiroEnvio, rascunho: RascunhoLanding): boolean {
  return (
    snapshot.geracao === rascunho.geracao &&
    snapshot.texto === rascunho.texto.trim() &&
    mesmaSelecao(snapshot.selecaoModelo, rascunho.selecaoModelo)
  )
}
