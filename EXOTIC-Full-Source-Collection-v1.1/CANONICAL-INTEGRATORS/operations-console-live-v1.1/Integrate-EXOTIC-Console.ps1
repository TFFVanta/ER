[CmdletBinding()]
param(
    [string]$Workspace = 'C:\Projects\Exotic',
    [switch]$BootstrapVcpkg,
    [switch]$CleanConfigure,
    [switch]$SkipTests,
    [switch]$SkipPackage,
    [switch]$NoLaunch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PayloadConsole = Join-Path $PackageRoot 'payload\operations-console'
$PayloadApi = Join-Path $PackageRoot 'payload\runtime-console-api'
$Workspace = [System.IO.Path]::GetFullPath($Workspace)
$ConsoleRoot = Join-Path $Workspace 'console\operations-v1.1'
$BuildRoot = Join-Path $Workspace 'out\build\console-v1.1'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupRoot = Join-Path $Workspace ".exotic\integration-backups\console-v1.1-$Timestamp"
$ReportRoot = Join-Path $Workspace ".exotic\reports\console-v1.1-$Timestamp"
$ManifestPath = Join-Path $BackupRoot 'manifest.json'
$RootCMake = Join-Path $Workspace 'CMakeLists.txt'
$MarkerStart = '# BEGIN EXOTIC OPERATIONS CONSOLE V1.1'
$MarkerEnd = '# END EXOTIC OPERATIONS CONSOLE V1.1'
$CMakeBlock = @"
$MarkerStart
if(EXISTS "`${CMAKE_CURRENT_SOURCE_DIR}/cmake/EXOTIC_OPERATIONS_CONSOLE.cmake")
    include(cmake/EXOTIC_OPERATIONS_CONSOLE.cmake)
endif()
$MarkerEnd
"@

New-Item -ItemType Directory -Force -Path $BackupRoot, $ReportRoot | Out-Null
$LogPath = Join-Path $ReportRoot 'integration.log'
$SummaryPath = Join-Path $ReportRoot 'summary.txt'
$ManifestEntries = New-Object System.Collections.ArrayList

function Write-Step([string]$Message) {
    $line = '[EXOTIC] ' + $Message
    Write-Host $line -ForegroundColor Cyan
    Add-Content -LiteralPath $LogPath -Value $line
}

function Write-Result([string]$Name, [string]$Value) {
    $line = $Name + '=' + $Value
    Write-Host $line
    Add-Content -LiteralPath $SummaryPath -Value $line
}

function Invoke-Native([string]$FilePath, [string[]]$Arguments) {
    Write-Step ("RUN " + $FilePath + ' ' + ($Arguments -join ' '))
    & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $LogPath -Append
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE"
    }
}

