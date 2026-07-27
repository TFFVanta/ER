$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$stdout = Join-Path $root 'dist\auto-mode.log'
$stderr = Join-Path $root 'dist\auto-mode-error.log'

$env:PORT = '8787'
$env:EXOTIC_AUTO_TICK_MS = '300000'

Start-Process `
  -FilePath 'node' `
  -ArgumentList 'scripts/codex-bridge-runtime.mjs' `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

Write-Output 'EXOTIC auto runtime launch requested.'
Write-Output "Stdout log: $stdout"
Write-Output "Stderr log: $stderr"
