$Root=Split-Path -Parent $PSScriptRoot
$ShortcutPath=Join-Path ([Environment]::GetFolderPath("Desktop")) "EXOTIC.lnk"
$Shell=New-Object -ComObject WScript.Shell
$Shortcut=$Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath=Join-Path $Root "windows\Launch-Unified-App.cmd"
$Shortcut.WorkingDirectory=$Root
$Shortcut.IconLocation=Join-Path $Root "windows\EXOTIC.ico"
$Shortcut.Description="EXOTIC Unified App"
$Shortcut.Save()
Write-Host "EXOTIC desktop shortcut created." -ForegroundColor Green
