# =============================================================================
# platform/scripts/e2e-c3b.ps1 — runner WINDOWS das jornadas C-3b (c3b_multimodal)
#
# Espelha e2e-c3a.ps1 com o mesmo contrato:
#   · usa o Chrome/Edge local instalado, ou respeita PLAYWRIGHT_CHROMIUM_EXECUTABLE;
#   · base URL da porta 5216 (a spec spawna o próprio Vite com
#     AGENTE_WINDOW_DATA_DIR descartável — o banco pessoal NUNCA é tocado);
#   · roda e2e/c3b_multimodal.spec.ts (doze jornadas E01..E12), sem retry.
#
# USO (PowerShell, na raiz do repositório):
#   powershell -ExecutionPolicy Bypass -File platform\scripts\e2e-c3b.ps1
#   powershell -ExecutionPolicy Bypass -File platform\scripts\e2e-c3b.ps1 -g "E05"
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
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5216'
$env:PLAYWRIGHT_BROWSERS_PATH = if ($env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH } else { Join-Path $env:USERPROFILE 'AppData\Local\ms-playwright' }

# Perfil de teste isolado (mesmo contrato do test-profile.cjs no Linux): o
# banco pessoal do usuário fica FORA. Se o chamador não definir, usa um tmp.
if (-not $env:AGENTE_WINDOW_TEST_HOME) {
  $env:AGENTE_WINDOW_TEST_HOME = Join-Path $env:TEMP ("c3b-e2e-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $env:AGENTE_WINDOW_TEST_HOME | Out-Null
}

if (-not (Test-Path (Join-Path $raiz 'platform\node_modules\playwright'))) {
  throw "Playwright ausente: rode 'npm ci' em platform/ antes do E2E."
}

npx playwright test e2e/c3b_multimodal.spec.ts --workers=1 --retries=0 @args
exit $LASTEXITCODE
