[CmdletBinding()]
param(
    [string]$Workspace = 'C:\Projects\Exotic'
)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$destinationRoot = Join-Path $Workspace 'source-collection'
$destination = Join-Path $destinationRoot 'EXOTIC-Full-Source-Collection-v1.1'
New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null
if ((Test-Path $destination) -and ((Resolve-Path $destination).Path -eq $source)) {
    Write-Host "Collection is already stored at $destination"
    exit 0
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if (Test-Path $destination) {
    $backup = "$destination.backup-$stamp"
    Move-Item -LiteralPath $destination -Destination $backup
    Write-Host "Previous collection moved to $backup"
}
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$arguments = @($source, $destination, '/E', '/COPY:DAT', '/DCOPY:T', '/R:2', '/W:1', '/XD', '.git', 'node_modules', 'out', 'release')
& robocopy @arguments | Out-Host
if ($LASTEXITCODE -gt 7) { throw "robocopy failed with exit code $LASTEXITCODE" }
Write-Host "EXOTIC full source collection saved to: $destination"
