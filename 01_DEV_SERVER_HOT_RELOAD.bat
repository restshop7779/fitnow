@echo off
cd /d "%~dp0"
echo [FitNow] Development server with hot reload
echo URL: http://127.0.0.1:5173/index.react.html
start "FitNow Dev Server" cmd /k ""C:\Program Files\nodejs\npm.cmd" run dev:local"
timeout /t 3 > nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "http://127.0.0.1:5173/index.react.html"
