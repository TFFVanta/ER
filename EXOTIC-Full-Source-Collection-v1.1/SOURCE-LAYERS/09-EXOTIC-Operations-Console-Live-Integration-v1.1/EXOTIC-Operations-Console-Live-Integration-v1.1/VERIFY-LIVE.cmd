@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Verify-EXOTIC-Console.ps1" -Workspace "C:\Projects\Exotic"
if errorlevel 1 pause
