@echo off
cd /d "%~dp0"
call npm install --no-audit --no-fund
if errorlevel 1 exit /b 1
call npm run package:win
if errorlevel 1 exit /b 1
echo.
echo Windows installers are in: %CD%\release
