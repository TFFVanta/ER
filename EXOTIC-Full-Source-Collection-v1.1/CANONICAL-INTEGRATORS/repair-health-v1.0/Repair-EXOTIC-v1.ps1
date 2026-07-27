[CmdletBinding()]
param(
    [string]$Workspace = "C:\Projects\Exotic",
    [ValidateSet("Debug", "Release", "RelWithDebInfo")]
    [string]$Configuration = "Release",
    [string]$VcpkgRoot = "",
    [switch]$BootstrapVcpkg,
    [switch]$CleanConfigure,
    [switch]$InstallOrRepairService,
    [switch]$SkipTests,
    [switch]$SkipSimulation
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-FullPath([string]$Path) {
    return [System.IO.Path]::GetFullPath($Path)
}

function Get-RelativePathCompat([string]$BasePath, [string]$TargetPath) {
    $base = New-Object System.Uri((Get-FullPath($BasePath).TrimEnd('\') + '\'))
    $target = New-Object System.Uri((Get-FullPath($TargetPath)))
    $relative = $base.MakeRelativeUri($target).ToString()
    return [System.Uri]::UnescapeDataString($relative).Replace('/', '\')
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-NativeLogged {
    param(
        [Parameter(Mandatory=$true)][string]$FilePath,
        [Parameter(Mandatory=$true)][string[]]$Arguments,
        [Parameter(Mandatory=$true)][string]$LogPath,
        [string]$WorkingDirectory = ""
    )

    $oldLocation = Get-Location
    try {
        if ($WorkingDirectory) { Set-Location -LiteralPath $WorkingDirectory }
        & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $LogPath
        $exitCode = $LASTEXITCODE
    }
    finally {
        Set-Location $oldLocation
    }
    if ($exitCode -ne 0) {
        throw "$FilePath failed with exit code $exitCode. See $LogPath"
    }
}

function Find-LatestFile([string]$Root, [string]$Pattern) {
    if (!(Test-Path -LiteralPath $Root)) { return $null }
    return Get-ChildItem -LiteralPath $Root -File -Filter $Pattern -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

function Find-VSGenerator {
    $vswhereCandidates = @(
        "$env:ProgramFiles(x86)\Microsoft Visual Studio\Installer\vswhere.exe",
        "$env:ProgramFiles\Microsoft Visual Studio\Installer\vswhere.exe"
    )
    foreach ($candidate in $vswhereCandidates) {
        if (!(Test-Path -LiteralPath $candidate)) { continue }
        $version = & $candidate -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationVersion
        if ($LASTEXITCODE -eq 0 -and $version) {
            $major = [int](($version | Select-Object -First 1).Split('.')[0])
            if ($major -ge 17) { return "Visual Studio 17 2022" }
            if ($major -eq 16) { return "Visual Studio 16 2019" }
        }
    }
    return "Visual Studio 17 2022"
}

function Ensure-RootCMakeIntegration([string]$RootCMake, [string]$BackupDirectory) {
    $text = Get-Content -LiteralPath $RootCMake -Raw
    if ($text -match 'BEGIN EXOTIC CONTINUOUS OPERATIONS V1') { return $false }

    $backup = Join-Path $BackupDirectory "CMakeLists.txt"
    Copy-Item -LiteralPath $RootCMake -Destination $backup -Force
    $block = @'

# BEGIN EXOTIC CONTINUOUS OPERATIONS V1
# Runtime modules are guarded to preserve existing targets.
enable_testing()
if(NOT TARGET exotic_autonomy)
  include(cmake/EXOTIC_AUTONOMY.cmake)
endif()
if(NOT TARGET exotic_scheduler)
  include(cmake/EXOTIC_SCHEDULER.cmake)
endif()
if(NOT TARGET exotic_governance)
  include(cmake/EXOTIC_GOVERNANCE.cmake)
endif()
if(NOT TARGET exotic_resources)
  include(cmake/EXOTIC_RESOURCES.cmake)
endif()
if(NOT TARGET exotic_agents)
  include(cmake/EXOTIC_AGENTS.cmake)
endif()
if(NOT TARGET exotic_continuous_operations)
  include(cmake/EXOTIC_CONTINUOUS_OPERATIONS.cmake)
endif()
# END EXOTIC CONTINUOUS OPERATIONS V1
'@
    Add-Content -LiteralPath $RootCMake -Value $block -Encoding UTF8
    return $true
}

function Find-Binary([string]$BuildDirectory, [string]$Name, [string]$ConfigurationName) {
    $candidates = @(
        (Join-Path (Join-Path $BuildDirectory $ConfigurationName) $Name),
        (Join-Path $BuildDirectory $Name)
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    $found = Get-ChildItem -LiteralPath $BuildDirectory -Recurse -File -Filter $Name -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}

function Ensure-ServiceInstaller([string]$WorkspaceRoot, [string]$ServiceExecutable) {
    $scripts = Join-Path $WorkspaceRoot "scripts"
    New-Item -ItemType Directory -Force -Path $scripts | Out-Null
    $path = Join-Path $scripts "install-service-v1-repair.ps1"
    $escapedExe = $ServiceExecutable.Replace("'", "''")
    $escapedWorkspace = $WorkspaceRoot.Replace("'", "''")
    $content = @"
[CmdletBinding()]
param([string]`$Workspace = '$escapedWorkspace')
`$ErrorActionPreference = 'Stop'
`$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
`$principal = New-Object Security.Principal.WindowsPrincipal(`$identity)
if (!`$principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script from PowerShell as Administrator.'
}
`$exe = '$escapedExe'
if (!(Test-Path -LiteralPath `$exe)) { throw "Service executable not found: `$exe" }
`$binaryPath = '"' + `$exe + '" --service --workspace "' + `$Workspace + '"'
`$existing = Get-Service -Name EXOTIC -ErrorAction SilentlyContinue
if (`$existing) {
    if (`$existing.Status -ne 'Stopped') {
        Stop-Service -Name EXOTIC -Force -ErrorAction SilentlyContinue
        `$existing.WaitForStatus('Stopped', [TimeSpan]::FromSeconds(20))
    }
    sc.exe delete EXOTIC | Out-Null
    Start-Sleep -Seconds 2
}
New-Service -Name EXOTIC -BinaryPathName `$binaryPath -DisplayName 'EXOTIC Continuous Operations' -Description 'EXOTIC controlled 24/7 continuous operations runtime' -StartupType Automatic | Out-Null
sc.exe failure EXOTIC reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Null
Start-Service -Name EXOTIC
(Get-Service -Name EXOTIC).WaitForStatus('Running', [TimeSpan]::FromSeconds(30))
Get-Service -Name EXOTIC | Format-List Name,DisplayName,Status,StartType
"@
    Set-Content -LiteralPath $path -Value $content -Encoding UTF8
    return $path
}

$Workspace = Get-FullPath($Workspace)
if (!(Test-Path -LiteralPath $Workspace)) { throw "Workspace not found: $Workspace" }
$RootCMake = Join-Path $Workspace "CMakeLists.txt"
if (!(Test-Path -LiteralPath $RootCMake)) { throw "Root CMakeLists.txt not found: $RootCMake" }
if (!(Get-Command cmake -ErrorAction SilentlyContinue)) { throw "CMake is not available in PATH." }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$state = Join-Path $Workspace ".exotic"
$reportRoot = Join-Path $state "reports"
$backupRoot = Join-Path $state "repair-backups\v1.0-$timestamp"
$logRoot = Join-Path $reportRoot "repair-$timestamp"
New-Item -ItemType Directory -Force -Path $reportRoot, $backupRoot, $logRoot | Out-Null
$summaryPath = Join-Path $reportRoot "v1-repair-$timestamp.txt"

$summary = New-Object System.Collections.Generic.List[string]
$summary.Add("EXOTIC v1.0 repair and health check")
$summary.Add("started=$(Get-Date -Format o)")
$summary.Add("workspace=$Workspace")
$summary.Add("powershell=$($PSVersionTable.PSVersion)")

try {
    Write-Step "Reviewing existing integration reports"
    $latestReport = Find-LatestFile $reportRoot "v1-integration-*.txt"
    $latestLog = Find-LatestFile $reportRoot "v1-integration-*.log"
    if ($latestReport) {
        Copy-Item -LiteralPath $latestReport.FullName -Destination (Join-Path $logRoot $latestReport.Name) -Force
        $summary.Add("input_report=$($latestReport.FullName)")
    } else { $summary.Add("input_report=not_found") }
    if ($latestLog) {
        Copy-Item -LiteralPath $latestLog.FullName -Destination (Join-Path $logRoot $latestLog.Name) -Force
        $summary.Add("input_log=$($latestLog.FullName)")
    } else { $summary.Add("input_log=not_found") }

    Write-Step "Checking required integration files"
    $required = @(
        "cmake\EXOTIC_AUTONOMY.cmake",
        "cmake\EXOTIC_SCHEDULER.cmake",
        "cmake\EXOTIC_GOVERNANCE.cmake",
        "cmake\EXOTIC_RESOURCES.cmake",
        "cmake\EXOTIC_AGENTS.cmake",
        "cmake\EXOTIC_CONTINUOUS_OPERATIONS.cmake",
        "src\exotic\runtime\full_stack_bootstrap.cpp",
        "apps\exotic_runtime_smoke_main.cpp"
    )
    $missing = New-Object System.Collections.Generic.List[string]
    foreach ($relative in $required) {
        if (!(Test-Path -LiteralPath (Join-Path $Workspace $relative))) { $missing.Add($relative) }
    }
    if ($missing.Count -gt 0) {
        $summary.Add("required_files=missing")
        foreach ($item in $missing) { $summary.Add("missing=$item") }
        throw "The v1.0 integration is incomplete. Missing files: $($missing -join ', '). Re-run the live integrator first."
    }
    $summary.Add("required_files=present")

    Write-Step "Repairing root CMake wiring without replacing unrelated content"
    $cmakeChanged = Ensure-RootCMakeIntegration $RootCMake $backupRoot
    $summary.Add("root_cmake_changed=$cmakeChanged")

    Write-Step "Locating Visual Studio and vcpkg"
    $generator = Find-VSGenerator
    $summary.Add("cmake_generator=$generator")
    if ([string]::IsNullOrWhiteSpace($VcpkgRoot)) {
        if ($env:VCPKG_ROOT) { $VcpkgRoot = $env:VCPKG_ROOT }
        elseif (Test-Path "C:\vcpkg\scripts\buildsystems\vcpkg.cmake") { $VcpkgRoot = "C:\vcpkg" }
        else { $VcpkgRoot = Join-Path $state "tools\vcpkg" }
    }
    $VcpkgRoot = Get-FullPath($VcpkgRoot)
    $toolchain = Join-Path $VcpkgRoot "scripts\buildsystems\vcpkg.cmake"
    if (!(Test-Path -LiteralPath $toolchain)) {
        if (!$BootstrapVcpkg) { throw "vcpkg not found at $VcpkgRoot. Re-run with -BootstrapVcpkg." }
        if (!(Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is required to bootstrap vcpkg." }
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $VcpkgRoot) | Out-Null
        Invoke-NativeLogged "git" @("clone", "https://github.com/microsoft/vcpkg.git", $VcpkgRoot) (Join-Path $logRoot "vcpkg-clone.log")
        Invoke-NativeLogged (Join-Path $VcpkgRoot "bootstrap-vcpkg.bat") @("-disableMetrics") (Join-Path $logRoot "vcpkg-bootstrap.log")
    }
    $vcpkgExe = Join-Path $VcpkgRoot "vcpkg.exe"
    if (!(Test-Path -LiteralPath $vcpkgExe)) {
        Invoke-NativeLogged (Join-Path $VcpkgRoot "bootstrap-vcpkg.bat") @("-disableMetrics") (Join-Path $logRoot "vcpkg-bootstrap.log")
    }
    Invoke-NativeLogged $vcpkgExe @("install", "sqlite3:x64-windows") (Join-Path $logRoot "vcpkg-sqlite.log")
    $summary.Add("vcpkg=$VcpkgRoot")

    Write-Step "Preparing a clean, generator-compatible build directory"
    $buildDir = Join-Path $Workspace ("out\build\x64-" + $Configuration)
    $cache = Join-Path $buildDir "CMakeCache.txt"
    $mustRotate = $CleanConfigure.IsPresent
    if (Test-Path -LiteralPath $cache) {
        $cacheText = Get-Content -LiteralPath $cache -Raw
        if ($cacheText -notmatch [regex]::Escape("CMAKE_GENERATOR:INTERNAL=$generator")) { $mustRotate = $true }
        if ($cacheText -match 'CMAKE_TOOLCHAIN_FILE:FILEPATH=(.+)' -and $Matches[1].Trim() -ne $toolchain) { $mustRotate = $true }
    }
    if ($mustRotate -and (Test-Path -LiteralPath $buildDir)) {
        $rotated = "$buildDir.pre-repair-$timestamp"
        Move-Item -LiteralPath $buildDir -Destination $rotated
        $summary.Add("rotated_build=$rotated")
    }
    New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

    Write-Step "Configuring CMake"
    $configureArgs = @(
        "-S", ".",
        "-B", $buildDir,
        "-G", $generator,
        "-A", "x64",
        "-DCMAKE_TOOLCHAIN_FILE=$toolchain",
        "-DEXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=ON",
        "-DEXOTIC_RUNTIME_BUILD_CLI=ON",
        "-DEXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE=ON",
        "-DEXOTIC_RUNTIME_BUILD_SMOKE=ON"
    )
    Invoke-NativeLogged "cmake" $configureArgs (Join-Path $logRoot "cmake-configure.log") $Workspace

    Write-Step "Building with MSVC"
    Invoke-NativeLogged "cmake" @("--build", $buildDir, "--config", $Configuration, "--parallel") (Join-Path $logRoot "cmake-build.log") $Workspace
    $summary.Add("build=PASS")

    if (!$SkipTests) {
        Write-Step "Running the complete CTest suite"
        Invoke-NativeLogged "ctest" @("--test-dir", $buildDir, "-C", $Configuration, "--output-on-failure") (Join-Path $logRoot "ctest.log") $Workspace
        $summary.Add("tests=PASS")
    } else { $summary.Add("tests=SKIPPED") }

    $serviceExe = Find-Binary $buildDir "exotic-runtime-service.exe" $Configuration
    $runtimeCli = Find-Binary $buildDir "exotic-runtime-cli.exe" $Configuration
    $smokeExe = Find-Binary $buildDir "exotic-runtime-smoke.exe" $Configuration
    $exoticExe = Find-Binary $buildDir "exotic.exe" $Configuration
    if (!$serviceExe) { throw "exotic-runtime-service.exe was not produced." }
    if (!$runtimeCli) { throw "exotic-runtime-cli.exe was not produced." }
    if (!$smokeExe -and !$SkipSimulation) { throw "exotic-runtime-smoke.exe was not produced." }
    $summary.Add("service_exe=$serviceExe")
    $summary.Add("runtime_cli=$runtimeCli")
    if ($exoticExe) { $summary.Add("main_cli=$exoticExe") }

    $simulationWorkspace = Join-Path $state ("repair-simulation\" + $timestamp)
    if (!$SkipSimulation) {
        Write-Step "Running the complete Objective-to-Verification simulation"
        Invoke-NativeLogged $smokeExe @("--workspace", $simulationWorkspace) (Join-Path $logRoot "simulation.log")
        $summary.Add("simulation=PASS")

        $verificationReport = Join-Path $simulationWorkspace ".exotic\reports\v1-simulation-verification.txt"
        if (!(Test-Path -LiteralPath $verificationReport)) { throw "Simulation verification report was not produced: $verificationReport" }
        $verificationText = Get-Content -LiteralPath $verificationReport -Raw
        foreach ($requiredLine in @(
            "approval=verified", "decision_evidence=verified", "assignment=verified",
            "reservation=verified", "usage=verified", "operation=verified",
            "verification=verified", "autonomy_audit=verified", "runtime_audit=verified",
            "trace=verified", "metrics=verified", "dashboard=verified", "result=PASS"
        )) {
            if ($verificationText -notmatch [regex]::Escape($requiredLine)) { throw "Simulation checkpoint missing: $requiredLine" }
        }
        Copy-Item -LiteralPath $verificationReport -Destination (Join-Path $logRoot "simulation-verification.txt") -Force
        $summary.Add("durable_records=PASS")

        Write-Step "Reading runtime status and dashboard"
        $statusLog = Join-Path $logRoot "runtime-status.log"
        if ($exoticExe) {
            $oldWorkspace = $env:EXOTIC_WORKSPACE
            try {
                $env:EXOTIC_WORKSPACE = $simulationWorkspace
                Invoke-NativeLogged $exoticExe @("runtime", "status") $statusLog
            } finally { $env:EXOTIC_WORKSPACE = $oldWorkspace }
        } else {
            Invoke-NativeLogged $runtimeCli @("--workspace", $simulationWorkspace, "status") $statusLog
        }
        $dashboardJson = Join-Path $simulationWorkspace ".exotic\dashboards\runtime-status.json"
        $dashboardText = Join-Path $simulationWorkspace ".exotic\dashboards\runtime-status.txt"
        if (!(Test-Path -LiteralPath $dashboardJson)) { throw "Dashboard JSON not found: $dashboardJson" }
        if (!(Test-Path -LiteralPath $dashboardText)) { throw "Dashboard text not found: $dashboardText" }
        Copy-Item -LiteralPath $dashboardJson -Destination (Join-Path $logRoot "runtime-status.json") -Force
        Copy-Item -LiteralPath $dashboardText -Destination (Join-Path $logRoot "runtime-status.txt") -Force
        $dashboard = Get-Content -LiteralPath $dashboardJson -Raw | ConvertFrom-Json
        $summary.Add("dashboard_running=$($dashboard.running)")
        $summary.Add("dashboard_mode=$($dashboard.mode)")
        $summary.Add("dashboard_emergency_stop=$($dashboard.emergency_stop)")
        $summary.Add("dashboard_active_alerts=$($dashboard.active_alerts)")
        foreach ($service in $dashboard.services) {
            $summary.Add("service=$($service.name)|$($service.state)|$($service.health)|$($service.message)")
        }
    } else { $summary.Add("simulation=SKIPPED") }

    $serviceInstaller = Ensure-ServiceInstaller $Workspace $serviceExe
    $summary.Add("service_installer=$serviceInstaller")

    if ($InstallOrRepairService) {
        Write-Step "Installing or repairing the Windows service"
        if (!(Test-IsAdministrator)) { throw "-InstallOrRepairService requires an Administrator PowerShell." }
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $serviceInstaller -Workspace $Workspace 2>&1 |
            Tee-Object -FilePath (Join-Path $logRoot "service-install.log")
        if ($LASTEXITCODE -ne 0) { throw "Windows service installation failed." }
        Start-Sleep -Seconds 3
        $service = Get-Service -Name EXOTIC -ErrorAction Stop
        $summary.Add("windows_service_status=$($service.Status)")
        $summary.Add("windows_service_start_type=$($service.StartType)")
        if ($service.Status -ne 'Running') { throw "EXOTIC service is not running." }
        & sc.exe queryex EXOTIC 2>&1 | Set-Content -LiteralPath (Join-Path $logRoot "service-query.txt") -Encoding UTF8
        $summary.Add("service_health=PASS")
    } else {
        $existingService = Get-Service -Name EXOTIC -ErrorAction SilentlyContinue
        if ($existingService) {
            $summary.Add("windows_service_status=$($existingService.Status)")
            $summary.Add("windows_service_start_type=$($existingService.StartType)")
            if ($existingService.Status -eq 'Running') { $summary.Add("service_health=PASS") }
            else { $summary.Add("service_health=NOT_RUNNING") }
        } else {
            $summary.Add("service_health=NOT_INSTALLED")
        }
    }

    $summary.Add("result=PASS")
}
catch {
    $summary.Add("result=FAIL")
    $summary.Add("error=$($_.Exception.Message)")
    throw
}
finally {
    $summary.Add("finished=$(Get-Date -Format o)")
    $summary | Set-Content -LiteralPath $summaryPath -Encoding UTF8
    Write-Host "`nReport: $summaryPath" -ForegroundColor Yellow
    Write-Host "Logs:   $logRoot" -ForegroundColor Yellow
}
