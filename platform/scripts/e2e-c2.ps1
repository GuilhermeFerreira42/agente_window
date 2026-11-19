# =============================================================================
# platform/scripts/e2e-c2.ps1 — runner WINDOWS da suíte C-2 (c2_centro)
#
# Espelha e2e-c1.ps1 com o mesmo contrato:
#   · aponta o Chrome local instalado (ou respeita PLAYWRIGHT_CHROMIUM_EXECUTABLE);
#   · base URL da porta 5212 (a spec c2_centro spawna o próprio Vite com perfil
#     descartável — o banco pessoal NUNCA é tocado);
#   · roda e2e/c2_centro.spec.ts (8 jornadas do centro: R01..R05, R10, R12).
#
# USO (PowerShell, na raiz do repositório):
#   powershell -ExecutionPolicy Bypass -File platform\scripts\e2e-c2.ps1
# =============================================================================
$ErrorActionPreference = 'Stop'
$raiz = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location (Join-Path $raiz 'platform\apps\workbench-v2')

if (-not $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
  $candidatos = @(
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  )
  $chrome = $candidatos | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($chrome) { $env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = $chrome }
}
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5212'
$env:PLAYWRIGHT_BROWSERS_PATH = if ($env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH } else { Join-Path $env:USERPROFILE 'AppData\Local\ms-playwright' }

npx playwright test e2e/c2_centro.spec.ts @args
