[CmdletBinding()]
param(
    [string]$Workspace = "C:\Projects\Exotic",
    [string]$Configuration = "Release",
    [string]$VcpkgRoot = "",
    [switch]$SkipTests,
    [switch]$SkipSimulation,
    [switch]$BootstrapVcpkg,
    [switch]$PreferBundleOnConflict
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-Hash([string]$Path) {
    if (!(Test-Path -LiteralPath $Path)) { return $null }
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PayloadRoot = Join-Path $PackageRoot "payload"
$BundleRoot = Join-Path $PayloadRoot "bundles"
$OverlayRoot = Join-Path $PayloadRoot "overlay"
$BaseV02Root = Join-Path $PayloadRoot "base-v0.2"
$BaselineV02Root = Join-Path $PayloadRoot "baseline-v0.2"

$Workspace = [IO.Path]::GetFullPath($Workspace)
if (!(Test-Path -LiteralPath $Workspace)) {
    throw "EXOTIC workspace not found: $Workspace"
}
if (!(Test-Path -LiteralPath (Join-Path $Workspace "CMakeLists.txt"))) {
    throw "CMakeLists.txt was not found at the workspace root: $Workspace"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$StateRoot = Join-Path $Workspace ".exotic"
$BackupRoot = Join-Path $StateRoot "integration-backups\v1.0-$Timestamp"
$ReportRoot = Join-Path $StateRoot "reports"
$TempRoot = Join-Path $env:TEMP "exotic-v1-integrator-$Timestamp"
New-Item -ItemType Directory -Force -Path $BackupRoot, $ReportRoot, $TempRoot | Out-Null

$LogPath = Join-Path $ReportRoot "v1-integration-$Timestamp.log"
$ReportPath = Join-Path $ReportRoot "v1-integration-$Timestamp.txt"
$Conflicts = [System.Collections.Generic.List[string]]::new()
$Changed = [System.Collections.Generic.List[string]]::new()
$Skipped = [System.Collections.Generic.List[string]]::new()
$DeferredPatchTargets = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

Start-Transcript -Path $LogPath -Force | Out-Null

function Backup-File([string]$Destination) {
    if (!(Test-Path -LiteralPath $Destination)) { return }
    $relative = [IO.Path]::GetRelativePath($Workspace, $Destination)
    $backup = Join-Path $BackupRoot $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -LiteralPath $Destination -Destination $backup -Force
}

function Copy-SafeFile([string]$Source, [string]$Destination, [string]$Label) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination) | Out-Null
    if (!(Test-Path -LiteralPath $Destination)) {
        Copy-Item -LiteralPath $Source -Destination $Destination
        $Changed.Add([IO.Path]::GetRelativePath($Workspace, $Destination))
        return
    }
    if ((Get-Hash $Source) -eq (Get-Hash $Destination)) {
        $Skipped.Add([IO.Path]::GetRelativePath($Workspace, $Destination))
        return
    }
    if ($DeferredPatchTargets.Contains([IO.Path]::GetFullPath($Destination))) {
        # A later three-way merge owns this file. Do not register a premature
        # conflict while copying the component's base tree.
        return
    }
    if ($PreferBundleOnConflict) {
        Backup-File $Destination
        Copy-Item -LiteralPath $Source -Destination $Destination -Force
        $Changed.Add([IO.Path]::GetRelativePath($Workspace, $Destination))
        return
    }
    $incoming = "$Destination.incoming-$Label"
    Copy-Item -LiteralPath $Source -Destination $incoming -Force
    $Conflicts.Add("Existing locally modified file preserved: $Destination (incoming copy: $incoming)")
}

function Copy-Tree([string]$SourceRoot, [string]$DestinationRoot, [string]$Label) {
    if (!(Test-Path -LiteralPath $SourceRoot)) { return }
    Get-ChildItem -LiteralPath $SourceRoot -Recurse -File | ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($SourceRoot, $_.FullName)
        Copy-SafeFile $_.FullName (Join-Path $DestinationRoot $relative) $Label
    }
}

