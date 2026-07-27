@echo off
cd /d "%~dp0"
if not exist node_modules\electron\dist\electron.exe (
  echo Installing desktop dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
call npm run desktop
