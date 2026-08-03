$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$stdout = Join-Path $root 'dist\overnight-auto.log'
$stderr = Join-Path $root 'dist\overnight-auto-error.log'

$env:PORT = '8787'
$env:EXOTIC_AUTO_TICK_MS = '300000'

Start-Process `
  -FilePath 'node' `
  -ArgumentList 'scripts/codex-bridge-runtime.mjs' `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

Write-Output 'EXOTIC overnight auto runtime launch requested.'
Write-Output "Stdout log: $stdout"
Write-Output "Stderr log: $stderr"
