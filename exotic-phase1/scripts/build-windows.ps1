param(
    [string]$Workspace = "",
    [string]$Vcpkg = "C:\vcpkg",
    [switch]$SkipPatches
)

$ErrorActionPreference = "Stop"
$bundleRoot = Split-Path $PSScriptRoot -Parent
$workspaceRoot = if ([string]::IsNullOrWhiteSpace($Workspace)) {
    $bundleRoot
} else {
    $Workspace
}
$vcpkgRoot = if (Test-Path $Vcpkg) {
    $Vcpkg
} else {
    Join-Path $bundleRoot ".exotic\tools\vcpkg"
}
$candidateToolchains = @(
    (Join-Path $vcpkgRoot "scripts\buildsystems\vcpkg.cmake"),
    "C:\Program Files\Microsoft Visual Studio\18\Community\VC\vcpkg\scripts\buildsystems\vcpkg.cmake",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\vcpkg\scripts\buildsystems\vcpkg.cmake"
)

if (!$SkipPatches) {
    & (Join-Path $PSScriptRoot "apply-compatibility-patches.ps1") `
        -Workspace $workspaceRoot `
        -BundleRoot $bundleRoot
}

$vcpkgExe = Join-Path $vcpkgRoot "vcpkg.exe"
$toolchain = $candidateToolchains | Where-Object { Test-Path $_ } | Select-Object -First 1
if (!$toolchain) {
    throw "vcpkg toolchain not found. Checked: $($candidateToolchains -join ', ')"
}
if (Test-Path $vcpkgExe) {
    & $vcpkgExe install sqlite3:x64-windows
    if ($LASTEXITCODE -ne 0) {
        throw "vcpkg install failed with exit code $LASTEXITCODE"
    }
}

Set-Location $workspaceRoot
cmake -S . -B out\build\x64-Release `
    "-DCMAKE_TOOLCHAIN_FILE=$toolchain" `
    -DEXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=ON `
    -DEXOTIC_RUNTIME_BUILD_CLI=ON `
    -DEXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE=ON
if ($LASTEXITCODE -ne 0) {
    throw "CMake configure failed with exit code $LASTEXITCODE"
}
cmake --build out\build\x64-Release --config Release --parallel
if ($LASTEXITCODE -ne 0) {
    throw "CMake build failed with exit code $LASTEXITCODE"
}
ctest --test-dir out\build\x64-Release -C Release --output-on-failure
if ($LASTEXITCODE -ne 0) {
    throw "CTest failed with exit code $LASTEXITCODE"
}
