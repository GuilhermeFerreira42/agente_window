// F2: exclusão está temporariamente fail-closed. A implementação anterior
// usava operações pathname-based (XDG/PowerShell) vulneráveis a corridas entre
// validação e movimentação. Não existe fallback até a lixeira ser integrada ao
// helper de handles e validada por plataforma.
export interface ResultadoLixeira {
  ok: boolean
  destino?: string
  motivo?: string
}

export interface OpcoesLixeira {
  plataforma?: NodeJS.Platform
  pastaTrash?: string
  executar?: (comando: string, args: string[]) => Promise<{ stdout: string; stderr: string }>
}

export async function moverParaLixeira(_absoluto: string, _opcoes: OpcoesLixeira = {}): Promise<ResultadoLixeira> {
  return {
    ok: false,
    motivo: 'Exclusão bloqueada: lixeira sem contenção segura contra links e alterações concorrentes. Nenhum item foi movido ou removido.',
  }
}
