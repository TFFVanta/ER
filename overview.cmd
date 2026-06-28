@echo off
powershell -ExecutionPolicy Bypass -File tooling\\menu.ps1 && npm run exo -- doctor && npm run exo -- list packages && git status --short
