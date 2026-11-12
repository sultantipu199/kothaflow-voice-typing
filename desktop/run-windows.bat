@echo off
title KothaFlow Desktop Voice Typing
echo ========================================================
echo   KothaFlow Desktop Voice Typing - Starting...
echo   (Wispr Flow Style Watery Floating Voice Bubble)
echo ========================================================
echo.

:: 1. Check if Node.js & npm are installed
where npm >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [*] Node.js environment detected.
    if not exist node_modules (
        echo [*] Installing dependencies (first run)...
        call npm install
    )
    echo [*] Launching KothaFlow Floating Bubble...
    call npm start
    goto END
)

:: 2. If Node.js is not installed, launch lightweight native App Mode via Edge (Pre-installed on every Windows PC)
echo [!] Node.js not detected on this PC.
echo [*] Launching KothaFlow in Native Windows App Mode...
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_PATH%" (
    set "EDGE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if exist "%EDGE_PATH%" (
    start "" "%EDGE_PATH%" --app="file:///%~dp0overlay.html" --window-size=340,160 --window-position=1200,650
    echo [OK] KothaFlow opened in standalone window!
    goto END
)

:: 3. Fallback: Launch default browser
start "" "%~dp0overlay.html"
echo [OK] KothaFlow opened in browser window!

:END
exit
