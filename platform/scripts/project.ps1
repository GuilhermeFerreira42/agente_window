param(
  [ValidateSet('dev', 'install', 'check', 'test', 'typecheck', 'build')][string]$Action = 'dev',
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$ProjectArguments
)
$ErrorActionPreference = 'Stop'
try {
  $platformRoot = Split-Path -Parent $PSScriptRoot
  $runtimeConfig = Get-Content -LiteralPath (Join-Path $platformRoot 'runtime.json') -Raw | ConvertFrom-Json
  $nodeVersion = [string]$runtimeConfig.nodeVersion
  if ($nodeVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Versao de Node invalida na configuracao do projeto.' }
  $machineArchitecture = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
  $nodeArchitecture = switch ($machineArchitecture) { 'AMD64' { 'x64' } 'ARM64' { 'arm64' } default { throw "Arquitetura nao suportada: $machineArchitecture" } }
  $runtimeRoot = Join-Path $platformRoot '.runtime'
  $distribution = "node-v$nodeVersion-win-$nodeArchitecture"
  $nodeDirectory = Join-Path $runtimeRoot $distribution
  $nodeExecutable = Join-Path $nodeDirectory 'node.exe'
  if (-not (Test-Path -LiteralPath $nodeExecutable) -or ((& $nodeExecutable --version) -ne "v$nodeVersion")) {
    New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
    $archiveName = "$distribution.zip"
    $archivePath = Join-Path $runtimeRoot $archiveName
    $baseUri = "https://nodejs.org/dist/v$nodeVersion"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Write-Host "[ambiente] Preparando Node $nodeVersion para este projeto..."
    Invoke-WebRequest -UseBasicParsing -Uri "$baseUri/$archiveName" -OutFile $archivePath
    $checksums = (Invoke-WebRequest -UseBasicParsing -Uri "$baseUri/SHASUMS256.txt").Content
    $checksumLine = @($checksums -split "`n" | Where-Object { $_ -match "\s+$([regex]::Escape($archiveName))\s*$" })
    if ($checksumLine.Count -ne 1) { throw 'Nao foi encontrado um checksum unico para o Node oficial.' }
    $expectedHash = ($checksumLine[0].Trim() -split '\s+')[0].ToLowerInvariant()
    $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($expectedHash -ne $actualHash) { throw 'A integridade do Node baixado nao confere; nada sera executado.' }
    Expand-Archive -LiteralPath $archivePath -DestinationPath $runtimeRoot -Force
    if ((& $nodeExecutable --version) -ne "v$nodeVersion") { throw 'O Node preparado nao corresponde a versao do projeto.' }
  }
  & $nodeExecutable (Join-Path $PSScriptRoot 'project.mjs') $Action @ProjectArguments
  exit $LASTEXITCODE
} catch {
  Write-Error "[ambiente] $($_.Exception.Message)"
  exit 1
}
