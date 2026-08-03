@echo off
setlocal
set "WORKSPACE=C:\Projects\Exotic"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-EXOTIC-v1.ps1" -Workspace "%WORKSPACE%" -BootstrapVcpkg
if errorlevel 1 (
  echo.
  echo EXOTIC integration stopped. Read the report under %WORKSPACE%\.exotic\reports.
  pause
  exit /b 1
)
echo.
echo EXOTIC v1.0 integration passed.
pause
