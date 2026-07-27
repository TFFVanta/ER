@echo off
cd /d "%~dp0"
start "EXOTIC Mock Runtime" /min cmd /c "node scripts\mock-runtime.mjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8787"
