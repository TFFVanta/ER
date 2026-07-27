@echo off
netsh advfirewall firewall add rule name="EXOTIC Portal" dir=in action=allow protocol=TCP localport=8765
pause
