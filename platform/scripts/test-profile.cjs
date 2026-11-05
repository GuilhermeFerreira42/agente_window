const os = require('node:os')
const path = require('node:path')
const { syncBuiltinESMExports } = require('node:module')
const profile = process.env.AGENTE_WINDOW_TEST_HOME
const root = path.resolve(__dirname, '../.cache/test-runs')
const relative = profile ? path.relative(root, path.resolve(profile)) : '..'
if (!profile || !relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Perfil de testes ausente ou fora da pasta descartável do projeto.')
os.homedir = () => profile
syncBuiltinESMExports()
