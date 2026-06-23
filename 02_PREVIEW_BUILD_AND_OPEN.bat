@echo off
cd /d "%~dp0"
echo [FitNow] Build latest app and open preview server
echo URL: http://127.0.0.1:4173/index.react.html
call "C:\Program Files\nodejs\npm.cmd" run build:local
if errorlevel 1 pause & exit /b %errorlevel%
start "FitNow Preview Server" cmd /k ""C:\Program Files\nodejs\node.exe" "%~dp0scripts\serve-dist.js""
timeout /t 2 > nul
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window "http://127.0.0.1:4173/index.react.html"
