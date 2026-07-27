@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Integrate-EXOTIC-Console.ps1" -Workspace "C:\Projects\Exotic" -BootstrapVcpkg -CleanConfigure
if errorlevel 1 (
  echo.
  echo EXOTIC console integration failed. Read the report under C:\Projects\Exotic\.exotic\reports\
  pause
  exit /b 1
)
endlocal
