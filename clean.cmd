@echo off
color 0B
if exist .turbo rmdir /s /q .turbo
if exist dist rmdir /s /q dist
for /d %%D in (packages\*) do if exist %%D\dist rmdir /s /q %%D\dist
echo cleaned