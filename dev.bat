@echo off
REM One-terminal dev runner (double-click or run from cmd/PowerShell). Ctrl+C stops everything.
cd /d "%~dp0"
"C:\Program Files\Git\bin\bash.exe" scripts/dev.sh
