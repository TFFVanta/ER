$ErrorActionPreference = "Stop"
cmake -S . -B build -A x64
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure
Write-Host "Run: .\build\Release\exotic.exe demo"
