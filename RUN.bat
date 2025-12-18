@echo off
title Medical Booking System

echo Starting services...

taskkill /f /im node.exe >nul 2>&1
taskkill /f /im pocketbase.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting PocketBase...
start "PocketBase" pocketbase.exe serve --http=127.0.0.1:8090
timeout /t 4 /nobreak >nul

echo Starting Next.js...
start "Next.js" cmd /c "npm run dev"
timeout /t 8 /nobreak >nul

cls
echo.
echo System is READY!
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://127.0.0.1:8090/_/
echo.
echo To stop: run stop.bat
echo.
pause
