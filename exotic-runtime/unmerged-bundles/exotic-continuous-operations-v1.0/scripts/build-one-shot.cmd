@echo off
setlocal
set WORKSPACE=%~1
if "%WORKSPACE%"=="" set WORKSPACE=C:\Projects\Exotic
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" -Workspace "%WORKSPACE%"
if errorlevel 1 exit /b %errorlevel%
"%WORKSPACE%\out\build\x64-Release\Release\exotic-runtime-cli.exe" --workspace "%WORKSPACE%" status
