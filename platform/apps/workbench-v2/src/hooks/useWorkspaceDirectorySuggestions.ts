import { useEffect, useState } from 'react'
import { listSessionWorkspaceDirectories, type WorkspaceDirectoryEntry } from '../services/sessions/sessionsClient'

interface Suggestions {
  query: string
  folders: WorkspaceDirectoryEntry[]
  pending: boolean
  error: string | null
  available: boolean
}
const empty = (query: string): Suggestions => ({ query, folders: [], pending: false, error: null, available: false })
const localAbsolute = (path: string) => /^(?:[a-z]:[\\/]|\/(?!\/))/i.test(path)
export const normalizeDirectoryQuery = (query: string) => /^[a-z]:$/i.test(query.trim()) ? `${query.trim()}\\` : query.trim()
const messages: Record<string, string> = {
  permission: 'Sem permissão para listar esta pasta.',
  not_found: 'A pasta digitada não foi encontrada.',
  not_directory: 'O caminho digitado não é uma pasta.',
}

/** Somente sugestões de leitura; não ativa workspace, valida seleção ou cria sessão. */
export function useWorkspaceDirectorySuggestions(open: boolean, query: string) {
  const [state, setState] = useState<Suggestions>(() => empty(query))
  useEffect(() => {
    const path = normalizeDirectoryQuery(query)
    if (!open || !localAbsolute(path)) { setState(empty(query)); return }
    let active = true
    const controller = new AbortController()
    setState({ ...empty(query), pending: true })
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          let result = await listSessionWorkspaceDirectories(path, controller.signal)
          if (!active) return
          let prefix = ''
          // Um segmento ainda incompleto busca no pai e filtra pelo prefixo.
          if (result.error === 'not_found' && !/[\\/]$/.test(path)) {
            const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
            const parent = path.slice(0, index + 1)
            if (localAbsolute(parent)) {
              prefix = path.slice(index + 1).toLocaleLowerCase()
              result = await listSessionWorkspaceDirectories(parent, controller.signal)
            }
          }
          if (!active) return
          if (result.error) {
            setState({ ...empty(query), error: messages[result.error] ?? 'Não foi possível listar esta pasta.' })
          } else {
            setState({ query, folders: result.folders.filter((folder) => folder.name.toLocaleLowerCase().startsWith(prefix)),
              pending: false, error: null, available: true })
          }
        } catch {
          if (active) setState({ ...empty(query), error: 'Não foi possível carregar as subpastas. Tente digitar o caminho novamente.' })
        }
      })()
    }, 180)
    return () => { active = false; window.clearTimeout(timer); controller.abort() }
  }, [open, query])
  // Não exibir resultados do texto anterior enquanto a nova consulta inicia.
  return state.query === query ? state : empty(query)
}
