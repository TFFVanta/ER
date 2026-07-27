[CmdletBinding()]
param(
    [string]$Workspace = 'C:\Projects\Exotic',
    [int]$Port = 8791,
    [switch]$SkipSimulation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Workspace = [System.IO.Path]::GetFullPath($Workspace)
$console = Join-Path $Workspace 'console\operations-v1.1'
$build = Join-Path $Workspace 'out\build\console-v1.1'

function Find-Exe([string]$Name) {
    $native = Join-Path $console ('native\' + $Name)
    if (Test-Path -LiteralPath $native -PathType Leaf) { return $native }
    $match = Get-ChildItem -LiteralPath $build -Filter $Name -File -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if ($match) { return $match.FullName }
    return $null
}

$api = Find-Exe 'exotic-console-api.exe'
$smoke = Find-Exe 'exotic-runtime-smoke.exe'
if (-not $api) { throw 'exotic-console-api.exe was not found.' }
if (-not $smoke) { throw 'exotic-runtime-smoke.exe was not found.' }

$endpoint = "http://127.0.0.1:$Port/api/v1"
$restartRuntimeService = $false
$runtimeService = Get-Service -Name 'EXOTIC' -ErrorAction SilentlyContinue
if (-not $SkipSimulation -and $runtimeService -and $runtimeService.Status -eq 'Running') {
    Stop-Service -Name 'EXOTIC' -ErrorAction Stop
    $runtimeService.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
    $restartRuntimeService = $true
}
$process = Start-Process -FilePath $api -ArgumentList @(
    '--workspace', ('"' + $Workspace + '"'),
    '--assets', ('"' + (Join-Path $console 'dist') + '"'),
    '--smoke', ('"' + $smoke + '"'),
    '--port', [string]$Port
) -PassThru -WindowStyle Hidden

try {
    $ready = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        try {
            Invoke-RestMethod -Uri ($endpoint + '/health') -TimeoutSec 2 | Out-Null
            $ready = $true
            break
        } catch { Start-Sleep -Milliseconds 250 }
    }
    if (-not $ready) { throw 'Console API did not become ready.' }
    $env:EXOTIC_CONSOLE_ENDPOINT = $endpoint
    if ($SkipSimulation) { $env:EXOTIC_SKIP_SIMULATION = '1' }
    Push-Location $console
    try {
        & npm.cmd run verify:controls
        if ($LASTEXITCODE -ne 0) { throw 'Live control verification failed.' }
        & npm.cmd run verify:live
        if ($LASTEXITCODE -ne 0) { throw 'Live page verification failed.' }
    } finally { Pop-Location }
    Write-Host 'result=PASS'
} finally {
    if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    if ($restartRuntimeService) {
        Start-Service -Name 'EXOTIC'
        (Get-Service -Name 'EXOTIC').WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
    }
}
