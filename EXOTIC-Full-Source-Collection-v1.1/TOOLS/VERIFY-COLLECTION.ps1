[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$manifestPath = Join-Path $root 'MANIFEST.json'
if (-not (Test-Path $manifestPath)) { throw 'MANIFEST.json is missing.' }
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$failed = $false
foreach ($item in $manifest.releases) {
    $path = Join-Path $root ('RELEASES\' + $item.file)
    if (-not (Test-Path $path)) {
        Write-Host "MISSING  $($item.file)" -ForegroundColor Red
        $failed = $true
        continue
    }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($actual -ne $item.sha256) {
        Write-Host "FAILED   $($item.file)" -ForegroundColor Red
        $failed = $true
    } else {
        Write-Host "PASS     $($item.file)" -ForegroundColor Green
    }
}
if ($failed) { throw 'Collection verification failed.' }
Write-Host 'EXOTIC full source collection verified.' -ForegroundColor Green
