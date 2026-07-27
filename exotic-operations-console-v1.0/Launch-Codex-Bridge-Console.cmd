@echo off
setlocal
cd /d "%~dp0"

start "EXOTIC Codex Bridge Runtime" cmd /k node scripts\codex-bridge-runtime.mjs
timeout /t 2 >nul
start "EXOTIC Operations Console" cmd /k node scripts\serve.mjs
timeout /t 2 >nul
start "" "http://127.0.0.1:4173/?mode=live&endpoint=http://127.0.0.1:8787/api/v1"

echo.
echo EXOTIC build observer is starting.
echo Runtime adapter: http://127.0.0.1:8787/api/v1/console/snapshot
echo Console:         http://127.0.0.1:4173/?mode=live^&endpoint=http://127.0.0.1:8787/api/v1
echo.
echo Use the Codex Bridge page to leave operator notes in the workspace.
endlocal
