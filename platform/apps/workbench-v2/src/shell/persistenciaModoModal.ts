// ============================================================================
// U-1 R01 — o TAMANHO do modal de Configurações lembrado entre aberturas.
//
// Regra do proprietário: a primeira abertura é sempre EXPANDIDA; daí em diante o
// modal reabre no último modo escolhido — inclusive depois de F5. Este módulo é
// só o transporte do valor: nenhum segundo store, nenhuma preferência nova de
// produto. O domínio decide o que é valor válido (`modoInicial`).
//
// Storage indisponível (privado, quota, sandbox) degrada para o modo inicial —
// nunca quebra a abertura do modal.
// ============================================================================

import { MODO_STORAGE_KEY, modoInicial, type ModoModal } from '../domain/configuracoesUnificadas'

type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

function storagePadrao(): StoragePort | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

export function lerModoModal(storage: StoragePort | undefined = storagePadrao()): ModoModal {
  try {
    return modoInicial(storage?.getItem(MODO_STORAGE_KEY) ?? undefined)
  } catch {
    return modoInicial(undefined)
  }
}

export function salvarModoModal(modo: ModoModal, storage: StoragePort | undefined = storagePadrao()): void {
  try {
    storage?.setItem(MODO_STORAGE_KEY, modo)
  } catch {
    /* storage indisponível: o modo vale para esta sessão */
  }
}
