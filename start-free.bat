@echo off
setlocal
cd /d "%~dp0"

if "%PORT%"=="" set PORT=8080
if "%WHISPER_CPP_EXE%"=="" set WHISPER_CPP_EXE=C:\Users\Administrator\Downloads\whisper.cpp\build\bin\Release\whisper-cli.exe
if "%WHISPER_MODEL_PATH%"=="" set WHISPER_MODEL_PATH=%~dp0models\ggml-base.en.bin

echo Starting Transcript Studio on http://localhost:%PORT%
echo.
echo Whisper executable: %WHISPER_CPP_EXE%
echo Whisper model:      %WHISPER_MODEL_PATH%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port %PORT%
