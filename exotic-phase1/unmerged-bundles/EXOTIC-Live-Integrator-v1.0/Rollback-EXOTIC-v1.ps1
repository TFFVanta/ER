[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Workspace = "C:\Projects\Exotic",
    [string]$Backup = ""
)

$ErrorActionPreference = "Stop"
$Workspace = [IO.Path]::GetFullPath($Workspace)
$backupParent = Join-Path $Workspace ".exotic\integration-backups"
if ([string]::IsNullOrWhiteSpace($Backup)) {
    $Backup = Get-ChildItem -LiteralPath $backupParent -Directory -Filter "v1.0-*" |
        Sort-Object Name -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}
if (!$Backup -or !(Test-Path -LiteralPath $Backup)) {
    throw "No EXOTIC v1.0 integration backup was found."
}

Get-ChildItem -LiteralPath $Backup -Recurse -File | Where-Object {
    $_.Name -notin @("git-status-before.txt", "working-tree-before.patch")
} | ForEach-Object {
    $relative = [IO.Path]::GetRelativePath($Backup, $_.FullName)
    $destination = Join-Path $Workspace $relative
    if ($PSCmdlet.ShouldProcess($destination, "Restore from $($_.FullName)")) {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $destination -Force
        Write-Host "Restored $relative"
    }
}

Write-Warning "Files that were newly created by the integration are not deleted automatically. The backup restores every pre-existing file that was changed."
