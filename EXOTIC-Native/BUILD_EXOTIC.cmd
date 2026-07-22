@echo off
setlocal EnableExtensions

title EXOTIC Builder

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "SOURCE=%ROOT%"
set "BUILD=%ROOT%\out\build"
set "RELEASE=%BUILD%\Release"
set "INSTALL=%LOCALAPPDATA%\EXOTIC"
set "DESKTOP=%USERPROFILE%\Desktop"

echo.
echo ==========================================
echo             BUILDING EXOTIC
echo ==========================================
echo.

where cmake >nul 2>nul || (
    echo ERROR: CMake was not found.
    echo Install Visual Studio Desktop Development with C++ and CMake.
    pause
    exit /b 1
)

if not exist "%SOURCE%\CMakeLists.txt" (
    echo ERROR: CMakeLists.txt was not found at:
    echo %SOURCE%\CMakeLists.txt
    pause
    exit /b 1
)

if not exist "%BUILD%" mkdir "%BUILD%"

cmake -S "%SOURCE%" -B "%BUILD%" -A x64
if errorlevel 1 (
    echo.
    echo ERROR: CMake configuration failed.
    pause
    exit /b 1
)

cmake --build "%BUILD%" --config Release
if errorlevel 1 (
    echo.
    echo ERROR: EXOTIC compilation failed.
    pause
    exit /b 1
)

if not exist "%RELEASE%\EXOTIC.exe" (
    if exist "%RELEASE%\exotic.exe" (
        copy /Y "%RELEASE%\exotic.exe" "%RELEASE%\EXOTIC.exe" >nul
    ) else (
        echo ERROR: EXOTIC.exe was not produced.
        pause
        exit /b 1
    )
)

if exist "%INSTALL%" rmdir /S /Q "%INSTALL%"
mkdir "%INSTALL%"

xcopy "%RELEASE%\*" "%INSTALL%\" /E /I /Y >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$ws=New-Object -ComObject WScript.Shell;" ^
 "$shortcut=$ws.CreateShortcut('%DESKTOP%\EXOTIC.lnk');" ^
 "$shortcut.TargetPath='%INSTALL%\EXOTIC.exe';" ^
 "$shortcut.WorkingDirectory='%INSTALL%';" ^
 "$shortcut.IconLocation='%INSTALL%\EXOTIC.exe,0';" ^
 "$shortcut.Description='EXOTIC';" ^
 "$shortcut.Save()"

echo.
echo ==========================================
echo          EXOTIC BUILD COMPLETE
echo ==========================================
echo.
echo Desktop shortcut created:
echo %DESKTOP%\EXOTIC.lnk
echo.

start "" "%DESKTOP%\EXOTIC.lnk"
exit /b 0
