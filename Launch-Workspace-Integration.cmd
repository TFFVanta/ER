@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Invoke-Workspace-Integration.ps1" -Workspace "C:\Projects\Exotic"
endlocal
