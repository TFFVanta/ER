@echo off
cd /d "%~dp0\.."
set PORT=8787
:check
powershell -NoProfile -Command "try{$l=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,%PORT%);$l.Start();$l.Stop();exit 0}catch{exit 1}"
if errorlevel 1 (
  set /a PORT+=1
  goto check
)
start "" "http://127.0.0.1:%PORT%"
cd app
where py >nul 2>nul && py -m http.server %PORT% --bind 127.0.0.1
where python >nul 2>nul && python -m http.server %PORT% --bind 127.0.0.1
pause
