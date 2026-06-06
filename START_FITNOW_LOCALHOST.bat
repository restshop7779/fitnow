@echo off
cd /d "%~dp0"
call "C:\Program Files\nodejs\npm.cmd" run build:local
start "FitNow Local Server" cmd /k ""C:\Program Files\nodejs\node.exe" "%~dp0scripts\serve-dist.js""
timeout /t 2 > nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "http://127.0.0.1:4173/index.react.html"
