import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertRuntime, runtime } from './check-runtime.mjs'

const platformRoot = fileURLToPath(new URL('../', import.meta.url))
const nodeDirectory = path.dirname(process.execPath)
const npmCandidates = [path.join(nodeDirectory, 'node_modules/npm/bin/npm-cli.js'), path.resolve(nodeDirectory, '../lib/node_modules/npm/bin/npm-cli.js')]
const npmCli = npmCandidates.find(existsSync)
const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') ?? 'PATH'
const env = { ...process.env, [pathKey]: `${nodeDirectory}${path.delimiter}${process.env[pathKey] ?? ''}` }
const action = process.argv[2] ?? 'dev'
const args = process.argv.slice(3)
const actions = new Set(['dev', 'install', 'check', 'test', 'typecheck', 'build'])

function npm(arguments_) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...arguments_], { cwd: platformRoot, env, stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`npm terminou com ${signal ?? code}. Confira a mensagem acima.`)))
  })
}

function nativeModulesReady() {
  const probe = spawnSync(process.execPath, ['-e', "const Database=require('better-sqlite3');const db=new Database(':memory:');db.prepare('SELECT 1').get();db.close();require('node-pty');"], { cwd: platformRoot, env, encoding: 'utf8', windowsHide: true })
  return { ok: probe.status === 0, detail: probe.stderr || probe.error?.message || '' }
}

async function main() {
  assertRuntime()
  if (!actions.has(action)) throw new Error(`Ação desconhecida: ${action}. Use dev, install, check, test, typecheck ou build.`)
  if (!npmCli) throw new Error('npm não foi encontrado junto ao Node preparado. Execute o inicializador novamente.')
  const npmVersion = spawnSync(process.execPath, [npmCli, '--version'], { env, encoding: 'utf8', windowsHide: true })
  if (npmVersion.status !== 0 || npmVersion.stdout.trim() !== runtime.npmVersion) throw new Error(`O npm desta distribuição deve ser ${runtime.npmVersion}. Execute o inicializador do projeto.`)
  const marker = path.join(platformRoot, '.cache/runtime-install.json')
  const fingerprint = createHash('sha256').update(readFileSync(path.join(platformRoot, 'package-lock.json'))).update(`${process.version}/${process.platform}/${process.arch}`).digest('hex')
  let previous
  try { previous = JSON.parse(readFileSync(marker, 'utf8')) } catch { /* instalação ainda não preparada */ }
  if (action === 'check') {
    const probe = nativeModulesReady()
    if (!probe.ok) throw new Error(`As dependências nativas precisam ser preparadas. Execute o inicializador com a ação install.\n${probe.detail}`)
    console.log(`[ambiente] Node ${runtime.nodeVersion}, npm ${runtime.npmVersion}, SQLite e PTY carregados.`)
    return
  }
  if (action === 'install' || previous?.fingerprint !== fingerprint || !nativeModulesReady().ok) {
    console.log('[ambiente] Preparando as dependências do projeto pelo lockfile. Seus dados de conversas não são alterados.')
    await npm(['ci', '--include=dev', '--no-audit', '--no-fund'])
    const probe = nativeModulesReady()
    if (!probe.ok) throw new Error(`As dependências nativas não carregaram. A inicialização foi interrompida.\n${probe.detail}`)
    mkdirSync(path.dirname(marker), { recursive: true })
    writeFileSync(marker, JSON.stringify({ node: runtime.nodeVersion, npm: runtime.npmVersion, platform: process.platform, arch: process.arch, fingerprint }, null, 2) + '\n')
  }
  if (action === 'install') return
  if (action === 'build') return npm(['run', 'build', '--workspaces', ...(args.length ? ['--', ...args] : [])])
  if (action === 'test') {
    const testsRoot = path.join(platformRoot, '.cache/test-runs')
    mkdirSync(testsRoot, { recursive: true })
    const profile = mkdtempSync(path.join(testsRoot, 'run-'))
    Object.assign(env, { TMP: profile, TEMP: profile, TMPDIR: profile, AGENTE_WINDOW_TEST_HOME: profile, AGENTE_WINDOW_PROVIDERS_PATH: path.join(profile, 'providers.json'), AGENTE_WINDOW_SETTINGS_PATH: path.join(profile, 'settings.json') })
    env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --require=${JSON.stringify(path.join(platformRoot, 'scripts/test-profile.cjs'))}`.trim()
    for (const key of Object.keys(env)) if (/API[_-]?KEY|ACCESS_TOKEN|AUTH_TOKEN|SECRET_ACCESS_KEY|CLIENT_SECRET/i.test(key)) delete env[key]
    console.log(`[testes] Perfil descartável: ${profile}`)
  }
  return npm(['run', action, '--workspace=agents-window-replica-v2', ...(args.length ? ['--', ...args] : [])])
}

main().catch(error => { console.error(`[ambiente] ${error.message}`); process.exitCode = 1 })
