[CmdletBinding()]
param(
    [string]$Workspace = 'C:\Projects\Exotic'
)
$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host 'Requesting Administrator permission...' -ForegroundColor Yellow
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Workspace `"$Workspace`""
    Start-Process powershell.exe -Verb RunAs -ArgumentList $arguments
    exit 0
}

$root = Split-Path -Parent $PSCommandPath
$collection = Join-Path $root 'EXOTIC-Full-Source-Collection-v1.1'
$integrator = Join-Path $collection 'TOOLS\INTEGRATE-LATEST.ps1'

if (-not (Test-Path -LiteralPath $integrator)) {
    $found = Get-ChildItem -LiteralPath $root -Filter 'INTEGRATE-LATEST.ps1' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { $integrator = $found.FullName }
}

if (-not (Test-Path -LiteralPath $integrator)) {
    Write-Host 'ERROR: INTEGRATE-LATEST.ps1 is missing from this extraction.' -ForegroundColor Red
    Write-Host "Extract the entire EXOTIC-START.zip before running this file." -ForegroundColor Yellow
    Read-Host 'Press Enter to close'
    exit 1
}

Write-Host "EXOTIC collection: $collection" -ForegroundColor Cyan
Write-Host "Integrator: $integrator" -ForegroundColor Cyan
Write-Host "Workspace: $Workspace" -ForegroundColor Cyan

Set-ExecutionPolicy -Scope Process Bypass -Force
& $integrator -Workspace $Workspace -BootstrapVcpkg -CleanConfigure -InstallOrRepairService

if ($LASTEXITCODE -ne 0) {
    Write-Host "EXOTIC integration returned exit code $LASTEXITCODE" -ForegroundColor Red
    Read-Host 'Press Enter to close'
    exit $LASTEXITCODE
}

Write-Host 'EXOTIC integration completed.' -ForegroundColor Green
Read-Host 'Press Enter to close'
