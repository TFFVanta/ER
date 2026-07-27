[CmdletBinding()]
param([string]$Workspace = 'C:\Projects\Exotic')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Workspace = [System.IO.Path]::GetFullPath($Workspace)
$console = Join-Path $Workspace 'console\operations-v1.1'
$release = Join-Path $console 'release'
$env:EXOTIC_WORKSPACE = $Workspace

$portable = Get-ChildItem -LiteralPath $release -Filter '*.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch 'Setup|Uninstall' } |
    Sort-Object Length -Descending |
    Select-Object -First 1

if ($portable) {
    Start-Process -FilePath $portable.FullName | Out-Null
    Write-Host "launched=$($portable.FullName)"
    exit 0
}
if (-not (Test-Path -LiteralPath (Join-Path $console 'package.json') -PathType Leaf)) {
    throw "Console installation not found: $console"
}
Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'desktop') -WorkingDirectory $console | Out-Null
Write-Host 'launched=npm desktop'
