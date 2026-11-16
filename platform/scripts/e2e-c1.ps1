# =============================================================================
# platform/scripts/e2e-c1.ps1 — equivalente WINDOWS de e2e-c1.sh (rodada 2)
#
# Ressalva do reteste 16/11: o runner shell era Linux-only. Este script espelha
# o mesmo contrato no Windows:
#   · aponta o Chrome local instalado (ou respeita PLAYWRIGHT_CHROMIUM_EXECUTABLE
#     já definido pelo chamador);
#   · base URL da porta 5211 (a spec spawna o próprio Vite com perfil
#     descartável — o banco pessoal NUNCA é tocado);
#   · roda e2e/c1_correcoes.spec.ts (5 cenários: B1/B2/B3/F4 + rodada 2).
#
# USO (PowerShell, na raiz do repositório):
#   powershell -ExecutionPolicy Bypass -File platform\scripts\e2e-c1.ps1
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
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:5211'
$env:PLAYWRIGHT_BROWSERS_PATH = if ($env:PLAYWRIGHT_BROWSERS_PATH) { $env:PLAYWRIGHT_BROWSERS_PATH } else { Join-Path $env:USERPROFILE 'AppData\Local\ms-playwright' }

npx playwright test e2e/c1_correcoes.spec.ts @args
