// ============================================================================
// C-2 — carga do catálogo de modelos: mesma fonte (barrel de Provedores) com
// guarda de resposta velha (requisição vencida nunca sobrescreve a nova).
// Compartilhado por ChatInput e pelo seletor superior da landing — um único
// ponto de leitura; sem segundo cadastro e sem inferência de disponibilidade.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react'
import { carregarEstado, type ItemCatalogoModelo } from '../bairros/2-inteligencia/casas/provedores'

export interface EstadoCatalogoModelos {
  itens: ItemCatalogoModelo[]
  /** Falha honesta da leitura (nunca é apresentada como lista vazia-ok). */
  erro: string | null
  atualizar: () => void
}

export function useCatalogoModelos(opcoes: { aoFoco?: boolean } = { aoFoco: true }): EstadoCatalogoModelos {
  const [itens, setItens] = useState<ItemCatalogoModelo[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const requisicaoRef = useRef(0)

  const atualizar = useCallback(() => {
    const requisicao = ++requisicaoRef.current
    void carregarEstado()
      .then((estado) => {
        if (requisicao !== requisicaoRef.current) return
        setItens(estado.catalogo ?? [])
        setErro(null)
      })
      .catch(() => {
        if (requisicao !== requisicaoRef.current) return
        setItens([])
        setErro('Não foi possível carregar os modelos disponíveis.')
      })
  }, [])

  useEffect(() => {
    atualizar()
    if (opcoes.aoFoco) window.addEventListener('focus', atualizar)
    return () => {
      // Invalida respostas em voo no desmonte (paridade com o ChatInput).
      requisicaoRef.current += 1
      if (opcoes.aoFoco) window.removeEventListener('focus', atualizar)
    }
  }, [atualizar, opcoes.aoFoco])

  return { itens, erro, atualizar }
}
