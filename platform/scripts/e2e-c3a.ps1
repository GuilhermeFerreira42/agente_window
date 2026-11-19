# =============================================================================
# platform/scripts/e2e-c3a.ps1 — runner WINDOWS da suíte C-3a (c3a_anexos)
#
# Espelha e2e-c1.ps1/e2e-c2.ps1 com o mesmo contrato (pendência do parecer §3.11:
# só existia o runner Linux):
#   · usa o Chrome/Edge local instalado, ou respeita PLAYWRIGHT_CHROMIUM_EXECUTABLE;
#   · base URL da porta 5214 (a spec spawna o próprio Vite com
#     AGENTE_WINDOW_DATA_DIR descartável — o banco pessoal NUNCA é tocado);
#   · roda e2e/c3a_anexos.spec.ts (dez jornadas E01..E10).
#
# USO (PowerShell, na raiz do repositório):
#   powershell -ExecutionPolicy Bypass -File platform\scripts\e2e-c3a.ps1
#   powershell -ExecutionPolicy Bypass -File platform\scripts\e2e-c3a.ps1 -g "E06"
# =============================================================================
$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location (Join-Path $raiz 'platform\apps\workbench-v2')

if (-not $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
  $candidatos = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
  )
  $navegador = $candidatos | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($navegador) { $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = $navegador }
}
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5214'
$env:PLAYWRIGHT_BROWSERS_PATH = if ($env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH } else { Join-Path $env:USERPROFILE 'AppData\Local\ms-playwright' }

# Perfil de teste isolado (mesmo contrato do test-profile.cjs no Linux): o
# banco pessoal do usuário fica FORA. Se o chamador não definir, usa um tmp.
if (-not $env:AGENTE_WINDOW_TEST_HOME) {
  $env:AGENTE_WINDOW_TEST_HOME = Join-Path $env:TEMP ("c3a-e2e-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $env:AGENTE_WINDOW_TEST_HOME | Out-Null
}

if (-not (Test-Path (Join-Path $raiz 'platform\node_modules\playwright'))) {
  throw "Playwright ausente: rode 'npm ci' em platform/ antes do E2E."
}

npx playwright test e2e/c3a_anexos.spec.ts @args
exit $LASTEXITCODE
