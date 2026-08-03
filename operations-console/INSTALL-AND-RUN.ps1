param(
  [ValidateSet('Browser','Desktop','Package')]
  [string]$Mode = 'Desktop'
)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ is required.' }
switch ($Mode) {
  'Browser' {
    Start-Process node -ArgumentList 'scripts/serve.mjs' -WindowStyle Minimized
    Start-Sleep -Seconds 2
    Start-Process 'http://127.0.0.1:4173'
  }
  'Desktop' {
    if (-not (Test-Path 'node_modules/electron')) { npm install --no-audit --no-fund }
    npm run desktop
  }
  'Package' {
    npm install --no-audit --no-fund
    npm run package:win
  }
}
