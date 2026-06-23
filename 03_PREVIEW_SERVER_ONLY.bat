@echo off
cd /d "%~dp0"
echo [FitNow] Build latest app and run preview server only
echo URL: http://127.0.0.1:4173/index.react.html
call "C:\Program Files\nodejs\npm.cmd" run build:local
if errorlevel 1 pause & exit /b %errorlevel%
"C:\Program Files\nodejs\node.exe" "%~dp0scripts\serve-dist.js"
pause