function Copy-MissingTree([string]$SourceRoot, [string]$DestinationRoot) {
    if (!(Test-Path -LiteralPath $SourceRoot)) { return }
    Get-ChildItem -LiteralPath $SourceRoot -Recurse -File | ForEach-Object {
        $relative = [IO.Path]::GetRelativePath($SourceRoot, $_.FullName)
        $destination = Join-Path $DestinationRoot $relative
        if (!(Test-Path -LiteralPath $destination)) {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
            Copy-Item -LiteralPath $_.FullName -Destination $destination
            $Changed.Add([IO.Path]::GetRelativePath($Workspace, $destination))
        }
    }
}

function Merge-KnownFile(
    [string]$Current,
    [string]$Base,
    [string]$Incoming,
    [string]$Label
) {
    if (!(Test-Path -LiteralPath $Incoming)) { return }
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Current) | Out-Null
    if (!(Test-Path -LiteralPath $Current)) {
        Copy-Item -LiteralPath $Incoming -Destination $Current
        $Changed.Add([IO.Path]::GetRelativePath($Workspace, $Current))
        return
    }
    $currentHash = Get-Hash $Current
    if ($currentHash -eq (Get-Hash $Incoming)) {
        $Skipped.Add([IO.Path]::GetRelativePath($Workspace, $Current))
        return
    }
    if ((Test-Path -LiteralPath $Base) -and $currentHash -eq (Get-Hash $Base)) {
        Backup-File $Current
        Copy-Item -LiteralPath $Incoming -Destination $Current -Force
        $Changed.Add([IO.Path]::GetRelativePath($Workspace, $Current))
        return
    }

    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git -and (Test-Path -LiteralPath $Base)) {
        $mergeOut = Join-Path $TempRoot (([IO.Path]::GetFileName($Current)) + ".merged-" + [guid]::NewGuid().ToString("N"))
        $process = Start-Process -FilePath $git.Source -ArgumentList @(
            "merge-file", "-p", "--", $Current, $Base, $Incoming
        ) -NoNewWindow -Wait -PassThru -RedirectStandardOutput $mergeOut
        if ($process.ExitCode -eq 0) {
            Backup-File $Current
            Copy-Item -LiteralPath $mergeOut -Destination $Current -Force
            Remove-Item -LiteralPath $mergeOut -Force -ErrorAction SilentlyContinue
            $Changed.Add([IO.Path]::GetRelativePath($Workspace, $Current))
            return
        }
        $conflictCopy = "$Current.merge-conflict-$Label"
        Copy-Item -LiteralPath $mergeOut -Destination $conflictCopy -Force
        Remove-Item -LiteralPath $mergeOut -Force -ErrorAction SilentlyContinue
        $Conflicts.Add("Three-way merge conflict: $Current (review $conflictCopy)")
        return
    }

    if ($PreferBundleOnConflict) {
        Backup-File $Current
        Copy-Item -LiteralPath $Incoming -Destination $Current -Force
        $Changed.Add([IO.Path]::GetRelativePath($Workspace, $Current))
        return
    }

    $incomingCopy = "$Current.incoming-$Label"
    Copy-Item -LiteralPath $Incoming -Destination $incomingCopy -Force
    $Conflicts.Add("Could not safely merge $Current. Local file preserved; incoming copy: $incomingCopy")
}

function Expand-Bundle([string]$ZipName, [string]$Key) {
    $zip = Join-Path $BundleRoot $ZipName
    if (!(Test-Path -LiteralPath $zip)) { throw "Missing bundled archive: $zip" }
    $destination = Join-Path $TempRoot $Key
    Expand-Archive -LiteralPath $zip -DestinationPath $destination -Force
    $root = Get-ChildItem -LiteralPath $destination -Directory | Select-Object -First 1
    if (!$root) { throw "Archive has no root directory: $zip" }
    return $root.FullName
}

