$ErrorActionPreference="Stop"
if(Get-Service EXOTIC -ErrorAction SilentlyContinue){Stop-Service EXOTIC -ErrorAction SilentlyContinue;sc.exe delete EXOTIC | Out-Null;Write-Host "EXOTIC service removed"}else{Write-Host "EXOTIC service is not installed"}
