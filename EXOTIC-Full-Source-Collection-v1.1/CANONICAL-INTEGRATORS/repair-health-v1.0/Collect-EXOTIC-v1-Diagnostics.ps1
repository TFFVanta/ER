[CmdletBinding()]
param([string]$Workspace = "C:\Projects\Exotic")
$ErrorActionPreference = "Stop"
$Workspace = [IO.Path]::GetFullPath($Workspace)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$root = Join-Path $Workspace ".exotic\reports\diagnostics-$timestamp"
New-Item -ItemType Directory -Force -Path $root | Out-Null

$commands = @(
    @{ Name="cmake-version.txt"; Script={ cmake --version } },
    @{ Name="git-status.txt"; Script={ git -C $Workspace status --short } },
    @{ Name="service.txt"; Script={ Get-Service EXOTIC -ErrorAction SilentlyContinue | Format-List * } },
    @{ Name="service-query.txt"; Script={ sc.exe queryex EXOTIC } }
)
foreach ($command in $commands) {
    try { & $command.Script 2>&1 | Out-File -FilePath (Join-Path $root $command.Name) -Encoding utf8 }
    catch { $_ | Out-File -FilePath (Join-Path $root $command.Name) -Encoding utf8 }
}

$reportRoot = Join-Path $Workspace ".exotic\reports"
if (Test-Path $reportRoot) {
    Get-ChildItem $reportRoot -File | Sort-Object LastWriteTime -Descending | Select-Object -First 10 |
        Copy-Item -Destination $root -Force
}
$dash = Join-Path $Workspace ".exotic\dashboards"
if (Test-Path $dash) { Copy-Item $dash (Join-Path $root "dashboards") -Recurse -Force }
$build = Join-Path $Workspace "out\build"
if (Test-Path $build) {
    Get-ChildItem $build -Recurse -File -Include "CMakeCache.txt","LastTest.log","LastTestsFailed.log","*.log" -ErrorAction SilentlyContinue |
        ForEach-Object {
            $safe = ($_.FullName.Substring($Workspace.Length).TrimStart('\') -replace '[\\:]', '_')
            Copy-Item $_.FullName (Join-Path $root $safe) -Force
        }
}
$zip = "$root.zip"
Compress-Archive -Path "$root\*" -DestinationPath $zip -Force
Write-Host "Diagnostics: $zip"