function Get-HashOrEmpty([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Add-ManifestEntry([string]$Destination, [bool]$Existed, [string]$Backup, [string]$InstalledHash) {
    [void]$ManifestEntries.Add([pscustomobject]@{
        destination = $Destination
        existed = $Existed
        backup = $Backup
        installedHash = $InstalledHash
    })
}

function Save-Manifest {
    $manifestObject = [pscustomobject]@{
        version = '1.1.0'
        workspace = $Workspace
        installedAt = (Get-Date).ToString('o')
        markerStart = $MarkerStart
        markerEnd = $MarkerEnd
        cmakeBlock = $CMakeBlock
        files = @($ManifestEntries)
    }
    $manifestObject | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
    $latest = Join-Path $Workspace '.exotic\integration-backups\console-v1.1-latest.txt'
    Set-Content -LiteralPath $latest -Value $ManifestPath -Encoding UTF8
}

function Install-File([string]$Source, [string]$Destination) {
    $parent = Split-Path -Parent $Destination
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $sourceHash = Get-HashOrEmpty $Source
    $existingHash = Get-HashOrEmpty $Destination
    if ($sourceHash -eq $existingHash -and $sourceHash -ne '') { return }

    $existed = Test-Path -LiteralPath $Destination -PathType Leaf
    $backup = ''
    if ($existed) {
        $relative = $Destination.Substring($Workspace.Length).TrimStart('\')
        $backup = Join-Path $BackupRoot ('files\' + $relative)
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
        Copy-Item -LiteralPath $Destination -Destination $backup -Force
    }
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
    Add-ManifestEntry $Destination $existed $backup (Get-HashOrEmpty $Destination)
}

function Install-Tree([string]$SourceRoot, [string]$DestinationRoot) {
    $sourceFull = [System.IO.Path]::GetFullPath($SourceRoot).TrimEnd('\')
    Get-ChildItem -LiteralPath $sourceFull -File -Recurse | ForEach-Object {
        $relative = $_.FullName.Substring($sourceFull.Length).TrimStart('\')
        Install-File $_.FullName (Join-Path $DestinationRoot $relative)
    }
}

function Find-Executable([string]$Root, [string]$Name) {
    $match = Get-ChildItem -LiteralPath $Root -Filter $Name -File -Recurse -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($null -eq $match) { return $null }
    return $match.FullName
}

function Get-CMakeGenerator {
    $help = (& cmake --help 2>&1 | Out-String)
    foreach ($candidate in @('Visual Studio 18 2026', 'Visual Studio 17 2022', 'Visual Studio 16 2019')) {
        if ($help -match [regex]::Escape($candidate)) { return $candidate }
    }
    throw 'No supported Visual Studio CMake generator was found. Install Visual Studio with Desktop development with C++.'
}

function Find-Vcpkg {
    $candidates = New-Object System.Collections.ArrayList
    if ($env:VCPKG_ROOT) { [void]$candidates.Add((Join-Path $env:VCPKG_ROOT 'vcpkg.exe')) }
    [void]$candidates.Add('C:\vcpkg\vcpkg.exe')
    [void]$candidates.Add((Join-Path $Workspace '.tools\vcpkg\vcpkg.exe'))
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
    }
    return $null
}

function Wait-Api([string]$Endpoint, [int]$Seconds = 45) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-RestMethod -Uri ($Endpoint + '/health') -Method Get -TimeoutSec 2
            if ($null -ne $response) { return $true }
        } catch {
            Start-Sleep -Milliseconds 300
        }
    }
    return $false
}

try {
    Write-Step 'Validating workspace and prerequisites'
    if (-not (Test-Path -LiteralPath $Workspace -PathType Container)) { throw "Workspace not found: $Workspace" }
    if (-not (Test-Path -LiteralPath $RootCMake -PathType Leaf)) { throw "Root CMakeLists.txt not found: $RootCMake" }
    if (-not (Test-Path -LiteralPath $PayloadConsole -PathType Container)) { throw 'Console payload is missing.' }
    if (-not (Test-Path -LiteralPath $PayloadApi -PathType Container)) { throw 'Runtime API payload is missing.' }
    foreach ($command in @('cmake', 'node', 'npm')) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command is required but was not found in PATH." }
    }
    $nodeText = (& node --version).Trim().TrimStart('v')
    $nodeMajor = [int]($nodeText.Split('.')[0])
    if ($nodeMajor -lt 22) { throw "Node.js 22 or later is required. Found $nodeText." }

    Write-Step 'Installing versioned console and API files with collision backups'
    Install-Tree $PayloadConsole $ConsoleRoot
    Install-Tree (Join-Path $PayloadApi 'src') (Join-Path $Workspace 'src')
    Install-Tree (Join-Path $PayloadApi 'apps') (Join-Path $Workspace 'apps')
    Install-Tree (Join-Path $PayloadApi 'cmake') (Join-Path $Workspace 'cmake')

    Write-Step 'Wiring the console API into root CMake without touching unrelated blocks'
    $cmakeText = Get-Content -LiteralPath $RootCMake -Raw
    $pattern = '(?ms)^' + [regex]::Escape($MarkerStart) + '.*?^' + [regex]::Escape($MarkerEnd) + '\s*'
    if ($cmakeText -match $pattern) {
        $blockRegex = New-Object System.Text.RegularExpressions.Regex($pattern)
        $updated = $blockRegex.Replace($cmakeText, $CMakeBlock + [Environment]::NewLine, 1)
    } else {
        $updated = $cmakeText.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $CMakeBlock + [Environment]::NewLine
    }
    if ($updated -ne $cmakeText) {
        $backup = Join-Path $BackupRoot 'root-CMakeLists.txt.before'
        Copy-Item -LiteralPath $RootCMake -Destination $backup -Force
        Set-Content -LiteralPath $RootCMake -Value $updated -Encoding UTF8
        Add-ManifestEntry $RootCMake $true $backup (Get-HashOrEmpty $RootCMake)
    }
    Save-Manifest

    Write-Step 'Preparing SQLite dependency'
    $vcpkg = Find-Vcpkg
    if (-not $vcpkg -and $BootstrapVcpkg) {
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Git is required to bootstrap vcpkg.' }
        $vcpkgRoot = Join-Path $Workspace '.tools\vcpkg'
        if (-not (Test-Path -LiteralPath $vcpkgRoot -PathType Container)) {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $vcpkgRoot) | Out-Null
            Invoke-Native 'git' @('clone', 'https://github.com/microsoft/vcpkg.git', $vcpkgRoot)
        }
        Invoke-Native (Join-Path $vcpkgRoot 'bootstrap-vcpkg.bat') @('-disableMetrics')
        $vcpkg = Join-Path $vcpkgRoot 'vcpkg.exe'
    }
    $toolchain = $null
    if ($vcpkg) {
        Invoke-Native $vcpkg @('install', 'sqlite3:x64-windows')
        $toolchain = Join-Path (Split-Path -Parent $vcpkg) 'scripts\buildsystems\vcpkg.cmake'
    }

    if ($CleanConfigure -and (Test-Path -LiteralPath $BuildRoot -PathType Container)) {
        $rotated = $BuildRoot + '.previous-' + $Timestamp
        Write-Step "Rotating previous console build to $rotated"
        Move-Item -LiteralPath $BuildRoot -Destination $rotated
    }
    New-Item -ItemType Directory -Force -Path $BuildRoot | Out-Null

    $generator = Get-CMakeGenerator
    $configure = @(
        '-S', $Workspace,
        '-B', $BuildRoot,
        '-G', $generator,
        '-A', 'x64',
        '-DEXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=ON',
        '-DEXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE=ON',
        '-DEXOTIC_RUNTIME_BUILD_CLI=ON',
        '-DEXOTIC_OPERATIONS_CONSOLE_BUILD_API=ON'
    )
    if ($toolchain) { $configure += ('-DCMAKE_TOOLCHAIN_FILE=' + $toolchain) }

    Write-Step 'Configuring and compiling the integrated C++ runtime adapter with MSVC'
    Invoke-Native 'cmake' $configure
    Invoke-Native 'cmake' @('--build', $BuildRoot, '--config', 'Release', '--parallel')

    if (-not $SkipTests) {
        Write-Step 'Running complete CTest suite'
        Invoke-Native 'ctest' @('--test-dir', $BuildRoot, '-C', 'Release', '--output-on-failure')
        Write-Result 'tests' 'PASS'
    } else {
        Write-Result 'tests' 'SKIPPED'
    }

    $apiExe = Find-Executable $BuildRoot 'exotic-console-api.exe'
    $smokeExe = Find-Executable $BuildRoot 'exotic-runtime-smoke.exe'
    if (-not $apiExe) { throw 'exotic-console-api.exe was not produced.' }
    if (-not $smokeExe) { throw 'exotic-runtime-smoke.exe was not produced.' }
    $nativeRoot = Join-Path $ConsoleRoot 'native'
    New-Item -ItemType Directory -Force -Path $nativeRoot | Out-Null
    Install-File $apiExe (Join-Path $nativeRoot 'exotic-console-api.exe')
    Install-File $smokeExe (Join-Path $nativeRoot 'exotic-runtime-smoke.exe')
    Save-Manifest
    Write-Result 'cpp_adapter' 'PASS'

    Write-Step 'Installing Electron dependencies and validating frontend assets'
    Push-Location $ConsoleRoot
    try {
        try {
            Invoke-Native 'npm.cmd' @('install', '--no-audit', '--no-fund')
        } catch {
            $nodeModules = Join-Path $ConsoleRoot 'node_modules'
            if (Test-Path -LiteralPath $nodeModules) {
                $stale = Join-Path $ConsoleRoot ('node_modules.stale-' + $Timestamp)
                Move-Item -LiteralPath $nodeModules -Destination $stale
                Write-Step "Moved stale node_modules to $stale"
            }
            Invoke-Native 'npm.cmd' @('install', '--no-audit', '--no-fund')
        }
        Invoke-Native 'npm.cmd' @('run', 'verify')
    } finally {
        Pop-Location
    }
    Write-Result 'frontend_assets' 'PASS'

    Write-Step 'Launching isolated local API verification on port 8791'
    $restartRuntimeService = $false
    $runtimeService = Get-Service -Name 'EXOTIC' -ErrorAction SilentlyContinue
    if ($runtimeService -and $runtimeService.Status -eq 'Running') {
        Write-Step 'Temporarily stopping the EXOTIC Windows service so the simulation can acquire the workspace lease'
        Stop-Service -Name 'EXOTIC' -ErrorAction Stop
        $runtimeService.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(30))
        $restartRuntimeService = $true
    }
    $apiStdout = Join-Path $ReportRoot 'console-api.stdout.log'
    $apiStderr = Join-Path $ReportRoot 'console-api.stderr.log'
    $apiArguments = @(
        '--workspace', ('"' + $Workspace + '"'),
        '--assets', ('"' + (Join-Path $ConsoleRoot 'dist') + '"'),
        '--smoke', ('"' + $smokeExe + '"'),
        '--port', '8791'
    )
    $apiProcess = $null
    $apiProcess = Start-Process -FilePath $apiExe -ArgumentList $apiArguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $apiStdout -RedirectStandardError $apiStderr
    try {
        $endpoint = 'http://127.0.0.1:8791/api/v1'
        if (-not (Wait-Api $endpoint 45)) { throw 'The local console API did not become healthy on port 8791.' }
        $oldEndpoint = $env:EXOTIC_CONSOLE_ENDPOINT
        $env:EXOTIC_CONSOLE_ENDPOINT = $endpoint
        Push-Location $ConsoleRoot
        try {
            Invoke-Native 'npm.cmd' @('run', 'verify:controls')
            Invoke-Native 'npm.cmd' @('run', 'verify:live')
        } finally {
            Pop-Location
            $env:EXOTIC_CONSOLE_ENDPOINT = $oldEndpoint
        }
    } finally {
        if ($apiProcess -and -not $apiProcess.HasExited) {
            Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
        }
        if ($restartRuntimeService) {
            Write-Step 'Restarting the EXOTIC Windows service after simulation verification'
            Start-Service -Name 'EXOTIC'
            (Get-Service -Name 'EXOTIC').WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
        }
    }
    Write-Result 'live_api' 'PASS'
    Write-Result 'live_controls' 'PASS'
    Write-Result 'all_pages' 'PASS'

    $desktopExe = $null
    if (-not $SkipPackage) {
        Write-Step 'Building unsigned Windows installer and portable desktop executable'
        Push-Location $ConsoleRoot
        try { Invoke-Native 'npm.cmd' @('run', 'package:win') }
        finally { Pop-Location }
        $releaseRoot = Join-Path $ConsoleRoot 'release'
        $desktopExe = Get-ChildItem -LiteralPath $releaseRoot -Filter '*.exe' -File -Recurse -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch 'Setup|Uninstall' } |
            Sort-Object Length -Descending |
            Select-Object -First 1
        if (-not $desktopExe) {
            $desktopExe = Get-ChildItem -LiteralPath $releaseRoot -Filter '*.exe' -File -Recurse -ErrorAction SilentlyContinue |
                Sort-Object Length -Descending |
                Select-Object -First 1
        }
        if (-not $desktopExe) { throw 'Electron Builder completed but no Windows executable was found.' }
        Write-Result 'desktop_package' 'PASS'
        Write-Result 'desktop_executable' $desktopExe.FullName
    } else {
        Write-Result 'desktop_package' 'SKIPPED'
    }

    if (-not $NoLaunch) {
        Write-Step 'Launching EXOTIC Operations Console in Live mode'
        $env:EXOTIC_WORKSPACE = $Workspace
        if ($desktopExe) {
            Start-Process -FilePath $desktopExe.FullName | Out-Null
        } else {
            Start-Process -FilePath 'npm.cmd' -ArgumentList @('run', 'desktop') -WorkingDirectory $ConsoleRoot | Out-Null
        }
        Write-Result 'launch' 'STARTED'
    } else {
        Write-Result 'launch' 'SKIPPED'
    }

    Save-Manifest
    Write-Result 'workspace' $Workspace
    Write-Result 'console_root' $ConsoleRoot
    Write-Result 'build_root' $BuildRoot
    Write-Result 'backup_manifest' $ManifestPath
    Write-Result 'result' 'PASS'
    Write-Host "`nEXOTIC Operations Console integration completed." -ForegroundColor Green
    Write-Host "Report: $SummaryPath"
} catch {
    Write-Result 'result' 'FAIL'
    Write-Result 'error' $_.Exception.Message
    Write-Host "`nEXOTIC console integration failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Log: $LogPath"
    exit 1
}
