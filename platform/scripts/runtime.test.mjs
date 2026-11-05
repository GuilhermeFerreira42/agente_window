import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { runtime, runtimeProblems } from './check-runtime.mjs'

const compatible = { nodeVersion: runtime.nodeVersion, npmVersion: runtime.npmVersion, platform: 'win32', arch: 'x64' }

test('accepts the pinned environment and rejects the incompatible old runtime', () => {
  assert.deepEqual(runtimeProblems(compatible), [])
  assert.match(runtimeProblems({ ...compatible, nodeVersion: '22.12.0' }).join('\n'), /exige/)
})

test('rejects a different npm and unsupported architectures before loading the app', () => {
  assert.match(runtimeProblems({ ...compatible, npmVersion: '10.9.0' }).join('\n'), /npm/)
  assert.match(runtimeProblems({ ...compatible, arch: 'ia32' }).join('\n'), /suportada/)
})

test('runtime configuration, manager files, manifests and lockfile agree', () => {
  for (const name of ['.nvmrc', '.node-version']) assert.equal(readFileSync(new URL('../' + name, import.meta.url), 'utf8').trim(), runtime.nodeVersion)
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
  for (const relative of ['', 'apps/workbench-v2/', 'services/pty-server/']) {
    const manifest = JSON.parse(readFileSync(new URL('../' + relative + 'package.json', import.meta.url), 'utf8'))
    assert.equal(manifest.engines.node, runtime.nodeVersion)
    assert.equal(manifest.engines.npm, runtime.npmVersion)
    assert.equal(manifest.packageManager, 'npm@' + runtime.npmVersion)
    assert.deepEqual(lock.packages[relative.replace(/\/$/, '')].engines, manifest.engines)
  }
})
