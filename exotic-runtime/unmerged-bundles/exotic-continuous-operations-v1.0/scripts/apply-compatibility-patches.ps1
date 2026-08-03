param(
    [string]$Workspace = "C:\Projects\Exotic",
    [string]$BundleRoot = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = "Stop"
$patchRoot = Join-Path $BundleRoot "patches"
if (!(Test-Path $patchRoot)) {
    throw "Compatibility patch directory not found: $patchRoot"
}
if (!(Test-Path $Workspace)) {
    throw "EXOTIC workspace not found: $Workspace"
}

$files = Get-ChildItem $patchRoot -Recurse -File | Where-Object {
    $_.FullName -match [regex]::Escape([IO.Path]::DirectorySeparatorChar + "src" + [IO.Path]::DirectorySeparatorChar)
}

foreach ($file in $files) {
    $srcMarker = [IO.Path]::DirectorySeparatorChar + "src" + [IO.Path]::DirectorySeparatorChar
    $position = $file.FullName.LastIndexOf($srcMarker)
    if ($position -lt 0) { continue }
    $relative = $file.FullName.Substring($position + 1)
    $destination = Join-Path $Workspace $relative
    $directory = Split-Path $destination -Parent
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    Copy-Item -Force $file.FullName $destination
    Write-Host "Patched $relative"
}

Write-Warning "Review docs\COMPATIBILITY_PATCHES.md: the v0.2 Autonomy repository next-ID methods must call Database::next_sequence()."
