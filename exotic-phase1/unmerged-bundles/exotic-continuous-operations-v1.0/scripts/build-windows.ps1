param(
    [string]$Workspace = "C:\Projects\Exotic",
    [string]$Vcpkg = "C:\vcpkg",
    [switch]$SkipPatches
)

$ErrorActionPreference = "Stop"
$bundleRoot = Split-Path $PSScriptRoot -Parent

if (!$SkipPatches) {
    & (Join-Path $PSScriptRoot "apply-compatibility-patches.ps1") `
        -Workspace $Workspace `
        -BundleRoot $bundleRoot
}

$vcpkgExe = Join-Path $Vcpkg "vcpkg.exe"
$toolchain = Join-Path $Vcpkg "scripts\buildsystems\vcpkg.cmake"
if (!(Test-Path $toolchain)) {
    throw "vcpkg toolchain not found: $toolchain"
}
if (Test-Path $vcpkgExe) {
    & $vcpkgExe install sqlite3:x64-windows
}

Set-Location $Workspace
cmake -S . -B out\build\x64-Release `
    -DCMAKE_TOOLCHAIN_FILE=$toolchain `
    -DEXOTIC_RUNTIME_ENABLE_FULL_BOOTSTRAP=ON `
    -DEXOTIC_RUNTIME_BUILD_CLI=ON `
    -DEXOTIC_RUNTIME_BUILD_WINDOWS_SERVICE=ON
cmake --build out\build\x64-Release --config Release --parallel
ctest --test-dir out\build\x64-Release -C Release --output-on-failure
