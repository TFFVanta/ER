param([string]$Workspace="C:\Projects\Exotic")
$ErrorActionPreference="Stop"
$exe=Join-Path $Workspace "out\build\x64-Release\Release\exotic-runtime-service.exe"
if(!(Test-Path $exe)){throw "Runtime service executable not found: $exe"}
if(Get-Service EXOTIC -ErrorAction SilentlyContinue){Stop-Service EXOTIC -ErrorAction SilentlyContinue;sc.exe delete EXOTIC | Out-Null;Start-Sleep -Seconds 1}
$bin='"'+$exe+'" --service --workspace "'+$Workspace+'"'
sc.exe create EXOTIC binPath= $bin start= auto DisplayName= "EXOTIC Continuous Operations" | Out-Null
sc.exe description EXOTIC "EXOTIC controlled 24/7 continuous operations runtime" | Out-Null
sc.exe failure EXOTIC reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Null
Write-Host "Installed EXOTIC service. Start with: Start-Service EXOTIC"
