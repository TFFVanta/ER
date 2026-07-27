@echo off
setlocal
cd /d "%~dp0"
title EXOTIC PORTAL

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python server.py
  goto :end
)

echo Python is not installed. Installing Python 3 now...
where winget >nul 2>nul
if not %errorlevel%==0 (
  echo.
  echo Winget is unavailable. Install Python 3 from the Microsoft Store,
  echo then run Launch-Portal-Server.cmd again.
  goto :end
)

winget install --id Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
if not %errorlevel%==0 (
  echo.
  echo Python installation failed. Try opening Microsoft Store and installing Python 3.12.
  goto :end
)

set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if exist "%PY%" (
  "%PY%" server.py
  goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py
  goto :end
)

echo Python was installed, but Windows has not refreshed PATH yet.
echo Close this window and double-click Launch-Portal-Server.cmd again.

:end
pause
