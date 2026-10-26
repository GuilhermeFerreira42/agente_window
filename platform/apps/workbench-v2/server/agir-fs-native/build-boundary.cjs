const { spawnSync } = require('node:child_process')

if (process.platform !== 'linux') {
  console.log(`[F2] Native boundary is not validated on ${process.platform}; addon build skipped and disk operations remain fail-closed.`)
  process.exit(0)
}

const nodeGyp = require.resolve('node-gyp/bin/node-gyp.js')
const result = spawnSync(process.execPath, [nodeGyp, 'rebuild', '--directory', 'server/agir-fs-native'], {
  cwd: process.cwd(),
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
