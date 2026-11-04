import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const runtime = JSON.parse(readFileSync(new URL('../runtime.json', import.meta.url), 'utf8'))

export function runtimeProblems({ nodeVersion, npmVersion, platform, arch }) {
  const problems = []
  if (nodeVersion !== runtime.nodeVersion) problems.push(`Node ${nodeVersion}; este projeto exige ${runtime.nodeVersion}.`)
  if (npmVersion && npmVersion !== runtime.npmVersion) problems.push(`npm ${npmVersion}; este projeto exige ${runtime.npmVersion}.`)
  if (!runtime.platforms.includes(platform) || !runtime.architectures.includes(arch)) problems.push(`Plataforma não suportada pelo inicializador: ${platform}/${arch}.`)
  return problems
}

export function assertRuntime() {
  const npmVersion = process.env.npm_config_user_agent?.match(/(?:^|\s)npm\/([^\s]+)/)?.[1]
  const problems = runtimeProblems({ nodeVersion: process.versions.node, npmVersion, platform: process.platform, arch: process.arch })
  if (problems.length) throw new Error(`${problems.join('\n')}\nUse iniciar.cmd (Windows) ou ./iniciar.sh (Linux/macOS), na raiz do projeto. Leia docs/09 para preparar o ambiente.`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assertRuntime()
    console.log(`[ambiente] Node ${runtime.nodeVersion}; versão de execução correta.`)
  } catch (error) {
    console.error(`[ambiente] ${error.message}`)
    process.exitCode = 1
  }
}
