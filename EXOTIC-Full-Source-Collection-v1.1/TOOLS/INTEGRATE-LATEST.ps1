[CmdletBinding()]
param(
    [string]$Workspace = 'C:\Projects\Exotic',
    [switch]$BootstrapVcpkg,
    [switch]$CleanConfigure,
    [switch]$InstallOrRepairService
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backend = Join-Path $root 'CANONICAL-INTEGRATORS\backend-live-integrator-v1.0\Install-EXOTIC-v1.ps1'
$repair = Join-Path $root 'CANONICAL-INTEGRATORS\repair-health-v1.0\Repair-EXOTIC-v1.ps1'
$console = Join-Path $root 'CANONICAL-INTEGRATORS\operations-console-live-v1.1\Integrate-EXOTIC-Console.ps1'
foreach ($path in @($backend,$repair,$console)) { if (-not (Test-Path $path)) { throw "Missing integrator: $path" } }
$backendArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$backend,'-Workspace',$Workspace)
if ($BootstrapVcpkg) { $backendArgs += '-BootstrapVcpkg' }
& powershell @backendArgs
if ($LASTEXITCODE -ne 0) { throw 'Backend integration failed.' }
$repairArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$repair,'-Workspace',$Workspace)
if ($BootstrapVcpkg) { $repairArgs += '-BootstrapVcpkg' }
if ($CleanConfigure) { $repairArgs += '-CleanConfigure' }
if ($InstallOrRepairService) { $repairArgs += '-InstallOrRepairService' }
& powershell @repairArgs
if ($LASTEXITCODE -ne 0) { throw 'Runtime repair/verification failed.' }
$consoleArgs = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$console,'-Workspace',$Workspace)
if ($BootstrapVcpkg) { $consoleArgs += '-BootstrapVcpkg' }
if ($CleanConfigure) { $consoleArgs += '-CleanConfigure' }
& powershell @consoleArgs
if ($LASTEXITCODE -ne 0) { throw 'Console integration failed.' }
Write-Host 'EXOTIC backend, runtime verification, and live console integration completed.'
