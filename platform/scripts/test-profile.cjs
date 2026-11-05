// PEND-01 (D140) — makes the disposable test profile the effective user home for test workers.
//
// The profile location is validated here as well as in project.mjs, because this hook can be
// loaded directly (a plain `vitest run` without the launcher). Rejecting a profile that lives
// inside the repository, or under a segment the Explorer watcher ignores, turns a silent
// false-negative suite into a loud, explained error.
//
// Policy itself lives in test-home-policy.cjs so the constraint cannot drift between the two.

'use strict'

const os = require('node:os')
const path = require('node:path')
const { syncBuiltinESMExports } = require('node:module')
const { profileRootProblem } = require('./test-home-policy.cjs')

const profile = process.env.AGENTE_WINDOW_TEST_HOME
if (!profile) {
  throw new Error(
    'Perfil de testes ausente: AGENTE_WINDOW_TEST_HOME não está definido. Use o inicializador do projeto (iniciar.sh / iniciar.cmd) com a ação test.',
  )
}

const resolved = path.resolve(profile)
// __dirname is platform/scripts, so two levels up is the repository root.
const repositoryRoot = path.resolve(__dirname, '../..')
const problem = profileRootProblem(resolved, repositoryRoot)
if (problem) {
  throw new Error(`Perfil de testes recusado: ${problem}.`)
}

os.homedir = () => resolved
syncBuiltinESMExports()
