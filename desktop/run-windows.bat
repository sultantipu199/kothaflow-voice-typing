@echo off
title KothaFlow Desktop Voice Typing
echo ========================================================
echo   KothaFlow Desktop Voice Typing - Starting...
echo   (Wispr Flow Style Global Hotkey Voice Typing)
echo ========================================================
echo.
if not exist node_modules (
    echo [*] Installing dependencies (first time run)...
    npm install
)
echo [*] Launching KothaFlow Global Listener...
echo [*] Press Ctrl+Shift+Space in ANY app (Word, Notepad, Chrome) to dictate!
npm start
pause
