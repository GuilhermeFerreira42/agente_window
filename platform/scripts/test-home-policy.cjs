// PEND-01 (D140) — single source of truth for where disposable test profiles may live.
//
// Two constraints, both proven by experiment and recorded in docs/09 §3.28:
//
//   1. OUTSIDE the repository. The D81 invariant asserts that the real provider/settings
//      home resolves outside the checkout. A profile inside the repository makes that
//      assertion fail even though the product behaves correctly.
//
//   2. OUTSIDE any path segment ignored by the Explorer watcher NOISE filter (see
//      apps/workbench-v2/src/modules/explorer-search/server/fs/watcher.ts). A profile under
//      `.cache` caused every fs.changed event to be dropped at emission, which silently
//      failed the fsWatcher/fsIntegration tests and — because TMPDIR and homedir then landed
//      on the same device — made lixeira.test.ts skip the K3/EXDEV safety case altogether.
//
// Pure helpers with no side effects, so both the launcher (project.mjs) and the --require
// hook (test-profile.cjs) can share them without duplicating a safety-relevant constant.

'use strict'

const path = require('node:path')

/**
 * Mirror of the NOISE filter in explorer-search/server/fs/watcher.ts.
 * If that filter gains or loses a segment, this must follow — otherwise a profile location
 * can become invisible to the watcher again.
 */
const IGNORED_SEGMENT =
  /(^|[/\\])(\.git|node_modules|__pycache__|\.pytest_cache|\.tox|\.nox|\.venv|\.next|\.nuxt|\.turbo|\.cache|dist|out|target|coverage)([/\\]|$)/

/** Directory name used under the user home when no explicit root is requested. */
const DEFAULT_PROFILE_ROOT_NAME = '.agente-window-testes'

/** True when `target` is `parent` itself or lives below it. */
function isInside(parent, target) {
  const relative = path.relative(parent, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

/**
 * Returns a human-readable reason why `candidate` is unacceptable as a test profile root,
 * or null when it satisfies both constraints.
 */
function profileRootProblem(candidate, repositoryRoot) {
  const resolved = path.resolve(candidate)
  if (isInside(repositoryRoot, resolved)) {
    return `está dentro do repositório (${resolved}); o invariante D81 exige home descartável fora do checkout`
  }
  if (IGNORED_SEGMENT.test(resolved)) {
    return `contém um segmento ignorado pelo watcher do Explorer (${resolved}); todo evento fs.changed seria descartado em silêncio`
  }
  return null
}

module.exports = { IGNORED_SEGMENT, DEFAULT_PROFILE_ROOT_NAME, isInside, profileRootProblem }
