@echo off
setlocal
title Install EXOTIC
set "TARGET=%LOCALAPPDATA%\EXOTIC"
set "SHORTCUT=%USERPROFILE%\Desktop\EXOTIC.lnk"
if not exist "%TARGET%" mkdir "%TARGET%"
xcopy "%~dp0app\*" "%TARGET%\" /E /I /Y >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $target=$env:LOCALAPPDATA + '\EXOTIC'; $desktop=[Environment]::GetFolderPath('Desktop'); $shortcut=Join-Path $desktop 'EXOTIC.lnk'; $ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut($shortcut); $s.TargetPath='mshta.exe'; $s.Arguments=('\"' + (Join-Path $target 'EXOTIC.hta') + '\"'); $s.WorkingDirectory=$target; $s.IconLocation=(Join-Path $target 'EXOTIC.ico'); $s.Description='EXOTIC Portal'; $s.Save()"
if errorlevel 1 exit /b 1

if exist "%SHORTCUT%" (
  start "" "%SHORTCUT%"
) else (
  start "" mshta.exe "%TARGET%\EXOTIC.hta"
)
exit /b 0
