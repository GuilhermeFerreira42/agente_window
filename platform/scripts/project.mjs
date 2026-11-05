import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertRuntime, runtime } from './check-runtime.mjs'
import testHomePolicy from './test-home-policy.cjs'

const { DEFAULT_PROFILE_ROOT_NAME, profileRootProblem } = testHomePolicy

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

/**
 * PEND-01 (D140) — disposable profiles are pruned so the root cannot grow without bound.
 * Only `run-*` entries are considered, and only once they are clearly stale, so a concurrent
 * run is never disturbed.
 */
function pruneStaleProfiles(root, maxAgeMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - maxAgeMs
  for (const entry of readdirSync(root)) {
    if (!entry.startsWith('run-')) continue
    const target = path.join(root, entry)
    try {
      if (statSync(target).mtimeMs < cutoff) rmSync(target, { recursive: true, force: true })
    } catch {
      // Perfil em uso por outra execução, ou já removido — não é erro.
    }
  }
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
    // PEND-01 (D140): o perfil descartável precisa morar FORA do repositório e fora de qualquer
    // segmento que o filtro NOISE do watcher do Explorer ignore. Em platform/.cache/test-runs ele
    // violava o invariante D81 (chave fora do repo) e fazia todo evento fs.changed ser descartado
    // na emissão — o que também escondia o caso K3/EXDEV, porque TMPDIR e home caíam no mesmo disco.
    const repositoryRoot = path.resolve(platformRoot, '..')
    const requestedRoot = process.env.AGENTE_WINDOW_TEST_ROOT ?? path.join(homedir(), DEFAULT_PROFILE_ROOT_NAME)
    const rootProblem = profileRootProblem(requestedRoot, repositoryRoot)
    if (rootProblem) {
      throw new Error(`Raiz de perfis de teste recusada: ${rootProblem}. Aponte AGENTE_WINDOW_TEST_ROOT para um caminho fora do repositório e fora de segmentos ignorados pelo watcher.`)
    }
    const testsRoot = path.resolve(requestedRoot)
    mkdirSync(testsRoot, { recursive: true })
    pruneStaleProfiles(testsRoot)
    const profile = mkdtempSync(path.join(testsRoot, 'run-'))
    // O fixture espelha o layout real de produção (`~/.agente_window/<arquivo>.json`, ver
    // config/server/repo.ts:14 e provedores/server/providersRepo.ts:24). Apontar direto para
    // `<perfil>/settings.json` quebrava o invariante que repo.test.ts:70 verifica.
    const perfilHome = path.join(profile, '.agente_window')
    Object.assign(env, { TMP: profile, TEMP: profile, TMPDIR: profile, AGENTE_WINDOW_TEST_HOME: profile, AGENTE_WINDOW_PROVIDERS_PATH: path.join(perfilHome, 'providers.json'), AGENTE_WINDOW_SETTINGS_PATH: path.join(perfilHome, 'settings.json') })
    env.NODE_OPTIONS = `${env.NODE_OPTIONS ?? ''} --require=${JSON.stringify(path.join(platformRoot, 'scripts/test-profile.cjs'))}`.trim()
    for (const key of Object.keys(env)) if (/API[_-]?KEY|ACCESS_TOKEN|AUTH_TOKEN|SECRET_ACCESS_KEY|CLIENT_SECRET/i.test(key)) delete env[key]
    console.log(`[testes] Perfil descartável fora do repositório: ${profile}`)
    // Limpeza segura: o perfil é descartável por definição. AGENTE_WINDOW_KEEP_TEST_PROFILE=1
    // preserva o diretório para depuração quando a evidência do log não basta.
    try {
      return await npm(['run', action, '--workspace=agents-window-replica-v2', ...(args.length ? ['--', ...args] : [])])
    } finally {
      if (!process.env.AGENTE_WINDOW_KEEP_TEST_PROFILE) {
        try { rmSync(profile, { recursive: true, force: true }) } catch { /* melhor esforço */ }
      }
    }
  }
  return npm(['run', action, '--workspace=agents-window-replica-v2', ...(args.length ? ['--', ...args] : [])])
}

main().catch(error => { console.error(`[ambiente] ${error.message}`); process.exitCode = 1 })
