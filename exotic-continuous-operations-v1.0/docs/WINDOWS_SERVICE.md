# Windows service
Build the full bootstrap and service executable, then run PowerShell as Administrator:
```powershell
.\scripts\install-service.ps1 -Workspace C:\Projects\Exotic
Start-Service EXOTIC
Get-Service EXOTIC
```
The service receives Windows STOP and SHUTDOWN controls, requests cooperative stop, drains scheduler workers, joins service threads in reverse dependency order, and releases the workspace lease.
