@echo off
echo Stopping services...

taskkill /f /im node.exe >nul 2>&1
taskkill /f /im pocketbase.exe >nul 2>&1

echo Services stopped.
pause
