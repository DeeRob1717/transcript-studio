@echo off
setlocal
cd /d "%~dp0"

echo Starting Transcript Studio local worker...
start "Transcript Worker" cmd /k ""%~dp0start-free.bat""

timeout /t 3 /nobreak >nul

echo Starting ngrok tunnel on port 8080...
start "Transcript Worker Tunnel" cmd /k "ngrok http 8080"

echo.
echo Two windows were opened:
echo 1. Transcript Worker
echo 2. Transcript Worker Tunnel
echo.
echo Keep both windows open while users are transcribing.
echo.
