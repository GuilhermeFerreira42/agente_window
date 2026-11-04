@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0platform\scripts\project.ps1" %*
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar. Confira a mensagem acima.
  pause
  exit /b 1
)
