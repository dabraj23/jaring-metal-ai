@echo off
title Jaring Metal AI

echo.
echo  =====================================================
echo   Jaring Metal AI - Quotation Intelligence Platform
echo  =====================================================
echo.

:: Check if Node.js is installed
node --version >NUL 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js is not installed.
    echo.
    echo  Download from: https://nodejs.org  (LTS version)
    echo  Install it, then run this file again.
    echo.
    pause
    exit /b 1
)

echo  Node.js found:
node --version
echo.

:: Go to backend folder
cd /d "%~dp0backend"

echo  Starting server on port 3001...
echo  Please wait 5 seconds, then check your browser.
echo.

:: Set port and open browser after 3 second delay
set PORT=3001

:: Open browser with a delay
start cmd /c "timeout /t 4 /nobreak >NUL && start http://localhost:3001"

:: Start the server (keeps this window open)
node server.js

echo.
echo  Server stopped.
pause
