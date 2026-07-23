$Root = Split-Path -Parent $PSScriptRoot
$Binary = Join-Path $Root "app\bin\exotic.exe"
Clear-Host
Write-Host "EXOTIC VX.0.5.3 — WORKSPACE PREVIEW" -ForegroundColor Magenta
Write-Host ""
Write-Host "[1] Open Exotic Studio"
Write-Host "[2] Run Platform Services"
Write-Host "[3] Open Bundle Folder"
Write-Host "[4] View Release Manifest"
Write-Host "[Q] Quit"
$Choice = Read-Host "Select"
switch ($Choice.ToUpper()) {
  "1" { & (Join-Path $Root "scripts\Launch-Studio.ps1") }
  "2" {
    if (Test-Path $Binary) { & $Binary platform }
    else { Write-Host "Copy exotic.exe into app\bin first." -ForegroundColor Yellow; pause }
  }
  "3" { Start-Process explorer.exe $Root }
  "4" { Get-Content (Join-Path $Root "bundle.json"); pause }
  default { exit }
}
