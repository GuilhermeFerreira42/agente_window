export interface AcaoOperacional {
  id: string
  ferramenta: string
  estado: 'concluida' | 'falhou' | 'incerta' | 'pendente' | 'negada'
  aprovacao: 'nao_registrada' | 'pendente' | 'permitida' | 'negada'
  referencia?: string
  arquivo?: 'igual' | 'alterado' | 'indisponivel'
}

export interface RevisaoOperacional {
  runId: string
  estado: 'interrompida' | 'pausada'
  objetivo?: string
  pasta: 'igual' | 'alterada' | 'indisponivel'
  git: 'igual' | 'alterado' | 'indisponivel'
  acoes: AcaoOperacional[]
  podePlanejar: boolean
}
