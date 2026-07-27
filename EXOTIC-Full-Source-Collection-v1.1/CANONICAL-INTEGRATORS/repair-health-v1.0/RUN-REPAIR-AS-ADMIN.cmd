@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0Repair-EXOTIC-v1.ps1"" -Workspace ""C:\Projects\Exotic"" -BootstrapVcpkg -InstallOrRepairService'"
