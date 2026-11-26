// Preparação local opcional da MM-I. Python 3.11 é pré-requisito do operador;
// wheels PyPI e arquivos do modelo são fixados por versão e SHA-256.
import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const platform = fileURLToPath(new URL('../', import.meta.url))
const root = path.join(platform, '.runtime', 'multimidia')
const venv = path.join(root, 'venv')
const python = process.platform === 'win32' ? path.join(venv, 'Scripts', 'python.exe') : path.join(venv, 'bin', 'python')
const model = path.join(root, 'faster-whisper-small')
const requirements = path.join(platform, 'scripts', 'multimidia-requirements.txt')
const revision = '536b0662742c02347bc0e980a01041f333bce120'
const files = {
  'model.bin': ['3e305921506d8872816023e4c273e75d2419fb89b24da97b4fe7bce14170d671', 483546902],
  'config.json': ['b55496ac7940a7ae47d2c01eab40edfd8701feec1229d9cce3b40014383fb828', 2370],
  'tokenizer.json': ['fb7b63191e9bb045082c79fd742a3106a12c99513ab30df4a0d47fa6cb6fd0ab', 2203239],
  'vocabulary.txt': ['34ce3fe1c5041027b3f8d42912270993f986dbc4bb34cf27f951e34a1e453913', 459861],
}
const marker = path.join(root, 'instalado.json')
const lockHash = () => createHash('sha256').update(readFileSync(requirements)).digest('hex')

async function hashFile(file) {
  const hash = createHash('sha256')
  for await (const bytes of createReadStream(file)) hash.update(bytes)
  return hash.digest('hex')
}
async function modelValid() {
  try {
    for (const [name, [digest, size]] of Object.entries(files)) {
      const file = path.join(model, name)
      if (statSync(file).size !== size || await hashFile(file) !== digest) return false
    }
    return true
  } catch { return false }
}
function run(command, args) {
  const r = spawnSync(command, args, { stdio: 'inherit', windowsHide: true })
  if (r.error || r.status !== 0) throw new Error(`Falhou ${command}: ${r.error?.message ?? r.status}`)
}
function choosePython() {
  const candidates = process.platform === 'win32' ? [['py', '-3.11'], ['python']] : [['python3.11']]
  for (const [cmd, ...prefix] of candidates) {
    const r = spawnSync(cmd, [...prefix, '-I', '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], { encoding: 'utf8', windowsHide: true })
    if (r.status === 0 && r.stdout.trim() === '3.11') return [cmd, ...prefix]
  }
  throw new Error('Instale Python 3.11 x64 confiável com suporte a venv/pip e execute iniciar install novamente.')
}
function response(url, redirects = 0) {
  if (redirects > 8 || new URL(url).protocol !== 'https:') return Promise.reject(new Error('Redirecionamento de modelo inválido.'))
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'agente-window-multimidia/1' }, timeout: 60_000 }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume(); response(new URL(res.headers.location, url).href, redirects + 1).then(resolve, reject)
      } else if (res.statusCode === 200) resolve(res)
      else { res.resume(); reject(new Error(`Download de modelo retornou HTTP ${res.statusCode}.`)) }
    })
    request.on('timeout', () => request.destroy(new Error('Download do modelo expirou.')))
    request.on('error', reject)
  })
}
async function downloadModel() {
  mkdirSync(root, { recursive: true })
  const stage = path.join(root, `modelo-${randomUUID()}`)
  mkdirSync(stage)
  try {
    for (const [name, [digest, size]] of Object.entries(files)) {
      console.log(`[multimídia] Baixando ${name} (${size} bytes)...`)
      const file = path.join(stage, name)
      const stream = await response(`https://huggingface.co/Systran/faster-whisper-small/resolve/${revision}/${name}`)
      let total = 0
      stream.on('data', part => { total += part.length; if (total > size) stream.destroy(new Error('Modelo excede tamanho esperado.')) })
      await pipeline(stream, createWriteStream(file, { flags: 'wx' }))
      if (total !== size || await hashFile(file) !== digest) throw new Error(`Integridade inválida: ${name}. Nada será ativado.`)
    }
    // Nunca reutiliza um diretório de modelo que falhou na verificação.
    rmSync(model, { recursive: true, force: true })
    renameSync(stage, model)
  } finally { rmSync(stage, { recursive: true, force: true }) }
}
export async function instalarMultimidia() {
  if (process.arch !== 'x64' || !['win32', 'linux'].includes(process.platform)) throw new Error('Multimídia preparada somente para Windows ou Linux x64; demais plataformas ainda não foram validadas.')
  mkdirSync(root, { recursive: true })
  const trava = path.join(root, 'instalacao.lock')
  try { mkdirSync(trava) } catch { throw new Error('Outra instalação multimídia está em curso, ou o lock precisa de revisão após interrupção.') }
  try {
    rmSync(marker, { force: true })
    const [command, ...prefix] = choosePython()
    console.log('[multimídia] Preparando Python 3.11 e wheels PyPI fixadas (sem compilar código).')
    rmSync(venv, { recursive: true, force: true })
    run(command, [...prefix, '-I', '-m', 'venv', venv])
    run(python, ['-I', '-m', 'pip', '--isolated', 'install', '--disable-pip-version-check', '--no-input', '--only-binary=:all:', '--require-hashes', '--index-url', 'https://pypi.org/simple', '-r', requirements])
    run(python, ['-I', '-m', 'pip', '--isolated', 'check'])
    run(python, ['-I', '-c', "import av, faster_whisper, ctranslate2; assert av.__version__ == '18.1.1' and faster_whisper.__version__ == '1.1.1' and ctranslate2.__version__ == '4.9.1'"])
    if (!await modelValid()) await downloadModel()
    if (!await modelValid()) throw new Error('A verificação final do modelo falhou.')
    writeFileSync(marker, JSON.stringify({ revision, lockHash: lockHash(), platform: process.platform, arch: process.arch }) + '\n', { mode: 0o600 })
    console.log('[multimídia] Dependências e pesos verificados. WAV e quadro de MP4 serão habilitados ao iniciar.')
  } finally { rmSync(trava, { recursive: true, force: true }) }
}
/** Só habilita automaticamente um ambiente completo, da plataforma e lock atuais. */
export async function ativarMultimidia(env) {
  try {
    const data = JSON.parse(readFileSync(marker, 'utf8'))
    if (data.revision !== revision || data.lockHash !== lockHash() || data.platform !== process.platform || data.arch !== process.arch || !existsSync(python) || !await modelValid()) throw new Error('marcador ou modelo inválido')
    env.AGENTE_WINDOW_VIDEO_PYTHON ??= python
    env.AGENTE_WINDOW_WHISPER_PYTHON ??= python
    env.AGENTE_WINDOW_WHISPER_MODEL ??= model
    return true
  } catch { return false }
}