try {
    Write-Step "Snapshotting the live repository"
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Push-Location $Workspace
        try {
            git status --short | Out-File -FilePath (Join-Path $BackupRoot "git-status-before.txt") -Encoding utf8
            git diff --binary | Out-File -FilePath (Join-Path $BackupRoot "working-tree-before.patch") -Encoding utf8
        } finally { Pop-Location }
    }

    Write-Step "Expanding v0.3 through v1.0 bundles"
    $V03 = Expand-Bundle "EXOTIC-Event-Scheduler-Durable-Runtime-v0.3.zip" "v03"
    $V04 = Expand-Bundle "EXOTIC-Approval-Governance-Authority-Runtime-v0.4.zip" "v04"
    $V05 = Expand-Bundle "EXOTIC-Resource-Governor-Budget-Runtime-v0.5.zip" "v05"
    $V06 = Expand-Bundle "EXOTIC-Agent-Capability-Registry-Work-Allocation-Runtime-v0.6.zip" "v06"
    $V10 = Expand-Bundle "EXOTIC-Continuous-Operations-Runtime-v1.0.zip" "v10"

    # Files with known base and incoming versions are deferred to the
    # three-way merge stage instead of being treated as ordinary conflicts.
    foreach ($version in @("v0.3", "v0.4", "v0.5", "v0.6")) {
        $patchRoot = Join-Path $V10 ("patches\" + $version)
        if (!(Test-Path -LiteralPath $patchRoot)) { continue }
        Get-ChildItem -LiteralPath $patchRoot -Recurse -File | ForEach-Object {
            $srcMarker = [IO.Path]::DirectorySeparatorChar + "src" + [IO.Path]::DirectorySeparatorChar
            $position = $_.FullName.LastIndexOf($srcMarker)
            if ($position -ge 0) {
                $relative = $_.FullName.Substring($position + 1)
                [void]$DeferredPatchTargets.Add([IO.Path]::GetFullPath((Join-Path $Workspace $relative)))
            }
        }
    }
    foreach ($relative in @(
        "src\exotic\autonomy\persistence\database.hpp",
        "src\exotic\autonomy\persistence\database.cpp",
        "src\exotic\autonomy\persistence\transaction.hpp",
        "src\exotic\autonomy\persistence\transaction.cpp",
        "src\exotic\autonomy\autonomy_kernel.hpp",
        "src\exotic\autonomy\autonomy_kernel.cpp",
        "src\exotic\autonomy\scheduler\types.hpp",
        "src\exotic\runtime\config.hpp",
        "src\exotic\runtime\config.cpp",
        "src\exotic\runtime\full_stack_bootstrap.cpp",
        "cmake\EXOTIC_CONTINUOUS_OPERATIONS.cmake"
    )) {
        [void]$DeferredPatchTargets.Add([IO.Path]::GetFullPath((Join-Path $Workspace $relative)))
    }

    Write-Step "Filling any missing Autonomy v0.2 foundation files"
    Copy-MissingTree (Join-Path $BaselineV02Root "src") (Join-Path $Workspace "src")
    Copy-MissingTree (Join-Path $BaselineV02Root "tests") (Join-Path $Workspace "tests")
    Copy-MissingTree (Join-Path $BaselineV02Root "cmake") (Join-Path $Workspace "cmake")

    Write-Step "Merging new subsystem files without replacing unrelated local work"
    $componentTrees = @(
        [pscustomobject]@{ Root = $V03; Label = "v03" },
        [pscustomobject]@{ Root = $V04; Label = "v04" },
        [pscustomobject]@{ Root = $V05; Label = "v05" },
        [pscustomobject]@{ Root = $V06; Label = "v06" }
    )
    foreach ($entry in $componentTrees) {
        $root = $entry.Root; $label = $entry.Label
        Copy-Tree (Join-Path $root "src") (Join-Path $Workspace "src") $label
        Copy-Tree (Join-Path $root "tests") (Join-Path $Workspace "tests") $label
        Copy-Tree (Join-Path $root "cmake") (Join-Path $Workspace "cmake") $label
    }

    Copy-Tree (Join-Path $V10 "src") (Join-Path $Workspace "src") "v10"
    Copy-Tree (Join-Path $V10 "tests") (Join-Path $Workspace "tests") "v10"
    Copy-Tree (Join-Path $V10 "cmake") (Join-Path $Workspace "cmake") "v10"
    Copy-Tree (Join-Path $V10 "apps") (Join-Path $Workspace "apps") "v10"
    Copy-Tree (Join-Path $V10 "scripts") (Join-Path $Workspace "scripts") "v10"
    Copy-Tree (Join-Path $V10 "docs") (Join-Path $Workspace "docs\exotic-runtime-v1") "v10"
    Copy-Tree (Join-Path $PackageRoot "docs") (Join-Path $Workspace "docs\exotic-live-integration-v1") "live-integrator"

    Write-Step "Applying compatibility patches with three-way merging"
    foreach ($relative in @(
        "src\exotic\autonomy\persistence\database.hpp",
        "src\exotic\autonomy\persistence\database.cpp",
        "src\exotic\autonomy\persistence\transaction.hpp",
        "src\exotic\autonomy\persistence\transaction.cpp"
    )) {
        Merge-KnownFile `
            (Join-Path $Workspace $relative) `
            (Join-Path $BaseV02Root $relative) `
            (Join-Path $BaselineV02Root $relative) `
            "v02"
    }

    foreach ($relative in @(
        "src\exotic\autonomy\autonomy_kernel.hpp",
        "src\exotic\autonomy\autonomy_kernel.cpp"
    )) {
        Merge-KnownFile `
            (Join-Path $Workspace $relative) `
            (Join-Path $BaseV02Root $relative) `
            (Join-Path $BaselineV02Root $relative) `
            "v02-kernel"
    }

    foreach ($version in @("v0.3", "v0.4", "v0.5", "v0.6")) {
        $patchRoot = Join-Path $V10 ("patches\" + $version)
        if (!(Test-Path -LiteralPath $patchRoot)) { continue }
        Get-ChildItem -LiteralPath $patchRoot -Recurse -File | ForEach-Object {
            $srcMarker = [IO.Path]::DirectorySeparatorChar + "src" + [IO.Path]::DirectorySeparatorChar
            $position = $_.FullName.LastIndexOf($srcMarker)
            if ($position -ge 0) {
                $relative = $_.FullName.Substring($position + 1)
                $baseRoot = switch ($version) {
                    "v0.3" { $V03 }
                    "v0.4" { $V04 }
                    "v0.5" { $V05 }
                    "v0.6" { $V06 }
                }
                Merge-KnownFile `
                    (Join-Path $Workspace $relative) `
                    (Join-Path $baseRoot $relative) `
                    $_.FullName `
                    $version
            }
        }
    }

    Merge-KnownFile `
        (Join-Path $Workspace "src\exotic\autonomy\scheduler\types.hpp") `
        (Join-Path $V03 "src\exotic\autonomy\scheduler\types.hpp") `
        (Join-Path $OverlayRoot "src\exotic\autonomy\scheduler\types.hpp") `
        "scheduler-clock-compatibility"

    Write-Step "Updating v0.2 Autonomy IDs to durable atomic sequences"
    $autonomyRepo = Join-Path $Workspace "src\exotic\autonomy\persistence\sqlite_repository.cpp"
    if (!(Test-Path -LiteralPath $autonomyRepo)) {
        $Conflicts.Add("Required v0.2 file was not found: $autonomyRepo")
    } else {
        $source = Get-Content -LiteralPath $autonomyRepo -Raw
        $original = $source
        $replacements = @{
            'ObjectiveId\s+SqliteAutonomyRepository::next_objective_id\s*\(\s*\)\s*\{.*?\}' = 'ObjectiveId SqliteAutonomyRepository::next_objective_id() { return static_cast<ObjectiveId>(database_.next_sequence("autonomy.objectives")); }'
            'ProposalId\s+SqliteAutonomyRepository::next_proposal_id\s*\(\s*\)\s*\{.*?\}' = 'ProposalId SqliteAutonomyRepository::next_proposal_id() { return static_cast<ProposalId>(database_.next_sequence("autonomy.proposals")); }'
            'OperationId\s+SqliteAutonomyRepository::next_operation_id\s*\(\s*\)\s*\{.*?\}' = 'OperationId SqliteAutonomyRepository::next_operation_id() { return static_cast<OperationId>(database_.next_sequence("autonomy.operations")); }'
            'AuditEventId\s+SqliteAutonomyRepository::next_audit_event_id\s*\(\s*\)\s*\{.*?\}' = 'AuditEventId SqliteAutonomyRepository::next_audit_event_id() { return static_cast<AuditEventId>(database_.next_sequence("autonomy.audit_events")); }'
        }
        foreach ($pattern in $replacements.Keys) {
            $updated = [regex]::Replace(
                $source,
                $pattern,
                $replacements[$pattern],
                [Text.RegularExpressions.RegexOptions]::Singleline
            )
            if ($updated -eq $source -and $source -notmatch [regex]::Escape($replacements[$pattern])) {
                $Conflicts.Add("Could not locate an Autonomy ID method matching: $pattern")
            }
            $source = $updated
        }
        if ($source -ne $original) {
            Backup-File $autonomyRepo
            Set-Content -LiteralPath $autonomyRepo -Value $source -Encoding utf8
            $Changed.Add([IO.Path]::GetRelativePath($Workspace, $autonomyRepo))
        }
    }

    Write-Step "Applying the live-integration overlay"
    foreach ($relative in @(
        "src\exotic\runtime\config.hpp",
        "src\exotic\runtime\config.cpp",
        "src\exotic\runtime\full_stack_bootstrap.cpp"
    )) {
        Merge-KnownFile `
            (Join-Path $Workspace $relative) `
            (Join-Path $V10 $relative) `
            (Join-Path $OverlayRoot $relative) `
            "live-overlay"
    }
    Copy-SafeFile `
        (Join-Path $OverlayRoot "src\exotic\runtime\root_cli_bridge.hpp") `
        (Join-Path $Workspace "src\exotic\runtime\root_cli_bridge.hpp") `
        "live-overlay"
    Copy-SafeFile `
        (Join-Path $OverlayRoot "src\exotic\runtime\root_cli_bridge.cpp") `
        (Join-Path $Workspace "src\exotic\runtime\root_cli_bridge.cpp") `
        "live-overlay"
    Copy-SafeFile `
        (Join-Path $OverlayRoot "apps\exotic_runtime_smoke_main.cpp") `
        (Join-Path $Workspace "apps\exotic_runtime_smoke_main.cpp") `
        "live-overlay"
    Merge-KnownFile `
        (Join-Path $Workspace "cmake\EXOTIC_CONTINUOUS_OPERATIONS.cmake") `
        (Join-Path $V10 "cmake\EXOTIC_CONTINUOUS_OPERATIONS.cmake") `
        (Join-Path $OverlayRoot "EXOTIC_CONTINUOUS_OPERATIONS.cmake") `
        "live-overlay"

    Write-Step "Wiring the runtime CMake modules"
    $rootCmake = Join-Path $Workspace "CMakeLists.txt"
    $cmakeText = Get-Content -LiteralPath $rootCmake -Raw
    if ($cmakeText -notmatch 'BEGIN EXOTIC CONTINUOUS OPERATIONS V1') {
        Backup-File $rootCmake
        $block = @'

# BEGIN EXOTIC CONTINUOUS OPERATIONS V1
# Managed by EXOTIC-Live-Integrator-v1.0. Keep this block after the main
# exotic executable target so it can link the runtime control bridge.
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
        Add-Content -LiteralPath $rootCmake -Value $block -Encoding utf8
        $Changed.Add("CMakeLists.txt")
    }

    Write-Step "Wiring exotic runtime ... into the existing CLI"
    $candidateFiles = Get-ChildItem -LiteralPath $Workspace -Recurse -File -Filter *.cpp | Where-Object {
        $_.FullName -notmatch '\\out\\|\\\.git\\|exotic_runtime_.*_main\.cpp$' -and
        (Select-String -LiteralPath $_.FullName -Pattern 'int\s+main\s*\(' -Quiet) -and
        ((Select-String -LiteralPath $_.FullName -Pattern 'EXOTIC PLATFORM|Exotic CLI|command\s*==\s*"platform"|"platform"' -Quiet))
    } | Sort-Object { $_.FullName.Length }

    $cliMain = $candidateFiles | Select-Object -First 1
    if (!$cliMain) {
        $Conflicts.Add("Could not identify the existing exotic.exe main dispatcher. Standalone exotic-runtime-cli will still be built.")
    } else {
        $cliText = Get-Content -LiteralPath $cliMain.FullName -Raw
        $newText = $cliText
        if ($newText -notmatch 'exotic/runtime/root_cli_bridge.hpp') {
            $newText = "#include `"exotic/runtime/root_cli_bridge.hpp`"`r`n" + $newText
        }
        if ($newText -notmatch 'try_run_runtime_cli') {
            $mainPattern = 'int\s+main\s*\(\s*int\s+(?<argc>[A-Za-z_]\w*)\s*,\s*char\s*(?:\*\s*\*|\*\s*)(?<argv>[A-Za-z_]\w*)(?:\s*\[\s*\])?\s*\)\s*\{'
            $match = [regex]::Match($newText, $mainPattern, [Text.RegularExpressions.RegexOptions]::Singleline)
            if ($match.Success) {
                $argcName = $match.Groups['argc'].Value
                $argvName = $match.Groups['argv'].Value
                $insertion = $match.Value + "`r`n`r`n    if (const int runtime_result = exotic::runtime::try_run_runtime_cli($argcName, $argvName);`r`n        runtime_result != exotic::runtime::runtime_cli_not_handled) {`r`n        return runtime_result;`r`n    }`r`n"
                $newText = $newText.Substring(0, $match.Index) + $insertion + $newText.Substring($match.Index + $match.Length)
            } else {
                $Conflicts.Add("Found CLI candidate but its main function does not expose argc/argv safely: $($cliMain.FullName)")
            }
        }
        if ($newText -ne $cliText -and $Conflicts.Count -eq 0) {
            Backup-File $cliMain.FullName
            Set-Content -LiteralPath $cliMain.FullName -Value $newText -Encoding utf8
            $Changed.Add([IO.Path]::GetRelativePath($Workspace, $cliMain.FullName))
        }
    }

    if ($Conflicts.Count -gt 0) {
        $conflictPath = Join-Path $ReportRoot "v1-integration-conflicts-$Timestamp.txt"
        $Conflicts | Set-Content -LiteralPath $conflictPath -Encoding utf8
        throw "Safe integration stopped because $($Conflicts.Count) conflict(s) require review. See $conflictPath. No build was attempted. Backups: $BackupRoot"
    }

    Write-Step "Locating or bootstrapping vcpkg"
    if ([string]::IsNullOrWhiteSpace($VcpkgRoot)) {
        if ($env:VCPKG_ROOT) { $VcpkgRoot = $env:VCPKG_ROOT }
        elseif (Test-Path "C:\vcpkg\scripts\buildsystems\vcpkg.cmake") { $VcpkgRoot = "C:\vcpkg" }
        else { $VcpkgRoot = Join-Path $StateRoot "tools\vcpkg" }
    }
    $toolchain = Join-Path $VcpkgRoot "scripts\buildsystems\vcpkg.cmake"
    if (!(Test-Path -LiteralPath $toolchain)) {
        if (!$BootstrapVcpkg) {
            throw "vcpkg was not found at $VcpkgRoot. Re-run with -BootstrapVcpkg or pass -VcpkgRoot."
        }
        if (!(Get-Command git -ErrorAction SilentlyContinue)) {
            throw "Git is required to bootstrap vcpkg."
        }
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $VcpkgRoot) | Out-Null
        git clone https://github.com/microsoft/vcpkg.git $VcpkgRoot
        & (Join-Path $VcpkgRoot "bootstrap-vcpkg.bat") -disableMetrics
    }
    $vcpkgExe = Join-Path $VcpkgRoot "vcpkg.exe"
    if (!(Test-Path -LiteralPath $vcpkgExe)) {
        & (Join-Path $VcpkgRoot "bootstrap-vcpkg.bat") -disableMetrics
    }
    & $vcpkgExe install sqlite3:x64-windows
    if ($LASTEXITCODE -ne 0) { throw "vcpkg failed to install sqlite3:x64-windows" }

    Write-Step "Configuring and building with MSVC"
    if (!(Get-Command cmake -ErrorAction SilentlyContinue)) {
        throw "cmake is not available in PATH. Open a Visual Studio Developer PowerShell or install CMake."
    }
    $buildDir = Join-Path $Workspace "out\build\x64-$Configuration"
    Push-Location $Workspace
    try {
        cmake -S . -B $buildDir -A x64 `
            -DCMAKE_TOOLCHAIN_FILE="$toolchain" `
            -DEXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=ON `
            -DEXOTIC_RUNTIME_BUILD_CLI=ON `
            -DEXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE=ON `
            -DEXOTIC_RUNTIME_BUILD_SMOKE=ON
        if ($LASTEXITCODE -ne 0) { throw "CMake configuration failed" }
        cmake --build $buildDir --config $Configuration --parallel
        if ($LASTEXITCODE -ne 0) { throw "MSVC build failed" }
        if (!$SkipTests) {
            ctest --test-dir $buildDir -C $Configuration --output-on-failure
            if ($LASTEXITCODE -ne 0) { throw "One or more CTest targets failed" }
        }
    } finally { Pop-Location }

    $binaryRoot = Join-Path $buildDir $Configuration
    $smokeExe = Join-Path $binaryRoot "exotic-runtime-smoke.exe"
    $serviceExe = Join-Path $binaryRoot "exotic-runtime-service.exe"
    $runtimeCliExe = Join-Path $binaryRoot "exotic-runtime-cli.exe"
    $exoticExe = Join-Path $binaryRoot "exotic.exe"
    if (!(Test-Path -LiteralPath $serviceExe)) { throw "Service executable was not produced: $serviceExe" }
    if (!(Test-Path -LiteralPath $runtimeCliExe)) { throw "Runtime CLI executable was not produced: $runtimeCliExe" }

    $simulationWorkspace = Join-Path (Join-Path $StateRoot "simulation-v1") $Timestamp
    if (!$SkipSimulation) {
        Write-Step "Running the complete isolated simulation cycle"
        if (!(Test-Path -LiteralPath $smokeExe)) { throw "Smoke executable was not produced: $smokeExe" }
        & $smokeExe --workspace $simulationWorkspace
        if ($LASTEXITCODE -ne 0) { throw "The end-to-end simulation verifier failed" }

        if (Test-Path -LiteralPath $exoticExe) {
            $env:EXOTIC_WORKSPACE = $simulationWorkspace
            & $exoticExe runtime status
            if ($LASTEXITCODE -ne 0) { throw "exotic runtime status failed after CLI integration" }
        } else {
            & $runtimeCliExe --workspace $simulationWorkspace status
            if ($LASTEXITCODE -ne 0) { throw "Standalone runtime status failed" }
        }
    }

    $runtimeConfigDirectory = Join-Path $Workspace ".exotic"
    New-Item -ItemType Directory -Force -Path $runtimeConfigDirectory | Out-Null
    $runtimeConfigPath = Join-Path $runtimeConfigDirectory "runtime.conf"
    if (!(Test-Path -LiteralPath $runtimeConfigPath)) {
        @"
runtime.mode=simulation
runtime.workspace_id=Exotic
runtime.seed_simulation_identity=true
runtime.simulation_execute_internal=false
scheduler.workers=4
dashboard.enabled=true
budget.money_usd=100
budget.api_credits=10000
budget.cpu_ms=3600000
budget.concurrency=4
budget.default_job_usd=10
"@ | Set-Content -LiteralPath $runtimeConfigPath -Encoding utf8
        $Changed.Add(".exotic/runtime.conf")
    }

    $runCommand = "& '$serviceExe' --workspace '$Workspace'"
    $installCommand = "powershell -ExecutionPolicy Bypass -File '$Workspace\scripts\install-service.ps1' -Workspace '$Workspace'"

    @(
        "EXOTIC Continuous Operations Runtime v1.0 integration",
        "result=PASS",
        "workspace=$Workspace",
        "backup=$BackupRoot",
        "log=$LogPath",
        "build=$buildDir",
        "simulation_workspace=$simulationWorkspace",
        "changed_files=$($Changed.Count)",
        "skipped_identical_files=$($Skipped.Count)",
        "run_command=$runCommand",
        "install_service_command=$installCommand"
    ) | Set-Content -LiteralPath $ReportPath -Encoding utf8

    Write-Step "Integration complete"
    Write-Host "Report: $ReportPath" -ForegroundColor Green
    Write-Host "Backup: $BackupRoot" -ForegroundColor Green
    Write-Host "`nRUN EXOTIC:" -ForegroundColor Yellow
    Write-Host $runCommand
    Write-Host "`nINSTALL WINDOWS SERVICE:" -ForegroundColor Yellow
    Write-Host $installCommand
}
finally {
    Stop-Transcript | Out-Null
    Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
