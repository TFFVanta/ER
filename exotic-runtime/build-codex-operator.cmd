@echo off
set PATH=%Path%
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
if errorlevel 1 exit /b %errorlevel%
set PATH=%Path%
cmake -S C:\Projects\Exotic\exotic-runtime -B C:\Projects\Exotic\exotic-runtime\build-codex-operator ^
  -DCMAKE_CXX_COMPILER:FILEPATH="C:\Program Files\Microsoft Visual Studio\18\Community\VC\Tools\MSVC\14.50.35717\bin\HostX64\x64\cl.exe"
if errorlevel 1 exit /b %errorlevel%
cmake --build C:\Projects\Exotic\exotic-runtime\build-codex-operator --target exotic_codex_operator_tests exotic_codex_operator_benchmark --config Debug
