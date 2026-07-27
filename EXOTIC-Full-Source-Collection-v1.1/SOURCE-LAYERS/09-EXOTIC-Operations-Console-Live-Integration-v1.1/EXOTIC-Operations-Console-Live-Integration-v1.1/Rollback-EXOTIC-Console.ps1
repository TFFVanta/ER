[CmdletBinding()]
param(
    [string]$Workspace = 'C:\Projects\Exotic',
    [string]$Manifest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Workspace = [System.IO.Path]::GetFullPath($Workspace)

function Hash([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

if (-not $Manifest) {
    $latest = Join-Path $Workspace '.exotic\integration-backups\console-v1.1-latest.txt'
    if (-not (Test-Path -LiteralPath $latest -PathType Leaf)) { throw 'No latest console integration manifest was found.' }
    $Manifest = (Get-Content -LiteralPath $latest -Raw).Trim()
}
if (-not (Test-Path -LiteralPath $Manifest -PathType Leaf)) { throw "Manifest not found: $Manifest" }

$data = Get-Content -LiteralPath $Manifest -Raw | ConvertFrom-Json
$warnings = New-Object System.Collections.ArrayList
$restored = 0
$removed = 0

foreach ($entry in @($data.files) | Sort-Object { $_.destination.Length } -Descending) {
    $destination = [string]$entry.destination
    $currentHash = Hash $destination
    $installedHash = [string]$entry.installedHash
    if ($currentHash -and $installedHash -and $currentHash -ne $installedHash) {
        [void]$warnings.Add("Left locally modified file unchanged: $destination")
        continue
    }

    if ([bool]$entry.existed) {
        $backup = [string]$entry.backup
        if (-not (Test-Path -LiteralPath $backup -PathType Leaf)) {
            [void]$warnings.Add("Backup missing: $backup")
            continue
        }
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        Copy-Item -LiteralPath $backup -Destination $destination -Force
        $restored++
    } elseif (Test-Path -LiteralPath $destination -PathType Leaf) {
        Remove-Item -LiteralPath $destination -Force
        $removed++
    }
}

$cmake = Join-Path $Workspace 'CMakeLists.txt'
if (Test-Path -LiteralPath $cmake -PathType Leaf) {
    $text = Get-Content -LiteralPath $cmake -Raw
    $block = [string]$data.cmakeBlock
    if ($block -and $text.Contains($block)) {
        $text = $text.Replace($block, '').TrimEnd() + [Environment]::NewLine
        Set-Content -LiteralPath $cmake -Value $text -Encoding UTF8
    }
}

Write-Host "restored=$restored"
Write-Host "removed=$removed"
foreach ($warning in $warnings) { Write-Warning $warning }
Write-Host 'result=PASS'
