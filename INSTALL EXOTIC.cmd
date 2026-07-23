@echo off
setlocal
title Install EXOTIC
set "TARGET=%LOCALAPPDATA%\EXOTIC"
if not exist "%TARGET%" mkdir "%TARGET%"
xcopy "%~dp0app\*" "%TARGET%\" /E /I /Y >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws=New-Object -ComObject WScript.Shell; ^
   $desktop=[Environment]::GetFolderPath('Desktop'); ^
   $s=$ws.CreateShortcut((Join-Path $desktop 'EXOTIC.lnk')); ^
   $s.TargetPath='mshta.exe'; ^
   $s.Arguments='\"%LOCALAPPDATA%\EXOTIC\EXOTIC.hta\"'; ^
   $s.WorkingDirectory='%LOCALAPPDATA%\EXOTIC'; ^
   $s.IconLocation='%LOCALAPPDATA%\EXOTIC\EXOTIC.ico'; ^
   $s.Description='EXOTIC Portal'; ^
   $s.Save()"

start "" "%USERPROFILE%\Desktop\EXOTIC.lnk"
exit
