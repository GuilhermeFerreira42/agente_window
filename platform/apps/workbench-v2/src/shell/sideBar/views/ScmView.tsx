// FATIA-05 5.3 (docs/24 §4 5.3, RF-05, RF-06) — host da view "Source Control" dentro da Side Bar.
// The real SCM is the module's ChangesPane (4.7-b), mounted by the App via `ScmModuleSlot`
// (same pattern as Explorer/Search). Mounted ONCE; switching views is display flex/none,
// so the list, the commit message and the git state survive. Nothing from the module is imported here.
import type { ReactNode } from 'react'

export interface ScmViewProps {
  readonly slot?: ReactNode
}

export function ScmView({ slot }: ScmViewProps) {
  return (
    <div className="side-bar-view scm" data-testid="side-bar-view-scm">
      {slot ?? <div className="side-bar-view-empty">Source Control is not available.</div>}
    </div>
  )
}
