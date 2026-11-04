@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0platform\scripts\clean-for-arena.ps1"
set "cleanup_status=%ERRORLEVEL%"
echo.
pause
exit /b %cleanup_status%
